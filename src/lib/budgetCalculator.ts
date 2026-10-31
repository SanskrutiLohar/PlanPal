import { BudgetItem, EventDashboardStats, SavedPlan, TimelineTask, VendorItem } from '../types/plan.js';

/**
 * Normalizes budget percentages and amounts:
 * 1. Ensures every percentage is a non-negative integer (rejects negative allocations).
 * 2. Guarantees percentages sum to exactly 100%.
 * 3. Introduces/maintains a contingency reserve of 5-10% (default 7%).
 * 4. Ensures rupee amounts sum to the exact total budget with a deterministic remainder rule (give leftover rupees to the largest line) and no negatives.
 */
export function normalizeBudget(
  rawItems: BudgetItem[],
  totalBudget: number,
  defaultContingencyPct: number = 7
): BudgetItem[] {
  const safeTotal = Math.max(0, Math.round(totalBudget || 0));

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    const basePcts = [
      { item: 'Catering and dining', pct: 40, tip: 'Multi-course menu with seasonal dishes.' },
      { item: 'Venue hire and facilities', pct: 25, tip: 'Negotiate all-inclusive electricity and setup access.' },
      { item: 'Decor and atmosphere', pct: 15, tip: 'Focus floral accents on main ceremony backdrop.' },
      { item: 'Photography and memories', pct: 13, tip: 'Lock deliverables and raw files handover.' },
      { item: 'Contingency and emergency reserve', pct: 7, tip: 'Held for unforeseen expenses, permits and cash tips.' },
    ];
    return allocateRupeeAmounts(basePcts, safeTotal);
  }

  // Reject negative allocations and ensure non-negative integers
  let items = rawItems.map((b) => ({
    ...b,
    pct: Math.max(0, Math.round(Number(b.pct) || 0)),
    amount: b.amount !== undefined ? Math.max(0, Math.round(Number(b.amount) || 0)) : undefined,
  }));

  // Check if contingency line exists
  const contingencyIdx = items.findIndex((b) => {
    const name = b.item.toLowerCase();
    return name.includes('contingency') || name.includes('emergency') || name.includes('reserve');
  });

  if (contingencyIdx === -1) {
    const targetContingency = Math.min(10, Math.max(5, defaultContingencyPct));
    items.push({
      item: 'Contingency and emergency reserve',
      pct: targetContingency,
      tip: 'Dedicated 5 to 10% reserve for unforeseen logistical costs and cash tips.',
      amount: 0,
    });
  }

  // Scale percentages to exactly 100
  let currentSum = items.reduce((acc, curr) => acc + curr.pct, 0);

  if (currentSum !== 100 && items.length > 0) {
    let allocated = 0;
    items = items.map((b, i) => {
      if (i === items.length - 1) {
        const remaining = Math.max(1, 100 - allocated);
        return { ...b, pct: remaining };
      }
      const proportional = Math.max(1, Math.round((b.pct / (currentSum || 1)) * 100));
      allocated += proportional;
      return { ...b, pct: proportional };
    });

    // Final pass for any 1% off-by-one due to rounding
    const finalSum = items.reduce((acc, curr) => acc + curr.pct, 0);
    const diff = 100 - finalSum;
    if (diff !== 0) {
      // Find largest category to adjust
      let maxIdx = 0;
      for (let i = 1; i < items.length; i++) {
        if (items[i].pct > items[maxIdx].pct) {
          maxIdx = i;
        }
      }
      items[maxIdx].pct = Math.max(1, items[maxIdx].pct + diff);
    }
  }

  const allocated = allocateRupeeAmounts(items, safeTotal);

  // Verification pass: enforce 100% and safeTotal in code
  const sumPct = allocated.reduce((acc, b) => acc + b.pct, 0);
  const sumAmt = allocated.reduce((acc, b) => acc + (b.amount || 0), 0);
  if (sumPct !== 100 && allocated.length > 0) {
    allocated[0].pct += (100 - sumPct);
  }
  if (sumAmt !== safeTotal && allocated.length > 0) {
    allocated[0].amount = Math.max(0, (allocated[0].amount || 0) + (safeTotal - sumAmt));
  }

  return allocated;
}

/**
 * Deterministic remainder distribution rule:
 * 1. Base amount: Math.floor((pct / 100) * totalBudget)
 * 2. Calculate remaining rupees = totalBudget - sum(base amounts)
 * 3. Give leftover rupees to the largest line (highest percentage, then alphabetical name tie-break)
 * 4. Guarantees amounts sum exactly to totalBudget with zero negatives
 */
function allocateRupeeAmounts(items: BudgetItem[], totalBudget: number): BudgetItem[] {
  if (items.length === 0) return [];
  if (totalBudget <= 0) {
    return items.map((b) => ({ ...b, amount: 0 }));
  }

  let totalAllocated = 0;
  const result: BudgetItem[] = items.map((b) => {
    const baseAmount = Math.max(0, Math.floor((b.pct / 100) * totalBudget));
    totalAllocated += baseAmount;
    return { ...b, amount: baseAmount };
  });

  const remainder = totalBudget - totalAllocated;
  if (remainder > 0 && result.length > 0) {
    const sortedIndices = result
      .map((b, idx) => ({ idx, pct: b.pct, name: b.item }))
      .sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name));

    const largestIdx = sortedIndices[0].idx;
    result[largestIdx].amount = (result[largestIdx].amount || 0) + remainder;
  }

  return result;
}

/**
 * Validates budget items for negative allocations or invalid values
 */
export function validateBudgetAllocations(items: BudgetItem[]): boolean {
  if (!Array.isArray(items) || items.length === 0) return false;
  return !items.some((b) => Number(b.pct) < 0 || (b.amount !== undefined && Number(b.amount) < 0));
}

export interface BudgetRealismAssessment {
  isUnrealistic: boolean;
  warning?: string;
  reducedPlanOffer?: string;
  recommendedGuestCount?: number;
  minPerGuestBenchmark?: number;
}

/**
 * Checks whether the requested budget is realistic for Indian event benchmarks
 */
export function assessBudgetRealism(
  eventType: string | null,
  guestCount: number | null,
  budgetINR: number | null,
  city: string | null
): BudgetRealismAssessment {
  if (!guestCount || !budgetINR || budgetINR <= 0 || guestCount <= 0) {
    return { isUnrealistic: false };
  }

  const typeLower = (eventType || '').toLowerCase();
  const perGuest = Math.round(budgetINR / guestCount);

  let minBenchmark = 400;
  if (typeLower.includes('wedding') || typeLower.includes('shaadi') || typeLower.includes('vivah')) {
    minBenchmark = 800;
  } else if (typeLower.includes('birthday') || typeLower.includes('bday')) {
    minBenchmark = 350;
  } else if (typeLower.includes('community') || typeLower.includes('gathering')) {
    minBenchmark = 250;
  }

  if (perGuest < minBenchmark) {
    const recommendedGuests = Math.max(10, Math.floor(budgetINR / minBenchmark));
    const cityName = city || 'India';
    return {
      isUnrealistic: true,
      minPerGuestBenchmark: minBenchmark,
      warning: `A budget of ₹${budgetINR.toLocaleString('en-IN')} for ${guestCount} guests in ${cityName} equals ₹${perGuest.toLocaleString('en-IN')} per guest, which is below the practical benchmark of ₹${minBenchmark.toLocaleString('en-IN')} per guest for standard venue and catering.`,
      reducedPlanOffer: `Suggested reduced plan: adjust guest count to ${recommendedGuests} guests to protect catering quality, or opt for a community hall with simplified refreshments.`,
      recommendedGuestCount: recommendedGuests,
    };
  }

  return { isUnrealistic: false };
}

/**
 * Refine budget with specific category adjustment, preserving all other user categories
 */
export function adjustBudgetCategory(
  items: BudgetItem[],
  targetItemName: string,
  newPct: number,
  totalBudget: number
): BudgetItem[] {
  const targetIdx = items.findIndex((b) =>
    b.item.toLowerCase().includes(targetItemName.toLowerCase()) ||
    targetItemName.toLowerCase().includes(b.item.toLowerCase())
  );

  if (targetIdx === -1) {
    return normalizeBudget(items, totalBudget);
  }

  const clampedPct = Math.min(90, Math.max(1, Math.round(newPct)));
  const oldPct = items[targetIdx].pct;
  const delta = clampedPct - oldPct;

  if (delta === 0) return items;

  const updated = items.map((b, i) => ({ ...b }));
  updated[targetIdx].pct = clampedPct;

  // Try absorbing in contingency first
  const contIdx = updated.findIndex((b) => {
    const name = b.item.toLowerCase();
    return name.includes('contingency') || name.includes('emergency') || name.includes('reserve');
  });

  if (contIdx >= 0 && contIdx !== targetIdx && updated[contIdx].pct - delta >= 3) {
    updated[contIdx].pct -= delta;
  } else {
    // Distribute delta across all other items
    const otherIndices = updated.map((_, i) => i).filter((i) => i !== targetIdx);
    if (otherIndices.length > 0) {
      const share = delta / otherIndices.length;
      otherIndices.forEach((idx) => {
        updated[idx].pct = Math.max(1, Math.round(updated[idx].pct - share));
      });
    }
  }

  return normalizeBudget(updated, totalBudget);
}

/**
 * Compute comprehensive real dashboard statistics
 */
export function computeDashboardStats(event: SavedPlan): EventDashboardStats {
  const totalBudget = Number(event.formData.budgetINR) || 0;
  const expenses = event.expenses || [];
  const actualExpenditure = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const remainingBudget = totalBudget - actualExpenditure;
  const budgetUtilizationPct = totalBudget > 0 ? Math.round((actualExpenditure / totalBudget) * 100) : 0;

  // Contingency
  const contingencyItem = event.plan.budget.find((b) => {
    const n = b.item.toLowerCase();
    return n.includes('contingency') || n.includes('emergency') || n.includes('reserve');
  });
  const contingencyAllocated = contingencyItem?.amount || Math.round((contingencyItem?.pct || 7) * 0.01 * totalBudget);
  const contingencySpent = expenses
    .filter((e) => e.category.toLowerCase().includes('contingency') || e.category.toLowerCase().includes('emergency'))
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const contingencyRemaining = Math.max(0, contingencyAllocated - contingencySpent);

  // Tasks
  const tasks: TimelineTask[] = (event.tasks && event.tasks.length > 0)
    ? event.tasks
    : event.plan.timeline.map((t, idx) => ({
        id: 'task_' + idx,
        when: t.when,
        task: t.task,
        completed: Boolean((t as any).completed),
        category: 'General',
        priority: 'Normal',
      }));

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const pendingTasksCount = totalTasksCount - completedTasksCount;
  const overdueTasksCount = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < todayStr).length;

  // Vendors
  const vendors = event.plan.vendors || [];
  const totalVendorsCount = vendors.length;
  const bookedVendorsCount = vendors.filter((v) => v.done || v.status === 'booked' || v.status === 'completed').length;

  // Pending vendor payments
  let pendingPaymentsTotal = 0;
  vendors.forEach((v) => {
    if (v.remainingPayment !== undefined && v.remainingPayment > 0) {
      pendingPaymentsTotal += v.remainingPayment;
    } else if (v.negotiatedPrice && v.advancePaid !== undefined) {
      pendingPaymentsTotal += Math.max(0, v.negotiatedPrice - v.advancePaid);
    } else if (v.quotedPrice && v.advancePaid !== undefined) {
      pendingPaymentsTotal += Math.max(0, v.quotedPrice - v.advancePaid);
    }
  });

  // Overall progress percentage (40% tasks, 30% vendors, 30% budget execution)
  const taskProgress = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
  const vendorProgress = totalVendorsCount > 0 ? (bookedVendorsCount / totalVendorsCount) * 100 : 0;
  const budgetProgress = totalBudget > 0 ? Math.min(100, (actualExpenditure / totalBudget) * 100) : 0;
  const overallProgressPct = Math.round(taskProgress * 0.45 + vendorProgress * 0.4 + budgetProgress * 0.15);

  return {
    totalBudget,
    actualExpenditure,
    remainingBudget,
    budgetUtilizationPct,
    contingencyAllocated,
    contingencyRemaining,
    totalTasksCount,
    completedTasksCount,
    pendingTasksCount,
    overdueTasksCount,
    totalVendorsCount,
    bookedVendorsCount,
    pendingPaymentsTotal,
    overallProgressPct,
  };
}
