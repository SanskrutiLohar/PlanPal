import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { BudgetItem, EventFormData, EventPlan, ExpenseItem, SavedPlan, TimelineTask, VendorItem } from '../types/plan.js';
import { normalizeBudget, adjustBudgetCategory } from '../lib/budgetCalculator.js';

function sanitizeString(str: unknown): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[\u2014\u2015]/g, ' - ')
    .replace(/[\u2013]/g, '-')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/!/g, '.')
    .trim();
}

export interface AssistantResponse {
  answer: string;
  proposedChange: {
    id: string;
    title: string;
    explanation: string;
    impactSummary: string;
    updatedPlan?: Partial<EventPlan>;
    updatedFormData?: Partial<EventFormData>;
  } | null;
}

export async function processAIAssistantMessage(
  ai: GoogleGenAI | null,
  userMessage: string,
  event: SavedPlan
): Promise<AssistantResponse> {
  const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const totalBudget = Number(event.formData.budgetINR) || 0;
  const guestCount = Number(event.formData.guestCount) || 1;
  const perGuest = Math.round(totalBudget / guestCount);

  const expenses: ExpenseItem[] = event.expenses || [];
  const actualExpenditure = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const remainingBudget = totalBudget - actualExpenditure;

  // Compute category spend vs allocated
  const categoryAnalysis = event.plan.budget.map((b) => {
    const spentInCategory = expenses
      .filter((e) => e.category.toLowerCase().includes(b.item.toLowerCase()) || b.item.toLowerCase().includes(e.category.toLowerCase()))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const allocated = b.amount || Math.round((b.pct / 100) * totalBudget);
    const diff = allocated - spentInCategory;
    return {
      category: b.item,
      allocated,
      spent: spentInCategory,
      remaining: diff,
      isOverspent: spentInCategory > allocated,
    };
  });

  const overspentCategories = categoryAnalysis.filter((c) => c.isOverspent);

  // Pending payments
  const vendors: VendorItem[] = event.plan.vendors || [];
  const pendingVendors = vendors.filter((v) => {
    if (v.remainingPayment !== undefined && v.remainingPayment > 0) return true;
    if (v.negotiatedPrice && v.advancePaid !== undefined && v.negotiatedPrice > v.advancePaid) return true;
    if (v.quotedPrice && v.advancePaid !== undefined && v.quotedPrice > v.advancePaid) return true;
    return false;
  }).map((v) => {
    const remaining = v.remainingPayment ?? Math.max(0, (v.negotiatedPrice || v.quotedPrice || 0) - (v.advancePaid || 0));
    return {
      name: v.name,
      remaining,
      dueDate: v.paymentDueDate || 'Before event day',
      status: v.status || (v.done ? 'Booked' : 'Pending'),
    };
  });
  const totalPendingPayments = pendingVendors.reduce((sum, v) => sum + v.remaining, 0);

  // Incomplete & Overdue tasks
  const tasks: TimelineTask[] = (event.tasks && event.tasks.length > 0)
    ? event.tasks
    : event.plan.timeline.map((t, idx) => ({
        id: 't_' + idx,
        when: t.when,
        task: t.task,
        completed: Boolean((t as any).completed),
        category: 'General' as const,
        priority: 'Normal' as const,
      }));
  const incompleteTasks = tasks.filter((t) => !t.completed);
  const overdueTasks = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < todayIST);

  const contextPrompt = `You are PlanPal's intelligent event planning assistant.
Today's date is: ${todayIST}.
Event: ${event.formData.eventType} in ${event.formData.city}
Date: ${event.formData.date || 'Not specified'}
Guest count: ${guestCount} (Per guest allowance: ₹${perGuest.toLocaleString('en-IN')})
Total budget: ₹${totalBudget.toLocaleString('en-IN')}
Actual expenses recorded so far: ₹${actualExpenditure.toLocaleString('en-IN')}
Remaining overall budget: ₹${remainingBudget.toLocaleString('en-IN')}

Category breakdown:
${categoryAnalysis.map((c) => `- ${c.category}: Allocated ₹${c.allocated.toLocaleString('en-IN')}, Spent ₹${c.spent.toLocaleString('en-IN')}, ${c.isOverspent ? `OVERSPENT by ₹${Math.abs(c.remaining).toLocaleString('en-IN')}` : `Remaining ₹${c.remaining.toLocaleString('en-IN')}`}`).join('\n')}

Pending vendor payments (Total: ₹${totalPendingPayments.toLocaleString('en-IN')}):
${pendingVendors.length > 0 ? pendingVendors.map((v) => `- ${v.name}: ₹${v.remaining.toLocaleString('en-IN')} pending (Due: ${v.dueDate})`).join('\n') : 'No pending payments recorded.'}

Incomplete tasks: ${incompleteTasks.length} pending (${overdueTasks.length} overdue)
${incompleteTasks.slice(0, 5).map((t) => `- [${t.priority}] ${t.when}: ${t.task} ${t.dueDate ? `(Due: ${t.dueDate})` : ''}`).join('\n')}

User message:
"${userMessage}"

RULES:
1. Rely exclusively on the real financial and event figures above. Never invent fake amounts.
2. Write in concise, plain language. No emojis, no em dashes, no buzzwords.
3. If the user asks an informational question (e.g. which payments pending, what tasks remain, which category exceeded budget), answer directly with factual bullets and set proposedChange to null.
4. If the user asks to modify the budget, adjust guest count, or alter event settings (e.g., "can I reduce my decoration budget", "what if my guest count increases to 250"), give a clear analysis and provide a concrete proposedChange object with title, explanation, impactSummary, and the updatedPlan or updatedFormData.
5. In any updated budget, all percentages must add up to exactly 100%.`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contextPrompt,
        config: {
          systemInstruction: 'You are a meticulous Indian event planning advisor. Return strictly valid JSON conforming to the schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: {
                type: Type.STRING,
                description: 'Clear plain text answer to the user question using actual event numbers.',
              },
              hasProposedChange: {
                type: Type.BOOLEAN,
                description: 'True if proposing an actual modification to saved event data requiring approval.',
              },
              proposedChangeTitle: { type: Type.STRING },
              proposedChangeExplanation: { type: Type.STRING },
              proposedChangeImpact: { type: Type.STRING },
              updatedGuestCount: { type: Type.NUMBER },
              adjustedCategory: { type: Type.STRING },
              adjustedCategoryPct: { type: Type.NUMBER },
            },
            required: ['answer', 'hasProposedChange'],
          },
          temperature: 0.2,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      let proposedChange: AssistantResponse['proposedChange'] = null;

      if (parsed.hasProposedChange) {
        let updatedPlan: Partial<EventPlan> | undefined = undefined;
        let updatedFormData: Partial<EventFormData> | undefined = undefined;

        if (parsed.adjustedCategory && parsed.adjustedCategoryPct) {
          const newBudget = adjustBudgetCategory(
            event.plan.budget,
            parsed.adjustedCategory,
            parsed.adjustedCategoryPct,
            totalBudget
          );
          updatedPlan = { budget: newBudget };
        }

        if (parsed.updatedGuestCount && parsed.updatedGuestCount !== guestCount) {
          updatedFormData = { guestCount: parsed.updatedGuestCount };
        }

        proposedChange = {
          id: 'prop_' + Date.now(),
          title: sanitizeString(parsed.proposedChangeTitle || 'Proposed Plan Update'),
          explanation: sanitizeString(parsed.proposedChangeExplanation || 'Proposed adjustment based on your request.'),
          impactSummary: sanitizeString(parsed.proposedChangeImpact || 'Budget percentages balanced to 100%.'),
          updatedPlan,
          updatedFormData,
        };
      }

      return {
        answer: sanitizeString(parsed.answer),
        proposedChange,
      };
    } catch (err) {
      console.warn('AI Assistant Gemini call fallback:', err);
    }
  }

  // Factual rule-based fallback answering all typical questions directly
  const msgLower = userMessage.toLowerCase();

  // Question 1: Decor budget reduction
  if (msgLower.includes('decor') && (msgLower.includes('reduc') || msgLower.includes('cut') || msgLower.includes('lower'))) {
    const decorItem = event.plan.budget.find((b) => b.item.toLowerCase().includes('decor'));
    const currentPct = decorItem?.pct || 15;
    const newPct = Math.max(8, currentPct - 4);
    const updatedBudget = adjustBudgetCategory(event.plan.budget, 'decor', newPct, totalBudget);
    const savedAmount = Math.round(((currentPct - newPct) / 100) * totalBudget);

    return {
      answer: `Your decoration budget is currently set at ${currentPct}% (₹${(decorItem?.amount || 0).toLocaleString('en-IN')}). You can reduce it to ${newPct}% by prioritizing the main stage and ceremony entryway while using seasonal flowers. This frees up ₹${savedAmount.toLocaleString('en-IN')}, which will be safely moved into your contingency reserve.`,
      proposedChange: {
        id: 'prop_' + Date.now(),
        title: `Reduce Decor Allocation to ${newPct}%`,
        explanation: `Reduces decoration from ${currentPct}% to ${newPct}%, keeping venue flowers focused on ceremonial stages.`,
        impactSummary: `Frees ₹${savedAmount.toLocaleString('en-IN')} and redirects it to the contingency reserve. Total budget remains ₹${totalBudget.toLocaleString('en-IN')}.`,
        updatedPlan: { budget: updatedBudget },
      },
    };
  }

  // Question 2: Pending payments
  if (msgLower.includes('payment') && (msgLower.includes('pending') || msgLower.includes('due') || msgLower.includes('remain') || msgLower.includes('owe'))) {
    if (pendingVendors.length === 0) {
      return {
        answer: `You have no pending vendor payments recorded. All booked vendors are fully settled or have zero outstanding balance.`,
        proposedChange: null,
      };
    }
    const lines = pendingVendors.map((v) => `- ${v.name}: ₹${v.remaining.toLocaleString('en-IN')} pending (${v.dueDate})`).join('\n');
    return {
      answer: `You have ${pendingVendors.length} vendor(s) with pending balances totaling ₹${totalPendingPayments.toLocaleString('en-IN')}:\n\n${lines}\n\nEnsure remaining balances are cleared in accordance with contractual milestones.`,
      proposedChange: null,
    };
  }

  // Question 3: Incomplete tasks
  if (msgLower.includes('task') && (msgLower.includes('incomplete') || msgLower.includes('remain') || msgLower.includes('pending') || msgLower.includes('left'))) {
    if (incompleteTasks.length === 0) {
      return {
        answer: `All preparation tasks in your timeline have been marked as completed.`,
        proposedChange: null,
      };
    }
    const lines = incompleteTasks.slice(0, 5).map((t) => `- ${t.when}: ${t.task} ${t.dueDate ? `[Due: ${t.dueDate}]` : ''}`).join('\n');
    return {
      answer: `You have ${incompleteTasks.length} task(s) remaining (${overdueTasks.length} overdue):\n\n${lines}${incompleteTasks.length > 5 ? `\n\n...plus ${incompleteTasks.length - 5} more tasks in your timeline.` : ''}`,
      proposedChange: null,
    };
  }

  // Question 4: Guest count increase
  if (msgLower.includes('guest') && (msgLower.includes('increase') || msgLower.includes('more') || msgLower.includes('raise') || msgLower.includes('add'))) {
    const match = msgLower.match(/(\d+)/);
    const addedGuests = match ? parseInt(match[1], 10) : 50;
    const newGuestCount = guestCount + addedGuests;
    const addedFoodCost = addedGuests * perGuest;

    return {
      answer: `Increasing your guest count from ${guestCount} to ${newGuestCount} (+${addedGuests} attendees) at your current ₹${perGuest.toLocaleString('en-IN')} per-guest rate adds approximately ₹${addedFoodCost.toLocaleString('en-IN')} in dining, seating and refreshment costs. To accommodate this without increasing the overall budget, dining would require an extra 4% from contingency or venue decor.`,
      proposedChange: {
        id: 'prop_' + Date.now(),
        title: `Update Guest Count to ${newGuestCount}`,
        explanation: `Adjusts registered guest count from ${guestCount} to ${newGuestCount} attendees.`,
        impactSummary: `Estimated additional hospitality cost of ₹${addedFoodCost.toLocaleString('en-IN')}.`,
        updatedFormData: { guestCount: newGuestCount },
      },
    };
  }

  // Question 5: Exceeding / overspent categories
  if (msgLower.includes('exceed') || msgLower.includes('overspend') || msgLower.includes('over budget')) {
    if (overspentCategories.length === 0) {
      return {
        answer: `Great news: none of your categories are currently exceeding their allocated budget. You have ₹${remainingBudget.toLocaleString('en-IN')} remaining of your ₹${totalBudget.toLocaleString('en-IN')} total budget.`,
        proposedChange: null,
      };
    }
    const lines = overspentCategories.map((c) => `- ${c.category}: Allocated ₹${c.allocated.toLocaleString('en-IN')}, Spent ₹${c.spent.toLocaleString('en-IN')} (Overspent by ₹${Math.abs(c.remaining).toLocaleString('en-IN')})`).join('\n');
    return {
      answer: `The following ${overspentCategories.length} category/categories are currently exceeding their allocated budget:\n\n${lines}\n\nYou can rebalance funds by moving excess points from your contingency reserve or trimming lower-priority items.`,
      proposedChange: null,
    };
  }

  // General fallback
  return {
    answer: `For your ${event.formData.eventType} in ${event.formData.city} (budget ₹${totalBudget.toLocaleString('en-IN')}), you have recorded ₹${actualExpenditure.toLocaleString('en-IN')} in actual expenses with ₹${remainingBudget.toLocaleString('en-IN')} remaining. ${incompleteTasks.length} tasks remain pending and ${pendingVendors.length} vendor balance(s) are outstanding. Ask me to adjust specific budget lines, review vendor contracts, or inspect deadlines.`,
    proposedChange: null,
  };
}
