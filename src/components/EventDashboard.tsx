import React from 'react';
import { SavedPlan } from '../types/plan.js';
import { computeDashboardStats } from '../lib/budgetCalculator.js';

interface EventDashboardProps {
  event: SavedPlan;
  onSelectTab?: (tab: string) => void;
}

const getTodayIST = () => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
};

export const EventDashboard: React.FC<EventDashboardProps> = ({ event, onSelectTab }) => {
  const stats = computeDashboardStats(event);
  const todayStr = getTodayIST();

  // Find upcoming deadlines (tasks with dueDate >= today, sorted closest first)
  const tasks = event.tasks || [];
  const upcomingDeadlines = tasks
    .filter((t) => !t.completed && t.dueDate && t.dueDate >= todayStr)
    .sort((a, b) => (a.dueDate! > b.dueDate! ? 1 : -1))
    .slice(0, 3);

  const overdueTasks = tasks
    .filter((t) => !t.completed && t.dueDate && t.dueDate < todayStr)
    .slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Top Banner: Overall Progress & Event Identity */}
      <div className="card p-5 bg-[var(--surface-alt)] border border-[var(--border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--maroon)]">
                {event.formData.eventType} in {event.formData.city}
              </span>
              <span className="text-xs text-[var(--text-muted)]">•</span>
              <span className="text-xs text-[var(--text-muted)]">
                {event.formData.date ? `Target: ${event.formData.date}` : 'Date unscheduled'}
              </span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-[var(--brown)]">
              {event.title}
            </h2>
          </div>

          {/* Overall Progress Gauge */}
          <div className="flex items-center gap-3 bg-[var(--surface)] p-3 rounded border border-[var(--border)]">
            <div className="text-right">
              <span className="text-xs text-[var(--text-muted)] block">Overall Readiness</span>
              <span className="text-2xl font-serif font-bold text-[var(--maroon)] tabular-nums">
                {stats.overallProgressPct}%
              </span>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-[var(--border)] border-t-[var(--maroon)] animate-none flex items-center justify-center font-bold text-xs tabular-nums text-[var(--text)]">
              {stats.overallProgressPct}%
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-[var(--surface)] rounded overflow-hidden border border-[var(--border)]">
          <div
            className="h-full bg-[var(--maroon)] transition-all duration-300"
            style={{ width: `${stats.overallProgressPct}%` }}
          />
        </div>
      </div>

      {/* Primary KPI Grid (8 Key Statistics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Allocated Budget */}
        <div className="card p-4">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
            Total Allocated Budget
          </span>
          <div className="text-xl font-serif font-bold text-[var(--brown)] tabular-nums">
            ₹{stats.totalBudget.toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-[var(--text-muted)] mt-1 block">
            {event.formData.guestCount ? `${event.formData.guestCount} guests (₹${Math.round(stats.totalBudget / Math.max(1, event.formData.guestCount)).toLocaleString('en-IN')}/guest)` : 'Guest count not specified'}
          </span>
        </div>

        {/* Actual Expenditure */}
        <div className="card p-4">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
            Actual Expenditure
          </span>
          <div className={`text-xl font-serif font-bold tabular-nums ${stats.actualExpenditure > stats.totalBudget ? 'text-[var(--warn)]' : 'text-[var(--brown)]'}`}>
            ₹{stats.actualExpenditure.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[var(--text-muted)]">{stats.budgetUtilizationPct}% used</span>
            {stats.actualExpenditure > stats.totalBudget && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--warn)] text-white">
                Exceeded
              </span>
            )}
          </div>
        </div>

        {/* Remaining Budget */}
        <div className="card p-4">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
            Remaining Budget
          </span>
          <div className={`text-xl font-serif font-bold tabular-nums ${stats.remainingBudget < 0 ? 'text-[var(--warn)]' : 'text-[var(--ok)]'}`}>
            ₹{stats.remainingBudget.toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-[var(--text-muted)] mt-1 block">
            {stats.remainingBudget >= 0 ? 'Unspent funds' : 'Deficit'}
          </span>
        </div>

        {/* Pending Payments */}
        <div className="card p-4">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
            Pending Vendor Payments
          </span>
          <div className="text-xl font-serif font-bold text-[var(--warn)] tabular-nums">
            ₹{stats.pendingPaymentsTotal.toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-[var(--text-muted)] mt-1 block">
            Across booked vendor contracts
          </span>
        </div>

        {/* Completed Tasks */}
        <div className="card p-4">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
            Completed Tasks
          </span>
          <div className="text-xl font-serif font-bold text-[var(--ok)] tabular-nums">
            {stats.completedTasksCount} / {stats.totalTasksCount}
          </div>
          <span className="text-xs text-[var(--text-muted)] mt-1 block">
            {stats.totalTasksCount > 0 ? Math.round((stats.completedTasksCount / stats.totalTasksCount) * 100) : 0}% milestone progress
          </span>
        </div>

        {/* Pending Tasks */}
        <div className="card p-4">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
            Pending Tasks
          </span>
          <div className="text-xl font-serif font-bold text-[var(--brown)] tabular-nums">
            {stats.pendingTasksCount}
          </div>
          <span className="text-xs text-[var(--text-muted)] mt-1 block">
            {stats.overdueTasksCount > 0 ? `${stats.overdueTasksCount} overdue` : 'On schedule'}
          </span>
        </div>

        {/* Vendor Booking Status */}
        <div className="card p-4">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
            Vendor Booking Status
          </span>
          <div className="text-xl font-serif font-bold text-[var(--brown)] tabular-nums">
            {stats.bookedVendorsCount} / {stats.totalVendorsCount} Booked
          </div>
          <span className="text-xs text-[var(--text-muted)] mt-1 block">
            {stats.totalVendorsCount - stats.bookedVendorsCount} pending negotiation
          </span>
        </div>

        {/* Contingency Reserve */}
        <div className="card p-4">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
            Contingency Reserve
          </span>
          <div className="text-xl font-serif font-bold text-[var(--brown)] tabular-nums">
            ₹{stats.contingencyRemaining.toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-[var(--text-muted)] mt-1 block">
            ₹{stats.contingencyAllocated.toLocaleString('en-IN')} allocated buffer
          </span>
        </div>
      </div>

      {/* Deadlines & Action Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming Deadlines */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-serif font-semibold text-base text-[var(--brown)]">
              Upcoming Deadlines
            </h4>
            {onSelectTab && (
              <button
                type="button"
                onClick={() => onSelectTab('timeline')}
                className="text-xs text-[var(--maroon)] hover:underline font-medium"
              >
                View all tasks
              </button>
            )}
          </div>

          {upcomingDeadlines.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic">
              No tasks with upcoming due dates in the next 14 days.
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingDeadlines.map((t) => (
                <div key={t.id} className="p-2.5 rounded bg-[var(--surface-alt)] border border-[var(--border)] text-xs flex items-center justify-between">
                  <div>
                    <span className="font-medium text-[var(--text)] block">{t.task}</span>
                    <span className="text-[var(--text-muted)]">{t.when}</span>
                  </div>
                  <span className="font-semibold text-[var(--brown)] tabular-nums px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">
                    {t.dueDate}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Critical Alerts & Overdue Items */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-serif font-semibold text-base text-[var(--brown)]">
              Attention Required
            </h4>
            {onSelectTab && (
              <button
                type="button"
                onClick={() => onSelectTab('expenses')}
                className="text-xs text-[var(--maroon)] hover:underline font-medium"
              >
                View expenses
              </button>
            )}
          </div>

          <div className="space-y-2 text-xs">
            {overdueTasks.length > 0 && (
              <div className="p-2.5 rounded bg-[var(--surface-alt)] border border-[var(--warn)] text-[var(--warn)]">
                <span className="font-semibold block mb-0.5">{overdueTasks.length} task(s) overdue:</span>
                <ul className="list-disc list-inside">
                  {overdueTasks.map((o) => (
                    <li key={o.id}>{o.task} (Due: {o.dueDate})</li>
                  ))}
                </ul>
              </div>
            )}

            {stats.actualExpenditure > stats.totalBudget && (
              <div className="p-2.5 rounded bg-[var(--surface-alt)] border border-[var(--warn)] text-[var(--warn)]">
                Overall spending exceeds total allocated budget by ₹{(stats.actualExpenditure - stats.totalBudget).toLocaleString('en-IN')}.
              </div>
            )}

            {stats.pendingPaymentsTotal > 0 && (
              <div className="p-2.5 rounded bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--text)]">
                ₹{stats.pendingPaymentsTotal.toLocaleString('en-IN')} in remaining vendor balances due prior to event commencement.
              </div>
            )}

            {overdueTasks.length === 0 && stats.actualExpenditure <= stats.totalBudget && stats.pendingPaymentsTotal === 0 && (
              <p className="text-[var(--ok)] font-medium">
                Everything is on track. No urgent alerts or overdue tasks detected.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
