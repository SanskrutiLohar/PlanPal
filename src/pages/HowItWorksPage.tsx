import React from 'react';
import { usePageMeta } from '../hooks/usePageMeta.js';

interface HowItWorksPageProps {
  onNavigate: (path: string) => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onNavigate }) => {
  usePageMeta({
    title: 'How PlanPal Works | PlanPal',
    description:
      'See the four steps behind each plan: your inputs, the budget split, the timeline and the vendor checklist, plus how chat edits work.',
    canonicalPath: '/how-it-works',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'How it works', url: '/how-it-works' },
    ],
  });

  const steps = [
    {
      num: '1',
      title: 'Your event parameters',
      body: 'You provide your event category, expected attendee headcount, budget in Indian rupees, city and specific customs. Whether you are hosting a Jain vegetarian wedding banquet in Ahmedabad or a community sports day in Chennai, the location and traditions guide every cost calculation.',
    },
    {
      num: '2',
      title: 'Budget distribution math',
      body: 'The planner computes realistic percentage bands for dining, venue hire, decoration, audio visual setup and logistics based on typical vendor pricing in your chosen tier. Category percentages strictly add up to 100 percent with no unallocated funds.',
    },
    {
      num: '3',
      title: 'Chronological timeline',
      body: 'Key tasks are scheduled backward from your target date, beginning with advance hall bookings and caterer food trials, progressing through invitations and outfit fittings, down to morning ritual setup and vendor settlement on the day itself.',
    },
    {
      num: '4',
      title: 'Vendor checklist and interactive tracking',
      body: 'You receive an interactive checklist of essential suppliers to interview. As you confirm bookings, you can check them off to monitor your progress toward event readiness.',
    },
  ];

  return (
    <div className="w-full">
      {/* Page Title Area: full-width band in --surface-alt with 4px maroon line at top */}
      <section className="page-title-band">
        <div className="max-w-[1040px] mx-auto px-4 sm:px-6">
          <h1 className="text-3xl font-serif text-[var(--brown)] mb-2">
            How PlanPal works
          </h1>
          <p className="text-[var(--text-muted)] max-w-2xl text-sm sm:text-base">
            PlanPal turns your guest count and rupee budget into a structured roadmap for weddings, birthdays and community gatherings.
          </p>
        </div>
      </section>

      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 pb-12">
        {/* Four Steps Section on --bg with step badges */}
        <div className="space-y-6 mb-12">
          {steps.map((step) => (
            <div key={step.num} className="card p-6 flex flex-col sm:flex-row items-start gap-4">
              <div className="step-badge">
                {step.num}
              </div>
              <div>
                <h2 className="text-xl font-serif text-[var(--brown)] mb-2">
                  {step.title}
                </h2>
                <p className="text-sm text-[var(--text)] leading-relaxed">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Refine Chat Explanation on --surface-alt */}
        <section className="card p-6 bg-[var(--surface-alt)] mb-12">
          <h2 className="text-2xl font-serif text-[var(--brown)] mb-3">
            Refining your plan with chat instructions
          </h2>
          <p className="text-sm text-[var(--text)] leading-relaxed mb-4">
            No event plan stays static. When family decisions change or vendor quotes come in higher than expected, you can submit plain text requests at the bottom of the plan view. For instance, instruct the planner to "allocate 40 percent to catering and reduce flower decor", or "add a live shehnai performance and dhol group".
          </p>
          <p className="text-sm text-[var(--text)] leading-relaxed mb-4">
            The system will adjust the entire budget to maintain a 100 percent total and append corresponding vendor roles and schedule milestones.
          </p>
          <div className="pt-4 border-t border-[var(--border)] flex flex-wrap gap-4 text-sm">
            <span>Ready to try it out?</span>
            <a
              href="/plan"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/plan');
              }}
              className="inline-link"
            >
              create your event plan
            </a>
          </div>
        </section>

        {/* Vendor booking callout on --bg */}
        <section className="card p-6">
          <h2 className="text-2xl font-serif text-[var(--brown)] mb-2">
            Supplier due diligence
          </h2>
          <p className="text-sm text-[var(--text)] leading-relaxed mb-4">
            Getting vendor estimates is only half the battle. To avoid surprise electricity surcharges or missing equipment on the event day,{' '}
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
            for a checklist of specific terms to confirm before handing over token cash deposits.
          </p>
        </section>
      </div>
    </div>
  );
};
