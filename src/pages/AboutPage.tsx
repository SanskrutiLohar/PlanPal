import React from 'react';
import { usePageMeta } from '../hooks/usePageMeta.js';

interface AboutPageProps {
  onNavigate: (path: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  usePageMeta({
    title: 'About PlanPal',
    description:
      'Why we built an event planner for Indian weddings, birthdays and community gatherings, and what it does and does not do.',
    canonicalPath: '/about',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'About', url: '/about' },
    ],
  });

  return (
    <div className="w-full">
      {/* Page Title Area: full-width band in --surface-alt with 4px maroon line at top */}
      <section className="page-title-band">
        <div className="max-w-[1040px] mx-auto px-4 sm:px-6">
          <h1 className="text-3xl font-serif text-[var(--brown)] mb-2">
            About PlanPal
          </h1>
          <p className="text-[var(--text-muted)] max-w-2xl text-sm sm:text-base">
            Why we built an event planner dedicated to Indian weddings, birthdays and community gatherings.
          </p>
        </div>
      </section>

      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 pb-12 space-y-8">
        {/* Origin story */}
        <section className="card p-6">
          <h2 className="text-2xl font-serif text-[var(--brown)] mb-3">
            Why we built PlanPal
          </h2>
          <p className="text-sm text-[var(--text)] leading-relaxed mb-4">
            Planning a celebration in India should be a joyous milestone. In practice, families and community volunteers face opaque vendor quotations, confusing per-plate formulas, and surprise surcharges on the event night. Most commercial portals exist primarily to harvest phone numbers and auction them to aggressive telemarketing vendors.
          </p>
          <p className="text-sm text-[var(--text)] leading-relaxed">
            PlanPal was created to give hosts honest numbers upfront. By entering a realistic rupee budget and guest count, you receive a grounded breakdown based on real Indian market norms, from tier-1 metros to regional towns.
          </p>
        </section>

        {/* What PlanPal does and does not do on alternating surface-alt */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="card p-6 bg-[var(--surface-alt)]">
            <h2 className="text-xl font-serif text-[var(--brown)] mb-3">
              What PlanPal does
            </h2>
            <ul className="space-y-3 text-sm text-[var(--text)]">
              <li className="flex items-start gap-2">
                <span className="font-bold text-[var(--ok)]">+</span>
                <span>Calculates realistic budget allocations where percentages always sum to 100 percent.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[var(--ok)]">+</span>
                <span>Structures a backward-scheduled milestone timeline ending with event day logistics.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[var(--ok)]">+</span>
                <span>Generates tickable vendor checklists to track contracted suppliers and open roles.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[var(--ok)]">+</span>
                <span>Allows instant rebalancing through plain conversational instructions.</span>
              </li>
            </ul>
          </section>

          <section className="card p-6 bg-[var(--surface)] border-[var(--border)]">
            <h2 className="text-xl font-serif text-[var(--brown)] mb-3">
              What PlanPal does not do
            </h2>
            <ul className="space-y-3 text-sm text-[var(--text)]">
              <li className="flex items-start gap-2">
                <span className="font-bold text-[var(--warn)]">-</span>
                <span>We do not take commissions or referral kickbacks from caterers or banquet halls.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[var(--warn)]">-</span>
                <span>We do not sell your contact details or phone number to commercial lead brokers.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[var(--warn)]">-</span>
                <span>We do not lock your event plans behind account paywalls or subscription contracts.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[var(--warn)]">-</span>
                <span>We do not push sponsored venues ahead of independent community options.</span>
              </li>
            </ul>
          </section>
        </div>

        {/* Contact section on --bg */}
        <section id="contact" className="card p-6">
          <h2 className="text-2xl font-serif text-[var(--brown)] mb-3">
            Contact and suggestions
          </h2>
          <p className="text-sm text-[var(--text)] leading-relaxed mb-4">
            Have feedback on local vendor pricing in your city, or want to contribute custom ritual checklists for your community? We welcome suggestions from experienced family hosts and event coordinators.
          </p>
          <div className="p-4 rounded bg-[var(--surface-alt)] border border-[var(--border)] text-sm">
            <span className="font-semibold block text-[var(--brown)] mb-1">Feedback email</span>
            <span className="text-[var(--text)]">contact@planpal.local</span>
          </div>
        </section>

        {/* Inline links on --surface-alt */}
        <div className="card p-6 bg-[var(--surface-alt)] text-sm text-[var(--text-muted)]">
          Ready to get started? You can{' '}
          <a
            href="/plan"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/plan');
            }}
            className="inline-link"
          >
            plan your gathering
          </a>{' '}
          now or{' '}
          <a
            href="/how-it-works"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/how-it-works');
            }}
            className="inline-link"
          >
            learn how our planner calculates budgets
          </a>.
        </div>
      </div>
    </div>
  );
};
