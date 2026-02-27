import { useLocation } from 'react-router-dom';
import { Activity, Sun, Moon, Monitor, LogOut } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/personas': 'Personas',
  '/knowledge': 'Knowledge Base',
  '/approvals': 'Approvals',
  '/audit': 'Audit Log',
  '/integrations': 'Integrations',
  '/settings': 'Settings',
  '/sessions': 'Sessions',
  '/channels': 'Channels',
  '/hooks': 'Hooks',
  '/health': 'Health',
  '/cron': 'Scheduled Tasks',
  '/skills': 'Skills',
  '/security': 'Security',
  '/usage': 'Usage & Billing',
  '/webhooks': 'Webhooks',
  '/webchat': 'WebChat',
  '/agent-chat': 'Agent Chat',
  '/workflows': 'Workflow Dashboard',
  '/gateway': 'Gateway',
  '/users': 'Users',
  '/marketplace': 'Agent Marketplace',
  '/contracts': 'Contracts',
  '/organizations': 'Organizations',
  '/org/portal': 'My Organization',
  '/org/agents': 'My Agents',
  '/orgo': 'Orgo Computers',
  '/help': 'Help Center',
};

export function Header() {
  const location = useLocation();
  // Support nested paths like /org/portal
  const path = location.pathname;
  const segments = path.split('/').filter(Boolean);
  const base = '/' + (segments[0] ?? '');
  const twoLevel = '/' + segments.slice(0, 2).join('/');
  // Handle nested edit routes like /personas/:id/edit
  const isEditRoute = segments.at(-1) === 'edit';
  const editBase = isEditRoute ? '/' + segments[0] : null;
  const title =
    (editBase ? (titles[editBase] ? titles[editBase] + ' — Edit' : null) : null) ??
    titles[twoLevel] ??
    titles[base] ??
    'Moltbot Talent';

  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  const cycleTheme = () => {
    const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-4">
        <button
          onClick={cycleTheme}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted hover:text-foreground hover:bg-hover transition-colors"
          title={`Theme: ${theme}`}
        >
          {theme === 'light' && <Sun className="h-3.5 w-3.5" />}
          {theme === 'dark' && <Moon className="h-3.5 w-3.5" />}
          {theme === 'system' && <Monitor className="h-3.5 w-3.5" />}
          <span className="capitalize">{theme}</span>
        </button>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Activity className="h-3 w-3 text-emerald-400" />
          <span>System Online</span>
        </div>
        {user && (
          <div className="flex items-center gap-3 border-l border-border pl-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-medium">{user.displayName}</span>
                <span className="ml-1.5 rounded-full bg-muted/20 px-1.5 py-0.5 text-[10px] text-muted">
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-1.5 text-muted hover:text-foreground hover:bg-hover transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
