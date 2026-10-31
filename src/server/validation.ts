import { z } from 'zod';

export const planRequestSchema = z.object({
  eventType: z.string().min(1, 'Event type is required'),
  guestCount: z.coerce.number().int().min(1, 'Guest count must be at least 1').max(100000),
  budgetINR: z.coerce.number().min(1000, 'Budget must be at least ₹1,000'),
  date: z.string().optional().nullable(),
  city: z.string().min(1, 'City is required'),
  notes: z.string().optional().nullable().default(''),
  photos: z
    .array(
      z.object({
        id: z.string(),
        dataUrl: z.string().refine((val) => val.startsWith('data:image/'), {
          message: 'Must be a valid image data URL',
        }),
        name: z.string(),
        sizeKb: z.number().max(8192, 'Image size exceeds 8 MB'),
      })
    )
    .max(4, 'Maximum of 4 photos allowed')
    .optional()
    .default([]),
});

export const refineRequestSchema = z.object({
  currentPlan: z.object({
    summary: z.string(),
    budget: z.array(z.any()),
    timeline: z.array(z.any()),
    vendors: z.array(z.any()),
    ideas: z.array(z.any()),
    itinerary: z.array(z.any()).optional(),
  }),
  instruction: z.string().min(1, 'Adjustment instruction is required'),
  eventDetails: z
    .object({
      eventType: z.string().optional().nullable(),
      guestCount: z.number().optional().nullable(),
      budgetINR: z.number().optional().nullable(),
      city: z.string().optional().nullable(),
      date: z.string().optional().nullable(),
    })
    .optional(),
});

export const chatDiscoveryRequestSchema = z.object({
  message: z.string().min(1, 'Message text is required'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
  currentSlots: z
    .object({
      eventType: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      guestCount: z.number().optional().nullable(),
      budgetINR: z.number().optional().nullable(),
      date: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      preferences: z.string().optional().nullable(),
      constraints: z.string().optional().nullable(),
      themePreference: z.string().optional().nullable(),
      assumptions: z.array(z.string()).optional(),
      isReady: z.boolean().optional(),
      missingFields: z.array(z.string()).optional(),
    })
    .optional()
    .default({}),
});

export const aiAssistantRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  event: z.object({
    id: z.string(),
    title: z.string(),
    formData: z.object({
      eventType: z.string().nullable().optional(),
      guestCount: z.number().nullable().optional(),
      budgetINR: z.number().nullable().optional(),
      city: z.string().nullable().optional(),
      date: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }),
    plan: z.object({
      summary: z.string(),
      budget: z.array(
        z.object({
          item: z.string(),
          pct: z.number(),
          tip: z.string(),
          amount: z.number().optional(),
        })
      ),
      timeline: z.array(z.any()),
      vendors: z.array(z.any()),
      ideas: z.array(z.any()),
      itinerary: z.array(z.any()).optional(),
    }),
    expenses: z.array(z.any()).optional().default([]),
    tasks: z.array(z.any()).optional().default([]),
    vendorComparisons: z.array(z.any()).optional().default([]),
  }),
});

export const eventSaveSchema = z.object({
  id: z.string().min(1),
  userId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  title: z.string().min(1),
  formData: z.object({
    eventType: z.string().nullable().optional(),
    guestCount: z.number().nullable().optional(),
    budgetINR: z.number().nullable().optional(),
    city: z.string().nullable().optional(),
    date: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    photos: z.array(z.any()).optional(),
  }),
  plan: z.object({
    summary: z.string(),
    budget: z.array(z.any()),
    timeline: z.array(z.any()),
    vendors: z.array(z.any()),
    ideas: z.array(z.any()),
    itinerary: z.array(z.any()),
    photoAnalysis: z.any().optional(),
    photosCount: z.number().optional(),
  }),
  expenses: z.array(z.any()).optional(),
  tasks: z.array(z.any()).optional(),
  vendorComparisons: z.array(z.any()).optional(),
});
