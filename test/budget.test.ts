import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBudget, assessBudgetRealism } from '../src/lib/budgetCalculator.js';

test('Budget math percentages sum to exactly 100', () => {
  const rawBudget = [
    { item: 'Catering and dining', pct: 38, tip: 'Seasonal vegetarian menu' },
    { item: 'Venue hire', pct: 24, tip: 'All inclusive' },
    { item: 'Decor and atmosphere', pct: 14, tip: 'Marigold styling' },
    { item: 'Photography', pct: 12, tip: 'Candids' },
    { item: 'Emergency contingency', pct: 7, tip: 'Emergency buffer' },
  ];

  const normalized = normalizeBudget(rawBudget, 40000);
  const totalPct = normalized.reduce((acc, b) => acc + b.pct, 0);
  assert.equal(totalPct, 100);

  // Check no negatives
  for (const item of normalized) {
    assert.ok(item.pct >= 0, `Percentage for ${item.item} must be non-negative`);
    assert.ok((item.amount || 0) >= 0, `Amount for ${item.item} must be non-negative`);
  }
});

test('Rupee amounts sum exactly to total budget with deterministic remainder rule', () => {
  const testBudgets = [40000, 123456, 77777, 1000000, 333333];

  for (const budget of testBudgets) {
    const rawBudget = [
      { item: 'Catering and dining', pct: 40, tip: 'Meals' },
      { item: 'Venue', pct: 25, tip: 'Hall' },
      { item: 'Decor', pct: 15, tip: 'Lighting' },
      { item: 'Photography', pct: 13, tip: 'Photos' },
      { item: 'Contingency', pct: 7, tip: 'Buffer' },
    ];

    const normalized = normalizeBudget(rawBudget, budget);
    const sumAmounts = normalized.reduce((acc, b) => acc + (b.amount || 0), 0);
    assert.equal(sumAmounts, budget, `Rupee sum must equal exact budget ${budget}`);

    // Verify determinism: running again yields the exact identical array
    const normalizedSecondRun = normalizeBudget(rawBudget, budget);
    assert.deepEqual(normalized, normalizedSecondRun);
  }
});

test('Unrealistic budget assessment flags low budget and offers reduced plan', () => {
  // ₹40,000 for 100 guests in Delhi = ₹400/guest, below wedding benchmark of ₹800/guest
  const result = assessBudgetRealism('Wedding', 100, 40000, 'Delhi');
  assert.equal(result.isUnrealistic, true);
  assert.ok(result.warning?.includes('below the practical benchmark'));
  assert.ok(result.reducedPlanOffer?.includes('reduced plan'));
  assert.ok((result.recommendedGuestCount || 0) <= 50);

  // Realistic budget: ₹15,00,000 for 250 guests = ₹6,000/guest
  const realistic = assessBudgetRealism('Wedding', 250, 1500000, 'Delhi');
  assert.equal(realistic.isUnrealistic, false);
});

