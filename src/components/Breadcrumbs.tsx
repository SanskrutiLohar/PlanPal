import React from 'react';
import { BreadcrumbItem } from '../hooks/usePageMeta.js';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (path: string) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, onNavigate }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="w-full max-w-[1040px] mx-auto px-4 sm:px-6 pt-4 pb-2">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.url + index} className="flex items-center gap-2">
              {index > 0 && <span className="select-none text-[var(--border)]" aria-hidden="true">/</span>}
              {isLast ? (
                <span aria-current="page" className="font-semibold text-[var(--text)]">
                  {item.name}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate(item.url)}
                  className="hover:text-[var(--maroon)] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--maroon)] cursor-pointer bg-transparent border-0 p-0 text-left"
                >
                  {item.name}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
