import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Product, Sale, PaymentVoucher, CustomerDebtSummary } from '../types';
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
