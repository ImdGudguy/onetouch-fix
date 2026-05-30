/**
 * Agent-channel auth. When INTELLIFIX_AGENT_TOKEN is set, every /api/agent/*
 * request must present a matching `x-intellifix-token` header. If the secret is
 * not configured we allow the call (trusted-localhost demo mode) — production
 * deployments MUST set the token (see SECURITY.md / .env.example).
 */
import { NextResponse } from 'next/server';

export function agentUnauthorized(req: Request): NextResponse | null {
  const required = process.env.INTELLIFIX_AGENT_TOKEN;
  if (!required) return null;

  const provided = req.headers.get('x-intellifix-token');
  // constant-time-ish compare
  if (!provided || provided.length !== required.length) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let diff = 0;
  for (let i = 0; i < required.length; i++) diff |= provided.charCodeAt(i) ^ required.charCodeAt(i);
  return diff === 0 ? null : NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}
