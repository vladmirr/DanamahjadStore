import { Currency, Product, PurchaseHistoryEntry } from '../types';
import { roundPrecision } from './formatters';

/**
 * Reconstructs or normalizes the full chronological buying and restock history for a product.
 * Guarantees Entry #1 is the initial purchase (either recorded or reconstructed from historical stock/prices),
 * followed by subsequent restocks (#2, #3, ...).
 */
export function getProductPurchaseHistory(product: Product | any): PurchaseHistoryEntry[] {
  if (!product) return [];

  const currency: Currency = product.currency === 'USD' ? 'USD' : 'IQD';
  const unitsPerCarton = Math.max(1, Number(product.unitsPerCarton ?? product.piecesPerCarton) || 1);
  const currentTotalUnits = Number(product.totalUnits ?? product.totalPieces) || 0;
  const currentUnitBuyPrice = Number(product.costPricePerUnit) || 0;

  // Gather existing raw entries from purchaseHistory, restockHistory, or stockHistory
  const rawList: any[] = Array.isArray(product.purchaseHistory) && product.purchaseHistory.length > 0
    ? product.purchaseHistory
    : (Array.isArray(product.restockHistory) && product.restockHistory.length > 0
      ? product.restockHistory
      : (Array.isArray(product.stockHistory) && product.stockHistory.length > 0
        ? product.stockHistory
        : []));

  // Check if an explicit initial purchase entry exists
  const hasExplicitInitial = rawList.some(
    (e) => e.type === 'initial' || (e.notes && typeof e.notes === 'string' && e.notes.includes('کڕینی یەکەم'))
  );

  let fullHistory: PurchaseHistoryEntry[] = [];

  if (hasExplicitInitial) {
    fullHistory = rawList.map((entry, index) => {
      const isInitial = entry.type === 'initial' || (entry.notes && typeof entry.notes === 'string' && entry.notes.includes('کڕینی یەکەم')) || (index === 0 && entry.batchNumber === 1);
      const addedUnits = Number(entry.addedUnits ?? entry.addedQty) || 0;
      const addedCartons = entry.addedCartons !== undefined
        ? Number(entry.addedCartons)
        : (unitsPerCarton > 0 ? addedUnits / unitsPerCarton : 0);
      const unitPrice = Number(entry.unitPrice) || 0;
      const totalCost = Number(entry.totalCost ?? entry.totalAddedCost) || (addedUnits * unitPrice);

      const itemObj: PurchaseHistoryEntry = {
        id: entry.id || `batch-${index + 1}`,
        batchNumber: entry.batchNumber || (index + 1),
        type: isInitial ? 'initial' : 'restock',
        date: entry.date || product.createdAt || new Date().toISOString(),
        addedCartons: roundPrecision(addedCartons, 2),
        addedUnits: roundPrecision(addedUnits, 2),
        unitPrice: roundPrecision(unitPrice, 2),
        totalCost: roundPrecision(totalCost, 2),
        currency: (entry.currency || currency) as Currency,
        notes: entry.notes || (isInitial ? 'کڕینی یەکەمی کاڵا (Initial Purchase)' : 'زیادکردنی بڕی نوێ (کڕینەوە)'),
      };

      if (entry.previousQty !== undefined && entry.previousQty !== null) itemObj.previousQty = Number(entry.previousQty);
      if (entry.previousCostPrice !== undefined && entry.previousCostPrice !== null) itemObj.previousCostPrice = Number(entry.previousCostPrice);
      if (entry.newCostPrice !== undefined && entry.newCostPrice !== null) itemObj.newCostPrice = Number(entry.newCostPrice);
      if (entry.newSellingPrice !== undefined && entry.newSellingPrice !== null) itemObj.newSellingPrice = Number(entry.newSellingPrice);

      return itemObj;
    });
  } else {
    // Dynamically reconstruct Entry #1 (Initial Purchase) for backward compatibility
    const restockEntries: PurchaseHistoryEntry[] = rawList.map((entry, idx) => {
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

    const firstRestock = rawList[0] || product.lastRestock;
    const initialUnitPrice = firstRestock && (firstRestock.previousCostPrice !== undefined || firstRestock.previousUnitPrice !== undefined)
      ? Number(firstRestock.previousCostPrice ?? firstRestock.previousUnitPrice)
      : currentUnitBuyPrice;

    const sumOfRestockedUnits = restockEntries.reduce((sum, r) => sum + r.addedUnits, 0);

    let initialUnits = 0;
    if (firstRestock && firstRestock.previousQty !== undefined && Number(firstRestock.previousQty) > 0) {
      initialUnits = Number(firstRestock.previousQty);
    } else {
      initialUnits = Math.max(0, currentTotalUnits - sumOfRestockedUnits);
      if (initialUnits === 0 && restockEntries.length === 0) {
        initialUnits = currentTotalUnits;
      }
    }

    const initialCartons = unitsPerCarton > 0 ? initialUnits / unitsPerCarton : 0;
    const initialTotalCost = roundPrecision(initialUnits * initialUnitPrice, 2);

    const initialEntry: PurchaseHistoryEntry = {
      id: `initial-${product.id}`,
      batchNumber: 1,
      type: 'initial',
      date: product.createdAt || (firstRestock?.date ? firstRestock.date : new Date().toISOString()),
      addedCartons: roundPrecision(initialCartons, 2),
      addedUnits: roundPrecision(initialUnits, 2),
      unitPrice: roundPrecision(initialUnitPrice, 2),
      totalCost: roundPrecision(initialTotalCost, 2),
      currency,
      notes: 'کڕینی یەکەمی کاڵا (Initial Purchase)',
    };

    fullHistory = [initialEntry, ...restockEntries];
  }

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
