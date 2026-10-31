import React from 'react';
import { usePageMeta } from '../hooks/usePageMeta.js';

interface HomePageProps {
  onNavigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [promptInput, setPromptInput] = React.useState('');

  usePageMeta({
    title: 'PlanPal: Budget, Timeline and Vendor Checklist for Your Event',
    description:
      'Plan a wedding, birthday or community event. Enter your guest count and budget and get a cost split, a dated timeline and a vendor checklist.',
    canonicalPath: '/',
  });

  const examples = [
    {
      type: 'wedding',
      title: 'Traditional Indian wedding',
      location: 'Delhi NCR',
      guests: '250 guests',
      budget: '₹15,00,000',
      description:
        'Cost split covering mandap decor, multi-course feast, pandit rituals, and photo documentation.',
      imgSrc: '/images/wedding-setup.webp',
      imgSrcSet: '/images/wedding-setup-600.webp 600w, /images/wedding-setup.webp 1200w',
      imgAlt: 'Brass samai lamps, earthen diyas and marigold garlands arranged for a traditional wedding mandap.',
      query: 'type=wedding&city=Delhi&guests=250&budget=1500000',
    },
    {
      type: 'birthday',
      title: 'First birthday gathering',
      location: 'Mumbai',
      guests: '60 guests',
      budget: '₹1,20,000',
      description:
        'Afternoon family party with children play area, tiered cake, regional snacks and return gifts.',
      imgSrc: '/images/birthday-setup.webp',
      imgSrcSet: '/images/birthday-setup-600.webp 600w, /images/birthday-setup.webp 1200w',
      imgAlt: 'Warm wooden dessert table with a tiered cake, linen flags and sweet boxes for a birthday.',
      query: 'type=birthday&city=Mumbai&guests=60&budget=120000',
    },
    {
      type: 'community',
      title: 'Neighbourhood sports festival',
      location: 'Bengaluru',
      guests: '150 participants',
      budget: '₹2,50,000',
      description:
        'Community club tournament with hydration stations, volunteer coordination, medals and dinner.',
      imgSrc: '/images/community-setup.webp',
      imgSrcSet: '/images/community-setup-600.webp 600w, /images/community-setup.webp 1200w',
      imgAlt: 'Community hall courtyard decorated with brass lanterns and a floral rangoli for a gathering.',
      query: 'type=community&city=Bengaluru&guests=150&budget=250000',
    },
  ];

  const valueProps = [
    {
      num: '1',
      title: '100% budget math',
      detail: 'Every category percentage adds up to 100 percent with realistic per-plate and hall rental estimates.',
    },
    {
      num: '2',
      title: 'Dated milestone schedule',
      detail: 'Chronological timeline counting down from early venue booking to morning pooja and final billing.',
    },
    {
      num: '3',
      title: 'Vendor due diligence',
      detail: 'Interactive checklist with specific verification questions to ask before paying cash tokens.',
    },
  ];

  const comparisonPoints = [
    {
      topic: 'Venue bookings',
      spreadsheet: 'Vague hall rental quotes that hide generator diesel charges, AC hour limits, and sound curfew fines.',
      planpal: 'Clear checklist questions to confirm electricity backup, sound restrictions, and early setup timings in advance.',
    },
    {
      topic: 'Catering calculations',
      spreadsheet: 'Rough per-plate guesses that forget live counter fuels, mineral water jars, waste clearance, and server tips.',
      planpal: 'Portion-based budget allocations with specific tips for food tasting, dining ratios, and surplus meal donation.',
    },
    {
      topic: 'Family coordination',
      spreadsheet: 'Scattered WhatsApp messages, forgotten notebook memos, and last-minute panic over who ordered ritual items.',
      planpal: 'A single shareable summary you can copy for WhatsApp or print as a clean PDF checklist for your family.',
    },
  ];

  return (
    <div className="w-full">
      {/* Hero section: solid --maroon band with high-contrast --bg colored text and lively structured elements */}
      <section className="w-full bg-[var(--maroon)] text-[var(--bg)] pt-14 pb-16 border-b border-[var(--maroon-dark)]">
        <div className="max-w-[1040px] mx-auto px-4 sm:px-6 text-center">
          {/* Eyebrow badge */}
          <div className="mb-5 landing-anim-1">
            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-semibold tracking-widest uppercase border border-[rgba(246,237,224,0.3)] bg-[rgba(246,237,224,0.12)] text-[var(--bg)]">
              Event Planning Guide
            </span>
          </div>

          {/* Main Heading with guaranteed high-contrast color */}
          <h1 className="hero-heading text-3xl sm:text-4xl md:text-5xl font-serif mb-3 max-w-3xl mx-auto font-medium leading-[1.2] landing-anim-2">
            Tell PlanPal what you are planning. Let AI handle the planning.
          </h1>

          <p className="text-base sm:text-lg text-[var(--bg)] opacity-90 max-w-xl mx-auto mb-6 leading-relaxed font-normal landing-anim-3">
            Describe your event naturally. The assistant extracts your requirements, balances your budget to 100%, and creates a dated timeline with local vendors.
          </p>

          {/* Conversational Discovery Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (promptInput.trim()) {
                onNavigate(`/plan?prompt=${encodeURIComponent(promptInput.trim())}`);
              } else {
                onNavigate('/plan');
              }
            }}
            className="max-w-2xl mx-auto mb-6 flex flex-col sm:flex-row items-stretch gap-2 bg-[var(--surface)] p-2 rounded-sm border border-[var(--border)] shadow-md"
          >
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="e.g. Maharashtrian wedding in Nashik for 150 guests, ₹8 lakh budget..."
              className="flex-1 px-4 py-2.5 text-sm text-[var(--brown)] bg-transparent focus:outline-hidden"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-[var(--maroon)] text-[var(--bg)] text-sm font-semibold rounded-sm hover:bg-[#601822] transition-colors whitespace-nowrap"
            >
              Plan with AI
            </button>
          </form>

          {/* Starter Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8 text-xs text-[var(--bg)] opacity-90">
            <span className="font-semibold uppercase tracking-wider text-[11px] opacity-80 mr-1">
              Popular:
            </span>
            {[
              'Wedding in Nashik for 150 guests, 8 lakh',
              'Birthday in Pune for 30 guests, 50k',
              'Community fest in Bengaluru, 2 lakh',
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onNavigate(`/plan?prompt=${encodeURIComponent(chip)}`)}
                className="px-2.5 py-1 rounded-sm bg-[rgba(246,237,224,0.15)] hover:bg-[rgba(246,237,224,0.25)] border border-[rgba(246,237,224,0.3)] transition-colors text-[var(--bg)] text-xs"
              >
                "{chip}"
              </button>
            ))}
          </div>

          {/* 3 Pillar feature bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-3xl mx-auto pt-6 border-t border-[rgba(246,237,224,0.2)] landing-anim-5">
            {valueProps.map((item) => (
              <div
                key={item.num}
                className="p-4 rounded border border-[rgba(246,237,224,0.25)] bg-[rgba(246,237,224,0.08)]"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center bg-[var(--bg)] text-[var(--maroon)]">
                    {item.num}
                  </span>
                  <span className="font-semibold text-sm text-[var(--bg)]">
                    {item.title}
                  </span>
                </div>
                <p className="text-xs text-[var(--bg)] opacity-90 leading-relaxed">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 text-xs text-[var(--bg)] opacity-80">
            Calibrated for gatherings in Delhi NCR, Mumbai, Bengaluru, Pune, Hyderabad, Chennai, Kolkata, Jaipur and regional centers.
          </div>
        </div>
      </section>

      {/* Example plans section on --bg */}
      <section className="w-full bg-[var(--bg)] py-14">
        <div className="max-w-[1040px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-serif text-[var(--brown)] mb-2">
                Example event plans
              </h2>
              <p className="text-[var(--text-muted)] text-sm sm:text-base">
                Review preconfigured sample budgets and schedules, or load any example directly into the planner.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/plan')}
              className="text-sm font-semibold text-[var(--maroon)] hover:underline underline-offset-4 self-start sm:self-auto"
            >
              Start custom plan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {examples.map((item) => (
              <div key={item.type} className="card overflow-hidden flex flex-col">
                <picture>
                  <source type="image/webp" srcSet={item.imgSrcSet} sizes="(max-width: 768px) 100vw, 320px" />
                  <img
                    src={item.imgSrc}
                    alt={item.imgAlt}
                    width="1200"
                    height="800"
                    loading="lazy"
                    className="w-full h-48 object-cover border-b border-[var(--border)]"
                  />
                </picture>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                      <span className="font-semibold uppercase tracking-wider">{item.location}</span>
                      <span className="tabular-nums font-semibold text-[var(--maroon)]">{item.budget}</span>
                    </div>
                    <h3 className="text-xl font-serif text-[var(--brown)] mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                    <span className="text-xs text-[var(--text-muted)] font-semibold">{item.guests}</span>
                    <button
                      type="button"
                      onClick={() => onNavigate(`/plan?${item.query}`)}
                      className="text-sm font-semibold text-[var(--maroon)] hover:text-[var(--maroon-dark)] hover:underline underline-offset-4"
                    >
                      Open sample plan
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison section: Common Spreadsheet Pitfalls vs PlanPal Structure on --surface-alt */}
      <section className="w-full bg-[var(--surface-alt)] py-14 border-t border-b border-[var(--border)]">
        <div className="max-w-[1040px] mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-8">
            <h2 className="text-2xl font-serif text-[var(--brown)] mb-2">
              Why Indian hosts avoid spreadsheet chaos
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-muted)]">
              Family celebrations involve distinct customs, multiple ceremonies and vendor deposits. Here is how PlanPal brings clarity to each milestone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {comparisonPoints.map((pt, idx) => (
              <div key={idx} className="card p-5 bg-[var(--surface)] flex flex-col justify-between">
                <div>
                  <div className="tag mb-3">{pt.topic}</div>
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--warn)] block mb-1">
                      Common spreadsheet issue
                    </span>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {pt.spreadsheet}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[var(--border)]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--ok)] block mb-1">
                      PlanPal solution
                    </span>
                    <p className="text-xs text-[var(--text)] leading-relaxed font-semibold">
                      {pt.planpal}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-[var(--text-muted)] flex flex-wrap gap-4 items-center">
            <span>Learn how we structure vendor questions:</span>
            <a
              href="/vendor-guide"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/vendor-guide');
              }}
              className="inline-link"
            >
              read our vendor booking questions guide
            </a>
          </div>
        </div>
      </section>

      {/* How it works teaser section on --bg */}
      <section className="w-full bg-[var(--bg)] py-14">
        <div className="max-w-[1040px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 card p-8 bg-[var(--surface)]">
            <div className="max-w-xl">
              <h2 className="text-2xl font-serif text-[var(--brown)] mb-3">
                How PlanPal calculates your event costs
              </h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-3">
                Our model maps your guest count to standard Indian catering portions, venue deposit norms, and typical service charges. You can also{' '}
                <a
                  href="/vendor-guide"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/vendor-guide');
                  }}
                  className="inline-link"
                >
                  read our vendor booking questions
                </a>{' '}
                to prepare for caterer and decorator meetings.
              </p>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                If your headcount or venue requirements shift, you can use chat instructions to rebalance your budget allocations.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col gap-3">
              <button
                type="button"
                onClick={() => onNavigate('/how-it-works')}
                className="btn-secondary whitespace-nowrap"
              >
                Learn how it works
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/plan')}
                className="btn-primary whitespace-nowrap"
              >
                Create plan
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
