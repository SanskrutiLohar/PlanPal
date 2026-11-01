import React, { useState, useEffect, useRef } from 'react';
import { usePageMeta } from '../hooks/usePageMeta.js';
import {
  ColourPalette,
  EventFormData,
  EventPlan,
  ExtractedEventSlots,
  SavedPlan,
  TimelineTask,
  UploadedPhoto,
} from '../types/plan.js';
import { getFallbackPlan } from '../data/fallbackPlans.js';
import { persistEvent } from '../lib/storage.js';
import { normalizeBudget } from '../lib/budgetCalculator.js';
import { IntelligentTimeline } from '../components/IntelligentTimeline.js';
import { ConversationalHero } from '../components/ConversationalHero.js';
import { ColourStudio } from '../components/ColourStudio.js';

const getLocalTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface PlanPageProps {
  onNavigate: (path: string) => void;
  initialPlanData?: SavedPlan | null;
}

export const PlanPage: React.FC<PlanPageProps> = ({ onNavigate, initialPlanData }) => {
  usePageMeta({
    title: 'AI Planner | PlanPal',
    description:
      'Tell PlanPal your event type, guests, city and budget in rupees. Get a full plan with AI Colour Studio that you can edit by chat.',
    canonicalPath: '/plan',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'AI Planner', url: '/plan' },
    ],
  });

  const [formData, setFormData] = useState<EventFormData>(() => {
    if (initialPlanData) {
      return initialPlanData.formData;
    }
    return {
      eventType: null,
      guestCount: null,
      budgetINR: null,
      date: null,
      city: null,
      notes: null,
      photos: [],
    };
  });

  const [savedEventId, setSavedEventId] = useState<string | null>(initialPlanData?.id || null);
  const [plan, setPlan] = useState<EventPlan | null>(() => {
    if (!initialPlanData?.plan) return null;
    return {
      ...initialPlanData.plan,
      colourPalette: initialPlanData.colourPalette || initialPlanData.plan.colourPalette,
      savedPalettes: initialPlanData.savedPalettes || initialPlanData.plan.savedPalettes,
    };
  });
  const [previousPlan, setPreviousPlan] = useState<EventPlan | null>(null);
  const [tasks, setTasks] = useState<TimelineTask[]>(() => {
    if (initialPlanData?.tasks && initialPlanData.tasks.length > 0) {
      return initialPlanData.tasks;
    }
    if (initialPlanData?.plan?.timeline) {
      return initialPlanData.plan.timeline.map((t, i) => ({
        id: 'task_' + i,
        when: t.when,
        task: t.task,
        category: 'General',
        priority: 'Normal',
        completed: Boolean((t as any).completed),
      }));
    }
    return [];
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [notification, setNotification] = useState<string>('');
  const [initialPrompt, setInitialPrompt] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('prompt') || null;
  });

  const sectionRefs = {
    summary: useRef<HTMLDivElement>(null),
    budget: useRef<HTMLDivElement>(null),
    colourStudio: useRef<HTMLDivElement>(null),
    timeline: useRef<HTMLDivElement>(null),
    vendors: useRef<HTMLDivElement>(null),
    itinerary: useRef<HTMLDivElement>(null),
    ideas: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    if (initialPlanData) {
      setSavedEventId(initialPlanData.id);
      setFormData(initialPlanData.formData);
      const restoredPlan = initialPlanData.plan
        ? {
            ...initialPlanData.plan,
            colourPalette: initialPlanData.colourPalette || initialPlanData.plan.colourPalette,
            savedPalettes: initialPlanData.savedPalettes || initialPlanData.plan.savedPalettes,
          }
        : null;
      setPlan(restoredPlan);

      if (initialPlanData.tasks && initialPlanData.tasks.length > 0) {
        setTasks(initialPlanData.tasks);
      } else if (initialPlanData.plan?.timeline) {
        setTasks(
          initialPlanData.plan.timeline.map((t, i) => ({
            id: 'task_' + i,
            when: t.when,
            task: t.task,
            category: 'General',
            priority: 'Normal',
            completed: Boolean((t as any).completed),
          }))
        );
      }
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const promptParam = params.get('prompt');
    if (promptParam) {
      setInitialPrompt(promptParam);
      window.history.replaceState({}, '', '/plan');
    }

    const typeParam = params.get('type');
    const cityParam = params.get('city');
    const guestsParam = params.get('guests');
    const budgetParam = params.get('budget');
    if (typeParam || cityParam || guestsParam || budgetParam) {
      setFormData((prev) => ({
        ...prev,
        eventType: typeParam
          ? typeParam.charAt(0).toUpperCase() + typeParam.slice(1)
          : prev.eventType,
        city: cityParam || prev.city,
        guestCount: guestsParam ? parseInt(guestsParam, 10) : prev.guestCount,
        budgetINR: budgetParam ? parseInt(budgetParam, 10) : prev.budgetINR,
      }));
    }
  }, [initialPlanData]);

  // Sync timeline tasks if newly generated
  useEffect(() => {
    if (plan && tasks.length === 0 && plan.timeline.length > 0) {
      setTasks(
        plan.timeline.map((t, idx) => ({
          id: 'task_' + idx,
          when: t.when,
          task: t.task,
          category: 'General',
          priority: idx < 2 ? 'High' : 'Normal',
          completed: false,
        }))
      );
    }
  }, [plan, tasks.length]);

  const compressImage = (file: File): Promise<UploadedPhoto> => {
    return new Promise((resolve, reject) => {
      if (file.size > 8 * 1024 * 1024) {
        reject(new Error(`File "${file.name}" exceeds the 8 MB limit.`));
        return;
      }
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        reject(new Error(`File "${file.name}" is not a supported image format. Use JPG, PNG or WebP only.`));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          const maxDim = 1280;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          let dataUrl = canvas.toDataURL('image/webp', 0.8);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          }

          const approxSizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);

          resolve({
            id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            dataUrl,
            name: file.name,
            sizeKb: approxSizeKb,
          });
        };
        img.onerror = () => reject(new Error(`Failed to load image "${file.name}".`));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error(`Failed to read file "${file.name}".`));
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMessage('');
    const currentPhotos = formData.photos || [];
    if (currentPhotos.length >= 4) {
      setErrorMessage('You can upload a maximum of 4 venue or theme photos.');
      e.target.value = '';
      return;
    }

    const remainingSlots = 4 - currentPhotos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      setNotification('Only the first ' + remainingSlots + ' photos were added to stay within the 4 image limit.');
      setTimeout(() => setNotification(''), 4000);
    }

    const newPhotos: UploadedPhoto[] = [];
    for (const file of filesToProcess) {
      try {
        const compressed = await compressImage(file);
        newPhotos.push(compressed);
      } catch (err: any) {
        setErrorMessage(err.message || 'Error processing reference image.');
      }
    }

    if (newPhotos.length > 0) {
      setFormData((prev) => ({
        ...prev,
        photos: [...(prev.photos || []), ...newPhotos],
      }));
    }

    e.target.value = '';
  };

  const handleRemovePhoto = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      photos: (prev.photos || []).filter((p) => p.id !== id),
    }));
  };

  const handleSlotsChange = (slots: ExtractedEventSlots) => {
    setFormData((prev) => ({
      ...prev,
      eventType: slots.eventType ?? prev.eventType,
      city: slots.city ?? prev.city,
      guestCount: slots.guestCount !== null && slots.guestCount !== undefined ? slots.guestCount : prev.guestCount,
      budgetINR: slots.budgetINR !== null && slots.budgetINR !== undefined ? slots.budgetINR : prev.budgetINR,
      date: slots.date ?? prev.date,
      notes: slots.notes ?? prev.notes,
    }));
  };

  const executePlanGeneration = async (data: EventFormData) => {
    if (!data.eventType || !data.city || !data.guestCount || !data.budgetINR) {
      setErrorMessage('Please provide an event type, city, guest count, and budget in rupees.');
      return;
    }

    setFormData(data);
    const localToday = getLocalTodayString();
    if (data.date && data.date.trim() !== '') {
      if (data.date < localToday) {
        setErrorMessage('Choose today or a later date.');
        return;
      }
    }
    setLoading(true);
    setStatusMessage('Generating comprehensive event plan with 100% budget math and AI Colour Studio...');
    setErrorMessage('');

    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'The plan could not be created. Check your connection and try again.');
      }

      const resData = await response.json();
      if (resData.plan) {
        resData.plan.budget = normalizeBudget(resData.plan.budget, data.budgetINR);
        setPlan(resData.plan);

        // Fetch intelligent timeline
        fetch('/api/timeline-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
          .then((res) => res.json())
          .then((td) => {
            if (td.success && Array.isArray(td.tasks)) {
              setTasks(td.tasks);
            }
          })
          .catch(() => {});

        // If this plan was already saved, auto-update the existing record
        if (savedEventId) {
          persistEvent({
            id: savedEventId,
            title: `${data.eventType} in ${data.city} (${data.guestCount} guests)`,
            formData: data,
            plan: resData.plan,
            colourPalette: resData.plan.colourPalette,
            savedPalettes: resData.plan.savedPalettes,
            expenses: [],
            tasks: [],
            vendorComparisons: [],
            createdAt: initialPlanData?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        }

        const uploadedCount = (data.photos || []).length;
        if (resData.plan.photoAnalysis && !resData.plan.photoAnalysis.isRelevant && uploadedCount > 0) {
          setErrorMessage('This photo does not look like a venue or theme reference. Try another.');
        } else if (resData.isFallback && resData.notice) {
          setNotification(resData.notice);
          setTimeout(() => setNotification(''), 5000);
        }
      } else {
        const fallback = getFallbackPlan(data);
        fallback.budget = normalizeBudget(fallback.budget, data.budgetINR);
        setPlan(fallback);
      }
    } catch (err: any) {
      const fallback = getFallbackPlan(data);
      fallback.budget = normalizeBudget(fallback.budget, data.budgetINR);
      setPlan(fallback);
      setErrorMessage(err.message || 'The plan could not be created from live servers. A complete regional template plan has been loaded below.');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleApplyPlanUpdate = (updatedPlan: EventPlan, updatedFormData?: Partial<EventFormData>) => {
    if (plan) {
      setPreviousPlan(JSON.parse(JSON.stringify(plan)));
    }

    const mergedFormData = updatedFormData ? { ...formData, ...updatedFormData } : formData;
    if (updatedFormData) {
      setFormData(mergedFormData);
    }
    updatedPlan.budget = normalizeBudget(updatedPlan.budget, Number(mergedFormData.budgetINR) || 0);
    setPlan(updatedPlan);
    setNotification('Plan updated with your adjustments.');
    setTimeout(() => setNotification(''), 4000);

    if (savedEventId) {
      persistEvent({
        id: savedEventId,
        title: `${mergedFormData.eventType || 'Event'} in ${mergedFormData.city || 'India'} (${mergedFormData.guestCount || 0} guests)`,
        formData: mergedFormData,
        plan: updatedPlan,
        colourPalette: updatedPlan.colourPalette,
        savedPalettes: updatedPlan.savedPalettes,
        expenses: [],
        tasks,
        vendorComparisons: [],
        createdAt: initialPlanData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }
  };

  const handleUndo = () => {
    if (!previousPlan) return;
    setPlan(previousPlan);
    setPreviousPlan(null);
    setNotification('Last change undone. Previous plan restored.');
    setTimeout(() => setNotification(''), 4000);
  };

  const handleSavePlan = async () => {
    if (!plan) return;
    try {
      const id = savedEventId || 'plan_' + Date.now();
      const title = `${formData.eventType || 'Event'} in ${formData.city || 'India'} (${formData.guestCount || 0} guests)`;
      const newPlan: SavedPlan = {
        id,
        createdAt: initialPlanData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title,
        formData,
        plan,
        colourPalette: plan.colourPalette,
        savedPalettes: plan.savedPalettes,
        expenses: [],
        tasks,
        vendorComparisons: [],
      };

      await persistEvent(newPlan);
      setSavedEventId(id);
      setNotification('Plan saved. Access anytime from My Plans.');
      setTimeout(() => setNotification(''), 4000);
    } catch {
      setNotification('Could not save plan.');
    }
  };

  const handleUpdateTasks = (newTasks: TimelineTask[]) => {
    setTasks(newTasks);
    if (savedEventId && plan) {
      persistEvent({
        id: savedEventId,
        title: `${formData.eventType || 'Event'} in ${formData.city || 'India'} (${formData.guestCount || 0} guests)`,
        formData,
        plan,
        colourPalette: plan.colourPalette,
        savedPalettes: plan.savedPalettes,
        expenses: [],
        tasks: newTasks,
        vendorComparisons: [],
        createdAt: initialPlanData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }
  };

  const handleCopyWhatsAppSummary = () => {
    if (!plan) return;
    const costPerGuest = formData.budgetINR && formData.guestCount ? Math.round(formData.budgetINR / Math.max(1, formData.guestCount)) : 0;
    const localToday = getLocalTodayString();
    let daysSummary = 'Date not specified';
    if (formData.date && formData.date.trim() !== '') {
      if (formData.date < localToday) {
        daysSummary = 'Event date has passed';
      } else {
        const diff = Math.ceil(
          (new Date(formData.date + 'T00:00:00').getTime() - new Date(localToday + 'T00:00:00').getTime()) /
          (1000 * 60 * 60 * 24)
        );
        daysSummary = `${diff} days left`;
      }
    }

    const lines: string[] = [
      `*PlanPal Event Plan: ${formData.eventType || 'Event'} in ${formData.city || 'India'}*`,
      `Target date: ${formData.date || 'Not specified'} (${daysSummary})`,
      `Headcount: ${formData.guestCount ? `${formData.guestCount} guests` : 'Not specified'}`,
      `Budget: INR ${(formData.budgetINR || 0).toLocaleString('en-IN')} (INR ${costPerGuest.toLocaleString('en-IN')} per guest)`,
      ``,
      `*Summary:*`,
      plan.summary,
      ``,
      `*Budget Breakdown:*`,
    ];

    plan.budget.forEach((item) => {
      const amountStr = item.amount
        ? `INR ${item.amount.toLocaleString('en-IN')}`
        : `${item.pct}%`;
      lines.push(`- ${item.item}: ${item.pct}% (${amountStr})`);
    });

    if (plan.colourPalette) {
      lines.push(``, `*Colour Palette: ${plan.colourPalette.name}*`);
      plan.colourPalette.colours.forEach((c) => {
        lines.push(`- ${c.name} (${c.hex}): ${c.application}`);
      });
    }

    lines.push(``, `*Key Vendors to Book:*`);
    plan.vendors.forEach((v) => {
      lines.push(`- [${v.done ? 'Booked' : 'Pending'}] ${v.name}`);
    });

    if (plan.itinerary && plan.itinerary.length > 0) {
      lines.push(``, `*Event Day Itinerary Highlights:*`);
      plan.itinerary.slice(0, 5).forEach((it) => {
        lines.push(`- [${it.time}] ${it.activity} (${it.location})`);
      });
    }

    const fullText = lines.join('\n');
    navigator.clipboard.writeText(fullText).then(() => {
      setNotification('Summary copied.');
      setTimeout(() => setNotification(''), 4000);
    });
  };

  // Calculations
  const localToday = getLocalTodayString();
  const daysLeft = formData.date && formData.date.trim() !== ''
    ? Math.ceil(
        (new Date(formData.date + 'T00:00:00').getTime() - new Date(localToday + 'T00:00:00').getTime()) /
        (1000 * 60 * 60 * 24)
      )
    : null;
  const isSoon = daysLeft !== null && daysLeft >= 0 && daysLeft < 14;
  const costPerGuest = formData.budgetINR && formData.guestCount
    ? Math.round(formData.budgetINR / Math.max(1, formData.guestCount))
    : null;

  const chartColors = [
    'var(--maroon)',
    'var(--brown)',
    'var(--tan)',
    'var(--sand)',
    'var(--surface-alt)',
    'var(--text-muted)',
  ];

  const scrollToSection = (key: keyof typeof sectionRefs) => {
    sectionRefs[key].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Filter distinct, non-repetitive ideas for presentation
  const distinctIdeas = (plan?.ideas || []).filter((idea, idx, self) => {
    return self.findIndex((i) => i.title.trim().toLowerCase() === idea.title.trim().toLowerCase()) === idx;
  });

  return (
    <div className="w-full">
      {/* Page Title Area */}
      <section className="page-title-band">
        <div className="max-w-[1040px] mx-auto px-4 sm:px-6">
          <h1 className="text-3xl font-serif text-[var(--brown)] mb-2">
            AI Planner
          </h1>
          <p className="text-[var(--text-muted)] text-sm sm:text-base max-w-2xl">
            Describe your event in chat to get a budget, timeline, AI Colour Studio palette and vendor checklist.
          </p>
        </div>
      </section>

      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 pb-12">
        {/* Conversational AI Hero (The Primary Chat Interface) */}
        <div className="mb-8">
          <ConversationalHero
            currentPlan={plan}
            formData={formData}
            isGenerating={loading}
            onGeneratePlan={executePlanGeneration}
            onApplyPlanUpdate={handleApplyPlanUpdate}
            onSavePlan={handleSavePlan}
            isSaved={Boolean(savedEventId)}
            onUndo={handleUndo}
            canUndo={Boolean(previousPlan)}
            onPhotoUpload={handlePhotoUpload}
            onRemovePhoto={handleRemovePhoto}
            photos={formData.photos || []}
            initialPrompt={initialPrompt}
            onSlotsChange={handleSlotsChange}
          />
        </div>

        {statusMessage && (
          <div className="card p-4 mb-8 bg-[var(--surface-alt)] border-[var(--border)] text-sm text-[var(--text)]">
            <div className="font-semibold text-[var(--brown)] mb-1">Status</div>
            <div>{statusMessage}</div>
          </div>
        )}

        {notification && (
          <div className="card p-4 mb-8 border-[var(--ok)] text-sm text-[var(--ok)] bg-[var(--surface)] font-semibold">
            {notification}
          </div>
        )}

        {errorMessage && (
          <div className="card p-4 mb-8 border-[var(--warn)] text-sm text-[var(--warn)] bg-[var(--surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>{errorMessage}</div>
            {formData.eventType && formData.city && formData.guestCount && formData.budgetINR && (
              <button
                type="button"
                onClick={() => executePlanGeneration(formData)}
                className="btn-secondary btn-small self-start sm:self-auto text-xs font-semibold whitespace-nowrap min-h-[44px]"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Loading state indicator */}
        {loading && (
          <div className="card p-8 mb-8 text-center bg-[var(--surface)] border border-[var(--border)]">
            <div className="inline-block w-8 h-8 rounded-full border-2 border-[var(--maroon)] border-t-transparent animate-spin mb-3"></div>
            <div className="font-serif text-lg font-semibold text-[var(--brown)]">Preparing your event plan...</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{statusMessage || 'Balancing budget math, crafting Colour Studio palette and structuring schedule...'}</div>
          </div>
        )}

        {/* Results View: single scrolling page */}
        {plan && (
          <div className="space-y-10">
            {isSoon && (
              <div className="card p-4 border-[var(--warn)] text-sm text-[var(--brown)] bg-[var(--surface-alt)] font-semibold">
                This event is soon. Some timeline steps may need to happen at once.
              </div>
            )}

            {/* Section Index */}
            <nav className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-[6px] bg-[var(--surface-alt)] border border-[var(--border)] sticky top-20 z-20 shadow-xs" aria-label="Plan sections">
              {[
                { key: 'summary' as const, label: 'Summary' },
                { key: 'budget' as const, label: 'Budget' },
                { key: 'colourStudio' as const, label: 'Colour Studio' },
                { key: 'timeline' as const, label: 'Timeline' },
                { key: 'vendors' as const, label: 'Vendor checklist' },
                { key: 'itinerary' as const, label: 'Itinerary' },
                { key: 'ideas' as const, label: 'Recommendations' },
              ].map((sec) => (
                <button
                  key={sec.key}
                  type="button"
                  onClick={() => scrollToSection(sec.key)}
                  className="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-[4px] text-[var(--text)] hover:text-[var(--maroon)] hover:bg-[var(--surface)] transition-colors duration-150 cursor-pointer min-h-[44px] flex items-center"
                >
                  {sec.label}
                </button>
              ))}
            </nav>

            {/* Summary section */}
            <div ref={sectionRefs.summary}>
              <div className="card p-6 bg-[var(--surface-alt)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    {formData.eventType && <span className="tag mb-2">{formData.eventType}</span>}
                    <h2 className="text-2xl font-serif text-[var(--brown)]">
                      Plan summary
                    </h2>
                  </div>
                  {/* Action row: Copy summary (Save plan is in the primary chat header) */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCopyWhatsAppSummary}
                      className="btn-secondary btn-small min-h-[44px]"
                    >
                      Copy summary
                    </button>
                  </div>
                </div>

                {/* Realistic Budget Warning Notice */}
                {plan.realism?.isUnrealistic && (
                  <div className="p-3.5 mb-4 rounded border-2 border-[var(--warn)] bg-[var(--surface)] text-xs space-y-2">
                    <div className="font-bold text-[var(--warn)] uppercase tracking-wider">
                      Budget Benchmark Notice
                    </div>
                    <p className="text-[var(--text)] font-semibold">
                      {plan.realism.warning}
                    </p>
                    <div className="p-2 rounded bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--text)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span>{plan.realism.reducedPlanOffer}</span>
                      {plan.realism.recommendedGuestCount && (
                        <button
                          type="button"
                          onClick={() => {
                            if (plan.realism?.recommendedGuestCount) {
                              const updatedData: EventFormData = {
                                ...formData,
                                guestCount: plan.realism.recommendedGuestCount,
                              };
                              setFormData(updatedData);
                              executePlanGeneration(updatedData);
                            }
                          }}
                          className="btn-secondary btn-small whitespace-nowrap text-xs min-h-[44px]"
                        >
                          Adjust to {plan.realism.recommendedGuestCount} guests
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Explicit Assumptions List */}
                {plan.assumptions && plan.assumptions.length > 0 && (
                  <div className="p-3 mb-4 rounded bg-[var(--surface)] border border-[var(--border)] text-xs">
                    <span className="font-semibold text-[var(--brown)] block mb-1">
                      Planning assumptions used:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-[var(--text-muted)]">
                      {plan.assumptions.map((assump, idx) => (
                        <li key={idx}>{assump}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-[var(--text)] leading-relaxed">
                  {plan.summary}
                </p>
              </div>
            </div>

            {/* "What was sent to the AI" panel */}
            <details className="card p-5 bg-[var(--surface)] border border-[var(--border)]">
              <summary className="font-semibold text-sm text-[var(--brown)] cursor-pointer select-none">
                What was sent to the AI
              </summary>
              <div className="pt-4 mt-3 border-t border-[var(--border)] text-xs text-[var(--text)] space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="font-semibold text-[var(--text-muted)] block">Event type</span>
                    {formData.eventType}
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--text-muted)] block">Headcount</span>
                    {formData.guestCount} guests
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--text-muted)] block">Budget</span>
                    ₹{Number(formData.budgetINR).toLocaleString('en-IN')}
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--text-muted)] block">City and Date</span>
                    {formData.city} on {formData.date}
                  </div>
                </div>

                {formData.notes && (
                  <div>
                    <span className="font-semibold text-[var(--text-muted)] block">Custom notes</span>
                    <p className="text-[var(--text)]">{formData.notes}</p>
                  </div>
                )}

                <div>
                  <span className="font-semibold text-[var(--text-muted)] block">Reference photos submitted</span>
                  <p className="text-[var(--text)]">
                    {plan.photosCount && plan.photosCount > 0
                      ? `${plan.photosCount} venue reference photo(s) analyzed (compressed in browser)`
                      : '0 venue reference photos attached'}
                  </p>
                </div>

                {plan.photoAnalysis && plan.photoAnalysis.isRelevant && (
                  <div className="p-3 rounded bg-[var(--surface-alt)] border border-[var(--border)] space-y-1.5">
                    <span className="font-semibold text-[var(--brown)] block">Photo analysis summary</span>
                    <div><strong className="text-[var(--text-muted)]">Setting:</strong> {plan.photoAnalysis.setting}</div>
                    <div><strong className="text-[var(--text-muted)]">Colors:</strong> {plan.photoAnalysis.colors}</div>
                    <div><strong className="text-[var(--text-muted)]">Style:</strong> {plan.photoAnalysis.style}</div>
                    <div><strong className="text-[var(--text-muted)]">Space notes:</strong> {plan.photoAnalysis.spaceNotes}</div>
                  </div>
                )}
              </div>
            </details>

            {/* Budget allocation */}
            <div ref={sectionRefs.budget}>
              <section className="card-result p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
                  <div>
                    <h2 className="text-2xl font-serif text-[var(--brown)] mb-1">
                      Budget allocation
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">
                      Total estimated budget: ₹{Number(formData.budgetINR).toLocaleString('en-IN')} (All percentages sum to 100%)
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs sm:text-sm">
                    <div className="p-2.5 px-3 rounded bg-[var(--surface-alt)] border border-[var(--border)]">
                      <span className="text-[var(--text-muted)] block text-xs">Days left</span>
                      <span className="font-semibold text-[var(--brown)] tabular-nums">
                        {!formData.date
                          ? 'No date set'
                          : daysLeft !== null && daysLeft >= 0
                            ? `${daysLeft} days`
                            : 'Event date has passed'}
                      </span>
                    </div>
                    <div className="p-2.5 px-3 rounded bg-[var(--surface-alt)] border border-[var(--border)]">
                      <span className="text-[var(--text-muted)] block text-xs">Cost per guest</span>
                      <span className="font-semibold text-[var(--maroon)] tabular-nums">
                        {costPerGuest !== null ? `₹${costPerGuest.toLocaleString('en-IN')}` : 'Not calculated'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Horizontal stacked bar chart */}
                <div className="mb-6">
                  <div className="h-4 w-full flex rounded overflow-hidden border border-[var(--border)]">
                    {plan.budget.map((item, idx) => (
                      <div
                        key={item.item + idx}
                        style={{
                          width: `${item.pct}%`,
                          backgroundColor: chartColors[idx % chartColors.length],
                        }}
                        title={`${item.item}: ${item.pct}%`}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
                    {plan.budget.map((item, idx) => {
                      const rowAmount =
                        item.amount || Math.round((item.pct / 100) * (formData.budgetINR || 0));
                      return (
                        <div key={'legend-' + item.item + idx} className="flex items-center gap-1.5">
                          <span
                            className="inline-block w-3 h-3 rounded-sm"
                            style={{ backgroundColor: chartColors[idx % chartColors.length] }}
                          />
                          <span className="text-[var(--text)] font-semibold">{item.item}</span>
                          <span className="text-[var(--text-muted)] tabular-nums">
                            ({item.pct}% - ₹{rowAmount.toLocaleString('en-IN')})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Budget Table with zebra stripes */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border border-[var(--border)]">
                    <thead>
                      <tr className="bg-[var(--surface-alt)] border-b border-[var(--border)] text-[var(--brown)]">
                        <th className="p-3 font-semibold">Category</th>
                        <th className="p-3 font-semibold text-right">Share</th>
                        <th className="p-3 font-semibold text-right">Estimated cost</th>
                        <th className="p-3 font-semibold">Planning tip</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.budget.map((row, idx) => {
                        const rowAmount =
                          row.amount || Math.round((row.pct / 100) * (formData.budgetINR || 0));
                        const isEven = idx % 2 === 0;
                        return (
                          <tr
                            key={row.item + idx}
                            className={`border-b border-[var(--border)] ${
                              isEven ? 'bg-[var(--surface)]' : 'bg-[var(--surface-alt)]'
                            }`}
                          >
                            <td className="p-3 font-semibold text-[var(--text)]">{row.item}</td>
                            <td className="p-3 text-right tabular-nums font-semibold text-[var(--brown)]">
                              {row.pct}%
                            </td>
                            <td className="p-3 text-right tabular-nums text-[var(--maroon)] font-semibold">
                              ₹{rowAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="p-3 text-[var(--text-muted)] text-xs leading-normal">
                              {row.tip}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* AI Colour Studio */}
            <div ref={sectionRefs.colourStudio}>
              <ColourStudio
                initialPalette={plan.colourPalette}
                formData={formData}
                themeName={plan.visualInspiration?.themeName}
                savedPalettes={plan.savedPalettes}
                onPaletteChange={(newPalette) => {
                  setPlan((prev) => (prev ? { ...prev, colourPalette: newPalette } : null));
                }}
                onSavePalette={(savedPalette) => {
                  setPlan((prev) => {
                    if (!prev) return null;
                    const currentSaved = prev.savedPalettes || [];
                    const exists = currentSaved.some((p) => p.name === savedPalette.name);
                    const nextSaved = exists ? currentSaved : [...currentSaved, savedPalette];
                    const nextPlan = { ...prev, colourPalette: savedPalette, savedPalettes: nextSaved };
                    if (savedEventId) {
                      persistEvent({
                        id: savedEventId,
                        title: `${formData.eventType || 'Event'} in ${formData.city || 'India'} (${formData.guestCount || 0} guests)`,
                        formData,
                        plan: nextPlan,
                        colourPalette: savedPalette,
                        savedPalettes: nextSaved,
                        createdAt: initialPlanData?.createdAt || new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      }).catch(() => {});
                    }
                    return nextPlan;
                  });
                }}
              />
            </div>

            {/* Timeline */}
            <div ref={sectionRefs.timeline}>
              <section className="card-result p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-serif text-[var(--brown)] mb-1">
                    Preparation timeline
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Prioritized milestones leading up to your event date with deadline management.
                  </p>
                </div>

                <IntelligentTimeline
                  tasks={tasks}
                  formData={formData}
                  onUpdateTasks={handleUpdateTasks}
                />
              </section>
            </div>

            {/* Vendor checklist */}
            <div ref={sectionRefs.vendors}>
              <section className="card-result p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-serif text-[var(--brown)] mb-1">
                    Vendor checklist
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Recommended vendors to book for your event.
                  </p>
                </div>

                <div className="space-y-3">
                  {plan.vendors.map((v, idx) => (
                    <div
                      key={v.name + idx}
                      className="p-4 rounded border border-[var(--border)] bg-[var(--surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${v.done ? 'bg-[var(--ok)]' : 'bg-[var(--text-muted)]'}`} />
                          <span className="font-semibold text-sm text-[var(--text)]">{v.name}</span>
                          <span className="text-xs text-[var(--text-muted)]">{v.done ? 'Booked' : 'Pending'}</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{v.why}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Itinerary */}
            <div ref={sectionRefs.itinerary}>
              <section className="card-result p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-serif text-[var(--brown)] mb-1">
                    Event day itinerary
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Hour-by-hour schedule covering key milestones{formData.date ? ` on ${formData.date}` : ''}.
                  </p>
                </div>

                {/* "What the AI saw in your photos" card */}
                {plan.photoAnalysis && plan.photoAnalysis.isRelevant && (plan.photosCount || 0) > 0 && (
                  <div className="card p-5 mb-6 bg-[var(--surface-alt)] border border-[var(--border)]">
                    <div className="text-xs font-semibold text-[var(--brown)] uppercase tracking-wider mb-2">
                      What the AI saw in your photos
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[var(--text)]">
                      <div>
                        <span className="font-semibold text-[var(--brown)] block">Setting</span>
                        <p className="text-[var(--text-muted)]">{plan.photoAnalysis.setting}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-[var(--brown)] block">Color palette</span>
                        <p className="text-[var(--text-muted)]">{plan.photoAnalysis.colors}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-[var(--brown)] block">Decor style</span>
                        <p className="text-[var(--text-muted)]">{plan.photoAnalysis.style}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-[var(--brown)] block">Space layout notes</span>
                        <p className="text-[var(--text-muted)]">{plan.photoAnalysis.spaceNotes}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Vertical itinerary schedule */}
                <ol className="space-y-4">
                  {plan.itinerary.map((item, idx) => (
                    <li
                      key={item.time + idx}
                      className="p-4 rounded border border-[var(--border)] bg-[var(--surface)] flex flex-col sm:flex-row sm:items-start gap-4"
                    >
                      <div className="sm:w-36 shrink-0">
                        <span className="tabular-nums font-semibold text-sm text-[var(--maroon)] block">
                          {item.time}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] block mt-0.5">
                          {item.location}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-base text-[var(--text)] mb-1">
                          {item.activity}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                          <strong className="text-[var(--brown)] font-semibold">Decor and atmosphere:</strong> {item.decorNote}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            {/* Cultural and Logistical Recommendations */}
            <div ref={sectionRefs.ideas}>
              <section className="card-result p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-serif text-[var(--brown)] mb-1">
                    Cultural and logistical recommendations
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Concise, practical recommendations for regional hospitality, guest comfort, and on-site logistics.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {distinctIdeas.map((idea, idx) => {
                    const titleLower = idea.title.toLowerCase();
                    let badge = 'Logistics';
                    if (titleLower.includes('cultural') || titleLower.includes('ritual') || titleLower.includes('tradition') || titleLower.includes('blessing')) {
                      badge = 'Cultural Tradition';
                    } else if (titleLower.includes('guest') || titleLower.includes('hospitality') || titleLower.includes('welcome') || titleLower.includes('food') || titleLower.includes('dining')) {
                      badge = 'Guest Hospitality';
                    } else if (titleLower.includes('vendor') || titleLower.includes('timeline') || titleLower.includes('power') || titleLower.includes('sound') || titleLower.includes('setup')) {
                      badge = 'Execution & Timing';
                    }

                    return (
                      <div key={idea.title + idx} className="card p-5 bg-[var(--surface)] flex flex-col justify-between border border-[var(--border)] hover:border-[var(--brown)] transition-colors">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--surface-alt)] text-[var(--brown)] border border-[var(--border)]">
                              {badge}
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)] font-mono">
                              #{idx + 1}
                            </span>
                          </div>
                          <h3 className="text-base font-serif text-[var(--brown)] mb-2 font-semibold leading-snug">
                            {idea.title}
                          </h3>
                          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                            {idea.detail}
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
                          Practical on-site guideline
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
