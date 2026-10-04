import React from 'react';
import {
  FileText,
  FileCode2,
  Image as ImageIcon,
  Headphones,
  Database,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';

interface AnimatedKnowledgeVisualProps {
  compact?: boolean;
  className?: string;
}

export const AnimatedKnowledgeVisual: React.FC<AnimatedKnowledgeVisualProps> = ({
  compact = false,
  className = '',
}) => {
  return (
    <div
      id="animated-knowledge-visual"
      className={`relative w-full select-none flex items-center justify-center ${
        compact ? 'max-w-md h-[400px]' : 'max-w-xl h-[460px] sm:h-[500px]'
      } ${className}`}
    >
      {/* Background Soft Lighting Gradients */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
        <div className="w-80 h-80 rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="w-64 h-64 rounded-full bg-indigo-600/10 blur-[90px]" />
      </div>

      {/* SVG Canvas for Flowing Connection Lines & Orbital Rings */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cyanLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="violetLineGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Orbit Rings */}
        <circle
          cx="250"
          cy="250"
          r="180"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth="1"
          strokeDasharray="4 8"
          className="animate-subtle-spin"
        />
        <circle
          cx="250"
          cy="250"
          r="125"
          stroke="rgba(6, 182, 212, 0.15)"
          strokeWidth="1"
          strokeDasharray="3 6"
        />

        {/* Flowing Data Lines from Peripheral Cards to Center (250, 250) */}
        {/* PDF Top-Left (100, 100) -> Center */}
        <path
          d="M 115 110 Q 180 150 250 250"
          stroke="url(#cyanLineGrad)"
          strokeWidth="1.5"
          className="animate-dash-flow"
        />
        {/* DOCX Top-Right (400, 105) -> Center */}
        <path
          d="M 385 115 Q 330 160 250 250"
          stroke="url(#violetLineGrad)"
          strokeWidth="1.5"
          className="animate-dash-flow"
        />
        {/* Audio Bottom-Left (100, 390) -> Center */}
        <path
          d="M 120 380 Q 170 330 250 250"
          stroke="url(#cyanLineGrad)"
          strokeWidth="1.5"
          className="animate-dash-flow"
        />
        {/* Image Bottom-Right (395, 385) -> Center */}
        <path
          d="M 380 380 Q 325 330 250 250"
          stroke="url(#violetLineGrad)"
          strokeWidth="1.5"
          className="animate-dash-flow"
        />
        {/* Document Top Center (250, 60) -> Center */}
        <path
          d="M 250 85 L 250 250"
          stroke="rgba(6, 182, 212, 0.3)"
          strokeWidth="1"
          className="animate-dash-flow"
        />
      </svg>

      {/* Floating Particles */}
      <div className="absolute top-1/4 left-1/3 w-1.5 h-1.5 rounded-full bg-cyan-400/60 blur-[0.5px] animate-float-slow" />
      <div className="absolute bottom-1/3 right-1/4 w-2 h-2 rounded-full bg-indigo-400/60 blur-[0.5px] animate-float-reverse" />
      <div className="absolute top-2/3 left-1/5 w-1 h-1 rounded-full bg-cyan-300/70 animate-float-slow" />
      <div className="absolute top-1/6 right-1/3 w-1.5 h-1.5 rounded-full bg-emerald-400/50 animate-float-reverse" />

      {/* 1. CENTRAL GLOWING LOCALIQ KNOWLEDGE CORE */}
      <div
        id="knowledge-core"
        className="relative z-20 flex flex-col items-center justify-center"
      >
        {/* Core Outer Aura */}
        <div className="absolute w-36 h-36 rounded-full bg-gradient-to-tr from-cyan-500/20 via-indigo-600/20 to-transparent blur-xl animate-core-pulse pointer-events-none" />

        {/* Core Main Hexagonal / Circular Vessel */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#08131E] border-2 border-cyan-400/40 flex flex-col items-center justify-center p-3 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl group cursor-default">
          {/* Subtle inner grid lines */}
          <div className="absolute inset-0 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:8px_8px] opacity-20 rounded-3xl" />
          
          <div className="relative z-10 flex flex-col items-center space-y-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 via-teal-400 to-indigo-500 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-400/40">
              <Cpu className="w-4 h-4 text-[#05080D] stroke-[2.5]" />
            </div>
            <div className="text-center pt-1">
              <span className="text-[11px] font-mono font-bold tracking-wider text-white">
                LOCALIQ
              </span>
              <div className="flex items-center justify-center gap-1 text-[8px] font-mono text-cyan-400">
                <span className="w-1 h-1 rounded-full bg-cyan-400 animate-ping" />
                <span>CORE AI</span>
              </div>
            </div>
          </div>

          {/* Micro status ticker on bottom */}
          <div className="absolute -bottom-3 px-2 py-0.5 rounded-full bg-[#071018] border border-cyan-500/40 text-[9px] font-mono text-cyan-300 shadow-md">
            100% LOCAL
          </div>
        </div>
      </div>

      {/* 2. SURROUNDING FLOATING ASSET PANELS */}

      {/* Asset 1: PDF (Top Left) */}
      <div className="absolute top-6 left-2 sm:left-6 z-10 animate-float-slow">
        <div className="p-3 rounded-2xl bg-[#09121C]/90 border border-white/10 hover:border-cyan-500/40 shadow-xl shadow-black/60 backdrop-blur-md flex items-center gap-2.5 transition-colors">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-left font-mono">
            <div className="text-[11px] font-semibold text-slate-200">Quarterly_Report.pdf</div>
            <div className="text-[9px] text-slate-500 flex items-center gap-1.5">
              <span>54 Pages</span>
              <span>•</span>
              <span className="text-cyan-400">Chunked & Vectorized</span>
            </div>
          </div>
        </div>
      </div>

      {/* Asset 2: DOCX (Top Right) */}
      <div className="absolute top-8 right-2 sm:right-6 z-10 animate-float-reverse">
        <div className="p-3 rounded-2xl bg-[#09121C]/90 border border-white/10 hover:border-indigo-500/40 shadow-xl shadow-black/60 backdrop-blur-md flex items-center gap-2.5 transition-colors">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <FileCode2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-left font-mono">
            <div className="text-[11px] font-semibold text-slate-200">System_Architecture.docx</div>
            <div className="text-[9px] text-slate-500 flex items-center gap-1.5">
              <span>Local Extraction</span>
              <span>•</span>
              <span className="text-emerald-400">Indexed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Asset 3: AUDIO (Bottom Left) */}
      <div className="absolute bottom-10 left-3 sm:left-8 z-10 animate-float-reverse">
        <div className="p-3 rounded-2xl bg-[#09121C]/90 border border-white/10 hover:border-amber-500/40 shadow-xl shadow-black/60 backdrop-blur-md flex items-center gap-2.5 transition-colors">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Headphones className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-left font-mono">
            <div className="text-[11px] font-semibold text-slate-200">Client_Meeting.mp3</div>
            <div className="text-[9px] text-slate-500 flex items-center gap-1.5">
              <span>Transcript Synchronized</span>
              <span>•</span>
              <span className="text-cyan-400">0s Latency</span>
            </div>
          </div>
        </div>
      </div>

      {/* Asset 4: IMAGE (Bottom Right) */}
      <div className="absolute bottom-8 right-3 sm:right-8 z-10 animate-float-slow">
        <div className="p-3 rounded-2xl bg-[#09121C]/90 border border-white/10 hover:border-emerald-500/40 shadow-xl shadow-black/60 backdrop-blur-md flex items-center gap-2.5 transition-colors">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ImageIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-left font-mono">
            <div className="text-[11px] font-semibold text-slate-200">Circuit_Schematic.png</div>
            <div className="text-[9px] text-slate-500 flex items-center gap-1.5">
              <span>Visual Features</span>
              <span>•</span>
              <span className="text-indigo-400">Local OCR</span>
            </div>
          </div>
        </div>
      </div>

      {/* Asset 5: DOCUMENT Knowledge Pipeline Badge (Bottom Center) */}
      <div className="absolute -bottom-2 z-10">
        <div className="px-3.5 py-1.5 rounded-xl bg-[#071018]/90 border border-cyan-500/20 shadow-lg text-[10px] font-mono text-slate-300 flex items-center gap-2 backdrop-blur-md">
          <span className="text-cyan-400 font-semibold">Document</span>
          <span className="text-slate-600">→</span>
          <span className="text-slate-400">Local Processing</span>
          <span className="text-slate-600">→</span>
          <span className="text-indigo-400 font-semibold">Knowledge</span>
          <span className="text-slate-600">→</span>
          <span className="text-cyan-300 font-bold">AI</span>
        </div>
      </div>
    </div>
  );
};
