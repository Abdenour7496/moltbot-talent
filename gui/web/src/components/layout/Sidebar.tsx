import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ShieldCheck,
  FileText,
  Plug,
  Settings,
  Bot,
  PanelLeftClose,
  PanelLeft,
  MessageSquare,
  Radio,
  Webhook,
  HeartPulse,
  Clock,
  Puzzle,
  Shield,
  BarChart3,
  Globe,
  MessageCircle,
  UserCog,
  Store,
  FileSignature,
  Building2,
  HelpCircle,
  MonitorSmartphone,
  BotMessageSquare,
  Workflow,
} from 'lucide-react';

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** 'org' = only for org users, 'admin' = only for non-org (admin) users, undefined = everyone */
  visibility?: 'org' | 'admin';
};

type NavGroup = {
  label: string;
  /** If set, this entire group is only shown for the given user type */
  visibility?: 'org' | 'admin';
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/marketplace', label: 'Marketplace', icon: Store },
      { to: '/contracts', label: 'Contracts', icon: FileSignature },
      { to: '/usage', label: 'Usage', icon: BarChart3 },
    ],
  },
  {
    label: 'My Organization',
    visibility: 'org',
    items: [
      { to: '/org/portal', label: 'My Organization', icon: Building2 },
      { to: '/org/agents', label: 'My Agents', icon: Bot },
    ],
  },
  {
    label: 'Chat',
    items: [
      { to: '/webchat', label: 'WebChat', icon: MessageCircle },
      { to: '/agent-chat', label: 'Agent Chat', icon: BotMessageSquare },
    ],
  },
  {
    label: 'Management',
    visibility: 'admin',
    items: [
      { to: '/organizations', label: 'Organizations', icon: Building2 },
      { to: '/personas', label: 'Personas', icon: Users },
      { to: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
      { to: '/skills', label: 'Skills', icon: Puzzle },
      { to: '/workflows', label: 'Workflows', icon: Workflow },
    ],
  },
  {
    label: 'Automation',
    visibility: 'admin',
    items: [
      { to: '/orgo', label: 'Orgo Computers', icon: MonitorSmartphone },
      { to: '/sessions', label: 'Sessions', icon: MessageSquare },
      { to: '/channels', label: 'Channels', icon: Radio },
      { to: '/hooks', label: 'Hooks', icon: Webhook },
      { to: '/cron', label: 'Scheduled Tasks', icon: Clock },
    ],
  },
  {
    label: 'Governance',
    visibility: 'admin',
    items: [
      { to: '/approvals', label: 'Approvals', icon: ShieldCheck },
      { to: '/audit', label: 'Audit Log', icon: FileText },
      { to: '/security', label: 'Security', icon: Shield },
    ],
  },
  {
    label: 'Infrastructure',
    visibility: 'admin',
    items: [
      { to: '/integrations', label: 'Integrations', icon: Plug },
      { to: '/webhooks', label: 'Webhooks', icon: Globe },
      { to: '/gateway', label: 'Gateway', icon: Radio },
      { to: '/health', label: 'Health', icon: HeartPulse },
      { to: '/users', label: 'Users', icon: UserCog },
    ],
  },
];

const bottomItems: NavItem[] = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/help', label: 'Help', icon: HelpCircle },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth();
  const isOrgUser = !!user?.tenantId;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-accent/10 text-accent'
        : 'text-muted hover:bg-hover hover:text-foreground',
      collapsed && 'justify-center px-0',
    );

  const isGroupVisible = (group: NavGroup) => {
    if (!group.visibility) return true;
    if (group.visibility === 'org') return isOrgUser;
    if (group.visibility === 'admin') return !isOrgUser;
    return true;
  };

  const isItemVisible = (item: NavItem) => {
    if (!item.visibility) return true;
    if (item.visibility === 'org') return isOrgUser;
    if (item.visibility === 'admin') return !isOrgUser;
    return true;
  };

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-sidebar transition-all duration-200',
        collapsed ? 'w-16' : 'w-56',
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        <Bot className="h-6 w-6 shrink-0 text-accent" />
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight">Moltbot Talent</span>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        {navGroups.filter(isGroupVisible).map((group) => {
          const visibleItems = group.items.filter(isItemVisible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted/60 select-none">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={linkClass}
                    title={collapsed ? label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom items */}
      <div className="border-t border-border p-2 space-y-0.5">
        {bottomItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={linkClass}
            title={collapsed ? label : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center border-t border-border p-3 text-muted hover:text-foreground transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
    </aside>
  );
}
