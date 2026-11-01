import React from 'react';
import { usePageMeta } from '../hooks/usePageMeta.js';

interface HomePageProps {
  onNavigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  usePageMeta({
    title: 'PlanPal: Budget, Timeline and Vendor Checklist for Your Event',
    description:
      'Plan a wedding, birthday or community event. Enter your guest count and budget and get a cost split, a dated timeline and a vendor checklist.',
    canonicalPath: '/',
  });

  const examplePrompts = [
    'Plan a 50-person birthday in Nashik in December, budget Rs 40,000, vegetarian, elegant but affordable',
    'Wedding for 150 guests in Nashik with an ₹8,00,000 budget, traditional Maharashtrian vegetarian menu',
    'Community cultural festival in Mumbai for 200 participants with 2 lakh budget',
  ];

  return (
    <div className="w-full max-w-[1040px] mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-medium text-[var(--brown)] mb-4 leading-tight">
        Plan your event with a clear budget and timeline.
      </h1>

      <p className="text-base sm:text-lg text-[var(--text-muted)] max-w-2xl mx-auto mb-8 leading-relaxed">
        Enter your guest count and budget and get a cost split, a dated timeline and a vendor checklist.
      </p>

      <div className="mb-12">
        <button
          type="button"
          onClick={() => onNavigate('/plan')}
          className="btn-primary min-h-[44px] px-8 text-base font-semibold"
        >
          Start planning
        </button>
      </div>

      <div className="max-w-2xl mx-auto text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--brown)] mb-3 text-center sm:text-left">
          Or try an example prompt:
        </p>
        <div className="space-y-2.5">
          {examplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onNavigate(`/plan?prompt=${encodeURIComponent(prompt)}`)}
              className="w-full text-left p-4 rounded bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--maroon)] hover:bg-[var(--surface-alt)] transition-colors text-sm text-[var(--text)] min-h-[44px] flex items-center justify-between gap-3 group"
            >
              <span>{prompt}</span>
              <span className="text-xs text-[var(--maroon)] shrink-0 font-semibold group-hover:underline">
                Use prompt &rarr;
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
