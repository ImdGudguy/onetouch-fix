import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RELEASE_ZIP = 'https://github.com/ImdGudguy/onetouch-fix/releases/latest/download/IntelliFix-Agent.zip';

// Allow only safe characters so query params can't break out of the script.
const clean = (s: string | null, re: RegExp) => (s && re.test(s) ? s : '');

// Public bootstrap installer:
//   irm "https://<site>/api/agent/install.ps1?backend=<url>&token=<token>" | iex
// Downloads the pre-built agent bundle and installs it (self-elevates).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const backend = clean(url.searchParams.get('backend'), /^https?:\/\/[^\s'"`]+$/) || `${url.protocol}//${url.host}`;
  const token = clean(url.searchParams.get('token'), /^[A-Za-z0-9_-]{0,128}$/);

  const ps = `# IntelliFix Agent bootstrap installer
$ErrorActionPreference = 'Stop'
Write-Host 'Downloading IntelliFix agent...' -ForegroundColor Cyan
$zip = Join-Path $env:TEMP 'IntelliFix-Agent.zip'
$dir = Join-Path $env:TEMP 'IntelliFix-Agent'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest '${RELEASE_ZIP}' -OutFile $zip -UseBasicParsing
if (Test-Path $dir) { Remove-Item -Recurse -Force $dir }
Expand-Archive $zip $dir -Force
Write-Host 'Installing service (you will be prompted for administrator)...' -ForegroundColor Cyan
& (Join-Path $dir 'install-agent.ps1') -BackendUrl '${backend}' -AgentToken '${token}'
`;

  return new NextResponse(ps, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
