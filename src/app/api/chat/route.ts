import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { listDevices } from '@/lib/db';
import { mapDevice } from '@/lib/map';
import { enqueueCommand } from '@/lib/db';
import { REMEDIATIONS, isKnownRemediation } from '@/lib/remediations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

// Stable system instructions — cached across requests (see shared/prompt-caching).
const SYSTEM_INSTRUCTIONS = `You are IntelliFix AI, the in-product assistant for an enterprise endpoint-intelligence platform.
You help an IT operator understand the health of a Windows device and resolve issues.

Capabilities:
- You can read live telemetry, compliance results, and detected issues for the connected device (use get_device_status).
- You can list the remediations the agent supports (use list_remediations).
- You can queue a remediation to run on the device on the operator's behalf (use queue_remediation). Only queue an action whose id you confirmed via list_remediations. The agent will run it, and for sensitive actions a consent popup appears on the device before anything executes — tell the user this.

Rules:
- Ground every answer in the actual telemetry provided/returned by tools. Never invent metrics, hostnames, or issues.
- Before queueing a remediation, make sure it matches what the user asked for; briefly say what you're doing.
- Be concise and direct — a few sentences. No markdown headers, no preamble like "Certainly". Plain text only.
- Respond with your final answer only; do not narrate intermediate reasoning.
- If no device/agent is connected, say so and suggest installing the IntelliFix agent.`;

function deviceContext(): string {
  const d = listDevices().map(mapDevice)[0];
  if (!d) return 'CONNECTED DEVICE: none (no agent reporting).';
  const failing = (d.compliance?.controls ?? []).filter((c: any) => c.status === 'fail').map((c: any) => c.name);
  return [
    `CONNECTED DEVICE: ${d.hostname} (${d.isOnline ? 'online' : 'offline'})`,
    `Health: ${d.healthScore}/100 · CPU ${Math.round(d.metrics?.cpu ?? 0)}% · RAM ${Math.round(d.metrics?.ram ?? 0)}% · Disk ${Math.round(d.metrics?.disk ?? 0)}% · Net ${Math.round(d.metrics?.network ?? 0)}ms`,
    `Compliance score: ${d.compliance?.score ?? 0}%${failing.length ? ` · failing: ${failing.join(', ')}` : ''}`,
    `Open issues: ${d.issues.length ? d.issues.map((i: any) => `${i.title} [${i.severity}]`).join('; ') : 'none'}`,
  ].join('\n');
}

const TOOLS: Anthropic.Tool[] = [
  { name: 'get_device_status', description: 'Get the latest live telemetry, compliance and issues for the connected device.', input_schema: { type: 'object', properties: {} } },
  { name: 'list_remediations', description: 'List the named remediations the agent can run.', input_schema: { type: 'object', properties: {} } },
  {
    name: 'queue_remediation',
    description: 'Queue a remediation for the agent to run on the connected device. Use only ids from list_remediations.',
    input_schema: {
      type: 'object',
      properties: { actionType: { type: 'string', enum: REMEDIATIONS.map((r) => r.id), description: 'The remediation id to run' } },
      required: ['actionType'],
    },
  },
];

function runTool(name: string, input: any): string {
  if (name === 'get_device_status') return deviceContext();
  if (name === 'list_remediations') return JSON.stringify(REMEDIATIONS);
  if (name === 'queue_remediation') {
    const actionType = String(input?.actionType ?? '');
    if (!isKnownRemediation(actionType)) return `Error: unknown remediation "${actionType}".`;
    const device = listDevices().map(mapDevice)[0];
    if (!device) return 'Error: no device connected, cannot queue a remediation.';
    const id = enqueueCommand(device.deviceId, actionType);
    const def = REMEDIATIONS.find((r) => r.id === actionType)!;
    return `Queued "${def.label}" (command ${id}) for ${device.hostname}.${def.requiresConsent ? ' A consent popup will appear on the device before it runs.' : ''}`;
  }
  return `Error: unknown tool ${name}`;
}

// Local fallback when no API key is configured.
function fallbackReply(message: string): string {
  const d = listDevices().map(mapDevice)[0];
  if (!d) return 'No agent is connected yet. Install the IntelliFix agent and live data will appear here within a few seconds.';
  const m = d.metrics;
  const t = message.toLowerCase();
  if (t.includes('disk') || t.includes('space')) return `The system drive on ${d.hostname} is at ${Math.round(m?.disk ?? 0)}% used. Run the Disk Cleanup module to reclaim space.`;
  if (t.includes('cpu')) return `CPU on ${d.hostname} is ${Math.round(m?.cpu ?? 0)}%. If sustained, try Memory Optimize or review heavy processes.`;
  if (t.includes('memory') || t.includes('ram')) return `Memory usage is ${Math.round(m?.ram ?? 0)}%. Memory Optimize will trim working sets.`;
  if (t.includes('compliance') || t.includes('secur')) {
    const failing = (d.compliance?.controls ?? []).filter((c: any) => c.status === 'fail').map((c: any) => c.name);
    return failing.length ? `Compliance ${d.compliance?.score}%. Failing: ${failing.join(', ')}.` : `Compliance ${d.compliance?.score ?? 0}% — no failing controls.`;
  }
  return `Monitoring ${d.hostname}: health ${d.healthScore}, CPU ${Math.round(m?.cpu ?? 0)}%, RAM ${Math.round(m?.ram ?? 0)}%, Disk ${Math.round(m?.disk ?? 0)}%. Ask me about CPU, memory, disk, network, compliance, or issues. (Set ANTHROPIC_API_KEY for full AI capability.)`;
}

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const incoming: { role: string; content: string }[] = body?.messages ?? [];
  const lastUser = [...incoming].reverse().find((m) => m.role === 'user')?.content ?? body?.message ?? '';

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ reply: fallbackReply(String(lastUser)) });
  }

  try {
    const client = new Anthropic({ apiKey });
    const messages: Anthropic.MessageParam[] = incoming
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    if (messages.length === 0) messages.push({ role: 'user', content: String(lastUser || 'Give me a status summary.') });

    const system: Anthropic.TextBlockParam[] = [
      { type: 'text', text: SYSTEM_INSTRUCTIONS, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: `Current device telemetry (live):\n${deviceContext()}` },
    ];

    let reply = '';
    for (let i = 0; i < 5; i++) {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        thinking: { type: 'disabled' },
        system,
        tools: TOOLS,
        messages,
      });

      const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
      reply = res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n').trim();

      if (res.stop_reason !== 'tool_use' || toolUses.length === 0) break;

      messages.push({ role: 'assistant', content: res.content });
      messages.push({
        role: 'user',
        content: toolUses.map((tu) => ({ type: 'tool_result' as const, tool_use_id: tu.id, content: runTool(tu.name, tu.input) })),
      });
    }

    return NextResponse.json({ reply: reply || "I couldn't form a response — please try rephrasing." });
  } catch (err: any) {
    console.error('[chat] error', err?.message);
    return NextResponse.json({ reply: fallbackReply(String(lastUser)) });
  }
}
