import { useAdminContext } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";

export function ProductsTab() {
  const {
    search, setSearch,
    filteredProducts,
    productsLoading, productsPage, productsHasMore,
    setProductsPage,
    setShowProductModal, setEditingProduct,
    handleDeleteProduct,
  } = useAdminContext();

  return (
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
                          {false && (
                            <span className="text-xs bg-pink-50 text-pink-500 border border-pink-200 px-1.5 py-0.5 rounded-md font-medium">Featured</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="capitalize text-gray-500 text-xs bg-gray-100 px-2.5 py-1 rounded-full font-medium">{p.category}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {(p as any).homepageTag ? (() => {
                        const TAG_LABELS: Record<string, { label: string; cls: string }> = {
                          trending:       { label: "🔥 Trending",      cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
                          new_arrivals:   { label: "✨ New Arrivals",  cls: "bg-blue-50 text-blue-600 border-blue-200" },
                          best_skin_care: { label: "🌿 Best Skin Care", cls: "bg-teal-50 text-teal-600 border-teal-200" },
                          best_hair_care: { label: "💇 Best Hair Care", cls: "bg-purple-50 text-purple-600 border-purple-200" },
                          best_make_up:   { label: "💄 Best Make Up",   cls: "bg-pink-50 text-pink-600 border-pink-200" },
                          best_body_care: { label: "🧴 Best Body Care", cls: "bg-orange-50 text-orange-600 border-orange-200" },
                        };
                        const cfg = TAG_LABELS[(p as any).homepageTag];
                        return <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${cfg?.cls ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>{cfg?.label ?? (p as any).homepageTag}</span>;
                      })() : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <p className="font-semibold text-gray-800">Tk{p.price.toLocaleString()}</p>
                      {p.discountPrice && <p className="text-xs text-pink-500">Sale: Tk{p.discountPrice.toLocaleString()}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {p.productStatus === "pre_order" ? (
                        <span className="font-semibold text-blue-600">Pre-Order</span>
                      ) : (
                        <>
                          <span className={`font-semibold ${p.stock < 10 ? "text-red-500" : "text-gray-700"}`}>{p.stock}</span>
                          {p.stock < 10 && <p className="text-xs text-red-400">Low stock</p>}
                        </>
                      )}
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
                  <Button onClick={() => setProductsPage((p: number) => p + 1)} disabled={productsLoading} className="rounded-xl bg-pink-500 hover:bg-pink-600 text-white">
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
  }
