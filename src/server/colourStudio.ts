import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { ColourPalette, ColourItem, SuggestedColourApplications } from '../types/plan.js';

export const COLOUR_PALETTE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: 'Evocative, elegant palette name e.g. Royal Marigold and Terracotta Heritage' },
    description: { type: Type.STRING, description: '1-2 sentence description explaining the visual mood, symbolism, and harmony' },
    colours: {
      type: Type.ARRAY,
      description: 'Exactly 5 complementary colours suitable for this Indian event.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Evocative colour name e.g. Crimson Sindoor, Warm Marigold, Sand Cream, Raw Silk, Antique Gold' },
          hex: { type: Type.STRING, description: 'Valid 6-character hex code starting with # e.g. #7A1F2B' },
          description: { type: Type.STRING, description: 'Tone and texture feel e.g. Rich velvet red evoking auspicious beginnings' },
          application: { type: Type.STRING, description: 'Specific event use e.g. Stage backdrop drapery, bridal entry walkway, mandap florals' },
        },
        required: ['name', 'hex', 'description', 'application'],
      },
    },
    suggestedApplications: {
      type: Type.OBJECT,
      properties: {
        decorations: { type: Type.STRING, description: 'How to use these colours in stage backdrops, drapes, and venue styling' },
        flowers: { type: Type.STRING, description: 'Floral varieties, garlands, centerpieces matching these colours' },
        invitations: { type: Type.STRING, description: 'Card paper, foil stamping, font ink, digital invitation styling' },
        tableSettings: { type: Type.STRING, description: 'Table runners, placemats, crockery, napkins, and chair ties' },
        otherElements: { type: Type.STRING, description: 'Signage boards, ambient lighting gels, gift packaging, photo booth' },
      },
      required: ['decorations', 'flowers', 'invitations', 'tableSettings', 'otherElements'],
    },
  },
  required: ['name', 'description', 'colours', 'suggestedApplications'],
};

export const CURATED_PALETTES: ColourPalette[] = [
  {
    name: 'Royal Marigold & Crimson Heritage',
    description: 'An auspicious traditional palette celebrating warm Indian festivity, royal deep red, and golden marigold vibrancy.',
    colours: [
      { name: 'Deep Crimson', hex: '#7A1F2B', description: 'Rich velvet red signifying celebration and auspicious beginnings', application: 'Stage drapery, bridal pathway, velvet upholstery accents' },
      { name: 'Golden Marigold', hex: '#D48822', description: 'Warm festive yellow evoking fresh genda flower vibrancy', application: 'Fresh floral garlands, entrance torans, hanging floral tassels' },
      { name: 'Warm Terracotta', hex: '#A8641A', description: 'Earthy kiln-baked tone grounding the visual presentation', application: 'Earthen pot centerpieces, walkway border lamps, table runners' },
      { name: 'Olive Sage', hex: '#4F6B3A', description: 'Natural foliage green providing fresh leaf contrast', application: 'Mango leaf torans, eucalyptus table sprigs, stage backdrop foliage' },
      { name: 'Sand Cream', hex: '#F6F0E6', description: 'Soft muted background neutral providing clarity and warmth', application: 'Canopy ceiling drapes, table linens, invitation parchment' },
    ],
    suggestedApplications: {
      decorations: 'Pleated sand cream canopy with crimson velvet stage borders and terracotta pillars.',
      flowers: 'Dense yellow and orange marigold garlands interwoven with fragrant rajnigandha.',
      invitations: 'Cream textured handmade paper with crimson letterpress and antique gold foil motifs.',
      tableSettings: 'Sand cream linen cloths paired with terracotta runners and brass bowl centerpieces.',
      otherElements: 'Warm 2700K incandescent fairy lights, clay oil lamps, and marigold photo booth backdrop.',
    },
  },
  {
    name: 'Gulab Pink & Jasmine Whispers',
    description: 'A romantic, soft floral harmony blending delicate rose petals with antique brass and fresh greenery.',
    colours: [
      { name: 'Rose Petal Pink', hex: '#C95B78', description: 'Romantic soft rose bringing tenderness and celebration', application: 'Floral entrance arch, chair sashes, bridesmaid accents' },
      { name: 'Mogra White', hex: '#F9F5F0', description: 'Pure fragrant ivory reflecting jasmine blossoms', application: 'Sheer backdrop drapes, invitation envelopes, ceiling canopy' },
      { name: 'Antique Gold', hex: '#B8860B', description: 'Subtle metallic sheen adding refined luxury', application: 'Brass thali chargers, candle holders, printed card accents' },
      { name: 'Blush Sand', hex: '#E6D2C4', description: 'Grounded neutral balancing floral pinks', application: 'Dining table runners, lounge cushion covers, fabric napkins' },
      { name: 'Eucalyptus Leaf', hex: '#587B64', description: 'Muted botanic green enhancing floral displays', application: 'Table garland foliage, photowall leaf framing, centerpiece greenery' },
    ],
    suggestedApplications: {
      decorations: 'Draped mogra white chiffon with cascading blush pink florals and brass lantern clusters.',
      flowers: 'Clusters of blush country roses, white jasmine, and eucalyptus sprigs.',
      invitations: 'Blush pink watercolor wash with antique gold foil typography.',
      tableSettings: 'Mogra white linens with blush runners and antique gold cutlery.',
      otherElements: 'Floating candle bowls with pink rose petals, soft amber string lights.',
    },
  },
  {
    name: 'Peacock Jewel & Amber Glow',
    description: 'A vibrant, sophisticated palette inspired by traditional royal pavilions, teal silks, and glowing evening lamps.',
    colours: [
      { name: 'Royal Peacock Teal', hex: '#1B6B76', description: 'Deep jewel teal evoking regal silk saris', application: 'Main stage backdrop panels, dining lounge drapery, velvet cushions' },
      { name: 'Amber Gold', hex: '#E8A838', description: 'Radiant warm amber bringing festive glow', application: 'Accent cushions, lighting gel warmth, floral ring highlights' },
      { name: 'Raw Silk Cream', hex: '#F3ECE1', description: 'Elegant neutral balancing rich jewel hues', application: 'Tablecloth base, tent interior lining, invitation cards' },
      { name: 'Deep Indigo', hex: '#1E2A4A', description: 'Commanding evening shade adding visual depth', application: 'Welcome sign framing, stage boundary carpet, evening lounge seating' },
      { name: 'Burnt Copper', hex: '#8B3A2B', description: 'Rich metallic earth tone linking warm and cool shades', application: 'Hammered copper water glasses, floral vase stands, lighting fixtures' },
    ],
    suggestedApplications: {
      decorations: 'Deep teal silk backdrops contrasted with amber lighting and copper structure highlights.',
      flowers: 'Orange marigolds and yellow carnations arranged in copper vessels.',
      invitations: 'Raw silk cream cardstock presented in deep teal envelopes with amber wax seal.',
      tableSettings: 'Raw silk cream tables with teal velvet runners and hammered copper dinnerware.',
      otherElements: 'Hanging geometric metal pendants, floating brass urli bowls with floating candles.',
    },
  },
  {
    name: 'Sandalwood Earth & Pistachio',
    description: 'A grounded, understated organic palette designed for daytime rituals, outdoor courtyards, and minimalist elegance.',
    colours: [
      { name: 'Sandalwood Tan', hex: '#B4846C', description: 'Earthy warm timber evoking chandan and calm celebration', application: 'Wooden stage arches, wooden chiavari chairs, signage easels' },
      { name: 'Pistachio Sage', hex: '#8EAA90', description: 'Gentle pale green creating a tranquil garden atmosphere', application: 'Table runners, foliage backdrops, fabric napkins' },
      { name: 'Warm Ivory', hex: '#FAF5EE', description: 'Crisp natural canvas reflecting midday daylight', application: 'Tent canopy, dining tablecloths, invitation cardstock' },
      { name: 'Clay Brown', hex: '#6E473B', description: 'Deep ceramic earth providing rustic definition', application: 'Terracotta flower planters, walkway floor borders, earthen favor pots' },
      { name: 'Soft Saffron', hex: '#E29548', description: 'Gentle golden spice providing a subtle festive focal point', application: 'Yellow floral accents, menu card borders, sweet box ribbons' },
    ],
    suggestedApplications: {
      decorations: 'Open wooden mandap frame draped in warm ivory linen and intertwined with pistachio foliage.',
      flowers: 'Local tuberose, white baby breath, and subtle yellow marigold accents in earthenware.',
      invitations: 'Plantable seed paper with sandalwood ink typography and twine tie.',
      tableSettings: 'Warm ivory cotton table cloths with pistachio sage runners and clay plate chargers.',
      otherElements: 'Acoustic instrumental music, earthen hydration pots, and jute gift pouches.',
    },
  },
  {
    name: 'Lavender Mist & Silver Zari',
    description: 'A contemporary modern fusion palette combining cool pastel florals with refined silver-grey accents.',
    colours: [
      { name: 'Lavender Blossom', hex: '#8E7DBE', description: 'Soft soothing purple bringing modern elegance', application: 'Backdrop floral clusters, sweetheart table runner, photo booth drape' },
      { name: 'Silver Mist', hex: '#A5B4C4', description: 'Subtle cool grey giving contemporary structure', application: 'Table numbers, modern minimalist cutlery, printed programs' },
      { name: 'Pure Chalk', hex: '#F7F6FB', description: 'Bright clean white enhancing pastel saturation', application: 'Base table cloths, ceiling drapes, digital invitation background' },
      { name: 'Deep Plum', hex: '#4A3258', description: 'Intense contrast tone for typography and focal elements', application: 'Menu typography, entrance signage frame, evening lounge cushions' },
      { name: 'Lilac Sheen', hex: '#D2C4E3', description: 'Delicate light violet binding the silver and plum', application: 'Chair sashes, cocktail napkins, welcome cocktail garnishes' },
    ],
    suggestedApplications: {
      decorations: 'Geometric arches in chalk white entwined with lavender wisteria and silver-grey foliage.',
      flowers: 'Hydrangeas, purple orchids, white lilies, and silver dollar eucalyptus.',
      invitations: 'Chalk white card with deep plum calligraphy and silver foil monogram.',
      tableSettings: 'Pure chalk linens with lilac sheen napkins and silver-plated cutlery.',
      otherElements: 'Cool white 4000K mood uplighting, acrylic signage with plum lettering.',
    },
  },
];

export function normalizeHex(hex: string, fallback: string = '#7A1F2B'): string {
  if (typeof hex !== 'string') return fallback;
  let clean = hex.trim();
  if (!clean.startsWith('#')) clean = '#' + clean;
  if (/^#[0-9A-Fa-f]{3}$/.test(clean)) {
    clean = '#' + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3];
  }
  if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
    return clean.toUpperCase();
  }
  return fallback;
}

export function validateAndNormalizePalette(raw: any, eventType: string = 'Event'): ColourPalette {
  const fallback = CURATED_PALETTES[0];
  if (!raw || typeof raw !== 'object') return fallback;

  const name = typeof raw.name === 'string' && raw.name.trim().length > 0
    ? raw.name.trim()
    : `${eventType} Signature Palette`;

  const description = typeof raw.description === 'string' && raw.description.trim().length > 0
    ? raw.description.trim()
    : `Curated colour harmony designed for ${eventType} celebrations.`;

  const rawColours = Array.isArray(raw.colours) ? raw.colours : [];
  const defaultFallbackHexes = ['#7A1F2B', '#D48822', '#A8641A', '#4F6B3A', '#F6F0E6'];
  const defaultFallbackNames = ['Deep Maroon', 'Warm Marigold', 'Terracotta', 'Olive Sage', 'Sand Cream'];

  const colours: ColourItem[] = [];
  for (let i = 0; i < 5; i++) {
    const item = rawColours[i];
    if (item && typeof item === 'object') {
      colours.push({
        name: typeof item.name === 'string' && item.name.trim().length > 0 ? item.name.trim() : defaultFallbackNames[i],
        hex: normalizeHex(item.hex, defaultFallbackHexes[i]),
        description: typeof item.description === 'string' && item.description.trim().length > 0 ? item.description.trim() : 'Complementary celebration accent',
        application: typeof item.application === 'string' && item.application.trim().length > 0 ? item.application.trim() : 'Decor accents and floral styling',
      });
    } else {
      colours.push({
        name: defaultFallbackNames[i],
        hex: defaultFallbackHexes[i],
        description: 'Harmonious regional tone',
        application: 'Theme drapes and decorative elements',
      });
    }
  }

  const suggestedApplications: SuggestedColourApplications = {
    decorations: raw.suggestedApplications?.decorations || 'Stage backdrop panels, ceiling canopy drapery, and entrance arch styling.',
    flowers: raw.suggestedApplications?.flowers || 'Fresh marigolds, tuberoses, country roses, and eucalyptus leaves.',
    invitations: raw.suggestedApplications?.invitations || 'High-texture cardstock with themed ink typography and metallic foil accents.',
    tableSettings: raw.suggestedApplications?.tableSettings || 'Neutral linen cloths with coordinated runners and brass centerpiece bowls.',
    otherElements: raw.suggestedApplications?.otherElements || 'Warm 2700K ambient string lights, signage easels, and gift packaging ribbons.',
  };

  return {
    name,
    description,
    colours,
    suggestedApplications,
  };
}

export interface PaletteResult {
  palette: ColourPalette;
  isFallback: boolean;
  modelUsed?: string;
}

export async function generatePaletteWithGemini(
  ai: GoogleGenAI | null,
  params: {
    eventType: string;
    city: string;
    theme?: string | null;
    preferences?: string | null;
    previousPalettes?: string[];
  }
): Promise<PaletteResult> {
  const { eventType, city, theme, preferences, previousPalettes = [] } = params;

  if (ai) {
    const prompt = `Generate an exceptional, visually harmonious 5-colour palette for an event in India.
Event details:
- Type of Event: ${eventType || 'Celebration'}
- City / Location: ${city || 'India'}
- Styling / Theme: ${theme || 'Regional Festive Heritage'}
- User Preferences: ${preferences || 'None specified'}
- Avoid repeating these existing palette names or combinations: ${previousPalettes.length > 0 ? previousPalettes.join(', ') : 'None'}

Rules:
1. Provide exactly 5 complementary colours.
2. Every colour MUST have a valid 6-character hex code starting with '#' (e.g. #7A1F2B).
3. Provide an evocative, cultural name for each colour.
4. Give a practical, specific application for each colour (e.g. stage drapery, table linen, floral garlands, invitation accents).
5. Provide a creative overall palette name and short description explaining the mood.
6. Provide specific suggestedApplications for decorations, flowers, invitations, tableSettings, and otherElements.
7. Return strictly valid JSON adhering to the response schema.`;

    for (const modelName of ['gemini-3.8-flash', 'gemini-flash-latest']) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: COLOUR_PALETTE_SCHEMA,
            temperature: 0.7,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });

        const text = response.text?.trim() || '';
        if (text) {
          const parsed = JSON.parse(text);
          return {
            palette: validateAndNormalizePalette(parsed, eventType),
            isFallback: false,
            modelUsed: modelName,
          };
        }
      } catch (err: any) {
        console.warn(`Gemini palette generation attempt with ${modelName} failed:`, err?.message || err);
      }
    }
  }

  // Graceful fallback to an unrepeated curated palette
  const prevSet = new Set((previousPalettes || []).map((p) => p.toLowerCase()));
  const available = CURATED_PALETTES.filter((p) => !prevSet.has(p.name.toLowerCase()));
  const chosen = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : CURATED_PALETTES[0];
  return {
    palette: validateAndNormalizePalette(chosen, eventType),
    isFallback: true,
  };
}

export async function refinePaletteWithGemini(
  ai: GoogleGenAI | null,
  params: {
    currentPalette: ColourPalette;
    instruction: string;
    eventDetails?: {
      eventType?: string | null;
      city?: string | null;
      theme?: string | null;
    };
  }
): Promise<PaletteResult> {
  const { currentPalette, instruction, eventDetails } = params;

  if (ai) {
    const prompt = `You are an expert event colour designer for gatherings in India.
Current 5-colour palette:
${JSON.stringify(currentPalette, null, 2)}

User refinement request:
"${instruction}"

Event context:
- Event: ${eventDetails?.eventType || 'Event'} in ${eventDetails?.city || 'India'}
- Theme: ${eventDetails?.theme || 'Custom'}

Instructions:
1. Modify the palette to directly fulfill the user's request (e.g. "make it more luxurious", "replace pink with lavender", "pastel appearance", "more minimal and modern").
2. Retain harmonious complementary relationships across the 5 colours.
3. Every colour MUST have a valid 6-character hex code starting with '#' (e.g. #7A1F2B).
4. Update the palette name and description to reflect the new direction.
5. Update the specific applications and suggested applications accordingly.
6. Return strictly valid JSON matching the schema.`;

    for (const modelName of ['gemini-3.8-flash', 'gemini-flash-latest']) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: COLOUR_PALETTE_SCHEMA,
            temperature: 0.4,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });

        const text = response.text?.trim() || '';
        if (text) {
          const parsed = JSON.parse(text);
          return {
            palette: validateAndNormalizePalette(parsed, eventDetails?.eventType || 'Event'),
            isFallback: false,
            modelUsed: modelName,
          };
        }
      } catch (err: any) {
        console.warn(`Gemini palette refinement attempt with ${modelName} failed:`, err?.message || err);
      }
    }
  }

  // Heuristic rule-based fallback if AI is offline
  const instLower = instruction.toLowerCase();
  let modified = JSON.parse(JSON.stringify(currentPalette)) as ColourPalette;

  if (instLower.includes('luxur') || instLower.includes('royal') || instLower.includes('gold')) {
    modified.name = `${currentPalette.name} (Royal Edition)`;
    modified.colours[0] = { name: 'Royal Crimson', hex: '#58111A', description: 'Deep imperial velvet', application: 'Stage drapery' };
    modified.colours[1] = { name: 'Zari Antique Gold', hex: '#CBA135', description: 'Gilded metallic luster', application: 'Mandap pillars & chargers' };
  } else if (instLower.includes('pastel') || instLower.includes('soft') || instLower.includes('light')) {
    modified.name = `${currentPalette.name} (Soft Pastel)`;
    modified.colours = [
      { name: 'Powder Rose', hex: '#F0D4DB', description: 'Soft delicate blush', application: 'Table florals & drape accents' },
      { name: 'Muted Sage', hex: '#C2D6C4', description: 'Soft herbal green', application: 'Foliage and napkin runners' },
      { name: 'Warm Cream', hex: '#FAF7F2', description: 'Gentle neutral canvas', application: 'Canopy drapes and invitation cards' },
      { name: 'Buttercup Yellow', hex: '#FDF0CD', description: 'Faint sunny warmth', application: 'Sweetheart table touches' },
      { name: 'Soft Taupe', hex: '#DDD0C4', description: 'Grounded subtle earth', application: 'Wood accents & print typography' },
    ];
  } else if (instLower.includes('lavender') || instLower.includes('purple')) {
    modified.name = `${currentPalette.name} (Lavender Infused)`;
    modified.colours[0] = { name: 'Fragrant Lavender', hex: '#9B88B4', description: 'Soft soothing floral purple', application: 'Backdrop florals & lounge cushions' };
  } else if (instLower.includes('bright') || instLower.includes('vibrant')) {
    modified.name = `${currentPalette.name} (Vibrant Celebration)`;
    modified.colours[0] = { name: 'Festive Rani Pink', hex: '#D81B60', description: 'High-energy celebration magenta', application: 'Sangeet drapes and photo booth' };
    modified.colours[1] = { name: 'Vibrant Marigold', hex: '#FFB300', description: 'Bright sunny golden bloom', application: 'Fresh floral entrance canopy' };
  } else {
    modified.name = `${currentPalette.name} (Refined)`;
  }

  return {
    palette: validateAndNormalizePalette(modified, eventDetails?.eventType || 'Event'),
    isFallback: true,
  };
}

