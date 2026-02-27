import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Bot, Loader2, LogIn } from 'lucide-react';

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
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
          <h1 className="text-2xl font-bold">Moltbot Talent</h1>
          <p className="mt-1 text-sm text-muted">Sign in to your account</p>
        </div>

        {/* Login form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-border bg-card p-6"
        >
          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              placeholder="Enter your username"
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
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
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Sign In
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-accent hover:underline">
            Create one
          </Link>
        </p>

        {/* Demo credentials hint */}
        <div className="mt-6 rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="mb-2 text-xs font-medium text-muted">
            Demo credentials
          </p>
          <div className="space-y-1 text-xs text-muted">
            <div>
              <span className="font-mono text-foreground">admin</span> /{' '}
              <span className="font-mono text-foreground">admin</span>
              <span className="ml-2 text-[10px]">(full access)</span>
            </div>
            <div>
              <span className="font-mono text-foreground">operator</span> /{' '}
              <span className="font-mono text-foreground">operator</span>
              <span className="ml-2 text-[10px]">(standard ops)</span>
            </div>
            <div>
              <span className="font-mono text-foreground">viewer</span> /{' '}
              <span className="font-mono text-foreground">viewer</span>
              <span className="ml-2 text-[10px]">(read-only)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
