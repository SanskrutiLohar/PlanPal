# PlanPal: AI-First Conversational Event Planning Assistant

Transform PlanPal from a manual event-management dashboard into an intelligent, AI-first event planning assistant governed by the core philosophy: *"Tell PlanPal what you're planning. Let AI handle the planning."*

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following product decisions were confirmed during the planning phase:
> - **Conversational Layout**: The primary experience on both Home and Plan is a clean, welcoming Conversational AI Hero. The detailed planning workspace (budget, expenses, vendor directory, timeline) is accessible via a side workspace sheet/drawer that users can toggle at any time without leaving the conversation.
> - **Visual Inspiration Presentation**: Decoration concepts, stage aesthetics, and color combinations are presented as curated inline visual theme cards with hex color chips, lighting notes, and textile suggestions.
> - **Plan Refinement Protocol**: Conversational adjustments generate structured inline preview proposal cards showing the exact financial and logistical delta with a one-click "Apply Changes" button, requiring explicit user approval before mutating saved event records.

---

### 1. Overview & Core Concept

- **What It Does**: Users describe their event in natural language (e.g. *"I want to organize my daughter's 5th birthday in Pune with 40 guests and a ₹50,000 budget"* or *"Planning a Maharashtrian wedding in Nashik next winter"*). PlanPal's conversational engine extracts known requirements, intelligently asks 1-2 focused follow-up questions to fill critical gaps, and then automatically synthesizes a complete, mathematically balanced event blueprint.
- **Target Audience**: Individuals and families planning weddings, birthdays, anniversaries, and community gatherings across Indian cities who want expert logistical guidance without wrestling with complex administrative spreadsheets.
- **Key Value**: Replaces tedious multi-step form entry with effortless dialogue, while preserving the full power of detailed budget calculations, expense tracking, and vendor management in an on-demand workspace.

---

### 2. User Experience & Visual Design

#### Key User Flows

1. **Conversational Discovery Flow (Home & /plan)**:
   - User lands on a clean, focused AI assistant prompt with starter prompt chips (e.g. *"Traditional wedding in Delhi for 200 guests"*, *"First birthday celebration in Mumbai under ₹1,00,000"*, *"Open-air community cultural evening"*).
   - User types freely or clicks a chip. The AI parses event type, city, budget, guest count, dates, and cultural preferences in a single turn if provided, or asks targeted follow-ups if critical items are missing.
   - A live "Event Snapshot" indicator shows extracted parameters in real time without forcing manual input.

2. **Automatic Plan Generation & Presentation**:
   - As soon as the core parameters are known (or user clicks "Generate Plan Now"), the AI generates:
     - Executive summary & realistic per-guest assumptions.
     - 100% normalized budget breakdown with a dedicated 5-10% contingency reserve.
     - Inline Visual Inspiration Cards (dominant palette chips, stage decor concepts, table setup, floral styles).
     - Hour-by-hour event day itinerary.
     - Prioritized preparation timeline and vendor booking requirements.
   - The plan is presented directly in the dialogue stream with the option to slide out the Detailed Workspace.

3. **Conversational Plan Refinement & Preview**:
   - User talks directly to the plan: *"Make the decor more rustic and cut ₹15,000 from floral to add to catering"*, *"What if we increase guests to 300?"*, *"Which payments are due this week?"*.
   - The AI recalculates exact numbers using backend logic, explains the trade-offs, and presents an **Inline Proposal Card** with "Apply Changes" and "Dismiss" buttons.

4. **Side Workspace Sheet**:
   - An unobtrusive "Open Workspace" floating button or tab header opens an off-canvas drawer containing the full dashboard, expense logging, vendor comparison, and task checklist for power users.

#### Visual Identity & Theme
- **Palette**: Flat, warm tones strictly conforming to PlanPal's brand: `--bg #F6F0E6`, `--surface #FCF9F3`, `--surface-alt #EFE6D8`, `--border #DDD0BD`, `--text #2E2118`, `--text-muted #6F5F51`, `--brown #5A3E2B`, `--maroon #7A1F2B`, `--maroon-dark #5E1721`, `--tan #B88E6B`, `--sand #D9BFA0`, `--ok #4F6B3A`, `--warn #A8641A`.
- **Typography**: Lora (serif) for headings and Source Sans 3 for UI, with tabular figures for rupee amounts.
- **Anti-AI Slop & Restraint**: Zero purple/blue gradients, zero generic sparkles, zero floating badges, zero emojis, zero em dashes.

---

### 3. Key Product Decisions & Trade-Offs

- **Conversational Hero + Side Sheet vs. Multi-Tab Form**:
  - *Chosen*: Conversational assistant as the center of gravity; detailed workspace as a side sheet.
  - *Why*: Solves the user's primary objection ("feels like a traditional management app"). Keeps the AI front-and-center while retaining full utility for users who want to inspect and edit details.
- **Backend-Driven Factual Financial Engine**:
  - *Chosen*: AI responses for budgets, variances, and pending payments are verified and calculated using backend TypeScript utility logic (`budgetCalculator.ts`), with Gemini generating the contextual natural language and recommendation reasoning.
  - *Why*: Guarantees zero arithmetic hallucination, strictly 100% budget sums, and exact rupee accuracy.
- **Explicit Proposal Confirmation Cards**:
  - *Chosen*: The assistant proposes mutations in a review card; changes are only applied when the user clicks "Apply Changes".
  - *Why*: Prevents accidental overwrites of confirmed decisions during exploratory chat questions.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Interface Layer                            │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │   ConversationalAssistantHero (Chat & Progressive Discovery)  │     │
│   │   • Natural Language Input & Starter Prompt Chips             │     │
│   │   • Extracted Parameters Badge Bar (Type, City, Guests, ₹)    │     │
│   │   • Inline Plan & Visual Inspiration Presentation             │     │
│   │   • Inline Proposal Diff Cards (Apply / Dismiss)              │     │
│   └──────────────────────────────┬───────────────────────────────┘     │
│                                  │                                     │
│                 Toggle Button    │    Auto-sync                        │
│                 ─────────────────┼───────────────────                  │
│                                  ▼                                     │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │   Side Workspace Sheet (Drawer Component)                     │     │
│   │   • Event Readiness Dashboard & KPIs                         │     │
│   │   • Actual Expense Tracking & Health Indicators              │     │
│   │   • Vendor Directory & Side-by-Side Quote Comparison         │     │
│   │   • Intelligent Preparation Timeline                         │     │
│   └──────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Backend API (Express)                           │
│                                                                        │
│   • POST /api/chat-discovery     -> Progressive NLP slot filling       │
│   • POST /api/plan-generate      -> Multimodal Gemini plan creation    │
│   • POST /api/refine             -> Contextual modification & preview  │
│   • POST /api/ai-assistant       -> Grounded Q&A on saved event state  │
│   • GET/POST/DELETE /api/events  -> Unified persistence API            │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Persistence Strategy                            │
│                                                                        │
│   • Supabase PostgreSQL (if credentials configured) + RLS              │
│   • Server JSON Database (data/events.json with atomic disk writes)    │
│   • LocalStorage Offline Mirror & Device Sync Key (usr_...)            │
└────────────────────────────────────────────────────────────────────────┘
```

#### Progressive Requirement Extraction Protocol
The discovery endpoint evaluates chat history and maintains an ongoing event state:
- `{ eventType, guestCount, budgetINR, city, date, notes, visualStyle, status: 'collecting' | 'ready' }`
- If the user writes a single rich sentence (*"Wedding for 200 in Pune with 8 lakhs budget next January"*), the state immediately transitions to `'ready'` and generates the plan without unnecessary back-and-forth.
- If details are missing, it asks one contextual question at a time in warm, respectful language.

#### Visual Inspiration Data Schema
Added to the plan response:
```typescript
export interface VisualInspiration {
  themeName: string;
  palette: { name: string; hex: string }[];
  stageConcept: string;
  tableSetting: string;
  floralAndLighting: string;
}
```
Rendered as flat, elegant visual swatch cards displaying exact color chips, textile styling, and stage notes.
