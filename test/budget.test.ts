import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBudget, assessBudgetRealism, validateBudgetAllocations } from '../src/lib/budgetCalculator.js';

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

test('Budget totals and rounding (budget of 40,001 with 7 lines)', () => {
  // 7 budget lines totaling 100%
  const sevenLineBudget = [
    { item: 'Catering and dining', pct: 35, tip: 'Multi-course menu' },
    { item: 'Venue hire', pct: 25, tip: 'Lawn and banquet' },
    { item: 'Decor and floral', pct: 15, tip: 'Marigold setups' },
    { item: 'Photography and memories', pct: 10, tip: 'Portraits' },
    { item: 'Emergency contingency reserve', pct: 7, tip: 'Emergency buffer' },
    { item: 'Sound and music', pct: 5, tip: 'Traditional music setup' },
    { item: 'Invitations and gifts', pct: 3, tip: 'Eco-friendly invites' },
  ];

  const budget = 40001;
  const normalized = normalizeBudget(sevenLineBudget, budget);

  assert.equal(normalized.length, 7, 'Should retain 7 budget lines');

  // Percentages sum to exactly 100
  const sumPct = normalized.reduce((acc, b) => acc + b.pct, 0);
  assert.equal(sumPct, 100, 'Percentages must total exactly 100%');

  // Rupee amounts sum to exactly 40,001
  const sumAmt = normalized.reduce((acc, b) => acc + (b.amount || 0), 0);
  assert.equal(sumAmt, budget, 'Rupee amounts must sum exactly to 40,001');

  // Deterministic remainder rule: leftover rupees given to the largest line
  // Base amounts: floor(0.35 * 40001) = 14000; floor(0.25 * 40001) = 10000; floor(0.15 * 40001) = 6000;
  // floor(0.10 * 40001) = 4000; floor(0.07 * 40001) = 2800; floor(0.05 * 40001) = 2000; floor(0.03 * 40001) = 1200
  // Sum of base = 14000 + 10000 + 6000 + 4000 + 2800 + 2000 + 1200 = 40000. Remainder = 1 rupee.
  // The largest line is Catering (35%). It must receive the 1 leftover rupee, becoming 14001.
  const catering = normalized.find((b) => b.item.includes('Catering'));
  assert.equal(catering?.amount, 14001, 'Leftover rupee must be given to largest line (Catering)');

  // No negatives
  for (const b of normalized) {
    assert.ok(b.pct >= 0, `Percentage must be non-negative: ${b.item}`);
    assert.ok((b.amount || 0) >= 0, `Amount must be non-negative: ${b.item}`);
  }
});

test('Negative allocation rejected', () => {
  const invalidItems = [
    { item: 'Catering', pct: -20, tip: 'Negative pct' },
    { item: 'Decor', pct: 15, tip: 'Valid pct', amount: -5000 },
    { item: 'Venue', pct: 40, tip: 'Valid' },
  ];

  // Validation function rejects negative allocations
  assert.equal(validateBudgetAllocations(invalidItems), false, 'Validator must reject negative allocations');

  // Normalization rejects negative numbers and produces non-negative output summing to 100%
  const sanitized = normalizeBudget(invalidItems, 50000);
  for (const b of sanitized) {
    assert.ok(b.pct >= 0, `Percentage must be non-negative: ${b.item}`);
    assert.ok((b.amount || 0) >= 0, `Amount must be non-negative: ${b.item}`);
  }

  const sumPct = sanitized.reduce((acc, b) => acc + b.pct, 0);
  assert.equal(sumPct, 100);
  const sumAmt = sanitized.reduce((acc, b) => acc + (b.amount || 0), 0);
  assert.equal(sumAmt, 50000);
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

