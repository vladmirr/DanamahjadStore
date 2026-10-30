import { Product, Sale, PaymentVoucher } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'ڕۆنی زەیتی زەیتوون عەفرین (1L)',
    barcode: '62810012301',
    category: 'خۆراکەمەنی',
    costPricePerUnit: 4500,
    cartons: 15,
    unitsPerCarton: 12,
    totalUnits: 180,
    sellingPricePerUnit: 6000,
    minStockThreshold: 30,
    createdAt: '2026-10-15T10:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
  },
  {
    id: 'prod-2',
    name: 'چاوی ئەحمەد زێڕین کەتەلۆکی (450g)',
    barcode: '62810012302',
    category: 'خواردنەوە و چا',
    costPricePerUnit: 3250,
    cartons: 20,
    unitsPerCarton: 24,
    totalUnits: 480,
    sellingPricePerUnit: 4500,
    minStockThreshold: 48,
    createdAt: '2026-10-16T11:00:00.000Z',
    updatedAt: '2026-10-16T11:00:00.000Z',
  },
  {
    id: 'prod-3',
    name: 'شیری نیدۆ ئەسڵی (2.5KG)',
    barcode: '62810012303',
    category: 'شیرەمەنی',
    costPricePerUnit: 26000,
    cartons: 8,
    unitsPerCarton: 6,
    totalUnits: 48,
    sellingPricePerUnit: 31000,
    minStockThreshold: 12,
    createdAt: '2026-10-17T09:30:00.000Z',
    updatedAt: '2026-10-17T09:30:00.000Z',
  },
  {
    id: 'prod-4',
    name: 'برنجی مەحموود بەسمەتی (10KG)',
    barcode: '62810012304',
    category: 'خۆراکەمەنی',
    costPricePerUnit: 18000,
    cartons: 25,
    unitsPerCarton: 4,
    totalUnits: 100,
    sellingPricePerUnit: 22500,
    minStockThreshold: 20,
    createdAt: '2026-10-18T14:15:00.000Z',
    updatedAt: '2026-10-18T14:15:00.000Z',
  },
  {
    id: 'prod-5',
    name: 'تایت پەرسێل ئۆتۆماتیک (3KG)',
    barcode: '62810012305',
    category: 'پاککەرەوە',
    costPricePerUnit: 7500,
    cartons: 12,
    unitsPerCarton: 8,
    totalUnits: 96,
    sellingPricePerUnit: 10000,
    minStockThreshold: 24,
    createdAt: '2026-10-19T08:00:00.000Z',
    updatedAt: '2026-10-19T08:00:00.000Z',
  },
  {
    id: 'prod-6',
    name: 'ئاوی کانی سروشتی (500ml)',
    barcode: '62810012306',
    category: 'خواردنەوە و چا',
    costPricePerUnit: 200,
    cartons: 40,
    unitsPerCarton: 24,
    totalUnits: 960,
    sellingPricePerUnit: 350,
    minStockThreshold: 120,
    createdAt: '2026-10-20T12:00:00.000Z',
    updatedAt: '2026-10-20T12:00:00.000Z',
  },
  {
    id: 'prod-7',
    name: 'نەستەلەی کیندەر بوێنۆ ئەسڵی',
    barcode: '62810012307',
    category: 'شیرینی و بسکیت',
    costPricePerUnit: 850,
    cartons: 1,
    unitsPerCarton: 30,
    totalUnits: 30, // Low stock trigger
    sellingPricePerUnit: 1250,
    minStockThreshold: 60,
    createdAt: '2026-10-21T15:30:00.000Z',
    updatedAt: '2026-10-21T15:30:00.000Z',
  },
  {
    id: 'prod-8',
    name: 'پەنیر کێری 8 پارچەیی',
    barcode: '62810012308',
    category: 'شیرەمەنی',
    costPricePerUnit: 2100,
    cartons: 16,
    unitsPerCarton: 12,
    totalUnits: 192,
    sellingPricePerUnit: 2850,
    minStockThreshold: 36,
    createdAt: '2026-10-22T16:00:00.000Z',
    updatedAt: '2026-10-22T16:00:00.000Z',
  },
];

export const INITIAL_SALES: Sale[] = [
  {
    id: 'sale-1',
    invoiceNumber: 'INV-2026-0001',
    customerName: 'هاڤاڵ کاروان',
    customerPhone: '0750 123 4567',
    items: [
      {
        productId: 'prod-1',
        productName: 'ڕۆنی زەیتی زەیتوون عەفرین (1L)',
        unitType: 'carton',
        quantity: 2,
        quantityInUnits: 24,
        unitPrice: 72000, // 12 * 6,000 per carton
        costPricePerUnit: 4500,
        total: 144000,
        totalCost: 108000,
      },
      {
        productId: 'prod-4',
        productName: 'برنجی مەحموود بەسمەتی (10KG)',
        unitType: 'unit',
        quantity: 2,
        quantityInUnits: 2,
        unitPrice: 22500,
        costPricePerUnit: 18000,
        total: 45000,
        totalCost: 36000,
      },
    ],
    totalAmount: 189000,
    totalCost: 144000,
    grossProfit: 45000,
    paidAmount: 89000, // Down payment at POS
    remainingAmount: 100000, // Remaining debt
    notes: 'کڕینی کۆمەڵ، بەشێکی کاش درا',
    date: '2026-10-27T10:30:00.000Z',
  },
  {
    id: 'sale-2',
    invoiceNumber: 'INV-2026-0002',
    customerName: 'ئاراس ڕەحیم',
    customerPhone: '0770 987 6543',
    items: [
      {
        productId: 'prod-3',
        productName: 'شیری نیدۆ ئەسڵی (2.5KG)',
        unitType: 'unit',
        quantity: 2,
        quantityInUnits: 2,
        unitPrice: 31000,
        costPricePerUnit: 26000,
        total: 62000,
        totalCost: 52000,
      },
      {
        productId: 'prod-2',
        productName: 'چاوی ئەحمەد زێڕین کەتەلۆکی (450g)',
        unitType: 'unit',
        quantity: 4,
        quantityInUnits: 4,
        unitPrice: 4500,
        costPricePerUnit: 3250,
        total: 18000,
        totalCost: 13000,
      },
    ],
    totalAmount: 80000,
    totalCost: 65000,
    grossProfit: 15000,
    paidAmount: 80000, // Full payment
    remainingAmount: 0,
    notes: 'پارەدانی تەواو بە کاش',
    date: '2026-10-28T14:10:00.000Z',
  },
  {
    id: 'sale-3',
    invoiceNumber: 'INV-2026-0003',
    customerName: 'سەروەر عوسمان',
    customerPhone: '0751 333 4455',
    items: [
      {
        productId: 'prod-5',
        productName: 'تایت پەرسێل ئۆتۆماتیک (3KG)',
        unitType: 'carton',
        quantity: 1,
        quantityInUnits: 8,
        unitPrice: 80000,
        costPricePerUnit: 7500,
        total: 80000,
        totalCost: 60000,
      },
      {
        productId: 'prod-6',
        productName: 'ئاوی کانی سروشتی (500ml)',
        unitType: 'carton',
        quantity: 2,
        quantityInUnits: 48,
        unitPrice: 8400,
        costPricePerUnit: 200,
        total: 16800,
        totalCost: 9600,
      },
    ],
    totalAmount: 96800,
    totalCost: 69600,
    grossProfit: 27200,
    paidAmount: 26800,
    remainingAmount: 70000,
    notes: 'بۆ مارکێت',
    date: '2026-10-29T09:15:00.000Z',
  },
];

export const INITIAL_PAYMENTS: PaymentVoucher[] = [
  {
    id: 'pay-1',
    voucherNumber: 'REC-2026-0001',
    customerName: 'هاڤاڵ کاروان',
    amount: 50000,
    notes: 'قیستی یەکەم - وەرگیرا لە دەستی خۆی',
    date: '2026-10-28T17:00:00.000Z',
  },
];

/**
 * Exact replica of the screenshot dataset (Products A, B, C and customer Haval)
 * Table 1: Purchases = 1,562,500
 * Table 2: Warehouse Remaining = 1,270,000
 * Table 3: Sales = 6,050,000
 * Table 4: Payments = 4,850,000
 * Debt Card: 6,050,000 - 4,850,000 = 1,200,000
 */
export const SCREENSHOT_PRODUCTS: Product[] = [
  {
    id: 'prod-a',
    name: 'A',
    barcode: '62800000001',
    category: 'گشتی',
    costPricePerUnit: 1100,
    cartons: 20, // purchased 20, sold 0 => remaining 20
    unitsPerCarton: 25,
    totalUnits: 500, // 20 * 25
    sellingPricePerUnit: 20000,
    minStockThreshold: 10,
    createdAt: '2026-10-29T10:00:00.000Z',
    updatedAt: '2026-10-29T10:00:00.000Z',
  },
  {
    id: 'prod-b',
    name: 'B',
    barcode: '62800000002',
    category: 'گشتی',
    costPricePerUnit: 750,
    cartons: 10, // purchased 15, sold 5 => remaining 10
    unitsPerCarton: 50,
    totalUnits: 500, // 10 * 50
    sellingPricePerUnit: 20000,
    minStockThreshold: 10,
    createdAt: '2026-10-29T10:00:00.000Z',
    updatedAt: '2026-10-29T10:00:00.000Z',
  },
  {
    id: 'prod-c',
    name: 'C',
    barcode: '62800000003',
    category: 'گشتی',
    costPricePerUnit: 1500,
    cartons: 23, // purchased 30, sold 7 => remaining 23
    unitsPerCarton: 10,
    totalUnits: 230, // 23 * 10
    sellingPricePerUnit: 15000,
    minStockThreshold: 10,
    createdAt: '2026-10-29T10:00:00.000Z',
    updatedAt: '2026-10-29T10:00:00.000Z',
  },
];

export const SCREENSHOT_SALES: Sale[] = [
  {
    id: 'sale-ss-1',
    invoiceNumber: 'INV-2026-0001',
    customerName: 'کاک هەڤاڵ',
    customerPhone: '0750 000 0000',
    items: [
      {
        productId: 'prod-b',
        productName: 'B',
        unitType: 'carton',
        quantity: 5,
        quantityInUnits: 250, // 5 * 50
        unitPrice: 20000,
        costPricePerUnit: 750,
        total: 5000000, // 250 * 20000
        totalCost: 187500,
      },
      {
        productId: 'prod-c',
        productName: 'C',
        unitType: 'carton',
        quantity: 7,
        quantityInUnits: 70, // 7 * 10
        unitPrice: 15000,
        costPricePerUnit: 1500,
        total: 1050000, // 70 * 15000
        totalCost: 105000,
      },
    ],
    totalAmount: 6050000,
    totalCost: 292500,
    grossProfit: 5757500,
    paidAmount: 0,
    remainingAmount: 6050000,
    notes: 'فرۆشتنی کۆمەڵ بە کاک هەڤاڵ',
    date: '2026-10-29T10:30:00.000Z',
  },
];

export const SCREENSHOT_PAYMENTS: PaymentVoucher[] = [
  {
    id: 'pay-ss-1',
    voucherNumber: 'REC-2026-0001',
    customerName: 'کاک هەڤاڵ',
    amount: 150000,
    notes: 'وەرگرتن - بەشی یەکەم',
    date: '2026-10-29T11:00:00.000Z',
  },
  {
    id: 'pay-ss-2',
    voucherNumber: 'REC-2026-0002',
    customerName: 'کاک هەڤاڵ',
    amount: 200000,
    notes: 'وەرگرتن - بەشی دووەم',
    date: '2026-10-29T12:00:00.000Z',
  },
  {
    id: 'pay-ss-3',
    voucherNumber: 'REC-2026-0003',
    customerName: 'کاک هەڤاڵ',
    amount: 4500000,
    notes: 'وەرگرتن - بەشی سێیەم',
    date: '2026-10-29T13:00:00.000Z',
  },
];

