import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import {
  useCreateProduct, useUpdateProduct,
  getGetFeaturedProductsQueryKey, getGetHomepageProductsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus } from "lucide-react";

export function ProductModal({ product, categories, tagCounts, onClose, onProductUpdated }: { product?: any; categories: any[]; tagCounts?: Record<string, number>; onClose: () => void; onProductUpdated?: (p: any) => void }) {
  const qc = useQueryClient();
  const { getToken } = useAuth();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [form, setForm] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    category: product?.category ?? (categories[0]?.slug ?? "moisturizers"),
    price: product?.price ?? "",
    discountPrice: product?.discountPrice ?? "",
    stock: product?.stock ?? "",
    productStatus: product?.productStatus ?? "in_stock",
    images: product?.images?.join(", ") ?? "",
    videoUrl: (product as any)?.videoUrl ?? "",
    ingredients: product?.ingredients ?? "",
    keyBenefits: (product?.keyBenefits ?? []).join("\n"),
    mainIngredients: (product?.mainIngredients ?? []) as { name: string; icon: string }[],
    bestFor: (product?.bestFor ?? []).join("\n"),
    texture: product?.texture ?? "",
    homepageTag: product?.homepageTag ?? "",
    parentCategory: (() => { if (!product?.category || !categories.length) return ""; const sub = categories.find((cat) => cat.slug === product.category); if (!sub?.parentId) return ""; const parent = categories.find((cat) => cat.id === sub.parentId); return parent?.slug ?? ""; })(),
  });

  const [newIngName, setNewIngName] = useState("");
  const [newIngIcon, setNewIngIcon] = useState("");

  function addMainIngredient() {
    if (!newIngName.trim()) return;
    setForm(f => ({ ...f, mainIngredients: [...f.mainIngredients, { name: newIngName.trim(), icon: newIngIcon.trim() || "📱" }] }));
    setNewIngName("");
    setNewIngIcon("");
  }

  function removeMainIngredient(idx: number) {
    setForm(f => ({ ...f, mainIngredients: f.mainIngredients.filter((_, i) => i !== idx) }));
  }

  function updateMainIngredient(idx: number, field: "name" | "icon", value: string) {
    setForm(f => ({
      ...f,
      mainIngredients: f.mainIngredients.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      name: form.name,
      slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-"),
      description: form.description,
      category: form.category,
      ingredients: form.ingredients || undefined,
      keyBenefits: form.keyBenefits.split("\n").map((s: string) => s.trim()).filter(Boolean),
      mainIngredients: form.mainIngredients,
      bestFor: form.bestFor.split("\n").map((s: string) => s.trim()).filter(Boolean),
      texture: form.texture || null,
      homepageTag: form.homepageTag || null,
      price: parseFloat(String(form.price)),
      discountPrice: form.discountPrice ? parseFloat(String(form.discountPrice)) : undefined,
      stock: parseInt(String(form.stock)),
      images: String(form.images).split(",").map((s) => s.trim()).filter(Boolean),
      videoUrl: (form as any).videoUrl ?? "",
      productStatus: (form as any).productStatus ?? "in_stock",
    };
    const invalidateAll = () => {
      qc.invalidateQueries({ queryKey: getGetFeaturedProductsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetHomepageProductsQueryKey() });
      qc.invalidateQueries({ queryKey: ["products", "tag-counts"] });
      onClose();
    };

    const updateCacheAndClose = (updatedProduct: any) => {
      // Update local allProducts state directly (what the table renders from)
      onProductUpdated?.(updatedProduct);
      // Also update React Query cache for consistency
      qc.setQueriesData(
        { queryKey: ["/api/products"] },
        (old: any) => {
          if (!old?.products) return old;
          return {
            ...old,
            products: old.products.map((p: any) =>
              p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p
            ),
          };
        }
      );
      invalidateAll();
    };

    if (product) {
      updateProduct.mutate({ id: product.id, data }, { onSuccess: updateCacheAndClose });
    } else {
      createProduct.mutate({ data }, { onSuccess: invalidateAll });
    }
  }

  const parentCats = categories.filter((cat: any) => !cat.parentId);
  const catOptions = categories.length > 0
    ? categories.filter((cat: any) => cat.parentId)
    : [
        { slug: "moisturizers", name: "Moisturizers" },
        { slug: "serums",       name: "Serums" },
        { slug: "sunscreen",    name: "Sunscreen" },
        { slug: "face-masks",   name: "Face Masks" },
        { slug: "cleansers",    name: "Cleansers" },
        { slug: "toners",       name: "Toners" },
        { slug: "eye-care",     name: "Eye Care" },
        { slug: "lip-care",     name: "Lip Care" },
        { slug: "hair-care",    name: "Hair Care" },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-semibold text-lg">{product ? "Edit Product" : "Add New Product"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Product Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="mt-1.5 rounded-xl" placeholder="e.g. Hada Labo Gokujyun Premium Milk" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Parent Category *</Label>
              <Select value={form.parentCategory || ""} onValueChange={v => setForm(f => ({ ...f, parentCategory: v, category: "" }))}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {parentCats.map((cat: any) => (
                    <SelectItem key={cat.slug} value={cat.slug}>{cat.icon ? cat.icon + " " : ""}{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Subcategory *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))} disabled={!form.parentCategory}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                <SelectContent>
                  {catOptions
                    .filter((cat: any) => {
                      const parent = categories.find((p: any) => p.slug === form.parentCategory);
                      return parent && cat.parentId === parent.id;
                    })
                    .map((cat: any) => (
                      <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Homepage Section</Label>
              <Select value={form.homepageTag || "none"} onValueChange={v => setForm(f => ({ ...f, homepageTag: v === "none" ? "" : v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Not on homepage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not on homepage</SelectItem>
                  <SelectItem value="trending">🔥 Trending ({tagCounts?.["trending"] ?? 0}/22)</SelectItem>
                  <SelectItem value="new_arrivals">✨ New Arrivals ({tagCounts?.["new_arrivals"] ?? 0}/22)</SelectItem>
                  <SelectItem value="best_skin_care" disabled={(tagCounts?.["best_skin_care"] ?? 0) >= 15 && product?.homepageTag !== "best_skin_care"}>🌿 Best Skin Care ({tagCounts?.["best_skin_care"] ?? 0}/15)</SelectItem>
                  <SelectItem value="best_hair_care" disabled={(tagCounts?.["best_hair_care"] ?? 0) >= 15 && product?.homepageTag !== "best_hair_care"}>💇 Best Hair Care ({tagCounts?.["best_hair_care"] ?? 0}/15)</SelectItem>
                  <SelectItem value="best_make_up" disabled={(tagCounts?.["best_make_up"] ?? 0) >= 15 && product?.homepageTag !== "best_make_up"}>💄 Best Make Up ({tagCounts?.["best_make_up"] ?? 0}/15)</SelectItem>
                  <SelectItem value="best_body_care" disabled={(tagCounts?.["best_body_care"] ?? 0) >= 15 && product?.homepageTag !== "best_body_care"}>🧴 Best Body Care ({tagCounts?.["best_body_care"] ?? 0}/15)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Price (Tk) *</Label>
              <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required className="mt-1.5 rounded-xl" placeholder="1500" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Sale Price (Tk)</Label>
              <Input type="number" value={form.discountPrice} onChange={e => setForm(f => ({ ...f, discountPrice: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="Optional" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Stock *</Label>
              <Input type="number" value={(form as any).productStatus === "pre_order" ? "0" : form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} required className="mt-1.5 rounded-xl" placeholder="50" disabled={(form as any).productStatus === "pre_order"} style={{ opacity: (form as any).productStatus === "pre_order" ? 0.5 : 1 }} />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Product Status</Label>
              <select
                value={(form as any).productStatus ?? "in_stock"}
                onChange={e => setForm(f => ({ ...f, productStatus: e.target.value } as any))}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="in_stock">🟢 In Stock</option>
                <option value="pre_order">🔵 Pre-Order</option>
                <option value="out_of_stock">🔴 Out of Stock</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1.5 rounded-xl" rows={3} placeholder="Product description..." />
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Key Benefits (one per line)</Label>
            <Textarea
              value={form.keyBenefits}
              onChange={e => setForm(f => ({ ...f, keyBenefits: e.target.value }))}
              className="mt-1.5 rounded-xl"
              rows={4}
              placeholder={"Intense long-lasting hydration\nStrengthens moisture barrier\nMakes skin plump and smooth"}
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Main Ingredients (with icons)</Label>
            <div className="mt-2 space-y-2">
              {form.mainIngredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={ing.icon}
                    onChange={e => updateMainIngredient(idx, "icon", e.target.value)}
                    className="w-16 rounded-xl text-center text-lg"
                    placeholder="📱"
                  />
                  <Input
                    value={ing.name}
                    onChange={e => updateMainIngredient(idx, "name", e.target.value)}
                    className="flex-1 rounded-xl"
                    placeholder="Ingredient name"
                  />
                  <button
                    type="button"
                    onClick={() => removeMainIngredient(idx)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <Input
                  value={newIngIcon}
                  onChange={e => setNewIngIcon(e.target.value)}
                  className="w-16 rounded-xl text-center text-lg"
                  placeholder="📱"
                />
                <Input
                  value={newIngName}
                  onChange={e => setNewIngName(e.target.value)}
                  className="flex-1 rounded-xl"
                  placeholder="Add ingredient..."
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addMainIngredient(); } }}
                />
                <button
                  type="button"
                  onClick={addMainIngredient}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-pink-500 hover:bg-pink-50 transition-colors shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Best For (one per line)</Label>
            <Textarea
              value={form.bestFor}
              onChange={e => setForm(f => ({ ...f, bestFor: e.target.value }))}
              className="mt-1.5 rounded-xl"
              rows={3}
              placeholder={"Dry skin\nDehydrated skin\nSensitive skin"}
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Texture</Label>
            <Input
              value={form.texture}
              onChange={e => setForm(f => ({ ...f, texture: e.target.value }))}
              className="mt-1.5 rounded-xl"
              placeholder="e.g. Rich milky emulsion with non-greasy finish."
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Product Images</Label>
            <div className="mt-1.5 space-y-2">
              <div className="flex gap-2">
                <input type="file" accept="image/*" multiple id="product-image-upload" className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (!files.length) return;
                    const currentCount = form.images ? String(form.images).split(",").filter((s: string) => s.trim()).length : 0;
                    if (currentCount + files.length > 4) { alert("Maximum 4 images allowed per product"); return; }
                    const fd = new FormData();
                    files.forEach((f: File) => fd.append("images", f));
                    if (form.name) fd.append("productName", String(form.name));
                    const existingCount = form.images ? String(form.images).split(",").filter((s: string) => s.trim()).length : 0;
                    fd.append("startIndex", String(existingCount));
                    try {
                      const token = await getToken();
                      if (!token) { alert("Not logged in"); return; }
                      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/products/upload-image`, {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${token}` },
                        body: fd,
                      });
                      if (!res.ok) { const err = await res.json(); alert("Upload error: " + (err.details || err.error)); return; }
                      const data = await res.json();
                      if (data.urls?.length) {
                        setForm((f: any) => ({ ...f, images: [f.images, ...data.urls].filter(Boolean).join(", ") }));
                      }
                    } catch (err) { alert("Upload failed: " + String(err)); }
                  }}
                />
                <Button type="button" variant="outline" className="rounded-xl flex-1"
                  onClick={() => document.getElementById("product-image-upload")?.click()}>
                  📁 Upload Images from Device
                </Button>
              </div>
              {form.images && (
                <div className="flex flex-wrap gap-2">
                  {String(form.images).split(",").map((url, i) => url.trim() && (
                    <div key={i} className="relative">
                      <img src={url.trim()} className="h-16 w-16 object-cover rounded-lg border" />
                      <button type="button" className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center"
                        onClick={() => setForm(f => ({ ...f, images: String(f.images).split(",").filter((_, j) => j !== i).join(", ") }))}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <Input value={form.images} onChange={e => setForm(f => ({ ...f, images: e.target.value }))} className="rounded-xl text-xs" placeholder="Or paste image URLs here..." />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">YouTube Video URL (optional)</Label>
            <Input value={form.videoUrl ?? ""} onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="https://www.youtube.com/watch?v=..." />
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Full Ingredients (INCI)</Label>
            <Textarea value={form.ingredients} onChange={e => setForm(f => ({ ...f, ingredients: e.target.value }))} className="mt-1.5 rounded-xl" rows={2} placeholder="INCI names..." />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending} className="flex-1 rounded-xl bg-pink-500 hover:bg-pink-600 text-white">
              {product ? "Update Product" : "Create Product"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
