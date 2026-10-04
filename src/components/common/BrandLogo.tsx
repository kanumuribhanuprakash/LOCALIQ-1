import React from 'react';
import { ShieldCheck, Cpu } from 'lucide-react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showTagline = false,
  className = '',
  onClick,
}) => {
  const boxSize = size === 'sm' ? 'w-8 h-8 rounded-lg' : size === 'lg' ? 'w-11 h-11 rounded-xl' : 'w-9 h-9 rounded-xl';
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <div
      id="brand-logo-container"
      onClick={onClick}
      className={`flex items-center gap-3 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Sleek Cyan / Indigo Hexagonal Core Box */}
      <div className={`${boxSize} relative bg-gradient-to-br from-[#071726] via-[#0B253A] to-[#121B2A] border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10 shrink-0 transition-transform duration-200 hover:scale-105 group overflow-hidden`}>
        {/* Ambient Corner Flare */}
        <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-cyan-400/40 rounded-full blur-xs" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-500/10 to-indigo-500/20 pointer-events-none" />
        
        {/* Core Glyph */}
        <span className="font-mono font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300 tracking-tighter text-sm">
          LQ
        </span>

        {/* Subtle active status beacon dot */}
        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80 animate-pulse" />
      </div>

      {/* Brand Text */}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span className={`font-bold tracking-tight text-white font-sans ${textSize}`}>
            LOCALIQ
          </span>
          <span className="text-[9px] uppercase font-mono tracking-[0.18em] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 font-semibold">
            LOCAL AI
          </span>
        </div>
        <span className="text-[9px] text-slate-400 tracking-[0.22em] uppercase font-mono font-medium">
          {showTagline ? 'Your knowledge. Your AI. Your privacy.' : 'PRIVATE INTELLIGENCE WORKSPACE'}
        </span>
      </div>
    </div>
  );
};


