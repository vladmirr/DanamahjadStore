import { Currency, Product, PurchaseHistoryEntry } from '../types';
import { roundPrecision } from './formatters';

/**
 * Reconstructs or normalizes the full chronological buying and restock history for a product.
 * Guarantees Entry #1 is the true original initial purchase (accounting for sold units if older item),
 * followed by subsequent restocks (#2, #3, ...).
 * Sales deduction ONLY deducts from available warehouse stock, NEVER from initial purchase.
 */
export function getProductPurchaseHistory(
  product: Product | any,
  sales?: any[]
): PurchaseHistoryEntry[] {
  if (!product) return [];

  const currency: Currency = product.currency === 'USD' ? 'USD' : 'IQD';
  const unitsPerCarton = Math.max(1, Number(product.unitsPerCarton ?? product.piecesPerCarton) || 1);
  const currentTotalUnits = Number(product.totalUnits ?? product.totalPieces) || 0;
  const currentUnitBuyPrice = Number(product.costPricePerUnit) || 0;

  // Calculate total sold units for this product across all sales records
  let totalSoldUnits = 0;
  if (Array.isArray(sales) && sales.length > 0) {
    for (const sale of sales) {
      if (Array.isArray(sale.items)) {
        for (const it of sale.items) {
          if (it.productId === product.id) {
            const qtyInUnits = Number(it.quantityInUnits) ||
              (it.unitType === 'carton' ? Number(it.quantity) * unitsPerCarton : Number(it.quantity)) || 0;
            totalSoldUnits += qtyInUnits;
          }
        }
      }
    }
  }

  // Gather existing raw entries from purchaseHistory, restockHistory, or stockHistory
  const rawList: any[] = Array.isArray(product.purchaseHistory) && product.purchaseHistory.length > 0
    ? product.purchaseHistory
    : (Array.isArray(product.restockHistory) && product.restockHistory.length > 0
      ? product.restockHistory
      : (Array.isArray(product.stockHistory) && product.stockHistory.length > 0
        ? product.stockHistory
        : []));

  // Extract all restock entries (excluding initial purchase)
  const restockEntries: PurchaseHistoryEntry[] = rawList
    .filter((e) => e.type !== 'initial' && !(e.notes && typeof e.notes === 'string' && e.notes.includes('کڕینی یەکەم')))
    .map((entry, idx) => {
      const addedUnits = Number(entry.addedUnits ?? entry.addedQty) || 0;
      const addedCartons = entry.addedCartons !== undefined
        ? Number(entry.addedCartons)
        : (unitsPerCarton > 0 ? addedUnits / unitsPerCarton : 0);
      const unitPrice = Number(entry.unitPrice) || 0;
      const totalCost = Number(entry.totalCost ?? entry.totalAddedCost) || (addedUnits * unitPrice);

      const restockObj: PurchaseHistoryEntry = {
        id: entry.id || `restock-${idx + 1}`,
        batchNumber: idx + 2,
        type: 'restock',
        date: entry.date || product.createdAt || new Date().toISOString(),
        addedCartons: roundPrecision(addedCartons, 2),
        addedUnits: roundPrecision(addedUnits, 2),
        unitPrice: roundPrecision(unitPrice, 2),
        totalCost: roundPrecision(totalCost, 2),
        currency: (entry.currency || currency) as Currency,
        notes: entry.notes || 'زیادکردنی بڕی نوێ (کڕینەوە)',
      };

      if (entry.previousQty !== undefined && entry.previousQty !== null) restockObj.previousQty = Number(entry.previousQty);
      if (entry.previousCostPrice !== undefined && entry.previousCostPrice !== null) restockObj.previousCostPrice = Number(entry.previousCostPrice);
      if (entry.newCostPrice !== undefined && entry.newCostPrice !== null) restockObj.newCostPrice = Number(entry.newCostPrice);
      if (entry.newSellingPrice !== undefined && entry.newSellingPrice !== null) restockObj.newSellingPrice = Number(entry.newSellingPrice);

      return restockObj;
    });

  const sumOfRestockedUnits = restockEntries.reduce((sum, r) => sum + r.addedUnits, 0);

  // Check if immutable initial purchase fields are explicitly stored on product
  const hasStoredInitial = product.initialUnits !== undefined && Number(product.initialUnits) > 0;

  let trueInitialUnits = 0;
  if (hasStoredInitial) {
    trueInitialUnits = Number(product.initialUnits);
  } else {
    // If an explicit initial entry was saved previously and already accounted for sold units
    const explicitInitial = rawList.find(
      (e) => e.type === 'initial' || (e.notes && typeof e.notes === 'string' && e.notes.includes('کڕینی یەکەم'))
    );

    // Reconstruct true initial units by adding sold units back:
    // trueInitialUnits = (currentAvailableUnits + totalSoldUnits) - sumOfRestockedUnits
    const reconstructedUnits = Math.max(0, roundPrecision((currentTotalUnits + totalSoldUnits) - sumOfRestockedUnits, 2));

    if (explicitInitial && explicitInitial.addedUnits > 0 && explicitInitial.addedUnits >= reconstructedUnits) {
      trueInitialUnits = roundPrecision(Number(explicitInitial.addedUnits), 2);
    } else {
      trueInitialUnits = reconstructedUnits > 0 ? reconstructedUnits : roundPrecision(currentTotalUnits, 2);
    }
  }

  const trueInitialCartons = product.initialCartons !== undefined && Number(product.initialCartons) > 0
    ? roundPrecision(Number(product.initialCartons), 2)
    : (unitsPerCarton > 0 ? roundPrecision(trueInitialUnits / unitsPerCarton, 2) : 0);

  const firstRestock = restockEntries[0] || product.lastRestock;
  const initialUnitPrice = product.initialBuyPrice !== undefined && Number(product.initialBuyPrice) > 0
    ? roundPrecision(Number(product.initialBuyPrice), 2)
    : (firstRestock && ((firstRestock as any).previousCostPrice !== undefined || (firstRestock as any).previousUnitPrice !== undefined)
        ? roundPrecision(Number((firstRestock as any).previousCostPrice ?? (firstRestock as any).previousUnitPrice), 2)
        : roundPrecision(currentUnitBuyPrice, 2));

  const initialTotalCost = product.initialTotalCost !== undefined && Number(product.initialTotalCost) > 0
    ? roundPrecision(Number(product.initialTotalCost), 2)
    : roundPrecision(trueInitialUnits * initialUnitPrice, 2);

  const initialEntry: PurchaseHistoryEntry = {
    id: `initial-${product.id}`,
    batchNumber: 1,
    type: 'initial',
    date: product.createdAt || (firstRestock?.date ? firstRestock.date : new Date().toISOString()),
    addedCartons: roundPrecision(trueInitialCartons, 2),
    addedUnits: roundPrecision(trueInitialUnits, 2),
    unitPrice: roundPrecision(initialUnitPrice, 2),
    totalCost: roundPrecision(initialTotalCost, 2),
    currency,
    notes: 'کڕینی یەکەمی کاڵا (Initial Purchase)',
  };

  const fullHistory = [initialEntry, ...restockEntries];

  // Ensure sequential batch numbers from 1 to N
  return fullHistory.map((item, index) => ({
    ...item,
    batchNumber: index + 1,
  }));
}

/**
 * Calculates summary metrics across all purchase history batches.
 */
export function getPurchaseHistorySummary(history: PurchaseHistoryEntry[]) {
  const totalBatches = history.length;
  const totalUnitsBought = roundPrecision(
    history.reduce((sum, item) => sum + item.addedUnits, 0),
    2
  );
  const totalCartonsBought = roundPrecision(
    history.reduce((sum, item) => sum + (item.addedCartons || 0), 0),
    2
  );
  const totalCapitalSpent = roundPrecision(
    history.reduce((sum, item) => sum + item.totalCost, 0),
    2
  );
  const overallWeightedAverage = totalUnitsBought > 0
    ? roundPrecision(totalCapitalSpent / totalUnitsBought, 2)
    : 0;

  return {
    totalBatches,
    totalUnitsBought,
    totalCartonsBought,
    totalCapitalSpent,
    overallWeightedAverage,
  };
}
