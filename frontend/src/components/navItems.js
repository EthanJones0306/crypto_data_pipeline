import { Activity, ArrowLeftRight, BarChart3, Gauge, LayoutDashboard, LineChart, Settings, Signal, Zap } from 'lucide-react';

export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Portfolio', icon: LayoutDashboard, hint: '1', group: 'Overview', mobile: true },
  { key: 'trade', label: 'Trade', icon: ArrowLeftRight, hint: '2', group: 'Trade', mobile: true },
  { key: 'leverage', label: 'Leverage', icon: Zap, hint: '3', group: 'Trade' },
  { key: 'positions', label: 'Positions', icon: Gauge, hint: '4', group: 'Trade', mobile: true },
  { key: 'markets', label: 'Markets', icon: LineChart, hint: '5', group: 'Overview', mobile: true },
  { key: 'activity', label: 'Activity', icon: Activity, hint: '6', group: 'Overview' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, hint: '7', group: 'Overview' },
  { key: 'status', label: 'API Status', icon: Signal, hint: '8', group: 'System' },
  { key: 'settings', label: 'Settings', icon: Settings, hint: '9', group: 'System' },
];

export const NAV_GROUPS = ['Overview', 'Trade', 'System'];
