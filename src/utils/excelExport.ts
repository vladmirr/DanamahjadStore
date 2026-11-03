import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Product, Sale, PaymentVoucher, CustomerDebtSummary } from '../types';
import { PopcornProjectData, PopcornTransaction } from '../types/popcorn';
import { loadLocalPopcornData, loadLocalPopcornStore, DEFAULT_TRANSACTION } from '../services/popcornStorage';
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
      };
    })
  );

  // Customer payments (standalone vouchers + POS upfront down payments)
  const customerPaymentsList: Array<{ amount: number; date: string }> = [];

  // Standalone vouchers for this customer
  payments
    .filter((p) =>
      p.customerName.toLowerCase().includes(selectedCust!.toLowerCase())
    )
    .forEach((p) => {
      customerPaymentsList.push({
        amount: p.amount,
        date: formatShortDate(p.date),
      });
    });

  // Upfront cash payments from sales for this customer
  targetSales
    .filter((s) => s.paidAmount > 0)
    .forEach((s) => {
      customerPaymentsList.push({
        amount: s.paidAmount,
        date: formatShortDate(s.date),
      });
    });

  // If no customer payments found, fallback to all payments
  if (customerPaymentsList.length === 0 && payments.length > 0) {
    payments.forEach((p) => {
      customerPaymentsList.push({
        amount: p.amount,
        date: formatShortDate(p.date),
      });
    });
  }

  // Create Workbook & Worksheet
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DanaMahjadStore';
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
              : Math.floor(i.quantityInUnits / (p.unitsPerCarton || 1));
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
      worksheet.getCell(rowNum, 2).value = p.name;

      styleCell(worksheet.getCell(rowNum, 3), { numFmt: '#,##0' });
      worksheet.getCell(rowNum, 3).value = purchasedCartons;

      styleCell(worksheet.getCell(rowNum, 4), { numFmt: '#,##0' });
      worksheet.getCell(rowNum, 4).value = unitsPerCarton;

      styleCell(worksheet.getCell(rowNum, 5), { numFmt: '#,##0' });
      worksheet.getCell(rowNum, 5).value = {
        formula: `C${rowNum}*D${rowNum}`,
        result: purchasedTotalUnits,
      };

      styleCell(worksheet.getCell(rowNum, 6), { numFmt: '#,##0' });
      worksheet.getCell(rowNum, 6).value = p.costPricePerUnit;

      styleCell(worksheet.getCell(rowNum, 7), { numFmt: '#,##0' });
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
      worksheet.getCell(rowNum, 11).value = p.name;

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
      styleCell(worksheet.getCell(rowNum, 15), { numFmt: '#,##0' });
      worksheet.getCell(rowNum, 15).value = {
        formula: `F${rowNum}`,
        result: p.costPricePerUnit,
      };

      // Col P (16): کۆی گشتی (Total Stock Value = Total Units * Cost Price)
      styleCell(worksheet.getCell(rowNum, 16), { numFmt: '#,##0' });
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
          : Math.floor(item.quantityInUnits / (item.unitsPerCarton || 1));
      const unitsPerCarton = item.unitsPerCarton || 1;

      styleCell(worksheet.getCell(rowNum, 18), {});
      worksheet.getCell(rowNum, 18).value = r + 1;

      styleCell(worksheet.getCell(rowNum, 19), { alignment: rightAlignment });
      worksheet.getCell(rowNum, 19).value = item.productName;

      // Col T (20): کارتۆن (Cartons sold)
      styleCell(worksheet.getCell(rowNum, 20), { numFmt: '#,##0' });
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
      styleCell(worksheet.getCell(rowNum, 23), { numFmt: '#,##0' });
      worksheet.getCell(rowNum, 23).value = item.unitPrice;

      // Col X (24): کۆی گشتی فرۆش
      styleCell(worksheet.getCell(rowNum, 24), { numFmt: '#,##0' });
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

      styleCell(worksheet.getCell(rowNum, 28), { numFmt: '#,##0' });
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

  // Append new dedicated Popcorn page / worksheet to the main Excel file
  try {
    appendPopcornSheetToWorkbook(workbook);
  } catch (err) {
    console.error('Failed to append Popcorn sheet to main report:', err);
  }

  // Generate buffer and trigger immediate download
  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().split('T')[0];
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `DanaMahjadStore_Report_${dateStr}.xlsx`
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

  const totalCargoTons = Number(config.totalTons) || 200;
  const buyPricePerTon = Number(config.buyPricePerTonUSD) || 220;
  const sellPricePerTon = Number(config.sellingPricePerTonUSD) || 302;
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
  const cleanSheetName = (sheetName || 'پۆپکورن')
    .replace(/[*?:/[\]]/g, '')
    .trim()
    .slice(0, 31);

  const ws = workbook.addWorksheet(cleanSheetName, {
    views: [{ rightToLeft: true }],
  });

  ws.columns = [
    { width: 22 }, // A
    { width: 25 }, // B
    { width: 22 }, // C
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
    ? `مامەڵەی: ${(data as PopcornTransaction).name} (Popcorn Import)`
    : 'پڕۆژەی هاوردەکردنی پۆپکورن (Popcorn Import & Partnership)';
  ws.addRow([titleText]);
  ws.mergeCells('A1:J1');
  const titleCell = ws.getCell('A1');
  titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 36;

  // Sub-banner
  ws.addRow([
    `کڕینی ${totalCargoTons} تۆن دانەوێڵە لە ${config.originCountry} بە نرخی $${buyPricePerTon} و فرۆشتن بە $${sellPricePerTon} لە ${config.destinationCity} ${
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
  ws.mergeCells('A4:D4');
  const sec1Cell = ws.getCell('A4');
  sec1Cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  sec1Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
  sec1Cell.alignment = { horizontal: 'right', vertical: 'middle' };

  ws.addRow(['بڕگە / وەسف', 'بڕ بە دۆلار ($ USD)', 'بە دیناری عێراقی (IQD)', 'تێبینی']);
  const h1 = ws.getRow(5);
  h1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  for (let c = 1; c <= 4; c++) {
    h1.getCell(c).border = thinBorder;
  }

  const kpis = [
    ['بڕی گشتی بار (تۆن)', `${totalCargoTons} تۆن`, '—', `سەرچاوە: ${config.originCountry}`],
    ['نرخی کڕینی ١ تۆن', `$${buyPricePerTon}`, `${(buyPricePerTon * exchangeRate).toLocaleString()} د.ع`, 'نرخی کڕینی گرێبەست'],
    ['کۆی تێچووی کڕین (سەرمایە)', `$${totalBuyingCost.toLocaleString()}`, `${(totalBuyingCost * exchangeRate).toLocaleString()} د.ع`, `${totalCargoTons} تۆن × $${buyPricePerTon}`],
    ['نرخی پێشبینیکراوی فرۆشتنی ١ تۆن', `$${sellPricePerTon}`, `${(sellPricePerTon * exchangeRate).toLocaleString()} د.ع`, 'لە بازاڕی سلێمانی'],
    ['کۆی پێشبینیکراوی داهاتی فرۆش', `$${expectedTotalRevenue.toLocaleString()}`, `${(expectedTotalRevenue * exchangeRate).toLocaleString()} د.ع`, `${totalCargoTons} تۆن × $${sellPricePerTon}`],
    ['خەرجییەکانی گواستنەوەی ئێران', `$${totalIranSpending.toLocaleString()}`, `${(totalIranSpending * exchangeRate).toLocaleString()} د.ع`, 'کرێی بارهەڵگر، مەرز و ترانزێت'],
    ['خەرجییەکانی ناوخۆی عێراق و گومرگ', `$${totalIraqSpending.toLocaleString()}`, `${(totalIraqSpending * exchangeRate).toLocaleString()} د.ع`, 'گومرگی باشماخ، داگرتن و عەمبار'],
    ['کۆی گشتی هەموو خەرجییەکان', `$${totalOverallCost.toLocaleString()}`, `${(totalOverallCost * exchangeRate).toLocaleString()} د.ع`, 'کڕین + خەرجی ئێران + خەرجی عێراق'],
    ['قازانجی پوختەی مامەڵە (Net Profit)', `$${finalNetProfit.toLocaleString()}`, `${(finalNetProfit * exchangeRate).toLocaleString()} د.ع`, 'داهاتی فرۆش - سەرجەم خەرجییەکان'],
    ...(hasPartner
      ? [
          [`پشکی هاوبەش (${config.partnerName} - %${partnerPercent})`, `$${partnerProfitShare.toLocaleString()}`, `${(partnerProfitShare * exchangeRate).toLocaleString()} د.ع`, 'پوختەی قازانجی شەراکەت'],
          [`پشکی من (%${myPercent})`, `$${myProfitShare.toLocaleString()}`, `${(myProfitShare * exchangeRate).toLocaleString()} د.ع`, 'پوختەی قازانجی من'],
        ]
      : [
          ['شەراکەت', 'مامەڵەی تایبەت (بێ هاوبەش)', '—', '١٠٠٪ بۆ خاوەنکار'],
          ['قازانجی تەواوی من (١٠٠٪)', `$${myProfitShare.toLocaleString()}`, `${(myProfitShare * exchangeRate).toLocaleString()} د.ع`, 'تەواوی قازانجی پوخت'],
        ]),
  ];

  kpis.forEach((row, idx) => {
    const r = ws.addRow(row);
    const isHighlight = idx >= 8;
    r.font = { bold: isHighlight, size: 10 };
    if (isHighlight) {
      r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx === 8 ? 'FFDCFCE7' : 'FFFEF3C7' } };
    }
    for (let c = 1; c <= 4; c++) {
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

  // SECTION 3: Expenses Table
  ws.addRow(['٣. خەرجییەکانی ئێران و عێراق (Cost Iran Side & Cost Iraq Side)']);
  ws.mergeCells(`A${ws.rowCount}:H${ws.rowCount}`);
  const sec3Cell = ws.getCell(`A${ws.rowCount}`);
  sec3Cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  sec3Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  sec3Cell.alignment = { horizontal: 'right', vertical: 'middle' };

  const expHeaders = [
    'لق / وڵات',
    'ناونیشانی مەسروف / خەرجی',
    'پۆلێن / بەش',
    'بڕ بە دۆلار ($ USD)',
    'بڕ بە دراوی ناوخۆ',
    'بەروار',
    'دراوە لەلایەن',
    'تێبینی و پسوولە',
  ];
  const expHeadRow = ws.addRow(expHeaders);
  expHeadRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  expHeadRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  for (let c = 1; c <= 8; c++) {
    expHeadRow.getCell(c).border = thinBorder;
  }

  expenses.forEach((e) => {
    const regText = e.region === 'iran' ? '🇮🇷 ئێران' : '🇮🇶 عێراق';
    const payerText = e.paidBy === 'partner' ? 'شەریک / هاوبەش' : e.paidBy === 'me' ? 'لەلایەن منەوە' : 'هاوبەش';
    const r = ws.addRow([
      regText,
      e.title,
      e.category,
      Number(e.amountUSD) || 0,
      e.amountLocal ? Number(e.amountLocal).toLocaleString() : '—',
      e.date,
      payerText,
      e.notes || '',
    ]);
    r.font = { size: 10 };
    for (let c = 1; c <= 8; c++) {
      r.getCell(c).border = thinBorder;
    }
  });

  // Expenses Total Row
  const expTotalRow = ws.addRow([
    `کۆی گشتی خەرجییەکان (${expenses.length} خەرجی)`,
    `ئێران: $${totalIranSpending.toLocaleString()} | عێراق: $${totalIraqSpending.toLocaleString()}`,
    '—',
    totalOperatingExpenses,
    '—',
    '—',
    '—',
    '—',
  ]);
  expTotalRow.font = { bold: true, color: { argb: 'FF1E293B' } };
  expTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFBF1' } };
  for (let c = 1; c <= 8; c++) {
    expTotalRow.getCell(c).border = thinBorder;
  }

  return ws;
}

/**
 * Append dedicated Popcorn worksheet(s) to any workbook
 */
export function appendPopcornSheetToWorkbook(
  workbook: ExcelJS.Workbook,
  customData?: PopcornProjectData | PopcornTransaction
) {
  if (customData) {
    const name = (customData as PopcornTransaction).name || 'پۆپکورن';
    renderSinglePopcornWorksheet(workbook, customData, name);
    return;
  }

  const store = loadLocalPopcornStore();
  if (store.transactions.length <= 1) {
    const single = store.transactions[0] || DEFAULT_TRANSACTION;
    renderSinglePopcornWorksheet(workbook, single, single.name || 'پۆپکورن');
  } else {
    // If there are multiple transactions, create a dedicated worksheet for each!
    store.transactions.forEach((trans, idx) => {
      const sheetTitle = `${idx + 1}. ${trans.name}`;
      renderSinglePopcornWorksheet(workbook, trans, sheetTitle);
    });
  }
}

/**
 * Export standalone Popcorn Excel report
 */
export async function exportPopcornToExcel(data?: PopcornProjectData | PopcornTransaction) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DanaMahjadStore';
  workbook.created = new Date();

  appendPopcornSheetToWorkbook(workbook, data);

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().split('T')[0];
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `Popcorn_Shipment_${dateStr}.xlsx`
  );
}
