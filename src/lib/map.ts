import type { StoredDevice } from './store';

/** Shape the web dashboard expects for each device. */
export function mapDevice(d: StoredDevice) {
  const s = d.snapshot ?? {};
  const dev = s.device ?? {};
  const m = s.metrics ?? null;

  return {
    id: dev.deviceId,
    deviceId: dev.deviceId,
    hostname: dev.hostname ?? 'Unknown',
    username: dev.username ?? undefined,
    osVersion: dev.osVersion ?? 'Windows',
    processorName: dev.processorName ?? '',
    processorCores: dev.processorCores ?? 0,
    totalRAM: dev.totalRamGb ?? 0,
    totalDisk: dev.totalDiskGb ?? 0,
    isOnline: d.isOnline,
    lastSeen: d.updatedAt,
    registeredAt: d.registeredAt,
    metrics: m
      ? {
          cpu: m.cpu ?? 0,
          ram: m.ram ?? 0,
          disk: m.disk ?? 0,
          network: m.network ?? 0,
          activeProcesses: m.activeProcesses ?? 0,
          timestamp: m.timestamp ?? d.updatedAt,
        }
      : null,
    issues: (s.issues ?? []).map((i: any) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      severity: i.severity, // already low/medium/high/critical
      confidence: i.confidence ?? 80,
      detectedAt: i.detectedAt,
      category: i.category ?? 'System',
      recommendedActionType: i.recommendedActionType ?? null,
    })),
    compliance: s.compliance ?? { score: 0, controls: [] },
    recentEvents: s.recentEvents ?? [],
    trustScore: s.trustScore ?? 100,
    healthScore: s.healthScore ?? 0,
  };
}

export function buildFleetMetrics(devices: ReturnType<typeof mapDevice>[]) {
  const online = devices.filter((d) => d.isOnline && d.metrics);
  const n = online.length || 1;
  const sum = (sel: (m: any) => number) => online.reduce((a, d) => a + sel(d.metrics), 0);
  return {
    avgCpu: Math.round(sum((m) => m.cpu) / n),
    avgRam: Math.round(sum((m) => m.ram) / n),
    avgDisk: Math.round(sum((m) => m.disk) / n),
    avgNetwork: Math.round(sum((m) => m.network) / n),
    totalProcesses: online.reduce((a, d) => a + (d.metrics?.activeProcesses ?? 0), 0),
  };
}

export function buildSummary(devices: ReturnType<typeof mapDevice>[]) {
  const allIssues = devices.flatMap((d) => d.issues);
  const count = (sev: string) => allIssues.filter((i: any) => i.severity === sev).length;
  const online = devices.filter((d) => d.isOnline);
  const avgHealth = devices.length
    ? Math.round(devices.reduce((a, d) => a + (d.healthScore ?? 0), 0) / devices.length)
    : 0;

  return {
    totalDevices: devices.length,
    onlineDevices: online.length,
    offlineDevices: devices.length - online.length,
    averageHealthScore: avgHealth,
    totalIssues: allIssues.length,
    criticalIssues: count('critical'),
    highIssues: count('high'),
    mediumIssues: count('medium'),
    lowIssues: count('low'),
  };
}

export function fleetSummary(devices: ReturnType<typeof mapDevice>[]) {
  const online = devices.filter((d) => d.isOnline).length;
  return {
    total: devices.length,
    online,
    offline: devices.length - online,
    avgHealthScore: devices.length
      ? Math.round(devices.reduce((a, d) => a + (d.healthScore ?? 0), 0) / devices.length)
      : 0,
  };
}
