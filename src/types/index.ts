export interface Product {
  id: string;
  name: string; // ناوی کاڵا
  barcode: string; // بارکۆد یان کۆد
  category: string; // پۆلێن
  costPricePerUnit: number; // نرخی کڕینی یەک دانە بە دینار
  cartons: number; // بڕ بە کارتۆن
  unitsPerCarton: number; // یەکە لە هەر کارتۆنێکدا
  totalUnits: number; // کۆی گشتی دانەکان (cartons * unitsPerCarton)
  sellingPricePerUnit: number; // نرخی پێشنیارکراوی فرۆشتن بۆ هەر دانەیەک
  minStockThreshold: number; // کەمترین بڕی ئاگادارکردنەوە
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  unitType: 'carton' | 'unit'; // کارتۆن یان دانە
  quantity: number; // بڕی فرۆشراو لەو یەکەیەدا
  quantityInUnits: number; // کۆی دانە بۆ کەمکردنەوەی کۆگا و حیساباتی تێچوو
  unitPrice: number; // نرخی فرۆشتنی یەکە بە دینار
  costPricePerUnit: number; // نرخی کڕینی یەک دانە بۆ حیساباتی تێچوو
  total: number; // کۆی گشتی نرخی فرۆش
  totalCost: number; // کۆی تێچوو (COGS)
}

export interface Sale {
  id: string;
  invoiceNumber: string; // ژمارەی وەسڵ
  customerName: string; // ناوی کڕیار
  customerPhone?: string; // ژمارەی مۆبایل
  items: SaleItem[];
  totalAmount: number; // کۆی فرۆشی گشتی
  totalCost: number; // تێچووی فرۆشراو (COGS)
  grossProfit: number; // کۆی قازانجی گشتی
  paidAmount: number; // بڕی پارەی دراو لە کاتی کڕین
  remainingAmount: number; // بڕی پارەی ماوە
  notes?: string; // تێبینی
  date: string; // بەروار و کات
}

export interface PaymentVoucher {
  id: string;
  voucherNumber: string; // ژمارەی پسوولەی وەرگرتن
  customerName: string; // ناوی کڕیار
  amount: number; // بڕی پارەی وەرگیراو بە دینار
  notes: string; // تێبینی
  date: string; // بەروار و کات
}

export interface CustomerDebtSummary {
  name: string;
  phone?: string;
  totalPurchases: number; // کۆی کڕینەکان
  totalPaid: number; // کۆی پارەی دراو
  outstandingDebt: number; // بڕی ماوە / قەرز
  lastTransactionDate: string;
  invoicesCount: number;
}

export interface DashboardMetrics {
  totalGrossSales: number; // کۆی فرۆشی گشتی
  totalCOGS: number; // تێچووی فرۆشراو
  totalGrossProfit: number; // کۆی قازانجی گشتی
  totalCashReceived: number; // کۆی پارەی وەرگیراو
  totalOutstandingDebt: number; // بڕی پارەی ماوە
  totalInventoryCostValue: number; // کۆی بەهای تێچووی کاڵاکانی کۆگا
  totalInventorySellingValue: number; // کۆی بەهای فرۆشتنی کاڵاکانی کۆگا
  lowStockItemsCount: number; // ژمارەی کاڵا کەمبووەکان
}

export interface AdminUser {
  username: string;
  displayName: string;
  role: string;
  isLoggedIn: boolean;
}
