import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Product,
  Sale,
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
import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';

interface AppContextType {
  // Navigation & UI
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isCloudSyncOpen: boolean;
  setIsCloudSyncOpen: (open: boolean) => void;

  // Authentication
  adminUser: AdminUser | null;
  login: (u: string, p: string) => boolean;
  logout: () => void;
  changePassword: (newPass: string) => void;

  // Data
  products: Product[];
  sales: Sale[];
  payments: PaymentVoucher[];
  customers: CustomerDebtSummary[];
  metrics: DashboardMetrics;

  // Actions
  addProduct: (product: Omit<Product, 'id' | 'totalUnits' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
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
  deleteSale: (id: string) => void;
  createPayment: (paymentInput: {
    customerName: string;
    amount: number;
    notes: string;
    date?: string;
  }) => PaymentVoucher;
  deletePayment: (id: string) => void;
  deleteCustomer: (customerName: string, rollbackInventory?: boolean) => void;

  // Backup & Import
  exportExcel: (customerName?: string | unknown) => Promise<void>;
  resetToSampleData: () => void;
  loadScreenshotSampleData: () => void;
  exportJSONBackup: () => void;
  importJSONBackup: (jsonData: string) => boolean;

  // Active view modal helpers
  viewingInvoice: Sale | null;
  setViewingInvoice: (sale: Sale | null) => void;
  viewingStatementCustomer: string | null;
  setViewingStatementCustomer: (customerName: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  AUTH: 'floderm_auth_user_v1',
  PASS: 'floderm_admin_pass_v1',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState<boolean>(false);
  const [viewingInvoice, setViewingInvoice] = useState<Sale | null>(null);
  const [viewingStatementCustomer, setViewingStatementCustomer] = useState<string | null>(null);

  // Authentication State
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Default logged in session for initial smooth experience, or can be logged out
    return {
      username: 'Danamahjad',
      displayName: 'بەڕێوەبەری سەرەکی',
      role: 'admin',
      isLoggedIn: true,
    };
  });

  // Inventory / Products State (Loaded directly via Firestore onSnapshot)
  const [products, setProducts] = useState<Product[]>([]);

  // Sales State (Loaded directly via Firestore onSnapshot)
  const [sales, setSales] = useState<Sale[]>([]);

  // Payments / Debts State (Loaded directly via Firestore onSnapshot)
  const [payments, setPayments] = useState<PaymentVoucher[]>([]);

  // Real-time Firestore Subscriptions ('inventory', 'sales', 'debts')
  useEffect(() => {
    // 1. Listen directly to 'inventory' collection
    const unsubInventory = onSnapshot(
      collection(db, 'inventory'),
      (snapshot) => {
        const items: Product[] = [];
        snapshot.forEach((d) => {
          items.push({ ...(d.data() as Product), id: d.id });
        });
        setProducts(items);
      },
      (error) => {
        console.error('Firestore inventory real-time listener error:', error);
      }
    );

    // 2. Listen directly to 'sales' collection
    const unsubSales = onSnapshot(
      collection(db, 'sales'),
      (snapshot) => {
        const items: Sale[] = [];
        snapshot.forEach((d) => {
          items.push({ ...(d.data() as Sale), id: d.id });
        });
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setSales(items);
      },
      (error) => {
        console.error('Firestore sales real-time listener error:', error);
      }
    );

    // 3. Listen directly to 'debts' collection
    const unsubDebts = onSnapshot(
      collection(db, 'debts'),
      (snapshot) => {
        const items: PaymentVoucher[] = [];
        snapshot.forEach((d) => {
          items.push({ ...(d.data() as PaymentVoucher), id: d.id });
        });
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPayments(items);
      },
      (error) => {
        console.error('Firestore debts real-time listener error:', error);
      }
    );

    return () => {
      unsubInventory();
      unsubSales();
      unsubDebts();
    };
  }, []);

  // Admin login session persistence
  useEffect(() => {
    if (adminUser) {
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(adminUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH);
    }
  }, [adminUser]);

  // Login handler
  const login = (usernameInput: string, passwordInput: string): boolean => {
    const savedPass = localStorage.getItem(STORAGE_KEYS.PASS);
    const validPass = savedPass && savedPass !== 'admin123' ? savedPass : 'Kardo6194';
    const trimmedUser = usernameInput.trim();
    if (trimmedUser.toLowerCase() === 'danamahjad' && passwordInput === validPass) {
      const user: AdminUser = {
        username: 'Danamahjad',
        displayName: 'بەڕێوەبەری سەرەکی',
        role: 'admin',
        isLoggedIn: true,
      };
      setAdminUser(user);
      localStorage.setItem(STORAGE_KEYS.PASS, validPass);
      playSound('success');
      return true;
    }
    playSound('error');
    return false;
  };

  const logout = () => {
    playSound('click');
    setAdminUser(null);
  };

  const changePassword = (newPass: string) => {
    localStorage.setItem(STORAGE_KEYS.PASS, newPass);
    playSound('success');
  };

  // Add Product (writes directly to Firestore 'inventory' collection)
  const addProduct = (
    productInput: Omit<Product, 'id' | 'totalUnits' | 'createdAt' | 'updatedAt'>
  ) => {
    const now = new Date().toISOString();
    const cartons = Number(productInput.cartons) || 0;
    const unitsPerCarton = Number(productInput.unitsPerCarton) || 1;
    const totalUnits = cartons * unitsPerCarton;

    const newProd: Product = {
      ...productInput,
      id: `prod-${Date.now()}`,
      cartons,
      unitsPerCarton,
      totalUnits,
      createdAt: now,
      updatedAt: now,
    };

    setProducts((prev) => [newProd, ...prev]);
    // Write directly to 'inventory' collection in Firestore
    setDoc(doc(db, 'inventory', newProd.id), newProd).catch((err) =>
      console.warn('Firestore add inventory item error:', err)
    );
    playSound('success');
  };

  // Update Product (writes directly to Firestore 'inventory' collection)
  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const cartons = updates.cartons !== undefined ? Number(updates.cartons) : p.cartons;
        const unitsPerCarton =
          updates.unitsPerCarton !== undefined
            ? Number(updates.unitsPerCarton)
            : p.unitsPerCarton;
        const totalUnits =
          updates.totalUnits !== undefined
            ? Number(updates.totalUnits)
            : cartons * unitsPerCarton;

        const updated = {
          ...p,
          ...updates,
          cartons,
          unitsPerCarton,
          totalUnits,
          updatedAt: new Date().toISOString(),
        };
        // Write directly to 'inventory' collection in Firestore
        setDoc(doc(db, 'inventory', id), updated, { merge: true }).catch((err) =>
          console.warn('Firestore update inventory item error:', err)
        );
        return updated;
      })
    );
    playSound('success');
  };

  // Delete Product (deletes directly from Firestore 'inventory' collection)
  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    deleteDoc(doc(db, 'inventory', id)).catch((err) =>
      console.warn('Firestore delete inventory item error:', err)
    );
    playSound('delete');
  };

  // Create Sale transaction
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

    // Prepare line items & check stock
    const preparedItems = saleInput.items.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const unitsPerCarton = prod?.unitsPerCarton || 1;
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

    // Deduct stock from inventory
    setProducts((prev) =>
      prev.map((prod) => {
        const soldLine = preparedItems.find((i) => i.productId === prod.id);
        if (!soldLine) return prod;

        const newTotalUnits = Math.max(0, prod.totalUnits - soldLine.quantityInUnits);
        const newCartons = Math.floor(newTotalUnits / (prod.unitsPerCarton || 1));

        const updated = {
          ...prod,
          totalUnits: newTotalUnits,
          cartons: newCartons,
          updatedAt: new Date().toISOString(),
        };
        setDoc(doc(db, 'inventory', prod.id), updated, { merge: true }).catch((err) =>
          console.warn('Firestore update inventory stock error:', err)
        );
        return updated;
      })
    );

    // Save sale to Firestore 'sales' collection
    setSales((prev) => [newSale, ...prev]);
    setDoc(doc(db, 'sales', newSale.id), newSale).catch((err) =>
      console.warn('Firestore save sale error:', err)
    );

    // Celebratory effects
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#06b6d4', '#6366f1', '#fbbf24'],
    });
    playSound('success');

    return newSale;
  };

  // Delete Sale (rolls back stock)
  const deleteSale = (saleId: string) => {
    const saleToDelete = sales.find((s) => s.id === saleId);
    if (!saleToDelete) return;

    // Rollback inventory
    setProducts((prev) =>
      prev.map((prod) => {
        const itemSold = saleToDelete.items.find((i) => i.productId === prod.id);
        if (!itemSold) return prod;

        const newTotalUnits = prod.totalUnits + itemSold.quantityInUnits;
        const newCartons = Math.floor(newTotalUnits / (prod.unitsPerCarton || 1));

        const updated = {
          ...prod,
          totalUnits: newTotalUnits,
          cartons: newCartons,
          updatedAt: new Date().toISOString(),
        };
        setDoc(doc(db, 'inventory', prod.id), updated, { merge: true }).catch((err) =>
          console.warn('Firestore rollback inventory stock error:', err)
        );
        return updated;
      })
    );

    setSales((prev) => prev.filter((s) => s.id !== saleId));
    deleteDoc(doc(db, 'sales', saleId)).catch((err) =>
      console.warn('Firestore delete sale error:', err)
    );
    playSound('delete');
  };

  // Create standalone customer payment voucher
  const createPayment = (paymentInput: {
    customerName: string;
    amount: number;
    notes: string;
    date?: string;
  }): PaymentVoucher => {
    const newVoucher: PaymentVoucher = {
      id: `pay-${Date.now()}`,
      voucherNumber: generateVoucherNumber(payments.length),
      customerName: paymentInput.customerName.trim(),
      amount: Number(paymentInput.amount) || 0,
      notes: paymentInput.notes.trim(),
      date: paymentInput.date || new Date().toISOString(),
    };

    setPayments((prev) => [newVoucher, ...prev]);
    setDoc(doc(db, 'debts', newVoucher.id), newVoucher).catch((err) =>
      console.warn('Firestore save debt payment error:', err)
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

  // Delete payment
  const deletePayment = (id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
    deleteDoc(doc(db, 'debts', id)).catch((err) =>
      console.warn('Firestore delete debt payment error:', err)
    );
    playSound('delete');
  };

  // Delete customer account entirely (sales, payments, with optional inventory stock rollback)
  const deleteCustomer = (customerName: string, rollbackInventory: boolean = true) => {
    const trimmed = customerName.trim();
    if (!trimmed) return;

    // Find all sales for this customer
    const customerSales = sales.filter((s) => s.customerName.trim() === trimmed);

    // If rollbackInventory is true, restore stock for all products sold to this customer
    if (rollbackInventory && customerSales.length > 0) {
      setProducts((prev) =>
        prev.map((prod) => {
          let unitsToAdd = 0;
          customerSales.forEach((sale) => {
            sale.items.forEach((item) => {
              if (item.productId === prod.id) {
                unitsToAdd += item.quantityInUnits;
              }
            });
          });

          if (unitsToAdd === 0) return prod;

          const newTotalUnits = prod.totalUnits + unitsToAdd;
          const newCartons = Math.floor(newTotalUnits / (prod.unitsPerCarton || 1));

          const updated = {
            ...prod,
            totalUnits: newTotalUnits,
            cartons: newCartons,
            updatedAt: new Date().toISOString(),
          };
          setDoc(doc(db, 'inventory', prod.id), updated, { merge: true }).catch((err) =>
            console.warn('Firestore rollback inventory error:', err)
          );
          return updated;
        })
      );
    }

    // Remove all sales of this customer from Firestore
    customerSales.forEach((s) => {
      deleteDoc(doc(db, 'sales', s.id)).catch(() => {});
    });

    // Remove all payment vouchers of this customer from Firestore
    payments
      .filter((p) => p.customerName.trim() === trimmed)
      .forEach((p) => {
        deleteDoc(doc(db, 'debts', p.id)).catch(() => {});
      });

    // Remove from local state
    setSales((prev) => prev.filter((s) => s.customerName.trim() !== trimmed));
    setPayments((prev) => prev.filter((p) => p.customerName.trim() !== trimmed));

    // Close statement modal if open for this customer
    if (viewingStatementCustomer === trimmed) {
      setViewingStatementCustomer(null);
    }

    playSound('delete');
  };

  // Aggregate Customer Debt Ledgers
  const customers = useMemo<CustomerDebtSummary[]>(() => {
    const customerMap = new Map<string, CustomerDebtSummary>();

    // Process all sales
    sales.forEach((s) => {
      const name = s.customerName.trim();
      const existing = customerMap.get(name) || {
        name,
        phone: s.customerPhone || '',
        totalPurchases: 0,
        totalPaid: 0,
        outstandingDebt: 0,
        lastTransactionDate: s.date,
        invoicesCount: 0,
      };

      existing.totalPurchases += s.totalAmount;
      existing.totalPaid += s.paidAmount; // Cash paid during checkout
      existing.invoicesCount += 1;
      if (s.customerPhone && !existing.phone) {
        existing.phone = s.customerPhone;
      }
      if (new Date(s.date) > new Date(existing.lastTransactionDate)) {
        existing.lastTransactionDate = s.date;
      }

      customerMap.set(name, existing);
    });

    // Process all payment vouchers
    payments.forEach((p) => {
      const name = p.customerName.trim();
      const existing = customerMap.get(name) || {
        name,
        phone: '',
        totalPurchases: 0,
        totalPaid: 0,
        outstandingDebt: 0,
        lastTransactionDate: p.date,
        invoicesCount: 0,
      };

      existing.totalPaid += p.amount;
      if (new Date(p.date) > new Date(existing.lastTransactionDate)) {
        existing.lastTransactionDate = p.date;
      }

      customerMap.set(name, existing);
    });

    // Calculate final outstanding debt for each customer
    const list = Array.from(customerMap.values()).map((c) => ({
      ...c,
      outstandingDebt: Math.max(0, c.totalPurchases - c.totalPaid),
    }));

    // Sort by largest debt first
    return list.sort((a, b) => b.outstandingDebt - a.outstandingDebt);
  }, [sales, payments]);

  // Compute Core Dashboard Metrics
  const metrics = useMemo<DashboardMetrics>(() => {
    // 1. کۆی فرۆشی گشتی (Total Gross Sales)
    const totalGrossSales = sales.reduce((acc, s) => acc + s.totalAmount, 0);

    // 2. تێچووی فرۆشراو (Cost of Goods Sold - COGS)
    const totalCOGS = sales.reduce((acc, s) => acc + s.totalCost, 0);

    // 3. کۆی قازانجی گشتی (Total Gross Profit) = کۆی فرۆشی گشتی - تێچووی فرۆشراو
    const totalGrossProfit = totalGrossSales - totalCOGS;

    // 4. کۆی پارەی وەرگیراو (Total Cash Received): Down payments from sales + payment vouchers
    const salesCashReceived = sales.reduce((acc, s) => acc + s.paidAmount, 0);
    const voucherCashReceived = payments.reduce((acc, p) => acc + p.amount, 0);
    const totalCashReceived = salesCashReceived + voucherCashReceived;

    // 5. بڕی پارەی ماوە (Total Outstanding Debt): کۆی فرۆشی گشتی - کۆی پارەی وەرگیراو
    const totalOutstandingDebt = Math.max(0, totalGrossSales - totalCashReceived);

    // Inventory metrics
    const totalInventoryCostValue = products.reduce(
      (acc, p) => acc + p.costPricePerUnit * p.totalUnits,
      0
    );
    const totalInventorySellingValue = products.reduce(
      (acc, p) => acc + p.sellingPricePerUnit * p.totalUnits,
      0
    );
    const lowStockItemsCount = products.filter(
      (p) => p.totalUnits <= p.minStockThreshold
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
  }, [sales, payments, products]);

  // Excel Export Handler
  const exportExcel = async (customerName?: string | unknown) => {
    playSound('click');
    const cust = typeof customerName === 'string' ? customerName : undefined;
    await exportAllDataToExcel(products, sales, payments, customers, {
      customerName: cust,
    });
  };

  // Reset to sample data (syncs to Firestore)
  const resetToSampleData = () => {
    setProducts(INITIAL_PRODUCTS);
    setSales(INITIAL_SALES);
    setPayments(INITIAL_PAYMENTS);
    INITIAL_PRODUCTS.forEach((p) => setDoc(doc(db, 'inventory', p.id), p).catch(() => {}));
    INITIAL_SALES.forEach((s) => setDoc(doc(db, 'sales', s.id), s).catch(() => {}));
    INITIAL_PAYMENTS.forEach((p) => setDoc(doc(db, 'debts', p.id), p).catch(() => {}));
    playSound('success');
  };

  // Load exact screenshot template sample data (A, B, C & Haval) (syncs to Firestore)
  const loadScreenshotSampleData = () => {
    setProducts(SCREENSHOT_PRODUCTS);
    setSales(SCREENSHOT_SALES);
    setPayments(SCREENSHOT_PAYMENTS);
    SCREENSHOT_PRODUCTS.forEach((p) => setDoc(doc(db, 'inventory', p.id), p).catch(() => {}));
    SCREENSHOT_SALES.forEach((s) => setDoc(doc(db, 'sales', s.id), s).catch(() => {}));
    SCREENSHOT_PAYMENTS.forEach((p) => setDoc(doc(db, 'debts', p.id), p).catch(() => {}));
    playSound('success');
  };

  // JSON Backup Export
  const exportJSONBackup = () => {
    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      products,
      sales,
      payments,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `danamahjadstore_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    playSound('success');
  };

  // JSON Backup Import (syncs to Firestore)
  const importJSONBackup = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (Array.isArray(parsed.products) && Array.isArray(parsed.sales)) {
        setProducts(parsed.products);
        setSales(parsed.sales);
        parsed.products.forEach((p: Product) => setDoc(doc(db, 'inventory', p.id), p).catch(() => {}));
        parsed.sales.forEach((s: Sale) => setDoc(doc(db, 'sales', s.id), s).catch(() => {}));
        if (Array.isArray(parsed.payments)) {
          setPayments(parsed.payments);
          parsed.payments.forEach((p: PaymentVoucher) => setDoc(doc(db, 'debts', p.id), p).catch(() => {}));
        }
        playSound('success');
        return true;
      }
      return false;
    } catch {
      playSound('error');
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        isSidebarOpen,
        setIsSidebarOpen,
        adminUser,
        login,
        logout,
        changePassword,
        products,
        sales,
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
        exportExcel,
        resetToSampleData,
        loadScreenshotSampleData,
        exportJSONBackup,
        importJSONBackup,
        viewingInvoice,
        setViewingInvoice,
        viewingStatementCustomer,
        setViewingStatementCustomer,
        isCloudSyncOpen,
        setIsCloudSyncOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
};
