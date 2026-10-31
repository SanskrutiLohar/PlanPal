import React, { useState } from 'react';
import { Logo } from './Logo.js';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Plan an event', path: '/plan' },
    { label: 'My events', path: '/my-events' },
    { label: 'How it works', path: '/how-it-works' },
    { label: 'Vendor guide', path: '/vendor-guide' },
    { label: 'About', path: '/about' },
  ];

  const handleNavClick = (path: string) => {
    setMobileMenuOpen(false);
    onNavigate(path);
  };

  return (
    <header className="w-full border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-30">
      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('/');
          }}
          aria-label="PlanPal home"
          className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-[var(--maroon)] focus-visible:outline-offset-2 no-underline"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            width="36"
            height="36"
            className="shrink-0"
            aria-hidden="true"
          >
            <rect width="64" height="64" rx="12" fill="#7A1F2B" />
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
            <circle cx="32" cy="32" r="8" fill="#7A1F2B" />
            <circle cx="32" cy="32" r="3.5" fill="#E3CBA8" />
          </svg>
          <span className="font-serif text-2xl font-semibold text-[var(--maroon)] tracking-tight">
            PlanPal
          </span>
        </a>

        {/* Desktop Navigation Tabs */}
        <nav aria-label="Main Navigation" className="hidden md:block">
          <ul className="flex items-center gap-1 text-sm font-semibold">
            {navItems.map((item) => {
              const isActive = currentPath === item.path;
              return (
                <li key={item.path}>
                  <a
                    href={item.path}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(item.path);
                    }}
                    className={`relative px-3.5 py-2 rounded-[6px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--maroon)] focus-visible:outline-offset-2 ${
                      isActive
                        ? 'text-[var(--maroon)] bg-[var(--surface-alt)] font-semibold'
                        : 'text-[var(--text)] hover:text-[var(--maroon)] hover:bg-[var(--surface-alt)]'
                    }`}
                  >
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[var(--maroon)] rounded-full" />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Mobile Menu Button with Chevron */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="btn-secondary btn-small text-xs flex items-center gap-1.5 px-3 py-1.5"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            <span>{mobileMenuOpen ? 'Close' : 'Menu'}</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform duration-150 ${mobileMenuOpen ? 'rotate-180' : ''}`}
            >
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-opacity duration-150">
          <nav aria-label="Mobile Navigation">
            <ul className="flex flex-col gap-1 text-sm font-semibold">
              {navItems.map((item) => {
                const isActive = currentPath === item.path;
                return (
                  <li key={item.path}>
                    <a
                      href={item.path}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavClick(item.path);
                      }}
                      className={`block px-3 py-2.5 rounded-[6px] transition-colors duration-150 ${
                        isActive
                          ? 'text-[var(--maroon)] bg-[var(--surface-alt)] font-semibold border-l-2 border-[var(--maroon)]'
                          : 'text-[var(--text)] hover:text-[var(--maroon)] hover:bg-[var(--surface-alt)]'
                      }`}
                    >
                      {item.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
};
