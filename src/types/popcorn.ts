export interface PopcornShipmentConfig {
  id: string;
  title: string;
  originCountry: string; // e.g. ڕووسیا (Russia)
  destinationCity: string; // e.g. سلێمانی، عێراق (Sulaimani, Iraq)
  totalTons: number; // 200 tons
  buyPricePerTonUSD: number; // $220 / ton
  sellingPricePerTonUSD: number; // $302 / ton
  hasPartner: boolean; // ئایا شەراکەتی تێدایە؟ (True / False)
  partnerName: string; // e.g. هاوبەش (Partner)
  partnerSharePercent: number; // 50%
  exchangeRateIQD: number; // e.g. 1530 IQD per 1 USD
  notes?: string;
  updatedAt: string;
}

export interface PopcornTruck {
  id: string;
  plateNumber: string; // ژمارەی تابلۆی بارهەڵگر
  tonsCarried: number; // بڕی بار بە تۆن
  driverName: string; // ناوی شۆفێر
  driverPhone?: string; // ژمارەی مۆبایل
  destination?: string; // شوێنی گەیندن / مەبەست (ئارەزوومەندانە)
  status?: 'in_transit' | 'at_border' | 'delivered'; // دۆخ
  transitCostUSD?: number; // کرێی گواستنەوە بە دۆلار
  dispatchDate: string; // بەرواری بارکردن / دەرچوون
  arrivalDate?: string; // بەرواری گەیشتن
  notes?: string;
}

export interface PopcornExpense {
  id: string;
  region: 'iran' | 'iraq'; // مەسروفی ئێران یان عێراق
  title?: string; // ناونیشانی خەرجی (ئارەزوومەندانە)
  category?: string; // پۆلێن (ئارەزوومەندانە)
  amountUSD: number; // بڕ بە دۆلار ($)
  amountLocal?: number; // بڕ بە دراوی ناوخۆ (تمەن یان دینار)
  date: string; // بەروار
  paidBy: 'me' | 'partner' | 'shared'; // کێ پارەکەی داوە
  notes?: string; // تێبینی
}

export interface PopcornTransaction {
  id: string;
  name: string; // ناوی مامەڵە (Transaction Name)
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'archived'; // دۆخی مامەڵە
  config: PopcornShipmentConfig;
  trucks: PopcornTruck[];
  expenses: PopcornExpense[];
}

export interface PopcornStoreState {
  activeTransactionId: string;
  transactions: PopcornTransaction[];
  lastSyncedAt?: string;
}

// Single transaction data compatibility type
export interface PopcornProjectData {
  config: PopcornShipmentConfig;
  trucks: PopcornTruck[];
  expenses: PopcornExpense[];
  lastSyncedAt?: string;
}
