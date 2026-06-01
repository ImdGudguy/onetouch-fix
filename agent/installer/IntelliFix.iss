; Inno Setup script — builds a GUI installer for the IntelliFix agent.
; GUI:    double-click -> wizard asks for Backend URL + Enrollment token.
; Silent: IntelliFix-Agent-Setup.exe /VERYSILENT /backend=<url> /enroll=<token>
; Packs the self-contained exes from ..\dist\agent (produced by build-agent.ps1).

#define AppName "IntelliFix Agent"
#define AppVer "1.0.0"

[Setup]
AppName={#AppName}
AppVersion={#AppVer}
AppPublisher=Naveen Singh
DefaultDirName={autopf}\IntelliFix
DisableProgramGroupPage=yes
PrivilegesRequired=admin
OutputDir=..\dist
OutputBaseFilename=IntelliFix-Agent-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayName={#AppName}

[Files]
Source: "..\dist\agent\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Run]
Filename: "powershell.exe"; \
  Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\install-agent.ps1"" -BackendUrl ""{code:GetBackend}"" -EnrollToken ""{code:GetEnroll}"""; \
  Flags: runhidden waituntilterminated; StatusMsg: "Installing IntelliFix service..."

[UninstallRun]
Filename: "powershell.exe"; \
  Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\uninstall-agent.ps1"""; \
  Flags: runhidden; RunOnceId: "UninstallIntelliFix"

[Code]
var Page: TInputQueryWizardPage;

function GetBackend(Param: String): String;
begin
  Result := Page.Values[0];
end;

function GetEnroll(Param: String): String;
begin
  Result := Page.Values[1];
end;

procedure InitializeWizard;
begin
  Page := CreateInputQueryPage(wpWelcome,
    'Connect to IntelliFix',
    'Enter your server details',
    'You can find these in your IntelliFix dashboard under "Connect a device". The enrollment token is single-use and expires shortly.');
  Page.Add('Backend URL (e.g. https://your-site.netlify.app):', False);
  Page.Add('Enrollment token:', False);
  Page.Values[0] := ExpandConstant('{param:backend|https://}');
  Page.Values[1] := ExpandConstant('{param:enroll|}');
end;
