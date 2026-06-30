import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { useCreateCategory, useUpdateCategory, useListCategories, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

export function CategoryModal({ category, onClose }: { category?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { getToken } = useAuth();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const { data: allCategories = [] } = useListCategories({ query: { staleTime: 30_000, queryKey: getListCategoriesQueryKey() } });

  const [form, setForm] = useState({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    icon: category?.icon ?? "",
    image: category?.image ?? "",
    displayOrder: category?.displayOrder ?? 0,
    parentId: category?.parentId ?? null,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      name: form.name,
      slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      icon: form.icon || null,
      image: form.image || null,
      displayOrder: Number(form.displayOrder),
      parentId: form.parentId || null,
    };
    if (category) {
      updateCategory.mutate({ id: category.id, data }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); onClose(); },
      });
    } else {
      createCategory.mutate({ data }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); onClose(); },
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-lg">{category ? "Edit Category" : "Add Category"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Parent Category (leave empty for top-level)</Label>
            <select
              value={form.parentId ?? ""}
              onChange={e => setForm(f => ({ ...f, parentId: e.target.value ? Number(e.target.value) : null }))}
              className="mt-1.5 w-full rounded-xl border border-input px-3 py-2 text-sm bg-white"
            >
              <option value="">— None (top-level category) —</option>
              {(allCategories as any[]).filter((cat: any) => !cat.parentId && cat.id !== category?.id).map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.icon ? cat.icon + " " : ""}{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Category Name *</Label>
            <Input
              value={form.name}
              onChange={e => {
                const name = e.target.value;
                setForm(f => ({
                  ...f,
                  name,
                  slug: f.slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
                }));
              }}
              required
              className="mt-1.5 rounded-xl"
              placeholder="e.g. Fragrance"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Slug (auto-generated)</Label>
            <Input
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              className="mt-1.5 rounded-xl font-mono text-sm"
              placeholder="fragrance"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Icon (emoji, optional)</Label>
            <Input
              value={form.icon}
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
              className="mt-1.5 rounded-xl"
              placeholder="📱"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Collection Image (optional)</Label>
            <div className="mt-1.5 flex gap-2 items-center">
              <Input
                value={form.image}
                onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                className="rounded-xl flex-1"
                placeholder="Paste image URL or upload"
              />
              <label className="cursor-pointer shrink-0 px-3 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50 transition-colors">
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append("images", file);
                  try {
                    const token = await getToken();
                    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/products/upload-image`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
                    const data = await res.json();
                    if (data.urls?.[0]) setForm(f => ({ ...f, image: data.urls[0] }));
                  } catch { alert("Upload failed"); }
                }} />
              </label>
            </div>
            {form.image && (
              <div className="relative mt-2">
                <img src={form.image} alt="preview" className="h-24 w-full object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, image: "" }))}
                  className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                  title="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Display Order</Label>
            <Input
              type="number"
              value={form.displayOrder}
              onChange={e => setForm(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))}
              className="mt-1.5 rounded-xl"
              placeholder="0"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending} className="flex-1 rounded-xl bg-pink-500 hover:bg-pink-600 text-white">
              {category ? "Update Category" : "Add Category"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
