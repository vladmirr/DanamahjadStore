export type Currency = 'IQD' | 'USD';

export interface Product {
  id: string;
  name: string; // ناوی کاڵا
  barcode: string; // بارکۆد یان کۆد
  category: string; // پۆلێن
  costPricePerUnit: number; // نرخی کڕینی یەک دانە
  cartons: number; // بڕ بە کارتۆن
  unitsPerCarton: number; // یەکە لە هەر کارتۆنێکدا
  totalUnits: number; // کۆی گشتی دانەکان (cartons * unitsPerCarton)
  sellingPricePerUnit: number; // نرخی پێشنیارکراوی فرۆشتن بۆ هەر دانەیەک
  minStockThreshold: number; // کەمترین بڕی ئاگادارکردنەوە
  currency?: Currency; // 'IQD' | 'USD' (default 'IQD')
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  unitType: 'carton' | 'unit'; // کارتۆن یان دانە
  quantity: number; // بڕی فرۆشراو لەو یەکەیەدا
  quantityInUnits: number; // کۆی دانە بۆ کەمکردنەوەی کۆگا و حیساباتی تێچوو
  unitPrice: number; // نرخی فرۆشتنی یەکە
  costPricePerUnit: number; // نرخی کڕینی یەک دانە بۆ حیساباتی تێچوو
  total: number; // کۆی گشتی نرخی فرۆش
  totalCost: number; // کۆی تێچوو (COGS)
  currency?: Currency;
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
  currency?: Currency; // 'IQD' | 'USD' (default 'IQD')
  notes?: string; // تێبینی
  date: string; // بەروار و کات
}

export interface PaymentVoucher {
  id: string;
  voucherNumber: string; // ژمارەی پسوولەی وەرگرتن
  customerName: string; // ناوی کڕیار
  amount: number; // بڕی پارەی وەرگیراو
  currency?: Currency; // 'IQD' | 'USD' (default 'IQD')
  notes: string; // تێبینی
  date: string; // بەروار و کات
}

export interface CustomerDebtSummary {
  name: string;
  phone?: string;
  totalPurchases: number; // کۆی کڕینەکان بە دینار
  totalPaid: number; // کۆی پارەی دراو بە دینار
  outstandingDebt: number; // بڕی ماوە / قەرز بە دینار
  totalPurchasesUSD?: number; // کۆی کڕینەکان بە دۆلار
  totalPaidUSD?: number; // کۆی پارەی دراو بە دۆلار
  outstandingDebtUSD?: number; // بڕی ماوە / قەرز بە دۆلار
  lastTransactionDate: string;
  invoicesCount: number;
}

export interface DashboardMetrics {
  // IQD metrics
  totalGrossSales: number; // کۆی فرۆشی گشتی (دینار)
  totalCOGS: number; // تێچووی فرۆشراو (دینار)
  totalGrossProfit: number; // کۆی قازانجی گشتی (دینار)
  totalCashReceived: number; // کۆی پارەی وەرگیراو (دینار)
  totalOutstandingDebt: number; // بڕی پارەی ماوە (دینار)
  totalInventoryCostValue: number; // کۆی بەهای تێچووی کاڵاکانی کۆگا (دینار)
  totalInventorySellingValue: number; // کۆی بەهای فرۆشتنی کاڵاکانی کۆگا (دینار)

  // USD metrics
  totalGrossSalesUSD: number; // کۆی فرۆشی گشتی (دۆلار)
  totalCOGSUSD: number; // تێچووی فرۆشراو (دۆلار)
  totalGrossProfitUSD: number; // کۆی قازانجی گشتی (دۆلار)
  totalCashReceivedUSD: number; // کۆی پارەی وەرگیراو (دۆلار)
  totalOutstandingDebtUSD: number; // بڕی پارەی ماوە (دۆلار)
  totalInventoryCostValueUSD: number; // کۆی بەهای تێچووی کاڵاکانی کۆگا (دۆلار)
  totalInventorySellingValueUSD: number; // کۆی بەهای فرۆشتنی کاڵاکانی کۆگا (دۆلار)

  lowStockItemsCount: number; // ژمارەی کاڵا کەمبووەکان
}

export interface AdminUser {
  username: string;
  displayName: string;
  role: string;
  isLoggedIn: boolean;
}
