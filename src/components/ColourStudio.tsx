import React, { useState, useEffect } from 'react';
import { ColourPalette, EventFormData } from '../types/plan.js';

interface ColourStudioProps {
  initialPalette?: ColourPalette;
  formData: EventFormData;
  themeName?: string;
  onPaletteChange?: (palette: ColourPalette) => void;
  onSavePalette?: (palette: ColourPalette) => void;
  savedPalettes?: ColourPalette[];
}

export const ColourStudio: React.FC<ColourStudioProps> = ({
  initialPalette,
  formData,
  themeName,
  onPaletteChange,
  onSavePalette,
  savedPalettes = [],
}) => {
  const [currentPalette, setCurrentPalette] = useState<ColourPalette | null>(initialPalette || null);
  const [paletteHistory, setPaletteHistory] = useState<ColourPalette[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [refineText, setRefineText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [notification, setNotification] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(false);

  // Initialize with initialPalette or fetch once if not present
  useEffect(() => {
    if (initialPalette && !currentPalette) {
      setCurrentPalette(initialPalette);
      setPaletteHistory([initialPalette]);
      setHistoryIndex(0);
    } else if (!currentPalette && !isLoading) {
      handleShuffle();
    }
  }, [initialPalette]);

  // Sync saved status
  useEffect(() => {
    if (currentPalette && savedPalettes.some((p) => p.name === currentPalette.name)) {
      setIsSaved(true);
    } else {
      setIsSaved(false);
    }
  }, [currentPalette, savedPalettes]);

  const handleCopyHex = (hex: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      setNotification(`Copied ${hex} to clipboard.`);
      setTimeout(() => {
        setCopiedHex(null);
        setNotification('');
      }, 2500);
    }
  };

  const handleShuffle = async () => {
    if (isLoading || isRefining) return;
    setIsLoading(true);
    setErrorMessage('');
    setNotification('');

    try {
      const previousNames = paletteHistory.map((p) => p.name);
      if (currentPalette) {
        previousNames.push(currentPalette.name);
      }

      const res = await fetch('/api/palette/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: formData.eventType || 'Event',
          city: formData.city || 'India',
          theme: themeName || null,
          preferences: formData.notes || null,
          previousPalettes: Array.from(new Set(previousNames)),
        }),
      });

      if (!res.ok) {
        throw new Error('Palette generation request failed');
      }

      const data = await res.json();
      if (data.palette) {
        const newPalette = data.palette;
        setCurrentPalette(newPalette);
        setIsFallbackMode(Boolean(data.isFallback));

        // Append to history
        const updatedHistory = [...paletteHistory.slice(0, historyIndex + 1), newPalette];
        setPaletteHistory(updatedHistory);
        setHistoryIndex(updatedHistory.length - 1);

        if (data.isFallback) {
          setNotification('Loaded regional benchmark palette.');
        } else {
          setNotification('New palette generated with Gemini AI.');
        }
        setTimeout(() => setNotification(''), 4000);

        if (onPaletteChange) {
          onPaletteChange(newPalette);
        }
      }
    } catch {
      setErrorMessage('Could not generate a new palette right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevious = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const prevPalette = paletteHistory[prevIdx];
      setHistoryIndex(prevIdx);
      setCurrentPalette(prevPalette);
      if (onPaletteChange) {
        onPaletteChange(prevPalette);
      }
    }
  };

  const handleRefine = async (e?: React.FormEvent, customInstruction?: string) => {
    if (e) e.preventDefault();
    const instruction = (customInstruction || refineText).trim();
    if (!instruction || !currentPalette || isRefining || isLoading) return;

    setIsRefining(true);
    setErrorMessage('');
    setNotification('');

    try {
      const res = await fetch('/api/palette/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPalette,
          instruction,
          eventDetails: {
            eventType: formData.eventType,
            city: formData.city,
            theme: themeName,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Refinement request failed');
      }

      const data = await res.json();
      if (data.palette) {
        const refinedPalette = data.palette;
        setCurrentPalette(refinedPalette);
        setIsFallbackMode(Boolean(data.isFallback));
        setRefineText('');

        const updatedHistory = [...paletteHistory.slice(0, historyIndex + 1), refinedPalette];
        setPaletteHistory(updatedHistory);
        setHistoryIndex(updatedHistory.length - 1);

        const sourceNote = data.isFallback ? ' (benchmark rule)' : ' with Gemini AI';
        setNotification(`Palette refined: "${instruction}"${sourceNote}.`);
        setTimeout(() => setNotification(''), 4000);

        if (onPaletteChange) {
          onPaletteChange(refinedPalette);
        }
      }
    } catch {
      setErrorMessage('Could not apply that palette adjustment. Please try again.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleSave = () => {
    if (!currentPalette) return;
    setIsSaved(true);
    if (onSavePalette) {
      onSavePalette(currentPalette);
    }
    setNotification('Palette saved with this event plan.');
    setTimeout(() => setNotification(''), 3500);
  };

  const quickRefinementChips = [
    'Make it more luxurious with gold accents',
    'Make it more traditional and auspicious',
    'Give it a soft pastel appearance',
    'Make it more minimal and modern',
    'Make the colours brighter and festive',
  ];

  if (!currentPalette && isLoading) {
    return (
      <div className="card-result p-6 text-center">
        <div className="inline-block w-8 h-8 rounded-full border-2 border-[var(--maroon)] border-t-transparent animate-spin mb-3"></div>
        <div className="font-serif text-lg font-semibold text-[var(--brown)]">
          Generating AI Colour Studio palette...
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Composing harmonious shades tailored to your celebration.
        </p>
      </div>
    );
  }

  if (!currentPalette) return null;

  return (
    <section className="card-result p-6 transition-all duration-200">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-wider text-[var(--warn)] uppercase">
              AI Colour Studio
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded font-medium border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-muted)]">
              {isFallbackMode ? 'Curated benchmark' : 'Gemini AI generated'}
            </span>
          </div>
          <h2 className="text-2xl font-serif text-[var(--brown)] font-bold">
            {currentPalette.name}
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1 max-w-2xl leading-relaxed">
            {currentPalette.description}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {historyIndex > 0 && (
            <button
              type="button"
              onClick={handlePrevious}
              disabled={isLoading || isRefining}
              className="btn-secondary btn-small min-h-[44px] flex items-center gap-1.5"
              title="Return to previous palette"
            >
              <span>Previous</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleShuffle}
            disabled={isLoading || isRefining}
            className="btn-secondary btn-small min-h-[44px] flex items-center gap-1.5 font-semibold text-[var(--brown)]"
            title="Generate a completely new AI palette"
          >
            {isLoading ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-[var(--brown)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Shuffle Palette</span>
            )}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || isRefining}
            className="btn-primary btn-small min-h-[44px] flex items-center gap-1.5"
            title="Save palette with this event"
          >
            <span>{isSaved ? 'Saved Palette' : 'Save Palette'}</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 mb-5 rounded bg-[var(--surface-alt)] border border-[var(--ok)] text-xs font-semibold text-[var(--ok)]">
          {notification}
        </div>
      )}

      {errorMessage && (
        <div className="p-3 mb-5 rounded bg-[var(--surface-alt)] border border-[var(--warn)] text-xs font-semibold text-[var(--warn)] flex items-center justify-between gap-2">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={handleShuffle}
            className="text-xs underline hover:no-underline font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Colour Swatches: 5-Col Grid with high visibility */}
      <div className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {currentPalette.colours.map((colour, idx) => {
            const isCopied = copiedHex === colour.hex;
            return (
              <div
                key={colour.hex + idx}
                className="rounded border border-[var(--border)] bg-[var(--surface)] p-3 flex flex-col justify-between hover:border-[var(--brown)] transition-all shadow-xs"
              >
                <div>
                  {/* Swatch Area with Copy action */}
                  <button
                    type="button"
                    onClick={() => handleCopyHex(colour.hex)}
                    className="w-full h-20 sm:h-24 rounded-sm border border-black/10 mb-2.5 relative group cursor-pointer overflow-hidden transition-transform active:scale-95"
                    style={{ backgroundColor: colour.hex }}
                    aria-label={`Copy hex code ${colour.hex}`}
                    title="Click to copy HEX code"
                  >
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold">
                      {isCopied ? 'Copied' : 'Click to copy HEX'}
                    </div>
                  </button>

                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-sm text-[var(--text)] truncate" title={colour.name}>
                      {colour.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyHex(colour.hex)}
                      className="font-mono text-xs font-bold text-[var(--maroon)] hover:underline tabular-nums"
                      title="Copy HEX"
                    >
                      {isCopied ? 'Copied' : colour.hex}
                    </button>
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed mb-2">
                    {colour.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--border)] text-[11px] text-[var(--brown)] font-medium">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Application:</span>
                  {colour.application}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Suggested Applications Grid */}
      {currentPalette.suggestedApplications && (
        <div className="mb-6 card p-4.5 bg-[var(--surface-alt)] border border-[var(--border)]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--brown)] mb-3">
            Suggested Event Applications
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs text-[var(--text)]">
            {currentPalette.suggestedApplications.decorations && (
              <div className="p-3 bg-[var(--surface)] rounded border border-[var(--border)]">
                <span className="font-semibold text-[var(--brown)] block mb-1">
                  Decorations & Backdrops
                </span>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  {currentPalette.suggestedApplications.decorations}
                </p>
              </div>
            )}

            {currentPalette.suggestedApplications.flowers && (
              <div className="p-3 bg-[var(--surface)] rounded border border-[var(--border)]">
                <span className="font-semibold text-[var(--brown)] block mb-1">
                  Flowers & Garlands
                </span>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  {currentPalette.suggestedApplications.flowers}
                </p>
              </div>
            )}

            {currentPalette.suggestedApplications.invitations && (
              <div className="p-3 bg-[var(--surface)] rounded border border-[var(--border)]">
                <span className="font-semibold text-[var(--brown)] block mb-1">
                  Invitations & Stationery
                </span>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  {currentPalette.suggestedApplications.invitations}
                </p>
              </div>
            )}

            {currentPalette.suggestedApplications.tableSettings && (
              <div className="p-3 bg-[var(--surface)] rounded border border-[var(--border)]">
                <span className="font-semibold text-[var(--brown)] block mb-1">
                  Table Settings & Linens
                </span>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  {currentPalette.suggestedApplications.tableSettings}
                </p>
              </div>
            )}

            {currentPalette.suggestedApplications.otherElements && (
              <div className="p-3 bg-[var(--surface)] rounded border border-[var(--border)] md:col-span-2 lg:col-span-2">
                <span className="font-semibold text-[var(--brown)] block mb-1">
                  Lighting, Signage & Accent Elements
                </span>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  {currentPalette.suggestedApplications.otherElements}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Palette Conversational Refinement Bar */}
      <div className="p-4 bg-[var(--surface)] rounded border border-[var(--border)]">
        <label htmlFor="paletteRefineInput" className="block text-xs font-semibold uppercase tracking-wider text-[var(--brown)] mb-1.5">
          Conversational Palette Refinement
        </label>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Type instructions to tweak tones, swap colors or change the visual mood (for example: "Make it more luxurious", "Replace pink with lavender", "Give it a pastel appearance").
        </p>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {quickRefinementChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleRefine(undefined, chip)}
              disabled={isRefining || isLoading}
              className="text-xs px-2.5 py-1 rounded bg-[var(--surface-alt)] hover:bg-[var(--border)] text-[var(--brown)] border border-[var(--border)] transition-colors min-h-[32px] text-left"
            >
              {chip}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => handleRefine(e)} className="flex flex-col sm:flex-row gap-2">
          <input
            id="paletteRefineInput"
            type="text"
            value={refineText}
            onChange={(e) => setRefineText(e.target.value)}
            disabled={isRefining || isLoading}
            placeholder="e.g. Replace yellow with rose gold and make the red deeper..."
            className="form-input flex-1 text-xs sm:text-sm min-h-[44px]"
          />
          <button
            type="submit"
            disabled={!refineText.trim() || isRefining || isLoading}
            className="btn-primary min-h-[44px] whitespace-nowrap text-xs font-semibold"
          >
            {isRefining ? 'Refining Palette...' : 'Refine Palette'}
          </button>
        </form>
      </div>
    </section>
  );
};

