import React from 'react';
import { Logo } from './Logo.js';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const links = [
    { label: 'Plan an event', path: '/plan' },
    { label: 'My events', path: '/my-events' },
    { label: 'How it works', path: '/how-it-works' },
    { label: 'Vendor guide', path: '/vendor-guide' },
    { label: 'About', path: '/about' },
  ];

  return (
    <footer className="w-full bg-[var(--maroon-dark)] text-[var(--bg)] mt-16 py-12 border-t border-[var(--maroon)]">
      <div className="max-w-[1040px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-8 border-b border-[var(--maroon)]">
          <div>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/');
              }}
              aria-label="PlanPal home"
              className="inline-flex items-center gap-2.5 mb-2 focus-visible:outline-2 focus-visible:outline-[var(--bg)] focus-visible:outline-offset-2 no-underline"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 64 64"
                width="36"
                height="36"
                className="shrink-0"
                aria-hidden="true"
              >
                <rect width="64" height="64" rx="12" fill="#5E1721" stroke="#E3CBA8" strokeWidth="2" />
                <g fill="#F6EDE0" transform="translate(32 32)">
                  <ellipse cx="0" cy="-15" rx="5.5" ry="10" />
                  <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(45)" />
                  <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(90)" />
                  <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(135)" />
                  <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(180)" />
                  <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(225)" />
                  <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(270)" />
                  <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(315)" />
                </g>
                <circle cx="32" cy="32" r="8" fill="#5E1721" />
                <circle cx="32" cy="32" r="3.5" fill="#E3CBA8" />
              </svg>
              <span className="font-serif text-xl font-semibold text-[var(--bg)]">
                PlanPal
              </span>
            </a>
            <p className="text-sm text-[var(--bg)] opacity-90 max-w-md">
              Practical event planning for weddings, birthdays and community gatherings across Indian cities.
            </p>
          </div>

          <nav aria-label="Footer Navigation">
            <ul className="flex flex-wrap gap-4 text-sm font-semibold">
              {links.map((link) => (
                <li key={link.path}>
                  <a
                    href={link.path}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(link.path);
                    }}
                    className="text-[var(--bg)] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--bg)]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#contact"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/about#contact');
                  }}
                  className="text-[var(--bg)] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--bg)]"
                >
                  Contact
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--bg)] opacity-85 gap-3">
          <p>
            Clear budgets and practical milestone timelines for celebrations across Indian cities.
          </p>
          <p>
            Built for families and community organisers in India.
          </p>
        </div>
      </div>
    </footer>
  );
};
