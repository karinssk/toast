'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';

interface RestaurantFormState {
  id?: string;
  name: string;
  nameLocal: string;
  description: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  address: string;
  priceLevel: number;
  rating: number;
  reviewCount: number;
  phone: string;
  lineOfficialId: string;
  website: string;
  googleMapsUrl: string;
  isActive: boolean;
}

const emptyForm: RestaurantFormState = {
  name: '',
  nameLocal: '',
  description: '',
  imageUrl: '',
  latitude: 0,
  longitude: 0,
  address: '',
  priceLevel: 1,
  rating: 0,
  reviewCount: 0,
  phone: '',
  lineOfficialId: '',
  website: '',
  googleMapsUrl: '',
  isActive: true,
};

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<RestaurantFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(form.id);

  const load = async () => {
    setLoading(true);
    const response = await adminApi.listRestaurants({ search, page: 1, limit: 20 });
    if (response.success && response.data) {
      setRestaurants((response.data as any).restaurants || []);
      setError(null);
    } else {
      setError(response.error?.message || 'Failed to load restaurants');
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
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      address: form.address,
      priceLevel: Number(form.priceLevel),
      rating: form.rating ? Number(form.rating) : undefined,
      reviewCount: Number(form.reviewCount),
      openingHours: {},
      phone: form.phone || undefined,
      lineOfficialId: form.lineOfficialId || undefined,
      website: form.website || undefined,
      googleMapsUrl: form.googleMapsUrl || undefined,
      isActive: form.isActive,
    };

    const response = isEditing
      ? await adminApi.updateRestaurant(form.id as string, payload)
      : await adminApi.createRestaurant(payload);

    if (response.success) {
      resetForm();
      load();
    } else {
      setError(response.error?.message || 'Failed to save restaurant');
    }
  };

  const deleteRestaurant = async (id: string) => {
    if (!confirm('Delete this restaurant?')) return;
    const response = await adminApi.deleteRestaurant(id);
    if (response.success) {
      load();
    } else {
      setError(response.error?.message || 'Failed to delete restaurant');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Restaurant Editor</div>
          <div className="text-lg font-semibold text-slate-900">{isEditing ? 'Edit Restaurant' : 'Create Restaurant'}</div>
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
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Latitude"
            type="number"
            value={form.latitude}
            onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Longitude"
            type="number"
            value={form.longitude}
            onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Price level (1-4)"
            type="number"
            min="1"
            max="4"
            value={form.priceLevel}
            onChange={(e) => setForm({ ...form, priceLevel: Number(e.target.value) })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Rating (0-5)"
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Review count"
            type="number"
            value={form.reviewCount}
            onChange={(e) => setForm({ ...form, reviewCount: Number(e.target.value) })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="LINE Official ID"
            value={form.lineOfficialId}
            onChange={(e) => setForm({ ...form, lineOfficialId: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Website"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Google Maps URL"
            value={form.googleMapsUrl}
            onChange={(e) => setForm({ ...form, googleMapsUrl: e.target.value })}
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
          <Button onClick={submit}>{isEditing ? 'Update restaurant' : 'Create restaurant'}</Button>
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
            placeholder="Search restaurants"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button variant="secondary" size="sm" onClick={load}>
            Search
          </Button>
        </div>
        {loading ? (
          <div className="text-sm text-slate-500">Loading restaurants...</div>
        ) : (
          <div className="space-y-2 text-sm">
            {restaurants.length === 0 ? (
              <div className="text-slate-500">No restaurants found.</div>
            ) : (
              restaurants.map((restaurant) => (
                <div key={restaurant.id} className="rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-800">{restaurant.name}</div>
                      <div className="text-xs text-slate-500">{restaurant.address} · Active: {restaurant.isActive ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setForm({
                            id: restaurant.id,
                            name: restaurant.name,
                            nameLocal: restaurant.nameLocal || '',
                            description: restaurant.description || '',
                            imageUrl: restaurant.imageUrl,
                            latitude: restaurant.latitude,
                            longitude: restaurant.longitude,
                            address: restaurant.address,
                            priceLevel: restaurant.priceLevel,
                            rating: restaurant.rating || 0,
                            reviewCount: restaurant.reviewCount || 0,
                            phone: restaurant.phone || '',
                            lineOfficialId: restaurant.lineOfficialId || '',
                            website: restaurant.website || '',
                            googleMapsUrl: restaurant.googleMapsUrl || '',
                            isActive: restaurant.isActive,
                          });
                        }}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => deleteRestaurant(restaurant.id)}>
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
