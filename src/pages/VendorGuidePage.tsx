import React, { useState } from 'react';
import { usePageMeta } from '../hooks/usePageMeta.js';

interface VendorGuidePageProps {
  onNavigate: (path: string) => void;
}

const STORAGE_KEY = 'planpal_vendor_guide_ticks';

export const VendorGuidePage: React.FC<VendorGuidePageProps> = ({ onNavigate }) => {
  usePageMeta({
    title: 'Vendor Booking Guide | PlanPal',
    description:
      'Questions to ask caterers, venues, decorators and photographers before you pay a deposit, with a checklist you can reuse.',
    canonicalPath: '/vendor-guide',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Vendor guide', url: '/vendor-guide' },
    ],
  });

  const [ticked, setTicked] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleTick = (id: string) => {
    setTicked((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Handle private browsing or quota limits gracefully
      }
      return updated;
    });
  };

  const handleClearTicks = () => {
    setTicked({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const sections = [
    {
      category: 'Caterers and food providers',
      intro: 'Food quality and hospitality make the strongest impression at Indian gatherings. Confirm these operational details during menu tasting.',
      questions: [
        { id: 'cat-1', q: 'Is a formal food tasting included prior to finalising the menu?', tip: 'Taste items at banquet temperature, not freshly prepared individual portions.' },
        { id: 'cat-2', q: 'What is the server to guest ratio provided for dining?', tip: 'Aim for at least one dedicated server per 25 buffet guests or one per table for sit-down banana leaf service.' },
        { id: 'cat-3', q: 'Are crockery, water glasses, linen napkins and cleanup included in the per-plate price?', tip: 'Clarify if bone china or compostable areca leaf plates incur separate rental charges.' },
        { id: 'cat-4', q: 'Who manages surplus food handling and disposal at the end of the feast?', tip: 'Arrange beforehand for excess food to be donated to local community shelters.' },
      ],
    },
    {
      category: 'Venues and banquet halls',
      intro: 'Venue contracts often contain unstated electrical, sound and timing restrictions that trigger extra bills on the event night.',
      questions: [
        { id: 'ven-1', q: 'Is diesel generator fuel for power backup included in the rental?', tip: 'Verify how many hours of full air conditioning the backup generator supports.' },
        { id: 'ven-2', q: 'What is the strict evening sound curfew enforced by local authorities?', tip: 'Most municipal zones mandate low volume or acoustic transition at 22:00.' },
        { id: 'ven-3', q: 'Does the venue levy a royalty fee for bringing in outside caterers or decorators?', tip: 'Some halls charge 15 to 25 percent surcharges if you do not hire their empanelled vendors.' },
        { id: 'ven-4', q: 'What time is early setup permitted on the morning of the event?', tip: 'Ensure your decorator has at least four clear hours before the earliest guest arrives.' },
      ],
    },
    {
      category: 'Decorators and stage fabricators',
      intro: 'Clarify floral freshness, fabric drapery quality and lighting safety before paying 50 percent deposits.',
      questions: [
        { id: 'dec-1', q: 'Are flowers guaranteed fresh on the morning of the ceremony?', tip: 'Inspect photos of recent mandap setups in high humidity or summer heat.' },
        { id: 'dec-2', q: 'What structural materials are used for stage trusses and entrance arches?', tip: 'Ensure metal scaffolding is anchored securely without obstructing fire exits.' },
        { id: 'dec-3', q: 'Who is responsible for post-event hall teardown and floral waste clearance?', tip: 'Hall managers will withhold security deposits if decorators leave floral foam or nails behind.' },
      ],
    },
    {
      category: 'Photographers and cinematographers',
      intro: 'Avoid months of anxious follow-ups by locking delivery timelines and copyright terms in writing.',
      questions: [
        { id: 'pho-1', q: 'When will unedited raw camera files and the edited teaser be delivered?', tip: 'Standard delivery should not exceed 14 days for raw files and 45 days for final albums.' },
        { id: 'pho-2', q: 'How many camera operators and drone pilots will be present on-site?', tip: 'Ensure both bride and groom family rituals are documented simultaneously without gaps.' },
        { id: 'pho-3', q: 'Are travel, accommodation and food for the crew included in your fee quote?', tip: 'Spell out crew meal expectations to prevent billing surprises at checkout.' },
      ],
    },
  ];

  return (
    <div className="w-full">
      {/* Page Title Area: full-width band in --surface-alt with 4px maroon line at top */}
      <section className="page-title-band">
        <div className="max-w-[1040px] mx-auto px-4 sm:px-6">
          <h1 className="text-3xl font-serif text-[var(--brown)] mb-2">
            Vendor booking guide
          </h1>
          <p className="text-[var(--text-muted)] max-w-2xl text-sm sm:text-base">
            Crucial verification questions to ask banquet managers, caterers, decorators and photographers before paying advances.
          </p>
        </div>
      </section>

      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 pb-12">
        {/* Payment milestones band in --surface-alt with Clear ticks button */}
        <div className="card p-6 bg-[var(--surface-alt)] mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <h2 className="text-xl font-serif text-[var(--brown)]">
              Standard payment milestones in India
            </h2>
            <button
              type="button"
              onClick={handleClearTicks}
              className="btn-secondary btn-small text-xs self-start sm:self-auto bg-[var(--surface)]"
            >
              Clear ticks
            </button>
          </div>
          <p className="text-sm text-[var(--text)] leading-relaxed">
            Never pay 100 percent in advance. Standard practice is 20 to 25 percent as a booking token, 50 percent upon on-site setup commencement, and the remaining 25 to 30 percent after the event concludes and contractual deliveries are verified.
          </p>
        </div>

        {/* Questions sections with checkboxes and section counts */}
        <div className="space-y-8 mb-12">
          {sections.map((sec, idx) => {
            const askedCount = sec.questions.filter((q) => ticked[q.id]).length;
            const totalCount = sec.questions.length;

            return (
              <section
                key={sec.category}
                className={`card p-6 ${idx % 2 === 1 ? 'bg-[var(--surface-alt)]' : 'bg-[var(--surface)]'}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <h2 className="text-2xl font-serif text-[var(--brown)]">
                    {sec.category}
                  </h2>
                  <span className="text-xs sm:text-sm font-semibold tabular-nums text-[var(--maroon)] bg-[var(--surface)] px-2.5 py-1 rounded border border-[var(--border)] self-start sm:self-auto">
                    {askedCount} of {totalCount} asked
                  </span>
                </div>
                <p className="text-sm text-[var(--text-muted)] mb-5">
                  {sec.intro}
                </p>

                <ul className="space-y-4">
                  {sec.questions.map((item) => (
                    <li
                      key={item.id}
                      className={`p-4 rounded border transition-colors duration-150 flex items-start gap-3.5 ${
                        ticked[item.id]
                          ? 'border-[var(--ok)] bg-[var(--surface-alt)]'
                          : 'border-[var(--border)] bg-[var(--surface)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        id={item.id}
                        checked={Boolean(ticked[item.id])}
                        onChange={() => toggleTick(item.id)}
                        className="mt-1"
                      />
                      <label htmlFor={item.id} className="flex-1 cursor-pointer">
                        <span
                          className={`font-semibold text-sm block mb-1 ${
                            ticked[item.id]
                              ? 'line-through text-[var(--text-muted)]'
                              : 'text-[var(--text)]'
                          }`}
                        >
                          {item.q}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] block leading-normal">
                          Guidance: {item.tip}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        {/* Next steps callout on --surface-alt */}
        <section className="card p-6 bg-[var(--surface-alt)] border-[var(--border)]">
          <h2 className="text-xl font-serif text-[var(--brown)] mb-2">
            Next steps for your event
          </h2>
          <p className="text-sm text-[var(--text)] leading-relaxed mb-4">
            Once you have reviewed these supplier questions,{' '}
            <a
              href="/plan"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/plan');
              }}
              className="inline-link"
            >
              build a tailored vendor checklist for your event
            </a>{' '}
            with specific budgets mapped to your city. You can also explore{' '}
            <a
              href="/how-it-works"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/how-it-works');
              }}
              className="inline-link"
            >
              how vendor budgeting works
            </a>{' '}
            across our estimation models.
          </p>
        </section>
      </div>
    </div>
  );
};
