import React, { useState, useEffect } from 'react';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { SavedPlan } from '../types/plan.js';
import { fetchAllEvents, persistEvent, deleteEventPersisted, getPersistentUserId, setPersistentUserId } from '../lib/storage.js';

interface MyEventsPageProps {
  onNavigate: (path: string) => void;
  onOpenPlan: (plan: SavedPlan) => void;
  selectedPlanTitle?: string | null;
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

  // Cross-device sync state
  const [userId, setUserId] = useState<string>('');
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [inputSyncKey, setInputSyncKey] = useState<string>('');

  useEffect(() => {
    setUserId(getPersistentUserId());
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

  const handleDelete = async (id: string) => {
    await deleteEventPersisted(id);
    const updated = savedPlans.filter((p) => p.id !== id);
    setSavedPlans(updated);
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
    };
    await persistEvent(duplicated);
    setSavedPlans([duplicated, ...savedPlans]);
    setNotification('Plan duplicated and saved.');
    setTimeout(() => setNotification(''), 3000);
  };

  const handleCopySyncKey = () => {
    navigator.clipboard.writeText(userId).then(() => {
      setNotification('Device sync code copied to clipboard.');
      setTimeout(() => setNotification(''), 3000);
    });
  };

  const handleApplyNewSyncKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputSyncKey.trim()) return;
    setPersistentUserId(inputSyncKey.trim());
    setUserId(inputSyncKey.trim());
    setShowSyncModal(false);
    setInputSyncKey('');
    await loadAllPlans();
    setNotification('Synchronized with shared device ID.');
    setTimeout(() => setNotification(''), 4000);
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
              Manage saved event plans across your devices.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSyncModal(true)}
              className="btn-secondary text-xs h-10 px-3 min-h-[44px]"
            >
              Multi-device sync
            </button>
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

        {/* Multi-Device Sync Modal */}
        {showSyncModal && (
          <div className="card p-5 mb-6 border-2 border-[var(--maroon)] bg-[var(--surface)]">
            <h3 className="text-lg font-serif font-semibold text-[var(--brown)] mb-2">
              Cross-Device Access
            </h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Your events are automatically persisted to PostgreSQL storage. Use your unique Device Sync Key below to access your events from any phone, laptop, or browser.
            </p>

            <div className="p-3 rounded bg-[var(--surface-alt)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
                  Your Device Sync Key
                </span>
                <code className="text-sm font-mono text-[var(--brown)] select-all font-semibold">
                  {userId}
                </code>
              </div>
              <button
                type="button"
                onClick={handleCopySyncKey}
                className="btn-secondary text-xs py-1.5 px-3 self-start sm:self-auto min-h-[44px]"
              >
                Copy Sync Key
              </button>
            </div>

            <form onSubmit={handleApplyNewSyncKey} className="space-y-3">
              <label className="field-label">Access an existing account from another device:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste Sync Key from another device (e.g. usr_...)"
                  value={inputSyncKey}
                  onChange={(e) => setInputSyncKey(e.target.value)}
                  className="input-field flex-1 text-sm"
                />
                <button type="submit" className="btn-primary text-xs px-4 min-h-[44px]">
                  Sync events
                </button>
              </div>
            </form>

            <div className="pt-3 text-right">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="text-xs text-[var(--text-muted)] hover:underline min-h-[44px]"
              >
                Close
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

              return (
                <div key={item.id} className="card p-6 flex flex-col justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {item.formData.eventType && <span className="tag">{item.formData.eventType}</span>}
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
                        {item.formData.city}
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
                  </div>

                  {/* Actions: Open, Duplicate, Delete only */}
                  <div className="flex flex-wrap items-center gap-2 border-t pt-3 border-[var(--border)]">
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
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="btn-secondary btn-small text-[var(--warn)] border-[var(--border)] min-h-[44px]"
                    >
                      Delete
                    </button>
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
