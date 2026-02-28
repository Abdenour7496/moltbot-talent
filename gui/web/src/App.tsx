import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from './pages/Dashboard';
import { PersonasPage } from './pages/Personas';
import { KnowledgePage } from './pages/Knowledge';
import { ApprovalsPage } from './pages/Approvals';
import { AuditPage } from './pages/Audit';
import { IntegrationsPage } from './pages/Integrations';
import { SettingsPage } from '@/components/settings/Settings';
import { SessionsPage } from './pages/Sessions';
import { ChannelsPage } from './pages/Channels';
import { HooksPage } from './pages/Hooks';
import { HealthPage } from './pages/Health';
import { CronPage } from './pages/Cron';
import { SkillsPage } from './pages/Skills';
import { SecurityPage } from './pages/Security';
import { UsagePage } from './pages/Usage';
import { WebhooksPage } from './pages/Webhooks';
import { WebChatPage } from './pages/WebChat';
import { AgentChatPage } from './pages/AgentChat';
import { PersonaEditorPage } from './pages/PersonaEditor';
import { WorkflowDashboardPage } from './pages/WorkflowDashboard';
import { GatewayPage } from './pages/Gateway';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { UsersPage } from './pages/Users';
import { MarketplacePage } from './pages/Marketplace';
import { AgentConfigurePage } from './pages/AgentConfigure';
import { ContractsPage } from './pages/Contracts';
import { OrganizationsPage } from './pages/Organizations';
import { HelpPage } from './pages/Help';
import { OrgoPage } from './pages/Orgo';
import { OrgPortalPage } from './pages/OrgPortal';
import { OrgAgentsPage } from './pages/OrgAgents';
import { Loader2 } from 'lucide-react';

function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="personas" element={<PersonasPage />} />
            <Route path="knowledge" element={<KnowledgePage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="orgo" element={<OrgoPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="channels" element={<ChannelsPage />} />
            <Route path="hooks" element={<HooksPage />} />
            <Route path="health" element={<HealthPage />} />
            <Route path="cron" element={<CronPage />} />
            <Route path="skills" element={<SkillsPage />} />
            <Route path="security" element={<SecurityPage />} />
            <Route path="usage" element={<UsagePage />} />
            <Route path="webhooks" element={<WebhooksPage />} />
            <Route path="webchat" element={<WebChatPage />} />
            <Route path="agent-chat" element={<AgentChatPage />} />
            <Route path="personas/:id/edit" element={<PersonaEditorPage />} />
            <Route path="workflows" element={<WorkflowDashboardPage />} />
            <Route path="gateway" element={<GatewayPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="marketplace" element={<MarketplacePage />} />
            <Route path="marketplace/:id/configure" element={<AgentConfigurePage />} />
            <Route path="contracts" element={<ContractsPage />} />
            <Route path="organizations" element={<OrganizationsPage />} />
            <Route path="org/portal" element={<OrgPortalPage />} />
            <Route path="org/agents" element={<OrgAgentsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="help" element={<HelpPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
