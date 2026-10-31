import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { ExtractedEventSlots } from '../types/plan.js';

function sanitizePlain(str: unknown): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[\u2014\u2015]/g, ' - ')
    .replace(/[\u2013]/g, '-')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/!/g, '.')
    .trim();
}

export const INDIAN_CITIES = [
  'Nashik', 'Pune', 'Mumbai', 'Nagpur', 'Thane', 'Aurangabad', 'Kolhapur',
  'Delhi', 'New Delhi', 'Noida', 'Gurugram', 'Gurgaon', 'Faridabad',
  'Bengaluru', 'Bangalore', 'Mysuru', 'Hyderabad', 'Chennai', 'Coimbatore',
  'Kolkata', 'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot',
  'Jaipur', 'Udaipur', 'Jodhpur', 'Lucknow', 'Kanpur', 'Varanasi',
  'Indore', 'Bhopal', 'Chandigarh', 'Amritsar', 'Dehradun', 'Kochi', 'Goa',
];

export const EVENT_TYPES = [
  { match: /wedding|vivah|shaadi|marriage|nikah|lagna/i, name: 'Wedding' },
  { match: /birthday|bday|first birthday/i, name: 'Birthday' },
  { match: /community|samaj|gathering|society|festival|utsav/i, name: 'Community Gathering' },
  { match: /anniversary/i, name: 'Anniversary' },
  { match: /reception/i, name: 'Reception' },
  { match: /baby shower|godh bharai|dohale jevan/i, name: 'Baby Shower' },
  { match: /housewarming|griha pravesh/i, name: 'Housewarming' },
  { match: /engagement|roka|ring ceremony/i, name: 'Engagement' },
  { match: /sangeet|mehendi|haldi/i, name: 'Pre-wedding Celebration' },
  { match: /corporate|seminar|conference/i, name: 'Corporate Event' },
];

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

/**
 * Parses Indian currency amounts including k, thousand, lakh, lac, crore, and rupee formats.
 * Examples: 40k, 1.5 lakh, 8 lakhs, Rs 8,00,000, Rs 40,000, ₹ 40,000
 */
export function parseIndianCurrency(text: string): number | null {
  if (!text || typeof text !== 'string') return null;

  // 1. Crores (e.g., "1.5 crore", "2 cr")
  const croreMatch = text.match(/(?:(?:rs\.?|₹|inr|budget\s*(?:of|is|:)?)\s*)?(\d+(?:\.\d+)?)\s*(?:crores?|cr\b)/i);
  if (croreMatch) {
    return Math.round(parseFloat(croreMatch[1]) * 10000000);
  }

  // 2. Lakhs / Lacs (e.g., "1.5 lakh", "8 lakhs", "8 lac", "1.5 lac", "8l")
  const lakhMatch = text.match(/(?:(?:rs\.?|₹|inr|budget\s*(?:of|is|:)?)\s*)?(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|lac|l\b)/i);
  if (lakhMatch) {
    return Math.round(parseFloat(lakhMatch[1]) * 100000);
  }

  // 3. Thousands / K (e.g., "40k", "40 k", "50 thousand")
  const kMatch = text.match(/(?:(?:rs\.?|₹|inr|budget\s*(?:of|is|:)?)\s*)?(\d+(?:\.\d+)?)\s*(?:k\b|thousands?)/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }

  // 4. Formatted currency with symbols: Rs 8,00,000, Rs 40,000, ₹ 40,000, INR 800000
  const symbolMatch = text.match(/(?:rs\.?|₹|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (symbolMatch) {
    const cleaned = symbolMatch[1].replace(/,/g, '');
    const val = parseFloat(cleaned);
    if (!isNaN(val) && val > 0) return Math.round(val);
  }

  // 5. Explicit budget prefix: "budget 40000", "budget of 800000", "budget: 40,000"
  const budgetPrefixMatch = text.match(/budget\s*(?:of|is|:)?\s*(?:rs\.?|₹)?\s*([0-9,]{4,10})/i);
  if (budgetPrefixMatch) {
    const cleaned = budgetPrefixMatch[1].replace(/,/g, '');
    const val = parseInt(cleaned, 10);
    if (val >= 1000) return val;
  }

  return null;
}

/**
 * Returns the single most useful missing question.
 * Never asks compound questions.
 */
export function getSingleMissingQuestion(slots: ExtractedEventSlots): string {
  if (!slots.eventType) {
    return 'What kind of event are you planning, such as a wedding, birthday or community celebration?';
  }
  if (!slots.city) {
    return 'Which city or location in India will the event be hosted in?';
  }
  if (slots.guestCount === null || slots.guestCount === undefined) {
    return 'How many guests are you expecting to host?';
  }
  if (slots.budgetINR === null || slots.budgetINR === undefined) {
    return 'What is your estimated total budget in Indian rupees?';
  }
  if (!slots.date) {
    return 'What date or month are you planning for?';
  }
  return 'Are there any specific cultural requirements, venue preferences or catering notes?';
}

/**
 * Heuristically extracts event parameters from user message and merges with previous turn slots.
 * Handles corrections without losing previous data.
 * Missing fields remain null.
 */
export function extractSlotsHeuristically(
  text: string,
  existing: Partial<ExtractedEventSlots> = {}
): ExtractedEventSlots {
  // Preserve existing slots exactly
  const merged: ExtractedEventSlots = {
    eventType: existing.eventType ?? null,
    city: existing.city ?? null,
    guestCount: existing.guestCount ?? null,
    budgetINR: existing.budgetINR ?? null,
    date: existing.date ?? null,
    notes: existing.notes ?? null,
    preferences: existing.preferences ?? null,
    constraints: existing.constraints ?? null,
    themePreference: existing.themePreference ?? null,
    assumptions: existing.assumptions ? [...existing.assumptions] : [],
    isReady: false,
    missingFields: [],
  };

  const lower = text.toLowerCase();

  // Check if user is asking to make reasonable assumptions
  const isAssumptionRequest =
    /(?:make|use|proceed with)?\s*reasonable assumptions|assume (?:the rest|everything|what is needed|whatever)|you (?:choose|decide|pick)|proceed with assumptions/i.test(text);

  // 1. Detect Corrections for City: "move it to Pune", "change city to Pune", "actually in Pune"
  const cityCorrection = text.match(/(?:move(?: it)? to|change city to|shift to|actually in)\s*([A-Za-z\s]+?)(?:[.,;]|$)/i);
  if (cityCorrection) {
    const candidateCity = cityCorrection[1].trim();
    const matchedCity = INDIAN_CITIES.find((c) => c.toLowerCase() === candidateCity.toLowerCase());
    if (matchedCity) {
      merged.city = matchedCity;
    } else if (candidateCity.length > 2) {
      merged.city = candidateCity;
    }
  } else {
    // Normal city detection
    for (const city of INDIAN_CITIES) {
      const cityRegex = new RegExp(`\\b${city}\\b`, 'i');
      if (cityRegex.test(text)) {
        merged.city = city;
        break;
      }
    }
  }

  // 2. Detect Corrections for Guest Count: "actually 70 guests", "make that 70 guests", "70 guests instead"
  const guestCorrection =
    text.match(/(?:actually|change (?:guests? )?to|make that|update to)\s*(\d{1,5})\s*(?:guests?|people|pax|persons)?/i) ||
    text.match(/(\d{1,5})\s*(?:guests?|people|pax|persons)\s*instead/i);

  if (guestCorrection) {
    merged.guestCount = parseInt(guestCorrection[1], 10);
  } else {
    // Standard guest count detection including hyphenated forms: "50-person", "50 person", "50 guests"
    const guestMatch =
      text.match(/(\d{1,5})\s*[- ]?\s*(?:person|people|guests?|attendees?|pax|persons|members|relatives)/i) ||
      text.match(/(?:guests?|attendance|gathering of)\s*[:=-]?\s*(\d{1,5})/i);
    if (guestMatch) {
      merged.guestCount = parseInt(guestMatch[1], 10);
    }
  }

  // 3. Detect Budget & Currency Parsing: 40k, 1.5 lakh, 8 lakhs, Rs 8,00,000, Rs 40,000
  const parsedBudget = parseIndianCurrency(text);
  if (parsedBudget !== null) {
    merged.budgetINR = parsedBudget;
  }

  // 4. Detect Event Type
  for (const t of EVENT_TYPES) {
    if (t.match.test(lower)) {
      merged.eventType = t.name;
      break;
    }
  }

  // 5. Detect Date
  // Explicit date: YYYY-MM-DD
  const dateMatch = text.match(/\b(202\d-[01]\d-[0-3]\d)\b/);
  if (dateMatch) {
    merged.date = dateMatch[1];
  } else {
    // Month detection e.g. "in December", "December"
    for (let m = 0; m < MONTH_NAMES.length; m++) {
      const monthName = MONTH_NAMES[m];
      const monthRegex = new RegExp(`\\b(?:in\\s+)?(${monthName})\\b(?:\\s+(202\\d))?`, 'i');
      const match = text.match(monthRegex);
      if (match) {
        const year = match[2] ? parseInt(match[2], 10) : 2026;
        const monthNum = String(m + 1).padStart(2, '0');
        merged.date = `${year}-${monthNum}-15`;
        break;
      }
    }
  }

  // 6. Preferences & Constraints (e.g., "vegetarian, elegant but affordable")
  const extractedPrefs: string[] = [];
  const extractedConstraints: string[] = [];

  if (/vegetarian|pure veg|jain/i.test(lower)) extractedPrefs.push('Vegetarian catering');
  if (/non-veg|halal/i.test(lower)) extractedPrefs.push('Non-vegetarian catering');
  if (/elegant|regal|royal|traditional/i.test(lower)) extractedPrefs.push('Elegant decor');
  if (/outdoor|lawn|garden/i.test(lower)) extractedPrefs.push('Outdoor lawn setting');
  if (/indoor|banquet|hall/i.test(lower)) extractedPrefs.push('Indoor banquet venue');
  if (/affordable|budget-friendly|tight budget|low cost/i.test(lower)) extractedConstraints.push('Affordable cost control');

  if (extractedPrefs.length > 0) {
    merged.preferences = extractedPrefs.join(', ');
  }
  if (extractedConstraints.length > 0) {
    merged.constraints = extractedConstraints.join(', ');
  }

  // Update notes if preferences or constraints were found
  const combinedNotes: string[] = [];
  if (merged.notes) combinedNotes.push(merged.notes);
  if (merged.preferences && !combinedNotes.includes(merged.preferences)) combinedNotes.push(merged.preferences);
  if (merged.constraints && !combinedNotes.includes(merged.constraints)) combinedNotes.push(merged.constraints);
  if (combinedNotes.length > 0) {
    merged.notes = combinedNotes.join('. ');
  }

  // 7. Handle "make reasonable assumptions"
  if (isAssumptionRequest) {
    const newAssumptions: string[] = [];
    if (!merged.eventType) {
      merged.eventType = 'Family Celebration';
      newAssumptions.push('Assumed event type: Family Celebration');
    }
    if (!merged.city) {
      merged.city = 'Pune';
      newAssumptions.push('Assumed location: Pune');
    }
    if (merged.guestCount === null || merged.guestCount === undefined) {
      merged.guestCount = merged.eventType === 'Wedding' ? 150 : 50;
      newAssumptions.push(`Assumed guest count: ${merged.guestCount} guests`);
    }
    if (merged.budgetINR === null || merged.budgetINR === undefined) {
      merged.budgetINR = merged.eventType === 'Wedding' ? 500000 : 50000;
      newAssumptions.push(`Assumed budget: ₹${merged.budgetINR.toLocaleString('en-IN')}`);
    }
    if (!merged.date) {
      merged.date = '2026-12-15';
      newAssumptions.push('Assumed date: December 2026');
    }
    merged.assumptions = [...(merged.assumptions || []), ...newAssumptions];
  }

  // Determine missing mandatory fields (missing fields stay null, no silent fallbacks)
  const missing: string[] = [];
  if (!merged.eventType) missing.push('event type');
  if (!merged.city) missing.push('city');
  if (merged.guestCount === null || merged.guestCount === undefined) missing.push('guest count');
  if (merged.budgetINR === null || merged.budgetINR === undefined) missing.push('budget');

  merged.missingFields = missing;
  merged.isReady = missing.length === 0;

  return merged;
}

/**
 * Progressive conversational discovery processor.
 * Keeps extracted fields between turns, handles corrections, asks single missing question,
 * and proceeds with assumptions if requested.
 */
export async function processDiscoveryMessage(
  ai: GoogleGenAI | null,
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  currentSlots: Partial<ExtractedEventSlots> = {}
): Promise<{ reply: string; slots: ExtractedEventSlots; isReady: boolean }> {
  const slots = extractSlotsHeuristically(userMessage, currentSlots);

  // If user requested assumptions, list them directly and clearly
  if (slots.assumptions && slots.assumptions.length > 0 && slots.isReady) {
    const assumptionList = slots.assumptions.map((a) => `• ${a}`).join('\n');
    const reply = `I have proceeded with the following reasonable assumptions:\n${assumptionList}\n\nWe are ready to generate your plan for a ${slots.eventType} in ${slots.city} for ${slots.guestCount} guests with a budget of ₹${(slots.budgetINR || 0).toLocaleString('en-IN')}. Please confirm if you would like to proceed or adjust any details.`;
    return {
      reply: sanitizePlain(reply),
      slots,
      isReady: true,
    };
  }

  // If AI is available, attempt conversational refinement while strictly respecting slot constraints
  if (ai) {
    try {
      const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
      const prompt = `You are PlanPal's event discovery specialist in India.
Current event slots extracted from previous conversation:
${JSON.stringify(slots, null, 2)}

User's latest message:
"${userMessage}"

Today's date in India is ${todayIST}.

Rules:
1. If any mandatory fields (eventType, city, guestCount, budgetINR) are missing, ask ONLY the single most useful missing question. Never ask multiple questions in one turn.
2. If all required fields are present, confirm the details concisely in 1-2 plain sentences.
3. No emojis. No buzzwords (seamless, magical, perfect, elevate, journey). Plain language.
4. Do not invent defaults if missing. Keep missing values null unless the user asked to make assumptions.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING, description: 'Single follow-up question or readiness statement' },
              eventType: { type: Type.STRING, nullable: true },
              city: { type: Type.STRING, nullable: true },
              guestCount: { type: Type.NUMBER, nullable: true },
              budgetINR: { type: Type.NUMBER, nullable: true },
              date: { type: Type.STRING, nullable: true },
              notes: { type: Type.STRING, nullable: true },
              isReady: { type: Type.BOOLEAN },
            },
            required: ['reply'],
          },
          temperature: 0.2,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const text = response.text?.trim() || '';
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.eventType && !slots.eventType) slots.eventType = sanitizePlain(parsed.eventType);
        if (parsed.city && !slots.city) slots.city = sanitizePlain(parsed.city);
        if (parsed.guestCount && slots.guestCount === null) slots.guestCount = Number(parsed.guestCount);
        if (parsed.budgetINR && slots.budgetINR === null) slots.budgetINR = Number(parsed.budgetINR);
        if (parsed.date && !slots.date) slots.date = sanitizePlain(parsed.date);
        if (parsed.notes && !slots.notes) slots.notes = sanitizePlain(parsed.notes);

        // Re-evaluate readiness strictly
        slots.isReady = Boolean(slots.eventType && slots.city && slots.guestCount && slots.budgetINR);
        slots.missingFields = [];
        if (!slots.eventType) slots.missingFields.push('event type');
        if (!slots.city) slots.missingFields.push('city');
        if (slots.guestCount === null || slots.guestCount === undefined) slots.missingFields.push('guest count');
        if (slots.budgetINR === null || slots.budgetINR === undefined) slots.missingFields.push('budget');

        let reply = sanitizePlain(parsed.reply);
        // If still missing fields, enforce the single most useful missing question rule
        if (!slots.isReady) {
          reply = getSingleMissingQuestion(slots);
        }

        return {
          reply,
          slots,
          isReady: slots.isReady,
        };
      }
    } catch (err: any) {
      console.warn('Discovery Gemini call failed, using heuristic extraction:', err?.message || err);
    }
  }

  // Deterministic fallback response
  let reply = '';
  if (slots.isReady) {
    const formattedBudget = (slots.budgetINR || 0).toLocaleString('en-IN');
    const dateText = slots.date ? ` for ${slots.date}` : '';
    reply = `I have gathered your details for a ${slots.eventType} in ${slots.city} for ${slots.guestCount} guests with a budget of ₹${formattedBudget}${dateText}. I am ready to generate your customized plan.`;
  } else {
    // Ask only the single most useful missing question
    reply = getSingleMissingQuestion(slots);
  }

  return {
    reply: sanitizePlain(reply),
    slots,
    isReady: slots.isReady,
  };
}
