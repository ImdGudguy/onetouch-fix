/**
 * Canonical remediation catalogue — the single source of truth on the web side
 * for which named actions exist. MUST stay in sync with the agent's
 * RemediationEngine.Catalog (agent/IntelliFix.Service/Remediation/RemediationEngine.cs).
 * The backend only ever queues actions whose id appears here.
 */
export interface RemediationDef {
  id: string;
  label: string;
  description: string;
  requiresConsent: boolean;
}

export const REMEDIATIONS: RemediationDef[] = [
  { id: 'disk_cleanup', label: 'Disk Cleanup', description: 'Clean temp files, browser cache & system junk', requiresConsent: true },
  { id: 'temp_cleanup', label: 'Temp Cleanup', description: 'Remove temp files older than 7 days', requiresConsent: false },
  { id: 'dns_flush', label: 'DNS Flush', description: 'Clear the DNS resolver cache', requiresConsent: false },
  { id: 'print_spooler_restart', label: 'Spooler Restart', description: 'Restart the Print Spooler service', requiresConsent: true },
  { id: 'teams_cache_cleanup', label: 'Teams Cache', description: 'Clear Microsoft Teams cache for sync issues', requiresConsent: true },
  { id: 'outlook_cache_cleanup', label: 'Outlook Cache', description: 'Clear Outlook local cache files', requiresConsent: true },
  { id: 'wifi_adapter_reset', label: 'Wi-Fi Reset', description: 'Disable then re-enable the Wi-Fi adapter', requiresConsent: true },
  { id: 'memory_optimization', label: 'Memory Optimize', description: 'Trim process working sets to free RAM', requiresConsent: false },
  { id: 'windows_service_restart', label: 'Service Restart', description: 'Restart a problematic Windows service', requiresConsent: true },
  { id: 'file_association_repair', label: 'File Assoc Repair', description: 'Reset broken file type associations', requiresConsent: true },
  { id: 'chrome_forced_restart', label: 'Chrome Restart', description: 'Force restart Chrome and relaunch it', requiresConsent: true },
  { id: 'device_reboot', label: 'Device Reboot', description: 'Schedule a system reboot in 60 seconds', requiresConsent: true },
];

export const REMEDIATION_IDS = REMEDIATIONS.map((r) => r.id);

export function isKnownRemediation(id: string): boolean {
  return REMEDIATION_IDS.includes(id);
}
