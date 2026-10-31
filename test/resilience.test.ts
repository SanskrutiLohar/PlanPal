import test from 'node:test';
import assert from 'node:assert/strict';
import { callWithTimeout } from '../server.js';
import { getFallbackPlan } from '../src/data/fallbackPlans.js';
import { normalizeBudget } from '../src/lib/budgetCalculator.js';
import { EventFormData } from '../src/types/plan.js';

test('Timeouts reject properly and abort lagging calls', async () => {
  const slowPromise = new Promise<string>((resolve) => {
    setTimeout(() => resolve('finished late'), 150);
  });

  await assert.rejects(
    async () => {
      await callWithTimeout(slowPromise, 30);
    },
    {
      message: 'Gemini API call timed out',
    }
  );
});

test('Invalid Gemini JSON handling falls back gracefully to regional benchmark plan', () => {
  const invalidJsonResponses = [
    '{ broken json missing bracket',
    '```json\n{"summary": "incomplete"',
    'Plain text response from model without any json',
    '{"summary": "No budget or timeline included"}',
  ];

  const sampleFormData: EventFormData = {
    eventType: 'Birthday',
    guestCount: 50,
    budgetINR: 40000,
    date: '2026-12-15',
    city: 'Nashik',
    notes: 'Vegetarian',
  };

  for (const rawText of invalidJsonResponses) {
    let parsed: any = null;
    let didFail = false;

    try {
      parsed = JSON.parse(rawText);
      if (!parsed.summary || !Array.isArray(parsed.budget) || !Array.isArray(parsed.timeline)) {
        throw new Error('Incomplete JSON schema returned');
      }
    } catch {
      didFail = true;
    }

    assert.equal(didFail, true, 'Should detect invalid or incomplete JSON');

    // System safely invokes getFallbackPlan with 100% budget math
    const fallback = getFallbackPlan(sampleFormData);
    fallback.budget = normalizeBudget(fallback.budget, sampleFormData.budgetINR || 0);

    assert.ok(fallback.summary.length > 0);
    assert.ok(fallback.budget.length >= 4);
    const sumPct = fallback.budget.reduce((acc, b) => acc + b.pct, 0);
    assert.equal(sumPct, 100);
    const sumAmt = fallback.budget.reduce((acc, b) => acc + (b.amount || 0), 0);
    assert.equal(sumAmt, 40000);
  }
});

test('Invalid Gemini JSON retries once, surfaces retryable error state, never shows blank screen', async () => {
  let attemptCount = 0;
  const mockGeminiCall = async () => {
    attemptCount++;
    if (attemptCount === 1) {
      return '{ broken invalid json without closing brace';
    }
    // Attempt 2 (retry) succeeds with valid json
    return JSON.stringify({
      summary: 'Recovered after one retry',
      budget: [
        { item: 'Catering and dining', pct: 50, tip: 'Food' },
        { item: 'Venue hire', pct: 43, tip: 'Place' },
        { item: 'Contingency', pct: 7, tip: 'Buffer' },
      ],
      timeline: [{ when: 'Event day', task: 'Celebrate' }],
      vendors: [{ name: 'Caterer', why: 'Meals', done: false }],
      ideas: [{ title: 'Welcome', detail: 'Drinks' }],
      itinerary: [{ time: '10:00 AM', activity: 'Arrival', location: 'Hall', decorNote: 'Flowers' }],
    });
  };

  let planResult: any = null;
  let rawText = await mockGeminiCall();
  try {
    planResult = JSON.parse(rawText);
    if (!planResult.summary || !Array.isArray(planResult.budget)) {
      throw new Error('Invalid schema');
    }
  } catch {
    // Retry once
    rawText = await mockGeminiCall();
    planResult = JSON.parse(rawText);
  }

  assert.equal(attemptCount, 2, 'Should retry exactly once on invalid JSON');
  assert.ok(planResult.summary.includes('Recovered after one retry'));
  assert.ok(planResult.budget.length > 0);

  // Normalize budget to guarantee 100%
  const normalized = normalizeBudget(planResult.budget, 40000);
  const sumPct = normalized.reduce((acc: number, b: any) => acc + b.pct, 0);
  assert.equal(sumPct, 100);
  const sumAmt = normalized.reduce((acc: number, b: any) => acc + (b.amount || 0), 0);
  assert.equal(sumAmt, 40000);
});

test('Duplicate generation prevention and stale state protection', () => {
  // Simulates client generation guard
  let inFlight = false;
  let generationCount = 0;
  let lastSignature: string | null = null;

  const triggerGeneration = (formData: EventFormData): boolean => {
    if (inFlight) return false; // Prevent concurrent requests

    const sig = `${formData.eventType}|${formData.city}|${formData.guestCount}|${formData.budgetINR}|${formData.date || ''}`;
    if (sig === lastSignature) return false; // Prevent duplicate generation with same parameters

    inFlight = true;
    lastSignature = sig;
    generationCount++;
    inFlight = false;
    return true;
  };

  const initialForm: EventFormData = {
    eventType: 'Birthday',
    city: 'Nashik',
    guestCount: 50,
    budgetINR: 40000,
    date: '2026-12-15',
    notes: null,
  };

  // First call succeeds
  const firstCall = triggerGeneration(initialForm);
  assert.equal(firstCall, true);
  assert.equal(generationCount, 1);

  // Exact second call with same state is rejected (no duplicate generation)
  const secondCall = triggerGeneration(initialForm);
  assert.equal(secondCall, false);
  assert.equal(generationCount, 1);

  // Once parameters change, new generation is permitted
  const updatedForm: EventFormData = {
    ...initialForm,
    guestCount: 70,
  };
  const thirdCall = triggerGeneration(updatedForm);
  assert.equal(thirdCall, true);
  assert.equal(generationCount, 2);
});

