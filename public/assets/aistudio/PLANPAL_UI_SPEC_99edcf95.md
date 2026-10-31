# PlanPal UI Specification

Read this whole file before writing any UI code. Follow every rule. If a rule conflicts with a default of your framework or component library, the rule wins.

## 1. Product

PlanPal helps people plan weddings, birthdays and community events. The user enters event type, guest count, budget in INR, date, city and notes. The app returns a budget, a timeline, a vendor checklist and ideas. Users can refine the plan by chat.

## 2. Hard rules (do not break any of these)

1. Every page has a unique `<title>` (under 60 characters) and a unique `<meta name="description">` (120 to 160 characters). Use the table in section 8.
2. Compress every image. Export as WebP, maximum 1600px wide, target under 150 KB each. Add `width` and `height` attributes, `loading="lazy"` below the fold, a `srcset`, and meaningful `alt` text. Do not ship raw PNG or JPG files.
3. Add a favicon (section 9), internal links between pages (header, footer, and inline in body copy), and breadcrumbs on every page except Home (section 7).
4. No gradients that go from purple to blue, or any purple or blue tint at all. Prefer flat solid colors. If a gradient is ever used, it must stay inside the brown, beige and maroon family and be barely visible.
5. Do not pair Space Grotesk with Instrument Serif. Do not use either of them. Use the fonts in section 4.
6. No em dashes anywhere: not in UI text, not in code comments that render, not in AI generated output. Use a comma, a colon, a period or a plain hyphen.
7. No generic buzzwords. Banned words and phrases: seamless, effortless, revolutionize, leverage, unlock, elevate, supercharge, empower, cutting-edge, next-gen, game-changing, streamline, journey, magical, perfect, ultimate, all-in-one, powered by AI (as a slogan), reimagine, transform your. Write plain, specific sentences.
8. No emojis. Not in headings, buttons, labels, placeholders, toasts or AI output.
9. No glassmorphism. No blur, no frosted panels, no translucent cards, no `backdrop-filter`.
10. Do not use Lucide icons or the `lucide-react` package. Do not install any icon library. Use text labels, numerals, and the few small inline SVG shapes described in section 6.

## 3. Colors (flat, solid, warm)

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#F6F0E6` | Page background (beige) |
| `--surface` | `#FCF9F3` | Cards, inputs |
| `--surface-alt` | `#EFE6D8` | Section bands, table stripes |
| `--border` | `#DDD0BD` | 1px borders and dividers |
| `--text` | `#2E2118` | Body text (dark brown) |
| `--text-muted` | `#6F5F51` | Secondary text (contrast checked on `--bg`) |
| `--brown` | `#5A3E2B` | Headings, secondary buttons |
| `--maroon` | `#7A1F2B` | Primary buttons, links, active states |
| `--maroon-dark` | `#5E1721` | Hover state for maroon |
| `--tan` | `#B88E6B` | Chart accents, progress fills |
| `--sand` | `#D9BFA0` | Chart accents, tags |
| `--ok` | `#4F6B3A` | Success (olive, not bright green) |
| `--warn` | `#A8641A` | Warning (burnt orange) |

Dark mode (apply under `prefers-color-scheme: dark`): `--bg #1F1712`, `--surface #2A2019`, `--surface-alt #33271F`, `--border #4A3A2E`, `--text #F1E8DB`, `--text-muted #B9A894`, `--brown #D9BFA0`, `--maroon #D98A94`, `--maroon-dark #E8A7AF`, `--tan #C9A07A`, `--sand #8C6B4F`. Text on maroon buttons stays `#FCF9F3` in light mode and `#1F1712` in dark mode.

Define all of these as CSS variables on `:root`. No hard coded hex values inside components.

## 4. Typography

- Headings: **Lora** (serif), weights 500 and 600.
- Body and UI: **Source Sans 3**, weights 400, 600.
- Numbers in budget tables: use `font-variant-numeric: tabular-nums`.
- Scale: 14, 16, 18, 22, 28, 40 px. Body is 16px with line height 1.6. Max line length 70 characters.
- Provide fallbacks: `Georgia, serif` and `system-ui, sans-serif`.
- Headings are sentence case. No all caps except small labels at 12px with 0.06em letter spacing.

## 5. Layout and components

- Max content width 1040px, centered, 24px side padding (16px on mobile). Mobile first.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 72.
- Border radius: 6px everywhere. No pill shapes except small tags (999px allowed for tags only).
- Cards: `--surface` background, 1px `--border`, no shadow. Hover changes the border color only.
- Buttons: primary is solid maroon with light text; secondary is transparent with a 1px brown border; both 44px minimum height. Visible focus ring: 2px solid `--maroon` with 2px offset.
- Inputs: 44px height, 1px border, labels always visible above the field (no placeholder-only labels).
- Tables are used for the budget (item, share, amount, tip). Zebra stripes with `--surface-alt`.
- Progress bars are 6px tall flat rectangles in `--tan` on `--surface-alt`.
- Charts (budget split): a simple horizontal stacked bar or donut using only `--maroon`, `--brown`, `--tan`, `--sand`, `--surface-alt`, plus `--text-muted`. Always show a text legend with amounts.
- Motion: only 150ms color and border transitions. Respect `prefers-reduced-motion`.
- No decorative blobs, no floating shapes, no animated backgrounds, no shadows heavier than none.

## 6. Icons (allowed approach)

No icon library. Use these only:
- Checkbox: native `<input type="checkbox">` styled with `accent-color: var(--maroon)`.
- Expand and collapse: a small inline SVG chevron (single 2px stroke path), 16px.
- Breadcrumb separator: the text character `/`.
- Everything else is a text label or a numeral in a small bordered square (for example step numbers 1, 2, 3).

## 7. Pages, navigation and breadcrumbs

Header (all pages): wordmark "PlanPal" in Lora on the left linking to `/`, then links to Plan an event, My events, How it works, Vendor guide, About. Footer repeats these links plus Contact and a short line of plain text.

| Route | Purpose |
|---|---|
| `/` | Home: short headline, one sentence of explanation, a button to `/plan`, three example plans (wedding, birthday, community) each linking to `/plan?type=...`, a "How it works" teaser linking to `/how-it-works` |
| `/plan` | The form, then the results (budget, timeline, vendor checklist, ideas), then the refine chat |
| `/my-events` | Saved plans list with open, duplicate and delete actions |
| `/how-it-works` | Four numbered steps explaining the flow, with links to `/plan` and `/vendor-guide` |
| `/vendor-guide` | Plain guide to booking vendors with questions to ask, linking to `/plan` |
| `/about` | Who built it and why, link to `/plan` |

Breadcrumbs: shown under the header on every page except Home. Use `<nav aria-label="Breadcrumb"><ol>` with `<li>` items, the last item has `aria-current="page"` and is not a link. Examples: `Home / Plan an event`, `Home / My events / Priya's wedding`, `Home / How it works`. Add matching `BreadcrumbList` JSON-LD in each page head.

Internal links: every page body must contain at least two inline links to other pages, written with descriptive anchor text (for example "see how the plan is built", not "click here").

## 8. Page titles and descriptions (use exactly)

| Route | Title | Meta description |
|---|---|---|
| `/` | PlanPal: Budget, Timeline and Vendor Checklist for Your Event | Plan a wedding, birthday or community event. Enter your guest count and budget and get a cost split, a dated timeline and a vendor checklist. |
| `/plan` | Plan an Event | PlanPal | Tell PlanPal your event type, guests, city and budget in rupees. Get a full plan you can edit by chat and save for later. |
| `/my-events` | My Events | PlanPal | Open, copy or delete the event plans you saved on this device. Track vendor tasks and budgets for each one. |
| `/how-it-works` | How PlanPal Works | PlanPal | See the four steps behind each plan: your inputs, the budget split, the timeline and the vendor checklist, plus how chat edits work. |
| `/vendor-guide` | Vendor Booking Guide | PlanPal | Questions to ask caterers, venues, decorators and photographers before you pay a deposit, with a checklist you can reuse. |
| `/about` | About PlanPal | Why we built an event planner for Indian weddings, birthdays and community gatherings, and what it does and does not do. |

Each page also needs `<link rel="canonical">`, `og:title`, `og:description`, and `lang="en"` on `<html>`. Only one `<h1>` per page.

## 9. Favicon

Create `favicon.svg` and reference it plus a PNG fallback:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

`favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#7A1F2B"/>
  <g fill="#F6EDE0" transform="translate(32 32)">
    <ellipse cx="0" cy="-15" rx="5.5" ry="10"/>
    <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(45)"/>
    <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(90)"/>
    <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(135)"/>
    <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(180)"/>
    <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(225)"/>
    <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(270)"/>
    <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(315)"/>
  </g>
  <circle cx="32" cy="32" r="8" fill="#7A1F2B"/>
  <circle cx="32" cy="32" r="3.5" fill="#E3CBA8"/>
</svg>
```

Export the 32px and 180px PNGs and compress them.

## 10. Images

Use few images. If photos are needed, use three at most on Home (one wedding, one birthday, one community gathering), warm toned, no people's faces in close up. Wrap in `<picture>` with WebP source. No stock illustrations with purple or blue palettes. Every image has a caption or alt text that describes it plainly.

## 11. Copy style

- Short, concrete sentences. Say what the thing does.
- Buttons: "Create plan", "Save plan", "Apply change", "Download plan".
- Headline for Home: "Plan your event with a clear budget and timeline."
- Error text states what happened and what to do next: "The plan could not be created. Check your connection and try again."
- No exclamation marks, no emojis, no em dashes.

## 12. AI output rules (put these in the Gemini system prompt)

```
You are an experienced event planner who knows weddings, birthdays and community events in India.
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
```

Schema: `{ summary, budget:[{item, pct, tip}], timeline:[{when, task}], vendors:[{name, why, done}], ideas:[{title, detail}], itinerary:[{time, activity, location, decorNote}] }`

## 13. Accessibility and quality checklist (verify before finishing)

- Text contrast at least 4.5:1 in both themes.
- All controls reachable by keyboard with visible focus.
- Form fields have associated labels and error messages.
- Layout works at 360px width without horizontal scroll.
- Lighthouse scores of 90 or higher for Performance, Accessibility, Best Practices and SEO.
- Search the codebase for these and remove any matches: em dash character, emoji characters, `backdrop-filter`, `lucide`, `Space Grotesk`, `Instrument Serif`, purple or blue gradient values.
