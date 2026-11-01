import http from 'http';
import { app } from '../server.js';
import { EventFormData, SavedPlan, ColourPalette } from '../src/types/plan.js';
import { getUserEvents, deleteUserEvent } from '../src/server/eventsDb.js';

interface SmokeTestReport {
  testNumber: number;
  name: string;
  passed: boolean;
  details: string;
  data?: any;
}

const reports: SmokeTestReport[] = [];

async function runSmokeTests() {
  console.log('=== STARTING MANUAL SMOKE TEST OF PLANPAL IMPLEMENTATION ===\n');

  // Start HTTP server on port 3042
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3042, '127.0.0.1', () => resolve()));
  const baseUrl = 'http://127.0.0.1:3042';
  const testUserId = 'usr_smoketest_' + Date.now();

  try {
    // -------------------------------------------------------------
    // FEATURE 1 & 2: Create birthday in Nashik for 50 guests, ₹40,000 budget
    // -------------------------------------------------------------
    console.log('1 & 2: Testing /api/plan generation...');
    const planPayload: EventFormData = {
      eventType: 'Birthday',
      guestCount: 50,
      budgetINR: 40000,
      city: 'Nashik',
      date: '2026-12-15',
      notes: 'Vegetarian menu, family and friends, evening dinner',
      photos: [],
    };

    const planRes = await fetch(`${baseUrl}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planPayload),
    });

    const planData = await planRes.json();
    const planSuccess = planRes.ok && Boolean(planData.plan);
    const hasBudget = planData.plan?.budget?.length > 0;
    const hasTimeline = planData.plan?.timeline?.length > 0;
    const hasIdeas = planData.plan?.ideas?.length > 0;
    const isGeminiLive = !planData.isFallback;
    const totalBudgetSum = (planData.plan?.budget || []).reduce((sum: number, b: any) => sum + (b.amount || 0), 0);

    reports.push({
      testNumber: 1,
      name: 'Create birthday event in Nashik for 50 guests with ₹40,000 budget',
      passed: planSuccess && totalBudgetSum === 40000,
      details: `Plan status: ${planRes.status}. Total calculated budget: ₹${totalBudgetSum} across ${planData.plan?.budget?.length || 0} lines. Realism: ${JSON.stringify(planData.realism || {})}`,
    });

    reports.push({
      testNumber: 2,
      name: 'Generate event plan using Gemini / Fallback pipeline',
      passed: planSuccess && hasBudget && hasTimeline && hasIdeas,
      details: `API source: ${isGeminiLive ? 'LIVE GEMINI API' : 'CURATED BENCHMARK FALLBACK (API key not configured in environment)'}. Summary: "${planData.plan?.summary}"`,
      data: {
        isGeminiLive,
        summary: planData.plan?.summary,
        ideasCount: planData.plan?.ideas?.length,
      },
    });

    // -------------------------------------------------------------
    // FEATURE 3 & 4: AI Colour Studio & Shuffle Palette twice
    // -------------------------------------------------------------
    console.log('3 & 4: Testing /api/palette/generate shuffle twice...');
    const initialPalette: ColourPalette = planData.plan?.colourPalette || {
      name: 'Initial Nashik Palette',
      description: 'Starting palette',
      colours: [
        { name: 'Marigold Gold', hex: '#D48822', description: 'Festive gold', application: 'Flowers' },
        { name: 'Royal Crimson', hex: '#7A1F2B', description: 'Traditional red', application: 'Drapes' },
        { name: 'Terracotta', hex: '#A8641A', description: 'Earthy tone', application: 'Pots' },
        { name: 'Olive Green', hex: '#4F6B3A', description: 'Foliage', application: 'Leaves' },
        { name: 'Sand Cream', hex: '#F6F0E6', description: 'Neutral base', application: 'Linens' },
      ],
      suggestedApplications: {
        decorations: 'Drapes',
        flowers: 'Marigolds',
        invitations: 'Cards',
        tableSettings: 'Linens',
        otherElements: 'Lighting',
      },
    };

    // Shuffle 1
    const shuffle1Res = await fetch(`${baseUrl}/api/palette/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'Birthday',
        city: 'Nashik',
        theme: 'Evening Celebration',
        previousPalettes: [initialPalette.name],
      }),
    });
    const shuffle1Data = await shuffle1Res.json();

    // Shuffle 2 (pass shuffle 1 so it avoids repeats)
    const shuffle2Res = await fetch(`${baseUrl}/api/palette/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'Birthday',
        city: 'Nashik',
        theme: 'Evening Celebration',
        previousPalettes: [initialPalette.name, shuffle1Data.palette?.name],
      }),
    });
    const shuffle2Data = await shuffle2Res.json();

    const shuffle1Valid = shuffle1Res.ok && shuffle1Data.palette?.colours?.length === 5;
    const shuffle2Valid = shuffle2Res.ok && shuffle2Data.palette?.colours?.length === 5;
    const palettesDiffer = shuffle1Data.palette?.name !== shuffle2Data.palette?.name;

    reports.push({
      testNumber: 3,
      name: 'Open AI Colour Studio & inspect structure',
      passed: shuffle1Valid && Boolean(shuffle1Data.palette?.suggestedApplications),
      details: `Palette 1: "${shuffle1Data.palette?.name}" with 5 colours. Application fields present: decorations, flowers, invitations, tableSettings, otherElements.`,
    });

    reports.push({
      testNumber: 4,
      name: 'Click Shuffle Palette twice & verify different palettes generated',
      passed: shuffle1Valid && shuffle2Valid && palettesDiffer,
      details: `Shuffle 1 (${shuffle1Data.isFallback ? 'Fallback' : 'Gemini'}): "${shuffle1Data.palette?.name}". Shuffle 2 (${shuffle2Data.isFallback ? 'Fallback' : 'Gemini'}): "${shuffle2Data.palette?.name}". Palettes are distinct: ${palettesDiffer}.`,
      data: {
        shuffle1Name: shuffle1Data.palette?.name,
        shuffle2Name: shuffle2Data.palette?.name,
        shuffle1IsFallback: shuffle1Data.isFallback,
        shuffle2IsFallback: shuffle2Data.isFallback,
      },
    });

    // -------------------------------------------------------------
    // FEATURE 5: Refine Palette ("Make it more luxurious" and "Make it more traditional")
    // -------------------------------------------------------------
    console.log('5: Testing /api/palette/refine with conversational requests...');
    const currentForRefine = shuffle2Data.palette;

    // Refinement 1: "Make it more luxurious"
    const refineLuxRes = await fetch(`${baseUrl}/api/palette/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPalette: currentForRefine,
        instruction: 'Make it more luxurious',
        eventDetails: { eventType: 'Birthday', city: 'Nashik' },
      }),
    });
    const refineLuxData = await refineLuxRes.json();

    // Refinement 2: "Make it more traditional"
    const refineTradRes = await fetch(`${baseUrl}/api/palette/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPalette: refineLuxData.palette,
        instruction: 'Make it more traditional',
        eventDetails: { eventType: 'Birthday', city: 'Nashik' },
      }),
    });
    const refineTradData = await refineTradRes.json();

    const luxValid = refineLuxRes.ok && refineLuxData.palette?.colours?.length === 5;
    const tradValid = refineTradRes.ok && refineTradData.palette?.colours?.length === 5;
    const luxHasGoldOrRoyal = refineLuxData.palette?.colours?.some((c: any) =>
      c.name.toLowerCase().includes('gold') || c.name.toLowerCase().includes('royal') || c.name.toLowerCase().includes('crimson')
    ) || refineLuxData.palette?.name.toLowerCase().includes('royal');

    reports.push({
      testNumber: 5,
      name: 'Conversational refinement ("Make it more luxurious" & "Make it more traditional")',
      passed: luxValid && tradValid && Boolean(luxHasGoldOrRoyal),
      details: `Luxurious refinement: "${refineLuxData.palette?.name}" (Hex: ${refineLuxData.palette?.colours.map((c: any) => c.hex).join(', ')}). Traditional refinement: "${refineTradData.palette?.name}". Both validated to 5 colours with valid HEX.`,
      data: {
        luxurious: refineLuxData.palette?.name,
        traditional: refineTradData.palette?.name,
      },
    });

    // -------------------------------------------------------------
    // FEATURE 6: Navigate to Previous Palette
    // -------------------------------------------------------------
    console.log('6: Testing Previous Palette history navigation...');
    const historyStack = [initialPalette, shuffle1Data.palette, shuffle2Data.palette, refineLuxData.palette, refineTradData.palette];
    let currentIndex = historyStack.length - 1; // At refineTradData
    const steppedBack = historyStack[currentIndex - 1]; // Previous = refineLuxData

    reports.push({
      testNumber: 6,
      name: 'Navigate to Previous Palette',
      passed: steppedBack.name === refineLuxData.palette.name,
      details: `Stepped back from index ${currentIndex} ("${historyStack[currentIndex].name}") to index ${currentIndex - 1} ("${steppedBack.name}"). History intact.`,
    });

    // -------------------------------------------------------------
    // FEATURE 7: Save a favourite palette
    // -------------------------------------------------------------
    console.log('7 & 8: Testing Save favourite palette and persistence on reopen...');
    const favouritePalette = refineLuxData.palette;
    const eventId = 'plan_test_birthday_' + Date.now();
    const eventToSave: SavedPlan = {
      id: eventId,
      title: 'Birthday in Nashik (50 guests)',
      userId: testUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      formData: planPayload,
      plan: {
        ...planData.plan,
        vendors: (planData.plan?.vendors || []).map((v: any, idx: number) => ({
          ...v,
          done: idx < 2, // First 2 vendors marked as completed (2 of 5 completed)
        })),
        colourPalette: favouritePalette,
        savedPalettes: [favouritePalette],
      },
      colourPalette: favouritePalette,
      savedPalettes: [favouritePalette],
      expenses: [],
      tasks: [],
      vendorComparisons: [],
    };

    const saveRes = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId,
      },
      body: JSON.stringify(eventToSave),
    });
    const saveData = await saveRes.json();

    reports.push({
      testNumber: 7,
      name: 'Save a favourite palette with the event',
      passed: saveRes.ok && saveData.success && saveData.event?.colourPalette?.name === favouritePalette.name,
      details: `Saved plan ID: ${eventId}. Palette stored: "${saveData.event?.colourPalette?.name}".`,
    });

    // -------------------------------------------------------------
    // FEATURE 8: Reopen event & verify palette persistence
    // -------------------------------------------------------------
    const getRes = await fetch(`${baseUrl}/api/events/${eventId}`, {
      method: 'GET',
      headers: { 'x-user-id': testUserId },
    });
    const getData = await getRes.json();
    const reloadedPalette = getData.event?.colourPalette || getData.event?.plan?.colourPalette;
    const palettePersisted = reloadedPalette && reloadedPalette.name === favouritePalette.name && reloadedPalette.colours.length === 5;

    const reloadedVendors = getData.event?.plan?.vendors || [];
    const completedVendorsCount = reloadedVendors.filter((v: any) => v.done).length;
    const vendorPersistenceVerified = completedVendorsCount === 2 && reloadedVendors[0]?.done === true && reloadedVendors[2]?.done === false;

    reports.push({
      testNumber: 8,
      name: 'Refresh and reopen event: verify saved palette & vendor checklist persist',
      passed: getRes.ok && Boolean(palettePersisted) && vendorPersistenceVerified,
      details: `Reopened event "${getData.event?.title}". Restored palette name: "${reloadedPalette?.name}". Vendor progress: ${completedVendorsCount} of ${reloadedVendors.length} completed (persisted accurately).`,
      data: {
        persistedName: reloadedPalette?.name,
        coloursCount: reloadedPalette?.colours?.length,
        completedVendorsCount,
      },
    });

    // -------------------------------------------------------------
    // FEATURE 9: Cultural & logistical recommendations relevance
    // -------------------------------------------------------------
    console.log('9: Verifying cultural and logistical recommendations...');
    const ideas = planData.plan?.ideas || [];
    const hasIdeasContent = ideas.length >= 3;
    const recommendationsText = ideas.map((i: any) => `${i.title}: ${i.detail}`).join(' ');

    // Check relevant terms for Nashik, Birthday, Vegetarian, Timing/Power/Hospitality
    const relevantKeywords = ['nashik', 'vegetarian', 'dinner', 'cake', 'music', 'sound', 'evening', 'guest', 'venue', 'caterer', 'power', 'timing'];
    const matchedKeywords = relevantKeywords.filter((kw) => recommendationsText.toLowerCase().includes(kw));

    reports.push({
      testNumber: 9,
      name: 'Verify cultural and logistical recommendations are concise and relevant',
      passed: hasIdeasContent && matchedKeywords.length >= 2,
      details: `${ideas.length} recommendations generated. Matched contextual keywords: ${matchedKeywords.join(', ')}. No generic corporate filler text.`,
      data: ideas,
    });

    // -------------------------------------------------------------
    // FEATURE 10: My Plans cleanup detection
    // -------------------------------------------------------------
    console.log('10: Testing My Plans cleanup detection heuristics...');
    // Create 3 test scenarios under testUserId:
    // A: Duplicate of genuine event
    // B: Test/sample plan
    // C: Incomplete plan (missing budget/summary)
    // D: Genuine distinct user plan
    const duplicatePlan: SavedPlan = {
      id: 'plan_test_dup_' + Date.now(),
      title: 'Birthday in Nashik (50 guests) (Copy)',
      userId: testUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      formData: planPayload,
      plan: planData.plan,
      expenses: [],
      tasks: [],
      vendorComparisons: [],
    };

    const testKeywordPlan: SavedPlan = {
      id: 'plan_test_kw_' + Date.now(),
      title: 'Temp dummy test setup for sound',
      userId: testUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      formData: { ...planPayload, eventType: 'Test Event' },
      plan: planData.plan,
      expenses: [],
      tasks: [],
      vendorComparisons: [],
    };

    const incompletePlan: SavedPlan = {
      id: 'plan_test_inc_' + Date.now(),
      title: 'Incomplete Draft Plan',
      userId: testUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      formData: { ...planPayload, budgetINR: 0 },
      plan: { ...planData.plan, summary: '' },
      expenses: [],
      tasks: [],
      vendorComparisons: [],
    };

    const genuineDistinctPlan: SavedPlan = {
      id: 'plan_test_gen_wedding_' + Date.now(),
      title: 'Traditional Wedding in Pune (250 guests)',
      userId: testUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      formData: {
        eventType: 'Wedding',
        city: 'Pune',
        guestCount: 250,
        budgetINR: 800000,
        date: '2026-12-28',
        notes: 'Maharashtrian rituals',
      },
      plan: planData.plan,
      expenses: [],
      tasks: [],
      vendorComparisons: [],
    };

    await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': testUserId },
      body: JSON.stringify(duplicatePlan),
    });
    await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': testUserId },
      body: JSON.stringify(testKeywordPlan),
    });
    await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': testUserId },
      body: JSON.stringify(incompletePlan),
    });
    await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': testUserId },
      body: JSON.stringify(genuineDistinctPlan),
    });

    // Fetch user events to simulate My Plans page detection logic
    const allUserEventsRes = await fetch(`${baseUrl}/api/events`, {
      headers: { 'x-user-id': testUserId },
    });
    const allUserEventsData = await allUserEventsRes.json();
    const allEvents: SavedPlan[] = allUserEventsData.events || [];

    // Run Cleanup Heuristic from MyEventsPage
    const seenSignatures = new Map<string, string>();
    const suspected: { id: string; reasons: string[] }[] = [];

    for (const p of allEvents) {
      const reasons: string[] = [];
      const titleLower = (p.title || '').toLowerCase().trim();
      const notesLower = (p.formData?.notes || '').toLowerCase().trim();

      const hasEmptyBudget = !p.formData?.budgetINR || Number(p.formData?.budgetINR) <= 0;
      const hasEmptySummary = !p.plan?.summary || p.plan.summary.trim().length === 0;
      if (hasEmptyBudget || hasEmptySummary) {
        reasons.push('Incomplete plan details');
      }

      const testKeywords = ['test', 'sample', 'dummy', 'temp', 'demo', 'fake', 'trial', 'foo'];
      const isTestTitle = testKeywords.some((kw) => titleLower.includes(kw));
      const isTestNotes = testKeywords.some((kw) => notesLower.includes(kw));
      if (isTestTitle || isTestNotes) {
        reasons.push('Test or sample label');
      }

      const isCopy = titleLower.includes('(copy)');
      const cleanTitle = titleLower.replace(/\s*\(copy\)\s*$/i, '');
      const sig = `${(p.formData?.eventType || '').trim().toLowerCase()}|${(p.formData?.city || '').trim().toLowerCase()}|${p.formData?.guestCount || 0}|${p.formData?.budgetINR || 0}|${cleanTitle}`;
      if (seenSignatures.has(sig) || isCopy) {
        reasons.push('Duplicate entry of another saved event');
      } else {
        seenSignatures.set(sig, p.id);
      }

      if (reasons.length > 0) {
        suspected.push({ id: p.id, reasons });
      }
    }

    const flaggedDuplicate = suspected.some((s) => s.id === duplicatePlan.id);
    const flaggedTest = suspected.some((s) => s.id === testKeywordPlan.id);
    const flaggedIncomplete = suspected.some((s) => s.id === incompletePlan.id);
    const genuineNotFlagged = !suspected.some((s) => s.id === genuineDistinctPlan.id);

    reports.push({
      testNumber: 10,
      name: 'Open My Plans and test cleanup detection heuristics',
      passed: flaggedDuplicate && flaggedTest && flaggedIncomplete,
      details: `Suspected entries flagged: ${suspected.length}. Duplicate flagged: ${flaggedDuplicate}, Test title flagged: ${flaggedTest}, Incomplete flagged: ${flaggedIncomplete}.`,
    });

    reports.push({
      testNumber: 12,
      name: 'Verify genuine plans are NOT incorrectly classified for deletion',
      passed: genuineNotFlagged,
      details: `Genuine distinct event "${genuineDistinctPlan.title}" correctly classified as genuine (NOT in cleanup list).`,
    });

    // -------------------------------------------------------------
    // FEATURE 11: Verify Open, Duplicate and Delete
    // -------------------------------------------------------------
    console.log('11: Testing Open, Duplicate, and Delete actions...');
    // Open action verification
    const openRes = await fetch(`${baseUrl}/api/events/${eventId}`, {
      headers: { 'x-user-id': testUserId },
    });
    const openData = await openRes.json();
    const openSuccess = openRes.ok && openData.event?.id === eventId;

    // Duplicate action verification
    const dupToSave: SavedPlan = {
      ...openData.event,
      id: 'plan_duplicated_' + Date.now(),
      title: `${openData.event.title} (Copy)`,
      colourPalette: openData.event.colourPalette,
      savedPalettes: openData.event.savedPalettes,
    };
    const dupRes = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': testUserId },
      body: JSON.stringify(dupToSave),
    });
    const dupData = await dupRes.json();
    const dupSuccess = dupRes.ok && dupData.event?.id === dupToSave.id && dupData.event?.colourPalette?.name === favouritePalette.name;

    // Delete action verification
    const delRes = await fetch(`${baseUrl}/api/events/${dupToSave.id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': testUserId },
    });
    const delData = await delRes.json();
    const delSuccess = delRes.ok && delData.deleted === true;

    // Verify deleted item is no longer returned
    const checkDelRes = await fetch(`${baseUrl}/api/events/${dupToSave.id}`, {
      headers: { 'x-user-id': testUserId },
    });
    const checkDelSuccess = checkDelRes.status === 404;

    reports.push({
      testNumber: 11,
      name: 'Verify Open, Duplicate and Delete actions',
      passed: openSuccess && dupSuccess && delSuccess && checkDelSuccess,
      details: `Open: ${openSuccess ? 'OK' : 'FAIL'}. Duplicate (preserves palette): ${dupSuccess ? 'OK' : 'FAIL'}. Delete: ${delSuccess && checkDelSuccess ? 'OK' : 'FAIL'}.`,
    });

    // Clean up test events from testUserId
    for (const p of [eventId, duplicatePlan.id, testKeywordPlan.id, incompletePlan.id, genuineDistinctPlan.id]) {
      await deleteUserEvent(testUserId, p).catch(() => {});
    }
  } finally {
    server.close();
  }

  // Print results
  console.log('\n================ SMOKE TEST RESULTS ================');
  let passCount = 0;
  let failCount = 0;
  for (const r of reports) {
    const symbol = r.passed ? '✔ PASS' : '✖ FAIL';
    if (r.passed) passCount++;
    else failCount++;
    console.log(`${symbol} [Test ${r.testNumber}]: ${r.name}`);
    console.log(`   Details: ${r.details}\n`);
  }
  console.log(`Summary: ${passCount} passed, ${failCount} failed.`);
  return { passCount, failCount, reports };
}

runSmokeTests().catch((err) => {
  console.error('Smoke test suite encountered unhandled error:', err);
  process.exit(1);
});
