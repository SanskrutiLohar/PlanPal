import React, { useState, useEffect, useMemo } from 'react';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { SavedPlan } from '../types/plan.js';
import { fetchAllEvents, persistEvent, deleteEventPersisted } from '../lib/storage.js';

interface MyEventsPageProps {
  onNavigate: (path: string) => void;
  onOpenPlan: (plan: SavedPlan) => void;
  selectedPlanTitle?: string | null;
}

interface SuspectedPlanItem {
  plan: SavedPlan;
  reasons: string[];
}

const getLocalTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const MyEventsPage: React.FC<MyEventsPageProps> = ({ onNavigate, onOpenPlan, selectedPlanTitle }) => {
  const breadcrumbItems = selectedPlanTitle
    ? [
        { name: 'Home', url: '/' },
        { name: 'My Plans', url: '/my-events' },
        { name: selectedPlanTitle, url: '/my-events' },
      ]
    : [
        { name: 'Home', url: '/' },
        { name: 'My Plans', url: '/my-events' },
      ];

  usePageMeta({
    title: 'My Plans | PlanPal',
    description:
      'Open, duplicate or delete the event plans you saved on this device.',
    canonicalPath: '/my-events',
    breadcrumbs: breadcrumbItems,
  });

  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Cleanup assistant state
  const [selectedForCleanup, setSelectedForCleanup] = useState<Set<string>>(new Set());
  const [showCleanupAssistant, setShowCleanupAssistant] = useState<boolean>(true);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState<boolean>(false);

  useEffect(() => {
    loadAllPlans();
  }, []);

  const loadAllPlans = async () => {
    setLoading(true);
    try {
      const plans = await fetchAllEvents();
      setSavedPlans(plans);
    } catch {
      setSavedPlans([]);
    } finally {
      setLoading(false);
    }
  };

  // Inspect saved plans to identify duplicates, test/sample plans, and incomplete plans
  const suspectedEntries = useMemo<SuspectedPlanItem[]>(() => {
    if (!savedPlans || savedPlans.length === 0) return [];

    const items: SuspectedPlanItem[] = [];
    const seenSignatures = new Map<string, string>(); // signature -> first plan ID

    for (const p of savedPlans) {
      const reasons: string[] = [];
      const titleLower = (p.title || '').toLowerCase().trim();
      const notesLower = (p.formData?.notes || '').toLowerCase().trim();

      // 1. Incomplete or empty plan
      const hasEmptyBudget = !p.formData?.budgetINR || Number(p.formData?.budgetINR) <= 0;
      const hasEmptySummary = !p.plan?.summary || p.plan.summary.trim().length === 0;
      if (hasEmptyBudget || hasEmptySummary) {
        reasons.push('Incomplete plan details');
      }

      // 2. Test or sample keyword detection
      const testKeywords = ['test', 'sample', 'dummy', 'temp', 'demo', 'fake', 'trial', 'foo'];
      const isTestTitle = testKeywords.some((kw) => titleLower.includes(kw));
      const isTestNotes = testKeywords.some((kw) => notesLower.includes(kw));
      if (isTestTitle || isTestNotes) {
        reasons.push('Test or sample label');
      }

      // 3. Duplicate detection based on event parameters and base title
      const isCopy = titleLower.includes('(copy)');
      const cleanTitle = titleLower.replace(/\s*\(copy\)\s*$/i, '');
      const sig = `${(p.formData?.eventType || '').trim().toLowerCase()}|${(p.formData?.city || '').trim().toLowerCase()}|${p.formData?.guestCount || 0}|${p.formData?.budgetINR || 0}|${cleanTitle}`;
      if (seenSignatures.has(sig) || isCopy) {
        reasons.push('Duplicate entry of another saved event');
      } else {
        seenSignatures.set(sig, p.id);
      }

      if (reasons.length > 0) {
        items.push({ plan: p, reasons });
      }
    }

    return items;
  }, [savedPlans]);

  // Sync selectedForCleanup with detected items on initial detection
  useEffect(() => {
    if (suspectedEntries.length > 0 && selectedForCleanup.size === 0) {
      setSelectedForCleanup(new Set(suspectedEntries.map((i) => i.plan.id)));
    }
  }, [suspectedEntries]);

  const handleDelete = async (id: string) => {
    await deleteEventPersisted(id);
    const updated = savedPlans.filter((p) => p.id !== id);
    setSavedPlans(updated);
    setDeleteConfirmId(null);
    setNotification('Event removed from storage.');
    setTimeout(() => setNotification(''), 3000);
  };

  const handleDuplicate = async (plan: SavedPlan) => {
    const duplicated: SavedPlan = {
      ...plan,
      id: 'plan_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: `${plan.title} (Copy)`,
      colourPalette: plan.colourPalette || plan.plan?.colourPalette,
      savedPalettes: plan.savedPalettes || plan.plan?.savedPalettes,
    };
    await persistEvent(duplicated);
    setSavedPlans([duplicated, ...savedPlans]);
    setNotification('Plan duplicated and saved.');
    setTimeout(() => setNotification(''), 3000);
  };

  const handleBatchDeleteSelected = async () => {
    setShowBatchDeleteModal(false);
    const idsToDelete = Array.from(selectedForCleanup);
    if (idsToDelete.length === 0) return;

    for (const id of idsToDelete) {
      await deleteEventPersisted(id).catch(() => {});
    }

    const updated = savedPlans.filter((p) => !selectedForCleanup.has(p.id));
    setSavedPlans(updated);
    setSelectedForCleanup(new Set());
    setNotification(`Successfully removed ${idsToDelete.length} plan(s).`);
    setTimeout(() => setNotification(''), 4000);
  };

  const toggleSelectAllCleanup = () => {
    if (selectedForCleanup.size === suspectedEntries.length) {
      setSelectedForCleanup(new Set());
    } else {
      setSelectedForCleanup(new Set(suspectedEntries.map((i) => i.plan.id)));
    }
  };

  const toggleCleanupItem = (id: string) => {
    const next = new Set(selectedForCleanup);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedForCleanup(next);
  };

  return (
    <div className="w-full">
      {/* Page Title Area */}
      <section className="page-title-band">
        <div className="max-w-[1040px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif text-[var(--brown)] mb-1">
              My Plans
            </h1>
            <p className="text-[var(--text-muted)] text-sm sm:text-base">
              Manage saved event plans on this device.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('/plan')}
              className="btn-primary self-start sm:self-auto h-10 min-h-[44px]"
            >
              Create plan
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 pb-12 pt-6">
        {notification && (
          <div className="card p-4 mb-6 border-[var(--ok)] text-sm text-[var(--ok)] bg-[var(--surface)] font-semibold">
            {notification}
          </div>
        )}

        {/* Cleanup Assistant Banner (Non-destructive, requires explicit confirmation) */}
        {showCleanupAssistant && suspectedEntries.length > 0 && !loading && (
          <div className="card p-5 mb-6 border-2 border-[#D9C4A9] bg-[#FFFBF7]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-base font-serif font-bold text-[var(--brown)]">
                  Plan Cleanup Assistant
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {suspectedEntries.length} suspected duplicate, sample, or incomplete {suspectedEntries.length === 1 ? 'entry was' : 'entries were'} found. Review and remove unnecessary entries below. No plans are deleted automatically.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSelectAllCleanup}
                  className="btn-secondary text-xs py-1.5 px-3 min-h-[44px]"
                >
                  {selectedForCleanup.size === suspectedEntries.length ? 'Deselect all' : 'Select all'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCleanupAssistant(false)}
                  className="text-xs text-[var(--text-muted)] hover:underline px-2 min-h-[44px]"
                >
                  Dismiss
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-1">
              {suspectedEntries.map(({ plan: item, reasons }) => {
                const isChecked = selectedForCleanup.has(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded border text-xs cursor-pointer transition-colors ${
                      isChecked
                        ? 'border-[var(--maroon)] bg-[var(--surface)]'
                        : 'border-[var(--border)] bg-[var(--surface-alt)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCleanupItem(item.id)}
                      className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-[var(--maroon)] focus:ring-[var(--maroon)]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <span className="font-semibold text-[var(--brown)] truncate">
                          {item.title}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {reasons.map((r, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-[#FBEAEB] text-[var(--maroon)] border border-[#ECCECE]"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-1 flex gap-4">
                        <span>{item.formData.city || 'City not set'}</span>
                        <span>{item.formData.guestCount || 0} guests</span>
                        <span>₹{Number(item.formData.budgetINR || 0).toLocaleString('en-IN')}</span>
                        <span>Saved {new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[var(--text-muted)] font-medium">
                {selectedForCleanup.size} of {suspectedEntries.length} selected for deletion
              </span>
              <button
                type="button"
                disabled={selectedForCleanup.size === 0}
                onClick={() => setShowBatchDeleteModal(true)}
                className={`btn-small min-h-[44px] font-semibold text-xs px-4 ${
                  selectedForCleanup.size === 0
                    ? 'opacity-50 cursor-not-allowed btn-secondary'
                    : 'bg-[var(--warn)] text-white hover:opacity-95'
                }`}
              >
                Delete selected ({selectedForCleanup.size})
              </button>
            </div>
          </div>
        )}

        {/* Batch Delete Confirmation Dialog */}
        {showBatchDeleteModal && (
          <div className="card p-5 mb-6 border-2 border-[var(--warn)] bg-[var(--surface)]">
            <h3 className="text-base font-serif font-bold text-[var(--warn)] mb-2">
              Confirm Deletion
            </h3>
            <p className="text-sm text-[var(--text)] mb-4">
              Are you sure you want to permanently delete the {selectedForCleanup.size} selected event plan(s)? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBatchDeleteSelected}
                className="btn-primary min-h-[44px] bg-[var(--warn)] text-white font-semibold text-xs px-4"
              >
                Yes, delete {selectedForCleanup.size} plan(s)
              </button>
              <button
                type="button"
                onClick={() => setShowBatchDeleteModal(false)}
                className="btn-secondary min-h-[44px] text-xs px-4"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="card p-10 text-center text-sm text-[var(--text-muted)]">
            Loading saved plans from database...
          </div>
        ) : savedPlans.length === 0 ? (
          <div className="card p-10 text-center bg-[var(--surface)]">
            <h2 className="text-xl font-serif text-[var(--brown)] mb-2">
              No saved plans yet
            </h2>
            <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto mb-6">
              When you create an event plan, click Save plan to store it here for future review.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/plan')}
              className="btn-primary min-h-[44px]"
            >
              Plan an event
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {savedPlans.map((item) => {
              const localToday = getLocalTodayString();
              let daysSummary = 'Date not specified';
              if (item.formData.date && item.formData.date.trim() !== '') {
                if (item.formData.date < localToday) {
                  daysSummary = 'Event date has passed';
                } else {
                  const diff = Math.ceil(
                    (new Date(item.formData.date + 'T00:00:00').getTime() - new Date(localToday + 'T00:00:00').getTime()) /
                    (1000 * 60 * 60 * 24)
                  );
                  daysSummary = `${diff} days left`;
                }
              }

              const isConfirmingDelete = deleteConfirmId === item.id;
              const hasPalette = Boolean(item.colourPalette || item.plan?.colourPalette);

              return (
                <div key={item.id} className="card p-6 flex flex-col justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {item.formData.eventType && <span className="tag">{item.formData.eventType}</span>}
                      {hasPalette && (
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--text)]">
                          Colour Studio saved
                        </span>
                      )}
                      <span className="text-xs text-[var(--text-muted)]">
                        Saved {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h2 className="text-xl font-serif text-[var(--brown)] mb-2 font-bold">
                      {item.title}
                    </h2>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[var(--text-muted)]">
                      <div>
                        <span className="font-semibold block text-[var(--text)]">City</span>
                        {item.formData.city || 'Not specified'}
                      </div>
                      <div>
                        <span className="font-semibold block text-[var(--text)]">Target date</span>
                        <span>{item.formData.date || 'Not specified'}</span>
                        <span className="block text-[11px] text-[var(--text-muted)] mt-0.5 font-medium">
                          {daysSummary}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold block text-[var(--text)]">Guests</span>
                        <span className="tabular-nums">{item.formData.guestCount} attendees</span>
                      </div>
                      <div>
                        <span className="font-semibold block text-[var(--text)]">Budget</span>
                        <span className="tabular-nums font-semibold text-[var(--maroon)]">
                          ₹{Number(item.formData.budgetINR || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Preview of Colour Palette swatches if saved */}
                    {(item.colourPalette || item.plan?.colourPalette) && (
                      <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-3">
                        <span className="text-[11px] text-[var(--text-muted)] font-medium">
                          Palette: {(item.colourPalette || item.plan?.colourPalette)?.name}
                        </span>
                        <div className="flex items-center gap-1">
                          {(item.colourPalette || item.plan?.colourPalette)?.colours.map((c, i) => (
                            <span
                              key={i}
                              className="w-4 h-4 rounded-full border border-black/10 inline-block"
                              style={{ backgroundColor: c.hex }}
                              title={`${c.name} (${c.hex})`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions: Open, Duplicate, Delete with confirmation */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onOpenPlan(item);
                          onNavigate('/plan');
                        }}
                        className="btn-primary btn-small min-h-[44px]"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(item)}
                        className="btn-secondary btn-small min-h-[44px]"
                      >
                        Duplicate
                      </button>
                    </div>

                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-2 bg-[#FFF3F3] p-1.5 rounded border border-[#ECCECE]">
                        <span className="text-xs text-[var(--warn)] font-medium px-1">
                          Delete plan permanently?
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="btn-primary btn-small bg-[var(--warn)] text-white min-h-[44px]"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="btn-secondary btn-small min-h-[44px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="btn-secondary btn-small text-[var(--warn)] border-[var(--border)] min-h-[44px]"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-[var(--border)] text-sm text-[var(--text-muted)]">
          Preparing to interview suppliers? Read our{' '}
          <a
            href="/vendor-guide"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/vendor-guide');
            }}
            className="inline-link"
          >
            vendor booking guide
          </a>{' '}
          for essential questions to ask caterers and hall managers, or{' '}
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
