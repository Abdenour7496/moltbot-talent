import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Users,
  Plus,
  Shield,
  Eye,
  Wrench,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from 'lucide-react';

interface UserInfo {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: 'admin' | 'operator' | 'viewer';
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

const roleIcons: Record<string, typeof Shield> = {
  admin: Shield,
  operator: Wrench,
  viewer: Eye,
};

const roleColors: Record<string, string> = {
  admin: 'bg-destructive/10 text-destructive',
  operator: 'bg-accent/10 text-accent',
  viewer: 'bg-muted/30 text-muted',
};

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [userList, setUserList] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    displayName: '',
    password: '',
    role: 'viewer',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getUsers()
      .then(setUserList)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Shield className="h-12 w-12 text-muted" />
        <p className="text-lg font-medium">Admin Access Required</p>
        <p className="text-sm text-muted">
          You don&apos;t have permission to manage users.
        </p>
      </div>
    );
  }

  const handleCreate = async () => {
    setError('');
    try {
      const newUser = await api.createUser(form);
      setUserList((prev) => [...prev, newUser]);
      setShowCreate(false);
      setForm({
        username: '',
        email: '',
        displayName: '',
        password: '',
        role: 'viewer',
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    try {
      const updated = await api.updateUser(id, { role });
      setUserList((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch (err: any) {
      setError(err.message ?? 'Failed to update role');
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const updated = await api.updateUser(id, { active });
      setUserList((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch (err: any) {
      setError(err.message ?? 'Failed to update user status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.deleteUser(id);
      setUserList((prev) => prev.filter((u) => u.id !== id));
    } catch (err: any) {
      setError(err.message ?? 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-4 text-xs underline">Dismiss</button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold">User Management</h2>
          <span className="rounded-full bg-muted/20 px-2 py-0.5 text-xs text-muted">
            {userList.length} users
          </span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      {/* Create user form */}
      {showCreate && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium">Create New User</h3>
          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <input
              placeholder="Display Name"
              value={form.displayName}
              onChange={(e) =>
                setForm({ ...form, displayName: e.target.value })
              }
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <input
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="viewer">Viewer</option>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={handleCreate}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last Login</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {userList.map((u) => {
              const RoleIcon = roleIcons[u.role] ?? Eye;
              const isSelf = u.id === currentUser?.id;
              return (
                <tr
                  key={u.id}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                        {u.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{u.displayName}</div>
                        <div className="text-xs text-muted">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    {isSelf ? (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[u.role]}`}
                      >
                        <RoleIcon className="h-3 w-3" />
                        {u.role}
                      </span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="rounded-md border border-border bg-input px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="operator">Operator</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.active ? 'text-success' : 'text-destructive'}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleString()
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    {!isSelf && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() =>
                            handleToggleActive(u.id, !u.active)
                          }
                          title={u.active ? 'Deactivate' : 'Activate'}
                          className="rounded-md p-1.5 text-muted hover:text-foreground hover:bg-hover transition-colors"
                        >
                          {u.active ? (
                            <ToggleRight className="h-4 w-4 text-success" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          title="Delete user"
                          className="rounded-md p-1.5 text-muted hover:text-destructive hover:bg-hover transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
