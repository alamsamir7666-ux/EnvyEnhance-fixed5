import { createContext, useContext } from "react";

export interface AdminContextValue {
  // Search
  search: string;
  setSearch: (v: string) => void;
  orderSearch: string;
  setOrderSearch: (v: string) => void;
  userSearch: string;
  setUserSearch: (v: string) => void;
  reviewSearch: string;
  setReviewSearch: (v: string) => void;
  couponSearch: string;
  setCouponSearch: (v: string) => void;

  // Products
  allProducts: any[];
  filteredProducts: any[];
  productsLoading: boolean;
  productsPage: number;
  setProductsPage: (v: any) => void;
  productsHasMore: boolean;
  editingProduct: any;
  setEditingProduct: (v: any) => void;
  showProductModal: boolean;
  setShowProductModal: (v: boolean) => void;
  handleDeleteProduct: (id: number) => void;
  categories: any[];

  // Orders
  orders: any[];
  adminPreOrders: any[];
  ordersLoading: boolean;
  ordersPage: number;
  ordersHasMore: boolean;
  ordersTotal: number;
  filteredOrders: any[];
  expandedOrderId: number | null;
  setExpandedOrderId: (v: number | null) => void;
  handleOrderStatusChange: (orderId: number, status: string) => void;
  cancelModal: { orderId: number; reason: string } | null;
  setCancelModal: (v: any) => void;

  // Categories
  editingCategory: any;
  setEditingCategory: (v: any) => void;
  showCategoryModal: boolean;
  setShowCategoryModal: (v: boolean) => void;
  seedingCategories: boolean;
  setSeedingCategories: (v: boolean) => void;

  // Users
  users: any[];
  usersLoading: boolean;

  // Reviews
  reviews: any[];
  reviewsLoading: boolean;

  // Archived
  archivedOrders: any[];
  archivedPreOrders: any[];
  archivedPage: number;
  archivedHasMore: boolean;
  archivedTotal: number;
  archivedLoading: boolean;
  archivedError: string | null;
  fetchArchivedOrders: (page: number, append?: boolean) => void;

  // Coupons
  coupons: any[];
  couponsLoading: boolean;
  editingCoupon: any;
  setEditingCoupon: (v: any) => void;
  showCouponModal: boolean;
  setShowCouponModal: (v: boolean) => void;
  couponSaving: boolean;
  setCouponSaving: (v: boolean) => void;
  setCoupons: (v: any) => void;

  // Monthly
  monthlyRecords: any[];
  monthlyLoading: boolean;

  // Dashboard
  dashStats: { totalSales: number; totalOrders: number; pendingOrders: number; deliveredOrders: number };
  dashStatsLoading: boolean;
  activeOrdersCount: number;

  // Shared
  askConfirm: (title: string, message: string, onConfirm: () => void, danger?: boolean) => void;
  getToken: () => Promise<string | null>;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdminContext(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdminContext must be used within AdminPage");
  return ctx;
}
