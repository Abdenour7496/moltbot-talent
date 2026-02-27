import {
  Users,
  BookOpen,
  ShieldCheck,
  FileText,
  Activity,
  FileSignature,
  MessageSquare,
  Puzzle,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
  stats: {
    totalPersonas: number;
    activePersonas: number;
    knowledgeBases: number;
    pendingApprovals: number;
    totalAuditEntries: number;
    activeSessions?: number;
    activeContracts?: number;
    totalWorkflowRuns?: number;
    runningWorkflows?: number;
    escalatedWorkflows?: number;
    totalSkills?: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const navigate = useNavigate();

  const cards = [
    {
      label: 'Active Personas',
      value: `${stats.activePersonas} / ${stats.totalPersonas}`,
      icon: Users,
      color: 'text-blue-400',
      hoverBorder: 'hover:border-blue-400/40',
      to: '/personas',
    },
    {
      label: 'Knowledge Bases',
      value: stats.knowledgeBases,
      icon: BookOpen,
      color: 'text-violet-400',
      hoverBorder: 'hover:border-violet-400/40',
      to: '/knowledge',
    },
    {
      label: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: ShieldCheck,
      color: stats.pendingApprovals > 0 ? 'text-amber-400' : 'text-emerald-400',
      hoverBorder: stats.pendingApprovals > 0 ? 'hover:border-amber-400/40' : 'hover:border-emerald-400/40',
      to: '/approvals',
      pulse: stats.pendingApprovals > 0,
    },
    {
      label: 'Workflows',
      value: stats.totalWorkflowRuns ?? 0,
      sub: stats.runningWorkflows ? `${stats.runningWorkflows} running` : undefined,
      icon: Activity,
      color: (stats.runningWorkflows ?? 0) > 0 ? 'text-blue-400' : 'text-muted',
      hoverBorder: 'hover:border-blue-400/40',
      to: '/workflows',
    },
    {
      label: 'Active Contracts',
      value: stats.activeContracts ?? 0,
      icon: FileSignature,
      color: (stats.activeContracts ?? 0) > 0 ? 'text-teal-400' : 'text-muted',
      hoverBorder: 'hover:border-teal-400/40',
      to: '/contracts',
    },
    {
      label: 'Sessions',
      value: stats.activeSessions ?? 0,
      icon: MessageSquare,
      color: (stats.activeSessions ?? 0) > 0 ? 'text-cyan-400' : 'text-muted',
      hoverBorder: 'hover:border-cyan-400/40',
      to: '/sessions',
    },
    {
      label: 'Skills',
      value: stats.totalSkills ?? 0,
      icon: Puzzle,
      color: 'text-indigo-400',
      hoverBorder: 'hover:border-indigo-400/40',
      to: '/skills',
    },
    {
      label: 'Audit Entries',
      value: stats.totalAuditEntries,
      icon: FileText,
      color: 'text-muted',
      hoverBorder: 'hover:border-border',
      to: '/audit',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card
          key={c.label}
          className={cn(
            'cursor-pointer transition-all duration-200 border',
            c.hoverBorder,
            'hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
          )}
          onClick={() => navigate(c.to)}
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div className={cn('rounded-md bg-hover p-2.5', c.color, c.pulse && 'animate-pulse')}>
              <c.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-xs text-muted">{c.label}</p>
              {c.sub && (
                <p className="text-[10px] text-blue-400 mt-0.5">{c.sub}</p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted shrink-0" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
