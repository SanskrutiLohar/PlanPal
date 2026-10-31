import React, { useState } from 'react';
import { VisualInspiration } from '../types/plan';

interface VisualInspirationCardProps {
  visualInspiration?: VisualInspiration;
  className?: string;
}

export const VisualInspirationCard: React.FC<VisualInspirationCardProps> = ({
  visualInspiration,
  className = '',
}) => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  if (!visualInspiration) {
    return null;
  }

  const handleCopyHex = (hex: string) => {
    navigator.clipboard?.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  return (
    <div
      className={`border border-[#DDD0BD] rounded-sm bg-[#FCF9F3] p-5 md:p-6 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#EFE6D8]">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-[#A8641A] uppercase block">
            Visual Theme & Styling Concept
          </span>
          <h3 className="font-serif text-xl font-bold text-[#7A1F2B] mt-0.5">
            {visualInspiration.themeName}
          </h3>
        </div>
        <span className="text-xs bg-[#F6F0E6] text-[#5A3E2B] px-2.5 py-1 rounded-sm border border-[#DDD0BD] font-medium">
          Coordinated Palette
        </span>
      </div>

      {/* Palette Swatches */}
      {visualInspiration.palette && visualInspiration.palette.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#5A3E2B] mb-2 uppercase tracking-wide">
            Color Palette
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
            {visualInspiration.palette.map((item, idx) => {
              const isCopied = copiedHex === item.hex;
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleCopyHex(item.hex)}
                  title={`Click to copy ${item.hex}`}
                  className="group flex flex-col text-left p-2 rounded-sm border border-[#DDD0BD] bg-[#FAF5ED] hover:bg-[#F2E8D7] transition-colors"
                >
                  <div
                    className="h-10 w-full rounded-xs border border-[#C5B49E]/50 mb-1.5 shadow-inner"
                    style={{ backgroundColor: item.hex }}
                  />
                  <span className="text-xs font-semibold text-[#2C2117] truncate leading-tight">
                    {item.name}
                  </span>
                  <span className="text-[11px] text-[#7A6B5D] font-mono mt-0.5 group-hover:text-[#7A1F2B]">
                    {isCopied ? 'Copied' : item.hex}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stage, Table & Floral Layouts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="p-3.5 bg-[#FAF5ED] rounded-sm border border-[#E8DCB8]/60">
          <h4 className="font-semibold text-xs uppercase tracking-wide text-[#7A1F2B] mb-1">
            Stage & Backdrop
          </h4>
          <p className="text-xs text-[#4A3B2C] leading-relaxed">
            {visualInspiration.stageConcept}
          </p>
        </div>

        <div className="p-3.5 bg-[#FAF5ED] rounded-sm border border-[#E8DCB8]/60">
          <h4 className="font-semibold text-xs uppercase tracking-wide text-[#7A1F2B] mb-1">
            Table & Seating Setting
          </h4>
          <p className="text-xs text-[#4A3B2C] leading-relaxed">
            {visualInspiration.tableSetting}
          </p>
        </div>

        <div className="p-3.5 bg-[#FAF5ED] rounded-sm border border-[#E8DCB8]/60">
          <h4 className="font-semibold text-xs uppercase tracking-wide text-[#7A1F2B] mb-1">
            Floral & Evening Lighting
          </h4>
          <p className="text-xs text-[#4A3B2C] leading-relaxed">
            {visualInspiration.floralAndLighting}
          </p>
        </div>
      </div>
    </div>
  );
};
