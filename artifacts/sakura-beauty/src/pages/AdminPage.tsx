import { useState, useMemo, Fragment, useEffect, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  getGetFeaturedProductsQueryKey, getGetHomepageProductsQueryKey,
  useListAllOrders, useUpdateOrderStatus,
  useListAllUsers, useToggleUserBlock,
  useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  useListAllReviews, useDeleteReview,
  getListProductsQueryKey, getListAllOrdersQueryKey, getListCategoriesQueryKey, getListAllUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  LayoutDashboard, Package2, ShoppingCart, Users, Tag, Settings,
  Plus, Pencil, Trash2, Search, TrendingUp, DollarSign, Star,
  ChevronRight, X, Menu, BarChart3, CheckCircle2, Clock, Truck,
  AlertCircle, XCircle, Layers, MessageSquare, MapPin, Ban, UserCheck, ChevronDown, Archive,
  Calendar, ToggleLeft, ToggleRight, RotateCcw, Activity, GitBranch, Upload, HelpCircle,
  BookOpen, FileText, Save,
} from "lucide-react";
import { useAuth } from "@clerk/react";


const API = import.meta.env.VITE_API_BASE_URL ?? "";

// ??? Status helpers ?????????????????????????????????????????????????????????
const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
  pending:    { color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  confirmed:  { color: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle2 },
  processing: { color: "bg-violet-100 text-violet-700 border-violet-200", icon: BarChart3 },
  shipped:    { color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: Truck },
  delivered:  { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  cancelled:       { color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  return_completed: { color: "bg-teal-100 text-teal-700 border-teal-200", icon: RotateCcw },
};

// ??? Sidebar nav items ???????????????????????????????????????????????????????
const navItems = [
  { id: "dashboard",  label: "Dashboard",       icon: LayoutDashboard },
  { id: "products",   label: "Products",        icon: Package2 },
  { id: "categories", label: "Categories",      icon: Layers },
  { id: "orders",     label: "Orders",          icon: ShoppingCart },
  { id: "archived",   label: "Archived Orders", icon: Archive },
  { id: "users",      label: "Users",           icon: Users },
  { id: "reviews",    label: "Reviews",         icon: MessageSquare },
  { id: "coupons",    label: "Coupons",         icon: Tag },
  { id: "monthly",    label: "Monthly History", icon: Calendar },
  { id: "returns",    label: "Returns",          icon: RotateCcw },
  { id: "affiliates", label: "Affiliates",       icon: GitBranch },
  { id: "blog",       label: "Blog Posts",       icon: BookOpen },
  { id: "auditlogs",  label: "Audit Logs",       icon: Activity },
  { id: "qa",         label: "Q&A",              icon: HelpCircle },
  { id: "bulkimport", label: "Bulk Import",      icon: Upload },

  { id: "settings",   label: "Settings",         icon: Settings },
];

// ??? Product form ????????????????????????????????????????????????????????????
function ProductModal({ product, categories, onClose }: { product?: any; categories: any[]; onClose: () => void }) {
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
    isFeatured: product?.isFeatured ?? false,
    homepageSection: product?.homepageSection ?? "",
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
      isFeatured: form.isFeatured,
      homepageSection: form.homepageSection || null,
      price: parseFloat(String(form.price)),
      discountPrice: form.discountPrice ? parseFloat(String(form.discountPrice)) : undefined,
      stock: parseInt(String(form.stock)),
      images: String(form.images).split(",").map((s) => s.trim()).filter(Boolean),
      videoUrl: (form as any).videoUrl ?? "",
      productStatus: (form as any).productStatus ?? "in_stock",
    };
    const invalidateAll = () => {
      qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetFeaturedProductsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetHomepageProductsQueryKey() });
      onClose();
    };
    if (product) {
      updateProduct.mutate({ id: product.id, data }, { onSuccess: invalidateAll });
    } else {
      createProduct.mutate({ data }, { onSuccess: invalidateAll });
    }
  }

  const catOptions = categories.length > 0
    ? categories
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
              <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {catOptions.map((c: any) => (
                    <SelectItem key={c.slug} value={c.slug} className="capitalize">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Homepage Section</Label>
              <Select value={form.homepageSection || "none"} onValueChange={v => setForm(f => ({ ...f, homepageSection: v === "none" ? "" : v }))}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Not on homepage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not on homepage</SelectItem>
                  <SelectItem value="top">Top Section</SelectItem>
                  <SelectItem value="bottom">Below Section</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))}
                  className="w-4 h-4 accent-pink-500"
                />
                <span className="text-sm font-medium">Mark as Featured</span>
              </label>
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
                    if (form.name) fd.append("productName", String(form.name));
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

// ??? Category form ????????????????????????????????????????????????????????????
function CategoryModal({ category, onClose }: { category?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { getToken } = useAuth();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const [form, setForm] = useState({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    icon: category?.icon ?? "",
    image: category?.image ?? "",
    displayOrder: category?.displayOrder ?? 0,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      name: form.name,
      slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      icon: form.icon || null,
      image: form.image || null,
      displayOrder: Number(form.displayOrder),
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


// ??? Confirm Dialog ???????????????????????????????????????????????????????????
function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger = true }: {
  open: boolean; title: string; message: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? "bg-red-100" : "bg-amber-100"}`}>
          <AlertCircle className={`h-6 w-6 ${danger ? "text-red-600" : "text-amber-600"}`} />
        </div>
        <h3 className="text-lg font-semibold text-center text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-center text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${danger ? "bg-red-500 hover:bg-red-600" : "bg-amber-500 hover:bg-amber-600"}`}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ??? Main AdminPage ??????????????????????????????????????????????????????????
export function AdminPage() {
  const [cdg, setCdg] = useState<{open:boolean;title:string;message:string;onConfirm:()=>void;danger:boolean}>({open:false,title:"",message:"",onConfirm:()=>{},danger:true});
  const askConfirm = (title:string,message:string,cb:()=>void,danger=true) => setCdg({open:true,title,message,onConfirm:cb,danger});
  const closeCdg = () => setCdg(d=>({...d,open:false}));
  const qc = useQueryClient();
  const { getToken } = useAuth();
  const [productsPage, setProductsPage] = useState(1);
  const { data: productsData, isLoading: productsLoading } = useListProducts({ limit: 25, page: productsPage });
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const productsHasMore = productsData ? allProducts.length < (productsData.total ?? 0) : false;
  useEffect(() => {
    if (productsData?.products) {
      if (productsPage === 1) setAllProducts(productsData.products);
      else setAllProducts(prev => [...prev, ...productsData.products]);
    }
  }, [productsData, productsPage]);
  const [orders, setOrders] = useState<any[]>([]);
  const [adminPreOrders, setAdminPreOrders] = useState<any[]>([]);
  const fetchAdminPreOrders = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/pre-orders`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setAdminPreOrders(data);
    } catch {}
  };
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersHasMore, setOrdersHasMore] = useState(false);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [dashStats, setDashStats] = useState<{totalSales:number,totalOrders:number,pendingOrders:number,deliveredOrders:number}>({totalSales:0,totalOrders:0,pendingOrders:0,deliveredOrders:0});

  const fetchOrders = async (page: number, append = false) => {
    setOrdersLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/admin/orders?page=${page}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.orders ?? []);
      setOrders(prev => append ? [...prev, ...list] : list);
      setOrdersHasMore(data.hasMore ?? list.length === 20);
      if (!append) setOrdersTotal(data.total ?? list.length);
      setOrdersPage(page);
    } catch (e: any) { console.error("fetchOrders error:", e?.message, e); }
    setOrdersLoading(false);
  };

  useEffect(() => {
    fetchOrders(1);
    fetchAdminPreOrders();
    getToken().then(token =>
      fetch(`${API}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          setDashStats({ totalSales: data.totalSales ?? 0, totalOrders: data.totalOrders ?? 0, pendingOrders: data.pendingOrders ?? 0, deliveredOrders: data.totalOrders != null && data.pendingOrders != null ? (data.totalOrders - data.pendingOrders) : 0 });
        })
        .catch(() => {})
    );
  }, []);
  const { data: users } = useListAllUsers({ query: { queryKey: getListAllUsersQueryKey() } });
  const { data: me } = useGetMe();
  const { data: categories = [] } = useListCategories({ query: { staleTime: 30_000, queryKey: getListCategoriesQueryKey() } });
  const { data: allReviews = [], isLoading: reviewsLoading } = useListAllReviews();

  const deleteProduct = useDeleteProduct();
  const deleteCategory = useDeleteCategory();
  const updateOrderStatus = useUpdateOrderStatus();
  const deleteReview = useDeleteReview();
  const toggleUserBlock = useToggleUserBlock();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [search, setSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [reviewSearch, setReviewSearch] = useState("");
  const [couponSearch, setCouponSearch] = useState("");
  const [archivedOrders, setArchivedOrders] = useState<any[]>([]);
  const [archivedPreOrders, setArchivedPreOrders] = useState<any[]>([]);
  const [archivedPage, setArchivedPage] = useState(1);
  const [archivedHasMore, setArchivedHasMore] = useState(false);
  const [archivedTotal, setArchivedTotal] = useState(0);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState<string|null>(null);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [seedingCategories, setSeedingCategories] = useState(false);

  // Coupons state
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponSaving, setCouponSaving] = useState(false);

  // Monthly history state
  const [monthlyRecords, setMonthlyRecords] = useState<any[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // Debounced search values (prevent filtering on every keystroke)
  const debouncedSearch = useDebounce(search, 300);
  const debouncedOrderSearch = useDebounce(orderSearch, 300);
  const debouncedUserSearch = useDebounce(userSearch, 300);

  // Cancellation reason modal state
  const [cancelModal, setCancelModal] = useState<{ orderId: number; reason: string } | null>(null);

  // Fetch coupons when tab is active
  const fetchCoupons = useCallback(async () => {
    setCouponsLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(API+"/api/coupons", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCoupons(Array.isArray(data) ? data : []);
    } catch {
      setCoupons([]);
    } finally {
      setCouponsLoading(false);
    }
  }, [getToken]);

  // Fetch monthly records when tab is active
  const fetchMonthlyRecords = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(API+"/api/admin/monthly-records", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMonthlyRecords(Array.isArray(data) ? data : []);
    } catch {
      setMonthlyRecords([]);
    } finally {
      setMonthlyLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (activeTab === "coupons") fetchCoupons();
  }, [activeTab, fetchCoupons]);

  useEffect(() => {
    if (activeTab === "orders") fetchAdminPreOrders();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "monthly") fetchMonthlyRecords();
  }, [activeTab, fetchMonthlyRecords]);

  // Coupon CRUD handlers
  async function handleSaveCoupon(form: any) {
    setCouponSaving(true);
    try {
      const token = await getToken();
      const url = editingCoupon ? `${API}/api/coupons/${editingCoupon.id}` : API+"/api/coupons";
      const method = editingCoupon ? "PUT" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      setShowCouponModal(false);
      setEditingCoupon(null);
      fetchCoupons();
    } finally {
      setCouponSaving(false);
    }
  }

  async function handleDeleteCoupon(id: number) {
    askConfirm("Delete Coupon", "This coupon will be permanently deleted.", async () => {
      const token = await getToken();
      await fetch(`${API}/api/coupons/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      fetchCoupons();
    });
  }

  async function handleToggleCoupon(id: number) {
    const token = await getToken();
    await fetch(`${API}/api/coupons/${id}/toggle`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    fetchCoupons();
  }

  async function handleArchiveNow() {
    if (!window.confirm("Archive last month's data now?")) return;
    const token = await getToken();
    const res = await fetch(API+"/api/admin/monthly-records/archive", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    alert(result.message);
    fetchMonthlyRecords();
  }

  const products = allProducts;

  const filteredProducts = useMemo(
    () => products.filter(p =>
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(debouncedSearch.toLowerCase())
    ),
    [products, debouncedSearch]
  );

  const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
  const fetchArchivedOrders = async (page: number, append = false) => {
    setArchivedLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/admin/orders/archived?page=${page}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setArchivedOrders(prev => append ? [...prev, ...data.orders] : data.orders);
      if (Array.isArray(data.preOrders)) setArchivedPreOrders(data.preOrders);
      setArchivedHasMore(data.hasMore);
      setArchivedTotal(data.total);
      setArchivedPage(page);
      setArchivedError(null);
    } catch (e: any) {
      setArchivedError(e.message ?? "Failed to load");
    }
    setArchivedLoading(false);
  };

  useEffect(() => {
    fetchArchivedOrders(1);
    // Fetch real order counts for badges
    getToken().then(token =>
      fetch(`${API}/api/admin/orders/stats`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          setActiveOrdersCount(data.activeOrders);
          setArchivedTotal(data.archivedOrders);
        })
        .catch(() => {})
    );
  }, []);

  const filteredOrders = useMemo(
    () => {
      const preOrdersMapped = adminPreOrders.map((o: any) => ({ ...o, _type: "preorder", orderStatus: o.status }));
      const allOrders = [...orders, ...preOrdersMapped].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return allOrders.filter(o => {
        return !orderSearch ||
          String(o.id).includes(orderSearch) ||
          ((o as any).orderStatus ?? "").toLowerCase().includes(orderSearch.toLowerCase()) ||
          ((o as any).status ?? "").toLowerCase().includes(orderSearch.toLowerCase()) ||
          ((o as any).userName ?? "").toLowerCase().includes(orderSearch.toLowerCase()) ||
          ((o as any).userEmail ?? "").toLowerCase().includes(orderSearch.toLowerCase());
      });
    },
    [orders, adminPreOrders, orderSearch]
  );

  function handleDeleteProduct(id: number) {
    askConfirm("Delete Product", "This product will be permanently deleted and cannot be recovered.", () => {
      deleteProduct.mutate({ id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListProductsQueryKey() }) });
    });
  }

  // Filtered reviews with search
  const filteredReviews = useMemo(() =>
    !reviewSearch
      ? (allReviews as any[])
      : (allReviews as any[]).filter(r =>
          r.productName?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
          r.userName?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
          r.comment?.toLowerCase().includes(reviewSearch.toLowerCase())
        ),
    [allReviews, reviewSearch]
  );

  // Filtered coupons with search
  const filteredCoupons = useMemo(() =>
    !couponSearch
      ? coupons
      : coupons.filter(c =>
          c.code?.toLowerCase().includes(couponSearch.toLowerCase()) ||
          c.description?.toLowerCase().includes(couponSearch.toLowerCase())
        ),
    [coupons, couponSearch]
  );

  function handleDeleteCategory(id: number) {
    askConfirm("Delete Category", "This category will be permanently deleted.", () => {
      deleteCategory.mutate({ id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() }) });
    });
  }

  function handleDeleteReview(productId: number, reviewId: number) {
    askConfirm("Delete Review", "This review will be permanently deleted.", () => {
      deleteReview.mutate({ productId, reviewId }, {
        onSuccess: () => qc.invalidateQueries({ queryKey: ["listAllReviews"] }),
      });
    });
  }

  function handleOrderStatus(orderId: number, status: string) {
    if (status === "cancelled") {
      setCancelModal({ orderId, reason: "" });
      return;
    }
    updateOrderStatus.mutate({ id: orderId, data: { orderStatus: status } }, {
      onSuccess: () => fetchOrders(1),
    });
  }

  function confirmCancellation() {
    if (!cancelModal) return;
    updateOrderStatus.mutate(
      { id: cancelModal.orderId, data: { orderStatus: "cancelled", cancellationReason: cancelModal.reason.trim() || null } },
      { onSuccess: () => { fetchOrders(1); setCancelModal(null); } }
    );
  }

  function handleToggleBlock(userId: number, isBlocked: boolean) {
    toggleUserBlock.mutate({ id: userId, data: { isBlocked } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListAllUsersQueryKey() }),
    });
  }

  async function handleSeedCategories() {
    setSeedingCategories(true);
    try {
      const token = await getToken();
      await fetch(API+"/api/categories/seed", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
    } finally {
      setSeedingCategories(false);
    }
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthOrders = orders.filter(o => new Date(o.createdAt) >= startOfMonth);
  const totalRevenue = dashStats.totalSales;
  const totalOrdersThisMonth = dashStats.totalOrders;
  const pendingOrders = dashStats.pendingOrders;
  const deliveredOrders = dashStats.deliveredOrders;

  // ??? Sidebar ???????????????????????????????????????????????????????????????
  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`${mobile ? "w-64" : "w-64"} bg-white border-r flex flex-col h-full`}>
      <div className="px-6 py-5 border-b">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">EE</span>
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">EnvyEnhance</p>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              activeTab === id
                ? "bg-pink-50 text-pink-600"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            }`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {label}
            {id === "orders" && ordersTotal > 0 && (
              <span className="ml-auto bg-pink-100 text-pink-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                {ordersTotal + adminPreOrders.length}
              </span>
            )}
            {id === "archived" && archivedTotal > 0 && (
              <span className="ml-auto bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full">
                {archivedTotal}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="px-4 py-4 border-t">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-300 to-rose-400 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">
              {(me as any)?.firstName?.[0] ?? "A"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{(me as any)?.firstName} {(me as any)?.lastName}</p>
            <p className="text-xs text-gray-400">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );

  // ??? Dashboard Tab ?????????????????????????????????????????????????????????
  const DashboardTab = () => {
    const dashLoading = productsLoading || ordersLoading;
    if (dashLoading) {
      return (
        <div className="space-y-6">
          {/* Stat cards skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24 rounded-full" />
                  <Skeleton className="h-9 w-9 rounded-xl" />
                </div>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32 rounded-full" />
              </div>
            ))}
          </div>
          {/* Recent orders + chart skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="divide-y">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3">
                    <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-4 w-16 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border p-5">
              <Skeleton className="h-5 w-40 mb-5" />
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3.5 w-20" />
                      <Skeleton className="h-3 w-6" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Category breakdown skeleton */}
          <div className="bg-white rounded-2xl border p-5">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-pink-50 rounded-xl p-4 text-center space-y-2">
                  <Skeleton className="h-8 w-10 mx-auto" />
                  <Skeleton className="h-3 w-16 mx-auto rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Revenue (This Month)",
            value: totalRevenue > 0 ? `Tk${(totalRevenue / 1000).toFixed(1)}k` : "-",
            change: totalRevenue > 0 ? "from delivered orders" : "No delivered orders yet",
            icon: DollarSign,
            color: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Orders (This Month)",
            value: totalOrdersThisMonth > 0 ? totalOrdersThisMonth : "-",
            change: totalOrdersThisMonth > 0 ? `${pendingOrders} pending` : "No orders yet",
            icon: ShoppingCart,
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "Products",
            value: products.length > 0 ? products.length : "-",
            change: products.length > 0 ? `${products.filter(p => p.stock < 10).length} low stock` : "No products yet",
            icon: Package2,
            color: "bg-violet-50 text-violet-600",
          },
          {
            label: "Customers",
            value: users && users.length > 0 ? users.length : "-",
            change: deliveredOrders > 0 ? `${deliveredOrders} delivered` : "No deliveries yet",
            icon: Users,
            color: "bg-pink-50 text-pink-600",
          },
        ].map(({ label, value, change, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</span>
              <div className={`h-9 w-9 rounded-xl ${color} flex items-center justify-center`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{change}</p>
          </div>
        ))}
      </div>

      {orders.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-800">Recent Orders</h3>
              <button onClick={() => setActiveTab("orders")} className="text-xs text-pink-500 hover:underline flex items-center gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="divide-y">
              {orders.slice(0, 5).map((o) => {
                const cfg = statusConfig[o.orderStatus] ?? { color: "bg-gray-100 text-gray-600", icon: AlertCircle };
                const StatusIcon = cfg.icon;
                return (
                  <div key={o.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="h-8 w-8 rounded-lg bg-gray-50 border flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-gray-500">#{o.id}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">Order #{o.id}</p>
                      <p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                      <StatusIcon className="h-3 w-3" />{o.orderStatus}
                    </span>
                    <span className="text-sm font-semibold text-gray-800 shrink-0">Tk{o.totalAmount.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Order Status Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(
                orders.reduce((acc, o) => {
                  acc[o.orderStatus] = (acc[o.orderStatus] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([status, count]) => (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 capitalize">{status}</span>
                    <span className="text-xs font-semibold text-gray-800">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-400 transition-all"
                      style={{ width: `${(count / orders.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="font-semibold text-gray-500 mb-1">No orders yet</p>
          <p className="text-sm text-gray-400">Orders will appear here once customers start purchasing.</p>
        </div>
      )}

      {products.length > 0 && (
        <div className="bg-white rounded-2xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Products by Category</h3>
            <button onClick={() => setActiveTab("products")} className="text-xs text-pink-500 hover:underline flex items-center gap-1">
              Manage <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(
              products.reduce((acc, p) => {
                acc[p.category] = (acc[p.category] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([cat, count]) => (
              <div key={cat} className="bg-pink-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-pink-600">{count}</p>
                <p className="text-xs text-gray-500 capitalize mt-1">{cat}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    );
  };

  // ??? Products Tab ??????????????????????????????????????????????????????????
  const ProductsTab = () => (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
        <Button onClick={() => setShowProductModal(true)} className="rounded-xl bg-pink-500 hover:bg-pink-600 text-white shrink-0">
          <Plus className="h-4 w-4 mr-1.5" /> Add Product
        </Button>
      </div>

      {productsLoading && productsPage === 1 ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Homepage</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-pink-50/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" className="h-10 w-10 rounded-xl object-cover border" />
                        ) : (
                          <div className="h-10 w-10 rounded-xl bg-gray-100 border" />
                        )}
                        <div>
                          <p className="font-medium text-gray-800">{p.name}</p>
                          {p.isFeatured && (
                            <span className="text-xs bg-pink-50 text-pink-500 border border-pink-200 px-1.5 py-0.5 rounded-md font-medium">Featured</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="capitalize text-gray-500 text-xs bg-gray-100 px-2.5 py-1 rounded-full font-medium">{p.category}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {(p as any).homepageSection ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                          (p as any).homepageSection === "top"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : "bg-blue-50 text-blue-600 border border-blue-200"
                        }`}>
                          {(p as any).homepageSection === "top" ? "Top Section" : "Below Section"}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <p className="font-semibold text-gray-800">Tk{p.price.toLocaleString()}</p>
                      {p.discountPrice && <p className="text-xs text-pink-500">Sale: Tk{p.discountPrice.toLocaleString()}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`font-semibold ${p.stock < 10 ? "text-red-500" : "text-gray-700"}`}>{p.stock}</span>
                      {p.stock < 10 && <p className="text-xs text-red-400">Low stock</p>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => { setEditingProduct(p); setShowProductModal(true); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {productsHasMore && (
                <div className="flex justify-center py-4">
                  <Button onClick={() => setProductsPage(p => p + 1)} disabled={productsLoading} className="rounded-xl bg-pink-500 hover:bg-pink-600 text-white">
                    {productsLoading ? "Loading..." : "Load More Products"}
                  </Button>
                </div>
              )}
              {filteredProducts.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-12">No products found</td></tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  );

  // ??? Categories Tab ?????????????????????????????????????????????????????????
  const CategoriesTab = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">Manage your product categories. They auto-appear in the hamburger menu and filters.</p>
        </div>
        <div className="flex gap-2">
          {(categories as any[]).length === 0 && (
            <Button
              variant="outline"
              onClick={handleSeedCategories}
              disabled={seedingCategories}
              className="rounded-xl text-sm shrink-0"
            >
              {seedingCategories ? "Loading..." : "Load Defaults"}
            </Button>
          )}
          <Button onClick={() => setShowCategoryModal(true)} className="rounded-xl bg-pink-500 hover:bg-pink-600 text-white shrink-0">
            <Plus className="h-4 w-4 mr-1.5" /> Add Category
          </Button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <Layers className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="font-semibold text-gray-500 mb-1">No categories yet</p>
          <p className="text-sm text-gray-400 mb-4">Add your first category to organize products and update the navigation menu.</p>
          <Button onClick={() => setShowCategoryModal(true)} className="rounded-xl bg-pink-500 hover:bg-pink-600 text-white">
            <Plus className="h-4 w-4 mr-1.5" /> Add First Category
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Icon</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Products</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categories.map((cat) => {
                  const productCount = products.filter(p => p.category === cat.slug).length;
                  return (
                    <tr key={cat.id} className="hover:bg-pink-50/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-800">{cat.name}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{cat.slug}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xl">{cat.icon ?? "-"}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-500">{cat.displayOrder}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="font-semibold text-gray-700">{productCount}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => { setEditingCategory(cat); setShowCategoryModal(true); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  );

  // ??📦 Orders Tab ????????????????????????????????????????????????????????????
  const OrdersTab = () => (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by order ID, customer, or status..."
            value={orderSearch}
            onChange={e => setOrderSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
        <div className="flex gap-2">
          {["all","pending","delivered"].map(s => (
            <button
              key={s}
              onClick={() => setOrderSearch(s === "all" ? "" : s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                (s === "all" && !orderSearch) || orderSearch === s
                  ? "bg-pink-100 text-pink-600"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {ordersLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map((o) => {
                if ((o as any)._type === "preorder") {
                  const isPreExpanded = expandedOrderId === `pre-${o.id}`;
                  return (
                    <Fragment key={`pre-${o.id}`}>
                      <tr className="hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => setExpandedOrderId(isPreExpanded ? null : `pre-${o.id}` as any)}>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <ChevronDown className={`h-3.5 w-3.5 text-blue-400 transition-transform shrink-0 ${isPreExpanded ? "rotate-180" : ""}`} />
                            <div>
                              <span className="text-xs font-bold bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">PRE-ORDER</span>
                              <p className="text-xs font-mono text-gray-500 mt-0.5">{o.trackingId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-gray-800 text-xs">{o.shippingAddress?.fullName ?? "Guest"}</p>
                          <p className="text-xs text-gray-400">{o.whatsappPhone ?? o.shippingAddress?.phone}</p>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}</td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded-lg font-medium text-gray-600 capitalize">{o.paymentMethod}</span>
                        </td>
                        <td className="px-4 py-3.5"></td>
                        <td className="px-4 py-3.5 text-right font-semibold text-gray-800">Tk{(Number(o.discountedPrice) * Number(o.quantity) + Number(o.deliveryCharge)).toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                          <Select value={o.status} onValueChange={async (newStatus) => {
                              let cancellationReason: string | undefined;
                              if (newStatus === "cancelled") {
                                const reason = window.prompt("Enter cancellation reason (optional):");
                                cancellationReason = reason ?? undefined;
                              }
                              const token = await getToken();
                              await fetch(`${API}/api/pre-orders/${o.id}/status`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ status: newStatus, cancellationReason }),
                              });
                              fetchAdminPreOrders();
                            }} disabled={o.status === "delivered" || o.status === "cancelled"}>
                            <SelectTrigger className={`w-34 text-xs h-8 rounded-lg border-gray-200 ${(o.status === "delivered" || o.status === "cancelled") ? "opacity-50 cursor-not-allowed" : ""}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["pending","confirmed","arrived_in_bd","shipped","delivered","cancelled"].map(s => (
                                <SelectItem key={s} value={s} className="text-xs">{s === "arrived_in_bd" ? "Arrived in BD" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                      {isPreExpanded && (
                        <tr key={`pre-${o.id}-expanded`} className="bg-blue-50/40">
                          <td colSpan={7} className="px-8 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5" /> Shipping Address
                                </p>
                                <p className="font-medium text-gray-800">{o.shippingAddress?.fullName}</p>
                                <p className="text-gray-500 text-xs">{o.shippingAddress?.street}</p>
                                <p className="text-gray-500 text-xs">{o.shippingAddress?.city}{o.shippingAddress?.district ? `, ${o.shippingAddress.district}` : ""}</p>
                                {o.shippingAddress?.phone && <p className="text-gray-500 text-xs mt-0.5">📞 {o.shippingAddress.phone}</p>}
                                {o.whatsappPhone && <p className="text-gray-500 text-xs mt-0.5">💬 WhatsApp: {o.whatsappPhone}</p>}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Product</p>
                                <p className="text-xs text-gray-600">{o.productName} × {o.quantity}</p>
                                <p className="text-xs text-gray-500 mt-1">Price: Tk{Number(o.discountedPrice).toLocaleString()}</p>
                                <p className="text-xs text-gray-500">Delivery: Tk{Number(o.deliveryCharge).toLocaleString()}</p>
                                <p className="text-xs font-semibold text-gray-700 mt-1">Total: Tk{(Number(o.discountedPrice) * Number(o.quantity) + Number(o.deliveryCharge)).toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Info</p>
                                <p className="text-xs text-gray-600 capitalize">Method: {o.paymentMethod}</p>
                                <p className={`text-xs capitalize ${o.paymentStatus === "paid" ? "text-green-600" : "text-amber-600"}`}>Status: {o.paymentStatus}</p>
                                {o.senderNumber && <p className="text-xs text-gray-500 mt-1">From: <span className="font-mono">{o.senderNumber}</span></p>}
                                {o.transactionId && <p className="text-xs text-gray-500 font-mono mt-1">TxID: {o.transactionId}</p>}
                                {o.status === "cancelled" && o.cancellationReason && (
                                  <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
                                    <p className="text-xs font-semibold text-red-600">Cancel Reason:</p>
                                    <p className="text-xs text-red-500 mt-0.5">{o.cancellationReason}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                }
                  const cfg = statusConfig[o.orderStatus] ?? { color: "bg-gray-100 text-gray-600 border-gray-200", icon: AlertCircle };
                  const StatusIcon = cfg.icon;
                  const isExpanded = expandedOrderId === o.id;
                  const addr = (o as any).shippingAddress as { fullName?: string; street?: string; line1?: string; city?: string; district?: string; phone?: string } | null;
                  return (
                    <Fragment key={o.id}>
                      <tr className="hover:bg-pink-50/30 transition-colors cursor-pointer" onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                            <div>
                              <p className="font-semibold text-gray-800">#{o.id}</p>
                              {(o as any).trackingId && <p className="text-xs text-gray-400 font-mono">{(o as any).trackingId}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {(o as any).userName ? (
                            <div>
                              <p className="font-medium text-gray-800 text-xs">{(o as any).userName}</p>
                              {!(o as any).userEmail?.endsWith("@clerk.user") && (o as any).userEmail && (
                                <p className="text-xs text-gray-400">{(o as any).userEmail}</p>
                              )}
                            </div>
                          ) : (o as any).shippingAddress?.fullName ? (
                            <p className="text-xs text-gray-600">{(o as any).shippingAddress.fullName}</p>
                          ) : (
                            <p className="text-xs text-gray-400">-</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-gray-500 text-xs">{new Date(o.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded-lg font-medium text-gray-600 capitalize">{(o as any).paymentMethod ?? "-"}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                            <StatusIcon className="h-3 w-3" />{o.orderStatus === "return_completed" ? "Refund Completed" : o.orderStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-gray-800">Tk{o.totalAmount.toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                          <Select value={o.orderStatus} onValueChange={(v) => handleOrderStatus(o.id, v)} disabled={o.orderStatus === "delivered" || o.orderStatus === "cancelled" || o.orderStatus === "return_completed"}>
                            <SelectTrigger className={`w-34 text-xs h-8 rounded-lg border-gray-200 ${(o.orderStatus === "delivered" || o.orderStatus === "cancelled" || o.orderStatus === "return_completed") ? "opacity-50 cursor-not-allowed" : ""}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["pending","confirmed","processing","shipped","delivered","cancelled"].map(s => (
                                <SelectItem key={s} value={s} className="text-xs capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${o.id}-expanded`} className="bg-pink-50/40">
                          <td colSpan={7} className="px-8 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                              {addr && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" /> Shipping Address
                                  </p>
                                  <p className="font-medium text-gray-800">{addr.fullName}</p>
                                  <p className="text-gray-500 text-xs">{addr.street ?? addr.line1}</p>
                                  <p className="text-gray-500 text-xs">{addr.city}{addr.district ? `, ${addr.district}` : ""}</p>
                                  {addr.phone && <p className="text-gray-500 text-xs mt-0.5">📞 {addr.phone}</p>}
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Items Ordered</p>
                                <div className="space-y-1">
                                  {((o as any).items ?? []).slice(0, 4).map((item: any) => (
                                    <p key={item.productId} className="text-xs text-gray-600">
                                      {item.productName} × {item.quantity} - Tk{(item.price * item.quantity).toLocaleString()}
                                    </p>
                                  ))}
                                  {((o as any).items ?? []).length > 4 && (
                                    <p className="text-xs text-gray-400">+{((o as any).items ?? []).length - 4} more items</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                {(o.giftWrap === "true" || (o.giftWrap as any) === true) && (
                                  <div className="mb-3 p-2 bg-pink-50 border border-pink-200 rounded-lg">
                                    <p className="text-xs font-semibold text-pink-600 uppercase tracking-wider mb-1">🎁 Gift Wrapping</p>
                                    {o.giftMessage && <p className="text-sm text-gray-700">{o.giftMessage}</p>}
                                  </div>
                                )}
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Info</p>
                                <p className="text-xs text-gray-600 capitalize">Method: {(o as any).paymentMethod}</p>
                                <p className={`text-xs capitalize ${(o as any).paymentStatus === "paid" ? "text-green-600" : "text-amber-600"}`}>
                                  Status: {(o as any).paymentStatus}
                                </p>
                                {(o as any).senderNumber && (
                                  <p className="text-xs text-gray-500 mt-1">From: <span className="font-mono">{(o as any).senderNumber}</span></p>
                                )}
                                {(o as any).paidAt && (
                                  <p className="text-xs text-gray-500 mt-0.5">Paid: {new Date((o as any).paidAt).toLocaleString()}</p>
                                )}
                                {(o as any).transactionId && (
                                  <p className="text-xs text-gray-500 font-mono mt-1">{(o as any).transactionId}</p>
                                )}
                                {(o as any).couponCode && (
                                  <p className="text-xs text-pink-500 mt-1">Coupon: {(o as any).couponCode} (-Tk{(o as any).discountAmount})</p>
                                )}
                              </div>
                              {o.orderStatus === "cancelled" && (o as any).cancellationReason && (
                                <div className="col-span-full mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">⚠️ Cancelled by Customer</p>
                                  <p className="text-xs text-red-700">Reason: {(o as any).cancellationReason}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-gray-400 py-12">No orders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {ordersHasMore && !orderSearch && ordersTotal - orders.length > 0 && (
            <div className="p-4 border-t text-center">
              <button
                onClick={() => fetchOrders(ordersPage + 1, true)}
                disabled={ordersLoading}
                className="px-6 py-2 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {ordersLoading ? "Loading..." : `Load More (${Math.max(0, ordersTotal - orders.length)} remaining)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ??⭐ Users Tab ?????????????????????????????????????????????????????????????
  const UsersTab = () => {
    const filteredUsers = (users ?? []).filter((u: any) =>
      !debouncedUserSearch ||
      `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase().includes(debouncedUserSearch.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(debouncedUserSearch.toLowerCase())
    );
    return (
      <div>
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
          <p className="text-xs text-gray-400 shrink-0">{filteredUsers.length} customers</p>
        </div>
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Orders</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((u: any) => (
                  <tr key={u.id} className={`hover:bg-pink-50/30 transition-colors ${u.isBlocked ? "opacity-60" : ""}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${u.isBlocked ? "bg-red-100" : "bg-gradient-to-br from-pink-200 to-rose-300"}`}>
                          <span className={`text-xs font-bold ${u.isBlocked ? "text-red-500" : "text-rose-700"}`}>
                            {u.firstName?.[0] ?? ""}{u.lastName?.[0] ?? ""}{!u.firstName && !u.lastName ? "📱" : ""}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : "Unknown User"}
                          </p>
                          {u.isBlocked && <span className="text-xs text-red-500 font-medium">Blocked</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {u.email?.endsWith("@clerk.user") ? "-" : u.email}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.role === "admin" ? "bg-pink-100 text-pink-600" : "bg-gray-100 text-gray-500"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => {
                          const term = (u.email && !u.email.endsWith("@clerk.user"))
                            ? u.email
                            : `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
                          setUserSearch(""); setActiveTab("orders"); setTimeout(() => setOrderSearch(term), 50);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors"
                      >
                        {u.orderCount ?? 0} orders
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 text-right">
                      {u.role !== "admin" && (
                        <button
                          onClick={() => handleToggleBlock(u.id, !u.isBlocked)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.isBlocked
                              ? "text-gray-400 hover:text-green-500 hover:bg-green-50"
                              : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                          }`}
                          title={u.isBlocked ? "Unblock user" : "Block user"}
                        >
                          {u.isBlocked ? <UserCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-12">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ??? Reviews Tab ???????????????????????????????????????????????????????????
  const ReviewsTab = () => (
    <div>
      <div className="mb-4 space-y-3">
        <p className="text-sm text-gray-500">All customer reviews across every product. Delete any inappropriate or fake review.</p>
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product, customer, or review text?"
            className="pl-10"
            value={reviewSearch}
            onChange={e => setReviewSearch(e.target.value)}
          />
        </div>
      </div>
      {reviewsLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <MessageSquare className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="font-semibold text-gray-500 mb-1">{reviewSearch ? "No reviews match your search." : "No reviews yet"}</p>
          {!reviewSearch && <p className="text-sm text-gray-400">Customer reviews will appear here once they start rolling in.</p>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rating</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Review</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredReviews.map((r) => (
                  <tr key={r.id} className="hover:bg-pink-50/30 transition-colors align-top">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {r.productImage ? (
                          <img src={r.productImage} alt="" className="h-10 w-10 rounded-xl object-cover border shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-xl bg-gray-100 border shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-gray-800 text-xs leading-tight">{r.productName}</p>
                          <p className="text-xs text-gray-400">ID #{r.productId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-pink-200 to-rose-300 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-rose-700">{r.userName?.[0] ?? "📱"}</span>
                        </div>
                        <p className="text-xs font-medium text-gray-700">{r.userName}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{r.rating}/5</p>
                    </td>
                    <td className="px-5 py-4 max-w-[260px]">
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{r.comment}</p>
                    </td>
                    <td className="px-5 py-4 text-right text-xs text-gray-400 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleDeleteReview(r.productId, r.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete review"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  );

  // ??? Archived Orders Tab ????????????????????????????????????????????????????
  const ArchivedOrdersTab = () => (
    <div>
      <div className="mb-4">
        <p className="text-sm text-gray-500">Orders marked as <strong>delivered</strong> or <strong>cancelled</strong> more than 2 days ago are automatically moved here.</p>
      </div>
      {archivedError ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 text-sm">{archivedError}</div>
      ) : archivedLoading && archivedOrders.length === 0 ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : archivedOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border p-14 text-center">
          <Archive className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="font-semibold text-gray-500 mb-1">No archived orders yet</p>
          <p className="text-sm text-gray-400">Delivered orders older than 2 days will appear here automatically.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Products</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status / Date</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...archivedOrders, ...archivedPreOrders.map((o: any) => ({ ...o, _type: "preorder", orderStatus: o.status }))].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map((o) => {
                  const sAddr = (o as any).shippingAddress as { fullName?: string } | null;
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-800">#{o.id}</p>
                        {(o as any).trackingId && <p className="text-xs text-gray-400 font-mono">{(o as any).trackingId}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        {(o as any).userName ? (
                          <div>
                            <p className="font-medium text-gray-800 text-xs">{(o as any).userName}</p>
                            {!(o as any).userEmail?.endsWith("@clerk.user") && (o as any).userEmail && (
                              <p className="text-xs text-gray-400">{(o as any).userEmail}</p>
                            )}
                          </div>
                        ) : sAddr?.fullName ? (
                          <p className="text-xs text-gray-600">{sAddr.fullName}</p>
                        ) : (
                          <p className="text-xs text-gray-400">-</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5 max-w-[180px]">
                          {((o as any).items ?? []).slice(0, 2).map((item: any, idx: number) => (
                            <p key={idx} className="text-xs text-gray-600 truncate">{item.productName} ×{item.quantity}</p>
                          ))}
                          {((o as any).items ?? []).length > 2 && (
                            <p className="text-xs text-gray-400">+{((o as any).items ?? []).length - 2} more</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <div>
                          {(o as any).orderStatus === "cancelled" ? (
                            <span className="inline-block bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-lg mb-1">Cancelled</span>
                          ) : (
                            <span className="inline-block bg-green-100 text-green-600 text-xs font-medium px-2 py-0.5 rounded-lg mb-1">Delivered</span>
                          )}
                          <p className="text-gray-400">{new Date(o.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                          {(o as any).orderStatus === "cancelled" && (o as any).cancellationReason && (
                            <p className="text-red-400 text-xs mt-0.5 max-w-[120px] truncate" title={(o as any).cancellationReason}>⚠️ {(o as any).cancellationReason}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded-lg font-medium text-gray-600 capitalize">{(o as any).paymentMethod ?? "-"}</span>
                          <span className={`ml-1.5 text-xs font-medium capitalize ${(o as any).paymentStatus === "paid" ? "text-green-600" : "text-amber-500"}`}>
                            · {(o as any).paymentStatus}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-gray-800">Tk{o.totalAmount.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {archivedHasMore && (
            <div className="p-4 border-t text-center">
              <button
                onClick={() => fetchArchivedOrders(archivedPage + 1, true)}
                disabled={archivedLoading}
                className="px-6 py-2 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {archivedLoading ? "Loading..." : `Load More (${archivedTotal - archivedOrders.length} remaining)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ??? Coupon Modal ??????????????????????????????????????????????????????????
  const CouponModal = ({ coupon, onClose }: { coupon?: any; onClose: () => void }) => {
    const [form, setForm] = useState({
      code: coupon?.code ?? "",
      discountType: coupon?.discountType ?? "percentage",
      discountValue: coupon?.discountValue ?? "",
      minOrderAmount: coupon?.minOrderAmount ?? "",
      expiryDate: coupon?.expiryDate ? coupon.expiryDate.slice(0, 10) : "",
    });

    function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      handleSaveCoupon({
        code: form.code,
        discountType: form.discountType,
        discountValue: parseFloat(String(form.discountValue)),
        minOrderAmount: form.minOrderAmount ? parseFloat(String(form.minOrderAmount)) : null,
        expiryDate: form.expiryDate || null,
      });
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="font-semibold text-lg">{coupon ? "Edit Coupon" : "New Coupon"}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Coupon Code *</Label>
              <Input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                required
                className="mt-1.5 rounded-xl font-mono"
                placeholder="SAVE20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Discount Type *</Label>
                <Select value={form.discountType} onValueChange={v => setForm(f => ({ ...f, discountType: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (Tk)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Value {form.discountType === "percentage" ? "(%)" : "(Tk)"} *
                </Label>
                <Input
                  type="number"
                  value={form.discountValue}
                  onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                  required
                  className="mt-1.5 rounded-xl"
                  placeholder={form.discountType === "percentage" ? "20" : "500"}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Min Order (Tk)</Label>
                <Input
                  type="number"
                  value={form.minOrderAmount}
                  onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                  className="mt-1.5 rounded-xl"
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Expiry Date</Label>
                <Input
                  type="date"
                  value={form.expiryDate}
                  onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={couponSaving} className="flex-1 rounded-xl bg-pink-500 hover:bg-pink-600 text-white">
                {coupon ? "Update Coupon" : "Create Coupon"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ??? Coupons Tab ???????????????????????????????????????????????????????????
  const CouponsTab = () => (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-sm text-gray-500">Create and manage discount coupons for your customers.</p>
        <Button onClick={() => { setEditingCoupon(null); setShowCouponModal(true); }} className="rounded-xl bg-pink-500 hover:bg-pink-600 text-white shrink-0">
          <Plus className="h-4 w-4 mr-1.5" /> New Coupon
        </Button>
      </div>


      {/* Coupon search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search coupons by codeu2026"
          className="pl-10"
          value={couponSearch}
          onChange={e => setCouponSearch(e.target.value)}
        />
      </div>
      {couponsLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : filteredCoupons.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <Tag className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="font-semibold text-gray-500 mb-1">No coupons yet</p>
          <p className="text-sm text-gray-400 mb-4">Create your first discount coupon to boost sales.</p>
          <Button onClick={() => { setEditingCoupon(null); setShowCouponModal(true); }} className="rounded-xl bg-pink-500 hover:bg-pink-600 text-white">
            <Plus className="h-4 w-4 mr-1.5" /> Create Coupon
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Discount</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Min Order</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCoupons.map((c) => {
                  const isExpired = c.expiryDate && new Date(c.expiryDate) < new Date();
                  return (
                    <tr key={c.id} className={`hover:bg-pink-50/30 transition-colors ${!c.isActive ? "opacity-60" : ""}`}>
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-lg text-sm">{c.code}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-pink-600">
                          {c.discountType === "percentage" ? `${c.discountValue}%` : `Tk${c.discountValue}`}
                        </span>
                        <span className="text-xs text-gray-400 ml-1 capitalize">{c.discountType}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">
                        {c.minOrderAmount ? `Tk${c.minOrderAmount}` : "-"}
                      </td>
                      <td className="px-5 py-3.5">
                        {c.expiryDate ? (
                          <span className={`text-xs ${isExpired ? "text-red-500 font-medium" : "text-gray-500"}`}>
                            {isExpired ? "Expired ? " : ""}{new Date(c.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No expiry</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleCoupon(c.id)}
                          title={c.isActive ? "Deactivate" : "Activate"}
                          className="inline-flex items-center gap-1.5 text-xs font-medium"
                        >
                          {c.isActive
                            ? <><ToggleRight className="h-5 w-5 text-emerald-500" /><span className="text-emerald-600">Active</span></>
                            : <><ToggleLeft className="h-5 w-5 text-gray-400" /><span className="text-gray-400">Inactive</span></>
                          }
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => { setEditingCoupon(c); setShowCouponModal(true); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCoupon(c.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  );

  // ??? Monthly History Tab ???????????????????????????????????????????????????
  const MonthlyHistoryTab = () => {
    const monthNames = ["", "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">
              Monthly revenue and order snapshots. Stats reset at the start of each month. Dashboard shows current month only.
            </p>
          </div>
          <Button variant="outline" onClick={handleArchiveNow} className="rounded-xl text-sm shrink-0">
            <Archive className="h-4 w-4 mr-1.5" /> Archive Last Month
          </Button>
        </div>

        {monthlyLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : monthlyRecords.length === 0 ? (
          <div className="bg-white rounded-2xl border p-14 text-center">
            <Calendar className="h-12 w-12 text-gray-200 mx-auto mb-4" />
            <p className="font-semibold text-gray-500 mb-1">No monthly records yet</p>
            <p className="text-sm text-gray-400 mb-4">Records are archived automatically on the 1st of each month, or manually via the button above.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Orders</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenue (Delivered)</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Archived On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {monthlyRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-pink-50/30 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-800">{monthNames[r.month]} {r.year}</p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-semibold text-gray-700">{r.totalOrders}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-semibold text-emerald-600">Tk{Number(r.totalRevenue).toLocaleString()}</span>
                      </td>
                      <td className="px-5 py-4 text-right text-xs text-gray-400">
                        {new Date(r.archivedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ??? Settings Tab ??????????????????????????????????????????????????????????

  // ??? Pre-Orders Tab ??????????????????????????????????????????????????????????
  const [preOrders, setPreOrders] = useState<any[]>([]);
  const [preOrdersLoading, setPreOrdersLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== "preorders") return;
    setPreOrdersLoading(true);
    getToken().then(token =>
      fetch(API + "/api/pre-orders", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setPreOrders(d); })
        .catch(() => {})
        .finally(() => setPreOrdersLoading(false))
    );
  }, [activeTab]);

  function PreOrdersTab() {
    if (preOrdersLoading) return <div className="text-center py-10 text-gray-400">Loading...</div>;
    if (preOrders.length === 0) return <div className="text-center py-10 text-gray-400">No pre-orders yet.</div>;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-serif text-xl font-medium">Pre-Orders ({preOrders.length})</h2>
        </div>
        {preOrders.map((o: any) => (
          <div key={o.id} className="bg-white border rounded-2xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                {o.productImage && <img src={o.productImage} className="w-12 h-12 rounded-xl object-cover shrink-0" />}
                <div>
                  <p className="font-medium text-sm">{o.productName}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{o.trackingId}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  o.status === "shipped" ? "bg-green-100 text-green-700" :
                  o.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                  "bg-amber-100 text-amber-700"
                }`}>{o.status}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div><span className="text-gray-400">Customer:</span> {o.shippingAddress?.fullName}</div>
              <div><span className="text-gray-400">Phone:</span> {o.shippingAddress?.phone}</div>
              <div><span className="text-gray-400">City:</span> {o.shippingAddress?.city}</div>
              <div><span className="text-gray-400">WhatsApp:</span> {o.whatsappPhone ?? "-"}</div>
              <div><span className="text-gray-400">Delivery paid:</span> Tk{o.deliveryCharge}</div>
              <div><span className="text-gray-400">Product price:</span> Tk{o.discountedPrice}</div>
              <div><span className="text-gray-400">Payment:</span> {o.paymentMethod}</div>
              <div><span className={`font-semibold ${o.paymentStatus === "paid" ? "text-green-600" : "text-amber-600"}`}>{o.paymentStatus}</span></div>
            </div>
            <p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    );
  }

  const [shipmentDate, setShipmentDate] = useState(() => localStorage.getItem("nextShipmentDate") ?? "");
  const [shipmentSaved, setShipmentSaved] = useState(false);

  function saveShipmentDate() {
    localStorage.setItem("nextShipmentDate", shipmentDate);
    setShipmentSaved(true);
    setTimeout(() => setShipmentSaved(false), 2000);
  }

  const SettingsTab = () => (
    <div className="max-w-2xl space-y-5">
      {[
        { label: "Store Name", value: "EnvyEnhance", desc: "Shown in the header and emails" },
        { label: "Support Email", value: "hello@envyenhance.com", desc: "Customers will see this address" },
        { label: "Currency", value: "BDT (Tk)", desc: "Bangladeshi Taka" },
        { label: "Payment Methods", value: "bKash, Nagad, Cash on Delivery", desc: "Enabled at checkout" },
      ].map(({ label, value, desc }) => (
        <div key={label} className="bg-white border rounded-2xl p-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-gray-800">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-gray-700">{value}</p>
          </div>
        </div>
      ))}

      {/* Next Shipment Date */}
      <div className="bg-white border rounded-2xl p-5">
        <p className="font-medium text-gray-800 mb-1">Next Shipment Date</p>
        <p className="text-xs text-gray-400 mb-3">Set when the next batch arrives from Japan. This controls the estimated delivery date shown to pre-order customers.</p>
        <div className="flex gap-3">
          <input
            type="date"
            value={shipmentDate}
            onChange={e => setShipmentDate(e.target.value)}
            className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={saveShipmentDate}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "#e05c9a" }}
          >
            {shipmentSaved ? "Saved ?" : "Save"}
          </button>
        </div>
        {shipmentDate && (
          <p className="text-xs text-green-600 mt-2">
            Current: {new Date(shipmentDate).toLocaleDateString("en-BD", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
        Settings editing is managed via environment variables and seed scripts in this demo.
      </div>
    </div>
  );


// ??? Returns Tab ?????????????????????????????????????????????????????????????
function ReturnsTab() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [refundInputs, setRefundInputs] = useState<Record<number, string>>({});

  useEffect(() => {
    getToken().then(token =>
      fetch(API + "/api/admin/returns", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setReturns(d); })
        .catch(() => {})
        .finally(() => setLoading(false))
    );
  }, []);

  async function updateStatus(id: number, status: string, adminNote?: string, refundAmount?: string) {
    setUpdatingId(id);
    try {
      const r = await fetch(`${API}/api/admin/returns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify({ status, adminNote, refundAmount }),
      });
      if (r.ok) {
        const updated = await r.json();
        setReturns(prev => prev.map(ret => ret.id === id ? { ...ret, ...updated } : ret));
      }
    } finally { setUpdatingId(null); }
  }

  const statusColors: Record<string, string> = {
    requested: "bg-amber-100 text-amber-700 border border-amber-200",
    approved:  "bg-blue-100 text-blue-700 border border-blue-200",
    rejected:  "bg-red-100 text-red-700 border border-red-200",
    completed: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  };
  const statusIcons: Record<string, string> = {
    requested: "...", approved: "OK", rejected: "X", completed: "Done",
  };

  if (loading) return (
    <div className="space-y-4">
      {[1,2].map(i => <div key={i} className="h-36 bg-muted animate-pulse rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Return Requests</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">{returns.length} total</span>
      </div>
      {returns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm text-muted-foreground">No return requests yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map(ret => {
            const items: any[] = ret.orderItems ?? [];
            const deliveredAt = ret.orderDeliveredAt ? new Date(ret.orderDeliveredAt) : null;
            const requestedAt = new Date(ret.createdAt);
            return (
              <div key={ret.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">Return #{ret.id}</span>
                    <span className="text-muted-foreground text-xs">·</span>
                    <span className="text-xs text-muted-foreground">Order #{ret.orderId}</span>
                    {ret.customerName && (
                      <>
                        <span className="text-muted-foreground text-xs">·</span>
                        <span className="text-xs text-muted-foreground">{ret.customerName}</span>
                      </>
                    )}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${statusColors[ret.status] ?? "bg-muted"}`}>
                    {statusIcons[ret.status]} {ret.status}
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  {items.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Items in order</p>
                      <div className="space-y-2">
                        {items.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 bg-muted/30 rounded-xl p-2.5">
                            {item.productImage && (
                              <img src={item.productImage} alt={item.productName}
                                className="w-12 h-12 rounded-lg object-cover shrink-0 border" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold">Tk{(item.price * item.quantity).toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">Tk{item.price} each</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {ret.orderTotal != null && (
                      <div className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-3 py-1.5">
                        <span className="text-muted-foreground">Order total</span>
                        <span className="font-semibold">Tk{Number(ret.orderTotal).toLocaleString()}</span>
                      </div>
                    )}
                    {deliveredAt && (
                      <div className="flex items-center gap-1.5 bg-green-50 text-green-700 rounded-lg px-3 py-1.5">
                        <span>✅ Delivered</span>
                        <span className="font-medium">{deliveredAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-3 py-1.5">
                      <span className="text-muted-foreground">Requested</span>
                      <span>{requestedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">Customer reason</p>
                    <p className="text-sm text-foreground">{ret.reason}</p>
                  </div>
                  {ret.adminNote && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                      <p className="text-xs font-medium text-blue-700 mb-1">Admin note</p>
                      <p className="text-sm">{ret.adminNote}</p>
                    </div>
                  )}
                  {ret.refundAmount != null && ret.status === "completed" && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-emerald-700">Refund issued</span>
                      <span className="text-lg font-bold text-emerald-700">Tk{Number(ret.refundAmount).toLocaleString()}</span>
                    </div>
                  )}
                  {ret.status === "requested" && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => updateStatus(ret.id, "approved")} disabled={updatingId === ret.id}
                        className="flex-1 text-sm font-medium bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50">
                        ✅ Approve Return
                      </button>
                      <button onClick={() => { const note = prompt("Rejection reason?"); if (note) updateStatus(ret.id, "rejected", note); }} disabled={updatingId === ret.id}
                        className="flex-1 text-sm font-medium bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50">
                        ❌ Reject
                      </button>
                    </div>
                  )}
                  {ret.status === "approved" && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs text-muted-foreground">Enter refund amount to mark as completed</p>
                      <div className="flex gap-2">
                        <input type="number" placeholder="Refund amount (Tk)" min="0"
                          value={refundInputs[ret.id] ?? ""}
                          onChange={(e) => setRefundInputs(prev => ({ ...prev, [ret.id]: e.target.value }))}
                          className="flex-1 text-sm border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                        <button onClick={() => { const amt = refundInputs[ret.id]; if (amt) updateStatus(ret.id, "completed", undefined, amt); }}
                          disabled={updatingId === ret.id || !refundInputs[ret.id]}
                          className="text-sm font-medium bg-emerald-500 text-white px-4 py-2 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50">
                          Complete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ??? Affiliates Tab ???????????????????????????????????????????????????????????
function AffiliatesTab() {
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", commissionRate: "10" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", commissionRate: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    getToken().then(token => fetch(API+"/api/admin/affiliates", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setAffiliates(d); }).catch(() => {}).finally(() => setLoading(false)));
  }, []);

  async function handleCreate() {
    setSaving(true); setError("");
    try {
      const r = await fetch(API+"/api/admin/affiliates", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Failed"); return; }
      setAffiliates(prev => [data, ...prev]);
      setShowForm(false); setForm({ name: "", email: "", commissionRate: "10" });
    } finally { setSaving(false); }
  }

  async function handleEdit(a: any) {
    setEditingId(a.id);
    setEditForm({ name: a.name, email: a.email, commissionRate: String(a.commissionRate) });
  }

  async function handleSaveEdit(id: number) {
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/admin/affiliates/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify(editForm),
      });
      if (r.ok) {
        const updated = await r.json();
        setAffiliates(prev => prev.map(a => a.id === id ? updated : a));
        setEditingId(null);
      }
    } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    const r = await fetch(`${API}/api/admin/affiliates/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${await getToken()}` } });
    if (r.ok) {
      setAffiliates(prev => prev.filter(a => a.id !== id));
      setDeleteConfirm(null);
    }
  }

  async function toggleAffiliate(id: number) {
    const r = await fetch(`${API}/api/admin/affiliates/${id}/toggle`, { method: "PATCH", headers: { Authorization: `Bearer ${await getToken()}` } });
    if (r.ok) {
      const updated = await r.json();
      setAffiliates(prev => prev.map(a => a.id === id ? updated : a));
    }
  }

  const filtered = useMemo(() =>
    affiliates.filter(a =>
      !searchQ ||
      a.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQ.toLowerCase()) ||
      a.code.toLowerCase().includes(searchQ.toLowerCase())
    ), [affiliates, searchQ]);

  if (loading) return <div className="h-40 bg-muted animate-pulse rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Affiliates & Influencers</h2>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-sm bg-accent text-white px-4 py-2 rounded-full hover:bg-accent/90 transition-colors">
          <Plus className="h-4 w-4" />Add Affiliate
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or code?"
          className="pl-10"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
        />
      </div>

      {showForm && (
        <div className="bg-card border rounded-xl p-5 space-y-3">
          <h3 className="font-medium text-sm">New Affiliate</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input placeholder="Name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
            <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
            <Input placeholder="Affiliate Code (e.g. JOHN2024)" value={form.code ?? ""} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))} />
            <Input placeholder="Commission %" type="number" min="1" max="50" value={form.commissionRate} onChange={e => setForm(f => ({...f, commissionRate: e.target.value}))} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving}
              className="text-sm bg-accent text-white px-4 py-2 rounded-full hover:bg-accent/90 transition-colors">
              {saving ? "Creating?" : "Create Affiliate"}
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {searchQ ? "No affiliates match your search." : "No affiliates yet. Add influencers to track their sales."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground border-b">
              <th className="pb-2 pr-4">Name</th><th className="pb-2 pr-4">Code</th>
              <th className="pb-2 pr-4">Commission</th><th className="pb-2 pr-4">Orders</th>
              <th className="pb-2 pr-4">Revenue</th><th className="pb-2 pr-4">Earned</th>
              <th className="pb-2 pr-4">Status</th><th className="pb-2">Actions</th>
            </tr></thead>
            <tbody className="divide-y">
              {filtered.map(a => (
                <tr key={a.id}>
                  {editingId === a.id ? (
                    <>
                      <td className="py-3 pr-4" colSpan={3}>
                        <div className="flex gap-2 flex-wrap">
                          <Input className="h-8 text-xs w-32" value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))} placeholder="Name" />
                          <Input className="h-8 text-xs w-40" value={editForm.email} onChange={e => setEditForm(f => ({...f, email: e.target.value}))} placeholder="Email" />
                          <Input className="h-8 text-xs w-20" type="number" min="1" max="50" value={editForm.commissionRate} onChange={e => setEditForm(f => ({...f, commissionRate: e.target.value}))} placeholder="Rate %" />
                        </div>
                      </td>
                      <td className="py-3 pr-4">{a.totalOrders}</td>
                      <td className="py-3 pr-4 font-semibold">Tk{Number(a.totalSales).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-green-600 font-semibold">Tk{Number(a.totalCommission ?? 0).toLocaleString()}</td>
                      <td className="py-3 pr-4">-</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <button onClick={() => handleSaveEdit(a.id)} disabled={saving}
                            className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-1">
                            <Save className="h-3 w-3" />{saving ? "..." : "Save"}
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80">
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 pr-4">
                        <p className="font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="font-mono text-xs bg-muted/50 px-2 py-0.5 rounded">{a.code}</span>
                      </td>
                      <td className="py-3 pr-4">{a.commissionRate}%</td>
                      <td className="py-3 pr-4">{a.totalOrders}</td>
                      <td className="py-3 pr-4 font-semibold">Tk{Number(a.totalSales).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-green-600 font-semibold">Tk{Number(a.totalCommission ?? 0).toLocaleString()}</td>
                      <td className="py-3 pr-4">
                        <button onClick={() => toggleAffiliate(a.id)}
                          className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${a.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                          {a.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <button onClick={() => handleEdit(a)} title="Edit"
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {deleteConfirm === a.id ? (
                            <div className="flex gap-1 items-center">
                              <button onClick={() => handleDelete(a.id)}
                                className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">Delete</button>
                              <button onClick={() => setDeleteConfirm(null)}
                                className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(a.id)} title="Delete"
                              className="p-1.5 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    <CashoutsSection />
    </div>
  );
}

// ??? Cashouts Tab (inside Affiliates) ????????????????????????????????????????
function CashoutsSection() {
  const [cashouts, setCashouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getToken().then(token =>
      fetch(API + "/api/admin/cashouts", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => { console.log("[cashouts] status:", r.status); return r.json(); })
        .then(d => { console.log("[cashouts] data:", d); if (Array.isArray(d)) setCashouts(d); })
        .catch(e => console.log("[cashouts] error:", e))
        .finally(() => setLoading(false))
    );
  }, []);

  async function handleAction(id: number, status: "approved" | "rejected", note?: string) {
    const token = await getToken();
    const r = await fetch(`${API}/api/admin/cashouts/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status, note }),
    });
    if (r.ok) {
      const updated = await r.json();
      setCashouts(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
    }
  }

  if (loading) return <div className="h-20 rounded-xl bg-muted animate-pulse" />;

  const pending = cashouts.filter(c => c.status === "pending");
  const processed = cashouts.filter(c => c.status !== "pending");

  return (
    <div className="mt-8">
      <h3 className="font-semibold text-base mb-4">Cashout Requests</h3>
      {cashouts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No cashout requests yet.</p>
      ) : (
        <div className="space-y-3">
          {pending.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-medium">Pending ({pending.length})</p>
              {pending.map(co => (
                <div key={co.id} className="border rounded-xl p-4 bg-yellow-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{co.affiliateName} <span className="text-muted-foreground font-normal">({co.affiliateEmail})</span></p>
                      <p className="text-xs text-muted-foreground">Code: {co.affiliateCode} ? {new Date(co.createdAt).toLocaleDateString()}</p>
                    </div>
                    <p className="font-bold text-lg">Tk{Number(co.amount).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 rounded-full bg-green-600 hover:bg-green-700" onClick={() => handleAction(co.id, "approved")}>Approve</Button>
                    <Button size="sm" variant="outline" className="flex-1 rounded-full text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => {
                      const note = prompt("Rejection reason (optional):");
                      handleAction(co.id, "rejected", note ?? undefined);
                    }}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {processed.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-medium">Processed</p>
              {processed.map(co => (
                <div key={co.id} className="border rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{co.affiliateName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(co.createdAt).toLocaleDateString()} {co.note && `? ${co.note}`}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">Tk{Number(co.amount).toLocaleString()}</p>
                    <div className="flex flex-col items-end gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${co.status === "approved" ? "bg-green-100 text-green-700" : co.status === "paid" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-600"}`}>{co.status}</span>
                {co.status === "approved" && (
                  <button onClick={() => handleAction(co.id, "paid")} className="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white hover:bg-blue-700">Mark Paid</button>
                )}
              </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ??? Blog Tab ????????????????????????????????????????????????????????????????
function BlogTab() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const emptyForm = { slug: "", title: "", excerpt: "", content: "", category: "Skincare Tips", readTime: "5 min read", image: "", featured: false };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    getToken().then(token => fetch(API+"/api/blog-posts", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setPosts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false)));
  }, []);

  function openCreate() {
    setEditingPost(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
  }

  function openEdit(post: any) {
    setEditingPost(post);
    setForm({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: Array.isArray(post.content) ? post.content.map((b: any) => b.text || (b.items || []).join("\n")).join("\n\n") : post.content,
      category: post.category,
      readTime: post.readTime,
      image: post.image,
      featured: post.featured,
    });
    setShowForm(true);
    setError("");
  }

  async function handleSave() {
    setSaving(true); setError("");
    try {
      // Convert plain text content to simple paragraph blocks
      const contentBlocks = form.content.split("\n\n").filter(Boolean).map(t => ({ type: "p", text: t.trim() }));
      const body = { ...form, content: contentBlocks };
      const url = editingPost ? `${API}/api/admin/blog-posts/${editingPost.id}` : API+"/api/admin/blog-posts";
      const method = editingPost ? "PATCH" : "POST";
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Failed to save post"); return; }
      if (editingPost) {
        setPosts(prev => prev.map(p => p.id === editingPost.id ? data : p));
      } else {
        setPosts(prev => [data, ...prev]);
      }
      setShowForm(false);
      setEditingPost(null);
    } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    const r = await fetch(`${API}/api/admin/blog-posts/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${await getToken()}` } });
    if (r.ok) { setPosts(prev => prev.filter(p => p.id !== id)); setDeleteConfirm(null); }
  }

  function autoSlug(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  const filtered = useMemo(() =>
    posts.filter(p =>
      !searchQ ||
      p.title.toLowerCase().includes(searchQ.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQ.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(searchQ.toLowerCase())
    ), [posts, searchQ]);

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Blog Posts</h2>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 text-sm bg-accent text-white px-4 py-2 rounded-full hover:bg-accent/90 transition-colors">
          <Plus className="h-4 w-4" />New Post
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search posts by title, category, or excerpt?"
          className="pl-10"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
        />
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <h3 className="font-medium">{editingPost ? "Edit Post" : "New Blog Post"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Title *</Label>
              <Input placeholder="Post title" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: f.slug || autoSlug(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Slug (URL) *</Label>
              <Input placeholder="post-url-slug" value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Input placeholder="e.g. Skincare Tips" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Read Time</Label>
              <Input placeholder="e.g. 5 min read" value={form.readTime}
                onChange={e => setForm(f => ({ ...f, readTime: e.target.value }))} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Cover Image URL</Label>
              <Input placeholder="https://?" value={form.image}
                onChange={e => setForm(f => ({ ...f, image: e.target.value }))} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Excerpt *</Label>
              <Textarea placeholder="Short description shown in listing?" value={form.excerpt} rows={2}
                onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Content (separate paragraphs with a blank line)</Label>
              <Textarea placeholder="Write your article content here. Use double line breaks to separate paragraphs." value={form.content} rows={8}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="featured" checked={form.featured}
                onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
              <Label htmlFor="featured" className="text-xs cursor-pointer">Featured post</Label>
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 text-sm bg-accent text-white px-4 py-2 rounded-full hover:bg-accent/90 transition-colors">
              <Save className="h-4 w-4" />{saving ? "Saving?" : editingPost ? "Save Changes" : "Publish Post"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingPost(null); }}
              className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {searchQ ? "No posts match your search." : "No blog posts yet. Create your first post!"}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map(post => (
            <div key={post.id} className="flex items-start gap-4 bg-card border rounded-xl p-4">
              {post.image && (
                <img src={post.image} alt={post.title}
                  className="w-16 h-16 object-cover rounded-lg shrink-0" loading="lazy" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">{post.category}</span>
                  {post.featured && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Featured</span>}
                  <span className="text-xs text-muted-foreground">{post.readTime}</span>
                </div>
                <h3 className="font-medium text-sm line-clamp-1">{post.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{post.excerpt}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">/blog/{post.slug}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(post)} title="Edit"
                  className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {deleteConfirm === post.id ? (
                  <div className="flex gap-1 items-center">
                    <button onClick={() => handleDelete(post.id)}
                      className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">Delete</button>
                    <button onClick={() => setDeleteConfirm(null)}
                      className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80">No</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(post.id)} title="Delete"
                    className="p-1.5 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ??? Audit Logs Tab ???????????????????????????????????????????????????????????
function AuditLogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getToken().then(token => fetch(API+"/api/admin/audit-logs?limit=50", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setLogs(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false)));
  }, []);

  if (loading) return <div className="h-40 bg-muted animate-pulse rounded-xl" />;

  const actionColors: Record<string, string> = {
    "order.status_changed": "bg-blue-100 text-blue-700",
    "product.deleted": "bg-red-100 text-red-700",
    "product.created": "bg-green-100 text-green-700",
    "user.blocked": "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Admin Audit Logs</h2>
        <span className="text-xs text-muted-foreground">Last 50 actions</span>
      </div>
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No audit logs yet. Admin actions will appear here.</p>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="bg-card border rounded-xl p-4 flex items-start gap-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5 ${actionColors[log.action] ?? "bg-muted text-muted-foreground"}`}>
                {log.action}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  by <span className="font-medium text-foreground">{log.adminEmail ?? log.adminId?.slice(0, 8)}</span>
                  {log.targetType && <> → {log.targetType} #{log.targetId}</>}
                </p>
                {(log.after || log.before) && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {log.before && <span className="line-through mr-1">{JSON.stringify(log.before).replace(/[{}"]/g, '')}</span>}
                  {log.after && <span className="text-foreground">{JSON.stringify(log.after).replace(/[{}"]/g, '')}</span>}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(log.createdAt).toLocaleString("en-BD")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ??? Q&A Tab ??????????????????????????????????????????????????????????????????
function QATab() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [answeringId, setAnsweringId] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [saving, setSaving] = useState(false);

  const { getToken: getQAToken } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const token = await getQAToken();
        const r = await fetch(`${API}/api/admin/qa/unanswered`, { headers: { Authorization: "Bearer " + token } });
        setQuestions(await r.json());
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  async function submitAnswer(id: number) {
    if (!answerText.trim() || answerText.trim().length < 2) return;
    setSaving(true);
    try {
      const token = await getQAToken();
      const r = await fetch(`${API}/api/admin/qa/${id}/answer`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ answer: answerText.trim() }),
      });
      if (r.ok) {
        setQuestions(prev => prev.filter(q => q.id !== id));
        setAnsweringId(null); setAnswerText("");
      }
    } finally { setSaving(false); }
  }

  async function deleteQuestion(id: number) {
    if (!window.confirm("Delete this question?")) return;
    const token = await getQAToken();
    await fetch(`${API}/api/admin/qa/${id}`, { method: "DELETE", headers: { Authorization: "Bearer " + token } });
    setQuestions(prev => prev.filter(q => q.id !== id));
  }

  if (loading) return <div className="h-40 bg-muted animate-pulse rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Unanswered Questions</h2>
        <Badge variant="secondary">{questions.length} pending</Badge>
      </div>
      {questions.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p className="text-2xl mb-2">❓</p>
          <p className="font-medium">All questions answered!</p>
          <p className="text-sm">No pending product questions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map(q => (
            <div key={q.id} className="bg-card border rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{q.userName} ? Product #{q.productId} ? {new Date(q.createdAt).toLocaleDateString()}</p>
                  <p className="font-medium text-sm">{q.question}</p>
                </div>
                <button onClick={() => deleteQuestion(q.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {answeringId === q.id ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Write your answer?"
                    value={answerText}
                    onChange={e => setAnswerText(e.target.value)}
                    rows={3} maxLength={1000}
                    className="text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => submitAnswer(q.id)} disabled={saving || answerText.trim().length < 2}
                      className="text-xs bg-accent text-white px-4 py-1.5 rounded-full hover:bg-accent/90 transition-colors disabled:opacity-50">
                      {saving ? "Posting?" : "Post Answer"}
                    </button>
                    <button onClick={() => { setAnsweringId(null); setAnswerText(""); }}
                      className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAnsweringId(q.id); setAnswerText(""); }}
                  className="text-xs bg-accent/10 text-accent px-4 py-1.5 rounded-full hover:bg-accent/20 transition-colors font-medium">
                  Answer Question
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ??? Bulk Import Tab ??????????????????????????????????????????????????????????
function BulkImportTab() {
  const [csvText, setCsvText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const TEMPLATE = `name,price,discountPrice,category,stock,description,images,keyBenefits,mainIngredients,bestFor,texture,ingredients
"Skin Aqua Super Moisture Gel SPF50+",1450,,Sunscreens,50,"A Japanese water gel sunscreen with SPF50+ PA++++. Triple Hyaluronic Acid complex for intense moisture while protecting from UV rays.","https://example.com/img1.jpg|https://example.com/img2.jpg","Maximum SPF50+ PA++++ protection|Triple Hyaluronic Acid for deep hydration|Lightweight no white cast|Sweat and water resistant","? Sodium Hyaluronate (Hyaluronic Acid)|? Hydrolyzed Collagen|? Arginine|?? Ethylhexyl Methoxycinnamate","Dry skin|Oily skin|All skin types","Ultra-light watery gel that melts into skin instantly"`;

  const FORMAT_NOTES = [
    { field: "name", note: "Product name (required)" },
    { field: "price", note: "Price in BDT, numbers only (required)" },
    { field: "discountPrice", note: "Sale price - leave empty if no discount" },
    { field: "category", note: "Category name (required)" },
    { field: "stock", note: "Stock quantity" },
    { field: "description", note: "Full product description" },
    { field: "images", note: "Image URLs separated by |" },
    { field: "keyBenefits", note: "Benefits separated by | (e.g. Deep hydration|Brightening)" },
    { field: "mainIngredients", note: "Ingredients with emoji separated by | (e.g. ? Hyaluronic Acid|? Niacinamide)" },
    { field: "bestFor", note: "Skin types separated by | (e.g. Dry skin|Oily skin)" },
    { field: "texture", note: "Texture description (single line)" },
    { field: "ingredients", note: "Full INCI ingredients list (single line)" },
  ];

  async function handleImport() {
    if (!csvText.trim()) { setError("Please paste CSV content first."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await fetch(API+"/api/admin/products/bulk-import", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify({ csv: csvText }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Import failed"); return; }
      setResult(data);
    } finally { setLoading(false); }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvText((ev.target?.result as string) ?? "");
    reader.readAsText(file);
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Bulk Product Import</h2>
        <p className="text-sm text-muted-foreground mt-1">Upload a CSV file or paste CSV content to import multiple products at once.</p>
      </div>

      {/* Template download */}
      <div className="bg-muted/40 border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Required CSV Format</p>
        <pre className="text-xs text-foreground/80 font-mono overflow-x-auto whitespace-pre-wrap">{TEMPLATE}</pre>
        <button
          onClick={() => { const blob = new Blob([TEMPLATE], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "product_import_template.csv"; a.click(); }}
          className="mt-3 text-xs text-accent hover:underline"
        >
          Download Template CSV
        </button>
      </div>

      {/* File upload */}
      <div>
        <Label className="text-sm">Upload CSV File</Label>
        <input type="file" accept=".csv" onChange={handleFile} className="mt-1 block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:bg-accent file:text-white hover:file:bg-accent/90 file:cursor-pointer" />
      </div>

      {/* Or paste */}
      <div>
        <Label className="text-sm">Or Paste CSV Content</Label>
        <Textarea
          className="mt-1 font-mono text-xs resize-none"
          rows={8}
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          placeholder="Paste your CSV content here?"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className={`rounded-xl p-4 ${result.errors > 0 ? "bg-yellow-50 border-yellow-200 border" : "bg-green-50 border-green-200 border"}`}>
          <p className="font-medium text-sm">{result.message}</p>
          {result.errorDetails?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.errorDetails.map((e: string, i: number) => (
                <li key={i} className="text-xs text-red-600">• {e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Button onClick={handleImport} disabled={loading || !csvText.trim()} className="rounded-full gap-2">
        <Upload className="h-4 w-4" />
        {loading ? "Importing?" : "Import Products"}
      </Button>
    </div>
  );
}


  const tabContent: Record<string, React.ReactNode> = {
    dashboard:  <DashboardTab />,
    products:   <ProductsTab />,
    categories: <CategoriesTab />,
    orders:     <OrdersTab />,
    archived:   <ArchivedOrdersTab />,
    users:      <UsersTab />,
    reviews:    <ReviewsTab />,
    coupons:    <CouponsTab />,
    monthly:    <MonthlyHistoryTab />,

    settings:   <SettingsTab />,
    returns:    <ReturnsTab />,
    affiliates: <AffiliatesTab />,
    blog:       <BlogTab />,
    auditlogs:  <AuditLogsTab />,
    qa:         <QATab />,
    bulkimport: <BulkImportTab />,
  };

  const activeNav = navItems.find(n => n.id === activeTab);

  return (
    <div className="flex h-screen bg-[#fafafa] overflow-hidden font-sans">
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <Sidebar mobile />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="h-5 w-5 text-gray-500" />
            </button>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm sm:text-base">{activeNav?.label ?? "Dashboard"}</h1>
              <p className="text-xs text-gray-400 hidden sm:block">EnvyEnhance Admin</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-300 to-rose-400 flex items-center justify-center">
              <span className="text-white text-xs font-bold">{(me as any)?.firstName?.[0] ?? "A"}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-7xl mx-auto">
            {tabContent[activeTab]}
          </div>
        </main>
      </div>

      {(showProductModal || editingProduct) && (
        <ProductModal
          product={editingProduct}
          categories={categories as any[]}
          onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
        />
      )}

      {(showCategoryModal || editingCategory) && (
        <CategoryModal
          category={editingCategory}
          onClose={() => { setShowCategoryModal(false); setEditingCategory(null); }}
        />
      )}

      {(showCouponModal) && (
        <CouponModal
          coupon={editingCoupon}
          onClose={() => { setShowCouponModal(false); setEditingCoupon(null); }}
        />
      )}

      {/* Cancellation Reason Modal */}
      <ConfirmDialog open={cdg.open} title={cdg.title} message={cdg.message} onConfirm={()=>{cdg.onConfirm();closeCdg();}} onCancel={closeCdg} danger={cdg.danger} />
      <Dialog open={!!cancelModal} onOpenChange={(open) => { if (!open) setCancelModal(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Cancel Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Provide a reason for cancellation (optional). This will be visible to the customer.</p>
            <Textarea
              placeholder="e.g. Item out of stock, customer requested cancellation?"
              className="rounded-xl resize-none text-sm"
              rows={3}
              value={cancelModal?.reason ?? ""}
              onChange={e => setCancelModal(m => m ? { ...m, reason: e.target.value } : m)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setCancelModal(null)}>
              Keep Order
            </Button>
            <Button
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
              disabled={updateOrderStatus.isPending}
              onClick={confirmCancellation}
            >
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
