import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractSlotsHeuristically,
  parseIndianCurrency,
  getSingleMissingQuestion,
} from '../src/server/chatDiscovery.js';

test('Multi-field extraction from single prompt', () => {
  const prompt = 'Plan a 50-person birthday in Nashik in December, budget Rs 40,000, vegetarian, elegant but affordable';
  const slots = extractSlotsHeuristically(prompt);

  assert.equal(slots.eventType, 'Birthday');
  assert.equal(slots.city, 'Nashik');
  assert.equal(slots.guestCount, 50);
  assert.equal(slots.budgetINR, 40000);
  assert.ok(slots.date?.includes('2026-12'));
  assert.ok(slots.preferences?.includes('Vegetarian catering'));
  assert.ok(slots.preferences?.includes('Elegant decor'));
  assert.ok(slots.constraints?.includes('Affordable cost control'));
  assert.equal(slots.isReady, true);
  assert.equal(slots.missingFields?.length, 0);
});

test('Indian currency parsing variants', () => {
  assert.equal(parseIndianCurrency('40k'), 40000);
  assert.equal(parseIndianCurrency('40 k'), 40000);
  assert.equal(parseIndianCurrency('1.5 lakh'), 150000);
  assert.equal(parseIndianCurrency('1.5 lakhs'), 150000);
  assert.equal(parseIndianCurrency('1.5 lac'), 150000);
  assert.equal(parseIndianCurrency('8 lakhs'), 800000);
  assert.equal(parseIndianCurrency('8 lakh'), 800000);
  assert.equal(parseIndianCurrency('Rs 8,00,000'), 800000);
  assert.equal(parseIndianCurrency('Rs. 8,00,000'), 800000);
  assert.equal(parseIndianCurrency('Rs 40,000'), 40000);
  assert.equal(parseIndianCurrency('₹ 40,000'), 40000);
  assert.equal(parseIndianCurrency('50 thousand'), 50000);
  assert.equal(parseIndianCurrency('2.5 crore'), 25000000);
  assert.equal(parseIndianCurrency('budget Rs 40,000'), 40000);
});

test('Corrections without losing other fields', () => {
  // Turn 1: Initial extraction
  const initial = extractSlotsHeuristically('Plan a 50-person birthday in Nashik with budget 40k');
  assert.equal(initial.eventType, 'Birthday');
  assert.equal(initial.city, 'Nashik');
  assert.equal(initial.guestCount, 50);
  assert.equal(initial.budgetINR, 40000);

  // Turn 2: User corrects guest count: "actually 70 guests"
  const correctedGuests = extractSlotsHeuristically('actually 70 guests', initial);
  assert.equal(correctedGuests.guestCount, 70);
  assert.equal(correctedGuests.eventType, 'Birthday');
  assert.equal(correctedGuests.city, 'Nashik');
  assert.equal(correctedGuests.budgetINR, 40000);

  // Turn 3: User corrects location: "move it to Pune"
  const correctedCity = extractSlotsHeuristically('move it to Pune', correctedGuests);
  assert.equal(correctedCity.city, 'Pune');
  assert.equal(correctedCity.guestCount, 70);
  assert.equal(correctedCity.eventType, 'Birthday');
  assert.equal(correctedCity.budgetINR, 40000);

  // Turn 4: User updates budget: "increase budget to 1.5 lakh"
  const correctedBudget = extractSlotsHeuristically('increase budget to 1.5 lakh', correctedCity);
  assert.equal(correctedBudget.budgetINR, 150000);
  assert.equal(correctedBudget.city, 'Pune');
  assert.equal(correctedBudget.guestCount, 70);
  assert.equal(correctedBudget.eventType, 'Birthday');
});

test('Missing values stay null and only the single most useful question is asked', () => {
  // Empty start
  const blank = extractSlotsHeuristically('Hello, I want to plan an event');
  assert.equal(blank.eventType, null);
  assert.equal(blank.city, null);
  assert.equal(blank.guestCount, null);
  assert.equal(blank.budgetINR, null);
  assert.equal(blank.isReady, false);

  // First missing is event type
  const q1 = getSingleMissingQuestion(blank);
  assert.ok(q1.includes('kind of event') || q1.includes('type of event'));
  assert.ok(!q1.includes('and how many guests'), 'Must ask only a single question');

  // Provide event type only
  const step2 = extractSlotsHeuristically('It is a wedding', blank);
  assert.equal(step2.eventType, 'Wedding');
  assert.equal(step2.city, null);
  const q2 = getSingleMissingQuestion(step2);
  assert.ok(q2.includes('city') || q2.includes('location'));

  // Provide city
  const step3 = extractSlotsHeuristically('in Delhi', step2);
  assert.equal(step3.city, 'Delhi');
  assert.equal(step3.guestCount, null);
  const q3 = getSingleMissingQuestion(step3);
  assert.ok(q3.includes('guests'));

  // Provide guests
  const step4 = extractSlotsHeuristically('200 guests', step3);
  assert.equal(step4.guestCount, 200);
  assert.equal(step4.budgetINR, null);
  const q4 = getSingleMissingQuestion(step4);
  assert.ok(q4.includes('budget'));
});

test('Reasonable assumptions trigger and list assumptions', () => {
  const partial = extractSlotsHeuristically('Birthday in Nashik');
  assert.equal(partial.isReady, false);

  const assumed = extractSlotsHeuristically('make reasonable assumptions', partial);
  assert.equal(assumed.eventType, 'Birthday');
  assert.equal(assumed.city, 'Nashik');
  assert.ok(assumed.guestCount !== null);
  assert.ok(assumed.budgetINR !== null);
  assert.ok(assumed.assumptions && assumed.assumptions.length > 0);
  assert.ok(assumed.assumptions.some((a) => a.toLowerCase().includes('assumed guest count')));
  assert.equal(assumed.isReady, true);
});

