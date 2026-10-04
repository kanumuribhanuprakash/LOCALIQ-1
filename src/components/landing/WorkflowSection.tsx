import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  Cpu,
  Database,
  Bot,
  Layers,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';

export const WorkflowSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  const workflowSteps = [
    {
      stepNumber: '01',
      title: 'ADD KNOWLEDGE',
      subtitle: 'Multimodal Ingestion',
      icon: UploadCloud,
      description:
        'Drop confidential PDFs, Word documents, PNG/JPG engineering schematics, and audio records directly into your encrypted local client vault.',
      technicalDetails: 'Streaming client buffer • SHA-256 integrity hash • Zero network packet transmission',
    },
    {
      stepNumber: '02',
      title: 'EXTRACT & CHUNK',
      subtitle: 'Structural Parsing',
      icon: FileText,
      description:
        'Text extraction and OCR engines unpack structure, headings, page offsets, and semantic units into optimal 512-token retrieval windows with overlap.',
      technicalDetails: 'Client-side PDF.js & text parsers • 64-token boundary overlap • Page & sentence provenance',
    },
    {
      stepNumber: '03',
      title: 'EMBED LOCALLY',
      subtitle: 'On-Device Representations',
      icon: Cpu,
      description:
        'Local neural embedding models compute dense high-dimensional semantic representations directly on your device CPU or WebAssembly engine.',
      technicalDetails: '384-dimensional dense vectors • Zero server latency • Hardware accelerated inference',
    },
    {
      stepNumber: '04',
      title: 'INDEX',
      subtitle: 'Browser Vector Storage',
      icon: Database,
      description:
        'Vectors and metadata are committed to your private in-browser IndexedDB repository, creating an isolated semantic index per workspace.',
      technicalDetails: 'IndexedDB persistent storage • Cosine similarity index • Complete per-user cryptographic isolation',
    },
    {
      stepNumber: '05',
      title: 'ASK LOCALIQ',
      subtitle: 'Contextual Retrieval & Synthesis',
      icon: Bot,
      description:
        'Ask questions naturally. LOCALIQ finds the most relevant evidence chunks and synthesizes precise answers with 1-click verifiable source audits.',
      technicalDetails: 'Deterministic ranking • Verifiable source cards • Confidence metrics & exact page quotes',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-28 relative border-t border-white/5 bg-[#05080D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#091522] border border-cyan-500/25 text-xs font-semibold text-cyan-400 font-mono uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" />
            <span>LOCAL EXECUTION PIPELINE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
            How LOCALIQ Works
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            A deterministic, 100% on-device pipeline from document ingest to verifiable intelligence.
          </p>
        </div>

        {/* Technical Pipeline Grid with Animated Connector Line */}
        <div className="mb-10 relative">
          
          {/* Animated SVG Connector Line Across Desktop */}
          <div className="hidden lg:block absolute top-[44px] left-[5%] right-[5%] h-1 pointer-events-none z-0">
            <svg className="w-full h-4 overflow-visible" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line
                x1="0"
                y1="2"
                x2="100%"
                y2="2"
                stroke="rgba(6, 182, 212, 0.25)"
                strokeWidth="2"
                strokeDasharray="6 6"
                className="animate-dash-flow"
              />
            </svg>
          </div>

          {/* Step Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
            {workflowSteps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeStep === idx;
              return (
                <div
                  key={step.stepNumber}
                  onClick={() => setActiveStep(idx)}
                  className={`flex flex-col text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer group relative ${
                    isActive
                      ? 'bg-[#091522] border-cyan-500/60 shadow-xl shadow-cyan-500/10 scale-[1.02]'
                      : 'bg-[#071018] border-white/5 hover:border-white/15 hover:bg-[#0A131F]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono tracking-widest text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                      STEP {step.stepNumber}
                    </span>
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                        isActive
                          ? 'bg-gradient-to-br from-cyan-400 to-indigo-600 text-slate-950 font-bold'
                          : 'bg-[#0D1824] text-cyan-400 border border-cyan-500/20'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-white font-mono tracking-wider mb-1">
                    {step.title}
                  </h3>
                  <div className="text-[11px] text-cyan-300/80 font-medium mb-2.5">
                    {step.subtitle}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Step Technical Drill-Down Panel */}
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-6 sm:p-8 rounded-3xl bg-[#08121D] border border-cyan-500/25 shadow-xl relative overflow-hidden text-left"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                  STEP {workflowSteps[activeStep].stepNumber} — {workflowSteps[activeStep].title}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {workflowSteps[activeStep].subtitle}
                </span>
              </div>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                {workflowSteps[activeStep].description}
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs font-mono text-cyan-400">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{workflowSteps[activeStep].technicalDetails}</span>
              </div>
            </div>

            <div className="lg:col-span-4 flex items-center justify-end gap-3">
              <button
                disabled={activeStep === 0}
                onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
                className="p-2.5 rounded-xl bg-[#0D1824] hover:bg-[#122030] disabled:opacity-30 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                title="Previous step"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-mono text-slate-400 px-2">
                0{activeStep + 1} / 05
              </span>
              <button
                disabled={activeStep === workflowSteps.length - 1}
                onClick={() => setActiveStep(prev => Math.min(workflowSteps.length - 1, prev + 1))}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-30 text-white transition-colors cursor-pointer shadow-md shadow-cyan-500/20"
                title="Next step"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};
