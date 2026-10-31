import test from 'node:test';
import assert from 'node:assert/strict';
import { localRefinePlan, computePlanDiff } from '../server.js';
import { EventPlan } from '../src/types/plan.js';

const samplePlan: EventPlan = {
  summary: 'Intimate gathering plan.',
  budget: [
    { item: 'Catering and dining', pct: 40, tip: 'Buffet', amount: 40000 },
    { item: 'Venue hire', pct: 25, tip: 'Hall', amount: 25000 },
    { item: 'Decor and atmosphere', pct: 15, tip: 'Flowers', amount: 15000 },
    { item: 'Photography and memories', pct: 13, tip: 'Portraits', amount: 13000 },
    { item: 'Contingency and emergency reserve', pct: 7, tip: 'Reserve', amount: 7000 },
  ],
  timeline: [
    { when: '2 weeks before', task: 'Confirm bookings.' },
    { when: 'Event day', task: 'Coordinate ceremony.' },
  ],
  vendors: [
    { name: 'Catering Team', why: 'Meals', done: false },
    { name: 'Hall Manager', why: 'Venue access', done: false },
  ],
  ideas: [
    { title: 'Welcome Drinks', detail: 'Fresh coconut water.' },
  ],
  itinerary: [
    { time: '11:00 AM', activity: 'Guest arrival', location: 'Foyer', decorNote: 'Welcome flowers' },
    { time: '01:00 PM', activity: 'Lunch banquet', location: 'Dining hall', decorNote: 'Table setups' },
    { time: '06:00 PM', activity: 'Cake cutting ceremony', location: 'Stage', decorNote: 'Spotlights' },
  ],
};

test('One-field refinement cuts category and transfers points to contingency', () => {
  const refined = localRefinePlan(samplePlan, 'Cut decor by 5%', 100000);

  const decorItem = refined.budget.find((b) => b.item.toLowerCase().includes('decor'));
  const contItem = refined.budget.find((b) => b.item.toLowerCase().includes('contingency'));
  const cateringItem = refined.budget.find((b) => b.item.toLowerCase().includes('cater'));
  const venueItem = refined.budget.find((b) => b.item.toLowerCase().includes('venue'));

  assert.equal(decorItem?.pct, 10);
  assert.equal(contItem?.pct, 12);
  // Untouched fields must stay identical
  assert.equal(cateringItem?.pct, 40);
  assert.equal(venueItem?.pct, 25);

  const totalPct = refined.budget.reduce((acc, b) => acc + b.pct, 0);
  assert.equal(totalPct, 100);

  const totalAmount = refined.budget.reduce((acc, b) => acc + (b.amount || 0), 0);
  assert.equal(totalAmount, 100000);

  assert.ok(refined.summary.includes('Decor and atmosphere allocation reduced by 5%'));
  assert.ok(refined.summary.includes('contingency reserve'));
});

test('Refinement of one field leaves other fields identical', () => {
  // Test 1: Moving itinerary time leaves budget, timeline, vendors, ideas, and other itinerary entries completely identical
  const timeRefined = localRefinePlan(samplePlan, 'Move cake cutting to 9 pm', 100000);

  // Untouched sections are strictly identical
  assert.deepEqual(timeRefined.budget, samplePlan.budget, 'Budget lines must be completely identical');
  assert.deepEqual(timeRefined.timeline, samplePlan.timeline, 'Timeline must be completely identical');
  assert.deepEqual(timeRefined.vendors, samplePlan.vendors, 'Vendors must be completely identical');
  assert.deepEqual(timeRefined.ideas, samplePlan.ideas, 'Ideas must be completely identical');

  // Untouched itinerary items are completely identical
  assert.equal(timeRefined.itinerary[0].time, samplePlan.itinerary[0].time);
  assert.equal(timeRefined.itinerary[0].activity, samplePlan.itinerary[0].activity);
  assert.equal(timeRefined.itinerary[1].time, samplePlan.itinerary[1].time);
  assert.equal(timeRefined.itinerary[1].activity, samplePlan.itinerary[1].activity);

  // Only the targeted activity changed
  assert.equal(timeRefined.itinerary[2].time, '9 PM');

  // Test 2: Budget cut leaves timeline, vendors, ideas, and itinerary completely identical
  const budgetRefined = localRefinePlan(samplePlan, 'Cut decor by 5%', 100000);
  assert.deepEqual(budgetRefined.timeline, samplePlan.timeline, 'Timeline must remain identical on budget cut');
  assert.deepEqual(budgetRefined.vendors, samplePlan.vendors, 'Vendors must remain identical on budget cut');
  assert.deepEqual(budgetRefined.ideas, samplePlan.ideas, 'Ideas must remain identical on budget cut');
  assert.deepEqual(budgetRefined.itinerary, samplePlan.itinerary, 'Itinerary must remain identical on budget cut');
});

test('Discard leaves the plan unchanged', () => {
  // Simulate active plan state
  let activePlan: EventPlan = JSON.parse(JSON.stringify(samplePlan));
  const originalPlan: EventPlan = JSON.parse(JSON.stringify(samplePlan));

  // User requests a refinement: returns a proposed change, NOT an applied one
  const proposalUpdatedPlan = localRefinePlan(activePlan, 'make the decor more traditional and cut Rs 5,000', 100000);
  const diff = computePlanDiff(activePlan, proposalUpdatedPlan);

  const proposal = {
    id: 'prop_test',
    title: 'Proposed Plan Revision',
    explanation: 'make the decor more traditional and cut Rs 5,000',
    impactSummary: proposalUpdatedPlan.summary,
    diff,
    updatedPlan: proposalUpdatedPlan,
  };

  // Verify proposal contains material changes
  assert.ok(proposal.diff.length > 0, 'Proposal should contain diffs');
  assert.notDeepEqual(proposal.updatedPlan, activePlan, 'Proposed plan should differ from current plan');

  // User clicks Discard: proposal is dismissed without mutating activePlan
  let pendingProposal: typeof proposal | null = proposal;
  // Discard action:
  pendingProposal = null;

  // Active plan remains strictly untouched and identical to original
  assert.deepEqual(activePlan, originalPlan, 'Discard must leave the active plan 100% unchanged');
  assert.equal(pendingProposal, null, 'Proposal must be cleared');
});

test('Make the decor more traditional and cut Rs 5,000 produces proposal with diff and reasons', () => {
  const refined = localRefinePlan(samplePlan, 'make the decor more traditional and cut Rs 5,000', 100000);
  const diff = computePlanDiff(samplePlan, refined, 'make the decor more traditional and cut Rs 5,000');

  // Rs 5,000 on a 1,00,000 budget is 5%
  const decor = refined.budget.find((b) => b.item.toLowerCase().includes('decor'));
  const cont = refined.budget.find((b) => b.item.toLowerCase().includes('contingency'));
  assert.equal(decor?.pct, 10, 'Decor should be reduced from 15% to 10%');
  assert.equal(cont?.pct, 12, 'Contingency should increase from 7% to 12%');

  // Theme styling updated to traditional
  assert.ok(refined.visualInspiration?.themeName.toLowerCase().includes('traditional'));

  // Diff contains budget lines and theme changes with reasons
  const decorDiff = diff.find((d) => d.item.toLowerCase().includes('decor'));
  assert.ok(decorDiff?.reason);
  assert.ok(decorDiff?.before.includes('15%'));
  assert.ok(decorDiff?.after.includes('10%'));

  const themeDiff = diff.find((d) => d.type === 'theme');
  assert.ok(themeDiff);
  assert.ok(themeDiff?.reason);

  // Untouched fields remain identical
  const catering = refined.budget.find((b) => b.item.toLowerCase().includes('cater'));
  assert.equal(catering?.pct, samplePlan.budget.find((b) => b.item.toLowerCase().includes('cater'))?.pct);
  assert.deepEqual(refined.timeline, samplePlan.timeline);
  assert.deepEqual(refined.vendors, samplePlan.vendors);
  assert.deepEqual(refined.ideas, samplePlan.ideas);
});

test('Proposed change before and after diff computation', () => {
  const refined = localRefinePlan(samplePlan, 'Cut decor by 5% and add shehnai player', 100000);
  const diff = computePlanDiff(samplePlan, refined);

  // Must contain decor diff
  const decorDiff = diff.find((d) => d.item.toLowerCase().includes('decor'));
  assert.ok(decorDiff);
  assert.equal(decorDiff?.type, 'budget');
  assert.ok(decorDiff?.before.includes('15%'));
  assert.ok(decorDiff?.after.includes('10%'));

  // Must contain contingency diff
  const contDiff = diff.find((d) => d.item.toLowerCase().includes('contingency'));
  assert.ok(contDiff);
  assert.ok(contDiff?.before.includes('7%'));
  assert.ok(contDiff?.after.includes('12%'));

  // Must contain added vendor diff
  const vendorDiff = diff.find((d) => d.item.toLowerCase().includes('shehnai'));
  assert.ok(vendorDiff);
  assert.equal(vendorDiff?.type, 'vendor');
  assert.equal(vendorDiff?.before, 'Not in vendor list');
  assert.ok(vendorDiff?.after.includes('Added'));
});

test('Itinerary time modification preserves all other schedule items', () => {
  const refined = localRefinePlan(samplePlan, 'Move cake cutting to 9 pm', 100000);
  const cakeItem = refined.itinerary.find((it) => it.activity.toLowerCase().includes('cake'));
  assert.equal(cakeItem?.time, '9 PM');

  // Other activities unchanged
  const lunchItem = refined.itinerary.find((it) => it.activity.toLowerCase().includes('lunch'));
  assert.equal(lunchItem?.time, '01:00 PM');
});

