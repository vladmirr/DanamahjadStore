import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Product, Sale, PaymentVoucher, CustomerDebtSummary } from '../types';
import { PopcornProjectData, PopcornTransaction, PopcornTruck, PopcornExpense, PopcornStoreState } from '../types/popcorn';
import { loadLocalPopcornData, loadLocalPopcornStore, DEFAULT_TRANSACTION, fetchAllCloudTransactions } from '../services/popcornStorage';
import { formatShortDate } from './formatters';

interface ExportOptions {
  customerName?: string;
}

/**
 * Generate a styled multi-table single-sheet Excel file replicating the exact
 * 4-table layout:
 * - Table 1 (Far Right): کڕینی کاڵا (Purchases / Stock In)
 * - Table 2 (Center Right): کاڵای ماوە (مەخزەن) (Current Inventory Remaining)
 * - Table 3 (Center Left): لیستی فرۆشراوەکان (Sales List)
 * - Table 4 (Far Left): پارە وەرگرتن (Payments Collected)
 * - Summary Debt Card (Bottom Center): بڕی ماوە لای کڕیار
 */
export async function exportAllDataToExcel(
  products: Product[],
  sales: Sale[],
  payments: PaymentVoucher[],
  customers: CustomerDebtSummary[],
  options?: ExportOptions
) {
  // Determine customer context (default to primary customer e.g. Haval if available)
  let selectedCust = options?.customerName?.trim();
  if (!selectedCust) {
    if (customers.length > 0) {
      selectedCust = customers[0].name;
    } else {
      selectedCust = 'هەڤاڵ';
    }
  }

  // Friendly title display for customer: if name doesn't start with کاک, format nicely
  const custDisplayName = selectedCust.startsWith('کاک')
    ? selectedCust
    : `کاک ${selectedCust}`;

  // Filter sales and payments for customer if specific, or use all if matching
  const customerSales = sales.filter((s) =>
    s.customerName.toLowerCase().includes(selectedCust!.toLowerCase())
  );
  // If specific customer sales exist use them, otherwise use all sales
  const targetSales = customerSales.length > 0 ? customerSales : sales;

  // Flatten sold line items with accurate carton and units breakdown
  const salesItems = targetSales.flatMap((s) =>
    s.items.map((item) => {
      const prod = products.find(
        (p) => p.id === item.productId || p.name === item.productName
      );
      const unitsPerCarton =
        prod?.unitsPerCarton ||
        (item.unitType === 'carton' && item.quantity > 0
          ? Math.round(item.quantityInUnits / item.quantity)
          : 1);

      return {
        productName: item.productName,
        unitType: item.unitType,
        quantity: item.quantity,
        unitsPerCarton,
        quantityInUnits: item.quantityInUnits,
        unitPrice: item.unitPrice,
        total: item.total,
        date: formatShortDate(s.date),
        customerName: s.customerName,
        currency: s.currency || 'IQD',
      };
    })
  );

  // Customer payments (standalone vouchers + POS upfront down payments)
  const customerPaymentsList: Array<{ amount: number; date: string; currency: string }> = [];

  // Standalone vouchers for this customer
  payments
    .filter((p) =>
      p.customerName.toLowerCase().includes(selectedCust!.toLowerCase())
    )
    .forEach((p) => {
      customerPaymentsList.push({
        amount: p.amount,
        date: formatShortDate(p.date),
        currency: p.currency || 'IQD',
      });
    });

  // Upfront cash payments from sales for this customer
  targetSales
    .filter((s) => s.paidAmount > 0)
    .forEach((s) => {
      customerPaymentsList.push({
        amount: s.paidAmount,
        date: formatShortDate(s.date),
        currency: s.currency || 'IQD',
      });
    });

  // If no customer payments found, fallback to all payments
  if (customerPaymentsList.length === 0 && payments.length > 0) {
    payments.forEach((p) => {
      customerPaymentsList.push({
        amount: p.amount,
        date: formatShortDate(p.date),
        currency: p.currency || 'IQD',
      });
    });
  }

  // Create Workbook & Worksheet
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Dana Mahjad';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('ڕاپۆرتی گشتی', {
    views: [{ rightToLeft: true, rtl: true } as any],
    properties: { defaultRowHeight: 22 },
  });

  // Common Styles
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };

  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF2F2F2' }, // Light-gray header fill
  };

  const bannerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF2F2F2' },
  };

  const greenTotalFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC6EFCE' }, // Soft green
  };

  const redAlertFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC7CE' }, // Soft red / pink
  };

  const centerAlignment: Partial<ExcelJS.Alignment> = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true,
  };

  const rightAlignment: Partial<ExcelJS.Alignment> = {
    vertical: 'middle',
    horizontal: 'right',
  };

  // Helper to style a single cell
  const styleCell = (
    cell: ExcelJS.Cell,
    opts: {
      bold?: boolean;
      fontSize?: number;
      fill?: ExcelJS.Fill;
      border?: Partial<ExcelJS.Borders>;
      alignment?: Partial<ExcelJS.Alignment>;
      numFmt?: string;
      color?: string;
    }
  ) => {
    cell.font = {
      name: 'Calibri',
      size: opts.fontSize || 10,
      bold: !!opts.bold,
      color: opts.color ? { argb: opts.color } : { argb: 'FF000000' },
    };
    cell.border = opts.border || thinBorder;
    if (opts.fill) {
      cell.fill = opts.fill;
    }
    cell.alignment = opts.alignment || centerAlignment;
    if (opts.numFmt) {
      cell.numFmt = opts.numFmt;
    }
  };

  // Set explicit generous column widths
  const colWidths: Record<number, number> = {
    1: 6, // A: #
    2: 28, // B: ناوی کاڵا
    3: 12, // C: کارتۆن
    4: 12, // D: دانە
    5: 16, // E: کۆی گشتی دانە
    6: 18, // F: نرخی کڕینی دانە
    7: 22, // G: کۆی گشتی نرخی کڕین
    8: 14, // H: بەروار
    9: 3, // I: Spacer

    10: 6, // J: #
    11: 28, // K: کاڵا
    12: 12, // L: کارتۆن
    13: 12, // M: دانە
    14: 14, // N: کۆی دانە
    15: 16, // O: نرخ دانە
    16: 22, // P: کۆی گشتی
    17: 3, // Q: Spacer

    18: 6, // R: #
    19: 28, // S: کاڵا
    20: 12, // T: کارتۆن
    21: 12, // U: دانە
    22: 16, // V: کۆی گشتی دانە
    23: 16, // W: نرخی فرۆش
    24: 22, // X: کۆی گشتی
    25: 14, // Y: بەروار
    26: 3, // Z: Spacer

    27: 6, // AA: #
    28: 20, // AB: مەبلەغ
    29: 14, // AC: بەروار
  };

  Object.entries(colWidths).forEach(([colIndex, width]) => {
    worksheet.getColumn(Number(colIndex)).width = width;
  });

  // Row 2: Table Title Banners (Height 28)
  worksheet.getRow(2).height = 28;

  // Banner 1: کڕینی کاڵا (Cols A to H / 1 to 8)
  worksheet.mergeCells(2, 1, 2, 8);
  const banner1 = worksheet.getCell(2, 1);
  banner1.value = 'کڕینی کاڵا';
  styleCell(banner1, {
    bold: true,
    fontSize: 12,
    fill: bannerFill,
    border: thinBorder,
  });
  for (let c = 1; c <= 8; c++) {
    worksheet.getCell(2, c).border = thinBorder;
  }

  // Banner 2: کاڵای ماوە (مەخزەن) (Cols J to P / 10 to 16)
  worksheet.mergeCells(2, 10, 2, 16);
  const banner2 = worksheet.getCell(2, 10);
  banner2.value = 'کاڵای ماوە (مەخزەن)';
  styleCell(banner2, {
    bold: true,
    fontSize: 12,
    fill: bannerFill,
    border: thinBorder,
  });
  for (let c = 10; c <= 16; c++) {
    worksheet.getCell(2, c).border = thinBorder;
  }

  // Banner 3: لیستی فرۆشراوەکان (Cols R to Y / 18 to 25)
  worksheet.mergeCells(2, 18, 2, 25);
  const banner3 = worksheet.getCell(2, 18);
  banner3.value = 'لیستی فرۆشراوەکان';
  styleCell(banner3, {
    bold: true,
    fontSize: 12,
    fill: bannerFill,
    border: thinBorder,
  });
  for (let c = 18; c <= 25; c++) {
    worksheet.getCell(2, c).border = thinBorder;
  }

  // Banner 4: پارە وەرگرتن (Cols AA to AC / 27 to 29)
  worksheet.mergeCells(2, 27, 2, 29);
  const banner4 = worksheet.getCell(2, 27);
  banner4.value = `پارە وەرگرتن لە ${custDisplayName}`;
  styleCell(banner4, {
    bold: true,
    fontSize: 12,
    fill: bannerFill,
    border: thinBorder,
  });
  for (let c = 27; c <= 29; c++) {
    worksheet.getCell(2, c).border = thinBorder;
  }

  // Row 3: Column Headers (Height 24)
  worksheet.getRow(3).height = 24;

  const t1Headers = [
    '#',
    'ناوی کاڵا',
    'کارتۆن',
    'دانە',
    'کۆی گشتی دانە',
    'نرخی کڕینی دانە',
    'کۆی گشتی نرخی کڕین',
    'بەروار',
  ];
  t1Headers.forEach((text, i) => {
    const cell = worksheet.getCell(3, 1 + i);
    cell.value = text;
    styleCell(cell, { bold: true, fontSize: 10, fill: headerFill });
  });

  const t2Headers = [
    '#',
    'کاڵا',
    'کارتۆن',
    'دانە',
    'کۆی دانە',
    'نرخ دانە',
    'کۆی گشتی',
  ];
  t2Headers.forEach((text, i) => {
    const cell = worksheet.getCell(3, 10 + i);
    cell.value = text;
    styleCell(cell, { bold: true, fontSize: 10, fill: headerFill });
  });

  const t3Headers = [
    '#',
    'کاڵا',
    'کارتۆن',
    'دانە',
    'کۆی گشتی دانە',
    'نرخی فرۆش',
    'کۆی گشتی',
    'بەروار',
  ];
  t3Headers.forEach((text, i) => {
    const cell = worksheet.getCell(3, 18 + i);
    cell.value = text;
    styleCell(cell, { bold: true, fontSize: 10, fill: headerFill });
  });

  const t4Headers = ['#', 'مەبلەغ', 'بەروار'];
  t4Headers.forEach((text, i) => {
    const cell = worksheet.getCell(3, 27 + i);
    cell.value = text;
    styleCell(cell, { bold: true, fontSize: 10, fill: headerFill });
  });

  // Calculate maximum data rows across all 4 tables
  const maxRows = Math.max(
    products.length,
    salesItems.length,
    customerPaymentsList.length,
    1
  );

  const totalRow = 4 + maxRows;

  let totalPurchasesCost = 0;
  let totalRemainingStockValue = 0;
  let totalSalesAmount = 0;
  let totalPaymentsCollected = 0;

  // Populate Data Rows starting at Row 4
  for (let r = 0; r < maxRows; r++) {
    const rowNum = 4 + r;
    worksheet.getRow(rowNum).height = 20;

    // Table 1 Data (Purchases / Stock In)
    if (r < products.length) {
      const p = products[r];

      // Calculate total cartons sold of this product
      const soldCartonsOfProd = targetSales
        .flatMap((s) => s.items)
        .filter((i) => i.productId === p.id || i.productName === p.name)
        .reduce((sum, i) => {
          const c =
            i.unitType === 'carton'
              ? i.quantity
              : Math.round((i.quantityInUnits / (p.unitsPerCarton || 1)) * 100) / 100;
          return sum + c;
        }, 0);

      const remainingCartons = p.cartons;
      const purchasedCartons = remainingCartons + soldCartonsOfProd;
      const unitsPerCarton = p.unitsPerCarton || 1;
      const purchasedTotalUnits = purchasedCartons * unitsPerCarton;
      const purchaseCost = purchasedTotalUnits * p.costPricePerUnit;
      totalPurchasesCost += purchaseCost;
      const dateStr = formatShortDate(p.createdAt);

      styleCell(worksheet.getCell(rowNum, 1), { bold: false });
      worksheet.getCell(rowNum, 1).value = r + 1;

      styleCell(worksheet.getCell(rowNum, 2), {
        bold: false,
        alignment: rightAlignment,
      });
      worksheet.getCell(rowNum, 2).value = p.currency === 'USD' ? `${p.name} ($ USD)` : p.name;

      styleCell(worksheet.getCell(rowNum, 3), { numFmt: '#,##0' });
      worksheet.getCell(rowNum, 3).value = purchasedCartons;

      styleCell(worksheet.getCell(rowNum, 4), { numFmt: '#,##0' });
      worksheet.getCell(rowNum, 4).value = unitsPerCarton;

      styleCell(worksheet.getCell(rowNum, 5), { numFmt: '#,##0' });
      worksheet.getCell(rowNum, 5).value = {
        formula: `C${rowNum}*D${rowNum}`,
        result: purchasedTotalUnits,
      };

      const pCostFmt = p.currency === 'USD' ? '"$"#,##0.00' : '#,##0';
      styleCell(worksheet.getCell(rowNum, 6), { numFmt: pCostFmt });
      worksheet.getCell(rowNum, 6).value = p.costPricePerUnit;

      styleCell(worksheet.getCell(rowNum, 7), { numFmt: pCostFmt });
      worksheet.getCell(rowNum, 7).value = {
        formula: `E${rowNum}*F${rowNum}`,
        result: purchaseCost,
      };

      styleCell(worksheet.getCell(rowNum, 8), {});
      worksheet.getCell(rowNum, 8).value = dateStr;
    } else {
      // Empty padded cells with thin borders
      for (let c = 1; c <= 8; c++) {
        styleCell(worksheet.getCell(rowNum, c), {});
      }
    }

    // Table 2 Data (Current Inventory Remaining - کاڵای ماوە مەخزەن)
    if (r < products.length) {
      const p = products[r];
      const remainingCartons = p.cartons;
      const unitsPerCarton = p.unitsPerCarton || 1;
      const remainingTotalUnits = remainingCartons * unitsPerCarton;
      const remainingValue = remainingTotalUnits * p.costPricePerUnit;
      totalRemainingStockValue += remainingValue;

      styleCell(worksheet.getCell(rowNum, 10), {});
      worksheet.getCell(rowNum, 10).value = r + 1;

      styleCell(worksheet.getCell(rowNum, 11), { alignment: rightAlignment });
      worksheet.getCell(rowNum, 11).value = p.currency === 'USD' ? `${p.name} ($ USD)` : p.name;

      // Col L (12): Remaining Cartons = Purchased Cartons minus Sold Cartons
      styleCell(worksheet.getCell(rowNum, 12), { numFmt: '#,##0' });
      worksheet.getCell(rowNum, 12).value = {
        formula: `C${rowNum}-SUMIF(S$4:S$${totalRow - 1}, K${rowNum}, T$4:T$${totalRow - 1})`,
        result: remainingCartons,
      };

      // Col M (13): دانە (Units per carton) - MUST BE EQUAL TO Table 1 Col D!
      styleCell(worksheet.getCell(rowNum, 13), { numFmt: '#,##0' });
      worksheet.getCell(rowNum, 13).value = {
        formula: `D${rowNum}`,
        result: unitsPerCarton,
      };

      // Col N (14): کۆی دانە (Total Units Remaining = Cartons * Units per carton)
      styleCell(worksheet.getCell(rowNum, 14), { numFmt: '#,##0' });
      worksheet.getCell(rowNum, 14).value = {
        formula: `L${rowNum}*M${rowNum}`,
        result: remainingTotalUnits,
      };

      // Col O (15): نرخ دانە (Cost Price per unit)
      const pRemFmt = p.currency === 'USD' ? '"$"#,##0.00' : '#,##0';
      styleCell(worksheet.getCell(rowNum, 15), { numFmt: pRemFmt });
      worksheet.getCell(rowNum, 15).value = {
        formula: `F${rowNum}`,
        result: p.costPricePerUnit,
      };

      // Col P (16): کۆی گشتی (Total Stock Value = Total Units * Cost Price)
      styleCell(worksheet.getCell(rowNum, 16), { numFmt: pRemFmt });
      worksheet.getCell(rowNum, 16).value = {
        formula: `N${rowNum}*O${rowNum}`,
        result: remainingValue,
      };
    } else {
      for (let c = 10; c <= 16; c++) {
        styleCell(worksheet.getCell(rowNum, c), {});
      }
    }

    // Table 3 Data (Sales List - لیستی فرۆشراوەکان)
    if (r < salesItems.length) {
      const item = salesItems[r];
      totalSalesAmount += item.total;
      const cartonsSold =
        item.unitType === 'carton'
          ? item.quantity
          : Math.round((item.quantityInUnits / (item.unitsPerCarton || 1)) * 100) / 100;
      const unitsPerCarton = item.unitsPerCarton || 1;

      styleCell(worksheet.getCell(rowNum, 18), {});
      worksheet.getCell(rowNum, 18).value = r + 1;

      styleCell(worksheet.getCell(rowNum, 19), { alignment: rightAlignment });
      worksheet.getCell(rowNum, 19).value = item.currency === 'USD' ? `${item.productName} ($ USD)` : item.productName;

      // Col T (20): کارتۆن (Cartons sold)
      styleCell(worksheet.getCell(rowNum, 20), { numFmt: '#,##0.##' });
      worksheet.getCell(rowNum, 20).value = cartonsSold;

      // Col U (21): دانە (Units per carton)
      styleCell(worksheet.getCell(rowNum, 21), { numFmt: '#,##0' });
      worksheet.getCell(rowNum, 21).value = unitsPerCarton;

      // Col V (22): کۆی گشتی دانە (Total units sold = Cartons * Units per carton)
      styleCell(worksheet.getCell(rowNum, 22), { numFmt: '#,##0' });
      worksheet.getCell(rowNum, 22).value = {
        formula: `T${rowNum}*U${rowNum}`,
        result: item.quantityInUnits,
      };

      // Col W (23): نرخی فرۆش
      const saleFmt = item.currency === 'USD' ? '"$"#,##0.00' : '#,##0';
      styleCell(worksheet.getCell(rowNum, 23), { numFmt: saleFmt });
      worksheet.getCell(rowNum, 23).value = item.unitPrice;

      // Col X (24): کۆی گشتی فرۆش
      styleCell(worksheet.getCell(rowNum, 24), { numFmt: saleFmt });
      worksheet.getCell(rowNum, 24).value = {
        formula: `V${rowNum}*W${rowNum}`,
        result: item.total,
      };

      // Col Y (25): بەروار
      styleCell(worksheet.getCell(rowNum, 25), {});
      worksheet.getCell(rowNum, 25).value = item.date;
    } else {
      for (let c = 18; c <= 25; c++) {
        styleCell(worksheet.getCell(rowNum, c), {});
      }
    }

    // Table 4 Data (Payments Collected - پارە وەرگرتن)
    if (r < customerPaymentsList.length) {
      const pay = customerPaymentsList[r];
      totalPaymentsCollected += pay.amount;

      styleCell(worksheet.getCell(rowNum, 27), {});
      worksheet.getCell(rowNum, 27).value = r + 1;

      const payFmt = pay.currency === 'USD' ? '"$"#,##0.00' : '#,##0';
      styleCell(worksheet.getCell(rowNum, 28), { numFmt: payFmt });
      worksheet.getCell(rowNum, 28).value = pay.amount;

      styleCell(worksheet.getCell(rowNum, 29), {});
      worksheet.getCell(rowNum, 29).value = pay.date;
    } else {
      for (let c = 27; c <= 29; c++) {
        styleCell(worksheet.getCell(rowNum, c), {});
      }
    }
  }

  // Row for Totals (Row 4 + maxRows)
  worksheet.getRow(totalRow).height = 24;

  // Table 1 Total Row
  for (let c = 1; c <= 6; c++) {
    const cell = worksheet.getCell(totalRow, c);
    styleCell(cell, { bold: true });
    if (c === 2) cell.value = 'کۆی گشتی';
  }
  const t1TotalCell = worksheet.getCell(totalRow, 7);
  t1TotalCell.value = {
    formula: `SUM(G4:G${totalRow - 1})`,
    result: totalPurchasesCost,
  };
  styleCell(t1TotalCell, {
    bold: true,
    fontSize: 11,
    fill: greenTotalFill,
    numFmt: '#,##0',
  });
  styleCell(worksheet.getCell(totalRow, 8), {});

  // Table 2 Total Row
  for (let c = 10; c <= 15; c++) {
    const cell = worksheet.getCell(totalRow, c);
    styleCell(cell, { bold: true });
    if (c === 11) cell.value = 'کۆی گشتی';
  }
  const t2TotalCell = worksheet.getCell(totalRow, 16);
  t2TotalCell.value = {
    formula: `SUM(P4:P${totalRow - 1})`,
    result: totalRemainingStockValue,
  };
  styleCell(t2TotalCell, {
    bold: true,
    fontSize: 11,
    fill: greenTotalFill,
    numFmt: '#,##0',
  });

  // Table 3 Total Row
  for (let c = 18; c <= 23; c++) {
    const cell = worksheet.getCell(totalRow, c);
    styleCell(cell, { bold: true });
    if (c === 19) cell.value = 'کۆی گشتی';
  }
  const t3TotalCell = worksheet.getCell(totalRow, 24);
  t3TotalCell.value = {
    formula: `SUM(X4:X${totalRow - 1})`,
    result: totalSalesAmount,
  };
  styleCell(t3TotalCell, {
    bold: true,
    fontSize: 11,
    fill: greenTotalFill,
    numFmt: '#,##0',
  });
  styleCell(worksheet.getCell(totalRow, 25), {});

  // Table 4 Total Row
  styleCell(worksheet.getCell(totalRow, 27), { bold: true });
  worksheet.getCell(totalRow, 27).value = 'کۆ';
  const t4TotalCell = worksheet.getCell(totalRow, 28);
  t4TotalCell.value = {
    formula: `SUM(AB4:AB${totalRow - 1})`,
    result: totalPaymentsCollected,
  };
  styleCell(t4TotalCell, {
    bold: true,
    fontSize: 11,
    fill: greenTotalFill,
    numFmt: '#,##0',
  });
  styleCell(worksheet.getCell(totalRow, 29), {});

  // ==========================================
  // 3. Summary Debt Card (Bottom Center)
  // Directly below inventory/sales tables with 3 empty rows spacing
  // ==========================================
  const summaryRow = totalRow + 3;
  worksheet.getRow(summaryRow).height = 28;

  const remainingCustomerDebt = Math.max(
    0,
    totalSalesAmount - totalPaymentsCollected
  );

  // In RTL orientation:
  // Right Cell (Cols 13-14): Label "بڕی ماوە لای کاک ..."
  worksheet.mergeCells(summaryRow, 13, summaryRow, 14);
  const debtLabelCell = worksheet.getCell(summaryRow, 13);
  debtLabelCell.value = `بڕی ماوە لای ${custDisplayName}`;
  styleCell(debtLabelCell, {
    bold: true,
    fontSize: 11,
    fill: headerFill,
    border: thinBorder,
  });
  worksheet.getCell(summaryRow, 14).border = thinBorder;

  // Left Cell (Cols 15-16): Value "[کۆی گشتی فرۆشراو] - [کۆی پارەی وەرگیراو]"
  worksheet.mergeCells(summaryRow, 15, summaryRow, 16);
  const debtValueCell = worksheet.getCell(summaryRow, 15);
  debtValueCell.value = {
    formula: `X${totalRow}-AB${totalRow}`,
    result: remainingCustomerDebt,
  };
  styleCell(debtValueCell, {
    bold: true,
    fontSize: 12,
    fill: redAlertFill,
    numFmt: '#,##0',
    color: 'FF9C0006', // dark red alert text
    border: thinBorder,
  });
  worksheet.getCell(summaryRow, 16).border = thinBorder;

  // Generate buffer and trigger immediate download
  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().split('T')[0];
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `Dana_Mahjad_Report_${dateStr}.xlsx`
  );
}

/**
 * Append a dedicated Popcorn worksheet to any workbook (RTL, formatted with KPIs, Trucks, Expenses)
 */
/**
 * Render a single Popcorn transaction into an RTL worksheet
 */
function renderSinglePopcornWorksheet(
  workbook: ExcelJS.Workbook,
  data: PopcornProjectData | PopcornTransaction,
  sheetName: string
) {
  const { config, trucks, expenses } = data;

  const totalCargoTons = Number(config.totalTons) || 0;
  const buyPricePerTon = Number(config.buyPricePerTonUSD) || 0;
  const sellPricePerTon = Number(config.sellingPricePerTonUSD) || 0;
  const exchangeRate = Number(config.exchangeRateIQD) || 1530;

  const totalBuyingCost = totalCargoTons * buyPricePerTon;
  const expectedTotalRevenue = totalCargoTons * sellPricePerTon;

  const iranExpenses = expenses.filter((e) => e.region === 'iran');
  const iraqExpenses = expenses.filter((e) => e.region === 'iraq');
  const totalIranSpending = iranExpenses.reduce((acc, e) => acc + (Number(e.amountUSD) || 0), 0);
  const totalIraqSpending = iraqExpenses.reduce((acc, e) => acc + (Number(e.amountUSD) || 0), 0);
  const totalOperatingExpenses = totalIranSpending + totalIraqSpending;
  const totalOverallCost = totalBuyingCost + totalOperatingExpenses;
  const finalNetProfit = expectedTotalRevenue - totalOverallCost;

  const hasPartner = config.hasPartner !== false;
  const partnerPercent = hasPartner ? Number(config.partnerSharePercent) || 50 : 0;
  const myPercent = 100 - partnerPercent;
  const partnerProfitShare = hasPartner ? (finalNetProfit * partnerPercent) / 100 : 0;
  const myProfitShare = hasPartner ? (finalNetProfit * myPercent) / 100 : finalNetProfit;

  // Clean sheet name (Excel max length is 31 chars and no forbidden symbols)
  const cleanSheetName = (sheetName || 'مامەڵکردنی کاڵا')
    .replace(/[*?:/[\]]/g, '')
    .trim()
    .slice(0, 31);

  const ws = workbook.addWorksheet(cleanSheetName, {
    views: [{ rightToLeft: true }],
  });

  ws.columns = [
    { width: 28 }, // A: بڕگە / وەسف
    { width: 24 }, // B: بڕ بە دۆلار ($ USD)
    { width: 34 }, // C: تێبینی
    { width: 16 }, // D
    { width: 30 }, // E
    { width: 15 }, // F
    { width: 15 }, // G
    { width: 16 }, // H
    { width: 18 }, // I
    { width: 32 }, // J
  ];

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  // Title Banner
  const titleText = (data as PopcornTransaction).name
    ? `مامەڵەی: ${(data as PopcornTransaction).name}`
    : 'مامەڵکردنی کاڵا و شەراکەت';
  ws.addRow([titleText]);
  ws.mergeCells('A1:J1');
  const titleCell = ws.getCell('A1');
  titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 36;

  // Sub-banner
  ws.addRow([
    `کڕینی ${totalCargoTons} تۆن دانەوێڵە ${config.originCountry ? `لە ${config.originCountry} ` : ''}بە نرخی $${buyPricePerTon} ${
      sellPricePerTon > 0 ? `و فرۆشتن بە $${sellPricePerTon} ` : '(فرۆشتن: دیاری نەکراوە) '
    }لە ${config.destinationCity} ${
      hasPartner ? `(شەراکەت: %${partnerPercent} - ${config.partnerName})` : '(مامەڵەی تایبەت - بێ هاوبەش)'
    }`
  ]);
  ws.mergeCells('A2:J2');
  const subCell = ws.getCell('A2');
  subCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFF1F5F9' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 22;

  ws.addRow([]); // Blank row 3

  // SECTION 1: Financial Waterfall
  ws.addRow(['١. پوختەی دارایی مامەڵە (Buying Details & Selling Information)']);
  ws.mergeCells('A4:C4');
  const sec1Cell = ws.getCell('A4');
  sec1Cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  sec1Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
  sec1Cell.alignment = { horizontal: 'right', vertical: 'middle' };

  ws.addRow(['بڕگە / وەسف', 'بڕ بە دۆلار ($ USD)', 'تێبینی']);
  const h1 = ws.getRow(5);
  h1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  for (let c = 1; c <= 3; c++) {
    h1.getCell(c).border = thinBorder;
  }

  const kpis = [
    ['بڕی گشتی بار (تۆن)', `${totalCargoTons} تۆن`, config.originCountry ? `سەرچاوە: ${config.originCountry}` : `مەبەست: ${config.destinationCity}`],
    ['نرخی کڕینی ١ تۆن', `$${buyPricePerTon}`, 'نرخی کڕینی گرێبەست'],
    ['کۆی تێچووی کڕین (سەرمایە)', `$${totalBuyingCost.toLocaleString()}`, `${totalCargoTons} تۆن × $${buyPricePerTon}`],
    [
      'نرخی پێشبینیکراوی فرۆشتنی ١ تۆن',
      sellPricePerTon > 0 ? `$${sellPricePerTon}` : 'دیاری نەکراوە (None)',
      sellPricePerTon > 0 ? 'لە بازاڕی سلێمانی' : 'هێشتا نەفرۆشراوە',
    ],
    [
      'کۆی پێشبینیکراوی داهاتی فرۆش',
      sellPricePerTon > 0 ? `$${expectedTotalRevenue.toLocaleString()}` : '—',
      sellPricePerTon > 0 ? `${totalCargoTons} تۆن × $${sellPricePerTon}` : 'چاوەڕوانی فرۆشتن',
    ],
    ['خەرجییەکانی گواستنەوەی ئێران', `$${totalIranSpending.toLocaleString()}`, 'کرێی بارهەڵگر، مەرز و ترانزێت'],
    ['خەرجییەکانی ناوخۆی عێراق و گومرگ', `$${totalIraqSpending.toLocaleString()}`, 'گومرگی باشماخ، داگرتن و عەمبار'],
    ['کۆی گشتی هەموو خەرجییەکان', `$${totalOverallCost.toLocaleString()}`, 'کڕین + خەرجی ئێران + خەرجی عێراق'],
    [
      'قازانجی پوختەی مامەڵە (Net Profit)',
      sellPricePerTon > 0 ? `$${finalNetProfit.toLocaleString()}` : 'چاوەڕوانی فرۆشتن (Pending)',
      sellPricePerTon > 0 ? 'داهاتی فرۆش - سەرجەم خەرجییەکان' : 'دوای فرۆشتن دیاری دەکرێت',
    ],
    ...(hasPartner
      ? [
          [
            `پشکی هاوبەش (${config.partnerName} - %${partnerPercent})`,
            sellPricePerTon > 0 ? `$${partnerProfitShare.toLocaleString()}` : '—',
            'پوختەی قازانجی شەراکەت',
          ],
          [
            `پشکی من (%${myPercent})`,
            sellPricePerTon > 0 ? `$${myProfitShare.toLocaleString()}` : '—',
            'پوختەی قازانجی من',
          ],
        ]
      : [
          ['شەراکەت', 'مامەڵەی تایبەت (بێ هاوبەش)', '١٠٠٪ بۆ خاوەنکار'],
          [
            'قازانجی تەواوی من (١٠٠٪)',
            sellPricePerTon > 0 ? `$${myProfitShare.toLocaleString()}` : '—',
            'تەواوی قازانجی پوخت',
          ],
        ]),
  ];

  kpis.forEach((row, idx) => {
    const r = ws.addRow(row);
    const isHighlight = idx >= 8;
    r.font = { bold: isHighlight, size: 10 };
    if (isHighlight) {
      r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx === 8 ? 'FFDCFCE7' : 'FFFEF3C7' } };
    }
    for (let c = 1; c <= 3; c++) {
      r.getCell(c).border = thinBorder;
    }
  });

  ws.addRow([]); // Blank row

  // SECTION 2: Trucks Table
  ws.addRow(['٢. زانیاری بارهەڵگرەکان (Truck Information Log)']);
  ws.mergeCells(`A${ws.rowCount}:J${ws.rowCount}`);
  const sec2Cell = ws.getCell(`A${ws.rowCount}`);
  sec2Cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  sec2Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
  sec2Cell.alignment = { horizontal: 'right', vertical: 'middle' };

  const truckHeaders = [
    'ژمارەی تابلۆی بارهەڵگر',
    'ناوی شۆفێر',
    'بڕ بە تۆن',
    'شوێنی گەیندن / مەبەست',
    'بەرواری بارکردن',
    'تێبینی',
  ];
  const trkHeadRow = ws.addRow(truckHeaders);
  trkHeadRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  trkHeadRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  for (let c = 1; c <= 6; c++) {
    trkHeadRow.getCell(c).border = thinBorder;
  }

  let totalTruckTons = 0;

  trucks.forEach((t) => {
    const tons = Number(t.tonsCarried) || 0;
    totalTruckTons += tons;

    const r = ws.addRow([
      t.plateNumber,
      t.driverName,
      tons,
      t.destination || '—',
      t.dispatchDate,
      t.notes || '',
    ]);
    r.font = { size: 10 };
    for (let c = 1; c <= 6; c++) {
      r.getCell(c).border = thinBorder;
    }
  });

  // Trucks Total Row
  const trkTotalRow = ws.addRow([
    `کۆی گشتی (${trucks.length} بارهەڵگر)`,
    '—',
    totalTruckTons,
    '—',
    '—',
    `ماوە بۆ ${totalCargoTons} تۆن: ${Math.max(0, totalCargoTons - totalTruckTons)} تۆن`,
  ]);
  trkTotalRow.font = { bold: true, color: { argb: 'FF1E293B' } };
  trkTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
  for (let c = 1; c <= 6; c++) {
    trkTotalRow.getCell(c).border = thinBorder;
  }

  ws.addRow([]); // Blank row

  // =========================================================
  // SECTION 3: Iran Expenses Table (خەرجییەکانی ئێران)
  // =========================================================
  ws.addRow(['٣. خەرجییەکانی ئێران (Cost Iran Side - Transport, Border & Transit)']);
  ws.mergeCells(`A${ws.rowCount}:E${ws.rowCount}`);
  const sec3Cell = ws.getCell(`A${ws.rowCount}`);
  sec3Cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  sec3Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }; // Deep teal
  sec3Cell.alignment = { horizontal: 'right', vertical: 'middle' };

  const iranHeaders = [
    'ناونیشان / وەسفی خەرجی (ئێران)',
    'بڕ بە دۆلار ($ USD)',
    'بەروار',
    'دراوە لەلایەن',
    'تێبینی و پسوولە',
  ];
  const iranHeadRow = ws.addRow(iranHeaders);
  iranHeadRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  iranHeadRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  for (let c = 1; c <= 5; c++) {
    iranHeadRow.getCell(c).border = thinBorder;
  }

  if (iranExpenses.length === 0) {
    const emptyRow = ws.addRow(['هیچ خەرجییەکی ئێران تۆمار نەکراوە', 0, '—', '—', '—']);
    emptyRow.font = { italic: true, size: 10, color: { argb: 'FF94A3B8' } };
    for (let c = 1; c <= 5; c++) {
      emptyRow.getCell(c).border = thinBorder;
      if (c === 2) emptyRow.getCell(c).numFmt = '"$"#,##0';
    }
  } else {
    iranExpenses.forEach((e) => {
      const payerText = e.paidBy === 'partner' ? 'شەریک / هاوبەش' : e.paidBy === 'me' ? 'لەلایەن منەوە' : 'هاوبەش';
      const r = ws.addRow([
        e.title || e.category || 'خەرجی ئێران',
        Number(e.amountUSD) || 0,
        e.date || '—',
        payerText,
        e.notes || '',
      ]);
      r.font = { size: 10 };
      for (let c = 1; c <= 5; c++) {
        r.getCell(c).border = thinBorder;
        if (c === 2) r.getCell(c).numFmt = '"$"#,##0';
      }
    });
  }

  // Iran Expenses Subtotal Row
  const iranTotalRow = ws.addRow([
    `کۆی خەرجییەکانی ئێران (${iranExpenses.length} خەرجی)`,
    totalIranSpending,
    '—',
    '—',
    '—',
  ]);
  iranTotalRow.font = { bold: true, color: { argb: 'FF1E293B' } };
  iranTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFBF1' } };
  for (let c = 1; c <= 5; c++) {
    iranTotalRow.getCell(c).border = thinBorder;
    if (c === 2) iranTotalRow.getCell(c).numFmt = '"$"#,##0';
  }

  ws.addRow([]); // Blank row between the two tables

  // =========================================================
  // SECTION 4: Iraq Expenses Table (خەرجییەکانی عێراق)
  // =========================================================
  ws.addRow(['٤. خەرجییەکانی ناوخۆی عێراق و گومرگ (Cost Iraq Side - Customs & Clearance)']);
  ws.mergeCells(`A${ws.rowCount}:E${ws.rowCount}`);
  const sec4Cell = ws.getCell(`A${ws.rowCount}`);
  sec4Cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  sec4Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }; // Deep blue
  sec4Cell.alignment = { horizontal: 'right', vertical: 'middle' };

  const iraqHeaders = [
    'ناونیشان / وەسفی خەرجی (عێراق)',
    'بڕ بە دۆلار ($ USD)',
    'بەروار',
    'دراوە لەلایەن',
    'تێبینی و پسوولە',
  ];
  const iraqHeadRow = ws.addRow(iraqHeaders);
  iraqHeadRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  iraqHeadRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  for (let c = 1; c <= 5; c++) {
    iraqHeadRow.getCell(c).border = thinBorder;
  }

  if (iraqExpenses.length === 0) {
    const emptyRow = ws.addRow(['هیچ خەرجییەکی عێراق تۆمار نەکراوە', 0, '—', '—', '—']);
    emptyRow.font = { italic: true, size: 10, color: { argb: 'FF94A3B8' } };
    for (let c = 1; c <= 5; c++) {
      emptyRow.getCell(c).border = thinBorder;
      if (c === 2) emptyRow.getCell(c).numFmt = '"$"#,##0';
    }
  } else {
    iraqExpenses.forEach((e) => {
      const payerText = e.paidBy === 'partner' ? 'شەریک / هاوبەش' : e.paidBy === 'me' ? 'لەلایەن منەوە' : 'هاوبەش';
      const r = ws.addRow([
        e.title || e.category || 'خەرجی عێراق',
        Number(e.amountUSD) || 0,
        e.date || '—',
        payerText,
        e.notes || '',
      ]);
      r.font = { size: 10 };
      for (let c = 1; c <= 5; c++) {
        r.getCell(c).border = thinBorder;
        if (c === 2) r.getCell(c).numFmt = '"$"#,##0';
      }
    });
  }

  // Iraq Expenses Subtotal Row
  const iraqTotalRow = ws.addRow([
    `کۆی خەرجییەکانی عێراق (${iraqExpenses.length} خەرجی)`,
    totalIraqSpending,
    '—',
    '—',
    '—',
  ]);
  iraqTotalRow.font = { bold: true, color: { argb: 'FF1E293B' } };
  iraqTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
  for (let c = 1; c <= 5; c++) {
    iraqTotalRow.getCell(c).border = thinBorder;
    if (c === 2) iraqTotalRow.getCell(c).numFmt = '"$"#,##0';
  }

  ws.addRow([]); // Blank row

  // Overall Combined Total Row (Iran + Iraq)
  const combinedTotalRow = ws.addRow([
    `کۆی گشتی سەرجەم خەرجییەکان (ئێران + عێراق: ${expenses.length} خەرجی)`,
    totalOperatingExpenses,
    '—',
    '—',
    '—',
  ]);
  combinedTotalRow.font = { bold: true, color: { argb: 'FF0F172A' }, size: 10 };
  combinedTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Warm gold
  for (let c = 1; c <= 5; c++) {
    combinedTotalRow.getCell(c).border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
    if (c === 2) combinedTotalRow.getCell(c).numFmt = '"$"#,##0';
  }

  return ws;
}

/**
 * Safe sheet name generator that conforms to Excel worksheet rules:
 * - Max 31 characters
 * - No forbidden characters: \ / ? * : [ ]
 * - Unique across workbook
 */
function getUniqueSheetName(workbook: ExcelJS.Workbook, desiredName: string): string {
  const sanitized = desiredName.replace(/[*?:/[\]]/g, '').trim().slice(0, 26) || 'مامەڵە';
  let name = sanitized;
  let counter = 1;
  while (workbook.getWorksheet(name)) {
    name = `${sanitized.slice(0, 22)} (${counter++})`;
  }
  return name;
}

/**
 * Render an Overview Summary Worksheet comparing all deals/transactions side-by-side
 */
export function renderPopcornSummaryWorksheet(
  workbook: ExcelJS.Workbook,
  transactions: PopcornTransaction[]
) {
  const ws = workbook.addWorksheet('پوختەی سەرجەم مامەڵەکان', {
    views: [{ rightToLeft: true }],
  });

  ws.columns = [
    { width: 8 },  // A: #
    { width: 26 }, // B: ناوی مامەڵە
    { width: 16 }, // C: بڕی بار (تۆن)
    { width: 16 }, // D: نرخی کڕین ($)
    { width: 16 }, // E: نرخی فرۆشتن ($)
    { width: 20 }, // F: سەرمایەی کڕین ($)
    { width: 22 }, // G: داهاتی فرۆشتن ($)
    { width: 18 }, // H: خەرجی ئێران ($)
    { width: 18 }, // I: خەرجی عێراق ($)
    { width: 20 }, // J: کۆی خەرجییەکان ($)
    { width: 20 }, // K: کۆی تێچووی گشتی ($)
    { width: 22 }, // L: قازانجی پوختە ($)
    { width: 24 }, // M: شەراکەت
    { width: 18 }, // N: پشکی من ($)
    { width: 18 }, // O: پشکی هاوبەش ($)
    { width: 18 }, // P: مەبەست
  ];

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  // Row 1: Title Banner
  ws.addRow(['پوختەی دارایی سەرجەم مامەڵەکان (All Transactions Overview)']);
  ws.mergeCells('A1:P1');
  const titleCell = ws.getCell('A1');
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 36;

  // Row 2: Subtitle
  ws.addRow([
    `کۆی ${transactions.length} مامەڵەی هاوردەکراو - شیتە جیاوازەکان لە خوارەوە بە تەواوی وردەکارییەوە بەردەستن`
  ]);
  ws.mergeCells('A2:P2');
  const subCell = ws.getCell('A2');
  subCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFF1F5F9' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 22;

  // Row 3: Blank
  ws.addRow([]);

  // Row 4: Header row
  const headers = [
    '#',
    'ناوی مامەڵە',
    'بڕی بار (تۆن)',
    'نرخی کڕین ($)',
    'نرخی فرۆشتن ($)',
    'سەرمایەی کڕین ($)',
    'داهاتی پێشبینیکراو ($)',
    'خەرجی ئێران ($)',
    'خەرجی عێراق ($)',
    'کۆی خەرجییەکان ($)',
    'کۆی تێچووی گشتی ($)',
    'قازانجی پوختە (Net)',
    'شەراکەت',
    'پشکی من ($)',
    'پشکی هاوبەش ($)',
    'مەبەست',
  ];
  ws.addRow(headers);
  const hRow = ws.getRow(4);
  hRow.height = 28;
  hRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  for (let c = 1; c <= headers.length; c++) {
    const cell = hRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  }

  let sumTons = 0;
  let sumBuyingCost = 0;
  let sumRevenue = 0;
  let sumIranExpenses = 0;
  let sumIraqExpenses = 0;
  let sumTotalExpenses = 0;
  let sumOverallCost = 0;
  let sumNetProfit = 0;
  let sumMyShare = 0;
  let sumPartnerShare = 0;

  transactions.forEach((trans, idx) => {
    const cfg = trans.config || ({} as any);
    const tons = Number(cfg.totalTons) || 0;
    const buyPrice = Number(cfg.buyPricePerTonUSD) || 0;
    const sellPrice = Number(cfg.sellingPricePerTonUSD) || 0;
    const hasSellingPrice = sellPrice > 0;
    const buyingCost = tons * buyPrice;
    const revenue = hasSellingPrice ? tons * sellPrice : 0;

    const truckTransit = (trans.trucks || []).reduce(
      (sum, tr) => sum + (Number(tr.transitCostUSD) || 0),
      0
    );
    const iranExp =
      (trans.expenses || [])
        .filter((e) => e.region === 'iran')
        .reduce((sum, e) => sum + (Number(e.amountUSD) || 0), 0) + truckTransit;

    const iraqExp = (trans.expenses || [])
      .filter((e) => e.region === 'iraq')
      .reduce((sum, e) => sum + (Number(e.amountUSD) || 0), 0);

    const totalExp = iranExp + iraqExp;
    const overallCost = buyingCost + totalExp;
    const netProfit = hasSellingPrice ? revenue - overallCost : 0;

    const hasPartner = cfg.hasPartner !== false;
    const partnerPercent = hasPartner ? Number(cfg.partnerSharePercent) || 50 : 0;
    const myPercent = 100 - partnerPercent;
    const partnerShare = hasPartner && hasSellingPrice ? (netProfit * partnerPercent) / 100 : 0;
    const myShare = hasSellingPrice ? (hasPartner ? (netProfit * myPercent) / 100 : netProfit) : 0;

    sumTons += tons;
    sumBuyingCost += buyingCost;
    if (hasSellingPrice) {
      sumRevenue += revenue;
      sumNetProfit += netProfit;
      sumMyShare += myShare;
      sumPartnerShare += partnerShare;
    }
    sumIranExpenses += iranExp;
    sumIraqExpenses += iraqExp;
    sumTotalExpenses += totalExp;
    sumOverallCost += overallCost;

    const partnerLabel = hasPartner
      ? `%${partnerPercent} (${cfg.partnerName || 'هاوبەش'})`
      : 'بێ هاوبەش (تایبەت)';

    const rowValues = [
      idx + 1,
      trans.name || `مامەڵەی ${idx + 1}`,
      tons,
      buyPrice,
      hasSellingPrice ? sellPrice : 'دیاری نەکراوە (None)',
      buyingCost,
      hasSellingPrice ? revenue : '—',
      iranExp,
      iraqExp,
      totalExp,
      overallCost,
      hasSellingPrice ? netProfit : 'چاوەڕوانی فرۆشتن',
      partnerLabel,
      hasSellingPrice ? myShare : '—',
      hasSellingPrice ? partnerShare : '—',
      cfg.destinationCity || 'سلێمانی',
    ];

    ws.addRow(rowValues);
    const rIdx = 4 + idx + 1;
    const row = ws.getRow(rIdx);
    row.height = 24;
    const isEven = idx % 2 === 0;
    const bgArgb = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    for (let c = 1; c <= headers.length; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.font = { name: 'Arial', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: c === 2 ? 'right' : 'center' };

      // Number formatting
      if (c === 3) {
        cell.numFmt = '#,##0.00';
      } else if (c === 4) {
        cell.numFmt = '"$"#,##0';
      } else if (c === 5) {
        if (hasSellingPrice) {
          cell.numFmt = '"$"#,##0';
        } else {
          cell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
        }
      } else if ([6, 8, 9, 10, 11].includes(c)) {
        cell.numFmt = '"$"#,##0';
      } else if ([7, 14, 15].includes(c)) {
        if (hasSellingPrice) {
          cell.numFmt = '"$"#,##0';
        } else {
          cell.font = { name: 'Arial', size: 10, color: { argb: 'FF94A3B8' } };
        }
      }

      // Net profit color
      if (c === 12) {
        if (hasSellingPrice) {
          cell.numFmt = '"$"#,##0;[Red]("$"#,##0);"-"';
          cell.font = {
            name: 'Arial',
            size: 10,
            bold: true,
            color: { argb: netProfit >= 0 ? 'FF059669' : 'FFE11D48' },
          };
        } else {
          cell.font = {
            name: 'Arial',
            size: 9,
            italic: true,
            color: { argb: 'FF64748B' },
          };
        }
      }
    }
  });

  // Total Summary Row
  const totalRowValues = [
    'کۆی گشتی',
    `${transactions.length} مامەڵە`,
    sumTons,
    '—',
    '—',
    sumBuyingCost,
    sumRevenue,
    sumIranExpenses,
    sumIraqExpenses,
    sumTotalExpenses,
    sumOverallCost,
    sumNetProfit,
    '—',
    sumMyShare,
    sumPartnerShare,
    '—',
  ];
  ws.addRow(totalRowValues);
  const totRowIdx = 4 + transactions.length + 1;
  const totRow = ws.getRow(totRowIdx);
  totRow.height = 30;
  for (let c = 1; c <= headers.length; c++) {
    const cell = totRow.getCell(c);
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // warm amber gold
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };

    if (c === 3) {
      cell.numFmt = '#,##0.00';
    } else if ([6, 7, 8, 9, 10, 11, 14, 15].includes(c)) {
      cell.numFmt = '"$"#,##0';
    } else if (c === 12) {
      cell.numFmt = '"$"#,##0;[Red]("$"#,##0);"-"';
      cell.font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: sumNetProfit >= 0 ? 'FF047857' : 'FFBE123C' },
      };
    }
  }

  return ws;
}

/**
 * Append dedicated Popcorn worksheet(s) to any workbook
 */
export function appendPopcornSheetToWorkbook(
  workbook: ExcelJS.Workbook,
  customData?: PopcornProjectData | PopcornTransaction | PopcornTransaction[] | PopcornStoreState
) {
  if (Array.isArray(customData)) {
    if (customData.length === 1) {
      renderSinglePopcornWorksheet(workbook, customData[0], customData[0].name || 'مامەڵکردنی کاڵا');
    } else if (customData.length > 1) {
      renderPopcornSummaryWorksheet(workbook, customData);
      customData.forEach((trans, idx) => {
        const title = getUniqueSheetName(workbook, `${idx + 1}. ${trans.name || 'مامەڵە'}`);
        renderSinglePopcornWorksheet(workbook, trans, title);
      });
    }
    return;
  }

  if (customData && (customData as PopcornStoreState).transactions) {
    const list = (customData as PopcornStoreState).transactions;
    if (list.length === 1) {
      renderSinglePopcornWorksheet(workbook, list[0], list[0].name || 'مامەڵکردنی کاڵا');
    } else if (list.length > 1) {
      renderPopcornSummaryWorksheet(workbook, list);
      list.forEach((trans, idx) => {
        const title = getUniqueSheetName(workbook, `${idx + 1}. ${trans.name || 'مامەڵە'}`);
        renderSinglePopcornWorksheet(workbook, trans, title);
      });
    }
    return;
  }

  if (customData) {
    const name = (customData as PopcornTransaction).name || 'مامەڵکردنی کاڵا';
    renderSinglePopcornWorksheet(workbook, customData as PopcornTransaction, name);
    return;
  }

  const store = loadLocalPopcornStore();
  if (store.transactions.length <= 1) {
    const single = store.transactions[0] || DEFAULT_TRANSACTION;
    renderSinglePopcornWorksheet(workbook, single, single.name || 'مامەڵکردنی کاڵا');
  } else {
    renderPopcornSummaryWorksheet(workbook, store.transactions);
    store.transactions.forEach((trans, idx) => {
      const sheetTitle = getUniqueSheetName(workbook, `${idx + 1}. ${trans.name || 'مامەڵە'}`);
      renderSinglePopcornWorksheet(workbook, trans, sheetTitle);
    });
  }
}

/**
 * Export standalone Popcorn Excel report
 */
export async function exportPopcornToExcel(
  data?: PopcornProjectData | PopcornTransaction | PopcornTransaction[] | PopcornStoreState,
  options?: {
    singleOnly?: boolean;
    allTransactions?: PopcornTransaction[];
  }
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Dana Mahjad';
  workbook.created = new Date();

  const dateStr = new Date().toISOString().split('T')[0];

  // 1. Explicit Single Transaction Export
  if (options?.singleOnly && data && !Array.isArray(data) && !(data as PopcornStoreState).transactions) {
    const trans = data as PopcornTransaction;
    const sheetName = trans.name || 'مامەڵکردنی کاڵا';
    renderSinglePopcornWorksheet(workbook, trans, sheetName);

    const buffer = await workbook.xlsx.writeBuffer();
    const cleanName = (sheetName || 'Mamala').replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_');
    saveAs(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `Mamala_${cleanName}_${dateStr}.xlsx`
    );
    return;
  }

  // 2. Multi-Transaction Export (includes all transactions from memory, options, or Firestore)
  let transactions: PopcornTransaction[] = [];

  if (Array.isArray(data)) {
    transactions = data;
  } else if (data && (data as PopcornStoreState).transactions) {
    transactions = (data as PopcornStoreState).transactions;
  } else if (options?.allTransactions && options.allTransactions.length > 0) {
    transactions = options.allTransactions;
  } else {
    // Fetch live from Cloud Firestore to ensure all devices/transactions are captured
    transactions = await fetchAllCloudTransactions();
  }

  if (transactions.length <= 1) {
    const single = transactions[0] || (data as PopcornTransaction) || DEFAULT_TRANSACTION;
    renderSinglePopcornWorksheet(workbook, single, single.name || 'مامەڵکردنی کاڵا');
  } else {
    // Top-level comparison table for all transactions
    renderPopcornSummaryWorksheet(workbook, transactions);

    // Dedicated sheet for every single transaction
    transactions.forEach((trans, idx) => {
      const sheetTitle = getUniqueSheetName(workbook, `${idx + 1}. ${trans.name || 'مامەڵە'}`);
      renderSinglePopcornWorksheet(workbook, trans, sheetTitle);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `Mamalakan_${dateStr}.xlsx`
  );
}

/**
 * Export Drivers & Trucks log specifically to Excel
 */
export async function exportTrucksToExcel(
  trucks: PopcornTruck[],
  transactionName: string = 'مامەڵە'
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Dana Mahjad';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('بارهەڵگرەکان و شۆفێران', {
    views: [{ rightToLeft: true }],
  });

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  };

  // Title Banner
  const titleRow = ws.addRow([`تۆماری زانیاری شۆفێران و بارهەڵگرەکان - ${transactionName}`]);
  ws.mergeCells('A1:I1');
  titleRow.height = 34;
  const titleCell = ws.getCell('A1');
  titleCell.font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Subtitle info row
  const infoRow = ws.addRow([
    `کۆی بارهەڵگرەکان: ${trucks.length} بار | بەرواری دەرهێنان: ${new Date().toISOString().split('T')[0]}`,
  ]);
  ws.mergeCells('A2:I2');
  infoRow.height = 22;
  const infoCell = ws.getCell('A2');
  infoCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
  infoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  infoCell.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.addRow([]); // Blank line

  // Column Headers
  const headers = [
    'ڕیزبەندی',
    'ژمارەی تابلۆی بارهەڵگر',
    'ناوی شۆفێر',
    'ژمارەی مۆبایل',
    'بڕی بار (تۆن)',
    'شوێنی گەیاندن / مەبەست',
    'بەرواری بارکردن',
    'دۆخی بار',
    'تێبینی',
  ];

  const headRow = ws.addRow(headers);
  headRow.height = 26;
  headRow.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  headRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  headRow.alignment = { horizontal: 'center', vertical: 'middle' };

  for (let c = 1; c <= headers.length; c++) {
    headRow.getCell(c).border = thinBorder;
  }

  // Populate Truck Rows
  let totalTons = 0;
  trucks.forEach((trk, idx) => {
    const tons = Number(trk.tonsCarried) || 0;
    totalTons += tons;

    const statusLabel =
      trk.status === 'delivered'
        ? 'گەیشتووە'
        : trk.status === 'at_border'
        ? 'لە سنورە'
        : 'لە ڕێگایە';

    const row = ws.addRow([
      idx + 1,
      trk.plateNumber || '—',
      trk.driverName || '—',
      trk.driverPhone || '—',
      tons,
      trk.destination || 'سلێمانی',
      trk.dispatchDate || '—',
      statusLabel,
      trk.notes || '',
    ]);
    row.height = 22;
    row.font = { name: 'Calibri', size: 10 };

    if (idx % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    }

    for (let c = 1; c <= headers.length; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      if ([1, 2, 4, 5, 7, 8].includes(c)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    }
  });

  // Summary Row at Bottom
  const summaryRow = ws.addRow([
    'کۆی گشتی',
    `${trucks.length} بارهەڵگر`,
    '—',
    '—',
    totalTons,
    '—',
    '—',
    '—',
    '',
  ]);
  summaryRow.height = 26;
  summaryRow.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF0F172A' } };
  summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
  for (let c = 1; c <= headers.length; c++) {
    const cell = summaryRow.getCell(c);
    cell.border = thinBorder;
    if ([1, 2, 4, 5, 7, 8].includes(c)) {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
  }

  // Auto-fit column widths
  ws.columns = [
    { width: 10 },
    { width: 22 },
    { width: 24 },
    { width: 18 },
    { width: 16 },
    { width: 24 },
    { width: 18 },
    { width: 16 },
    { width: 30 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().split('T')[0];
  const cleanName = transactionName.replace(/[/\\?%*:|"<>]/g, '_');
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `Barhalgrakany_${cleanName}_${dateStr}.xlsx`
  );
}

/**
 * Export Expenses specifically to Excel featuring two distinct tables:
 * 1. Table for Iran Expenses (خەرجییەکانی ئێران)
 * 2. Table for Iraq Expenses (خەرجییەکانی عێراق)
 */
export async function exportExpensesToExcel(
  expenses: PopcornExpense[],
  transactionName: string = 'مامەڵە'
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Dana Mahjad';
  workbook.created = new Date();

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  };

  const iranExpenses = expenses.filter((e) => e.region === 'iran');
  const iraqExpenses = expenses.filter((e) => e.region === 'iraq');

  const totalIranUSD = iranExpenses.reduce((acc, e) => acc + (Number(e.amountUSD) || 0), 0);
  const totalIranLocal = iranExpenses.reduce((acc, e) => acc + (Number(e.amountLocal) || 0), 0);

  const totalIraqUSD = iraqExpenses.reduce((acc, e) => acc + (Number(e.amountUSD) || 0), 0);
  const totalIraqLocal = iraqExpenses.reduce((acc, e) => acc + (Number(e.amountLocal) || 0), 0);

  const totalOverallUSD = totalIranUSD + totalIraqUSD;

  // ---------------------------------------------------------
  // MAIN SHEET: BOTH TABLES (TWO DISTINCT TABLES ON ONE SHEET)
  // ---------------------------------------------------------
  const ws = workbook.addWorksheet('خەرجییەکان (دوو خشتە)', {
    views: [{ rightToLeft: true }],
  });

  // Main Page Header
  const titleRow = ws.addRow([`تۆماری خەرجییەکانی ئێران و عێراق - ${transactionName}`]);
  ws.mergeCells('A1:H1');
  titleRow.height = 34;
  const titleCell = ws.getCell('A1');
  titleCell.font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Subtitle info
  const infoRow = ws.addRow([
    `کۆی گشتی هەردوو لق: $${totalOverallUSD.toLocaleString()} USD | ئێران: $${totalIranUSD.toLocaleString()} | عێراق: $${totalIraqUSD.toLocaleString()} | بەروار: ${new Date().toISOString().split('T')[0]}`,
  ]);
  ws.mergeCells('A2:H2');
  infoRow.height = 22;
  const infoCell = ws.getCell('A2');
  infoCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
  infoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  infoCell.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.addRow([]); // Blank row

  // Helper to render an expense table
  const renderExpenseTable = (
    sheet: ExcelJS.Worksheet,
    title: string,
    bannerColor: string,
    tableExpenses: PopcornExpense[],
    localCurrencyName: string,
    subtotalUSD: number,
    subtotalLocal: number
  ) => {
    // Section Title
    const secRow = sheet.addRow([title]);
    const startRowIdx = sheet.rowCount;
    sheet.mergeCells(`A${startRowIdx}:H${startRowIdx}`);
    secRow.height = 28;
    const secCell = sheet.getCell(`A${startRowIdx}`);
    secCell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    secCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bannerColor } };
    secCell.alignment = { horizontal: 'right', vertical: 'middle' };

    // Headers
    const headers = [
      'ڕیزبەندی',
      'ناونیشانی خەرجی',
      'بڕ بە دۆلار ($ USD)',
      `بڕ بە دراو (${localCurrencyName})`,
      `نرخی گۆڕینەوە / صەرف`,
      'بەروار',
      'دراوە لەلایەن',
      'تێبینی و پسوولە',
    ];
    const headRow = sheet.addRow(headers);
    headRow.height = 24;
    headRow.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    headRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    headRow.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let c = 1; c <= headers.length; c++) {
      headRow.getCell(c).border = thinBorder;
    }

    if (tableExpenses.length === 0) {
      const emptyRow = sheet.addRow(['هیچ خەرجییەک لەم بەشەدا تۆمار نەکراوە', '', '', '', '', '', '', '']);
      const emptyRowIdx = sheet.rowCount;
      sheet.mergeCells(`A${emptyRowIdx}:H${emptyRowIdx}`);
      emptyRow.height = 24;
      const emptyCell = sheet.getCell(`A${emptyRowIdx}`);
      emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
      emptyCell.font = { name: 'Calibri', italic: true, size: 10, color: { argb: 'FF94A3B8' } };
      for (let c = 1; c <= headers.length; c++) {
        emptyRow.getCell(c).border = thinBorder;
      }
    } else {
      tableExpenses.forEach((item, idx) => {
        const usd = Number(item.amountUSD) || 0;
        const local = Number(item.amountLocal) || 0;
        const rate = Number(item.exchangeRate) || 0;
        const payer =
          item.paidBy === 'partner'
            ? 'شەریک / هاوبەش'
            : item.paidBy === 'me'
            ? 'لەلایەن منەوە'
            : 'هاوبەش';

        const row = sheet.addRow([
          idx + 1,
          item.title || (item.region === 'iran' ? 'خەرجی ئێران' : 'خەرجی عێراق'),
          usd,
          local > 0 ? local : '—',
          rate > 0 ? rate : '—',
          item.date || '—',
          payer,
          item.notes || '',
        ]);
        row.height = 22;
        row.font = { name: 'Calibri', size: 10 };

        if (idx % 2 === 1) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }

        for (let c = 1; c <= headers.length; c++) {
          const cell = row.getCell(c);
          cell.border = thinBorder;
          if ([1, 3, 4, 5, 6, 7].includes(c)) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          }
        }
      });
    }

    // Subtotal Row
    const totalRow = sheet.addRow([
      'کۆی گشتی ئەم لقە',
      `${tableExpenses.length} خەرجی تۆمارکراو`,
      subtotalUSD,
      subtotalLocal > 0 ? subtotalLocal : '—',
      '—',
      '—',
      '—',
      '',
    ]);
    totalRow.height = 26;
    totalRow.font = { name: 'Calibri', bold: true, size: 10.5, color: { argb: 'FF0F172A' } };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Light amber
    for (let c = 1; c <= headers.length; c++) {
      const cell = totalRow.getCell(c);
      cell.border = thinBorder;
      if ([1, 3, 4, 5, 6, 7].includes(c)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    }
  };

  // 1. RENDER IRAN TABLE
  renderExpenseTable(
    ws,
    '١. خەرجییەکانی لقی ئێران و ترانزێت (Cost Iran Side)',
    'FFD97706', // Warm Amber/Orange
    iranExpenses,
    'تمەن',
    totalIranUSD,
    totalIranLocal
  );

  ws.addRow([]); // Blank line separator
  ws.addRow([]); // Blank line separator

  // 2. RENDER IRAQ TABLE
  renderExpenseTable(
    ws,
    '٢. خەرجییەکانی ناوخۆی عێراق و گومرگ (Cost Iraq Side)',
    'FF0D9488', // Teal/Cyan
    iraqExpenses,
    'دینار',
    totalIraqUSD,
    totalIraqLocal
  );

  ws.addRow([]); // Blank line separator

  // GRAND TOTAL CARD (Combined)
  const grandTotalRow = ws.addRow([
    'کۆی گشتی هەردوو لق (ئێران + عێراق)',
    'سەرجەم خەرجییەکان',
    totalOverallUSD,
    '—',
    '—',
    '—',
    '—',
    `ئێران: $${totalIranUSD.toLocaleString()} | عێراق: $${totalIraqUSD.toLocaleString()}`,
  ]);
  grandTotalRow.height = 30;
  grandTotalRow.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FF065F46' } };
  grandTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // Light Emerald
  for (let c = 1; c <= 8; c++) {
    const cell = grandTotalRow.getCell(c);
    cell.border = thinBorder;
    if ([1, 3, 4, 5, 6, 7].includes(c)) {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
  }

  // Set column widths for main sheet
  ws.columns = [
    { width: 10 },
    { width: 28 },
    { width: 20 },
    { width: 22 },
    { width: 20 },
    { width: 16 },
    { width: 18 },
    { width: 34 },
  ];

  // ---------------------------------------------------------
  // SHEET 2: STANDALONE IRAN SHEET
  // ---------------------------------------------------------
  const wsIran = workbook.addWorksheet('لقی ئێران', { views: [{ rightToLeft: true }] });
  renderExpenseTable(
    wsIran,
    'خەرجییەکانی لقی ئێران و ترانزێت (Cost Iran Side)',
    'FFD97706',
    iranExpenses,
    'تمەن',
    totalIranUSD,
    totalIranLocal
  );
  wsIran.columns = ws.columns;

  // ---------------------------------------------------------
  // SHEET 3: STANDALONE IRAQ SHEET
  // ---------------------------------------------------------
  const wsIraq = workbook.addWorksheet('لقی عێراق', { views: [{ rightToLeft: true }] });
  renderExpenseTable(
    wsIraq,
    'خەرجییەکانی ناوخۆی عێراق و گومرگ (Cost Iraq Side)',
    'FF0D9488',
    iraqExpenses,
    'دینار',
    totalIraqUSD,
    totalIraqLocal
  );
  wsIraq.columns = ws.columns;

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().split('T')[0];
  const cleanName = transactionName.replace(/[/\\?%*:|"<>]/g, '_');
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `Xarjyakany_${cleanName}_${dateStr}.xlsx`
  );
}
