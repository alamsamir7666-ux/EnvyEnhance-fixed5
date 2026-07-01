import { useAdminContext } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import { Layers, Plus, Pencil, Trash2 } from "lucide-react";

export function CategoriesTab() {
const {
    categories,
    editingCategory,
    setEditingCategory,
    showCategoryModal,
    setShowCategoryModal,
    seedingCategories,
    setSeedingCategories,
    getToken,
    products,
    handleDeleteCategory,
    handleSeedCategories,
  } = useAdminContext();

return (
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
              {(() => {
                const allCats = categories as any[];
                const parents = allCats.filter(c => !c.parentId);
                const rows: any[] = [];
                parents.forEach(parent => {
                  // Parent row
                  const parentProductCount = products.filter(p => {
                    const sub = allCats.find((s: any) => s.slug === p.category);
                    return sub && sub.parentId === parent.id;
                  }).length;
                  rows.push(
                    <tr key={parent.id} className="bg-pink-50/50">
                      <td className="px-5 py-3" colSpan={2}>
                        <p className="font-bold text-gray-800">{parent.icon} {parent.name}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{parent.slug}</span>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-500">{parent.displayOrder}</td>
                      <td className="px-5 py-3 text-right">
                        <span className="font-semibold text-gray-700">{parentProductCount}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => { setEditingCategory(parent); setShowCategoryModal(true); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDeleteCategory(parent.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  // Subcategory rows
                  const subs = allCats.filter((c: any) => c.parentId === parent.id);
                  subs.forEach(sub => {
                    const productCount = products.filter(p => p.category === sub.slug).length;
                    rows.push(
                      <tr key={sub.id} className="hover:bg-pink-50/30 transition-colors">
                        <td className="px-5 py-3 pl-10" colSpan={2}>
                          <p className="text-sm text-gray-600">↳ {sub.name}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{sub.slug}</span>
                        </td>
                        <td className="px-5 py-3 text-right text-gray-400 text-sm">{sub.displayOrder}</td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-sm font-semibold text-gray-700">{productCount}</span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setEditingCategory(sub); setShowCategoryModal(true); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDeleteCategory(sub.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                });
                return rows;
              })()}
            </tbody>
          </table>
        </div>

      </div>
    )}
  </div>
);
}
