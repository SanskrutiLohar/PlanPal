import React, { useState, useEffect, useRef } from 'react';
import { usePageMeta } from '../hooks/usePageMeta.js';
import {
  AIProposedChange,
  EventFormData,
  EventPlan,
  ExpenseItem,
  SavedPlan,
  TimelineTask,
  UploadedPhoto,
  VendorComparison,
  VendorItem,
} from '../types/plan.js';
import { getFallbackPlan } from '../data/fallbackPlans.js';
import { persistEvent } from '../lib/storage.js';
import { normalizeBudget } from '../lib/budgetCalculator.js';
import { EventDashboard } from '../components/EventDashboard.js';
import { ExpenseTracker } from '../components/ExpenseTracker.js';
import { VendorManager } from '../components/VendorManager.js';
import { IntelligentTimeline } from '../components/IntelligentTimeline.js';
import { AIAssistantChat } from '../components/AIAssistantChat.js';
import { ConversationalHero } from '../components/ConversationalHero.js';
import { SideWorkspaceSheet } from '../components/SideWorkspaceSheet.js';

const getLocalTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDaysToLocalToday = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface PlanPageProps {
  onNavigate: (path: string) => void;
  initialPlanData?: SavedPlan | null;
}

export const PlanPage: React.FC<PlanPageProps> = ({ onNavigate, initialPlanData }) => {
  usePageMeta({
    title: 'Plan an Event | PlanPal',
    description:
      'Tell PlanPal your event type, guests, city and budget in rupees. Get a full plan you can edit by chat and save for later.',
    canonicalPath: '/plan',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Plan an event', url: '/plan' },
    ],
  });

  const [formData, setFormData] = useState<EventFormData>({
    eventType: null,
    guestCount: null,
    budgetINR: null,
    date: null,
    city: null,
    notes: null,
    photos: [],
  });

  const [dateError, setDateError] = useState<string>('');
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [savedEventId, setSavedEventId] = useState<string | null>(null);
  const [plan, setPlan] = useState<EventPlan | null>(null);
  const [previousPlan, setPreviousPlan] = useState<EventPlan | null>(null);
  const [pageProposal, setPageProposal] = useState<AIProposedChange | null>(null);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [vendorComparisons, setVendorComparisons] = useState<VendorComparison[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [refineText, setRefineText] = useState<string>('');
  const [refining, setRefining] = useState<boolean>(false);
  const [notification, setNotification] = useState<string>('');
  const [vendorQuestions, setVendorQuestions] = useState<Record<number, string[]>>({});
  const [loadingQuestionsIdx, setLoadingQuestionsIdx] = useState<number | null>(null);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<
    'all' | 'dashboard' | 'budget' | 'expenses' | 'vendors' | 'timeline' | 'itinerary' | 'ideas' | 'ai-advisor'
  >('all');

  useEffect(() => {
    if (initialPlanData) {
      setSavedEventId(initialPlanData.id);
      setFormData(initialPlanData.formData);
      setPlan(initialPlanData.plan);
      setExpenses(initialPlanData.expenses || []);
      setVendorComparisons(initialPlanData.vendorComparisons || []);

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
    const typeParam = params.get('type');
    const cityParam = params.get('city');
    const guestsParam = params.get('guests');
    const budgetParam = params.get('budget');

    const promptParam = params.get('prompt');
    if (promptParam) {
      fetch('/api/chat-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: promptParam }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.slots) {
            const nextForm: EventFormData = {
              eventType: d.slots.eventType ?? null,
              city: d.slots.city ?? null,
              guestCount: d.slots.guestCount !== undefined ? d.slots.guestCount : null,
              budgetINR: d.slots.budgetINR !== undefined ? d.slots.budgetINR : null,
              date: d.slots.date ?? null,
              notes: d.slots.notes ?? null,
            };
            setFormData(nextForm);
            if (d.isReady && nextForm.eventType && nextForm.city && nextForm.guestCount && nextForm.budgetINR) {
              executePlanGeneration(nextForm);
            }
          }
        })
        .catch(() => {});
    }

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

  const handlePreset = (presetName: string) => {
    setErrorMessage('');
    setDateError('');
    if (presetName === 'wedding') {
      setFormData((prev) => ({
        ...prev,
        eventType: 'Wedding',
        guestCount: 250,
        budgetINR: 1500000,
        date: addDaysToLocalToday(60),
        city: 'Delhi',
        notes: 'North Indian vegetarian banquet, outdoor sangeet and traditional ceremony.',
      }));
    } else if (presetName === 'birthday') {
      setFormData((prev) => ({
        ...prev,
        eventType: 'Birthday',
        guestCount: 60,
        budgetINR: 120000,
        date: addDaysToLocalToday(30),
        city: 'Mumbai',
        notes: 'Kids play area, afternoon tea and cake, return gifts for 20 children.',
      }));
    } else if (presetName === 'community') {
      setFormData((prev) => ({
        ...prev,
        eventType: 'Community Event',
        guestCount: 150,
        budgetINR: 250000,
        date: addDaysToLocalToday(14),
        city: 'Bengaluru',
        notes:
          'Neighbourhood box cricket and badminton tournament with hydration stalls and evening prize distribution.',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.eventType || !formData.city || !formData.guestCount || !formData.budgetINR) {
      setErrorMessage('Please provide an event type, city, guest count, and budget in rupees.');
      return;
    }

    // Client-side date validation in user local time
    const localToday = getLocalTodayString();
    if (formData.date && formData.date.trim() !== '') {
      if (formData.date < localToday) {
        setDateError('Choose today or a later date.');
        dateInputRef.current?.focus();
        return;
      }
    }
    setDateError('');

    setLoading(true);
    setErrorMessage('');
    setNotification('');
    setStatusMessage('Consulting event planning guidelines, analyzing venue photos and estimating costs in rupees...');

    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = errData.error || 'The plan could not be created. Check your connection and try again.';
        if (response.status === 400 && msg.includes('date')) {
          setDateError(msg);
          dateInputRef.current?.focus();
        } else {
          setErrorMessage(msg);
        }
        setLoading(false);
        setStatusMessage('');
        return;
      }

      const data = await response.json();

      if (data.plan) {
        // Enforce 100% budget normalization with deterministic remainder rule
        data.plan.budget = normalizeBudget(data.plan.budget, formData.budgetINR);
        setPlan(data.plan);

        // Fetch intelligent timeline
        fetch('/api/timeline-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
          .then((res) => res.json())
          .then((resData) => {
            if (resData.success && Array.isArray(resData.tasks)) {
              setTasks(resData.tasks);
            }
          })
          .catch(() => {});

        const uploadedCount = (formData.photos || []).length;
        if (data.plan.photoAnalysis && !data.plan.photoAnalysis.isRelevant && uploadedCount > 0) {
          setErrorMessage('This photo does not look like a venue or theme reference. Try another.');
        } else if (data.isFallback && data.notice) {
          setNotification(data.notice);
          setTimeout(() => setNotification(''), 5000);
        }
      } else {
        const fallback = getFallbackPlan(formData);
        const total = formData.budgetINR;
        setPlan({
          ...fallback,
          budget: normalizeBudget(fallback.budget, total),
        });
      }
    } catch {
      const fallback = getFallbackPlan(formData);
      const total = formData.budgetINR || 0;
      setPlan({
        ...fallback,
        budget: normalizeBudget(fallback.budget, total),
      });
      setErrorMessage(
        'The plan could not be created from live servers. A complete regional template plan has been loaded below.'
      );
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
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
        setDateError('Choose today or a later date.');
        return;
      }
    }
    setDateError('');
    setLoading(true);
    setStatusMessage('Generating comprehensive event plan with 100% budget math...');
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

        const eventId = savedEventId || 'plan_' + Date.now();
        setSavedEventId(eventId);
        persistEvent({
          id: eventId,
          title: `${data.eventType} in ${data.city} (${data.guestCount} guests)`,
          formData: data,
          plan: resData.plan,
          expenses: [],
          tasks: [],
          vendorComparisons: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).catch(() => {});

        if (resData.isFallback && resData.notice) {
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
    setPageProposal(null);
    setNotification('Plan updated with your adjustments.');
    setTimeout(() => setNotification(''), 4000);

    if (savedEventId) {
      persistEvent({
        id: savedEventId,
        title: `${mergedFormData.eventType || 'Event'} in ${mergedFormData.city || 'India'} (${mergedFormData.guestCount || 0} guests)`,
        formData: mergedFormData,
        plan: updatedPlan,
        expenses,
        tasks,
        vendorComparisons,
        createdAt: initialPlanData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }
  };

  const handleUndo = () => {
    if (!previousPlan) return;
    setPlan(previousPlan);
    setPreviousPlan(null);
    setPageProposal(null);
    setNotification('Last change undone. Previous plan restored.');
    setTimeout(() => setNotification(''), 4000);
  };

  const handleUpdateEventFromWorkspace = (updated: SavedPlan) => {
    setPlan(updated.plan);
    setFormData(updated.formData);
    setExpenses(updated.expenses || []);
    setTasks(updated.tasks || []);
    setVendorComparisons(updated.vendorComparisons || []);
    persistEvent(updated).catch(() => {});
  };

  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refineText.trim() || !plan) return;

    setRefining(true);
    setStatusMessage('Evaluating modification and preparing before and after proposal...');
    setErrorMessage('');

    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPlan: plan,
          instruction: refineText.trim(),
          eventDetails: formData,
        }),
      });

      if (!response.ok) {
        throw new Error('Refinement request failed');
      }

      const data = await response.json();
      if (data.proposal) {
        setPageProposal(data.proposal);
        setRefineText('');
      } else if (data.plan) {
        setPageProposal({
          id: `prop_${Date.now()}`,
          title: 'Proposed Plan Revision',
          explanation: refineText.trim(),
          impactSummary: data.plan.summary,
          updatedPlan: data.plan,
        });
        setRefineText('');
      }
    } catch {
      setErrorMessage('The plan modification could not be prepared. Check your connection and try again.');
    } finally {
      setRefining(false);
      setStatusMessage('');
    }
  };

  const handleSavePlan = async () => {
    if (!plan) return;
    try {
      const id = savedEventId || 'plan_' + Date.now();
      const title = `${formData.eventType} in ${formData.city} (${formData.guestCount} guests)`;
      const newPlan: SavedPlan = {
        id,
        createdAt: initialPlanData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title,
        formData,
        plan,
        expenses,
        tasks,
        vendorComparisons,
      };

      await persistEvent(newPlan);
      setSavedEventId(id);
      setNotification('Plan, expenses, and milestones successfully saved to database. Access anytime from My events.');
      setTimeout(() => setNotification(''), 4000);
    } catch {
      setNotification('Could not save plan.');
    }
  };

  const handleUpdateExpenses = (newExpenses: ExpenseItem[]) => {
    setExpenses(newExpenses);
    if (savedEventId && plan) {
      persistEvent({
        id: savedEventId,
        title: `${formData.eventType} in ${formData.city} (${formData.guestCount} guests)`,
        formData,
        plan,
        expenses: newExpenses,
        tasks,
        vendorComparisons,
        createdAt: initialPlanData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }
  };

  const handleUpdateVendors = (newVendors: VendorItem[]) => {
    if (!plan) return;
    const updatedPlan: EventPlan = {
      ...plan,
      vendors: newVendors,
    };
    setPlan(updatedPlan);

    if (savedEventId) {
      persistEvent({
        id: savedEventId,
        title: `${formData.eventType} in ${formData.city} (${formData.guestCount} guests)`,
        formData,
        plan: updatedPlan,
        expenses,
        tasks,
        vendorComparisons,
        createdAt: initialPlanData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }
  };

  const handleUpdateTasks = (newTasks: TimelineTask[]) => {
    setTasks(newTasks);
    if (savedEventId && plan) {
      persistEvent({
        id: savedEventId,
        title: `${formData.eventType} in ${formData.city} (${formData.guestCount} guests)`,
        formData,
        plan,
        expenses,
        tasks: newTasks,
        vendorComparisons,
        createdAt: initialPlanData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }
  };

  const handleUpdateComparisons = (newComparisons: VendorComparison[]) => {
    setVendorComparisons(newComparisons);
    if (savedEventId && plan) {
      persistEvent({
        id: savedEventId,
        title: `${formData.eventType} in ${formData.city} (${formData.guestCount} guests)`,
        formData,
        plan,
        expenses,
        tasks,
        vendorComparisons: newComparisons,
        createdAt: initialPlanData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }
  };

  const handleApplyProposedChange = async (proposal: AIProposedChange) => {
    let nextPlan = plan ? { ...plan } : null;
    let nextFormData = { ...formData };

    if (proposal.updatedPlan && nextPlan) {
      nextPlan = { ...nextPlan, ...proposal.updatedPlan };
      if (nextPlan.budget) {
        nextPlan.budget = normalizeBudget(nextPlan.budget, Number(nextFormData.budgetINR) || 0);
      }
      setPlan(nextPlan);
    }

    if (proposal.updatedFormData) {
      nextFormData = { ...nextFormData, ...proposal.updatedFormData };
      setFormData(nextFormData);
    }

    if (savedEventId && nextPlan) {
      await persistEvent({
        id: savedEventId,
        title: `${nextFormData.eventType || 'Event'} in ${nextFormData.city || 'India'} (${nextFormData.guestCount || 0} guests)`,
        formData: nextFormData,
        plan: nextPlan,
        expenses,
        tasks,
        vendorComparisons,
        createdAt: initialPlanData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    setNotification('Approved adjustments applied to your plan.');
    setTimeout(() => setNotification(''), 4000);
  };

  const handleFetchVendorQuestions = async (vendorName: string, vendorWhy: string, index: number) => {
    if (vendorQuestions[index]) return;

    setLoadingQuestionsIdx(index);
    try {
      const response = await fetch('/api/vendor-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName,
          vendorWhy,
          eventType: formData.eventType,
          city: formData.city,
        }),
      });
      const data = await response.json();
      if (data.questions && Array.isArray(data.questions)) {
        setVendorQuestions((prev) => ({ ...prev, [index]: data.questions }));
      }
    } catch {
      // Ignore error
    } finally {
      setLoadingQuestionsIdx(null);
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
      setNotification('Summary copied for WhatsApp.');
      setTimeout(() => setNotification(''), 4000);
    });
  };

  const handleDownloadPDF = () => {
    window.print();
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

  // Chart colors strictly from section 5
  const chartColors = [
    'var(--maroon)',
    'var(--brown)',
    'var(--tan)',
    'var(--sand)',
    'var(--surface-alt)',
    'var(--text-muted)',
  ];

  const currentEventSnapshot: SavedPlan = {
    id: savedEventId || 'temp_event',
    title: `${formData.eventType} in ${formData.city} (${formData.guestCount} guests)`,
    formData,
    plan: plan || getFallbackPlan(formData),
    expenses,
    tasks,
    vendorComparisons,
    createdAt: new Date().toISOString(),
  };

  return (
    <div className="w-full">
      {/* Page Title Area */}
      <section className="page-title-band">
        <div className="max-w-[1040px] mx-auto px-4 sm:px-6">
          <h1 className="text-3xl font-serif text-[var(--brown)] mb-2">
            Plan an event
          </h1>
          <p className="text-[var(--text-muted)] text-sm sm:text-base max-w-2xl">
            Provide your event parameters in Indian rupees to generate a tailored budget, milestone timeline, vendor checklist, reference photo analysis and day itinerary.
          </p>
        </div>
      </section>

      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 pb-12">
        {/* Conversational AI Hero (Primary Interface) */}
        <div className="mb-8">
          <ConversationalHero
            currentPlan={plan}
            formData={formData}
            isGenerating={loading}
            onGeneratePlan={executePlanGeneration}
            onApplyPlanUpdate={handleApplyPlanUpdate}
            onOpenWorkspace={() => setIsWorkspaceOpen(true)}
            onSavePlan={handleSavePlan}
            isSaved={Boolean(savedEventId)}
            onUndo={handleUndo}
            canUndo={Boolean(previousPlan)}
          />
        </div>

        {/* Collapsible Manual Settings, Presets & Photo Uploads (Optional) */}
        <details className="card p-4 mb-8 bg-[var(--surface-alt)] border-[var(--border)]">
          <summary className="font-semibold text-xs text-[var(--brown)] cursor-pointer uppercase tracking-wider select-none">
            Advanced Settings: Manual Form Inputs, Presets & Venue Photos
          </summary>
          <div className="pt-4 mt-3 border-t border-[var(--border)]">
            {/* Preset selection bar */}
        <div className="mb-6 card p-4 bg-[var(--surface-alt)]">
          <div className="text-xs font-semibold text-[var(--brown)] uppercase tracking-wider mb-2">
            Sample presets
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handlePreset('wedding')}
              className="btn-secondary btn-small bg-[var(--surface)] text-xs sm:text-sm"
            >
              Delhi wedding for 250
            </button>
            <button
              type="button"
              onClick={() => handlePreset('birthday')}
              className="btn-secondary btn-small bg-[var(--surface)] text-xs sm:text-sm"
            >
              Mumbai 1st birthday for 60
            </button>
            <button
              type="button"
              onClick={() => handlePreset('community')}
              className="btn-secondary btn-small bg-[var(--surface)] text-xs sm:text-sm"
            >
              Bengaluru community sports fest for 150
            </button>
          </div>
        </div>

        {/* Main input form */}
        <form onSubmit={handleSubmit} className="card p-6 mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-5">
            <div>
              <label htmlFor="eventType" className="block text-sm font-semibold text-[var(--text)] mb-1">
                Event type
              </label>
              <input
                id="eventType"
                type="text"
                required
                value={formData.eventType || ''}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                className="form-input"
                placeholder="e.g. Wedding, Birthday, Community event"
              />
            </div>

            <div>
              <label htmlFor="guestCount" className="block text-sm font-semibold text-[var(--text)] mb-1">
                Guest count
              </label>
              <input
                id="guestCount"
                type="number"
                min="5"
                max="10000"
                required
                value={formData.guestCount !== null && formData.guestCount !== undefined ? formData.guestCount : ''}
                onChange={(e) =>
                  setFormData({ ...formData, guestCount: parseInt(e.target.value, 10) || null })
                }
                className="form-input tabular-nums"
                placeholder="e.g. 50"
              />
            </div>

            <div>
              <label htmlFor="budgetINR" className="block text-sm font-semibold text-[var(--text)] mb-1">
                Budget in INR
              </label>
              <input
                id="budgetINR"
                type="number"
                min="1000"
                step="1000"
                required
                value={formData.budgetINR !== null && formData.budgetINR !== undefined ? formData.budgetINR : ''}
                onChange={(e) =>
                  setFormData({ ...formData, budgetINR: parseInt(e.target.value, 10) || null })
                }
                className="form-input tabular-nums"
                placeholder="e.g. 40000"
              />
              <div className="text-xs text-[var(--text-muted)] mt-1">
                {formData.budgetINR ? `₹${Number(formData.budgetINR).toLocaleString('en-IN')}` : 'Enter total budget'}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="date" className="block text-sm font-semibold text-[var(--text)]">
                  Target date
                </label>
                <span className="text-xs text-[var(--text-muted)]">Optional</span>
              </div>
              <input
                ref={dateInputRef}
                id="date"
                type="date"
                min={localToday}
                aria-invalid={Boolean(dateError)}
                aria-describedby={dateError ? 'date-error-desc' : undefined}
                value={formData.date || ''}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value });
                  if (dateError) setDateError('');
                }}
                className={`form-input ${dateError ? 'border-[var(--warn)] focus:ring-[var(--warn)]' : ''}`}
              />
              {dateError && (
                <p id="date-error-desc" className="text-xs text-[var(--warn)] font-semibold mt-1">
                  Choose today or a later date.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-semibold text-[var(--text)] mb-1">
                City or location
              </label>
              <input
                id="city"
                type="text"
                required
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="form-input"
                placeholder="e.g. Nashik, Pune, Mumbai, Delhi"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-3">
              <label htmlFor="notes" className="block text-sm font-semibold text-[var(--text)] mb-1">
                Notes and specific requirements
              </label>
              <textarea
                id="notes"
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="form-textarea"
                placeholder="Mention dietary preferences, venue type, rituals or special constraints."
              />
            </div>

            {/* Reference Photos upload */}
            <div className="sm:col-span-2 md:col-span-3 pt-3 border-t border-[var(--border)]">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="photoUpload" className="block text-sm font-semibold text-[var(--text)]">
                  Venue or theme photos (optional, up to 4)
                </label>
                <span className="text-xs text-[var(--text-muted)]">
                  {(formData.photos || []).length} of 4 photos added
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  id="photoUpload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={(formData.photos || []).length >= 4}
                  onChange={handlePhotoUpload}
                  className="text-xs text-[var(--text-muted)] file:mr-3 file:py-2 file:px-3 file:rounded file:border file:border-[var(--border)] file:text-xs file:font-semibold file:bg-[var(--surface-alt)] file:text-[var(--brown)] hover:file:bg-[var(--surface)] file:cursor-pointer cursor-pointer"
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                JPG, PNG or WebP under 8 MB. Images are compressed in your browser (maximum 1280px, WebP/JPEG 0.8 quality) before sending.
              </p>

              {/* Uploaded Thumbnails */}
              {(formData.photos || []).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  {formData.photos!.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="relative rounded border border-[var(--border)] bg-[var(--surface-alt)] p-1.5 flex flex-col items-center"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={`Venue reference photo ${idx + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                      <div className="w-full flex items-center justify-between mt-1.5 px-0.5">
                        <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[80px]" title={photo.name}>
                          {photo.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.id)}
                          className="text-[10px] font-semibold text-[var(--maroon)] hover:underline"
                          aria-label={`Remove reference photo ${idx + 1}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)]">
              Before meeting vendors, you can also{' '}
              <a
                href="/vendor-guide"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/vendor-guide');
                }}
                className="inline-link"
              >
                review questions to ask your vendors
              </a>.
            </p>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Processing...' : 'Create plan'}
            </button>
          </div>
        </form>
          </div>
        </details>

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
                className="btn-secondary btn-small self-start sm:self-auto text-xs font-semibold whitespace-nowrap"
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
            <div className="text-xs text-[var(--text-muted)] mt-1">{statusMessage || 'Balancing budget math and structuring schedule...'}</div>
          </div>
        )}

        {/* Empty state when no plan has been generated yet */}
        {!plan && !loading && (
          <div className="card p-8 mb-8 text-center bg-[var(--surface)] border border-[var(--border)]">
            <h3 className="text-xl font-serif text-[var(--brown)] font-semibold mb-2">No event plan created yet</h3>
            <p className="text-sm text-[var(--text-muted)] max-w-lg mx-auto">
              Use the chat above to describe your gathering in plain words (for example: "Plan a 50-person birthday in Nashik in December, budget Rs 40,000"), or fill in the form above and click "Create plan".
            </p>
          </div>
        )}

        {/* Results View */}
        {plan && (
          <div className="space-y-10">
            {isSoon && (
              <div className="card p-4 border-[var(--warn)] text-sm text-[var(--brown)] bg-[var(--surface-alt)] font-semibold">
                This event is soon. Some timeline steps may need to happen at once.
              </div>
            )}

            {/* Summary and action buttons */}
            <div className="card p-6 bg-[var(--surface-alt)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <span className="tag mb-2">{formData.eventType}</span>
                  <h2 className="text-2xl font-serif text-[var(--brown)]">
                    Plan summary
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {previousPlan && (
                    <button
                      type="button"
                      onClick={handleUndo}
                      className="btn-secondary btn-small text-[var(--maroon)] font-semibold"
                    >
                      Undo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsWorkspaceOpen(true)}
                    className="btn-primary btn-small bg-[var(--brown)] hover:bg-[#432D1F]"
                  >
                    Open Event Workspace
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePlan}
                    className="btn-secondary btn-small"
                  >
                    Save plan
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyWhatsAppSummary}
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
                        className="btn-secondary btn-small whitespace-nowrap text-xs"
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
                    <span className="font-semibold text-[var(--text-muted)] block">City & Date</span>
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

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-[6px] bg-[var(--surface-alt)] border border-[var(--border)]">
              {[
                { id: 'all', label: 'All sections' },
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'budget', label: '1. Budget' },
                { id: 'expenses', label: '2. Expenses' },
                { id: 'vendors', label: '3. Vendors' },
                { id: 'timeline', label: '4. Timeline' },
                { id: 'itinerary', label: '5. Itinerary' },
                { id: 'ideas', label: '6. Ideas' },
                { id: 'ai-advisor', label: '7. AI Advisor' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-[4px] transition-colors duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-[var(--maroon)] text-[var(--bg)] shadow-none'
                        : 'text-[var(--text)] hover:text-[var(--maroon)] hover:bg-[var(--surface)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab: Dashboard */}
            {(activeTab === 'all' || activeTab === 'dashboard') && (
              <section className="space-y-4">
                <EventDashboard
                  event={currentEventSnapshot}
                  onSelectTab={(t) => setActiveTab(t as any)}
                />
              </section>
            )}

            {/* Section 1: Budget allocation */}
            {(activeTab === 'all' || activeTab === 'budget') && (
              <section className="card-result p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
                  <div>
                    <h2 className="text-2xl font-serif text-[var(--brown)] mb-1">
                      1. Budget allocation
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
                        <th className="p-3 font-semibold">Progress</th>
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
                            <td className="p-3 w-32">
                              <div className="progress-bar-track">
                                <div
                                   className="progress-bar-fill"
                                   style={{ width: `${Math.min(100, row.pct * 2)}%` }}
                                />
                              </div>
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
            )}

            {/* Section 2: Actual Expense Tracking */}
            {(activeTab === 'all' || activeTab === 'expenses') && (
              <section className="card-result p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-serif text-[var(--brown)] mb-1">
                    2. Actual expense tracking
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Record actual payments, track remaining category allowances and prevent overspending.
                  </p>
                </div>

                <ExpenseTracker
                  budgetItems={plan.budget}
                  totalBudget={formData.budgetINR || 0}
                  expenses={expenses}
                  onUpdateExpenses={handleUpdateExpenses}
                />
              </section>
            )}

            {/* Section 3: Vendor Management */}
            {(activeTab === 'all' || activeTab === 'vendors') && (
              <section className="card-result p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-serif text-[var(--brown)] mb-1">
                    3. Vendor contracts & quotes
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Manage quotes, negotiated rates, advance deposits, and side-by-side supplier comparisons.
                  </p>
                </div>

                <VendorManager
                  vendors={plan.vendors}
                  comparisons={vendorComparisons}
                  eventType={formData.eventType || 'Event'}
                  city={formData.city || 'India'}
                  onUpdateVendors={handleUpdateVendors}
                  onUpdateComparisons={handleUpdateComparisons}
                  onAskQuestions={handleFetchVendorQuestions}
                  loadingQuestionsIdx={loadingQuestionsIdx}
                />
              </section>
            )}

            {/* Section 4: Intelligent Timeline */}
            {(activeTab === 'all' || activeTab === 'timeline') && (
              <section className="card-result p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-serif text-[var(--brown)] mb-1">
                    4. Intelligent preparation timeline
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
            )}

            {/* Section 5: Event day itinerary */}
            {(activeTab === 'all' || activeTab === 'itinerary') && (
              <section className="card-result p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-serif text-[var(--brown)] mb-1">
                    5. Event day itinerary
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Hour-by-hour schedule covering key milestones on {formData.date}.
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
                          <strong className="text-[var(--brown)] font-semibold">Decor & atmosphere:</strong> {item.decorNote}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Section 6: Ideas */}
            {(activeTab === 'all' || activeTab === 'ideas') && (
              <section className="card-result p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-serif text-[var(--brown)] mb-1">
                    6. Cultural and logistical recommendations
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Practical suggestions for hospitality, guest comfort and cultural celebrations.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {plan.ideas.map((idea, idx) => (
                    <div key={idea.title + idx} className="card p-5 bg-[var(--surface)] flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-serif text-[var(--brown)] mb-2 font-semibold">
                          {idea.title}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                          {idea.detail}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
                        Recommendation {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Section 7: Contextual AI Advisor */}
            {(activeTab === 'all' || activeTab === 'ai-advisor') && (
              <section className="space-y-4">
                <AIAssistantChat
                  event={currentEventSnapshot}
                  onApplyProposedChange={handleApplyProposedChange}
                />
              </section>
            )}

            {/* Refine Chat Section */}
            <section className="card p-6 bg-[var(--surface-alt)]">
              <h2 className="text-2xl font-serif text-[var(--brown)] mb-2">
                Quick plan refinement
              </h2>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                Type an adjustment to modify budget percentages, move itinerary timings (for example, "move the cake cutting to 9 pm"), or alter vendor responsibilities. Requests return a proposed change with a before-and-after view for your approval.
              </p>

              {/* Proposed Change Review Card with Before & After View */}
              {pageProposal && (
                <div className="mb-6 p-4 rounded-sm border-2 border-[var(--warn)] bg-[var(--surface)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[var(--warn)] uppercase tracking-wider">
                      Pending Plan Revision Proposal
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">Review before applying</span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-[var(--brown)] mb-1">
                    {pageProposal.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mb-3">{pageProposal.explanation}</p>

                  {/* Before & After comparison */}
                  {pageProposal.diff && pageProposal.diff.length > 0 && (
                    <div className="my-3 border border-[var(--border)] rounded-sm bg-white overflow-hidden">
                      <div className="bg-[var(--surface-alt)] px-3 py-1.5 font-semibold text-xs text-[var(--brown)] border-b border-[var(--border)]">
                        Before and After Comparison
                      </div>
                      <div className="divide-y divide-[var(--border)]">
                        {pageProposal.diff.map((item, idx) => (
                          <div key={idx} className="p-3 text-xs space-y-1.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <span className="font-semibold text-[var(--text)]">{item.item}</span>
                              {item.reason && (
                                <span className="text-[11px] text-[var(--warn)] font-medium">{item.reason}</span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="text-[var(--text-muted)] bg-[var(--surface-alt)] px-2.5 py-1.5 rounded-sm border border-[var(--border)]">
                                <span className="text-[10px] uppercase font-bold block text-[var(--text-muted)]">Current (Before)</span>
                                {item.before}
                              </div>
                              <div className="text-[var(--maroon)] font-semibold bg-[#FFF8F0] px-2.5 py-1.5 rounded-sm border border-[var(--warn)]/40">
                                <span className="text-[10px] uppercase font-bold block text-[var(--warn)]">Proposed (After)</span>
                                {item.after}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-2.5 rounded-sm bg-[var(--surface-alt)] border border-[var(--border)] text-xs text-[var(--text)] mb-3">
                    <strong className="block text-[var(--brown)] mb-0.5">Proposed Impact:</strong>
                    {pageProposal.impactSummary}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (pageProposal.updatedPlan) {
                          handleApplyPlanUpdate(pageProposal.updatedPlan as EventPlan, pageProposal.updatedFormData);
                        }
                      }}
                      className="btn-primary btn-small"
                    >
                      Apply change
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPageProposal(null);
                        setNotification('Proposed change discarded. Your plan remains untouched.');
                        setTimeout(() => setNotification(''), 4000);
                      }}
                      className="btn-secondary btn-small"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleRefine} className="flex flex-col sm:flex-row gap-3">
                <label htmlFor="refineInput" className="sr-only">
                  Plan adjustment instruction
                </label>
                <input
                  id="refineInput"
                  type="text"
                  value={refineText}
                  onChange={(e) => setRefineText(e.target.value)}
                  placeholder="e.g. Move the cake cutting to 9 pm and increase catering to 42%"
                  className="form-input flex-1"
                  disabled={refining}
                />
                <button
                  type="submit"
                  disabled={refining || !refineText.trim()}
                  className="btn-primary whitespace-nowrap"
                >
                  {refining ? 'Evaluating...' : 'Propose change'}
                </button>
              </form>

              <div className="mt-4 text-xs text-[var(--text-muted)] flex items-center justify-between">
                <span>All changes maintain 100% budget rebalancing and sync with your day itinerary.</span>
                <a
                  href="/my-events"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/my-events');
                  }}
                  className="inline-link"
                >
                  view your saved plans on this device
                </a>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Side Workspace Sheet */}
      {plan && (
        <SideWorkspaceSheet
          isOpen={isWorkspaceOpen}
          onClose={() => setIsWorkspaceOpen(false)}
          event={currentEventSnapshot}
          onUpdateEvent={handleUpdateEventFromWorkspace}
          onApplyProposedChange={(proposal) => {
            if (proposal.updatedPlan) {
              handleApplyPlanUpdate(proposal.updatedPlan as EventPlan, proposal.updatedFormData);
            }
          }}
        />
      )}
    </div>
  );
};
