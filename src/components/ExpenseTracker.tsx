import React, { useState } from 'react';
import { BudgetItem, ExpenseItem } from '../types/plan.js';

interface ExpenseTrackerProps {
  budgetItems: BudgetItem[];
  totalBudget: number;
  expenses: ExpenseItem[];
  onUpdateExpenses: (updated: ExpenseItem[]) => void;
}

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  budgetItems,
  totalBudget,
  expenses,
  onUpdateExpenses,
}) => {
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>(budgetItems[0]?.item || 'Catering and dining');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(getTodayString());
  const [paymentMode, setPaymentMode] = useState<ExpenseItem['paymentMode']>('UPI');
  const [vendorName, setVendorName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const remainingBudget = totalBudget - totalSpent;
  const utilizationPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const handleOpenAdd = () => {
    setTitle('');
    setCategory(budgetItems[0]?.item || 'Catering and dining');
    setAmount(0);
    setDate(getTodayString());
    setPaymentMode('UPI');
    setVendorName('');
    setNotes('');
    setEditingExpenseId(null);
    setShowAddForm(true);
  };

  const handleOpenEdit = (exp: ExpenseItem) => {
    setTitle(exp.title);
    setCategory(exp.category);
    setAmount(exp.amount);
    setDate(exp.date);
    setPaymentMode(exp.paymentMode);
    setVendorName(exp.vendorName || '');
    setNotes(exp.notes || '');
    setEditingExpenseId(exp.id);
    setShowAddForm(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) return;

    if (editingExpenseId) {
      const updated = expenses.map((exp) => {
        if (exp.id === editingExpenseId) {
          return {
            ...exp,
            title: title.trim(),
            category,
            amount: Number(amount),
            date,
            paymentMode,
            vendorName: vendorName.trim() || undefined,
            notes: notes.trim() || undefined,
          };
        }
        return exp;
      });
      onUpdateExpenses(updated);
    } else {
      const newExpense: ExpenseItem = {
        id: 'exp_' + Date.now(),
        title: title.trim(),
        category,
        amount: Number(amount),
        date,
        paymentMode,
        vendorName: vendorName.trim() || undefined,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      onUpdateExpenses([newExpense, ...expenses]);
    }

    setShowAddForm(false);
    setEditingExpenseId(null);
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter((e) => e.id !== id);
    onUpdateExpenses(updated);
  };

  // Category breakdown calculation
  const categoryStats = budgetItems.map((b) => {
    const spent = expenses
      .filter((e) => e.category.toLowerCase() === b.item.toLowerCase() || e.category.toLowerCase().includes(b.item.toLowerCase()))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const allocated = b.amount || Math.round((b.pct / 100) * totalBudget);
    const remaining = allocated - spent;
    const catPct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
    return {
      category: b.item,
      allocated,
      spent,
      remaining,
      catPct,
      isOverspent: spent > allocated,
    };
  });

  const filteredExpenses = filterCategory === 'all'
    ? expenses
    : expenses.filter((e) => e.category === filterCategory);

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
            Total Allocated
          </span>
          <div className="text-2xl font-serif font-bold text-[var(--brown)] tabular-nums">
            ₹{totalBudget.toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-[var(--text-muted)] mt-1 block">Planned event budget</span>
        </div>

        <div className="card p-4">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
            Actual Expenditure
          </span>
          <div className={`text-2xl font-serif font-bold tabular-nums ${totalSpent > totalBudget ? 'text-[var(--warn)]' : 'text-[var(--brown)]'}`}>
            ₹{totalSpent.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[var(--text-muted)]">{utilizationPct}% utilized</span>
            {totalSpent > totalBudget && (
              <span className="px-1.5 py-0.5 text-[11px] bg-[var(--warn)] text-white rounded font-medium">
                Over budget
              </span>
            )}
          </div>
        </div>

        <div className="card p-4">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
            Remaining Funds
          </span>
          <div className={`text-2xl font-serif font-bold tabular-nums ${remainingBudget < 0 ? 'text-[var(--warn)]' : 'text-[var(--ok)]'}`}>
            ₹{remainingBudget.toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-[var(--text-muted)] mt-1 block">
            {remainingBudget >= 0 ? 'Available balance' : 'Exceeded allocation'}
          </span>
        </div>
      </div>

      {/* Category Utilization Grid */}
      <div className="card p-5">
        <h3 className="text-lg font-serif font-semibold text-[var(--brown)] mb-4">
          Budget Category Health & Utilization
        </h3>
        <div className="space-y-3">
          {categoryStats.map((cat, idx) => (
            <div key={idx} className="p-3 rounded border border-[var(--border)] bg-[var(--surface-alt)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--text)]">{cat.category}</span>
                  {cat.isOverspent && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-[var(--warn)] text-white rounded uppercase font-semibold">
                      Overspent by ₹{(cat.spent - cat.allocated).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-[var(--text-muted)] tabular-nums">
                  Spent <strong className="text-[var(--text)]">₹{cat.spent.toLocaleString('en-IN')}</strong> of ₹{cat.allocated.toLocaleString('en-IN')} ({cat.catPct}%)
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-[var(--border)] rounded overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${cat.isOverspent ? 'bg-[var(--warn)]' : 'bg-[var(--maroon)]'}`}
                  style={{ width: `${Math.min(100, cat.catPct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expense Management Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-serif font-semibold text-[var(--brown)]">
            Recorded Expenses ({expenses.length})
          </h3>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-field text-sm py-1.5 px-2.5 h-9"
          >
            <option value="all">All categories</option>
            {budgetItems.map((b, i) => (
              <option key={i} value={b.item}>{b.item}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="btn-primary flex items-center justify-center gap-1.5 self-start sm:self-auto"
        >
          <span>Record expense</span>
        </button>
      </div>

      {/* Expense Modal / Form */}
      {showAddForm && (
        <div className="card p-5 border-2 border-[var(--maroon)] bg-[var(--surface)]">
          <h4 className="text-lg font-serif font-semibold text-[var(--brown)] mb-3">
            {editingExpenseId ? 'Edit expense entry' : 'Record new expense'}
          </h4>
          <form onSubmit={handleSaveExpense} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Expense title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Caterer initial token deposit"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="field-label">Budget category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-field w-full"
                >
                  {budgetItems.map((b, i) => (
                    <option key={i} value={b.item}>{b.item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Amount in INR (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="25000"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="input-field w-full tabular-nums"
                />
              </div>

              <div>
                <label className="field-label">Payment date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="field-label">Payment mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as ExpenseItem['paymentMode'])}
                  className="input-field w-full"
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="field-label">Vendor or payee name</label>
                <input
                  type="text"
                  placeholder="e.g. Anand Caterers"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="input-field w-full"
                />
              </div>
            </div>

            <div>
              <label className="field-label">Notes or receipt details</label>
              <textarea
                rows={2}
                placeholder="Bill number, payment reference or milestone details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field w-full"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" className="btn-primary">
                {editingExpenseId ? 'Update expense' : 'Save expense'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingExpenseId(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expenses Table */}
      {filteredExpenses.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-[var(--border)] rounded text-[var(--text-muted)] bg-[var(--surface)]">
          <p className="font-serif text-base mb-1">No expenses recorded yet.</p>
          <p className="text-sm">Click "Record expense" to log actual vendor deposits and payments.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[var(--border)] rounded bg-[var(--surface)]">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[var(--surface-alt)] border-b border-[var(--border)] text-[var(--text-muted)] font-semibold">
                <th className="p-3">Expense</th>
                <th className="p-3">Category</th>
                <th className="p-3">Date</th>
                <th className="p-3">Mode</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-[var(--surface-alt)] transition-colors">
                  <td className="p-3">
                    <div className="font-medium text-[var(--text)]">{exp.title}</div>
                    {exp.vendorName && (
                      <div className="text-xs text-[var(--text-muted)]">Payee: {exp.vendorName}</div>
                    )}
                    {exp.notes && (
                      <div className="text-xs text-[var(--text-muted)] italic">{exp.notes}</div>
                    )}
                  </td>
                  <td className="p-3 text-[var(--text)]">
                    <span className="px-2 py-0.5 rounded text-xs bg-[var(--surface-alt)] border border-[var(--border)]">
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-3 text-[var(--text-muted)] text-xs tabular-nums">
                    {exp.date}
                  </td>
                  <td className="p-3 text-xs text-[var(--text-muted)]">
                    {exp.paymentMode}
                  </td>
                  <td className="p-3 text-right font-medium text-[var(--brown)] tabular-nums">
                    ₹{exp.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-center">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(exp)}
                        className="text-xs text-[var(--maroon)] hover:underline font-medium"
                      >
                        Edit
                      </button>
                      <span className="text-[var(--border)]">|</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="text-xs text-[var(--warn)] hover:underline font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
