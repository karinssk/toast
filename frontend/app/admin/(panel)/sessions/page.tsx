'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';

const statuses = ['WAITING', 'ACTIVE', 'DECIDING', 'COMPLETED', 'EXPIRED', 'CANCELLED'];

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const response = await adminApi.listSessions({ page: 1, limit: 20 });
    if (response.success && response.data) {
      setSessions((response.data as any).sessions || []);
      setError(null);
    } else {
      setError(response.error?.message || 'Failed to load sessions');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const response = await adminApi.updateSessionStatus(id, status);
    if (response.success) {
      load();
    } else {
      setError(response.error?.message || 'Failed to update status');
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm('Delete this session?')) return;
    const response = await adminApi.deleteSession(id);
    if (response.success) {
      load();
    } else {
      setError(response.error?.message || 'Failed to delete session');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-2">
        <div className="text-sm text-slate-500">Manage session statuses and cleanup completed sessions.</div>
        {error ? <div className="text-sm text-red-500">{error}</div> : null}
      </Card>
      <Card className="p-4 space-y-4">
        {loading ? (
          <div className="text-sm text-slate-500">Loading sessions...</div>
        ) : (
          <div className="space-y-2 text-sm">
            {sessions.length === 0 ? (
              <div className="text-slate-500">No sessions found.</div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-800">{session.code}</div>
                      <div className="text-xs text-slate-500">{session.mode} · {session.status}</div>
                      <div className="text-xs text-slate-400">Owner: {session.owner?.displayName || 'Unknown'}</div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <select
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                        defaultValue={session.status}
                        onChange={(event) => updateStatus(session.id, event.target.value)}
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <Button size="sm" variant="danger" onClick={() => deleteSession(session.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

