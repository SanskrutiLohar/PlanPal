import React, { useState } from 'react';
import { VendorComparison, VendorItem, VendorQuote } from '../types/plan.js';

interface VendorManagerProps {
  vendors: VendorItem[];
  comparisons?: VendorComparison[];
  eventType: string;
  city: string;
  onUpdateVendors: (vendors: VendorItem[]) => void;
  onUpdateComparisons?: (comparisons: VendorComparison[]) => void;
  onAskQuestions: (vendorName: string, vendorWhy: string, idx: number) => void;
  loadingQuestionsIdx?: number | null;
}

export const VendorManager: React.FC<VendorManagerProps> = ({
  vendors,
  comparisons = [],
  eventType,
  city,
  onUpdateVendors,
  onUpdateComparisons,
  onAskQuestions,
  loadingQuestionsIdx,
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'list' | 'compare'>('list');

  // Vendor Form State
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('Catering');
  const [why, setWhy] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [quotedPrice, setQuotedPrice] = useState<number>(0);
  const [negotiatedPrice, setNegotiatedPrice] = useState<number>(0);
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [status, setStatus] = useState<VendorItem['status']>('shortlisted');
  const [paymentDueDate, setPaymentDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Comparison State
  const [selectedCompareCategory, setSelectedCompareCategory] = useState<string>('Catering');
  const [quoteVendorName, setQuoteVendorName] = useState<string>('');
  const [quoteContact, setQuoteContact] = useState<string>('');
  const [quotePrice, setQuotePrice] = useState<number>(0);
  const [quoteAdvancePct, setQuoteAdvancePct] = useState<number>(20);
  const [quoteDeliverables, setQuoteDeliverables] = useState<string>('');
  const [quotePros, setQuotePros] = useState<string>('');
  const [quoteCons, setQuoteCons] = useState<string>('');

  const handleOpenAdd = () => {
    setName('');
    setCategory('Catering');
    setWhy('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setQuotedPrice(0);
    setNegotiatedPrice(0);
    setAdvancePaid(0);
    setStatus('shortlisted');
    setPaymentDueDate('');
    setNotes('');
    setEditingIndex(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (v: VendorItem, idx: number) => {
    setName(v.name);
    setCategory(v.category || 'General');
    setWhy(v.why);
    setContactPerson(v.contactPerson || '');
    setPhone(v.phone || '');
    setEmail(v.email || '');
    setAddress(v.address || '');
    setQuotedPrice(v.quotedPrice || 0);
    setNegotiatedPrice(v.negotiatedPrice || 0);
    setAdvancePaid(v.advancePaid || 0);
    setStatus(v.status || (v.done ? 'booked' : 'shortlisted'));
    setPaymentDueDate(v.paymentDueDate || '');
    setNotes(v.notes || '');
    setEditingIndex(idx);
    setShowAddModal(true);
  };

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const remaining = Math.max(0, (negotiatedPrice || quotedPrice || 0) - (advancePaid || 0));
    const isDone = status === 'booked' || status === 'completed';

    const newVendor: VendorItem = {
      id: editingIndex !== null ? vendors[editingIndex]?.id || 'ven_' + Date.now() : 'ven_' + Date.now(),
      name: name.trim(),
      category,
      why: why.trim() || `Provides essential ${category.toLowerCase()} services.`,
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      quotedPrice: Number(quotedPrice) || 0,
      negotiatedPrice: Number(negotiatedPrice) || 0,
      advancePaid: Number(advancePaid) || 0,
      remainingPayment: remaining,
      status: status || 'shortlisted',
      paymentDueDate: paymentDueDate || undefined,
      notes: notes.trim() || undefined,
      done: isDone,
    };

    let updated: VendorItem[];
    if (editingIndex !== null) {
      updated = [...vendors];
      updated[editingIndex] = newVendor;
    } else {
      updated = [newVendor, ...vendors];
    }

    onUpdateVendors(updated);
    setShowAddModal(false);
    setEditingIndex(null);
  };

  const handleDeleteVendor = (idx: number) => {
    const updated = vendors.filter((_, i) => i !== idx);
    onUpdateVendors(updated);
  };

  const handleToggleDone = (idx: number) => {
    const updated = vendors.map((v, i) => {
      if (i === idx) {
        const nextDone = !v.done;
        return {
          ...v,
          done: nextDone,
          status: (nextDone ? 'booked' : 'shortlisted') as VendorItem['status'],
        };
      }
      return v;
    });
    onUpdateVendors(updated);
  };

  // Add quote to comparison
  const handleAddQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteVendorName.trim() || !onUpdateComparisons) return;

    const newQuote: VendorQuote = {
      id: 'quote_' + Date.now(),
      vendorName: quoteVendorName.trim(),
      contact: quoteContact.trim(),
      quotedPrice: Number(quotePrice) || 0,
      advanceRequiredPct: Number(quoteAdvancePct) || 20,
      deliverables: quoteDeliverables.trim(),
      pros: quotePros.trim(),
      cons: quoteCons.trim(),
    };

    let updatedComps = [...comparisons];
    const catIdx = updatedComps.findIndex((c) => c.category === selectedCompareCategory);

    if (catIdx >= 0) {
      updatedComps[catIdx] = {
        ...updatedComps[catIdx],
        quotes: [...updatedComps[catIdx].quotes, newQuote],
      };
    } else {
      updatedComps.push({
        id: 'comp_' + Date.now(),
        category: selectedCompareCategory,
        quotes: [newQuote],
      });
    }

    onUpdateComparisons(updatedComps);
    setQuoteVendorName('');
    setQuoteContact('');
    setQuotePrice(0);
    setQuoteDeliverables('');
    setQuotePros('');
    setQuoteCons('');
  };

  const handleSelectWinningQuote = (catName: string, quote: VendorQuote) => {
    if (!onUpdateComparisons) return;
    const updatedComps = comparisons.map((c) => {
      if (c.category === catName) {
        return { ...c, selectedQuoteId: quote.id };
      }
      return c;
    });
    onUpdateComparisons(updatedComps);

    // Also update vendor list if match exists
    const matchIdx = vendors.findIndex((v) => v.name.toLowerCase().includes(quote.vendorName.toLowerCase()));
    if (matchIdx >= 0) {
      const updatedVendors = [...vendors];
      updatedVendors[matchIdx] = {
        ...updatedVendors[matchIdx],
        status: 'booked',
        done: true,
        quotedPrice: quote.quotedPrice,
        negotiatedPrice: quote.quotedPrice,
        remainingPayment: quote.quotedPrice,
      };
      onUpdateVendors(updatedVendors);
    }
  };

  const filteredVendors = statusFilter === 'all'
    ? vendors
    : vendors.filter((v) => (v.status || (v.done ? 'booked' : 'shortlisted')) === statusFilter);

  // Financial aggregates
  const totalQuoted = vendors.reduce((s, v) => s + (v.quotedPrice || 0), 0);
  const totalNegotiated = vendors.reduce((s, v) => s + (v.negotiatedPrice || v.quotedPrice || 0), 0);
  const totalAdvance = vendors.reduce((s, v) => s + (v.advancePaid || 0), 0);
  const totalRemaining = vendors.reduce((s, v) => {
    const rem = v.remainingPayment ?? Math.max(0, (v.negotiatedPrice || v.quotedPrice || 0) - (v.advancePaid || 0));
    return s + rem;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Tab Switcher: Vendor List vs Compare Quotes */}
      <div className="flex border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`py-2.5 px-4 font-serif text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'list'
              ? 'border-[var(--maroon)] text-[var(--maroon)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          Vendor Directory ({vendors.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('compare')}
          className={`py-2.5 px-4 font-serif text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'compare'
              ? 'border-[var(--maroon)] text-[var(--maroon)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          Compare Quotes ({comparisons.reduce((s, c) => s + c.quotes.length, 0)})
        </button>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-3">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Quoted Total
              </span>
              <div className="text-lg sm:text-xl font-serif font-bold text-[var(--brown)] tabular-nums">
                ₹{totalQuoted.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="card p-3">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Negotiated Total
              </span>
              <div className="text-lg sm:text-xl font-serif font-bold text-[var(--brown)] tabular-nums">
                ₹{totalNegotiated.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="card p-3">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Advance Paid
              </span>
              <div className="text-lg sm:text-xl font-serif font-bold text-[var(--ok)] tabular-nums">
                ₹{totalAdvance.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="card p-3">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Pending Balance
              </span>
              <div className="text-lg sm:text-xl font-serif font-bold text-[var(--warn)] tabular-nums">
                ₹{totalRemaining.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--text-muted)] font-medium">Status filter:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field text-xs py-1 px-2 h-8"
              >
                <option value="all">All statuses ({vendors.length})</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="contacted">Contacted</option>
                <option value="negotiating">Negotiating</option>
                <option value="booked">Booked</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="btn-primary self-start sm:self-auto text-sm"
            >
              Add vendor
            </button>
          </div>

          {/* Vendor Add/Edit Modal */}
          {showAddModal && (
            <div className="card p-5 border-2 border-[var(--maroon)] bg-[var(--surface)]">
              <h4 className="text-lg font-serif font-semibold text-[var(--brown)] mb-3">
                {editingIndex !== null ? 'Edit vendor details' : 'Add new vendor'}
              </h4>
              <form onSubmit={handleSaveVendor} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Vendor or business name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Royal Caterers & Halwai"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>

                  <div>
                    <label className="field-label">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="input-field w-full"
                    >
                      <option value="Catering">Catering & Dining</option>
                      <option value="Venue">Venue & Hall</option>
                      <option value="Decor">Decor & Mandap</option>
                      <option value="Photography">Photography & Video</option>
                      <option value="Sound">Sound & DJ</option>
                      <option value="Rituals">Priest & Pooja</option>
                      <option value="Attire">Attire & Beauty</option>
                      <option value="Logistics">Transport & Logistics</option>
                      <option value="General">Other / General</option>
                    </select>
                  </div>

                  <div>
                    <label className="field-label">Contact person</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Sharma"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>

                  <div>
                    <label className="field-label">Phone number</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>

                  <div>
                    <label className="field-label">Email address</label>
                    <input
                      type="email"
                      placeholder="vendor@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>

                  <div>
                    <label className="field-label">Booking status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as VendorItem['status'])}
                      className="input-field w-full"
                    >
                      <option value="shortlisted">Shortlisted</option>
                      <option value="contacted">Contacted</option>
                      <option value="negotiating">Negotiating</option>
                      <option value="booked">Booked</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="field-label">Quoted price in INR (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="80000"
                      value={quotedPrice || ''}
                      onChange={(e) => setQuotedPrice(Number(e.target.value))}
                      className="input-field w-full tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="field-label">Negotiated final price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="72000"
                      value={negotiatedPrice || ''}
                      onChange={(e) => setNegotiatedPrice(Number(e.target.value))}
                      className="input-field w-full tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="field-label">Advance token paid (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="20000"
                      value={advancePaid || ''}
                      onChange={(e) => setAdvancePaid(Number(e.target.value))}
                      className="input-field w-full tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="field-label">Remaining balance due date</label>
                    <input
                      type="date"
                      value={paymentDueDate}
                      onChange={(e) => setPaymentDueDate(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label">Role why & deliverables</label>
                  <input
                    type="text"
                    placeholder="Why this vendor is needed and key deliverables..."
                    value={why}
                    onChange={(e) => setWhy(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="field-label">Notes & contract terms</label>
                  <textarea
                    rows={2}
                    placeholder="Cancellation rules, arrival time, diesel backup clauses..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" className="btn-primary">
                    {editingIndex !== null ? 'Update vendor' : 'Save vendor'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingIndex(null);
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Vendors Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVendors.map((vendor, idx) => {
              const currentStatus = vendor.status || (vendor.done ? 'booked' : 'shortlisted');
              const remaining = vendor.remainingPayment ?? Math.max(0, (vendor.negotiatedPrice || vendor.quotedPrice || 0) - (vendor.advancePaid || 0));

              return (
                <div key={idx} className="card p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(vendor.done || currentStatus === 'booked')}
                          onChange={() => handleToggleDone(idx)}
                          className="w-4 h-4 cursor-pointer accent-[var(--maroon)]"
                        />
                        <h4 className="font-serif font-semibold text-base text-[var(--brown)]">
                          {vendor.name}
                        </h4>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                        currentStatus === 'booked' || currentStatus === 'completed'
                          ? 'bg-[var(--ok)] text-white'
                          : currentStatus === 'negotiating'
                          ? 'bg-[var(--tan)] text-white'
                          : 'bg-[var(--surface-alt)] text-[var(--text-muted)] border border-[var(--border)]'
                      }`}>
                        {currentStatus}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-muted)] mb-3">
                      {vendor.why}
                    </p>

                    {/* Financial & Contact Details */}
                    <div className="p-2.5 rounded bg-[var(--surface-alt)] border border-[var(--border)] text-xs space-y-1.5 mb-3">
                      {(vendor.quotedPrice || vendor.negotiatedPrice) ? (
                        <div className="flex items-center justify-between tabular-nums">
                          <span className="text-[var(--text-muted)]">Cost:</span>
                          <span className="font-medium text-[var(--text)]">
                            {vendor.negotiatedPrice ? `₹${vendor.negotiatedPrice.toLocaleString('en-IN')}` : `₹${(vendor.quotedPrice || 0).toLocaleString('en-IN')}`}
                            {vendor.advancePaid ? ` (Paid: ₹${vendor.advancePaid.toLocaleString('en-IN')})` : ''}
                          </span>
                        </div>
                      ) : null}

                      {remaining > 0 && (
                        <div className="flex items-center justify-between tabular-nums font-semibold text-[var(--warn)]">
                          <span>Pending Payment:</span>
                          <span>₹{remaining.toLocaleString('en-IN')}</span>
                        </div>
                      )}

                      {vendor.paymentDueDate && (
                        <div className="flex items-center justify-between text-[var(--text-muted)]">
                          <span>Payment Due:</span>
                          <span className="font-medium text-[var(--text)]">{vendor.paymentDueDate}</span>
                        </div>
                      )}

                      {vendor.phone && (
                        <div className="flex items-center justify-between text-[var(--text-muted)]">
                          <span>Phone:</span>
                          <a href={`tel:${vendor.phone}`} className="text-[var(--maroon)] hover:underline font-medium">
                            {vendor.phone}
                          </a>
                        </div>
                      )}

                      {vendor.contactPerson && (
                        <div className="text-[var(--text-muted)]">
                          Contact: <strong className="text-[var(--text)]">{vendor.contactPerson}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs">
                    <button
                      type="button"
                      onClick={() => onAskQuestions(vendor.name, vendor.why, idx)}
                      disabled={loadingQuestionsIdx === idx}
                      className="text-[var(--maroon)] hover:underline font-medium"
                    >
                      {loadingQuestionsIdx === idx ? 'Loading questions...' : 'Questions to ask'}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(vendor, idx)}
                        className="text-[var(--text-muted)] hover:text-[var(--text)] hover:underline"
                      >
                        Edit
                      </button>
                      <span className="text-[var(--border)]">|</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteVendor(idx)}
                        className="text-[var(--warn)] hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Comparison Tool View */
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-lg font-serif font-semibold text-[var(--brown)] mb-2">
              Side-by-Side Vendor Quote Comparison
            </h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Add multiple quotes for a category to compare advance terms, deliverables, and total rates before signing.
            </p>

            <form onSubmit={handleAddQuote} className="p-4 rounded bg-[var(--surface-alt)] border border-[var(--border)] space-y-3 mb-6">
              <h4 className="font-serif font-semibold text-sm text-[var(--text)]">Add quote for comparison</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="field-label">Category</label>
                  <select
                    value={selectedCompareCategory}
                    onChange={(e) => setSelectedCompareCategory(e.target.value)}
                    className="input-field w-full text-xs"
                  >
                    <option value="Catering">Catering</option>
                    <option value="Venue">Venue</option>
                    <option value="Decor">Decor</option>
                    <option value="Photography">Photography</option>
                    <option value="Sound">Sound</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Vendor name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Vendor / Agency title"
                    value={quoteVendorName}
                    onChange={(e) => setQuoteVendorName(e.target.value)}
                    className="input-field w-full text-xs"
                  />
                </div>
                <div>
                  <label className="field-label">Contact / Phone</label>
                  <input
                    type="text"
                    placeholder="Phone or manager name"
                    value={quoteContact}
                    onChange={(e) => setQuoteContact(e.target.value)}
                    className="input-field w-full text-xs"
                  />
                </div>
                <div>
                  <label className="field-label">Quoted price (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Quote amount"
                    value={quotePrice || ''}
                    onChange={(e) => setQuotePrice(Number(e.target.value))}
                    className="input-field w-full text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="field-label">Advance required (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="25"
                    value={quoteAdvancePct}
                    onChange={(e) => setQuoteAdvancePct(Number(e.target.value))}
                    className="input-field w-full text-xs"
                  />
                </div>
                <div>
                  <label className="field-label">Key deliverables</label>
                  <input
                    type="text"
                    placeholder="Live counters, teaser video, etc."
                    value={quoteDeliverables}
                    onChange={(e) => setQuoteDeliverables(e.target.value)}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Pros / Advantages</label>
                  <input
                    type="text"
                    placeholder="Includes power backup, tasted food..."
                    value={quotePros}
                    onChange={(e) => setQuotePros(e.target.value)}
                    className="input-field w-full text-xs"
                  />
                </div>
                <div>
                  <label className="field-label">Cons / Watchouts</label>
                  <input
                    type="text"
                    placeholder="Extra transport fee, strict curfew..."
                    value={quoteCons}
                    onChange={(e) => setQuoteCons(e.target.value)}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary text-xs py-1.5 px-3">
                Add quote to comparison
              </button>
            </form>

            {/* Comparison Tables per Category */}
            {comparisons.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-[var(--border)] rounded text-[var(--text-muted)] text-sm">
                No quotes added yet. Add quotes above to compare quotes side-by-side.
              </div>
            ) : (
              comparisons.map((comp) => (
                <div key={comp.id} className="mb-6 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-serif font-semibold text-base text-[var(--brown)]">
                      {comp.category} Comparison ({comp.quotes.length} quotes)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {comp.quotes.map((quote) => {
                      const isSelected = comp.selectedQuoteId === quote.id;
                      return (
                        <div
                          key={quote.id}
                          className={`p-4 rounded border transition-colors ${
                            isSelected
                              ? 'border-2 border-[var(--ok)] bg-[var(--surface)]'
                              : 'border-[var(--border)] bg-[var(--surface-alt)]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-sm text-[var(--text)]">{quote.vendorName}</h5>
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--ok)] text-white uppercase">
                                Selected
                              </span>
                            )}
                          </div>

                          <div className="text-xl font-serif font-bold text-[var(--brown)] tabular-nums mb-2">
                            ₹{quote.quotedPrice.toLocaleString('en-IN')}
                          </div>

                          <div className="text-xs space-y-1.5 text-[var(--text-muted)] mb-3">
                            <div>Advance required: <strong className="text-[var(--text)]">{quote.advanceRequiredPct}%</strong></div>
                            {quote.contact && <div>Contact: {quote.contact}</div>}
                            {quote.deliverables && <div>Deliverables: {quote.deliverables}</div>}
                            {quote.pros && <div className="text-[var(--ok)]">Pros: {quote.pros}</div>}
                            {quote.cons && <div className="text-[var(--warn)]">Cons: {quote.cons}</div>}
                          </div>

                          {!isSelected && (
                            <button
                              type="button"
                              onClick={() => handleSelectWinningQuote(comp.category, quote)}
                              className="btn-secondary text-xs w-full py-1 h-8"
                            >
                              Select this quote
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
