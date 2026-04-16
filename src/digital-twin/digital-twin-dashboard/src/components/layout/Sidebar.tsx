import { NavLink } from 'react-router-dom';
import {
  BarChart2,
  DollarSign,
  Activity,
  Shield,
  TrendingUp,
  Zap,
  Bell,
  Gauge,
  Clock,
  Map,
  Send,
} from 'lucide-react';

const navItems = [
  { path: '/', icon: BarChart2, label: 'Executive' },
  { path: '/admin-fin', icon: DollarSign, label: 'Admin/Fin' },
  { path: '/operation', icon: Activity, label: 'Operation' },
  { path: '/cybersec', icon: Shield, label: 'Cybersec' },
  { path: '/prediction', icon: TrendingUp, label: 'Prediction' },
  { path: '/reaction', icon: Zap, label: 'Reaction' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
  { path: '/qos', icon: Gauge, label: 'QoS' },
  { path: '/mttr-mtbf', icon: Clock, label: 'MTTR/MTBF' },
  { path: '/incidents', icon: Map, label: 'Incidents' },
  { path: '/send', icon: Send, label: 'Send State' },
];

export function Sidebar() {
  return (
    <aside className="w-16 lg:w-52 bg-bg-surface border-r border-border flex flex-col shrink-0">
      <div className="h-14 flex items-center justify-center lg:justify-start lg:px-4 border-b border-border">
        <span className="hidden lg:block font-mono text-accent-blue font-bold text-sm tracking-wider">
          DT-DASH
        </span>
        <span className="lg:hidden font-mono text-accent-blue font-bold text-xs">DT</span>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded text-sm transition-colors ${
                isActive
                  ? 'bg-bg-elevated text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50'
              }`
            }
          >
            <Icon size={16} className="shrink-0" />
            <span className="hidden lg:block font-mono truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border hidden lg:block">
        <p className="text-xs text-text-secondary/50 font-mono leading-relaxed">
          Inteli<br />
          Gêmeo Digital
        </p>
      </div>
    </aside>
  );
}
