import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  MessageCircle,
  BotMessageSquare,
  Workflow,
  Upload,
  ShieldCheck,
  Plug,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useState } from 'react';

export function QuickActions() {
  const navigate = useNavigate();
  const [discovering, setDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<string | null>(null);

  const handleDiscover = async () => {
    setDiscovering(true);
    setDiscoverResult(null);
    try {
      const res = await api.discoverPersonas();
      setDiscoverResult(`Discovered ${res.discovered} persona(s)`);
      setTimeout(() => setDiscoverResult(null), 4000);
    } catch {
      setDiscoverResult('Discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  const actions = [
    {
      label: 'Agent Chat',
      icon: BotMessageSquare,
      color: 'text-blue-400',
      onClick: () => navigate('/agent-chat'),
    },
    {
      label: 'New Session',
      icon: MessageCircle,
      color: 'text-cyan-400',
      onClick: () => navigate('/sessions'),
    },
    {
      label: 'Discover Personas',
      icon: Search,
      color: 'text-violet-400',
      onClick: handleDiscover,
      loading: discovering,
    },
    {
      label: 'View Workflows',
      icon: Workflow,
      color: 'text-orange-400',
      onClick: () => navigate('/workflows'),
    },
    {
      label: 'Review Approvals',
      icon: ShieldCheck,
      color: 'text-amber-400',
      onClick: () => navigate('/approvals'),
    },
    {
      label: 'Integrations',
      icon: Plug,
      color: 'text-emerald-400',
      onClick: () => navigate('/integrations'),
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {actions.map((a) => (
            <Button
              key={a.label}
              variant="outline"
              size="sm"
              className="h-auto py-3 flex-col gap-1.5 text-xs"
              onClick={a.onClick}
              disabled={a.loading}
            >
              <a.icon className={`h-4 w-4 ${a.color}`} />
              {a.label}
            </Button>
          ))}
        </div>
        {discoverResult && (
          <p className="text-xs text-center mt-2 text-accent">{discoverResult}</p>
        )}
      </CardContent>
    </Card>
  );
}
