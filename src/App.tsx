import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { Breadcrumbs } from './components/Breadcrumbs.js';
import { HomePage } from './pages/HomePage.js';
import { PlanPage } from './pages/PlanPage.js';
import { MyEventsPage } from './pages/MyEventsPage.js';
import { HowItWorksPage } from './pages/HowItWorksPage.js';
import { VendorGuidePage } from './pages/VendorGuidePage.js';
import { AboutPage } from './pages/AboutPage.js';
import { SavedPlan } from './types/plan.js';
import { BreadcrumbItem } from './hooks/usePageMeta.js';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [activePlan, setActivePlan] = useState<SavedPlan | null>(null);

  // Sync state on popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (pathWithSearch: string) => {
    const [path] = pathWithSearch.split('#');
    window.history.pushState({}, '', pathWithSearch);
    setCurrentPath(path.split('?')[0]);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Compute breadcrumbs for current route
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    if (currentPath === '/') return [];
    if (currentPath === '/plan') {
      if (activePlan) {
        return [
          { name: 'Home', url: '/' },
          { name: 'My Plans', url: '/my-events' },
          { name: activePlan.title, url: '/plan' },
        ];
      }
      return [
        { name: 'Home', url: '/' },
        { name: 'AI Planner', url: '/plan' },
      ];
    }
    if (currentPath === '/my-events') {
      return [
        { name: 'Home', url: '/' },
        { name: 'My Plans', url: '/my-events' },
      ];
    }
    if (currentPath === '/how-it-works') {
      return [
        { name: 'Home', url: '/' },
        { name: 'How it works', url: '/how-it-works' },
      ];
    }
    if (currentPath === '/vendor-guide') {
      return [
        { name: 'Home', url: '/' },
        { name: 'Vendor guide', url: '/vendor-guide' },
      ];
    }
    if (currentPath === '/about') {
      return [
        { name: 'Home', url: '/' },
        { name: 'About', url: '/about' },
      ];
    }
    return [
      { name: 'Home', url: '/' },
      { name: 'AI Planner', url: '/plan' },
    ];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)]">
      <Header currentPath={currentPath} onNavigate={navigate} />

      {/* Breadcrumbs shown on every page except Home */}
      {currentPath !== '/' && (
        <Breadcrumbs items={breadcrumbs} onNavigate={navigate} />
      )}

      <main className="flex-1">
        {currentPath === '/' && <HomePage onNavigate={navigate} />}
        {currentPath === '/plan' && (
          <PlanPage onNavigate={navigate} initialPlanData={activePlan} />
        )}
        {currentPath === '/my-events' && (
          <MyEventsPage
            onNavigate={navigate}
            onOpenPlan={(plan) => {
              setActivePlan(plan);
            }}
          />
        )}
        {currentPath === '/how-it-works' && <HowItWorksPage onNavigate={navigate} />}
        {currentPath === '/vendor-guide' && <VendorGuidePage onNavigate={navigate} />}
        {currentPath === '/about' && <AboutPage onNavigate={navigate} />}
      </main>

      <Footer onNavigate={navigate} />
    </div>
  );
}
