'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { StatCard } from '@/components/admin/StatCard';
import { Card } from '@/components/common/Card';

interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  todaySessions: number;
  avgMembersPerSession: number;
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const response = await adminApi.getSessionStats();
      if (response.success && response.data) {
        setStats(response.data as SessionStats);
      }
      setLoading(false);
    };

    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Sessions" value={stats?.totalSessions ?? '--'} />
        <StatCard label="Active Sessions" value={stats?.activeSessions ?? '--'} />
        <StatCard label="Completed Sessions" value={stats?.completedSessions ?? '--'} />
        <StatCard label="Today" value={stats?.todaySessions ?? '--'} />
        <StatCard label="Avg Members" value={stats?.avgMembersPerSession ?? '--'} />
      </div>

      <Card className="p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500">Analytics Notes</div>
        <div className="mt-2 text-sm text-slate-600">
          This panel currently reflects session-level stats from the backend. Extend the backend analytics routes to
          include swipe velocity, popular cuisines, and decision time breakdowns for richer insights.
        </div>
        {loading ? <div className="mt-2 text-xs text-slate-400">Loading...</div> : null}
      </Card>
    </div>
  );
}
