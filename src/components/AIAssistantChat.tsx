import React, { useState } from 'react';
import { AIProposedChange, SavedPlan } from '../types/plan.js';

interface AIAssistantChatProps {
  event: SavedPlan;
  onApplyProposedChange: (proposal: AIProposedChange) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  proposal?: AIProposedChange | null;
}

const QUICK_PROMPTS = [
  'Can I reduce my decoration budget?',
  'Which payments are pending?',
  'What tasks remain incomplete?',
  'What happens if my guest count increases by 50?',
  'Which category is exceeding its budget?',
];

export const AIAssistantChat: React.FC<AIAssistantChatProps> = ({
  event,
  onApplyProposedChange,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello. I am your event planning assistant for ${event.title} in ${event.formData.city}. I have access to your live budget of ₹${(Number(event.formData.budgetINR) || 0).toLocaleString('en-IN')}, recorded expenses, vendor payments, and timeline tasks. How can I help optimize your gathering?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [appliedProposalIds, setAppliedProposalIds] = useState<Set<string>>(new Set());

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          event,
        }),
      });

      if (!res.ok) {
        throw new Error('Assistant API returned an error');
      }

      const data = await res.json();
      if (data.success) {
        const assistantMsg: ChatMessage = {
          id: 'asst_' + Date.now(),
          sender: 'assistant',
          text: data.answer || 'I have evaluated your event details.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          proposal: data.proposedChange || null,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || 'Failed to process request');
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          sender: 'assistant',
          text: 'The assistant could not process your query at this moment. Please check your network and try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (proposal: AIProposedChange) => {
    onApplyProposedChange(proposal);
    setAppliedProposalIds((prev) => new Set([...prev, proposal.id]));
  };

  return (
    <div className="card p-5 space-y-4 bg-[var(--surface)] border border-[var(--border)]">
      <div>
        <h3 className="text-xl font-serif font-semibold text-[var(--brown)] mb-1">
          Intelligent Event Advisor
        </h3>
        <p className="text-xs text-[var(--text-muted)]">
          Ask questions about your live budget, expenses, pending payments, or test "what-if" scenarios.
        </p>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className="text-xs py-1 px-2.5 rounded bg-[var(--surface-alt)] hover:bg-[var(--border)] text-[var(--text)] border border-[var(--border)] transition-colors text-left"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="space-y-3 max-h-[480px] overflow-y-auto p-3 rounded bg-[var(--surface-alt)] border border-[var(--border)]">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`p-3 rounded max-w-[85%] text-sm ${
                m.sender === 'user'
                  ? 'bg-[var(--maroon)] text-white'
                  : 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]'
              }`}
            >
              <div className="whitespace-pre-line leading-relaxed">{m.text}</div>
              <div
                className={`text-[10px] mt-1 text-right tabular-nums ${
                  m.sender === 'user' ? 'text-white/70' : 'text-[var(--text-muted)]'
                }`}
              >
                {m.timestamp}
              </div>
            </div>

            {/* Proposed Change Review Card requiring explicit user approval */}
            {m.proposal && (
              <div className="mt-2 w-full max-w-[85%] p-4 rounded border-2 border-[var(--maroon)] bg-[var(--surface)] shadow-none">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--maroon)]">
                    Proposed Plan Adjustment
                  </span>
                  {appliedProposalIds.has(m.proposal.id) && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--ok)] text-white">
                      Changes Applied
                    </span>
                  )}
                </div>

                <h4 className="font-serif font-semibold text-sm text-[var(--brown)] mb-1">
                  {m.proposal.title}
                </h4>
                <p className="text-xs text-[var(--text-muted)] mb-2">
                  {m.proposal.explanation}
                </p>

                <div className="p-2 rounded bg-[var(--surface-alt)] border border-[var(--border)] text-xs text-[var(--text)] mb-3">
                  <strong>Impact:</strong> {m.proposal.impactSummary}
                </div>

                {!appliedProposalIds.has(m.proposal.id) ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApply(m.proposal!)}
                      className="btn-primary text-xs py-1.5 px-3 h-8"
                    >
                      Apply changes
                    </button>
                    <span className="text-xs text-[var(--text-muted)] italic">
                      Review required before saving
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-[var(--ok)] font-medium">
                    Your event data has been updated with these approved adjustments.
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] italic p-2">
            <span>Evaluating event parameters and calculations...</span>
          </div>
        )}
      </div>

      {/* Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          placeholder="Ask a question about your budget, vendors or tasks..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
          className="input-field flex-1 text-sm"
        />
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="btn-primary px-5 py-2 text-sm"
        >
          Send
        </button>
      </form>
    </div>
  );
};
