import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Bot, Building2, Loader2, UserPlus } from 'lucide-react';

export function RegisterPage() {
  const { user, loading, register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isOrgRegistration, setIsOrgRegistration] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgIndustry, setOrgIndustry] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (isOrgRegistration && !orgName.trim()) {
      setError('Organization name is required');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        username,
        email,
        displayName,
        password,
        ...(isOrgRegistration ? { orgName, orgIndustry } : {}),
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10">
            <Bot className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="mt-1 text-sm text-muted">Join Moltbot Talent</p>
        </div>

        {/* Account type toggle */}
        <div className="mb-4 flex rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setIsOrgRegistration(false)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              !isOrgRegistration
                ? 'bg-accent text-accent-foreground'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Individual
          </button>
          <button
            type="button"
            onClick={() => setIsOrgRegistration(true)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isOrgRegistration
                ? 'bg-accent text-accent-foreground'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Organization
          </button>
        </div>

        {/* Register form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-border bg-card p-6"
        >
          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Org-specific fields */}
          {isOrgRegistration && (
            <div className="space-y-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
              <p className="text-xs font-medium text-accent">Organization Details</p>
              <div className="space-y-1.5">
                <label htmlFor="reg-org-name" className="text-sm font-medium">
                  Organization Name
                </label>
                <input
                  id="reg-org-name"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required={isOrgRegistration}
                  placeholder="e.g. Acme Corp"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reg-org-industry" className="text-sm font-medium">
                  Industry <span className="text-muted">(optional)</span>
                </label>
                <input
                  id="reg-org-industry"
                  type="text"
                  value={orgIndustry}
                  onChange={(e) => setOrgIndustry(e.target.value)}
                  placeholder="e.g. FinTech, HealthTech"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="reg-username" className="text-sm font-medium">
              Username
            </label>
            <input
              id="reg-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              placeholder="Choose a username"
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-display" className="text-sm font-medium">
              Display Name
            </label>
            <input
              id="reg-display"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              placeholder="Your display name"
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="At least 6 characters"
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-confirm" className="text-sm font-medium">
              Confirm Password
            </label>
            <input
              id="reg-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Repeat your password"
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isOrgRegistration ? (
              <Building2 className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {isOrgRegistration ? 'Create Organization Account' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
