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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [menuTotal, setMenuTotal] = useState(0);
  const [restaurantTotal, setRestaurantTotal] = useState(0);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [statsRes, menuRes, restaurantRes, sessionsRes] = await Promise.all([
        adminApi.getSessionStats(),
        adminApi.listMenus({ page: 1, limit: 1 }),
        adminApi.listRestaurants({ page: 1, limit: 1 }),
        adminApi.listSessions({ page: 1, limit: 5 }),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data as SessionStats);
      }

      if (menuRes.success && menuRes.data) {
        const pagination = (menuRes.data as any).pagination;
        setMenuTotal(pagination?.total || 0);
      }

      if (restaurantRes.success && restaurantRes.data) {
        const pagination = (restaurantRes.data as any).pagination;
        setRestaurantTotal(pagination?.total || 0);
      }

      if (sessionsRes.success && sessionsRes.data) {
        setRecentSessions((sessionsRes.data as any).sessions || []);
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

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Menus" value={menuTotal} hint="Total menu items" />
        <StatCard label="Restaurants" value={restaurantTotal} hint="Total restaurant profiles" />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Recent Sessions</div>
            <div className="text-lg font-semibold text-slate-900">Last 5 sessions</div>
          </div>
          {loading ? <span className="text-xs text-slate-400">Loading</span> : null}
        </div>
        <div className="mt-4 space-y-2 text-sm">
          {recentSessions.length === 0 ? (
            <div className="text-slate-500">No sessions found.</div>
          ) : (
            recentSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <div>
                  <div className="font-medium text-slate-800">{session.code}</div>
                  <div className="text-xs text-slate-500">{session.mode} · {session.status}</div>
                </div>
                <div className="text-xs text-slate-500">Members: {session._count?.members ?? 0}</div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

