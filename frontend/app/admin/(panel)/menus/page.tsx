'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';

interface MenuFormState {
  id?: string;
  name: string;
  nameLocal: string;
  description: string;
  imageUrl: string;
  cuisineType: string;
  tags: string;
  priceRangeLow: number;
  priceRangeHigh: number;
  popularity: number;
  isActive: boolean;
}

const emptyForm: MenuFormState = {
  name: '',
  nameLocal: '',
  description: '',
  imageUrl: '',
  cuisineType: '',
  tags: '',
  priceRangeLow: 0,
  priceRangeHigh: 0,
  popularity: 0,
  isActive: true,
};

export default function AdminMenusPage() {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<MenuFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(form.id);

  const tagsArray = useMemo(() => {
    return form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }, [form.tags]);

  const load = async () => {
    setLoading(true);
    const response = await adminApi.listMenus({ search, page: 1, limit: 20 });
    if (response.success && response.data) {
      setMenus((response.data as any).menus || []);
      setError(null);
    } else {
      setError(response.error?.message || 'Failed to load menus');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => setForm(emptyForm);

  const submit = async () => {
    const payload = {
      name: form.name,
      nameLocal: form.nameLocal || undefined,
      description: form.description || undefined,
      imageUrl: form.imageUrl,
      cuisineType: form.cuisineType,
      tags: tagsArray,
      priceRangeLow: Number(form.priceRangeLow),
      priceRangeHigh: Number(form.priceRangeHigh),
      popularity: Number(form.popularity),
      isActive: form.isActive,
    };

    const response = isEditing
      ? await adminApi.updateMenu(form.id as string, payload)
      : await adminApi.createMenu(payload);

    if (response.success) {
      resetForm();
      load();
    } else {
      setError(response.error?.message || 'Failed to save menu');
    }
  };

  const deleteMenu = async (id: string) => {
    if (!confirm('Delete this menu?')) return;
    const response = await adminApi.deleteMenu(id);
    if (response.success) {
      load();
    } else {
      setError(response.error?.message || 'Failed to delete menu');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Menu Editor</div>
          <div className="text-lg font-semibold text-slate-900">{isEditing ? 'Edit Menu' : 'Create Menu'}</div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Local name"
            value={form.nameLocal}
            onChange={(e) => setForm({ ...form, nameLocal: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Image URL"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Cuisine type"
            value={form.cuisineType}
            onChange={(e) => setForm({ ...form, cuisineType: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Tags (comma separated)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Popularity (0-1)"
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={form.popularity}
            onChange={(e) => setForm({ ...form, popularity: Number(e.target.value) })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Price low"
            type="number"
            value={form.priceRangeLow}
            onChange={(e) => setForm({ ...form, priceRangeLow: Number(e.target.value) })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Price high"
            type="number"
            value={form.priceRangeHigh}
            onChange={(e) => setForm({ ...form, priceRangeHigh: Number(e.target.value) })}
          />
          <textarea
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active
          </label>
        </div>
        {error ? <div className="text-sm text-red-500">{error}</div> : null}
        <div className="flex flex-wrap gap-2">
          <Button onClick={submit}>{isEditing ? 'Update menu' : 'Create menu'}</Button>
          {isEditing ? (
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          ) : null}
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Search menus"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button variant="secondary" size="sm" onClick={load}>
            Search
          </Button>
        </div>
        {loading ? (
          <div className="text-sm text-slate-500">Loading menus...</div>
        ) : (
          <div className="space-y-2 text-sm">
            {menus.length === 0 ? (
              <div className="text-slate-500">No menus found.</div>
            ) : (
              menus.map((menu) => (
                <div key={menu.id} className="rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-800">{menu.name}</div>
                      <div className="text-xs text-slate-500">{menu.cuisineType} · Active: {menu.isActive ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setForm({
                            id: menu.id,
                            name: menu.name,
                            nameLocal: menu.nameLocal || '',
                            description: menu.description || '',
                            imageUrl: menu.imageUrl,
                            cuisineType: menu.cuisineType,
                            tags: (menu.tags || []).join(', '),
                            priceRangeLow: menu.priceRangeLow,
                            priceRangeHigh: menu.priceRangeHigh,
                            popularity: menu.popularity || 0,
                            isActive: menu.isActive,
                          });
                        }}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => deleteMenu(menu.id)}>
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
