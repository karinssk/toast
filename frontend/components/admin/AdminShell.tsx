'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, Utensils, Store, Users, BarChart3, LogOut } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { useAdminAuthStore } from '@/stores/adminAuthStore';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/menus', label: 'Menus', icon: Utensils },
  { href: '/admin/restaurants', label: 'Restaurants', icon: Store },
  { href: '/admin/sessions', label: 'Sessions', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, token, isAuthenticated, checkAuth, logout } = useAdminAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    const verify = async () => {
      if (token) {
        await checkAuth();
      }
      if (mounted) setChecking(false);
    };
    verify();
    return () => {
      mounted = false;
    };
  }, [token, checkAuth]);

  useEffect(() => {
    if (!checking && (!token || !isAuthenticated)) {
      router.replace('/admin/login');
    }
  }, [checking, token, isAuthenticated, router]);

  const activeLabel = useMemo(() => {
    const current = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
    return current?.label || 'Admin';
  }, [pathname]);

  if (checking || (!token || !isAuthenticated)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-500">Loading admin console...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full lg:w-64">
            <Card className="p-4 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Toast Admin</div>
                <div className="text-lg font-semibold text-slate-900">Control Center</div>
              </div>
              <nav className="flex flex-col gap-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                        isActive
                          ? 'bg-orange-50 text-orange-700'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                Signed in as
                <div className="text-sm font-medium text-slate-800">{admin?.displayName || admin?.username}</div>
                <div className="text-[11px] text-slate-400">{admin?.role}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center"
                onClick={() => {
                  logout();
                  router.replace('/admin/login');
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </Card>
          </aside>
          <main className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">{activeLabel}</div>
                <h1 className="text-2xl font-semibold text-slate-900">{activeLabel}</h1>
              </div>
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
