import { useState, useMemo, useRef, Fragment, useEffect, useCallback } from "react";
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
import { useQueryClient, useQuery } from "@tanstack/react-query";
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
import { apiClient } from "@/lib/apiClient";
import { ProductModal } from "@/components/admin/modals/ProductModal";
import { CategoryModal } from "@/components/admin/modals/CategoryModal";
import { ConfirmDialog } from "@/components/admin/modals/ConfirmDialog";
import { SettingsTab } from "@/components/admin/tabs/SettingsTab";
import { ReturnsTab } from "@/components/admin/tabs/ReturnsTab";
import { AffiliatesTab } from "@/components/admin/tabs/AffiliatesTab";
import { BlogTab } from "@/components/admin/tabs/BlogTab";
import { AuditLogsTab } from "@/components/admin/tabs/AuditLogsTab";


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

// ??? Category form ????????????????????????????????????????????????????????????
export function AdminPage() {
  console.log("[AdminPage] component function called - fresh mount or re-render");
  const [cdg, setCdg] = useState<{open:boolean;title:string;message:string;onConfirm:()=>void;danger:boolean}>({open:false,title:"",message:"",onConfirm:()=>{},danger:true});
  const askConfirm = (title:string,message:string,cb:()=>void,danger=true) => setCdg({open:true,title,message,onConfirm:cb,danger});
  const closeCdg = () => setCdg(d=>({...d,open:false}));
  const qc = useQueryClient();
  const adminMountRef = useRef(false);
  useEffect(() => {
    console.log("[AdminPage] MOUNT EFFECT - was already mounted before:", adminMountRef.current);
    adminMountRef.current = true;
  }, []);
  const { getToken } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [productsPage, setProductsPage] = useState(1);
  const { data: productsData, isLoading: productsLoading } = useListProducts({ limit: 25, page: productsPage, search: debouncedSearch || undefined } as any);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const productsHasMore = productsData ? allProducts.length < (productsData.total ?? 0) : false;
  useEffect(() => { setProductsPage(1); setAllProducts([]); }, [debouncedSearch]);
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
  const [dashStatsLoading, setDashStatsLoading] = useState(true);

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
    setDashStatsLoading(true);
    getToken().then(token =>
      fetch(`${API}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          if (!r.ok) throw new Error(`Dashboard fetch failed: ${r.status}`);
          return r.json();
        })
        .then(data => {
          setDashStats({ totalSales: data.totalSales ?? 0, totalOrders: data.totalOrders ?? 0, pendingOrders: data.pendingOrders ?? 0, deliveredOrders: data.totalOrders != null && data.pendingOrders != null ? (data.totalOrders - data.pendingOrders) : 0 });
        })
        .catch((e) => console.error("Dashboard stats error:", e?.message))
        .finally(() => setDashStatsLoading(false))
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
  useEffect(() => {
    console.log("[activeTab] changed to:", activeTab);
  }, [activeTab]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
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

  const { data: tagCounts = {} } = useQuery({
    queryKey: ["products", "tag-counts"],
    queryFn: async () => {
      const { data } = await apiClient.get<Record<string, number>>("/api/products/tag-counts");
      return data;
    },
    staleTime: 30_000,
  });

  const filteredProducts = useMemo(() => {
    if (!debouncedSearch.trim()) return products;
    const q = debouncedSearch.toLowerCase();
    return products.filter(p =>
      (p.name ?? "").toLowerCase().includes(q) ||
      (p.category ?? "").toLowerCase().includes(q)
    );
  }, [products, debouncedSearch]);

  const recentCombined = [...orders, ...adminPreOrders.map((o: any) => ({
    id: o.id, createdAt: o.createdAt, totalAmount: o.totalAmount ?? (Number(o.discountedPrice ?? 0) + Number(o.deliveryCharge ?? 0)),
    orderStatus: o.status ?? "pre-order", _type: "preorder"
  } as any))].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

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
    const dashLoading = dashStatsLoading;
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
            value: (productsData?.total ?? products.length) > 0 ? (productsData?.total ?? products.length) : "-",
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
              {recentCombined.map((o) => {
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
                        <td className="px-4 py-3.5">
                          <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs font-medium border ${
                            o.status === "delivered" ? "bg-green-50 text-green-700 border-green-200" :
                            o.status === "cancelled" ? "bg-red-50 text-red-700 border-red-200" :
                            o.status === "shipped" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            o.status === "arrived_in_bd" ? "bg-purple-50 text-purple-700 border-purple-200" :
                            o.status === "confirmed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            "bg-yellow-50 text-yellow-700 border-yellow-200"
                          }`}>{o.status === "arrived_in_bd" ? "Arrived in BD" : o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span>
                        </td>
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
                        <td className="px-4 py-3.5 text-right font-semibold text-gray-800">Tk{Number((o as any).totalAmount ?? (o as any).discountedPrice ?? 0).toLocaleString()}</td>
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
                          {(o as any)._type === "preorder" ? (
                            <p className="text-xs text-gray-600 truncate">{(o as any).productName} ×{(o as any).quantity ?? 1}</p>
                          ) : (
                            <>
                              {((o as any).items ?? []).slice(0, 2).map((item: any, idx: number) => (
                                <p key={idx} className="text-xs text-gray-600 truncate">{item.productName} ×{item.quantity}</p>
                              ))}
                              {((o as any).items ?? []).length > 2 && (
                                <p className="text-xs text-gray-400">+{((o as any).items ?? []).length - 2} more</p>
                              )}
                            </>
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
                      <td className="px-4 py-3.5 text-right font-semibold text-gray-800">Tk{Number((o as any).totalAmount ?? (o as any).discountedPrice ?? 0).toLocaleString()}</td>
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




// ??? Returns Tab ?????????????????????????????????????????????????????????????


// ??? Affiliates Tab ???????????????????????????????????????????????????????????


// ??? Blog Tab ????????????????????????????????????????????????????????????????


// ??? Audit Logs Tab ???????????????????????????????????????????????????????????


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


  function renderActiveTab() {
    switch (activeTab) {
      case "dashboard":  return <DashboardTab />;
      case "products":   return <ProductsTab />;
      case "categories": return <CategoriesTab />;
      case "orders":     return <OrdersTab />;
      case "archived":   return <ArchivedOrdersTab />;
      case "users":      return <UsersTab />;
      case "reviews":    return <ReviewsTab />;
      case "coupons":    return <CouponsTab />;
      case "monthly":    return <MonthlyHistoryTab />;
      case "settings":   return <SettingsTab />;
      case "returns":    return <ReturnsTab />;
      case "affiliates": return <AffiliatesTab />;
      case "blog":       return <BlogTab />;
      case "auditlogs":  return <AuditLogsTab />;
      case "qa":         return <QATab />;
      case "bulkimport": return <BulkImportTab />;
      default:           return <DashboardTab />;
    }
  }

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
            {renderActiveTab()}
          </div>
        </main>
      </div>

      {(showProductModal || editingProduct) && (
        <ProductModal
          product={editingProduct}
          categories={categories as any[]}
          tagCounts={tagCounts}
          onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
          onProductUpdated={(p) => setAllProducts(prev => prev.map((x: any) => x.id === p.id ? { ...x, ...p } : x))}
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
