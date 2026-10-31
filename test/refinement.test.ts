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

