import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';
import {
  Product,
  PaymentVoucher,
  CustomerDebtSummary,
  DashboardMetrics,
  AdminUser,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_PAYMENTS,
  SCREENSHOT_PRODUCTS,
  SCREENSHOT_SALES,
  SCREENSHOT_PAYMENTS,
} from '../utils/sampleData';
import {
  generateInvoiceNumber,
  generateVoucherNumber,
  playSound,
} from '../utils/formatters';
import { exportAllDataToExcel } from '../utils/excelExport';

export interface Item {
  id: string;
  name: string;
  cartonQty: number;
  piecesPerCarton: number;
  totalPieces: number;
  pricePerPiece: number;
  status?: string;
  [key: string]: any;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  totalCost: number;
  grossProfit: number;
  paidAmount: number;
  remainingAmount: number;
  notes?: string;
  items: Array<{
    productId: string;
    productName: string;
    unitType: 'carton' | 'unit';
    quantity: number;
    quantityInUnits: number;
    unitPrice: number;
    costPricePerUnit: number;
    total: number;
    totalCost: number;
  }>;
  date: string;
  [key: string]: any;
}

export interface Debt {
  id: string;
  voucherNumber: string;
  customerName: string;
  amount: number;
  type?: 'debt' | 'payment';
  notes?: string;
  date: string;
  [key: string]: any;
}

export interface AppContextType {
  // Direct Cloud Firestore collections
  inventory: Item[];
  sales: Sale[];
  debts: Debt[];

  // Direct Cloud Writers (No local-only writes)
  addItem: (item: any) => Promise<void>;
  updateItem: (item: any) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addSale: (sale: any) => Promise<void>;
  addDebt: (debt: any) => Promise<void>;

  // Component aliases & UI state helpers
  products: Product[];
  payments: PaymentVoucher[];
  customers: CustomerDebtSummary[];
  metrics: DashboardMetrics;

  addProduct: (product: any) => Promise<void>;
  updateProduct: (id: string, product: any) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  createSale: (saleInput: {
    customerName: string;
    customerPhone?: string;
    items: Array<{
      productId: string;
      productName: string;
      unitType: 'carton' | 'unit';
      quantity: number;
      unitPrice: number;
    }>;
    paidAmount: number;
    notes?: string;
  }) => Sale | null;
  deleteSale: (id: string) => Promise<void>;
  createPayment: (paymentInput: {
    customerName: string;
    amount: number;
    notes: string;
    date?: string;
  }) => PaymentVoucher;
  deletePayment: (id: string) => Promise<void>;
  deleteCustomer: (customerName: string, rollbackInventory?: boolean) => Promise<void>;

  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  adminUser: AdminUser | null;
  login: (u: string, p: string) => boolean;
  logout: () => void;
  changePassword: (newPass: string) => void;

  exportExcel: (customerName?: string | unknown) => Promise<void>;
  resetToSampleData: () => void;
  loadScreenshotSampleData: () => void;
  exportJSONBackup: () => void;
  importJSONBackup: (jsonData: string) => boolean;

  viewingInvoice: Sale | null;
  setViewingInvoice: (sale: Sale | null) => void;
  viewingStatementCustomer: string | null;
  setViewingStatementCustomer: (customerName: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Configurable Admin Credentials
export const DEFAULT_ADMIN_CONFIG = {
  username: 'admin',
  password: 'password123',
};

const AUTH_STORAGE_KEYS = {
  AUTH: 'floderm_auth_user_v1',
  PASS: 'floderm_admin_pass_v1',
  SESSION_IS_LOGGED_IN: 'isLoggedIn',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inventory, setInventory] = useState<Item[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [viewingInvoice, setViewingInvoice] = useState<Sale | null>(null);
  const [viewingStatementCustomer, setViewingStatementCustomer] = useState<string | null>(null);

  // Authentication State strictly backed by sessionStorage gate
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    const isSessionAuth = sessionStorage.getItem(AUTH_STORAGE_KEYS.SESSION_IS_LOGGED_IN) === 'true';
    if (!isSessionAuth) {
      return null;
    }
    const saved = sessionStorage.getItem(AUTH_STORAGE_KEYS.AUTH);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return {
      username: DEFAULT_ADMIN_CONFIG.username,
      displayName: 'بەڕێوەبەری سەرەکی',
      role: 'admin',
      isLoggedIn: true,
    };
  });

  // 1. Direct Real-Time Listeners from Cloud Firestore (Pure Firestore, NO localStorage fallbacks)
  useEffect(() => {
    const unsubInventory = onSnapshot(
      collection(db, 'inventory'),
      (snapshot) => {
        const items = snapshot.docs.map((d) => {
          const data = d.data();
          const cartons = Number(data.cartons ?? data.cartonQty) || 0;
          const unitsPerCarton = Number(data.unitsPerCarton ?? data.piecesPerCarton) || 1;
          const totalUnits = Number(data.totalUnits ?? data.totalPieces) || cartons * unitsPerCarton;
          const sellingPricePerUnit = Number(data.sellingPricePerUnit ?? data.pricePerPiece) || 0;
          const costPricePerUnit = Number(data.costPricePerUnit) || 0;
          const minStockThreshold = Number(data.minStockThreshold) || 5;

          return {
            id: d.id,
            ...data,
            name: data.name || '',
            cartons,
            cartonQty: cartons,
            unitsPerCarton,
            piecesPerCarton: unitsPerCarton,
            totalUnits,
            totalPieces: totalUnits,
            sellingPricePerUnit,
            pricePerPiece: sellingPricePerUnit,
            costPricePerUnit,
            minStockThreshold,
          } as Item;
        });
        setInventory(items);
      },
      (error) => console.error("Firestore Inventory error:", error)
    );

    const unsubSales = onSnapshot(
      collection(db, 'sales'),
      (snapshot) => {
        const salesData = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            invoiceNumber: data.invoiceNumber || `INV-${d.id.slice(-4)}`,
            customerName: data.customerName || 'کڕیاری گشتی',
            customerPhone: data.customerPhone || '',
            items: Array.isArray(data.items) ? data.items : [],
            totalAmount: Number(data.totalAmount) || 0,
            totalCost: Number(data.totalCost) || 0,
            grossProfit: Number(data.grossProfit) || 0,
            paidAmount: Number(data.paidAmount) || 0,
            remainingAmount: Number(data.remainingAmount) || 0,
            notes: data.notes || '',
            date: data.date || new Date().toISOString(),
          } as Sale;
        });
        salesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setSales(salesData);
      },
      (error) => console.error("Firestore Sales error:", error)
    );

    const unsubDebts = onSnapshot(
      collection(db, 'debts'),
      (snapshot) => {
        const debtData = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            voucherNumber: data.voucherNumber || `VCH-${d.id.slice(-4)}`,
            customerName: data.customerName || 'کڕیار',
            amount: Number(data.amount) || 0,
            type: data.type || 'payment',
            notes: data.notes || '',
            date: data.date || new Date().toISOString(),
          } as Debt;
        });
        debtData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setDebts(debtData);
      },
      (error) => console.error("Firestore Debts error:", error)
    );

    return () => {
      unsubInventory();
      unsubSales();
      unsubDebts();
    };
  }, []);

  // 2. Direct Cloud Writers (No local-only writes)
  const addItem = async (item: any) => {
    const id = item.id ? String(item.id) : `prod-${Date.now()}`;
    const cartons = Number(item.cartons ?? item.cartonQty) || 0;
    const unitsPerCarton = Number(item.unitsPerCarton ?? item.piecesPerCarton) || 1;
    const totalUnits = Number(item.totalUnits ?? item.totalPieces) || cartons * unitsPerCarton;
    const sellingPricePerUnit = Number(item.sellingPricePerUnit ?? item.pricePerPiece) || 0;
    const costPricePerUnit = Number(item.costPricePerUnit) || 0;

    const cleanItem = {
      ...item,
      id,
      name: item.name || '',
      cartons,
      cartonQty: cartons,
      unitsPerCarton,
      piecesPerCarton: unitsPerCarton,
      totalUnits,
      totalPieces: totalUnits,
      sellingPricePerUnit,
      pricePerPiece: sellingPricePerUnit,
      costPricePerUnit,
      minStockThreshold: item.minStockThreshold || 5,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'inventory', id), cleanItem);
    playSound('success');
  };

  const updateItem = async (item: any) => {
    if (!item.id) return;
    const id = String(item.id);
    const cartons = item.cartons !== undefined || item.cartonQty !== undefined 
      ? Number(item.cartons ?? item.cartonQty) : undefined;
    const unitsPerCarton = item.unitsPerCarton !== undefined || item.piecesPerCarton !== undefined 
      ? Number(item.unitsPerCarton ?? item.piecesPerCarton) : undefined;

    const payload: any = {
      ...item,
      id,
      updatedAt: new Date().toISOString(),
    };

    if (cartons !== undefined) {
      payload.cartons = cartons;
      payload.cartonQty = cartons;
    }
    if (unitsPerCarton !== undefined) {
      payload.unitsPerCarton = unitsPerCarton;
      payload.piecesPerCarton = unitsPerCarton;
    }
    if (cartons !== undefined && unitsPerCarton !== undefined) {
      payload.totalUnits = cartons * unitsPerCarton;
      payload.totalPieces = cartons * unitsPerCarton;
    }

    await setDoc(doc(db, 'inventory', id), payload, { merge: true });
    playSound('success');
  };

  const deleteItem = async (id: string) => {
    await deleteDoc(doc(db, 'inventory', String(id)));
    playSound('delete');
  };

  const addSale = async (sale: any) => {
    const id = sale.id ? String(sale.id) : `sale-${Date.now()}`;
    const cleanSale = {
      ...sale,
      id,
      date: sale.date || new Date().toISOString(),
    };
    await setDoc(doc(db, 'sales', id), cleanSale);

    // If sale contains items, update inventory stock in Firestore directly
    if (Array.isArray(sale.items)) {
      for (const line of sale.items) {
        const prod = inventory.find((p) => p.id === line.productId);
        if (prod) {
          const qtyInUnits = line.quantityInUnits || (line.unitType === 'carton' ? line.quantity * (prod.unitsPerCarton || 1) : line.quantity);
          const newTotal = Math.max(0, (prod.totalUnits || prod.totalPieces || 0) - qtyInUnits);
          const newCartons = Math.floor(newTotal / (prod.unitsPerCarton || prod.piecesPerCarton || 1));
          await setDoc(doc(db, 'inventory', prod.id), {
            totalUnits: newTotal,
            totalPieces: newTotal,
            cartons: newCartons,
            cartonQty: newCartons,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      }
    }
  };

  const addDebt = async (debt: any) => {
    const id = debt.id ? String(debt.id) : `debt-${Date.now()}`;
    const cleanDebt = {
      ...debt,
      id,
      amount: Number(debt.amount) || 0,
      date: debt.date || new Date().toISOString(),
    };
    await setDoc(doc(db, 'debts', id), cleanDebt);
  };

  // Component compatibility wrappers
  const addProduct = async (productInput: any) => {
    await addItem(productInput);
  };

  const updateProduct = async (id: string, updates: any) => {
    await updateItem({ ...updates, id });
  };

  const deleteProduct = async (id: string) => {
    await deleteItem(id);
  };

  const createSale = (saleInput: {
    customerName: string;
    customerPhone?: string;
    items: Array<{
      productId: string;
      productName: string;
      unitType: 'carton' | 'unit';
      quantity: number;
      unitPrice: number;
    }>;
    paidAmount: number;
    notes?: string;
  }): Sale | null => {
    if (!saleInput.customerName.trim() || saleInput.items.length === 0) {
      playSound('error');
      return null;
    }

    const preparedItems = saleInput.items.map((item) => {
      const prod = inventory.find((p) => p.id === item.productId);
      const unitsPerCarton = prod?.unitsPerCarton || prod?.piecesPerCarton || 1;
      const quantityInUnits =
        item.unitType === 'carton' ? item.quantity * unitsPerCarton : item.quantity;
      const costPricePerUnit = prod?.costPricePerUnit || 0;
      const total = item.quantity * item.unitPrice;
      const totalCost = quantityInUnits * costPricePerUnit;

      return {
        productId: item.productId,
        productName: item.productName,
        unitType: item.unitType,
        quantity: item.quantity,
        quantityInUnits,
        unitPrice: item.unitPrice,
        costPricePerUnit,
        total,
        totalCost,
      };
    });

    const totalAmount = preparedItems.reduce((acc, i) => acc + i.total, 0);
    const totalCost = preparedItems.reduce((acc, i) => acc + i.totalCost, 0);
    const grossProfit = totalAmount - totalCost;
    const paidAmount = Math.min(Number(saleInput.paidAmount) || 0, totalAmount);
    const remainingAmount = Math.max(0, totalAmount - paidAmount);

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      invoiceNumber: generateInvoiceNumber(sales.length),
      customerName: saleInput.customerName.trim(),
      customerPhone: saleInput.customerPhone?.trim() || '',
      items: preparedItems,
      totalAmount,
      totalCost,
      grossProfit,
      paidAmount,
      remainingAmount,
      notes: saleInput.notes?.trim() || '',
      date: new Date().toISOString(),
    };

    addSale(newSale).catch((err) => console.error("Firestore addSale error:", err));

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#06b6d4', '#6366f1', '#fbbf24'],
    });
    playSound('success');

    return newSale;
  };

  const deleteSale = async (saleId: string) => {
    const saleToDelete = sales.find((s) => s.id === saleId);
    if (saleToDelete && Array.isArray(saleToDelete.items)) {
      for (const item of saleToDelete.items) {
        const prod = inventory.find((p) => p.id === item.productId);
        if (prod) {
          const newTotal = (prod.totalUnits || prod.totalPieces || 0) + (item.quantityInUnits || 0);
          const newCartons = Math.floor(newTotal / (prod.unitsPerCarton || prod.piecesPerCarton || 1));
          await setDoc(doc(db, 'inventory', prod.id), {
            totalUnits: newTotal,
            totalPieces: newTotal,
            cartons: newCartons,
            cartonQty: newCartons,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      }
    }
    await deleteDoc(doc(db, 'sales', saleId));
    playSound('delete');
  };

  const createPayment = (paymentInput: {
    customerName: string;
    amount: number;
    notes: string;
    date?: string;
  }): PaymentVoucher => {
    const newVoucher: PaymentVoucher = {
      id: `pay-${Date.now()}`,
      voucherNumber: generateVoucherNumber(debts.length),
      customerName: paymentInput.customerName.trim(),
      amount: Number(paymentInput.amount) || 0,
      notes: paymentInput.notes.trim(),
      date: paymentInput.date || new Date().toISOString(),
    };

    addDebt({ ...newVoucher, type: 'payment' }).catch((err) =>
      console.error("Firestore addDebt error:", err)
    );
    playSound('success');

    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#10b981', '#34d399', '#6ee7b7'],
    });

    return newVoucher;
  };

  const deletePayment = async (id: string) => {
    await deleteDoc(doc(db, 'debts', id));
    playSound('delete');
  };

  const deleteCustomer = async (customerName: string, rollbackInventory: boolean = true) => {
    const trimmed = customerName.trim();
    if (!trimmed) return;

    const customerSales = sales.filter((s) => s.customerName?.trim() === trimmed);

    if (rollbackInventory && customerSales.length > 0) {
      for (const sale of customerSales) {
        if (Array.isArray(sale.items)) {
          for (const item of sale.items) {
            const prod = inventory.find((p) => p.id === item.productId);
            if (prod) {
              const newTotal = (prod.totalUnits || prod.totalPieces || 0) + (item.quantityInUnits || 0);
              const newCartons = Math.floor(newTotal / (prod.unitsPerCarton || prod.piecesPerCarton || 1));
              await setDoc(doc(db, 'inventory', prod.id), {
                totalUnits: newTotal,
                totalPieces: newTotal,
                cartons: newCartons,
                cartonQty: newCartons,
                updatedAt: new Date().toISOString(),
              }, { merge: true });
            }
          }
        }
      }
    }

    for (const sale of customerSales) {
      await deleteDoc(doc(db, 'sales', sale.id));
    }

    const customerDebts = debts.filter((d) => d.customerName?.trim() === trimmed);
    for (const d of customerDebts) {
      await deleteDoc(doc(db, 'debts', d.id));
    }

    if (viewingStatementCustomer === trimmed) {
      setViewingStatementCustomer(null);
    }
    playSound('delete');
  };

  // Aliases for components
  const products = inventory as unknown as Product[];
  const payments = debts as unknown as PaymentVoucher[];

  // Computed ledgers and metrics directly from Firestore state
  const customers = useMemo<CustomerDebtSummary[]>(() => {
    const customerMap = new Map<string, CustomerDebtSummary>();

    sales.forEach((s) => {
      const name = s.customerName?.trim() || '';
      if (!name) return;
      const existing = customerMap.get(name) || {
        name,
        phone: s.customerPhone || '',
        totalPurchases: 0,
        totalPaid: 0,
        outstandingDebt: 0,
        lastTransactionDate: s.date || new Date().toISOString(),
        invoicesCount: 0,
      };

      existing.totalPurchases += s.totalAmount || 0;
      existing.totalPaid += s.paidAmount || 0;
      existing.invoicesCount += 1;
      if (s.customerPhone && !existing.phone) {
        existing.phone = s.customerPhone;
      }
      if (s.date && new Date(s.date) > new Date(existing.lastTransactionDate)) {
        existing.lastTransactionDate = s.date;
      }

      customerMap.set(name, existing);
    });

    debts.forEach((p) => {
      const name = p.customerName?.trim() || '';
      if (!name) return;
      const existing = customerMap.get(name) || {
        name,
        phone: '',
        totalPurchases: 0,
        totalPaid: 0,
        outstandingDebt: 0,
        lastTransactionDate: p.date || new Date().toISOString(),
        invoicesCount: 0,
      };

      existing.totalPaid += p.amount || 0;
      if (p.date && new Date(p.date) > new Date(existing.lastTransactionDate)) {
        existing.lastTransactionDate = p.date;
      }

      customerMap.set(name, existing);
    });

    const list = Array.from(customerMap.values()).map((c) => ({
      ...c,
      outstandingDebt: Math.max(0, c.totalPurchases - c.totalPaid),
    }));

    return list.sort((a, b) => b.outstandingDebt - a.outstandingDebt);
  }, [sales, debts]);

  const metrics = useMemo<DashboardMetrics>(() => {
    const totalGrossSales = sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const totalCOGS = sales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
    const totalGrossProfit = totalGrossSales - totalCOGS;
    const salesCashReceived = sales.reduce((acc, s) => acc + (s.paidAmount || 0), 0);
    const voucherCashReceived = debts.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalCashReceived = salesCashReceived + voucherCashReceived;
    const totalOutstandingDebt = Math.max(0, totalGrossSales - totalCashReceived);

    const totalInventoryCostValue = inventory.reduce(
      (acc, p) => acc + (p.costPricePerUnit || 0) * (p.totalUnits || p.totalPieces || 0),
      0
    );
    const totalInventorySellingValue = inventory.reduce(
      (acc, p) => acc + (p.sellingPricePerUnit || p.pricePerPiece || 0) * (p.totalUnits || p.totalPieces || 0),
      0
    );
    const lowStockItemsCount = inventory.filter(
      (p) => (p.totalUnits || p.totalPieces || 0) <= (p.minStockThreshold || 5)
    ).length;

    return {
      totalGrossSales,
      totalCOGS,
      totalGrossProfit,
      totalCashReceived,
      totalOutstandingDebt,
      totalInventoryCostValue,
      totalInventorySellingValue,
      lowStockItemsCount,
    };
  }, [sales, debts, inventory]);

  // Admin login handlers
  const login = (usernameInput: string, passwordInput: string): boolean => {
    const savedPass = localStorage.getItem(AUTH_STORAGE_KEYS.PASS);
    const validCustomPass = savedPass && savedPass.trim();
    const trimmedUser = usernameInput.trim().toLowerCase();

    const isMatch =
      (trimmedUser === DEFAULT_ADMIN_CONFIG.username.toLowerCase() &&
        (passwordInput === DEFAULT_ADMIN_CONFIG.password || (validCustomPass && passwordInput === validCustomPass))) ||
      (trimmedUser === 'danamahjad' &&
        (passwordInput === 'Kardo6194' || (validCustomPass && passwordInput === validCustomPass)));

    if (isMatch) {
      const user: AdminUser = {
        username: usernameInput.trim(),
        displayName: 'بەڕێوەبەری سەرەکی',
        role: 'admin',
        isLoggedIn: true,
      };
      setAdminUser(user);
      sessionStorage.setItem(AUTH_STORAGE_KEYS.SESSION_IS_LOGGED_IN, 'true');
      sessionStorage.setItem(AUTH_STORAGE_KEYS.AUTH, JSON.stringify(user));
      playSound('success');
      return true;
    }
    playSound('error');
    return false;
  };

  const logout = () => {
    playSound('click');
    setAdminUser(null);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.SESSION_IS_LOGGED_IN);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.AUTH);
  };

  const changePassword = (newPass: string) => {
    localStorage.setItem(AUTH_STORAGE_KEYS.PASS, newPass);
    playSound('success');
  };

  const exportExcel = async (customerName?: string | unknown) => {
    playSound('click');
    const cust = typeof customerName === 'string' ? customerName : undefined;
    await exportAllDataToExcel(products, sales as any, payments, customers, {
      customerName: cust,
    });
  };

  const resetToSampleData = () => {
    INITIAL_PRODUCTS.forEach((p) => setDoc(doc(db, 'inventory', p.id), p).catch(() => {}));
    INITIAL_SALES.forEach((s) => setDoc(doc(db, 'sales', s.id), s).catch(() => {}));
    INITIAL_PAYMENTS.forEach((p) => setDoc(doc(db, 'debts', p.id), p).catch(() => {}));
    playSound('success');
  };

  const loadScreenshotSampleData = () => {
    SCREENSHOT_PRODUCTS.forEach((p) => setDoc(doc(db, 'inventory', p.id), p).catch(() => {}));
    SCREENSHOT_SALES.forEach((s) => setDoc(doc(db, 'sales', s.id), s).catch(() => {}));
    SCREENSHOT_PAYMENTS.forEach((p) => setDoc(doc(db, 'debts', p.id), p).catch(() => {}));
    playSound('success');
  };

  const exportJSONBackup = () => {
    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      inventory,
      sales,
      debts,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `danamahjadstore_cloud_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    playSound('success');
  };

  const importJSONBackup = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      const items = parsed.inventory || parsed.products;
      if (Array.isArray(items)) {
        items.forEach((p: any) => addItem(p));
      }
      if (Array.isArray(parsed.sales)) {
        parsed.sales.forEach((s: any) => addSale(s));
      }
      const debtList = parsed.debts || parsed.payments;
      if (Array.isArray(debtList)) {
        debtList.forEach((d: any) => addDebt(d));
      }
      playSound('success');
      return true;
    } catch {
      playSound('error');
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        // Requested Pure Firestore state & writers
        inventory,
        sales,
        debts,
        addItem,
        updateItem,
        deleteItem,
        addSale,
        addDebt,

        // Application components compatibility
        products,
        payments,
        customers,
        metrics,
        addProduct,
        updateProduct,
        deleteProduct,
        createSale,
        deleteSale,
        createPayment,
        deletePayment,
        deleteCustomer,

        // UI & Navigation
        activeTab,
        setActiveTab,
        isSidebarOpen,
        setIsSidebarOpen,
        adminUser,
        login,
        logout,
        changePassword,
        exportExcel,
        resetToSampleData,
        loadScreenshotSampleData,
        exportJSONBackup,
        importJSONBackup,
        viewingInvoice,
        setViewingInvoice,
        viewingStatementCustomer,
        setViewingStatementCustomer,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
