'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Cpu, HardDrive, MemoryStick, Activity, AlertTriangle,
  CheckCircle2, Zap, MessageCircle, Minimize2, X, Maximize2, Send,
  RefreshCw, Settings, Bell, Monitor, Terminal, Mail, FileSpreadsheet,
  Eye, EyeOff, Moon, Sun, TrendingUp, Gauge, Network, ActivitySquare,
  Check, AlertCircle, Wrench, Sparkles, History, Brain, Radio, Printer,
  CircleDot, ArrowUpRight, ArrowDownRight, Minus, ChevronLeft, ChevronRight,
  LayoutDashboard, Server, AlertOctagon, WrenchIcon, Lightbulb, BarChart3,
  Shield, FileCheck, Settings2, MonitorSmartphone, ShieldCheck, ShieldAlert,
  Clock, ZapOff, ActivityIcon, Layers, Circle, RadioTower, ChevronDown, Filter,
  Database, Cpu as CpuIcon, HardDrive as HardDriveIcon, Clock as ClockIcon,
  Globe, Download, Cog as CogIcon, FileText, Wifi, LogOut
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';

// ============================================================================
// API & WEBSOCKET CONFIG
// ============================================================================
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

interface ApiDevice {
  id: string;
  deviceId: string;
  hostname: string;
  username?: string;
  osVersion?: string;
  processorName?: string;
  processorCores?: number;
  totalRAM?: number;
  totalDisk?: number;
  isOnline: boolean;
  lastSeen: string;
  registeredAt: string;
  metrics: {
    cpu: number;
    ram: number;
    disk: number;
    network: number;
    activeProcesses: number;
    timestamp: string;
  } | null;
  issues: Issue[];
  compliance?: { score: number; controls: any[] };
  recentEvents?: any[];
  trustScore: number;
  healthScore: number;
}

interface DashboardSummary {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  averageHealthScore: number;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
}

interface FleetMetrics {
  avgCpu: number;
  avgRam: number;
  avgDisk: number;
  avgNetwork: number;
  totalProcesses: number;
}

// API Functions
const api = {
  async getSummary(): Promise<{ summary: DashboardSummary; fleetMetrics: FleetMetrics }> {
    const res = await fetch(`${API_BASE}/dashboard/summary`);
    const data = await res.json();
    return {
      summary: data.summary || {
        totalDevices: 0, onlineDevices: 0, offlineDevices: 0,
        averageHealthScore: 0, totalIssues: 0, criticalIssues: 0,
        highIssues: 0, mediumIssues: 0, lowIssues: 0
      },
      fleetMetrics: data.fleetMetrics || { avgCpu: 0, avgRam: 0, avgDisk: 0, avgNetwork: 0, totalProcesses: 0 }
    };
  },
  async getDevices(): Promise<{ devices: ApiDevice[]; fleetSummary?: { total: number; online: number; offline: number; avgHealthScore: number } }> {
    const res = await fetch(`${API_BASE}/dashboard/devices`);
    const data = await res.json();
    return {
      devices: data.devices || [],
      fleetSummary: data.fleetSummary
    };
  },
  async getFleetMetrics(): Promise<FleetMetrics> {
    const res = await fetch(`${API_BASE}/dashboard/fleet`);
    const data = await res.json();
    return data.fleetMetrics || { avgCpu: 0, avgRam: 0, avgDisk: 0, avgNetwork: 0, totalProcesses: 0 };
  },
  async executeFix(deviceId: string, actionType: string) {
    const res = await fetch(`${API_BASE}/remediation/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, actionType })
    });
    return res.json();
  },
  async getRemediationHistory() {
    const res = await fetch(`${API_BASE}/remediation/history`);
    return res.json();
  }
};

// ============================================================================
// TYPES
// ============================================================================
interface SystemMetrics {
  cpu: number;
  ram: number;
  disk: number;
  network: number;
}

interface AIActivity {
  id: string;
  text: string;
  status: 'scanning' | 'analyzing' | 'validating' | 'complete' | 'error' | 'pending';
  confidence: number;
  duration?: number;
}

interface Issue {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  timestamp: string;
  category: string;
  detectedBy: string;
  rootCause?: string;
  businessImpact?: string;
  timeToFailure?: string;
  affectedServices?: string[];
  recommendedFix?: string;
}

interface RemediationCard {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  color: string;
  duration: string;
  successRate: number;
  safeExecution: boolean;
  executionPreview?: string;
  silentOnly?: boolean;
  requiresApproval?: boolean;
  category?: string;
}

interface Notification {
  id: string;
  type: 'alert' | 'remediation' | 'prediction' | 'system' | 'recommendation';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ExecutiveMetric {
  label: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
}

interface NavItem {
  id: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================
const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'devices', icon: MonitorSmartphone, label: 'Devices', badge: 3 },
  { id: 'incidents', icon: AlertOctagon, label: 'Incidents', badge: 5 },
  { id: 'remediation', icon: WrenchIcon, label: 'Remediation' },
  { id: 'ai-insights', icon: Lightbulb, label: 'AI Insights', badge: 2 },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'compliance', icon: FileCheck, label: 'Compliance' },
  { id: 'settings', icon: Settings2, label: 'Settings' },
];

const AI_REASONING_STEPS = [
  { text: 'Correlating Windows event logs...', duration: 800 },
  { text: 'Analyzing service dependency chain...', duration: 600 },
  { text: 'Validating remediation safety protocols...', duration: 700 },
  { text: 'Generating rollback checkpoint...', duration: 500 },
  { text: 'Predicting anomaly spread patterns...', duration: 900 },
  { text: 'Mapping affected system components...', duration: 650 },
  { text: 'Calculating optimal execution window...', duration: 550 },
  { text: 'Validating enterprise compliance requirements...', duration: 750 },
  { text: 'Preparing secure execution environment...', duration: 600 },
  { text: 'Initiating autonomous remediation sequence...', duration: 1000 },
];

const EXECUTIVE_METRICS: ExecutiveMetric[] = [
  { label: 'Issues Prevented', value: '127', change: 12, icon: <Shield className="w-4 h-4" />, color: '#10b981' },
  { label: 'Auto-Remediation', value: '94%', change: 3, icon: <Zap className="w-4 h-4" />, color: '#00e5ff' },
  { label: 'Time Saved', value: '48h', change: 8, icon: <Clock className="w-4 h-4" />, color: '#a855f7' },
  { label: 'Prediction Accuracy', value: '91%', change: 5, icon: <Brain className="w-4 h-4" />, color: '#facc15' },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const getDisplayName = () => {
  return 'User';
};

const formatTime = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
};

// ============================================================================
// AI RESPONSE ENGINE
// ============================================================================
const getAIResponse = async (message: string, history: ChatMessage[] = []): Promise<string> => {
  try {
    const payloadMessages = [
      ...history
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: payloadMessages })
    });

    const data = await response.json();

    if (response.ok && data.reply) {
      return data.reply;
    }

    console.log('[Chat] API issue:', response.status, data);
  } catch (error) {
    console.log('[Chat] API call failed:', error);
  }

  // Minimal fallback - should rarely trigger
  return "I'm here to help. What issue are you experiencing with your device?";
};

// ============================================================================
// COMPONENTS
// ============================================================================

// Animated AI Core Visualization
function AICoreVisualization({ metrics }: { metrics: SystemMetrics }) {
  const [rotation, setRotation] = useState(0);
  const [pulsePhase, setPulsePhase] = useState(0);
  const [scanLine, setScanLine] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => (prev + 0.5) % 360);
      setPulsePhase(prev => (prev + 1) % 100);
      setScanLine(prev => (prev + 2) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const activeNodes = [
    { label: 'CPU', value: metrics.cpu, position: { x: 30, y: 20 } },
    { label: 'MEM', value: metrics.ram, position: { x: 70, y: 25 } },
    { label: 'DISK', value: metrics.disk, position: { x: 50, y: 75 } },
    { label: 'NET', value: metrics.network, position: { x: 20, y: 60 } },
  ];

  return (
    <div className="relative w-full h-64 flex items-center justify-center">
      {/* Background holographic grid */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 200 200">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#00e5ff" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Outer pulse rings */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-neon-cyan/10"
          style={{
            width: 200 + i * 40,
            height: 200 + i * 40,
            opacity: 0.3 - i * 0.05,
          }}
          animate={{
            scale: [1, 1.02, 1],
            opacity: [0.3 - i * 0.05, 0.5 - i * 0.05, 0.3 - i * 0.05],
          }}
          transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
        />
      ))}

      {/* Rotating outer ring */}
      <motion.div
        className="absolute w-56 h-56 rounded-full border-2 border-neon-cyan/30"
        style={{
          borderStyle: 'dashed',
          transform: `rotate(${rotation}deg)`,
        }}
      />

      {/* Rotating middle ring */}
      <motion.div
        className="absolute w-44 h-44 rounded-full border border-neon-purple/40"
        style={{
          transform: `rotate(-${rotation * 0.7}deg)`,
        }}
      >
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/20" />
      </motion.div>

      {/* Inner ring */}
      <motion.div
        className="absolute w-32 h-32 rounded-full border border-neon-cyan/50"
        style={{
          transform: `rotate(${rotation * 0.4}deg)`,
        }}
      />

      {/* Orbiting particles */}
      {[...Array(8)].map((_, i) => {
        const angle = (i * 45 + rotation) % 360;
        const radius = i % 2 === 0 ? 100 : 80;
        const x = 128 + radius * Math.cos((angle * Math.PI) / 180);
        const y = 128 + radius * Math.sin((angle * Math.PI) / 180);

        return (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: x,
              top: y,
              background: i % 2 === 0 ? '#00e5ff' : '#a855f7',
              boxShadow: `0 0 10px ${i % 2 === 0 ? 'rgba(0, 229, 255, 0.8)' : 'rgba(168, 85, 247, 0.8)'}`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
          />
        );
      })}

      {/* Scan line effect */}
      <div
        className="absolute w-full h-full overflow-hidden rounded-full"
        style={{ clipPath: `polygon(0 ${scanLine}%, 100% ${scanLine}%, 100% ${scanLine + 10}%, 0 ${scanLine + 10}%)` }}
      >
        <motion.div
          className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-neon-cyan to-transparent"
          style={{ top: `${scanLine}%` }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      </div>

      {/* Central AI Core */}
      <div className="relative z-10 w-20 h-20">
        <motion.div
          className="w-full h-full rounded-full"
          style={{
            background: 'linear-gradient(135deg, #00e5ff 0%, #a855f7 50%, #00e5ff 100%)',
            boxShadow: `0 0 ${30 + pulsePhase * 0.3}px rgba(0, 229, 255, 0.5)`,
          }}
          animate={{
            boxShadow: [
              '0 0 30px rgba(0, 229, 255, 0.5)',
              '0 0 50px rgba(0, 229, 255, 0.7)',
              '0 0 30px rgba(0, 229, 255, 0.5)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <Brain className="w-10 h-10 text-white" />
          </div>
        </motion.div>

        {/* Core inner pulse */}
        <motion.div
          className="absolute inset-2 rounded-full bg-white/20"
          animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>

      {/* Node indicators */}
      {activeNodes.map((node, i) => (
        <motion.div
          key={i}
          className="absolute px-3 py-1.5 rounded-full bg-space-black/80 border border-white/10 backdrop-blur-sm"
          style={{ left: `${node.position.x}%`, top: `${node.position.y}%` }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.2 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: node.value > 80 ? '#ef4444' : '#00e5ff' }} />
            <span className="text-xs font-mono text-white/80">{node.label}</span>
            <span className="text-xs font-bold text-white">{Math.round(node.value)}%</span>
          </div>
        </motion.div>
      ))}

      {/* Holographic overlay */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-neon-cyan/5 via-transparent to-neon-purple/5" />
    </div>
  );
}

// AI Reasoning Layer
function AIReasoningLayer() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isReasoning, setIsReasoning] = useState(true);

  useEffect(() => {
    if (!isReasoning) return;

    const step = AI_REASONING_STEPS[currentStep];
    if (!step) return;

    const progressIncrement = 100 / (AI_REASONING_STEPS.length * 2);

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentStep < AI_REASONING_STEPS.length - 1) {
            setCurrentStep(c => c + 1);
            return 0;
          } else {
            setCurrentStep(0);
            return 0;
          }
        }
        return prev + progressIncrement;
      });
    }, step.duration / 2);

    return () => clearInterval(timer);
  }, [currentStep, isReasoning]);

  return (
    <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-neon-cyan/10">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
        <span className="text-xs font-medium text-neon-cyan uppercase tracking-wider">AI Reasoning Engine</span>
      </div>

      <div className="space-y-2">
        {AI_REASONING_STEPS.map((step, i) => {
          const isActive = i === currentStep;
          const isComplete = i < currentStep;

          return (
            <motion.div
              key={i}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: isActive || isComplete ? 1 : 0.4, x: 0 }}
            >
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                isComplete ? 'bg-neon-green' : isActive ? 'bg-neon-cyan' : 'bg-white/10'
              }`}>
                {isComplete ? (
                  <Check className="w-2.5 h-2.5 text-white" />
                ) : isActive ? (
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                ) : null}
              </div>
              <span className={`text-xs ${isActive ? 'text-white font-medium' : 'text-white/50'}`}>
                {step.text}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

// Remediation Module Card
function RemediationModuleCard({ card, onClick }: { card: RemediationCard; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const circumference = 2 * Math.PI * 24;
  const offset = circumference - (card.confidence / 100) * circumference;

  return (
    <motion.button
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="relative w-full p-4 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 hover:border-neon-cyan/30 transition-all duration-300 overflow-hidden group"
    >
      {/* Animated background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        animate={isHovered ? { opacity: [0, 1, 1] } : {}}
      />

      {/* Confidence ring - positioned at top-right */}
      <div className="absolute top-2 right-2">
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
          <motion.circle
            cx="20" cy="20" r="16" fill="none"
            stroke={card.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference * 0.8}
            initial={{ strokeDashoffset: circumference * 0.8 }}
            animate={{ strokeDashoffset: offset * 0.8 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 4px ${card.color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] font-bold text-white">{card.confidence}%</span>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-left pr-10">
        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mb-2 group-hover:bg-neon-cyan/10 transition-colors">
          {card.icon}
        </div>

        <h4 className="font-semibold text-white text-sm mb-1 leading-tight">{card.label}</h4>
        <p className="text-[11px] text-white/50 mb-3 leading-snug line-clamp-2">{card.description}</p>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-[10px] text-white/40">
          <div className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            <span>{card.duration}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />
            <span>{card.successRate}%</span>
          </div>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: `0 0 20px ${card.color}20, inset 0 0 20px ${card.color}10` }} />
    </motion.button>
  );
}

// Enterprise Issue Card
function EnterpriseIssueCard({ issue, onFix }: { issue: Issue; onFix: () => void }) {
  const severityConfig = {
    low: { color: '#10b981', label: 'Low', bg: 'bg-neon-green/10' },
    medium: { color: '#facc15', label: 'Medium', bg: 'bg-neon-yellow/10' },
    high: { color: '#f97316', label: 'High', bg: 'bg-orange-500/10' },
    critical: { color: '#ef4444', label: 'Critical', bg: 'bg-neon-red/10' },
  };

  const config = severityConfig[issue.severity];

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="p-4 sm:p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all"
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg}`} style={{ color: config.color }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: config.color }} />
          {config.label}
        </span>
        <span className="text-xs text-white/40 truncate max-w-[100px]">{issue.category}</span>
        <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neon-purple/10 flex-shrink-0">
          <Brain className="w-3 h-3 text-neon-purple" />
          <span className="text-xs font-mono text-neon-purple">{issue.confidence}%</span>
        </div>
      </div>

      <h4 className="font-semibold text-white text-sm mb-2 leading-snug line-clamp-2">{issue.title}</h4>

      {/* AI Analysis */}
      {issue.rootCause && (
        <div className="mb-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
          <div className="text-xs text-white/40 mb-1">Root Cause Analysis</div>
          <div className="text-xs text-white/70">{issue.rootCause}</div>
        </div>
      )}

      {/* Business Impact */}
      {issue.businessImpact && (
        <div className="mb-3 flex items-center gap-2 text-xs">
          <AlertTriangle className="w-3 h-3 text-neon-yellow" />
          <span className="text-white/60">Impact: <span className="text-white/80">{issue.businessImpact}</span></span>
          {issue.timeToFailure && (
            <span className="ml-auto text-neon-orange">Failure in: {issue.timeToFailure}</span>
          )}
        </div>
      )}

      {/* Affected Services */}
      {issue.affectedServices && issue.affectedServices.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Layers className="w-3 h-3 text-white/40" />
          <div className="flex gap-1 flex-wrap">
            {issue.affectedServices.map((service, i) => (
              <span key={i} className="px-2 py-0.5 rounded text-xxs bg-white/5 text-white/50">{service}</span>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Fix */}
      {issue.recommendedFix && (
        <div className="mb-4 p-3 rounded-lg bg-neon-cyan/5 border border-neon-cyan/10">
          <div className="text-xs text-neon-cyan mb-1 flex items-center gap-1">
            <WrenchIcon className="w-3 h-3" />
            Recommended Fix
          </div>
          <div className="text-xs text-white/70">{issue.recommendedFix}</div>
        </div>
      )}

      {/* Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3 pt-3 border-t border-white/5">
        <span className="text-xs text-white/40 truncate">Detected by {issue.detectedBy} • {issue.timestamp}</span>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onFix}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-neon-cyan/20 to-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 hover:border-neon-cyan/50 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Zap className="w-3 h-3" />
          Execute Fix
        </motion.button>
      </div>
    </motion.div>
  );
}

// Collapsible Sidebar
function CollapsibleSidebar({ isCollapsed, onToggle, activeItem, onItemClick, deviceCount, onlineCount }: {
  isCollapsed: boolean;
  onToggle: () => void;
  activeItem?: string;
  onItemClick?: (id: string) => void;
  deviceCount?: number;
  onlineCount?: number;
}) {
  return (
    <motion.div
      animate={{ width: isCollapsed ? 72 : 240 }}
      className="h-full rounded-2xl glass flex flex-col relative overflow-hidden"
    >
      {/* Logo */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #00e5ff 0%, #a855f7 100%)' }}
          >
            <span className="text-xl">🩺</span>
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-hidden"
              >
                <h1 className="text-lg font-bold whitespace-nowrap">
                  <span className="text-glow-cyan">IntelliFix</span>
                  <span className="text-white/70"> AI</span>
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeItem;
          const isDevices = item.id === 'devices';
          const isIncidents = item.id === 'incidents';

          const handleClick = () => {
            if (item.id === 'settings') {
              onItemClick?.('settings');
            } else {
              onItemClick?.(item.id);
            }
          };

          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleClick}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium whitespace-nowrap flex-1 text-left"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!isCollapsed && item.badge && (
                <span className="px-2 py-0.5 rounded-full bg-neon-pink/20 text-xxs font-medium text-neon-pink">
                  {item.badge}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Toggle Button */}
      <motion.button
        onClick={onToggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-space-black border border-white/10 flex items-center justify-center z-10"
      >
        {isCollapsed ? <ChevronRight className="w-3 h-3 text-white/60" /> : <ChevronLeft className="w-3 h-3 text-white/60" />}
      </motion.button>

      {/* User */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">N</span>
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-hidden"
              >
                <p className="text-sm font-medium text-white truncate">{getDisplayName()}</p>
                <p className="text-xxs text-white/40 truncate">Endpoint Admin</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// Health Score Gauge
function HealthScoreGauge({ score, label }: { score: number; label: string }) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  const color = score > 80 ? '#10b981' : score > 60 ? '#facc15' : '#ef4444';

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <motion.circle
          cx="50" cy="50" r="40" fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 8px ${color}50)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{score}</span>
        <span className="text-xxs text-white/40 uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}

// Telemetry Card
function TelemetryCard({ metric, value, unit, privacyMode }: { metric: string; value: number; unit: string; privacyMode?: boolean }) {
  const getColor = (v: number) => {
    if (v > 85) return '#ef4444';
    if (v > 70) return '#facc15';
    return '#00e5ff';
  };

  const color = getColor(value);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <span className="text-xs text-white/50 w-8">{metric}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: privacyMode ? '0%' : `${Math.min(value, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ background: color }}
        />
      </div>
      <span className="text-sm font-mono font-bold text-white w-12 text-right">
        {privacyMode ? '•••' : `${Math.round(value)}`}<span className="text-xs text-white/40">{privacyMode ? '' : unit}</span>
      </span>
    </div>
  );
}

// Settings Panel
function SettingsPanel({ isOpen, onClose, privacyMode, onPrivacyModeChange }: {
  isOpen: boolean;
  onClose: () => void;
  privacyMode: boolean;
  onPrivacyModeChange: (value: boolean) => void;
}) {
  const [settings, setSettings] = useState({
    aiSensitivity: 80,
    autoRemediation: true,
    notifications: true,
  });
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwOk, setPwOk] = useState(false);

  const changePassword = async () => {
    setPwMsg('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      const data = await res.json().catch(() => ({}));
      setPwOk(res.ok);
      setPwMsg(res.ok ? 'Password updated.' : data.error || 'Failed to update password.');
      if (res.ok) { setCurPw(''); setNewPw(''); }
    } catch {
      setPwOk(false); setPwMsg('Network error.');
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed top-0 right-0 w-[400px] h-full bg-space-black/95 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col"
    >
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Settings</h2>
        <motion.button whileHover={{ scale: 1.1 }} onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10">
          <X className="w-5 h-5 text-white/60" />
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">AI Configuration</h3>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white">AI Sensitivity</p>
              <span className="text-sm text-neon-cyan font-mono">{settings.aiSensitivity}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={settings.aiSensitivity}
              onChange={(e) => setSettings({ ...settings, aiSensitivity: Number(e.target.value) })}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, #00e5ff 0%, #00e5ff ${settings.aiSensitivity}%, rgba(255,255,255,0.1) ${settings.aiSensitivity}%, rgba(255,255,255,0.1) 100%)` }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Privacy</h3>
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div>
              <p className="text-sm font-medium text-white">Privacy Mode</p>
              <p className="text-xs text-white/50">Hide sensitive system information from display</p>
            </div>
            <button
              onClick={() => onPrivacyModeChange(!privacyMode)}
              className={`w-14 h-7 rounded-full transition-all duration-300 flex items-center px-1 ${privacyMode ? 'bg-neon-cyan' : 'bg-white/20'}`}
            >
              <motion.div
                animate={{ x: privacyMode ? 28 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="w-5 h-5 rounded-full bg-white shadow-lg"
              />
            </button>
          </div>
          {privacyMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20"
            >
              <div className="flex items-start gap-3">
                <EyeOff className="w-5 h-5 text-neon-cyan flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-white font-medium mb-1">Privacy Mode Active</p>
                  <p className="text-xs text-white/60">
                    Hostname, IP addresses, and detailed system info are now hidden from the dashboard.
                    Data is still collected for remediation purposes.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Preferences</h3>
          {[
            { key: 'autoRemediation', label: 'Auto-Remediation', desc: 'Automatically fix detected issues' },
            { key: 'notifications', label: 'Notifications', desc: 'Push alerts for critical issues' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-white/50">{item.desc}</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, [item.key]: !settings[item.key as keyof typeof settings] })}
                className={`w-12 h-6 rounded-full transition-colors ${settings[item.key as keyof typeof settings] ? 'bg-neon-cyan' : 'bg-white/20'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${settings[item.key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Security</h3>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <p className="text-sm font-medium text-white">Change Password</p>
            <input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} placeholder="Current password"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-neon-cyan/50 text-sm" />
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password (min 6)"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-neon-cyan/50 text-sm" />
            {pwMsg && <p className={`text-xs ${pwOk ? 'text-neon-green' : 'text-neon-red'}`}>{pwMsg}</p>}
            <button onClick={changePassword} disabled={!curPw || !newPw}
              className="w-full mt-1 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00e5ff 0%, #a855f7 100%)' }}>
              Update Password
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-white/10">
        <p className="text-xs text-white/40 text-center">IntelliFix AI v1.0.0 • Developed by Naveen Singh</p>
      </div>
    </motion.div>
  );
}

// Notifications Panel
function NotificationsPanel({ isOpen, onClose, notifications }: { isOpen: boolean; onClose: () => void; notifications: Notification[] }) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full right-0 mt-2 w-[360px] rounded-xl bg-space-black/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-semibold text-white">Notifications</h3>
        <span className="text-xs text-white/50">{notifications.filter(n => !n.read).length} unread</span>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.map((n) => (
          <div key={n.id} className={`px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] ${!n.read ? 'bg-neon-cyan/5' : ''}`}>
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded-lg ${n.type === 'alert' ? 'bg-neon-red/10' : n.type === 'prediction' ? 'bg-neon-yellow/10' : 'bg-neon-cyan/10'}`}>
                {n.type === 'alert' ? <AlertTriangle className="w-4 h-4 text-neon-red" /> :
                 n.type === 'prediction' ? <TrendingUp className="w-4 h-4 text-neon-yellow" /> :
                 <Activity className="w-4 h-4 text-neon-cyan" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">{n.title}</span>
                  <span className="text-xs text-white/40">{formatTime(n.timestamp)}</span>
                </div>
                <p className="text-xs text-white/60">{n.message}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-neon-cyan mt-1.5" />}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Enhanced Chat Assistant
function ChatAssistant({ isOpen, onToggle, messages, onSendMessage, isTyping }: {
  isOpen: boolean;
  onToggle: () => void;
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  isTyping: boolean;
}) {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) { onSendMessage(input); setInput(''); }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #00e5ff 0%, #a855f7 100%)', boxShadow: '0 4px 30px rgba(0, 229, 255, 0.4)' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div className="absolute inset-0 rounded-full border-2 border-white/30" animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2.5, repeat: Infinity }} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20, x: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0, x: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20, x: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`fixed z-50 rounded-2xl overflow-hidden flex flex-col ${isExpanded ? 'inset-6' : 'bottom-24 right-6 w-[420px] h-[560px]'}`}
            style={{ background: 'linear-gradient(180deg, rgba(20, 20, 42, 0.98) 0%, rgba(10, 10, 18, 0.99) 100%)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0, 229, 255, 0.15)', boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5)' }}
          >
            <div className="px-5 py-4 flex items-center justify-between flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.08) 0%, rgba(168, 85, 247, 0.03) 100%)', borderBottom: '1px solid rgba(0, 229, 255, 0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00e5ff 0%, #a855f7 100%)' }}>
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">IntelliFix AI</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                    <span className="text-xs text-neon-green">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <motion.button whileHover={{ scale: 1.1 }} onClick={() => setIsExpanded(!isExpanded)} className="p-2 rounded-lg hover:bg-white/10">
                  {isExpanded ? <Minimize2 className="w-4 h-4 text-white/60" /> : <Maximize2 className="w-4 h-4 text-white/60" />}
                </motion.button>
              </div>
            </div>

            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center px-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #00e5ff 0%, #a855f7 100%)' }}>
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{getGreeting()}, {getDisplayName()}</h3>
                <p className="text-sm text-white/60 text-center mb-4">
                  IntelliFix AI is actively monitoring your system.<br />1 predictive anomaly detected.<br />No critical remediation required.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['High CPU', 'Outlook Slow', 'Printer Error', 'Network Issue'].map((label) => (
                    <motion.button key={label} onClick={() => onSendMessage(`${label.toLowerCase()} issue`)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: 'rgba(0, 229, 255, 0.1)', border: '1px solid rgba(0, 229, 255, 0.2)', color: '#00e5ff' }}>
                      {label}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {messages.length > 0 && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-4 py-3 rounded-2xl max-w-[85%] backdrop-blur-sm ${msg.role === 'user' ? 'bg-neon-cyan/10 border border-neon-cyan/20' : 'bg-white/5 border border-white/10'}`}>
                      <p className="text-sm text-white/90 whitespace-pre-wrap">{msg.content}</p>
                      <span className="text-xxs text-white/30 mt-1 block">{formatTime(msg.timestamp)}</span>
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <div className="flex items-center gap-2">
                    <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple" style={{ animation: `typing 1.4s ${i * 0.2}s infinite` }} />)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex gap-2">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Describe your issue..."
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 outline-none focus:border-neon-cyan/50 transition-colors" />
                <motion.button type="submit" disabled={!input.trim()} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: input.trim() ? 'linear-gradient(135deg, #00e5ff 0%, #a855f7 100%)' : 'rgba(255,255,255,0.08)', cursor: input.trim() ? 'pointer' : 'not-allowed' }}>
                  <Send className="w-4 h-4 text-white" />
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Animated count-up for KPI values like "127", "94%", "48h"
function CountUp({ text }: { text: string }) {
  const match = /^([\d.]+)(.*)$/.exec(text.trim());
  const target = match ? parseFloat(match[1]) : NaN;
  const suffix = match ? match[2] : '';
  const decimals = match ? (match[1].split('.')[1]?.length ?? 0) : 0;
  const [v, setV] = useState(0);

  useEffect(() => {
    if (isNaN(target)) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1100;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  if (isNaN(target)) return <>{text}</>;
  return <>{v.toFixed(decimals)}{suffix}</>;
}

// Slim labelled utilisation meter
function Meter({ label, value }: { label: string; value: number }) {
  const color = value > 85 ? '#ef4444' : value > 70 ? '#facc15' : '#00e5ff';
  return (
    <div className="w-24">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xxs text-white/40">{label}</span>
        <span className="text-xs font-mono text-white tnum">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }} style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
    </div>
  );
}

// Recharts fleet-performance trend (gradient area)
function FleetTrendChart() {
  const data = [
    { day: 'Mon', v: 65 }, { day: 'Tue', v: 72 }, { day: 'Wed', v: 68 }, { day: 'Thu', v: 75 },
    { day: 'Fri', v: 70 }, { day: 'Sat', v: 78 }, { day: 'Sun', v: 82 }, { day: 'Today', v: 80 },
  ];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'rgba(10,10,18,0.95)', border: '1px solid rgba(0,229,255,0.25)', borderRadius: 10, fontSize: 12 }}
          labelStyle={{ color: '#00e5ff' }} cursor={{ stroke: 'rgba(0,229,255,0.2)' }}
        />
        <Area type="monotone" dataKey="v" name="Health" stroke="#00e5ff" strokeWidth={2} fill="url(#trendFill)"
          dot={{ r: 2, fill: '#00e5ff' }} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const COMPLIANCE_COLORS: Record<string, string> = {
  pass: '#10b981', fail: '#ef4444', warning: '#facc15', unknown: '#64748b',
};

// Full compliance dashboard driven by live agent data
function ComplianceView({ device }: { device: any }) {
  const compliance = device?.compliance ?? { score: 0, controls: [] };
  const controls: any[] = compliance.controls ?? [];
  const count = (s: string) => controls.filter((c) => c.status === s).length;
  const score = compliance.score ?? 0;
  const ring = score >= 80 ? '#10b981' : score >= 60 ? '#facc15' : '#ef4444';
  const circ = 2 * Math.PI * 52;

  if (!device) {
    return (
      <div className="holo rounded-2xl p-12 text-center text-white/40">
        <FileCheck className="w-16 h-16 mx-auto mb-4 text-neon-green/40" />
        <p className="text-lg text-white/70">No agent connected</p>
        <p className="text-sm">Compliance scan appears once the IntelliFix Agent reports in.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileCheck className="w-6 h-6 text-neon-green" />
        <h2 className="text-xl font-bold text-white">Compliance Dashboard</h2>
        <span className="text-xs text-white/40">{device.hostname}</span>
        <button className="ml-auto px-4 py-2 rounded-lg bg-neon-green/15 border border-neon-green/30 text-neon-green text-sm font-medium flex items-center gap-2 hover:bg-neon-green/25 transition-colors">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Score ring */}
        <div className="col-span-12 lg:col-span-3 holo rounded-2xl p-6 flex flex-col items-center justify-center">
          <div className="text-xxs uppercase tracking-widest text-white/40 mb-3">Compliance Score</div>
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <motion.circle cx="60" cy="60" r="52" fill="none" stroke={ring} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ - (score / 100) * circ }}
                transition={{ duration: 1.4, ease: 'easeOut' }} style={{ filter: `drop-shadow(0 0 10px ${ring}80)` }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-white tnum"><CountUp text={`${score}`} />%</span>
            </div>
          </div>
          <div className="mt-3 text-sm font-semibold" style={{ color: ring }}>
            {score >= 80 ? 'Compliant' : score >= 60 ? 'Needs Attention' : 'At Risk'}
          </div>
        </div>

        {/* Stat tiles */}
        <div className="col-span-12 lg:col-span-9 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Passed', v: count('pass'), c: '#10b981' },
            { label: 'Failed', v: count('fail'), c: '#ef4444' },
            { label: 'Warnings', v: count('warning'), c: '#facc15' },
            { label: 'Unknown', v: count('unknown'), c: '#64748b' },
          ].map((t) => (
            <div key={t.label} className="holo rounded-2xl p-5">
              <div className="text-4xl font-extrabold tnum" style={{ color: t.c }}><CountUp text={`${t.v}`} /></div>
              <div className="text-xs text-white/50 mt-1">{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls table */}
      <div className="holo rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-4">Security Controls</h3>
        <div className="grid grid-cols-12 gap-2 px-3 pb-2 text-xxs uppercase tracking-wider text-white/30 border-b border-white/5">
          <div className="col-span-2">ID</div><div className="col-span-4">Control</div>
          <div className="col-span-2">Category</div><div className="col-span-2">Standard</div><div className="col-span-2">Status</div>
        </div>
        {controls.map((c) => (
          <div key={c.id} className="grid grid-cols-12 gap-2 px-3 py-3 items-center border-b border-white/[0.03] hover:bg-white/[0.02] rounded-lg">
            <div className="col-span-2 font-mono text-xs text-white/40">{c.id}</div>
            <div className="col-span-4 text-sm text-white">{c.name}<div className="text-xxs text-white/30">{c.detail}</div></div>
            <div className="col-span-2 text-xs text-white/60">{c.category}</div>
            <div className="col-span-2"><span className="px-2 py-0.5 rounded bg-neon-cyan/10 text-neon-cyan text-xxs">{c.standard}</span></div>
            <div className="col-span-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xxs font-semibold uppercase"
                style={{ color: COMPLIANCE_COLORS[c.status] ?? '#64748b', background: `${COMPLIANCE_COLORS[c.status] ?? '#64748b'}1a` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: COMPLIANCE_COLORS[c.status] ?? '#64748b' }} />
                {c.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Terminal-style live Windows Event stream
function EventStream({ events }: { events: any[] }) {
  const levelColor = (l: string) => l === 'Critical' || l === 'Error' ? '#ef4444' : l === 'Warning' ? '#facc15' : '#00e5ff';
  return (
    <div className="holo rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Terminal className="w-4 h-4 text-neon-cyan" />
        <h3 className="font-semibold text-white">Live System Event Stream</h3>
        <span className="ml-auto text-xxs text-white/40">{events.length} events · last 6h</span>
      </div>
      <div className="font-mono text-xs space-y-1 max-h-[420px] overflow-y-auto pr-1">
        {events.length === 0 && <div className="text-white/30">No recent events.</div>}
        {events.map((e, i) => (
          <div key={i} className="flex gap-3 py-1 border-b border-white/[0.03]">
            <span className="text-white/30 shrink-0">{new Date(e.timeCreated).toLocaleTimeString()}</span>
            <span className="shrink-0 w-16 font-semibold" style={{ color: levelColor(e.level) }}>{e.level}</span>
            <span className="text-white/40 shrink-0 w-28 truncate">{e.source}</span>
            <span className="text-white/70 truncate">{e.message || `Event ${e.eventId}`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// First-login prompt to install the agent (also surfaces the device-data notice)
function AgentInstallModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="holo rounded-3xl p-8 w-full max-w-[520px] relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-white/60" /></button>
        <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center glow-pulse"
          style={{ background: 'linear-gradient(135deg, #00e5ff 0%, #a855f7 100%)' }}>
          <Download className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-2">Connect this device</h2>
        <p className="text-sm text-white/60 text-center mb-5">
          No agent is reporting yet. Install the IntelliFix agent to stream live telemetry and enable one-touch remediation.
        </p>

        <div className="space-y-3 mb-5">
          {[
            'Download the agent bundle below.',
            'Run install-agent.ps1 as administrator (it self-elevates).',
            'This device appears here within a few seconds.',
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-white/70">
              <span className="w-6 h-6 rounded-full bg-neon-cyan/15 text-neon-cyan flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
              {s}
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-neon-yellow/10 border border-neon-yellow/20 p-3 mb-5">
          <p className="text-xxs text-neon-yellow leading-relaxed">
            ⚠ The agent collects system metrics, recent Event Log entries and compliance status from this device.
            See the <a href="/privacy" target="_blank" className="underline">Privacy Policy</a>. Every remediation is consent-gated.
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-white/70 bg-white/5 border border-white/10 hover:bg-white/10">Maybe later</button>
          <a href="/api/agent/download" className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white text-center flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #00e5ff 0%, #a855f7 100%)' }}>
            <Download className="w-4 h-4" /> Download Agent
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function IntelliFixApp() {
  // State
  const [metrics, setMetrics] = useState<SystemMetrics>({ cpu: 0, ram: 0, disk: 0, network: 0 });
  const [activities, setActivities] = useState<AIActivity[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [welcomeShown, setWelcomeShown] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [healthScore, setHealthScore] = useState(0);
  const [trustScore, setTrustScore] = useState(100);
  const [devices, setDevices] = useState<ApiDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [fleetSummary, setFleetSummary] = useState<{ total: number; online: number; offline: number; avgHealthScore: number } | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [fleetMetrics, setFleetMetrics] = useState<FleetMetrics>({ avgCpu: 0, avgRam: 0, avgDisk: 0, avgNetwork: 0, totalProcesses: 0 });
  const [remediationHistory, setRemediationHistory] = useState<any[]>([]);
  const [isExecutingFix, setIsExecutingFix] = useState(false);
  const [fixProgress, setFixProgress] = useState(0);
  const [fixStatus, setFixStatus] = useState('');
  const [activeNavItem, setActiveNavItem] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [pendingFix, setPendingFix] = useState<{ actionType: string; card: RemediationCard | null } | null>(null);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [authUser, setAuthUser] = useState('');
  const [agentPromptDismissed, setAgentPromptDismissed] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => {
        if (r.status === 401) { window.location.assign('/login'); return null; }
        return r.ok ? r.json() : null;
      })
      .then((d) => { if (d?.username) setAuthUser(d.username); })
      .catch(() => {});
    try { setAgentPromptDismissed(localStorage.getItem('intellifix_agent_prompt') === 'dismissed'); } catch {}
  }, []);

  const dismissAgentPrompt = () => {
    try { localStorage.setItem('intellifix_agent_prompt', 'dismissed'); } catch {}
    setAgentPromptDismissed(true);
  };

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.assign('/login');
  };

  // Remediation cards - 15 Enterprise Actions
  const remediationCards: RemediationCard[] = [
    // Silent Healing Actions (10)
    { id: 'disk_cleanup', icon: <HardDrive className="w-5 h-5 text-neon-cyan" />, label: 'Disk Cleanup', description: 'Clean temp files, browser cache & system junk', confidence: 92, severity: 'medium', color: '#00e5ff', duration: '45s', successRate: 95, safeExecution: true, silentOnly: true, category: 'performance' },
    { id: 'temp_cleanup', icon: <FileText className="w-5 h-5 text-neon-green" />, label: 'Temp Cleanup', description: 'Remove temp files older than 7 days', confidence: 95, severity: 'low', color: '#10b981', duration: '30s', successRate: 98, safeExecution: true, silentOnly: true, category: 'performance' },
    { id: 'dns_flush', icon: <Network className="w-5 h-5 text-neon-purple" />, label: 'DNS Flush', description: 'Clear DNS resolver cache', confidence: 88, severity: 'medium', color: '#a855f7', duration: '10s', successRate: 92, safeExecution: true, silentOnly: true, category: 'network' },
    { id: 'print_spooler_restart', icon: <Printer className="w-5 h-5 text-neon-cyan" />, label: 'Spooler Restart', description: 'Restart Print Spooler service', confidence: 90, severity: 'medium', color: '#00e5ff', duration: '15s', successRate: 97, safeExecution: true, silentOnly: true, category: 'application' },
    { id: 'teams_cache_cleanup', icon: <MessageCircle className="w-5 h-5 text-blue-400" />, label: 'Teams Cache', description: 'Clear Teams cache for sync issues', confidence: 85, severity: 'low', color: '#60a5fa', duration: '20s', successRate: 91, safeExecution: true, silentOnly: true, category: 'application' },
    { id: 'outlook_cache_cleanup', icon: <Mail className="w-5 h-5 text-neon-cyan" />, label: 'Outlook Cache', description: 'Clear Outlook local cache files', confidence: 87, severity: 'medium', color: '#00e5ff', duration: '25s', successRate: 89, safeExecution: true, silentOnly: true, category: 'application' },
    { id: 'wifi_adapter_reset', icon: <Wifi className="w-5 h-5 text-neon-purple" />, label: 'Wi-Fi Reset', description: 'Disable/re-enable Wi-Fi adapter', confidence: 89, severity: 'medium', color: '#a855f7', duration: '10s', successRate: 94, safeExecution: true, silentOnly: true, category: 'network' },
    { id: 'memory_optimization', icon: <MemoryStick className="w-5 h-5 text-neon-green" />, label: 'Memory Optimize', description: 'Clear memory working sets', confidence: 91, severity: 'low', color: '#10b981', duration: '15s', successRate: 96, safeExecution: true, silentOnly: true, category: 'performance' },
    { id: 'windows_service_restart', icon: <Server className="w-5 h-5 text-orange-400" />, label: 'Service Restart', description: 'Restart problematic Windows services', confidence: 82, severity: 'high', color: '#f97316', duration: '20s', successRate: 88, safeExecution: true, silentOnly: true, category: 'system' },
    { id: 'file_association_repair', icon: <FileCheck className="w-5 h-5 text-blue-400" />, label: 'File Assoc Repair', description: 'Reset file type associations', confidence: 78, severity: 'low', color: '#60a5fa', duration: '30s', successRate: 85, safeExecution: true, silentOnly: true, category: 'system' },
    // User-Confirmation Actions (5)
    { id: 'outlook_profile_repair', icon: <Mail className="w-5 h-5 text-neon-cyan" />, label: 'Outlook Profile', description: 'Repair Outlook profile (will close Outlook)', confidence: 85, severity: 'high', color: '#00e5ff', duration: '2min', successRate: 87, safeExecution: false, requiresApproval: true, category: 'application' },
    { id: 'excel_crash_recovery', icon: <FileSpreadsheet className="w-5 h-5 text-neon-purple" />, label: 'Excel Recovery', description: 'Force restart Excel (save work first)', confidence: 88, severity: 'critical', color: '#a855f7', duration: '1min', successRate: 90, safeExecution: false, requiresApproval: true, category: 'application' },
    { id: 'chrome_forced_restart', icon: <Globe className="w-5 h-5 text-orange-400" />, label: 'Chrome Restart', description: 'Force restart Chrome (all tabs close)', confidence: 90, severity: 'medium', color: '#f97316', duration: '30s', successRate: 95, safeExecution: false, requiresApproval: true, category: 'application' },
    { id: 'device_reboot', icon: <Monitor className="w-5 h-5 text-neon-red" />, label: 'Device Reboot', description: 'Schedule system reboot (save all work)', confidence: 95, severity: 'high', color: '#ef4444', duration: '5min', successRate: 100, safeExecution: false, requiresApproval: true, category: 'system' },
    { id: 'vpn_reconfiguration', icon: <Shield className="w-5 h-5 text-neon-purple" />, label: 'VPN Reset', description: 'Reset VPN configuration', confidence: 80, severity: 'high', color: '#a855f7', duration: '1min', successRate: 85, safeExecution: false, requiresApproval: true, category: 'network' },
  ];

  // Effects
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch devices first (now returns { devices, fleetSummary })
        const devicesResult = await api.getDevices();
        const devicesData = devicesResult.devices;

        // Set fleet summary for display
        setFleetSummary(devicesResult.fleetSummary || null);

        // Fetch summary for additional data
        const summaryResult = await api.getSummary();
        const summaryData = summaryResult.summary;
        const fleetData = summaryResult.fleetMetrics;

        // Fetch history
        const historyData = await api.getRemediationHistory();

        // Only set state if we have devices from API
        if (devicesData.length > 0) {
          setDevices(devicesData);
          setSummary(summaryData);
          setFleetMetrics(fleetData);
        }
        // Always try to set history
        setRemediationHistory(historyData.history || []);

        // Update metrics from first device (with fallback to fleet metrics)
        if (devicesData.length > 0) {
          const device = devicesData[0];
          // Use device metrics if available, otherwise use fleet metrics as fallback
          if (device.metrics) {
            setMetrics({
              cpu: device.metrics.cpu,
              ram: device.metrics.ram,
              disk: device.metrics.disk,
              network: device.metrics.network
            });
          } else if (fleetData.avgCpu > 0) {
            // Fallback to fleet metrics for display
            setMetrics({
              cpu: fleetData.avgCpu,
              ram: fleetData.avgRam,
              disk: fleetData.avgDisk,
              network: fleetData.avgNetwork
            });
          }
          // Use device healthScore or fall back to summary average
          const deviceHealth = device.healthScore || 0;
          const avgHealth = summaryData.averageHealthScore || 0;
          setHealthScore(deviceHealth > 0 ? deviceHealth : avgHealth);
          setTrustScore(device.trustScore || 100);
        }

        // Initialize synthetic issues for demo
        const syntheticIssues: Issue[] = [
          {
            id: 'issue-1',
            title: 'High Memory Usage Detected',
            description: 'Chrome processes consuming excessive RAM (2.4GB). Multiple tabs with memory leaks identified.',
            severity: 'high',
            confidence: 87,
            timestamp: new Date(Date.now() - 15 * 60000).toLocaleString(),
            category: 'Memory',
            detectedBy: 'IntelliFix AI'
          },
          {
            id: 'issue-2',
            title: 'Network Latency Spike',
            description: 'DNS resolution times increased to 450ms. Possible router or ISP issue.',
            severity: 'medium',
            confidence: 72,
            timestamp: new Date(Date.now() - 45 * 60000).toLocaleString(),
            category: 'Network',
            detectedBy: 'IntelliFix AI'
          },
          {
            id: 'issue-3',
            title: 'Disk Space Low',
            description: 'C: drive at 92% capacity. Recommendation: Run disk cleanup or expand storage.',
            severity: 'critical',
            confidence: 95,
            timestamp: new Date(Date.now() - 2 * 60 * 60000).toLocaleString(),
            category: 'Storage',
            detectedBy: 'IntelliFix AI'
          },
          {
            id: 'issue-4',
            title: 'Windows Update Pending',
            description: '12 updates pending installation including critical security patches.',
            severity: 'high',
            confidence: 99,
            timestamp: new Date(Date.now() - 6 * 60 * 60000).toLocaleString(),
            category: 'Updates',
            detectedBy: 'IntelliFix AI'
          },
          {
            id: 'issue-5',
            title: 'Outlook Cache Corruption',
            description: 'OST file integrity check failed. Recommend repair or recreate profile.',
            severity: 'medium',
            confidence: 68,
            timestamp: new Date(Date.now() - 24 * 60 * 60000).toLocaleString(),
            category: 'Application',
            detectedBy: 'IntelliFix AI'
          }
        ];

        // Update issues from devices, fall back to synthetic data if no real issues
        const allIssues: Issue[] = devicesData.flatMap(d =>
          (d.issues || []).map((issue: any) => ({
            id: issue.id || `issue-${d.deviceId}-${Date.now()}`,
            title: issue.title || 'System Issue',
            description: issue.description || '',
            severity: (issue.severity as 'low' | 'medium' | 'high' | 'critical') || 'medium',
            confidence: issue.confidence || 80,
            timestamp: issue.detectedAt ? new Date(issue.detectedAt).toLocaleString() : 'Recently',
            category: 'System',
            detectedBy: 'IntelliFix AI'
          }))
        );

        // Use synthetic issues if no real issues exist
        setIssues(allIssues.length > 0 ? allIssues : syntheticIssues);

        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Initialize activities
    const initActivities = [
      { id: '1', text: 'Scanning endpoint services', status: 'complete' as const, confidence: 100, duration: 2400 },
      { id: '2', text: 'Correlating event logs', status: 'complete' as const, confidence: 98, duration: 1800 },
      { id: '3', text: 'Analyzing memory patterns', status: 'analyzing' as const, confidence: 76 },
      { id: '4', text: 'Validating service health', status: 'pending' as const, confidence: 0 },
      { id: '5', text: 'Predicting failure anomalies', status: 'pending' as const, confidence: 0 },
    ];
    setActivities(initActivities);
  }, []);

  // Open fix confirmation popup
  const openFixConfirmation = useCallback((actionType: string, card: RemediationCard) => {
    if (devices.length === 0) {
      alert('No device registered. Please ensure the IntelliFix Agent is running.');
      return;
    }
    setPendingFix({ actionType, card });
  }, [devices]);

  // Execute fix after confirmation
  const executeConfirmedFix = useCallback(async () => {
    if (!pendingFix) return;
    const { actionType } = pendingFix;
    setPendingFix(null);

    const device = devices[0];
    setIsExecutingFix(true);
    setFixProgress(0);
    setFixStatus('Initializing autonomous fix...');

    try {
      // Steps with AI-themed messages
      const steps = [
        'Initializing neural remediation engine...',
        'Analyzing system state & dependencies...',
        'Calculating optimal fix parameters...',
        'Applying secure remediation steps...',
        'Validating fix effectiveness...',
        'Completing & generating report...'
      ];

      let stepIndex = 0;
      setFixStatus(steps[0]);

      const progressInterval = setInterval(() => {
        setFixProgress(prev => {
          const newProgress = Math.min(prev + 8, 95);
          const newStepIndex = Math.min(Math.floor(newProgress / (100 / steps.length)), steps.length - 1);
          if (newStepIndex > stepIndex) {
            stepIndex = newStepIndex;
            setFixStatus(steps[stepIndex]);
          }
          return newProgress;
        });
      }, 400);

      const result = await api.executeFix(device.deviceId, actionType);

      clearInterval(progressInterval);
      setFixProgress(100);
      setFixStatus('Remediation Complete!');

      if (result.success) {
        setTimeout(async () => {
          const devicesResult = await api.getDevices();
          const historyData = await api.getRemediationHistory();
          setDevices(devicesResult.devices);
          setFleetSummary(devicesResult.fleetSummary || null);
          setRemediationHistory(historyData.history || []);
        }, 1500);
      }
    } catch (error) {
      setFixStatus('Fix Failed - Rolling back...');
    }

    setTimeout(() => {
      setIsExecutingFix(false);
      setFixProgress(0);
      setFixStatus('');
    }, 3000);
  }, [devices]);

  // Handlers
  const handleSendMessage = useCallback(async (message: string) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: message, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
     const response = await getAIResponse(message, [...messages, userMsg]);
      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: response, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: "I apologize, but I'm experiencing a temporary issue. Please try again.", timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  }, [messages]);

  // Simple Chat Test Button Handler
  useEffect(() => {
    const btn = document.getElementById('chatBtn');
    const input = document.getElementById('chatInput') as HTMLInputElement;
    const responseDiv = document.getElementById('chatResponse');

    if (!btn || !input || !responseDiv) return;

    const handleClick = async () => {
      const msg = input.value.trim();
      if (!msg) return;

      responseDiv.textContent = 'Thinking...';
      btn.setAttribute('disabled', 'true');

      try {
        const res = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        responseDiv.textContent = data.reply || data.error || 'No response';
        input.value = '';
      } catch {
        responseDiv.textContent = 'Failed to connect to chat API';
      } finally {
        btn.removeAttribute('disabled');
      }
    };

    btn.addEventListener('click', handleClick);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleClick();
    });

    return () => {
      btn.removeEventListener('click', handleClick);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Derived state - use selected device or first device
  const currentDevice = selectedDeviceId
    ? devices.find(d => d.deviceId === selectedDeviceId) || devices[0]
    : devices[0];
  const deviceHostname = currentDevice?.hostname || 'No Device';
  const isDeviceOnline = currentDevice?.isOnline ?? false;

  // Render Yes/No confirmation popup
  const renderConfirmationPopup = () => (
    <AnimatePresence>
      {pendingFix && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-gradient-to-br from-space-black via-space-dark to-space-black border-2 border-neon-cyan/40 rounded-3xl p-8 w-[480px] relative overflow-hidden"
          >
            {/* Animated background glow */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-neon-cyan/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-neon-purple/20 rounded-full blur-3xl animate-pulse" />

            <div className="relative z-10 text-center">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 flex items-center justify-center"
              >
                <Zap className="w-10 h-10 text-neon-cyan" />
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-2xl font-bold text-white mb-2"
              >
                Confirm Remediation
              </motion.h2>

              {/* Action Type */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-neon-cyan font-semibold mb-4"
              >
                {pendingFix.card?.label || pendingFix.actionType}
              </motion.p>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-sm text-white/60 mb-6"
              >
                {pendingFix.card?.description || 'This action will optimize your system.'}
              </motion.p>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-6 mb-8"
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{pendingFix.card?.confidence || 90}%</div>
                  <div className="text-xs text-white/40">AI Confidence</div>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{pendingFix.card?.duration || '45s'}</div>
                  <div className="text-xs text-white/40">Est. Time</div>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-neon-green">{pendingFix.card?.successRate || 95}%</div>
                  <div className="text-xs text-white/40">Success Rate</div>
                </div>
              </motion.div>

              {/* Warning */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-neon-yellow/10 border border-neon-yellow/20 rounded-xl p-3 mb-6"
              >
                <p className="text-xs text-neon-yellow">
                  ⚠️ This action will be executed on your device. You can cancel anytime.
                </p>
              </motion.div>

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-4"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPendingFix(null)}
                  className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/20 text-white font-semibold hover:bg-white/10 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(0, 229, 255, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={executeConfirmedFix}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-semibold transition-all"
                >
                  Yes, Execute Fix
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render fix execution progress popup
  const renderFixProgressPopup = () => (
    <AnimatePresence>
      {isExecutingFix && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-space-black via-space-dark to-space-black border-2 border-neon-cyan/40 rounded-3xl p-10 w-[500px] relative overflow-hidden"
          >
            {/* Animated scanning line */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />

            {/* Corner decorations */}
            <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-neon-cyan/40 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-neon-cyan/40 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-neon-cyan/40 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-neon-cyan/40 rounded-br-lg" />

            <div className="relative z-10 text-center">
              {/* AI Core animation */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-neon-cyan/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute inset-2 rounded-full border border-neon-purple/40"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute inset-4 rounded-full bg-neon-cyan/20 flex items-center justify-center"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Zap className="w-10 h-10 text-neon-cyan" />
                </motion.div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-white mb-2">Autonomous Remediation</h3>
              <p className="text-sm text-white/60 mb-6">{fixStatus}</p>

              {/* Progress bar */}
              <div className="relative w-full h-3 bg-white/10 rounded-full overflow-hidden mb-4">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-cyan bg-[length:200%_100%]"
                  animate={{ backgroundPosition: ['0%_0%', '200%_0%'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ width: `${fixProgress}%` }}
                />
              </div>

              {/* Percentage */}
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-neon-cyan">{Math.round(fixProgress)}%</span>
                <span className="text-sm text-white/40">Complete</span>
              </div>

              {/* Status indicators */}
              <div className="flex items-center justify-center gap-8 mt-6">
                {['Analyzing', 'Applying', 'Validating'].map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      animate={{ opacity: fixProgress >= (i + 1) * 33 ? 1 : 0.3 }}
                      style={{ backgroundColor: fixProgress >= (i + 1) * 33 ? '#00e5ff' : '#ffffff' }}
                    />
                    <span className="text-xs text-white/50">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="min-h-screen h-screen flex overflow-hidden" style={{ background: 'linear-gradient(135deg, #07070d 0%, #0a0a12 50%, #07070d 100%)' }}>
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="fx-aurora" />
        <div className="fx-grid" />
        <div className="fx-scan" />
        <div className="fx-beam" />
        <div className="fx-vignette" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(0, 229, 255, 0.06) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.06) 0%, transparent 70%)' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%2300e5ff\' fill-opacity=\'0.015\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
      </div>

      {/* Sidebar */}
      <div className="relative z-20 p-4 flex-shrink-0">
        <CollapsibleSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          activeItem={activeNavItem}
          onItemClick={(id) => setActiveNavItem(id)}
          deviceCount={devices.length}
          onlineCount={devices.filter(d => d.isOnline).length}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="relative z-30 flex-shrink-0 backdrop-blur-xl border-b border-white/5" style={{ background: 'rgba(10, 10, 18, 0.85)' }}>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left - Device info */}
              <div className="flex items-center gap-4">
                {/* Device Selector Dropdown */}
                <div className="relative">
                  <select
                    value={selectedDeviceId || devices[0]?.deviceId || ''}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="appearance-none bg-space-dark/50 border border-white/10 rounded-lg px-3 py-2 pr-8 text-sm text-white cursor-pointer hover:border-neon-cyan/30 focus:outline-none focus:border-neon-cyan/50"
                  >
                    {devices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.hostname} - {device.isOnline ? 'Online' : 'Offline'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                </div>

                {/* Fleet Summary Badge */}
                {fleetSummary && fleetSummary.total > 1 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-xs text-white/40">Fleet:</span>
                    <span className="text-xs text-neon-green font-medium">{fleetSummary.online} Online</span>
                    <span className="text-xs text-white/20">|</span>
                    <span className="text-xs text-white/40">{fleetSummary.offline} Offline</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-white/40">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isDeviceOnline ? '#10b981' : '#ef4444' }} />
                  <span style={{ color: isDeviceOnline ? '#10b981' : '#ef4444' }}>{isDeviceOnline ? 'Online' : 'Offline'}</span>
                  {!isLoading && devices.length === 0 && (
                    <span className="text-xs text-neon-yellow">(No agent connected)</span>
                  )}
                </div>
              </div>

              {/* Center - Scores */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <HealthScoreGauge score={Math.round(healthScore)} label="Health" />
                  <div>
                    <div className="text-xs text-white/50">Device Health</div>
                    <div className="text-sm font-semibold text-white">
                      {healthScore > 80 ? 'Excellent' : healthScore > 60 ? 'Good' : healthScore > 40 ? 'Fair' : 'Critical'}
                    </div>
                  </div>
                </div>

                <div className="w-px h-12 bg-white/10" />

                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full bg-neon-purple/20 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-neon-purple" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neon-green border-2 border-space-black flex items-center justify-center">
                      <Check className="w-2 h-2 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/50">Security</div>
                    <div className="text-sm font-semibold text-neon-green">Compliant</div>
                  </div>
                </div>
              </div>

              {/* Right - Actions */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2.5 rounded-xl hover:bg-white/5">
                    <Bell className="w-5 h-5 text-white/70" />
                    {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-neon-pink text-xxs font-bold text-white flex items-center justify-center">{unreadCount}</span>}
                  </motion.button>
                  <AnimatePresence>
                    {showNotifications && <NotificationsPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} notifications={notifications} />}
                  </AnimatePresence>
                </div>

                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2.5 rounded-xl hover:bg-white/5">
                  <RefreshCw className="w-5 h-5 text-white/70" />
                </motion.button>

                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsSettingsOpen(true)} className="p-2.5 rounded-xl hover:bg-white/5">
                  <Settings className="w-5 h-5 text-white/70" />
                </motion.button>

                {authUser && <span className="text-xs text-white/50 px-1 hidden md:block">{authUser}</span>}
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={logout} title="Sign out"
                  className="p-2.5 rounded-xl hover:bg-white/5">
                  <LogOut className="w-5 h-5 text-white/70" />
                </motion.button>
              </div>
            </div>

            {/* Telemetry Row */}
            <div className="flex items-center gap-4 mt-4">
              <TelemetryCard metric="CPU" value={metrics.cpu} unit="%" privacyMode={privacyMode} />
              <TelemetryCard metric="RAM" value={metrics.ram} unit="%" privacyMode={privacyMode} />
              <TelemetryCard metric="DISK" value={metrics.disk} unit="%" privacyMode={privacyMode} />
              <TelemetryCard metric="NET" value={metrics.network} unit="ms" privacyMode={privacyMode} />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="relative z-10 flex-1 overflow-y-auto p-6">
          {/* Dashboard View */}
          {activeNavItem === 'dashboard' && (
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column */}
              <div className="col-span-8 space-y-6">
                {/* AI Core + AI Reasoning */}
                <div className="holo rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-neon-cyan" />
                      <h2 className="font-semibold text-white">AI Autonomous Intelligence Engine</h2>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neon-green/10 border border-neon-green/20">
                      <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                      <span className="text-xs text-neon-green font-medium">Analyzing</span>
                    </div>
                  </div>
                  <AICoreVisualization metrics={metrics} />
                  <AIReasoningLayer />
                </div>

                {/* Remediation Modules */}
                <div className="holo rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-neon-cyan" />
                      <h2 className="font-semibold text-white">AI Remediation Modules</h2>
                    </div>
                    <span className="text-xs text-white/40">Select a module to begin autonomous remediation</span>
                  </div>
                  <div className="grid grid-cols-5 gap-4">
                    {remediationCards.map((card) => (
                      <RemediationModuleCard key={card.id} card={card} onClick={() => openFixConfirmation(card.id, card)} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="col-span-4 space-y-6">
                {/* Detected Issues */}
                <div className="holo rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-neon-red" />
                      <h2 className="font-semibold text-white">Detected Issues</h2>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-xxs text-white/50">{issues.length} active</span>
                  {summary && summary.totalIssues > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-neon-red/20 text-xxs text-neon-red">
                      {summary.criticalIssues > 0 ? `${summary.criticalIssues} critical` : summary.highIssues > 0 ? `${summary.highIssues} high` : `${summary.totalIssues}`}
                    </span>
                  )}
                </div>
                <div className="space-y-4">
                  {issues.length > 0 ? issues.map((issue) => (
                    <EnterpriseIssueCard key={issue.id} issue={issue} onFix={() => {
                    const actionType = issue.title.toLowerCase().includes('cpu') ? 'cpu' :
                      issue.title.toLowerCase().includes('network') ? 'network' :
                      issue.title.toLowerCase().includes('outlook') ? 'outlook' :
                      issue.title.toLowerCase().includes('excel') ? 'excel' : 'printer';
                    const card = remediationCards.find(c => c.id === actionType);
                    openFixConfirmation(actionType, card || remediationCards[0]);
                  }} />
                  )) : (
                    <div className="text-center py-8 text-white/40">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-neon-green/50" />
                      <p className="text-sm">No issues detected</p>
                      <p className="text-xs text-white/30 mt-1">All systems healthy</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Executive Metrics */}
              <div className="holo rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-neon-purple" />
                  <h2 className="font-semibold text-white">Executive Metrics</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {EXECUTIVE_METRICS.map((metric, i) => {
                    const Icon = metric.icon;
                    return (
                      <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="flex items-center gap-2 mb-2" style={{ color: metric.color }}>
                          {Icon}
                          <span className="text-xs text-white/50">{metric.label}</span>
                        </div>
                        <div className="text-2xl font-extrabold text-white tnum"><CountUp text={metric.value} /></div>
                        <div className="flex items-center gap-1 text-xs text-neon-green mt-1">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>+{metric.change}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="holo rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-neon-cyan" />
                  <h2 className="font-semibold text-white">Remediation History</h2>
                </div>
                <div className="space-y-3">
                  {remediationHistory.length > 0 ? remediationHistory.slice(0, 5).map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {item.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-neon-green" />
                        ) : item.status === 'failed' ? (
                          <AlertCircle className="w-4 h-4 text-neon-red" />
                        ) : (
                          <RefreshCw className="w-4 h-4 text-neon-yellow animate-spin" />
                        )}
                        <span className="text-white/70">{item.actionType || 'Unknown Fix'}</span>
                      </div>
                      <span className="text-white/30 text-xs">{item.completedAt ? new Date(item.completedAt).toLocaleString() : 'Pending'}</span>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-white/30 text-sm">
                      <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No remediation history yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Developed By */}
              <div className="text-center pb-4">
                <p className="text-xxs text-white/30">Developed by</p>
                <p className="text-xs font-semibold text-white/50">Naveen Singh</p>
              </div>
            </div>
          </div>
          )}

          {/* Devices View */}
          {activeNavItem === 'devices' && (
            <div className="space-y-6">
              <div className="holo rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <MonitorSmartphone className="w-6 h-6 text-neon-cyan" />
                    <h2 className="text-xl font-bold text-white">Fleet Devices</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1.5 rounded-lg bg-neon-green/10 border border-neon-green/20 text-xs text-neon-green font-medium">
                      {devices.filter(d => d.isOnline).length} Online
                    </span>
                  </div>
                </div>

                <div className="grid gap-4">
                  {devices.map((device) => (
                    <motion.div
                      key={device.deviceId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded-xl bg-gradient-to-r from-white/[0.05] to-transparent border border-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${device.isOnline ? 'bg-neon-green/20' : 'bg-white/5'}`}>
                            <Server className={`w-6 h-6 ${device.isOnline ? 'text-neon-green' : 'text-white/40'}`} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">{device.hostname}</h3>
                            <p className="text-sm text-white/50">{device.osVersion || 'Windows'} • {device.processorCores || 4} Cores • {device.totalRAM || 8}GB RAM</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          {device.metrics && (
                            <div className="flex items-center gap-4">
                              <Meter label="CPU" value={device.metrics.cpu} />
                              <Meter label="RAM" value={device.metrics.ram} />
                              <Meter label="DISK" value={device.metrics.disk} />
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${device.isOnline ? 'bg-neon-green' : 'bg-white/20'}`} />
                            <span className={`text-sm font-medium ${device.isOnline ? 'text-neon-green' : 'text-white/40'}`}>
                              {device.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Incidents View */}
          {activeNavItem === 'incidents' && (
            <div className="space-y-6">
              <div className="holo rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <AlertOctagon className="w-6 h-6 text-neon-red" />
                    <h2 className="text-xl font-bold text-white">Incident Log</h2>
                  </div>
                </div>

                <div className="space-y-4">
                  {issues.length > 0 ? issues.map((issue, i) => (
                    <motion.div
                      key={issue.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${issue.severity === 'critical' ? 'bg-neon-red/20' : issue.severity === 'high' ? 'bg-orange-500/20' : 'bg-neon-yellow/20'}`}>
                          <AlertTriangle className={`w-5 h-5 ${issue.severity === 'critical' ? 'text-neon-red' : issue.severity === 'high' ? 'text-orange-500' : 'text-neon-yellow'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-white">{issue.title}</h3>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              issue.severity === 'critical' ? 'bg-neon-red/20 text-neon-red' :
                              issue.severity === 'high' ? 'bg-orange-500/20 text-orange-500' :
                              issue.severity === 'medium' ? 'bg-neon-yellow/20 text-neon-yellow' :
                              'bg-neon-green/20 text-neon-green'
                            }`}>
                              {issue.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-white/60 mb-3">{issue.description}</p>
                          <div className="flex items-center gap-4 text-xs text-white/40">
                            <span>Detected: {issue.timestamp}</span>
                            <span>Confidence: {issue.confidence}%</span>
                            <span>By: {issue.detectedBy}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="text-center py-12">
                      <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-neon-green/50" />
                      <p className="text-lg text-white/70">All Clear</p>
                      <p className="text-sm text-white/40">No incidents detected in your fleet</p>
                    </div>
                  )}
                </div>
              </div>
              <EventStream events={currentDevice?.recentEvents ?? []} />
            </div>
          )}

          {/* Remediation View */}
          {activeNavItem === 'remediation' && (
            <div className="space-y-6">
              <div className="holo rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <WrenchIcon className="w-6 h-6 text-neon-cyan" />
                    <h2 className="text-xl font-bold text-white">Remediation Center</h2>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {remediationCards.map((card) => (
                    <motion.div
                      key={card.id}
                      whileHover={{ scale: 1.02, y: -4 }}
                      className="p-5 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                        {card.icon}
                      </div>
                      <h3 className="font-semibold text-white mb-2">{card.label}</h3>
                      <p className="text-sm text-white/50 mb-4">{card.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">{card.duration}</span>
                        <button
                          onClick={() => openFixConfirmation(card.id, card)}
                          className="px-4 py-2 rounded-lg bg-neon-cyan/20 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/30 transition-colors"
                        >
                          Run Fix
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8">
                  <h3 className="font-semibold text-white mb-4">Remediation History</h3>
                  <div className="space-y-3">
                    {remediationHistory.length > 0 ? remediationHistory.slice(0, 10).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                          {item.status === 'completed' ? (
                            <CheckCircle2 className="w-5 h-5 text-neon-green" />
                          ) : item.status === 'failed' ? (
                            <AlertCircle className="w-5 h-5 text-neon-red" />
                          ) : (
                            <RefreshCw className="w-5 h-5 text-neon-yellow animate-spin" />
                          )}
                          <span className="text-white/70">{item.actionType || 'Remediation'}</span>
                        </div>
                        <span className="text-sm text-white/40">
                          {item.completedAt ? new Date(item.completedAt).toLocaleString() : new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                    )) : (
                      <p className="text-center text-white/40 py-8">No remediation history yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Insights View */}
          {activeNavItem === 'ai-insights' && (
            <div className="space-y-6">
              <div className="holo rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Lightbulb className="w-6 h-6 text-neon-purple" />
                    <h2 className="text-xl font-bold text-white">AI Insights</h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl bg-gradient-to-br from-neon-cyan/10 to-transparent border border-neon-cyan/20">
                    <Brain className="w-8 h-8 text-neon-cyan mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Predictive Analysis</h3>
                    <p className="text-sm text-white/60 mb-4">
                      AI has identified potential issues before they occur based on historical patterns.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                        <span className="text-sm text-white/70">Memory pressure predicted</span>
                        <span className="text-xs text-neon-yellow">In 2 days</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                        <span className="text-sm text-white/70">Disk cleanup recommended</span>
                        <span className="text-xs text-neon-green">Low priority</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-gradient-to-br from-neon-purple/10 to-transparent border border-neon-purple/20">
                    <TrendingUp className="w-8 h-8 text-neon-purple mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Trend Analysis</h3>
                    <p className="text-sm text-white/60 mb-4">
                      Your device health metrics over the past 30 days show consistent performance.
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-neon-cyan">+5%</div>
                        <div className="text-xs text-white/40">Health Trend</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-neon-green">-12%</div>
                        <div className="text-xs text-white/40">CPU Usage</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-neon-purple">-8%</div>
                        <div className="text-xs text-white/40">RAM Usage</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics View */}
          {activeNavItem === 'analytics' && (
            <div className="space-y-6">
              <div className="holo rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-neon-cyan" />
                    <h2 className="text-xl font-bold text-white">Analytics & Predictions</h2>
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-neon-cyan/20 text-neon-cyan text-sm font-medium flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Refresh Data
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-6">
                  {EXECUTIVE_METRICS.map((metric, i) => (
                    <div key={i} className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center gap-2 mb-3" style={{ color: metric.color }}>
                        {metric.icon}
                        <span className="text-sm text-white/50">{metric.label}</span>
                      </div>
                      <div className="text-3xl font-extrabold text-white mb-2 tnum"><CountUp text={metric.value} /></div>
                      <div className="flex items-center gap-1 text-sm text-neon-green">
                        <ArrowUpRight className="w-4 h-4" />
                        <span>+{metric.change}% this week</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Predictive Analytics Section */}
                <div className="mt-8 grid grid-cols-2 gap-6">
                  {/* Predicted Top Issues */}
                  <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-neon-purple" />
                      Predicted Top Issues (Next 7 Days)
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-neon-red" />
                          <div>
                            <p className="font-medium text-white">Memory Degradation</p>
                            <p className="text-xs text-white/50">15 devices at risk</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-red-400">78%</span>
                          <p className="text-xs text-white/40">confidence</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20">
                        <div className="flex items-center gap-3">
                          <HardDrive className="w-5 h-5 text-orange-400" />
                          <div>
                            <p className="font-medium text-white">Low Disk Space</p>
                            <p className="text-xs text-white/50">8 devices at risk</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-orange-400">85%</span>
                          <p className="text-xs text-white/40">confidence</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-yellow-400" />
                          <div>
                            <p className="font-medium text-white">Outlook Performance</p>
                            <p className="text-xs text-white/50">5 devices at risk</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-yellow-400">72%</span>
                          <p className="text-xs text-white/40">confidence</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20">
                        <div className="flex items-center gap-3">
                          <Network className="w-5 h-5 text-blue-400" />
                          <div>
                            <p className="font-medium text-white">Network Instability</p>
                            <p className="text-xs text-white/50">4 devices at risk</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-blue-400">68%</span>
                          <p className="text-xs text-white/40">confidence</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top 10 Issues in Organization */}
                  <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <AlertOctagon className="w-5 h-5 text-neon-cyan" />
                      Top 10 Issues in Organization
                    </h3>
                    <div className="space-y-2">
                      {[
                        { rank: 1, issue: 'High CPU Usage', count: 23, trend: 'up', severity: 'high' },
                        { rank: 2, issue: 'High Memory Usage', count: 18, trend: 'up', severity: 'high' },
                        { rank: 3, issue: 'Low Disk Space', count: 15, trend: 'stable', severity: 'medium' },
                        { rank: 4, issue: 'Outlook Slow', count: 12, trend: 'down', severity: 'medium' },
                        { rank: 5, issue: 'Network Timeout', count: 10, trend: 'stable', severity: 'low' },
                        { rank: 6, issue: 'Chrome Crash', count: 8, trend: 'up', severity: 'medium' },
                        { rank: 7, issue: 'Excel Freeze', count: 7, trend: 'stable', severity: 'low' },
                        { rank: 8, issue: 'Printer Offline', count: 6, trend: 'down', severity: 'low' },
                        { rank: 9, issue: 'VPN Disconnect', count: 5, trend: 'stable', severity: 'low' },
                        { rank: 10, issue: 'Teams Sync', count: 4, trend: 'down', severity: 'low' },
                      ].map((item) => (
                        <div key={item.rank} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-neon-cyan/20 text-neon-cyan flex items-center justify-center text-xs font-bold">{item.rank}</span>
                            <span className="text-sm text-white">{item.issue}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded text-xs ${item.severity === 'high' ? 'bg-red-500/20 text-red-400' : item.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{item.severity}</span>
                            <span className="text-sm text-white/70">{item.count}</span>
                            {item.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-red-400" />}
                            {item.trend === 'down' && <ArrowDownRight className="w-4 h-4 text-neon-green" />}
                            {item.trend === 'stable' && <Minus className="w-4 h-4 text-white/40" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Fleet Performance Overview */}
                <div className="mt-8 p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <h3 className="font-semibold text-white mb-4">Fleet Performance Trend</h3>
                  <FleetTrendChart />
                </div>
              </div>
            </div>
          )}

          {/* Compliance View */}
          {activeNavItem === 'compliance' && <ComplianceView device={currentDevice} />}

          {/* Settings View */}
          {activeNavItem === 'settings' && (
            <div className="space-y-6">
              <div className="holo rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Settings2 className="w-6 h-6 text-neon-cyan" />
                  <h2 className="text-xl font-bold text-white">Settings & Configuration</h2>
                </div>

                {/* Agent Deployment Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5 text-neon-cyan" />
                    Agent Deployment
                  </h3>
                  <p className="text-sm text-white/60 mb-4">
                    Download and install the IntelliFix Agent on your Windows device to enable remote monitoring and remediation.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-xl bg-gradient-to-br from-neon-cyan/10 to-transparent border border-neon-cyan/20">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-neon-cyan/20 flex items-center justify-center">
                          <HardDrive className="w-6 h-6 text-neon-cyan" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">Windows Agent</h4>
                          <p className="text-xs text-white/50">v1.0.0 • 172MB</p>
                        </div>
                      </div>
                      <p className="text-sm text-white/60 mb-4">
                        .NET 8.0 self-contained executable. Works on Windows 10/11.
                      </p>
                      <a
                        href={`${API_BASE}/agent/download`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-cyan text-black font-medium hover:bg-neon-cyan/90 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download Agent
                      </a>
                    </div>

                    <div className="p-5 rounded-xl bg-gradient-to-br from-neon-purple/10 to-transparent border border-neon-purple/20">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center">
                          <Terminal className="w-6 h-6 text-neon-purple" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">Installation Guide</h4>
                          <p className="text-xs text-white/50">PDF Documentation</p>
                        </div>
                      </div>
                      <p className="text-sm text-white/60 mb-4">
                        Step-by-step instructions for deploying the agent across your organization.
                      </p>
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-purple/20 text-neon-purple font-medium hover:bg-neon-purple/30 transition-colors">
                        <FileText className="w-4 h-4" />
                        View Guide
                      </button>
                    </div>
                  </div>
                </div>

                {/* System Configuration */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <CogIcon className="w-5 h-5 text-neon-cyan" />
                    System Configuration
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center gap-2 mb-2">
                        <Radio className="w-4 h-4 text-neon-green" />
                        <span className="text-sm font-medium text-white">Telemetry Interval</span>
                      </div>
                      <span className="text-2xl font-bold text-neon-cyan">5s</span>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-neon-green" />
                        <span className="text-sm font-medium text-white">Health Check</span>
                      </div>
                      <span className="text-2xl font-bold text-neon-cyan">30s</span>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-neon-green" />
                        <span className="text-sm font-medium text-white">Auto-Remediation</span>
                      </div>
                      <span className="text-2xl font-bold text-neon-green">ON</span>
                    </div>
                  </div>
                </div>

                {/* Integration Configuration */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-neon-cyan" />
                    Enterprise Integrations
                  </h3>
                  <p className="text-sm text-white/60 mb-4">
                    Connect IntelliFix with your enterprise ITSM and communication platforms.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    {/* ServiceNow Integration */}
                    <div className="p-5 rounded-xl bg-gradient-to-br from-neon-red/10 to-transparent border border-neon-red/20">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-neon-red/20 flex items-center justify-center">
                          <span className="text-xl font-bold text-neon-red">SN</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">ServiceNow</h4>
                          <p className="text-xs text-white/50">ITSM Integration</p>
                        </div>
                        <span className="ml-auto px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs">Plug-and-Play</span>
                      </div>
                      <p className="text-sm text-white/60 mb-4">
                        Automatic ticket creation, updates, and closure. Syncs remediation history with your ITSM.
                      </p>
                      <div className="space-y-2 text-xs text-white/50">
                        <p>Configure via environment variables:</p>
                        <code className="block p-2 rounded bg-black/30 text-neon-cyan">SERVICENOW_INSTANCE_URL</code>
                        <code className="block p-2 rounded bg-black/30 text-neon-cyan">SERVICENOW_API_KEY</code>
                      </div>
                      <button className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-red/20 text-neon-red font-medium hover:bg-neon-red/30 transition-colors">
                        <Shield className="w-4 h-4" />
                        Configure Now
                      </button>
                    </div>

                    {/* Microsoft Teams Integration */}
                    <div className="p-5 rounded-xl bg-gradient-to-br from-neon-purple/10 to-transparent border border-neon-purple/20">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center">
                          <span className="text-xl font-bold text-neon-purple">MS</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">Microsoft Teams</h4>
                          <p className="text-xs text-white/50">Notifications & Approvals</p>
                        </div>
                        <span className="ml-auto px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs">Plug-and-Play</span>
                      </div>
                      <p className="text-sm text-white/60 mb-4">
                        Send approval prompts and remediation notifications directly to Teams channels.
                      </p>
                      <div className="space-y-2 text-xs text-white/50">
                        <p>Configure via environment variable:</p>
                        <code className="block p-2 rounded bg-black/30 text-neon-purple">TEAMS_WEBHOOK_URL</code>
                      </div>
                      <button className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-purple/20 text-neon-purple font-medium hover:bg-neon-purple/30 transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        Configure Now
                      </button>
                    </div>
                  </div>
                </div>

                {/* About Section */}
                <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00e5ff 0%, #a855f7 100%)' }}>
                        <span className="text-lg">🩺</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">IntelliFix AI</h4>
                        <p className="text-xs text-white/50">Enterprise Device Intelligence Platform</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white/70">Version 1.0.0</p>
                      <p className="text-xs text-white/40">© 2026 Naveen Singh</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Fix Execution Popup */}
      {renderConfirmationPopup()}
      {renderFixProgressPopup()}

      {/* Settings Panel */}
      <AnimatePresence>
        {isSettingsOpen && <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} privacyMode={privacyMode} onPrivacyModeChange={setPrivacyMode} />}
      </AnimatePresence>

      {/* First-login agent install prompt (shown when no device is reporting) */}
      <AnimatePresence>
        {authUser && !agentPromptDismissed && devices.length === 0 && (
          <AgentInstallModal onClose={dismissAgentPrompt} />
        )}
      </AnimatePresence>

      {/* Chat Assistant */}
      <ChatAssistant isOpen={isAssistantOpen} onToggle={() => {
        const nextState = !isAssistantOpen;
        setIsAssistantOpen(nextState);
        if (nextState && !welcomeShown) {
          const welcomeMsg: ChatMessage = {
            id: 'welcome',
            role: 'assistant',
            content: 'Hello ' + getDisplayName() + ',\n\nI\'m IntelliFix AI — your enterprise device intelligence assistant.\n\nI can help with:\n• Troubleshooting device issues\n• Suggesting automated fixes\n• Monitoring system health\n\nPlease tell me what issue you\'re facing.',
            timestamp: new Date()
          };
          setMessages([welcomeMsg]);
          setWelcomeShown(true);
        }
      }} messages={messages} onSendMessage={handleSendMessage} isTyping={isTyping} />
    </div>
  );
}
