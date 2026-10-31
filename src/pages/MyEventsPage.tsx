import React, { useState, useEffect } from 'react';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { SavedPlan } from '../types/plan.js';
import { fetchAllEvents, persistEvent, deleteEventPersisted, getPersistentUserId, setPersistentUserId } from '../lib/storage.js';
import { computeDashboardStats } from '../lib/budgetCalculator.js';
import { EventDashboard } from '../components/EventDashboard.js';

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
        { name: 'My events', url: '/my-events' },
        { name: selectedPlanTitle, url: '/my-events' },
      ]
    : [
        { name: 'Home', url: '/' },
        { name: 'My events', url: '/my-events' },
      ];

  usePageMeta({
    title: 'My Events | PlanPal',
    description:
      'Open, copy or delete the event plans you saved on this device. Track vendor tasks and budgets for each one.',
    canonicalPath: '/my-events',
    breadcrumbs: breadcrumbItems,
  });

  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string>('');
  const [inspectEvent, setInspectEvent] = useState<SavedPlan | null>(null);

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
    if (inspectEvent?.id === id) setInspectEvent(null);
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

  const handleCopyWhatsAppSummary = (item: SavedPlan) => {
    const costPerGuest = item.formData.budgetINR && item.formData.guestCount
      ? Math.round(item.formData.budgetINR / Math.max(1, item.formData.guestCount))
      : 0;
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

    const lines: string[] = [
      `*PlanPal Event Plan: ${item.formData.eventType || 'Event'} in ${item.formData.city || 'India'}*`,
      `Target date: ${item.formData.date || 'Not specified'} (${daysSummary})`,
      `Headcount: ${item.formData.guestCount ? `${item.formData.guestCount} guests` : 'Not specified'}`,
      `Budget: INR ${(item.formData.budgetINR || 0).toLocaleString('en-IN')} (INR ${costPerGuest.toLocaleString('en-IN')} per guest)`,
      ``,
      `*Summary:*`,
      item.plan.summary,
      ``,
      `*Budget Breakdown:*`,
    ];

    item.plan.budget.forEach((b) => {
      const amountStr = b.amount
        ? `INR ${b.amount.toLocaleString('en-IN')}`
        : `${b.pct}%`;
      lines.push(`- ${b.item}: ${b.pct}% (${amountStr})`);
    });

    lines.push(``, `*Key Vendors to Book:*`);
    item.plan.vendors.forEach((v) => {
      lines.push(`- [${v.done ? 'Booked' : 'Pending'}] ${v.name}`);
    });

    const fullText = lines.join('\n');
    navigator.clipboard.writeText(fullText).then(() => {
      setNotification('Summary copied for WhatsApp.');
      setTimeout(() => setNotification(''), 4000);
    });
  };

  const handleDownloadPDF = () => {
    window.print();
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
              My events
            </h1>
            <p className="text-[var(--text-muted)] text-sm sm:text-base">
              Manage saved event plans, live expense tracking, and vendor milestones across your devices.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSyncModal(true)}
              className="btn-secondary text-xs h-10 px-3"
            >
              Multi-device sync
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/plan')}
              className="btn-primary self-start sm:self-auto h-10"
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
              Cross-Device Access & Synchronization
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
                className="btn-secondary text-xs py-1.5 px-3 self-start sm:self-auto"
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
                <button type="submit" className="btn-primary text-xs px-4">
                  Sync events
                </button>
              </div>
            </form>

            <div className="pt-3 text-right">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="text-xs text-[var(--text-muted)] hover:underline"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Quick Inspection Modal */}
        {inspectEvent && (
          <div className="mb-8 p-6 rounded border-2 border-[var(--maroon)] bg-[var(--surface)]">
            <div className="flex items-center justify-between mb-4 border-b border-[var(--border)] pb-3">
              <div>
                <span className="text-xs font-semibold text-[var(--maroon)] uppercase tracking-wider">
                  Live Event Dashboard Overview
                </span>
                <h3 className="text-xl font-serif font-bold text-[var(--brown)]">
                  {inspectEvent.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onOpenPlan(inspectEvent);
                    onNavigate('/plan');
                  }}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  Open in planner
                </button>
                <button
                  type="button"
                  onClick={() => setInspectEvent(null)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Close
                </button>
              </div>
            </div>

            <EventDashboard event={inspectEvent} />
          </div>
        )}

        {loading ? (
          <div className="card p-10 text-center text-sm text-[var(--text-muted)]">
            Loading saved events from database...
          </div>
        ) : savedPlans.length === 0 ? (
          <div className="card p-10 text-center bg-[var(--surface)]">
            <h2 className="text-xl font-serif text-[var(--brown)] mb-2">
              No saved events yet
            </h2>
            <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto mb-6">
              When you create an event plan on the planning page, click Save plan to store it here for future review, expense tracking, and offline access.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('/plan')}
                className="btn-primary"
              >
                Plan an event
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/how-it-works')}
                className="btn-secondary"
              >
                See how the plan is built
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {savedPlans.map((item) => {
              const stats = computeDashboardStats(item);
              const costPerGuest = item.formData.budgetINR && item.formData.guestCount
                ? Math.round(item.formData.budgetINR / Math.max(1, item.formData.guestCount))
                : null;
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
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="tag">{item.formData.eventType}</span>
                        <span className="text-xs text-[var(--text-muted)]">
                          Saved {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                        {item.updatedAt && item.updatedAt !== item.createdAt && (
                          <span className="text-[11px] text-[var(--text-muted)] italic">
                            (Updated {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl font-serif text-[var(--brown)] mb-2 font-bold">
                        {item.title}
                      </h2>

                      {/* 4 Metadata Points */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[var(--text-muted)] mb-3">
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
                            ₹{Number(item.formData.budgetINR || 0).toLocaleString('en-IN')} {costPerGuest ? `(₹${costPerGuest}/guest)` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Real Live Metrics Strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded bg-[var(--surface-alt)] border border-[var(--border)] text-xs mb-3">
                        <div>
                          <span className="text-[var(--text-muted)] block">Readiness</span>
                          <strong className="text-[var(--brown)] text-sm tabular-nums">{stats.overallProgressPct}%</strong>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] block">Actual Spent</span>
                          <strong className="text-[var(--brown)] text-sm tabular-nums">₹{stats.actualExpenditure.toLocaleString('en-IN')}</strong>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] block">Remaining</span>
                          <strong className={`text-sm tabular-nums ${stats.remainingBudget < 0 ? 'text-[var(--warn)]' : 'text-[var(--ok)]'}`}>
                            ₹{stats.remainingBudget.toLocaleString('en-IN')}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] block">Pending Payments</span>
                          <strong className="text-[var(--warn)] text-sm tabular-nums">₹{stats.pendingPaymentsTotal.toLocaleString('en-IN')}</strong>
                        </div>
                      </div>

                      {/* Vendor & Task Progress bars */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                        <div>
                          <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                            <span>Vendors</span>
                            <span className="tabular-nums font-semibold text-[var(--brown)]">
                              {stats.bookedVendorsCount}/{stats.totalVendorsCount} booked
                            </span>
                          </div>
                          <div className="progress-bar-track">
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${stats.totalVendorsCount > 0 ? (stats.bookedVendorsCount / stats.totalVendorsCount) * 100 : 0}%`,
                                backgroundColor: 'var(--maroon)',
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                            <span>Preparation tasks</span>
                            <span className="tabular-nums font-semibold text-[var(--brown)]">
                              {stats.completedTasksCount}/{stats.totalTasksCount} done
                            </span>
                          </div>
                          <div className="progress-bar-track">
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${stats.totalTasksCount > 0 ? (stats.completedTasksCount / stats.totalTasksCount) * 100 : 0}%`,
                                backgroundColor: 'var(--ok)',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex flex-wrap items-center gap-2 border-t pt-3 border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenPlan(item);
                        onNavigate('/plan');
                      }}
                      className="btn-primary btn-small"
                    >
                      Open event
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectEvent(item)}
                      className="btn-secondary btn-small"
                    >
                      Quick dashboard
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyWhatsAppSummary(item)}
                      className="btn-secondary btn-small"
                    >
                      Copy summary
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      className="btn-secondary btn-small"
                    >
                      Download plan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(item)}
                      className="btn-secondary btn-small"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="btn-secondary btn-small text-[var(--warn)] border-[var(--border)]"
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
