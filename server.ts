import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { EventPlan, EventFormData, SavedPlan, PlanDiffItem, ColourPalette } from './src/types/plan.js';
import { getFallbackPlan } from './src/data/fallbackPlans.js';
import { apiRateLimiter } from './src/server/rateLimiter.js';
import { planRequestSchema, refineRequestSchema, aiAssistantRequestSchema, eventSaveSchema, chatDiscoveryRequestSchema, paletteGenerateRequestSchema, paletteRefineRequestSchema } from './src/server/validation.js';
import { getUserEvents, saveUserEvent, deleteUserEvent, getEventById } from './src/server/eventsDb.js';
import { processAIAssistantMessage } from './src/server/aiAssistant.js';
import { generateIntelligentTimeline } from './src/server/timelineGenerator.js';
import { normalizeBudget, assessBudgetRealism } from './src/lib/budgetCalculator.js';
import { processDiscoveryMessage } from './src/server/chatDiscovery.js';
import { generatePaletteWithGemini, refinePaletteWithGemini, validateAndNormalizePalette, CURATED_PALETTES } from './src/server/colourStudio.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));
app.use('/api', apiRateLimiter);

const SYSTEM_INSTRUCTION = `You are an experienced event planner who knows weddings, birthdays and community events in India.
Write in plain, specific language. Do not use emojis, em dashes or marketing phrases such as seamless, unlock, elevate or perfect.
Amounts are in Indian rupees. Budget percentages must add up to 100.
Respect the user's culture, food preferences, city and budget.
Return only valid JSON that matches the schema. No extra text.

Budget rules:
- Percentages add up to exactly 100.
- Every vendor you list must be covered by a budget line. If a cost has no line, add one or name the line that covers it.
- Do not state official government fees, permit costs or legal timelines as facts. Say "check the current fee with the local office" or "ask the local registrar how far ahead to file" instead.
- When a cost is a government fee you are unsure of, give it a small placeholder line and label it as an estimate.
- Compare the budget with typical per-guest catering and venue costs for the city and event type. If the budget is clearly too low, say so in the first sentence of the summary, state the per-guest assumption you used, and give a reduced version of the plan instead of pretending it fits. If the budget cannot cover the guest count, suggest a smaller guest list as part of the reduced format.

Timeline rules:
- Do not state legal timelines or notice periods as facts. Say "ask the local registrar how far ahead to file" instead.

Refinement rules:
- When the user cuts a budget line by a percentage, apply it to that line, move the saved points into the contingency line, and say so in the summary.
- Keep everything the user did not mention exactly as it was.

Culture and realism:
- Use ceremony names only when you are confident they belong to that community and that day. If unsure, describe the step in plain words.
- Keep event durations realistic for the event type.

Recommendation rules:
- Generate 3 to 4 concise, practical and relevant recommendations based on the event type, location, budget, guest count, and user preferences.
- Include cultural suggestions only when relevant to the local traditions of the specified city and community.
- Provide practical logistical advice (e.g. generator power backup for audio, parking/valet coordination, catering queue flow, climate/weather comfort for guests).
- Avoid generic, repetitive paragraphs.
- Do not invent local facts or claim unverified information.
- Prioritize recommendations that genuinely help execute the event on the day.`;

const PLAN_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'A clear, one to two sentence overview of the event plan with no buzzwords.',
    },
    budget: {
      type: Type.ARRAY,
      description: 'Categorised budget split. Percentages must sum to 100.',
      items: {
        type: Type.OBJECT,
        properties: {
          item: { type: Type.STRING, description: 'Budget category title' },
          pct: { type: Type.NUMBER, description: 'Integer percentage of total budget' },
          tip: { type: Type.STRING, description: 'Specific planning or negotiation tip' },
        },
        required: ['item', 'pct', 'tip'],
      },
    },
    timeline: {
      type: Type.ARRAY,
      description: 'Dated chronological milestones leading up to and during the event day.',
      items: {
        type: Type.OBJECT,
        properties: {
          when: { type: Type.STRING, description: 'Milestone timing e.g. 6 months before, Event day' },
          task: { type: Type.STRING, description: 'Concrete planning action' },
        },
        required: ['when', 'task'],
      },
    },
    vendors: {
      type: Type.ARRAY,
      description: 'Vendor roles to book with reasons.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Vendor role title' },
          why: { type: Type.STRING, description: 'Why this vendor is needed' },
          done: { type: Type.BOOLEAN, description: 'Default false' },
        },
        required: ['name', 'why', 'done'],
      },
    },
    ideas: {
      type: Type.ARRAY,
      description: 'Three to four cultural or logistical recommendations.',
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Idea heading' },
          detail: { type: Type.STRING, description: 'Plain description of the idea' },
        },
        required: ['title', 'detail'],
      },
    },
    photoAnalysis: {
      type: Type.OBJECT,
      description: 'Analysis of venue/theme reference photos if provided.',
      properties: {
        isRelevant: {
          type: Type.BOOLEAN,
          description:
            'True if uploaded images depict an event venue, decor, stage, setup, floorplan or celebration theme reference. False if irrelevant or not a venue/theme photo.',
        },
        setting: { type: Type.STRING, description: 'Description of the physical setting' },
        colors: { type: Type.STRING, description: 'Dominant color palette and textiles seen' },
        style: { type: Type.STRING, description: 'Decor and visual style' },
        spaceNotes: { type: Type.STRING, description: 'Logistical layout observations' },
      },
      required: ['isRelevant', 'setting', 'colors', 'style', 'spaceNotes'],
    },
    visualInspiration: {
      type: Type.OBJECT,
      description: 'Visual theme, color palette, and decor inspiration for the event.',
      properties: {
        themeName: { type: Type.STRING, description: 'Theme title e.g. Royal Marigold and Terracotta' },
        palette: {
          type: Type.ARRAY,
          description: '4 to 5 harmonised theme colors with name and hex code',
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'Color name e.g. Deep Maroon, Warm Marigold, Sand Cream' },
              hex: { type: Type.STRING, description: 'Valid hex color code e.g. #7A1F2B' },
            },
            required: ['name', 'hex'],
          },
        },
        stageConcept: { type: Type.STRING, description: 'Description of backdrop, seating, and stage aesthetics' },
        tableSetting: { type: Type.STRING, description: 'Centerpieces, linen, and dining table presentation' },
        floralAndLighting: { type: Type.STRING, description: 'Fresh floral varieties and ambient evening lighting setup' },
      },
      required: ['themeName', 'palette', 'stageConcept', 'tableSetting', 'floralAndLighting'],
    },
    itinerary: {
      type: Type.ARRAY,
      description:
        'Hour-by-hour schedule covering the event day, referring directly to what is visible in photos or event details.',
      items: {
        type: Type.OBJECT,
        properties: {
          time: { type: Type.STRING, description: 'Time of day e.g. 10:00 AM, 01:30 PM, 07:00 PM' },
          activity: { type: Type.STRING, description: 'Event activity or ceremony milestone' },
          location: { type: Type.STRING, description: 'Specific location within the venue' },
          decorNote: { type: Type.STRING, description: 'Decor and atmosphere detail for this milestone' },
        },
        required: ['time', 'activity', 'location', 'decorNote'],
      },
    },
  },
  required: ['summary', 'budget', 'timeline', 'vendors', 'ideas', 'itinerary'],
};

function sanitizeString(str: unknown): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[\u2014\u2015]/g, ' - ')
    .replace(/[\u2013]/g, '-')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/!/g, '.')
    .trim();
}

function checkBudgetSumsTo100(budget: any[]): boolean {
  if (!Array.isArray(budget) || budget.length === 0) return false;
  const sum = budget.reduce((acc, curr) => acc + (Number(curr.pct) || 0), 0);
  return Math.round(sum) === 100;
}

function scaleBudgetProportionally(budget: any[], totalBudget: number): any[] {
  if (!Array.isArray(budget) || budget.length === 0) return [];
  const currentSum = budget.reduce((acc, curr) => acc + (Number(curr.pct) || 0), 0);
  if (Math.round(currentSum) === 100) {
    return budget.map((b) => {
      const pct = Math.max(1, Math.round(Number(b.pct) || 0));
      return {
        ...b,
        pct,
        amount: Math.round((pct / 100) * totalBudget),
      };
    });
  }

  let allocated = 0;
  return budget.map((b, i) => {
    let pct: number;
    if (i === budget.length - 1) {
      pct = Math.max(1, 100 - allocated);
    } else {
      pct = Math.max(1, Math.round(((Number(b.pct) || 0) / (currentSum || 1)) * 100));
      allocated += pct;
    }
    return {
      ...b,
      pct,
      amount: Math.round((pct / 100) * totalBudget),
    };
  });
}

function sanitizePlan(raw: any, totalBudget: number, photosCount: number = 0): EventPlan {
  let budget = Array.isArray(raw.budget) ? raw.budget.map((b: any) => {
    const pct = Math.max(1, Math.round(Number(b.pct) || 0));
    return {
      item: sanitizeString(b.item),
      pct,
      tip: sanitizeString(b.tip),
      amount: Math.round((pct / 100) * totalBudget),
    };
  }) : [];

  // Ensure percentages strictly sum to 100% and amounts match total budget to single rupee with contingency
  budget = normalizeBudget(budget, totalBudget);

  const timeline = Array.isArray(raw.timeline) ? raw.timeline.map((t: any) => ({
    when: sanitizeString(t.when),
    task: sanitizeString(t.task),
  })) : [];

  const vendors = Array.isArray(raw.vendors) ? raw.vendors.map((v: any) => ({
    name: sanitizeString(v.name),
    why: sanitizeString(v.why),
    done: Boolean(v.done),
  })) : [];

  const ideas = Array.isArray(raw.ideas) ? raw.ideas.map((i: any) => ({
    title: sanitizeString(i.title),
    detail: sanitizeString(i.detail),
  })) : [];

  const itinerary = Array.isArray(raw.itinerary) && raw.itinerary.length > 0
    ? raw.itinerary.map((it: any) => ({
        time: sanitizeString(it.time),
        activity: sanitizeString(it.activity),
        location: sanitizeString(it.location),
        decorNote: sanitizeString(it.decorNote),
      }))
    : [
        { time: '09:00 AM', activity: 'Venue setup and vendor arrival', location: 'Main hall', decorNote: 'Stage setup and sound check' },
        { time: '11:00 AM', activity: 'Guest arrival and welcome refreshments', location: 'Foyer', decorNote: 'Welcome drinks and registration' },
        { time: '01:00 PM', activity: 'Main ceremony and luncheon banquet', location: 'Dining pavilion', decorNote: 'Buffet dining and table service' },
        { time: '04:00 PM', activity: 'Felicitation and cultural performances', location: 'Main stage', decorNote: 'Stage lighting and audio' },
        { time: '07:00 PM', activity: 'Evening reception and wrap-up', location: 'Banquet hall', decorNote: 'Evening dinner and vendor settlement' },
      ];

  let photoAnalysis: any = null;
  if (raw.photoAnalysis && typeof raw.photoAnalysis === 'object') {
    photoAnalysis = {
      isRelevant: Boolean(raw.photoAnalysis.isRelevant),
      setting: sanitizeString(raw.photoAnalysis.setting),
      colors: sanitizeString(raw.photoAnalysis.colors),
      style: sanitizeString(raw.photoAnalysis.style),
      spaceNotes: sanitizeString(raw.photoAnalysis.spaceNotes),
    };
  }

  let visualInspiration: any = undefined;
  if (raw.visualInspiration && typeof raw.visualInspiration === 'object') {
    const rawPalette = Array.isArray(raw.visualInspiration.palette) ? raw.visualInspiration.palette : [];
    const validHex = (hex: string, fallback: string) => (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex) ? hex : fallback);
    const palette = rawPalette.length > 0
      ? rawPalette.slice(0, 5).map((p: any, idx: number) => ({
          name: sanitizeString(p.name) || `Tone ${idx + 1}`,
          hex: validHex(p.hex, ['#7A1F2B', '#A8641A', '#F6F0E6', '#4F6B3A', '#D48822'][idx % 5]),
        }))
      : [
          { name: 'Deep Maroon', hex: '#7A1F2B' },
          { name: 'Warm Terracotta', hex: '#A8641A' },
          { name: 'Sand Cream', hex: '#F6F0E6' },
          { name: 'Olive Green', hex: '#4F6B3A' },
        ];

    visualInspiration = {
      themeName: sanitizeString(raw.visualInspiration.themeName) || 'Regional Elegance',
      palette,
      stageConcept: sanitizeString(raw.visualInspiration.stageConcept) || 'Traditional open stage framed with seasonal fresh garlands and warm ambient lamps.',
      tableSetting: sanitizeString(raw.visualInspiration.tableSetting) || 'Coordinated table runners with brass katori centerpieces and fresh floral accents.',
      floralAndLighting: sanitizeString(raw.visualInspiration.floralAndLighting) || 'Fresh regional flowers and diffused warm yellow canopy lighting.',
    };
  } else {
    visualInspiration = {
      themeName: 'Heritage Marigold and Terracotta',
      palette: [
        { name: 'Deep Maroon', hex: '#7A1F2B' },
        { name: 'Sand Cream', hex: '#F6F0E6' },
        { name: 'Warm Terracotta', hex: '#A8641A' },
        { name: 'Olive Green', hex: '#4F6B3A' },
      ],
      stageConcept: 'Structured dais with natural fabric drapery, fresh marigold torans and traditional brass floor lamps.',
      tableSetting: 'Beige linen runners with brass candle holders and festive marigold rings.',
      floralAndLighting: 'Seasonal local marigolds, jasmine and 2700K warm string lights across the venue.',
    };
  }

  let colourPalette: ColourPalette;
  if (raw.colourPalette && typeof raw.colourPalette === 'object') {
    colourPalette = validateAndNormalizePalette(raw.colourPalette);
  } else if (visualInspiration && Array.isArray(visualInspiration.palette) && visualInspiration.palette.length >= 4) {
    const rawCols = visualInspiration.palette.map((p: any, idx: number) => ({
      name: p.name || `Accent ${idx + 1}`,
      hex: p.hex,
      description: 'Harmonious event palette shade',
      application: ['Stage backdrop drapery', 'Floral garlands and centerpieces', 'Stationery and invitation accents', 'Table runners and linen accents', 'Lighting and ambient highlights'][idx] || 'Decor styling',
    }));
    while (rawCols.length < 5) {
      rawCols.push({
        name: 'Sand Cream',
        hex: '#F6F0E6',
        description: 'Muted neutral background shade',
        application: 'Canopy drapes and table cloths',
      });
    }
    colourPalette = validateAndNormalizePalette({
      name: visualInspiration.themeName || 'Regional Heritage Palette',
      description: 'A curated five-colour scheme designed for harmonious Indian celebrations.',
      colours: rawCols,
      suggestedApplications: {
        decorations: visualInspiration.stageConcept || 'Stage drapery and backdrop styling.',
        flowers: visualInspiration.floralAndLighting || 'Floral arrangements and centerpieces.',
        invitations: 'High-texture stationery with complementary ink accents.',
        tableSettings: visualInspiration.tableSetting || 'Coordinated table runners and dinnerware.',
        otherElements: 'Warm ambient lighting and gift packaging.',
      },
    });
  } else {
    colourPalette = CURATED_PALETTES[0];
  }

  return {
    summary: sanitizeString(raw.summary),
    budget,
    timeline,
    vendors,
    ideas,
    photoAnalysis,
    itinerary,
    photosCount,
    visualInspiration,
    colourPalette,
    savedPalettes: Array.isArray(raw.savedPalettes) ? raw.savedPalettes : [],
  };
}

export function computePlanDiff(before: EventPlan, after: EventPlan, instruction?: string): PlanDiffItem[] {
  const diffs: PlanDiffItem[] = [];

  // 1. Budget comparison
  for (const afterItem of after.budget) {
    const beforeItem = before.budget.find(
      (b) => b.item.toLowerCase() === afterItem.item.toLowerCase()
    );
    if (beforeItem) {
      if (beforeItem.pct !== afterItem.pct || beforeItem.amount !== afterItem.amount) {
        const delta = afterItem.pct - beforeItem.pct;
        const reason = delta < 0
          ? `Allocation reduced by ${Math.abs(delta)}% (₹${Math.abs((afterItem.amount || 0) - (beforeItem.amount || 0)).toLocaleString('en-IN')}) per request`
          : `Allocation increased by ${delta}% (₹${((afterItem.amount || 0) - (beforeItem.amount || 0)).toLocaleString('en-IN')}) to absorb reallocated budget`;
        diffs.push({
          type: 'budget',
          item: afterItem.item,
          before: `${beforeItem.pct}% (₹${(beforeItem.amount || 0).toLocaleString('en-IN')})`,
          after: `${afterItem.pct}% (₹${(afterItem.amount || 0).toLocaleString('en-IN')})`,
          reason,
        });
      }
    } else {
      diffs.push({
        type: 'budget',
        item: afterItem.item,
        before: 'Not present',
        after: `${afterItem.pct}% (₹${(afterItem.amount || 0).toLocaleString('en-IN')})`,
        reason: 'Added new budget category',
      });
    }
  }

  // 2. Theme / Visual inspiration comparison
  if (
    after.visualInspiration?.themeName &&
    before.visualInspiration?.themeName !== after.visualInspiration.themeName
  ) {
    diffs.push({
      type: 'theme',
      item: 'Theme & Decor Styling',
      before: before.visualInspiration?.themeName || 'Regional Elegance',
      after: after.visualInspiration.themeName,
      reason: 'Shifted decor styling to traditional heritage aesthetic',
    });
  }

  // 3. Vendors comparison
  for (const vAfter of after.vendors) {
    const vBefore = before.vendors.find((v) => v.name.toLowerCase() === vAfter.name.toLowerCase());
    if (!vBefore) {
      diffs.push({
        type: 'vendor',
        item: vAfter.name,
        before: 'Not in vendor list',
        after: `Added: ${vAfter.why}`,
        reason: 'Added requested specialist vendor',
      });
    }
  }
  for (const vBefore of before.vendors) {
    const vAfter = after.vendors.find((v) => v.name.toLowerCase() === vBefore.name.toLowerCase());
    if (!vAfter) {
      diffs.push({
        type: 'vendor',
        item: vBefore.name,
        before: 'Included in vendor list',
        after: 'Removed',
        reason: 'Removed from vendor checklist per user request',
      });
    }
  }

  // 4. Itinerary comparison
  if (Array.isArray(before.itinerary) && Array.isArray(after.itinerary)) {
    for (const itemAfter of after.itinerary) {
      const itemBefore = before.itinerary.find(
        (it) => it.activity.toLowerCase() === itemAfter.activity.toLowerCase()
      );
      if (itemBefore && itemBefore.time !== itemAfter.time) {
        diffs.push({
          type: 'itinerary',
          item: itemAfter.activity,
          before: itemBefore.time,
          after: itemAfter.time,
          reason: `Shifted time from ${itemBefore.time} to ${itemAfter.time}`,
        });
      }
    }
  }

  return diffs;
}

export function localRefinePlan(currentPlan: EventPlan, instruction: string, totalBudget: number): EventPlan {
  const updated: EventPlan = JSON.parse(JSON.stringify(currentPlan));
  const text = instruction.toLowerCase();

  // 1a. Budget percentage cut e.g. "cut decor by 5%", "reduce decoration by 5%"
  // Rule 12: When the user cuts a budget line by a percentage, apply it to that line,
  // move the saved points into the contingency line, and say so in the summary.
  // Keep everything the user did not mention exactly as it was.
  const cutMatch = text.match(/(?:cut|reduce|decrease|lower)\s+([a-z\s]+?)\s+(?:by\s+)?(\d{1,2})\s*%/i) ||
    text.match(/(\d{1,2})\s*%\s*(?:cut|reduction|decrease)\s+(?:in|of)\s+([a-z\s]+)/i);

  let handledCut = false;

  if (cutMatch) {
    const rawCategory = (cutMatch[1] || cutMatch[2]).trim().toLowerCase();
    const cutPct = parseInt(cutMatch[2] || cutMatch[1], 10);

    const targetIdx = updated.budget.findIndex((b) =>
      b.item.toLowerCase().includes(rawCategory) || rawCategory.includes(b.item.toLowerCase().split(' ')[0])
    );

    if (targetIdx !== -1 && cutPct > 0) {
      const oldPct = updated.budget[targetIdx].pct;
      const actualCut = Math.min(cutPct, Math.max(0, oldPct - 1));
      if (actualCut > 0) {
        updated.budget[targetIdx].pct = oldPct - actualCut;

        let contIdx = updated.budget.findIndex((b) => {
          const n = b.item.toLowerCase();
          return n.includes('contingency') || n.includes('emergency') || n.includes('reserve');
        });

        if (contIdx === -1) {
          updated.budget.push({
            item: 'Contingency and emergency reserve',
            pct: actualCut,
            tip: 'Dedicated reserve for unforeseen expenses, permits and cash tips.',
            amount: 0,
          });
        } else {
          updated.budget[contIdx].pct += actualCut;
        }

        updated.summary = `${updated.budget[targetIdx].item} allocation reduced by ${actualCut}%, with the saved points reallocated to the contingency reserve.`;
        handledCut = true;
      }
    }
  }

  // 1b. Rupee amount cut e.g. "cut Rs 5,000", "reduce decor by Rs 5,000", "cut 5000 from decor"
  if (!handledCut && !text.includes('%')) {
    const rupeeAmountMatch = text.match(/(?:cut|reduce|decrease|lower)\s+(?:(?:([a-z\s]+?)\s+(?:by|from)\s+)?(?:rs\.?|₹|rupees)?\s*([\d,]+)|(?:rs\.?|₹|rupees)\s*([\d,]+))/i) ||
      text.match(/(?:rs\.?|₹|rupees)\s*([\d,]+)\s*(?:cut|reduction|decrease)/i) ||
      text.match(/(?:cut|reduce|decrease|lower)\s+(?:rs\.?|₹)?\s*([\d,]+)/i);

    if (rupeeAmountMatch) {
      let amountStr = '';
      for (let i = 1; i <= 3; i++) {
        const val = rupeeAmountMatch[i];
        if (val && /^[\d,]+$/.test(val.trim())) {
          amountStr = val.trim();
          break;
        }
      }

      if (amountStr) {
        const cutRupees = parseInt(amountStr.replace(/,/g, ''), 10);
        if (cutRupees > 0 && cutRupees < totalBudget) {
          let rawCategory = '';
          const catKeywords = ['decor', 'cater', 'food', 'venue', 'photo', 'sound', 'music', 'invitation'];
          for (const kw of catKeywords) {
            if (text.includes(kw)) {
              rawCategory = kw;
              break;
            }
          }
          if (!rawCategory) rawCategory = 'decor';

          const targetIdx = updated.budget.findIndex((b) =>
            b.item.toLowerCase().includes(rawCategory) || rawCategory.includes(b.item.toLowerCase().split(' ')[0])
          );

          if (targetIdx !== -1) {
            const cutPct = Math.max(1, Math.round((cutRupees / totalBudget) * 100));
            const oldPct = updated.budget[targetIdx].pct;
            const actualCut = Math.min(cutPct, Math.max(0, oldPct - 1));
            if (actualCut > 0) {
              updated.budget[targetIdx].pct = oldPct - actualCut;

              let contIdx = updated.budget.findIndex((b) => {
                const n = b.item.toLowerCase();
                return n.includes('contingency') || n.includes('emergency') || n.includes('reserve');
              });

              if (contIdx === -1) {
                updated.budget.push({
                  item: 'Contingency and emergency reserve',
                  pct: actualCut,
                  tip: 'Dedicated reserve for unforeseen expenses, permits and cash tips.',
                  amount: 0,
                });
              } else {
                updated.budget[contIdx].pct += actualCut;
              }

              updated.summary = `${updated.budget[targetIdx].item} allocation reduced by ₹${cutRupees.toLocaleString('en-IN')} (${actualCut}%), with saved budget reallocated to the contingency reserve.`;
              handledCut = true;
            }
          }
        }
      }
    }
  }

  // 1c. Other percentage changes e.g. "set decor to 10%" or "10% for decor"
  if (!handledCut) {
    const pctMatch = text.match(/(\d{1,2})\s*%/);
    if (pctMatch) {
      const targetPct = parseInt(pctMatch[1], 10);
      let matchedIndex = updated.budget.findIndex((b) =>
        text.includes(b.item.toLowerCase().split(' ')[0])
      );
      if (matchedIndex === -1 && (text.includes('cater') || text.includes('food'))) {
        matchedIndex = updated.budget.findIndex((b) =>
          b.item.toLowerCase().includes('food') || b.item.toLowerCase().includes('cater')
        );
      }
      if (matchedIndex !== -1 && targetPct > 0 && targetPct < 90) {
        const oldPct = updated.budget[matchedIndex].pct;
        const diff = oldPct - targetPct;
        updated.budget[matchedIndex].pct = targetPct;

        let contIdx = updated.budget.findIndex((b) => {
          const n = b.item.toLowerCase();
          return n.includes('contingency') || n.includes('emergency') || n.includes('reserve');
        });
        if (contIdx >= 0 && contIdx !== matchedIndex) {
          updated.budget[contIdx].pct = Math.max(1, updated.budget[contIdx].pct + diff);
        }
        updated.summary = `${updated.budget[matchedIndex].item} allocation set to ${targetPct}%, adjusting the contingency reserve.`;
      }
    }
  }

  // 2. Add vendor if mentioned
  const vendorKeywords = [
    { match: 'shehnai', name: 'Shehnai Specialist', why: 'Traditional auspicious music for ceremony entrance.' },
    { match: 'dj', name: 'DJ and Sound Engineer', why: 'Evening celebratory music and dance floor management.' },
    { match: 'drone', name: 'Drone Videographer', why: 'Aerial footage of the venue and guest procession.' },
    { match: 'choreographer', name: 'Sangeet Choreographer', why: 'Family dance performances coordination.' },
    { match: 'anchor', name: 'Event Emcee / Anchor', why: 'Interactive stage hosting and announcements.' },
    { match: 'priest', name: 'Ceremonial Priest', why: 'Auspicious rituals and sacred vows conduction.' },
    { match: 'mehendi', name: 'Mehendi Artist', why: 'Intricate bridal and guest henna application.' },
    { match: 'florist', name: 'Floral Stylist', why: 'Fresh marigold and jasmine garlands arrangement.' },
  ];

  for (const item of vendorKeywords) {
    if (text.includes(item.match) && !updated.vendors.some((v) => v.name.toLowerCase().includes(item.match))) {
      updated.vendors.push({
        name: item.name,
        why: item.why,
        done: false,
      });
      if (!updated.summary.includes('vendor')) {
        updated.summary += ` Added ${item.name} to vendor team.`;
      }
    }
  }

  // 3. Decor and theme adjustments e.g. "make the decor more traditional"
  if (text.includes('traditional') || text.includes('heritage') || text.includes('ethnic')) {
    if (!updated.visualInspiration) {
      updated.visualInspiration = {
        themeName: 'Traditional Heritage Elegance',
        palette: [
          { name: 'Deep Maroon', hex: '#7A1F2B' },
          { name: 'Sand Cream', hex: '#F6F0E6' },
          { name: 'Warm Terracotta', hex: '#A8641A' },
          { name: 'Olive Green', hex: '#4F6B3A' },
        ],
        stageConcept: 'Traditional ceremonial dais framed with fresh marigold garlands, brass floor lamps, and natural woven textiles.',
        tableSetting: 'Traditional brass thali settings with marigold floral rings and terracotta table numbers.',
        floralAndLighting: 'Fragrant local marigolds, mogra torans, and warm 2700K ambient brass oil lamps.',
      };
    } else {
      updated.visualInspiration = {
        ...updated.visualInspiration,
        themeName: 'Traditional Heritage Elegance',
        stageConcept: 'Traditional ceremonial dais framed with fresh marigold garlands, brass floor lamps, and natural woven textiles.',
        tableSetting: 'Traditional brass thali settings with marigold floral rings and terracotta table numbers.',
        floralAndLighting: 'Fragrant local marigolds, mogra torans, and warm 2700K ambient brass oil lamps.',
      };
    }
    const decorIdx = updated.budget.findIndex((b) => b.item.toLowerCase().includes('decor'));
    if (decorIdx !== -1) {
      updated.budget[decorIdx].tip = 'Traditional heritage styling with marigold garlands, brass urlis, and reusable fabrics.';
    }
    if (!updated.summary.includes('traditional')) {
      updated.summary += ' Decor styling updated to traditional heritage aesthetic with marigolds and brass accents.';
    }
  }

  // 4. Itinerary refinements (e.g. "move cake cutting to 9 pm" or "move lunch to 1:30 PM")
  const timeMatch = text.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
  if (timeMatch && Array.isArray(updated.itinerary)) {
    const newTime = timeMatch[1].toUpperCase();
    for (const item of updated.itinerary) {
      const words = item.activity.toLowerCase().split(/\s+/);
      if (words.some((w) => w.length > 3 && text.includes(w))) {
        item.time = newTime;
        updated.summary += ` Updated ${item.activity} time to ${newTime}.`;
        break;
      }
    }
  }

  // Guarantee strict budget normalization and integer amounts with deterministic remainder rule
  updated.budget = normalizeBudget(updated.budget, totalBudget);
  return sanitizePlan(updated, totalBudget, currentPlan.photosCount || 0);
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function callWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API call timed out')), ms)
    ),
  ]);
}

// POST /api/plan
app.post('/api/plan', async (req, res) => {
  const parseResult = planRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid form input' });
  }
  const formData: EventFormData = parseResult.data as EventFormData;
  if (!formData.budgetINR || formData.budgetINR <= 0) {
    return res.status(400).json({ error: 'Please enter a valid budget in rupees.' });
  }
  const totalBudget = Number(formData.budgetINR);
  const photos = Array.isArray(formData.photos) ? formData.photos.slice(0, 4) : [];

  // Date check in Indian Standard Time
  const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  if (formData.date && formData.date.trim() !== '') {
    if (formData.date < todayIST) {
      return res.status(400).json({ error: 'Choose today or a later date.' });
    }
  }

  // Check budget realism for Indian event benchmarks
  const realism = assessBudgetRealism(formData.eventType, formData.guestCount, totalBudget, formData.city);

  let prompt = `Plan this event in India:
- Event type: ${formData.eventType}
- Guest count: ${formData.guestCount}
- Budget in INR: ₹${totalBudget.toLocaleString('en-IN')}
- Target date: ${formData.date || 'Not specified'}
- Today's date: ${todayIST}
- City: ${formData.city}
- Notes and special requirements: ${formData.notes || 'None specified'}`;

  if (realism.isUnrealistic && realism.warning) {
    prompt += `\nNotice: This budget is below typical benchmarks. ${realism.warning} As required by rules, note this in the summary and suggest a reduced format.`;
  }

  prompt += `\n\nProvide a comprehensive, practical plan for this gathering adhering to Indian customs, typical vendor costs in ${formData.city}, and practical logistics. Ensure budget percentages total exactly 100.
Also produce a complete hour-by-hour event day itinerary covering arrival, rituals/games, dining and farewell.`;

  if (formData.date && formData.date.trim() !== '') {
    const diffDays = Math.ceil(
      (new Date(formData.date + 'T00:00:00').getTime() - new Date(todayIST + 'T00:00:00').getTime()) /
      (1000 * 60 * 60 * 24)
    );
    if (diffDays >= 0 && diffDays < 14) {
      prompt += `\nNotice: The event is only ${diffDays} day(s) away (less than 14 days). The planning timeline must start from today (${todayIST}) and some timeline steps may need to happen at once.`;
    }
  } else {
    prompt += `\nNotice: No event date was specified. Use relative timeline labels such as "8 weeks before", "4 weeks before", "2 weeks before", "1 week before", "Event day".`;
  }

  if (photos.length > 0) {
    prompt += `\n\nReference Photos Analysis:
The user uploaded ${photos.length} venue or theme reference photo(s).
Carefully evaluate if these images depict an event venue, decor, stage, celebration floorplan or theme reference.
- If genuine: Set photoAnalysis.isRelevant to true, describe the setting, dominant colors, decor style, and space notes. Directly incorporate what is visible in these spaces into the hour-by-hour itinerary (locations and decor notes).
- If irrelevant (e.g. personal selfies, cars, random objects): Set photoAnalysis.isRelevant to false and leave other photoAnalysis fields blank.`;
  } else {
    prompt += `\n\nNo venue photos were uploaded. Set photoAnalysis.isRelevant to false.`;
  }

  const ai = getGeminiClient();

  if (!ai) {
    const fallback = getFallbackPlan(formData);
    const sanitizedFallback = sanitizePlan(fallback, totalBudget, photos.length);
    if (realism.isUnrealistic && realism.warning) {
      sanitizedFallback.summary = `${realism.warning} ${realism.reducedPlanOffer} ${sanitizedFallback.summary}`.trim();
    }
    return res.json({ success: true, plan: sanitizedFallback, isFallback: true, realism });
  }

  // Build multimodal contents
  const contentsPayload: any[] = [];
  for (const photo of photos) {
    const matches = (photo.dataUrl || '').match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (matches) {
      contentsPayload.push({
        inlineData: {
          mimeType: matches[1],
          data: matches[2],
        },
      });
    }
  }
  contentsPayload.push({ text: prompt });

  let planResult: EventPlan | null = null;
  const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest'];

  for (const modelName of modelsToTry) {
    try {
      const response = await callWithTimeout(
        ai.models.generateContent({
          model: modelName,
          contents: contentsPayload,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: PLAN_RESPONSE_SCHEMA,
            temperature: 0.2,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        }),
        15000
      );

      const text = response.text?.trim() || '';
      if (!text) throw new Error('Empty response from model');

      let parsed: any;
      try {
        let cleaned = text;
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        }
        parsed = JSON.parse(cleaned);
        if (!parsed.summary || !Array.isArray(parsed.budget) || !Array.isArray(parsed.timeline)) {
          throw new Error('Incomplete JSON schema returned');
        }
      } catch (jsonErr) {
        console.warn('Initial JSON parse or schema check failed. Retrying once with strict JSON prompt...');
        try {
          const retryContents = [
            ...contentsPayload,
            {
              text: `${prompt}\n\nIMPORTANT: In your previous attempt, the response was not valid JSON matching the schema. Return only the raw JSON object conforming strictly to the schema { summary, budget, timeline, vendors, ideas, itinerary }. Do not include markdown code blocks or explanations.`,
            },
          ];
          const retryResponse = await callWithTimeout(
            ai.models.generateContent({
              model: modelName,
              contents: retryContents,
              config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                responseSchema: PLAN_RESPONSE_SCHEMA,
                temperature: 0.1,
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              },
            }),
            12000
          );
          let retryText = retryResponse.text?.trim() || '';
          if (retryText.startsWith('```')) {
            retryText = retryText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
          }
          parsed = JSON.parse(retryText);
        } catch (retryErr: any) {
          throw new Error(`Model JSON generation failed after retry: ${retryErr?.message || retryErr}`);
        }
      }

      // Check if budget percentages sum to 100. If not, retry once.
      if (!checkBudgetSumsTo100(parsed.budget)) {
        console.warn('Budget percentages do not sum to 100 on initial attempt. Retrying once...');
        try {
          const retryContents = [
            ...contentsPayload.slice(0, -1),
            {
              text: `${prompt}\n\nIMPORTANT: In your previous attempt, the budget percentages did not sum to 100. Return valid JSON where all budget pct numbers add up to exactly 100.`,
            },
          ];
          const retryResponse = await callWithTimeout(
            ai.models.generateContent({
              model: modelName,
              contents: retryContents,
              config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                responseSchema: PLAN_RESPONSE_SCHEMA,
                temperature: 0.1,
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              },
            }),
            12000
          );
          const retryText = retryResponse.text?.trim() || '';
          if (retryText) {
            const retryParsed = JSON.parse(retryText);
            if (retryParsed.summary && Array.isArray(retryParsed.budget)) {
              parsed = retryParsed;
            }
          }
        } catch (retryErr: any) {
          console.warn('Retry for budget sum failed, will scale proportionally:', retryErr?.message || retryErr);
        }
      }

      // If it still fails, scale the values proportionally so they sum to 100
      if (!checkBudgetSumsTo100(parsed.budget)) {
        parsed.budget = scaleBudgetProportionally(parsed.budget, totalBudget);
      }

      planResult = sanitizePlan(parsed, totalBudget, photos.length);
      planResult.realism = realism;
      if (realism.isUnrealistic && realism.warning) {
        planResult.summary = `${realism.warning} ${realism.reducedPlanOffer} ${planResult.summary}`.trim();
      }
      break;
    } catch (err: any) {
      console.warn(`Attempt with ${modelName} encountered: ${err?.message || err}`);
    }
  }

  if (planResult) {
    return res.json({ success: true, plan: planResult, isFallback: false, realism });
  }

  // Gracefully return high quality benchmark fallback plan without failing
  const fallback = sanitizePlan(getFallbackPlan(formData), totalBudget, photos.length);
  fallback.realism = realism;
  if (realism.isUnrealistic && realism.warning) {
    fallback.summary = `${realism.warning} ${realism.reducedPlanOffer} ${fallback.summary}`.trim();
  }
  return res.json({
    success: true,
    plan: fallback,
    isFallback: true,
    realism,
    notice: 'Plan generated using Indian regional event benchmarks.',
  });
});

// POST /api/refine
app.post('/api/refine', async (req, res) => {
  const parseResult = refineRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid refinement request' });
  }
  const { currentPlan, instruction, eventDetails } = parseResult.data;
  const totalBudget = Number(eventDetails?.budgetINR);
  if (!totalBudget || totalBudget <= 0) {
    return res.status(400).json({ error: 'Valid budget is required for refinement.' });
  }
  const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const prompt = `Here is the current event plan for an event in ${eventDetails?.city || 'India'} (${eventDetails?.eventType || 'Event'}, ${eventDetails?.guestCount || 100} guests, budget ₹${totalBudget.toLocaleString('en-IN')}):
${JSON.stringify(currentPlan, null, 2)}

User adjustment request:
"${instruction}"

Today's date is: ${todayIST}.
Update the plan according to the request while maintaining the same JSON schema (including budget, timeline, vendors, ideas, and hour-by-hour event day itinerary). If the user asks to change or move schedule timings (for example, "move the cake cutting to 9 pm"), adjust the corresponding itinerary entries. Budget percentages must sum to 100. Keep language plain and specific.`;

  let updatedPlan: EventPlan | null = null;
  const ai = getGeminiClient();

  if (ai) {
    for (const modelName of ['gemini-3.8-flash', 'gemini-flash-latest']) {
      try {
        const response = await callWithTimeout(
          ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              responseMimeType: 'application/json',
              responseSchema: PLAN_RESPONSE_SCHEMA,
              temperature: 0.2,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          }),
          14000
        );

        const text = response.text?.trim() || '';
        let parsed = JSON.parse(text);
        if (!parsed.summary || !Array.isArray(parsed.budget)) {
          throw new Error('Invalid JSON structure returned on refine');
        }

        // Guarantee 100% budget normalization with contingency reserve and zero rupee drift
        parsed.budget = normalizeBudget(parsed.budget, totalBudget);
        updatedPlan = sanitizePlan(parsed, totalBudget, (currentPlan as any).photosCount || 0);

        // Keep every field the user did not mention identical
        const textLower = instruction.toLowerCase();
        if (
          !textLower.includes('vendor') &&
          !textLower.includes('dj') &&
          !textLower.includes('shehnai') &&
          !textLower.includes('photographer') &&
          !textLower.includes('cater') &&
          !textLower.includes('florist') &&
          !textLower.includes('anchor') &&
          !textLower.includes('priest') &&
          !textLower.includes('mehendi') &&
          !textLower.includes('drone')
        ) {
          updatedPlan.vendors = (currentPlan as EventPlan).vendors;
        }

        if (
          !textLower.match(/\d{1,2}(?::\d{2})?\s*(?:am|pm)/i) &&
          !textLower.includes('schedule') &&
          !textLower.includes('time') &&
          !textLower.includes('itinerary') &&
          !textLower.includes('activity')
        ) {
          updatedPlan.itinerary = (currentPlan as EventPlan).itinerary;
        }

        if (
          !textLower.includes('timeline') &&
          !textLower.includes('milestone') &&
          !textLower.includes('week') &&
          !textLower.includes('month before')
        ) {
          updatedPlan.timeline = (currentPlan as EventPlan).timeline;
        }

        if (
          !textLower.includes('idea') &&
          !textLower.includes('recommend') &&
          !textLower.includes('suggestion')
        ) {
          updatedPlan.ideas = (currentPlan as EventPlan).ideas;
        }
        break;
      } catch (err: any) {
        console.warn(`Refine attempt with ${modelName} encountered: ${err?.message || err}`);
      }
    }
  }

  // Fallback to robust local refine
  if (!updatedPlan) {
    updatedPlan = localRefinePlan(currentPlan as any, instruction, totalBudget);
  }

  // Revalidate entire plan and normalize budget deterministically
  updatedPlan.budget = normalizeBudget(updatedPlan.budget, totalBudget);

  // Compute before & after diff for user review and approval with reasons
  const diff = computePlanDiff(currentPlan as EventPlan, updatedPlan, instruction);
  const proposal = {
    id: `prop_${Date.now()}`,
    title: diff.length > 0 ? `Proposed: ${diff[0].item} modification` : 'Proposed Plan Revision',
    explanation: instruction,
    impactSummary: updatedPlan.summary,
    diff,
    updatedPlan,
  };

  return res.json({ success: true, plan: updatedPlan, proposal });
});

// POST /api/check-budget
app.post('/api/check-budget', async (req, res) => {
  const { eventType, guestCount, budgetINR, city } = req.body;
  const totalBudget = Number(budgetINR) || 100000;
  const count = Number(guestCount) || 100;
  const perGuest = Math.round(totalBudget / Math.max(1, count));
  const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const prompt = `Assess this event budget for ${city || 'an Indian city'}:
- Event: ${eventType || 'Event'}
- Guests: ${count}
- Total Budget: ₹${totalBudget.toLocaleString('en-IN')} (₹${perGuest} per guest)
- Today's date: ${todayIST}

State whether this budget is realistic, tight or inadequate for standard venue, catering and basic decor in ${city}. Give specific advice in plain language without buzzwords.`;

  const ai = getGeminiClient();
  if (ai) {
    try {
      const response = await callWithTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.2,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        }),
        8000
      );
      const text = response.text?.trim() || '';
      return res.json({ success: true, assessment: sanitizeString(text) });
    } catch (err: any) {
      console.warn('Budget check fallback:', err?.message || err);
    }
  }

  return res.json({
    success: true,
    assessment: `At ₹${perGuest.toLocaleString('en-IN')} per guest in ${city || 'India'}, ensure you obtain all-inclusive quotes covering venue hire, dining and generator backup in writing.`,
  });
});

// POST /api/vendor-questions
app.post('/api/vendor-questions', async (req, res) => {
  const { vendorName, vendorWhy, eventType, city } = req.body;
  const nameLower = (vendorName || '').toLowerCase();

  const fallbackQuestions: Record<string, string[]> = {
    cater: [
      'Is a formal food tasting included prior to finalising the menu?',
      'What is the server to guest ratio provided for buffet and seated dining?',
      'Are crockery, glassware, linen napkins and cleanup included in the per-plate price?',
      'Who manages surplus food handling and donation at the end of the feast?',
      'How are live counters powered and are cooking fuel permits verified?',
    ],
    venue: [
      'Is diesel generator fuel for power backup included in the base rental?',
      'What is the strict evening sound curfew enforced by local municipal authorities?',
      'Does the venue levy a royalty fee for bringing in outside caterers or decorators?',
      'What time is early setup permitted on the morning of the event?',
      'Are air conditioning operating hours capped in the contract?',
    ],
    decor: [
      'Are flowers guaranteed fresh on the morning of the ceremony?',
      'What structural materials are used for stage trusses and entrance arches?',
      'Who is responsible for post-event hall teardown and floral waste clearance?',
      'What is the lighting power draw and will it trigger extra hall electricity bills?',
      'What is the contingency plan for rain or high winds for outdoor elements?',
    ],
    photo: [
      'When will unedited raw camera files and the edited teaser be delivered?',
      'How many camera operators and drone pilots will be present on-site?',
      'Are travel, accommodation and meals for the crew included in your fee quote?',
      'Do you carry redundant camera bodies, memory cards and spare batteries?',
      'What are the copyright handover terms for printing albums and sharing online?',
    ],
    sound: [
      'Are public performance music licenses (PPL/IPRS) required or handled by your team?',
      'Do you provide cordless lapel microphones for priests and stage speakers?',
      'What is your equipment power requirement from the venue breaker room?',
      'Do you carry a backup amplifier and sound mixer on-site?',
      'How long does acoustic sound check take before guests begin arriving?',
    ],
  };

  const getFallback = () => {
    for (const key of Object.keys(fallbackQuestions)) {
      if (nameLower.includes(key)) return fallbackQuestions[key];
    }
    return [
      `What exact deliverables and hours of service are covered under this quote for ${vendorName}?`,
      'What payment schedule do you require between advance token and final handover?',
      'What is your contingency plan if primary staff or equipment is delayed on the event day?',
      'Are all local taxes, transport charges and helper tips bundled in this quotation?',
      'What is the cancellation or postponement notice period without penalty?',
    ];
  };

  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `Vendor role: ${vendorName}
Role description: ${vendorWhy}
Event: ${eventType || 'Gathering'} in ${city || 'India'}

Generate exactly 5 essential, practical questions the host must ask this vendor before signing a contract or paying a deposit in India.
Focus on hidden fees, quality guarantees, delivery timelines, and power/logistical requirements.
Do not use emojis, em dashes or buzzwords. Keep each question short, plain and concrete.`;

      const response = await callWithTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                questions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Exactly 5 questions',
                },
              },
              required: ['questions'],
            },
            temperature: 0.2,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        }),
        8000
      );

      const text = response.text?.trim() || '';
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        const cleanQuestions = parsed.questions.slice(0, 5).map(sanitizeString);
        return res.json({ success: true, questions: cleanQuestions });
      }
    } catch (err: any) {
      console.warn('Vendor questions generation fallback:', err?.message || err);
    }
  }

  return res.json({ success: true, questions: getFallback() });
});

// GET /api/events - List saved events for the authenticated session
app.get('/api/events', async (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || 'usr_guest_session';
    const events = await getUserEvents(userId);
    res.json({ success: true, events });
  } catch (err: any) {
    console.error('Failed to get events:', err);
    res.status(500).json({ error: 'Failed to fetch saved events' });
  }
});

// POST /api/events - Persist/upsert event with full validation
app.post('/api/events', async (req, res) => {
  try {
    const parseResult = eventSaveSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid event data' });
    }
    const userId = (req.headers['x-user-id'] as string) || parseResult.data.userId || 'usr_guest_session';
    const saved = await saveUserEvent(userId, parseResult.data as SavedPlan);
    res.json({ success: true, event: saved });
  } catch (err: any) {
    console.error('Failed to save event:', err);
    res.status(500).json({ error: 'Failed to persist event' });
  }
});

// GET /api/events/:id - Get specific event
app.get('/api/events/:id', async (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || 'usr_guest_session';
    const event = await getEventById(userId, req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ success: true, event });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
});

// DELETE /api/events/:id - Delete event
app.delete('/api/events/:id', async (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || 'usr_guest_session';
    const deleted = await deleteUserEvent(userId, req.params.id);
    res.json({ success: true, deleted });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// POST /api/timeline-generate - Generate customized preparation timeline
app.post('/api/timeline-generate', (req, res) => {
  try {
    const parseResult = planRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid event parameters' });
    }
    const tasks = generateIntelligentTimeline(parseResult.data as EventFormData);
    res.json({ success: true, tasks });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate timeline schedule' });
  }
});

// POST /api/ai-assistant - Context-aware AI assistant with actual event data
app.post('/api/ai-assistant', async (req, res) => {
  try {
    const parseResult = aiAssistantRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid assistant query' });
    }
    const ai = getGeminiClient();
    const result = await processAIAssistantMessage(ai, parseResult.data.message, parseResult.data.event as SavedPlan);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('AI assistant processing failed:', err);
    res.status(500).json({ error: 'Failed to process assistant question' });
  }
});

// POST /api/chat-discovery - Progressive conversational event discovery
app.post('/api/chat-discovery', async (req, res) => {
  try {
    const parseResult = chatDiscoveryRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid discovery request' });
    }
    const { message, history, currentSlots } = parseResult.data;
    const ai = getGeminiClient();
    const result = await processDiscoveryMessage(
      ai,
      message,
      history,
      currentSlots
    );
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Chat discovery error:', err);
    res.status(500).json({ error: 'Failed to process discovery message' });
  }
});

// POST /api/palette/generate - Gemini-powered Colour Studio palette generator & shuffle
app.post('/api/palette/generate', async (req, res) => {
  try {
    const parseResult = paletteGenerateRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid palette request' });
    }
    const ai = getGeminiClient();
    const palette = await generatePaletteWithGemini(ai, parseResult.data);
    res.json({ success: true, palette });
  } catch (err: any) {
    console.error('Palette generation failed:', err);
    res.status(500).json({ error: 'Failed to generate palette' });
  }
});

// POST /api/palette/refine - Gemini-powered palette refinement with conversational instructions
app.post('/api/palette/refine', async (req, res) => {
  try {
    const parseResult = paletteRefineRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid palette refinement request' });
    }
    const ai = getGeminiClient();
    const palette = await refinePaletteWithGemini(ai, parseResult.data as any);
    res.json({ success: true, palette });
  } catch (err: any) {
    console.error('Palette refinement failed:', err);
    res.status(500).json({ error: 'Failed to refine palette' });
  }
});

// Setup dev server or static file serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`PlanPal server running on port ${port} (mode: ${process.env.NODE_ENV || 'development'})`);
  });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain && process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
