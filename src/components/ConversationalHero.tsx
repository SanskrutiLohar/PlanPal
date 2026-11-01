import React, { useState, useRef, useEffect } from 'react';
import {
  EventPlan,
  EventFormData,
  ExtractedEventSlots,
  DiscoveryMessage,
  AIProposedChange,
  UploadedPhoto,
} from '../types/plan.js';

interface ConversationalHeroProps {
  currentPlan: EventPlan | null;
  formData: EventFormData;
  isGenerating: boolean;
  onGeneratePlan: (extracted: EventFormData) => Promise<void>;
  onApplyPlanUpdate: (updatedPlan: EventPlan, updatedFormData?: Partial<EventFormData>) => void;
  onSavePlan?: () => void;
  isSaved?: boolean;
  onUndo?: () => void;
  canUndo?: boolean;
  onPhotoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto?: (id: string) => void;
  photos?: UploadedPhoto[];
  initialPrompt?: string | null;
  onSlotsChange?: (slots: ExtractedEventSlots) => void;
}

const STARTER_PROMPTS = [
  'Plan a 50-person birthday in Nashik in December, budget Rs 40,000, vegetarian, elegant but affordable',
  'Wedding for 150 guests in Nashik with an Rs 8,00,000 budget, traditional Maharashtrian vegetarian menu',
  'Birthday party for 30 guests in Pune with 50k budget and outdoor lawn decor',
  'Community cultural festival in Mumbai for 200 participants with 2 lakh budget',
];

export const ConversationalHero: React.FC<ConversationalHeroProps> = ({
  currentPlan,
  formData,
  isGenerating,
  onGeneratePlan,
  onApplyPlanUpdate,
  onSavePlan,
  isSaved = false,
  onUndo,
  canUndo = false,
  onPhotoUpload,
  onRemovePhoto,
  photos = [],
  initialPrompt,
  onSlotsChange,
}) => {
  const [messages, setMessages] = useState<DiscoveryMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content:
        'Tell me about the event you want to plan. Mention your event type, city, estimated guests, and approximate budget.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isProcessingChat, setIsProcessingChat] = useState(false);
  const [activeProposal, setActiveProposal] = useState<AIProposedChange | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  // Live extracted slots - missing values stay null
  const [slots, setSlots] = useState<ExtractedEventSlots>({
    eventType: formData.eventType ?? null,
    city: formData.city ?? null,
    guestCount: formData.guestCount ?? null,
    budgetINR: formData.budgetINR ?? null,
    date: formData.date ?? null,
    notes: formData.notes ?? null,
    preferences: null,
    constraints: null,
    assumptions: [],
    isReady: Boolean(formData.eventType && formData.city && formData.guestCount && formData.budgetINR),
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const generatingRef = useRef(false);
  const lastGeneratedSignatureRef = useRef<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessingChat, activeProposal, chatError]);

  // Keep slots in sync if formData changes from external preset or props
  useEffect(() => {
    setSlots((prev) => ({
      ...prev,
      eventType: formData.eventType ?? prev.eventType,
      city: formData.city ?? prev.city,
      guestCount: formData.guestCount ?? prev.guestCount,
      budgetINR: formData.budgetINR ?? prev.budgetINR,
      date: formData.date ?? prev.date,
      notes: formData.notes ?? prev.notes,
      isReady: Boolean(
        (formData.eventType ?? prev.eventType) &&
        (formData.city ?? prev.city) &&
        (formData.guestCount ?? prev.guestCount) &&
        (formData.budgetINR ?? prev.budgetINR)
      ),
    }));
  }, [formData]);

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setInputMessage(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    onSlotsChange?.(slots);
  }, [slots, onSlotsChange]);

  // Handle conversational discovery submission
  const handleSendDiscovery = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isProcessingChat || isGenerating || generatingRef.current) return;

    setInputMessage('');
    setChatError(null);
    setLastFailedMessage(null);

    const userMsg: DiscoveryMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessingChat(true);

    try {
      const res = await fetch('/api/chat-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-4).map((m) => ({ role: m.role, content: m.content })),
          currentSlots: slots,
        }),
      });

      if (!res.ok) {
        throw new Error('Chat discovery request failed');
      }

      const data = await res.json();
      if (data.slots) {
        setSlots(data.slots);
      }

      const botReply: DiscoveryMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'I noted your requirements.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        slotsSnapshot: data.slots,
      };

      setMessages((prev) => [...prev, botReply]);

      // If all required fields are present and user has not already generated this plan, generate it
      if (data.isReady && !currentPlan && !generatingRef.current) {
        const nextSlots = data.slots;
        if (nextSlots.eventType && nextSlots.city && nextSlots.guestCount && nextSlots.budgetINR) {
          const sig = `${nextSlots.eventType}|${nextSlots.city}|${nextSlots.guestCount}|${nextSlots.budgetINR}|${nextSlots.date || ''}`;
          if (sig !== lastGeneratedSignatureRef.current) {
            generatingRef.current = true;
            lastGeneratedSignatureRef.current = sig;

            const fullForm: EventFormData = {
              eventType: nextSlots.eventType,
              city: nextSlots.city,
              guestCount: nextSlots.guestCount,
              budgetINR: nextSlots.budgetINR,
              date: nextSlots.date ?? null,
              notes: nextSlots.notes ?? null,
            };

            try {
              await onGeneratePlan(fullForm);
            } finally {
              generatingRef.current = false;
            }
          }
        }
      }
    } catch (err) {
      console.error('Discovery chat failed:', err);
      setChatError('The assistant could not process your message. Check your connection and try again.');
      setLastFailedMessage(text);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: 'The assistant could not reach the server. Please click Retry below to send again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessingChat(false);
    }
  };

  // Trigger generation using current slots - never generate twice or from stale state
  const handleTriggerGenerate = async () => {
    if (isGenerating || generatingRef.current) return;
    if (!slots.eventType || !slots.city || !slots.guestCount || !slots.budgetINR) return;

    const sig = `${slots.eventType}|${slots.city}|${slots.guestCount}|${slots.budgetINR}|${slots.date || ''}`;
    if (sig === lastGeneratedSignatureRef.current) return;

    generatingRef.current = true;
    lastGeneratedSignatureRef.current = sig;

    const fullForm: EventFormData = {
      eventType: slots.eventType,
      city: slots.city,
      guestCount: slots.guestCount,
      budgetINR: slots.budgetINR,
      date: slots.date ?? null,
      notes: slots.notes ?? null,
    };

    try {
      await onGeneratePlan(fullForm);
    } finally {
      generatingRef.current = false;
    }
  };

  // Conversational refinement on existing plan - returns proposed change with before & after diff
  const handleSendRefinement = async (e?: React.FormEvent, retryText?: string) => {
    if (e) e.preventDefault();
    const instruction = (retryText || inputMessage).trim();
    if (!instruction || !currentPlan || isRefining) return;

    setInputMessage('');
    setIsRefining(true);
    setChatError(null);
    setLastFailedMessage(null);

    const userMsg: DiscoveryMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: instruction,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPlan,
          instruction,
          eventDetails: {
            eventType: formData.eventType,
            guestCount: formData.guestCount,
            budgetINR: formData.budgetINR,
            city: formData.city,
            date: formData.date,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Refinement request failed');
      }

      const data = await res.json();
      if (data.success && data.proposal) {
        setActiveProposal(data.proposal);

        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            role: 'assistant',
            content: `I prepared a proposed revision matching your request: "${instruction}". Review the before and after comparison below and click 'Apply change' to update your plan.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            proposedPlan: data.plan,
          },
        ]);
      }
    } catch (err) {
      console.error('Refine failed:', err);
      setChatError('The modification could not be prepared. Check your connection and try again.');
      setLastFailedMessage(instruction);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: 'Could not process that modification. Check your connection and try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsRefining(false);
    }
  };

  const handleApproveProposal = () => {
    if (activeProposal && activeProposal.updatedPlan) {
      onApplyPlanUpdate(activeProposal.updatedPlan as EventPlan, activeProposal.updatedFormData);
      setActiveProposal(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: 'Approved change applied to your plan and budget.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const handleDiscardProposal = () => {
    setActiveProposal(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: 'Proposed change discarded. Your plan remains untouched.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner / Philosophy */}
      <div className="bg-[#FCF9F3] border border-[#DDD0BD] p-5 sm:p-6 rounded-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider text-[#A8641A] uppercase block">
              Event Planning Assistant
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#7A1F2B] mt-1">
              {currentPlan && formData.eventType && formData.city
                ? `${formData.eventType} in ${formData.city}`
                : 'Tell PlanPal what you are planning'}
            </h1>
            <p className="text-sm text-[#5A3E2B] mt-1.5 max-w-2xl leading-relaxed">
              {currentPlan
                ? `Plan for ${formData.guestCount ?? 'unspecified'} guests, budget of ₹${(formData.budgetINR || 0).toLocaleString('en-IN')}. Talk with the assistant to adjust budgets, vendors, or timings.`
                : 'Share your requirements naturally in chat. PlanPal extracts your details, checks budget realism, balances categories to 100%, and prepares a full timeline.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {currentPlan && (
              <>
                {canUndo && onUndo && (
                  <button
                    type="button"
                    onClick={onUndo}
                    className="px-3.5 py-2.5 text-xs font-semibold rounded-sm border border-[#DDD0BD] bg-white text-[#7A1F2B] hover:bg-[#FAF5ED] transition-colors min-h-[44px]"
                  >
                    Undo
                  </button>
                )}

                {onSavePlan && (
                  <button
                    type="button"
                    onClick={onSavePlan}
                    className="px-3.5 py-2.5 text-xs font-medium rounded-sm border border-[#DDD0BD] bg-[#FAF5ED] text-[#5A3E2B] hover:bg-[#F2E8D7] transition-colors min-h-[44px]"
                  >
                    {isSaved ? 'Saved in My Plans' : 'Save Plan'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Live Slot Extraction Bar (Shows extracted parameters) */}
        <div className="mt-4 pt-3.5 border-t border-[#EFE6D8] flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#5A3E2B] uppercase tracking-wider mr-1">
            Parameters:
          </span>

          <span
            className={`text-xs px-2.5 py-1 rounded-sm border ${
              slots.eventType
                ? 'bg-[#EFE6D8] border-[#DDD0BD] text-[#2C2117] font-medium'
                : 'bg-white/60 border-dashed border-[#DDD0BD] text-[#8C7A68]'
            }`}
          >
            Type: {slots.eventType ?? 'None'}
          </span>

          <span
            className={`text-xs px-2.5 py-1 rounded-sm border ${
              slots.city
                ? 'bg-[#EFE6D8] border-[#DDD0BD] text-[#2C2117] font-medium'
                : 'bg-white/60 border-dashed border-[#DDD0BD] text-[#8C7A68]'
            }`}
          >
            City: {slots.city ?? 'None'}
          </span>

          <span
            className={`text-xs px-2.5 py-1 rounded-sm border ${
              slots.guestCount !== null && slots.guestCount !== undefined
                ? 'bg-[#EFE6D8] border-[#DDD0BD] text-[#2C2117] font-medium'
                : 'bg-white/60 border-dashed border-[#DDD0BD] text-[#8C7A68]'
            }`}
          >
            Guests: {slots.guestCount !== null && slots.guestCount !== undefined ? `${slots.guestCount} guests` : 'None'}
          </span>

          <span
            className={`text-xs px-2.5 py-1 rounded-sm border ${
              slots.budgetINR !== null && slots.budgetINR !== undefined
                ? 'bg-[#EFE6D8] border-[#DDD0BD] text-[#2C2117] font-medium'
                : 'bg-white/60 border-dashed border-[#DDD0BD] text-[#8C7A68]'
            }`}
          >
            Budget: {slots.budgetINR !== null && slots.budgetINR !== undefined ? `₹${slots.budgetINR.toLocaleString('en-IN')}` : 'None'}
          </span>

          {slots.date && (
            <span className="text-xs px-2.5 py-1 rounded-sm border bg-[#EFE6D8] border-[#DDD0BD] text-[#2C2117]">
              Date: {slots.date}
            </span>
          )}

          {slots.preferences && (
            <span className="text-xs px-2.5 py-1 rounded-sm border bg-[#EFE6D8] border-[#DDD0BD] text-[#5A3E2B]">
              Preferences: {slots.preferences}
            </span>
          )}

          {slots.constraints && (
            <span className="text-xs px-2.5 py-1 rounded-sm border bg-[#EFE6D8] border-[#DDD0BD] text-[#5A3E2B]">
              Constraints: {slots.constraints}
            </span>
          )}

          {!currentPlan && (
            <button
              type="button"
              disabled={isGenerating || !slots.eventType || !slots.city || !slots.guestCount || !slots.budgetINR}
              onClick={handleTriggerGenerate}
              className={`ml-auto px-4 py-1.5 text-xs font-semibold rounded-sm transition-colors min-h-[44px] ${
                slots.eventType && slots.city && slots.guestCount && slots.budgetINR
                  ? 'bg-[#7A1F2B] text-white hover:bg-[#601822]'
                  : 'bg-[#DDD0BD] text-[#7A6B5D] cursor-not-allowed'
              }`}
            >
              {isGenerating ? 'Generating Plan...' : 'Create plan'}
            </button>
          )}
        </div>

        {/* Assumptions Display if any were made */}
        {slots.assumptions && slots.assumptions.length > 0 && (
          <div className="mt-3 p-3 bg-[#FFFBF5] border border-[#A8641A] rounded-sm text-xs">
            <span className="font-semibold text-[#A8641A] block mb-1">
              Assumptions used (confirm or adjust in chat):
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-[#5A3E2B]">
              {slots.assumptions.map((assump, idx) => (
                <li key={idx}>{assump}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Main Conversational Workspace */}
      <div className="bg-[#FCF9F3] border border-[#DDD0BD] rounded-sm p-5 md:p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EFE6D8]">
          <h2 className="font-serif text-lg font-bold text-[#7A1F2B]">
            {currentPlan ? 'PlanPal Assistant Dialogue' : 'Conversational Planning Discovery'}
          </h2>
          <span className="text-xs text-[#7A6B5D]">
            {currentPlan ? 'State your modifications in plain words' : 'Describe your event in plain sentences'}
          </span>
        </div>

        {/* Discovery Starter Chips (if starting new) */}
        {!currentPlan && messages.length <= 2 && (
          <div className="mb-4">
            <p className="text-xs text-[#5A3E2B] font-semibold uppercase tracking-wider mb-2">
              Examples (Click any to test extraction):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STARTER_PROMPTS.map((prompt, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleSendDiscovery(prompt)}
                  className="text-left text-xs p-2.5 rounded-sm bg-[#FAF5ED] border border-[#DDD0BD] text-[#4A3B2C] hover:border-[#7A1F2B] hover:bg-[#F2E8D7] transition-all min-h-[44px]"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Stream */}
        <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1 mb-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-sm p-3.5 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#7A1F2B] text-white border border-[#601822]'
                    : 'bg-[#FAF5ED] text-[#2C2117] border border-[#DDD0BD]'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                <span
                  className={`block text-[10px] mt-1.5 ${
                    m.role === 'user' ? 'text-white/70' : 'text-[#8C7A68]'
                  }`}
                >
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}

          {/* Typing / Processing indicator */}
          {(isProcessingChat || isRefining || isGenerating) && (
            <div className="flex items-center gap-2 text-xs text-[#7A6B5D] p-2 bg-[#FAF5ED] rounded-sm w-fit border border-[#DDD0BD]">
              <span className="inline-block w-2 h-2 rounded-full bg-[#7A1F2B] animate-pulse" />
              <span>
                {isGenerating
                  ? 'Generating comprehensive event plan with 100% budget math...'
                  : isRefining
                  ? 'Analyzing modification and preparing before and after proposal...'
                  : 'Analyzing event requirements...'}
              </span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Error and Retry State */}
        {chatError && (
          <div className="p-3 mb-3 bg-[#FCF9F3] border border-[#A8641A] rounded-sm text-xs flex items-center justify-between gap-3">
            <span className="text-[#A8641A]">{chatError}</span>
            {lastFailedMessage && (
              <button
                type="button"
                onClick={() => {
                  if (currentPlan) {
                    handleSendRefinement(undefined, lastFailedMessage);
                  } else {
                    handleSendDiscovery(lastFailedMessage);
                  }
                }}
                className="px-3 py-1 bg-[#FAF5ED] hover:bg-[#EFE6D8] border border-[#DDD0BD] rounded-sm text-xs font-semibold text-[#5A3E2B] min-h-[44px]"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Inline Proposal Review Card with Before & After View */}
        {activeProposal && (
          <div className="my-4 p-4 rounded-sm border-2 border-[#A8641A] bg-[#FFFBF5]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#A8641A] uppercase tracking-wider">
                Pending Plan Revision Proposal
              </span>
              <span className="text-xs text-[#7A6B5D]">Review before applying</span>
            </div>

            <h4 className="font-serif font-bold text-sm text-[#7A1F2B] mb-1">
              {activeProposal.title}
            </h4>
            <p className="text-xs text-[#5A3E2B] mb-2">{activeProposal.explanation}</p>

            {/* Before and After Comparison Table */}
            {activeProposal.diff && activeProposal.diff.length > 0 && (
              <div className="my-3 border border-[#DDD0BD] rounded-sm bg-white overflow-hidden">
                <div className="bg-[#EFE6D8] px-3 py-1.5 font-semibold text-xs text-[#5A3E2B] border-b border-[#DDD0BD]">
                  Before and After Comparison
                </div>
                <div className="divide-y divide-[#DDD0BD]">
                  {activeProposal.diff.map((item, idx) => (
                    <div key={idx} className="p-3 text-xs space-y-1.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-semibold text-[#2E2118]">{item.item}</span>
                        {item.reason && (
                          <span className="text-[11px] text-[#A8641A] font-medium">{item.reason}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="text-[#6F5F51] bg-[#FAF5ED] px-2.5 py-1.5 rounded-sm border border-[#DDD0BD]">
                          <span className="text-[10px] uppercase font-bold block text-[#8C7A68]">Current (Before)</span>
                          {item.before}
                        </div>
                        <div className="text-[#7A1F2B] font-semibold bg-[#FFF8F0] px-2.5 py-1.5 rounded-sm border border-[#A8641A]/30">
                          <span className="text-[10px] uppercase font-bold block text-[#A8641A]">Proposed (After)</span>
                          {item.after}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-2.5 rounded-sm bg-[#F6F0E6] border border-[#DDD0BD] text-xs text-[#2C2117] mb-3">
              <strong className="block text-[#5A3E2B] mb-0.5">Proposed Impact:</strong>
              {activeProposal.impactSummary}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleApproveProposal}
                className="px-4 py-1.5 text-xs font-semibold rounded-sm bg-[#4F6B3A] text-white hover:bg-[#3D532C] transition-colors shadow-sm min-h-[44px]"
              >
                Apply change
              </button>
              <button
                type="button"
                onClick={handleDiscardProposal}
                className="px-3 py-1.5 text-xs font-medium rounded-sm border border-[#DDD0BD] bg-white text-[#5A3E2B] hover:bg-[#FAF5ED] transition-colors min-h-[44px]"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Photo thumbnails (if any uploaded) */}
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {photos.map((photo, idx) => (
              <div key={photo.id} className="relative rounded border border-[#DDD0BD] bg-[#FAF5ED] p-1 flex items-center gap-2">
                <img
                  src={photo.dataUrl}
                  alt={`Reference photo ${idx + 1}`}
                  className="w-10 h-10 object-cover rounded"
                />
                <span className="text-[10px] text-[#8C7A68] truncate max-w-[60px]" title={photo.name}>
                  {photo.name}
                </span>
                {onRemovePhoto && (
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(photo.id)}
                    className="text-[10px] font-semibold text-[#7A1F2B] hover:underline min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={`Remove photo ${idx + 1}`}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Chat Input Bar - fixed at bottom on mobile */}
        <div className="sticky bottom-0 bg-[#FCF9F3] pt-2 z-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (currentPlan) {
                handleSendRefinement(e);
              } else {
                handleSendDiscovery();
              }
            }}
            className="flex items-center gap-2 pt-2 border-t border-[#EFE6D8]"
          >
            {/* Add photos control */}
            {onPhotoUpload && photos.length < 4 && (
              <>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={onPhotoUpload}
                  className="hidden"
                  aria-label="Upload venue or theme photos"
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="px-2.5 py-2.5 text-xs font-semibold rounded-sm border border-[#DDD0BD] bg-[#FAF5ED] text-[#5A3E2B] hover:bg-[#EFE6D8] transition-colors whitespace-nowrap min-h-[44px]"
                  title="Add venue or theme photos (up to 4)"
                >
                  Add photos
                </button>
              </>
            )}
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isProcessingChat || isRefining || isGenerating}
              placeholder={
                currentPlan
                  ? "Ask to modify anything (e.g., 'Cut decor by 5% and add shehnai player', 'Move lunch to 1:30 PM')..."
                  : "Describe your event (e.g., 'Plan a 50-person birthday in Nashik in December, budget Rs 40,000, vegetarian')..."
              }
              className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 rounded-sm border border-[#DDD0BD] bg-[#FAF5ED] text-[#2C2117] focus:outline-hidden focus:border-[#7A1F2B] focus:bg-white min-h-[44px]"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isProcessingChat || isRefining || isGenerating}
              className="px-4 py-2.5 text-xs font-semibold rounded-sm bg-[#7A1F2B] text-white hover:bg-[#601822] disabled:bg-[#DDD0BD] disabled:text-[#8C7A68] transition-colors min-h-[44px]"
            >
              {currentPlan ? 'Request change' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
