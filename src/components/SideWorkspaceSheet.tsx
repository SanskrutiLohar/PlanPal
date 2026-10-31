import React, { useState, useEffect } from 'react';
import { SavedPlan, AIProposedChange, ExpenseItem, VendorItem, VendorComparison, TimelineTask } from '../types/plan.js';
import { EventDashboard } from './EventDashboard';
import { ExpenseTracker } from './ExpenseTracker';
import { VendorManager } from './VendorManager';
import { IntelligentTimeline } from './IntelligentTimeline';
import { AIAssistantChat } from './AIAssistantChat';

interface SideWorkspaceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  event: SavedPlan;
  onUpdateEvent: (updated: SavedPlan) => void;
  onApplyProposedChange: (proposal: AIProposedChange) => void;
}

export const SideWorkspaceSheet: React.FC<SideWorkspaceSheetProps> = ({
  isOpen,
  onClose,
  event,
  onUpdateEvent,
  onApplyProposedChange,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'budget' | 'vendors' | 'timeline' | 'assistant'>('overview');

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUpdateExpenses = (newExpenses: ExpenseItem[]) => {
    onUpdateEvent({
      ...event,
      expenses: newExpenses,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateVendors = (newVendors: VendorItem[]) => {
    onUpdateEvent({
      ...event,
      plan: {
        ...event.plan,
        vendors: newVendors,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateComparisons = (newComparisons: VendorComparison[]) => {
    onUpdateEvent({
      ...event,
      vendorComparisons: newComparisons,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateTasks = (newTasks: TimelineTask[]) => {
    onUpdateEvent({
      ...event,
      tasks: newTasks,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAskVendorQuestions = async (vendorName: string, vendorWhy: string) => {
    try {
      const res = await fetch('/api/vendor-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName,
          vendorWhy,
          eventType: event.formData.eventType,
          city: event.formData.city,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.questions && Array.isArray(data.questions)) {
          alert(`Questions to ask ${vendorName}:\n\n` + data.questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n'));
        }
      }
    } catch (e) {
      console.warn('Vendor questions error:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className="relative w-full max-w-4xl bg-[#FAF5ED] h-full shadow-2xl flex flex-col z-10 border-l border-[#DDD0BD] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Event Management Workspace"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#FCF9F3] border-b border-[#DDD0BD] flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#A8641A] uppercase tracking-wider">
                Event Management Workspace
              </span>
              <span className="text-xs text-[#8C7A68]">•</span>
              <span className="text-xs text-[#5A3E2B] font-medium">
                {event.formData.eventType} in {event.formData.city}
              </span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#7A1F2B] mt-0.5">
              {event.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-sm text-[#5A3E2B] hover:text-[#7A1F2B] hover:bg-[#F2E8D7] transition-colors border border-[#DDD0BD]"
            aria-label="Close workspace"
          >
            <span className="text-sm font-semibold px-1">Close (Esc)</span>
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 px-4 sm:px-6 bg-[#FCF9F3] border-b border-[#DDD0BD] shrink-0 overflow-x-auto py-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-[#7A1F2B] text-white shadow-xs'
                : 'text-[#5A3E2B] hover:bg-[#EFE6D8]'
            }`}
          >
            Dashboard Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('budget')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap ${
              activeTab === 'budget'
                ? 'bg-[#7A1F2B] text-white shadow-xs'
                : 'text-[#5A3E2B] hover:bg-[#EFE6D8]'
            }`}
          >
            Expenses & Allocation
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vendors')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap ${
              activeTab === 'vendors'
                ? 'bg-[#7A1F2B] text-white shadow-xs'
                : 'text-[#5A3E2B] hover:bg-[#EFE6D8]'
            }`}
          >
            Vendors & Quotes
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap ${
              activeTab === 'timeline'
                ? 'bg-[#7A1F2B] text-white shadow-xs'
                : 'text-[#5A3E2B] hover:bg-[#EFE6D8]'
            }`}
          >
            Timeline & Tasks
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assistant')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap ${
              activeTab === 'assistant'
                ? 'bg-[#7A1F2B] text-white shadow-xs'
                : 'text-[#5A3E2B] hover:bg-[#EFE6D8]'
            }`}
          >
            Event Data Q&A
          </button>
        </div>

        {/* Sheet Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'overview' && (
            <EventDashboard
              event={event}
              onSelectTab={(tab) => {
                if (tab === 'expenses') setActiveTab('budget');
                else if (tab === 'vendors') setActiveTab('vendors');
                else if (tab === 'tasks') setActiveTab('timeline');
              }}
            />
          )}

          {activeTab === 'budget' && (
            <ExpenseTracker
              budgetItems={event.plan.budget}
              totalBudget={event.formData.budgetINR || 0}
              expenses={event.expenses || []}
              onUpdateExpenses={handleUpdateExpenses}
            />
          )}

          {activeTab === 'vendors' && (
            <VendorManager
              vendors={event.plan.vendors}
              comparisons={event.vendorComparisons || []}
              eventType={event.formData.eventType || 'Event'}
              city={event.formData.city || 'India'}
              onUpdateVendors={handleUpdateVendors}
              onUpdateComparisons={handleUpdateComparisons}
              onAskQuestions={handleAskVendorQuestions}
            />
          )}

          {activeTab === 'timeline' && (
            <IntelligentTimeline
              tasks={event.tasks || []}
              formData={event.formData}
              onUpdateTasks={handleUpdateTasks}
            />
          )}

          {activeTab === 'assistant' && (
            <AIAssistantChat
              event={event}
              onApplyProposedChange={onApplyProposedChange}
            />
          )}
        </div>
      </aside>
    </div>
  );
};
