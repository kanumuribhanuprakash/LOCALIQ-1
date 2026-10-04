import React from 'react';
import {
  Shield,
  Layers,
  Bot,
  Quote,
  CheckCircle2,
  FileText,
  FileCode,
  Image as ImageIcon,
  Headphones,
  Sparkles,
  Search,
  HardDrive,
} from 'lucide-react';
import { motion } from 'motion/react';

export const FeatureCards: React.FC = () => {
  const multimodalTypes = [
    {
      format: 'PDF',
      title: 'PDF Documents',
      badge: 'Vectorized',
      icon: FileText,
      accent: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      description: 'Annual reports, contracts, manuals, scientific whitepapers with multi-page table and layout analysis.',
      meta: 'PDF.js local stream parser',
    },
    {
      format: 'DOCX',
      title: 'Word Documents',
      badge: 'Parsed',
      icon: FileCode,
      accent: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      description: 'Structured prose, memos, requirements, specifications, and project management roadmaps.',
      meta: 'Heading & section hierarchy',
    },
    {
      format: 'TXT',
      title: 'Plain Text & Markdown',
      badge: 'Direct Stream',
      icon: FileText,
      accent: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      description: 'Raw notes, meeting summaries, code snippets, logs, and structured markdown outlines.',
      meta: 'Zero-overhead ingestion',
    },
    {
      format: 'IMAGE',
      title: 'Visual Assets',
      badge: 'Visual OCR',
      icon: ImageIcon,
      accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      description: 'PNG, JPG, schematics, system architecture diagrams, and handwritten notes.',
      meta: 'Spatial caption & text OCR',
    },
    {
      format: 'AUDIO',
      title: 'Voice & Recordings',
      badge: 'Transcribed',
      icon: Headphones,
      accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      description: 'MP3, WAV, voice memos, interviews, board discussions, and synced timestamp segments.',
      meta: 'Temporal chunking & search',
    },
  ];

  const features = [
    {
      id: 'feature-private-knowledge',
      title: 'Private Knowledge',
      subtitle: 'Zero cloud telemetry',
      description:
        'Your intellectual property, proprietary research, and confidential files stay 100% on your machine. No cloud uploads, no third-party training, and zero leakage risk.',
      icon: Shield,
      badge: 'Local-First Vault',
      points: ['Local cryptographic vault', 'Zero outbound network calls', 'Complete device isolation'],
    },
    {
      id: 'feature-semantic-search',
      title: 'Semantic Search Engine',
      subtitle: 'Find meaning, not just keywords',
      description:
        'Locate relevant information even when different terminology is used. High-dimensional vector retrieval connects questions with concepts across your entire library.',
      icon: Search,
      badge: 'Vector Intelligence',
      points: ['Cosine similarity match', 'Sub-millisecond latency', 'Multi-document synthesis'],
    },
    {
      id: 'feature-ai-assistant',
      title: 'Grounded Assistant',
      subtitle: 'Contextual reasoning with citations',
      description:
        'Engage in natural dialogues with an assistant that knows your private context inside and out. Synthesizes answers strictly supported by your documents.',
      icon: Bot,
      badge: 'RAG Architecture',
      points: ['Direct context grounding', 'Hallucination suppression', 'Transparent provenance'],
    },
    {
      id: 'feature-source-citations',
      title: 'Verifiable Evidence',
      subtitle: 'Auditable & transparent',
      description:
        'Never guess where an answer came from. Every synthesized claim features clickable source chips with exact page numbers, visual coordinates, and excerpts.',
      icon: Quote,
      badge: 'Fact Grounding',
      points: ['Exact page references', 'Verbatim excerpt cards', 'Similarity confidence scores'],
    },
  ];

  return (
    <div className="bg-[#05080D]">
      {/* 1. Core Capabilities Section */}
      <section id="features" className="py-20 lg:py-24 relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#091522] border border-cyan-500/25 text-xs font-semibold text-cyan-400 font-mono uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CORE WORKSPACE CAPABILITIES</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
              Precision Intelligence. Total Privacy.
            </h2>
            <p className="text-slate-400 text-base sm:text-lg">
              Enterprise-grade retrieval-augmented generation built for strict privacy mandates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.id}
                  id={feature.id}
                  className="p-8 rounded-3xl bg-[#08121D] border border-white/5 hover:border-cyan-500/30 transition-all duration-200 shadow-xl flex flex-col justify-between text-left group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-2xl bg-[#0B1826] border border-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-mono font-medium px-3 py-1 rounded-full bg-[#050C14] text-cyan-300 border border-cyan-500/20">
                        {feature.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">
                        {feature.title}
                      </h3>
                      <p className="text-xs font-mono text-cyan-400 mt-1">
                        {feature.subtitle}
                      </p>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-white/5 space-y-2">
                    {feature.points.map((pt, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. Dedicated MULTIMODAL Section (11. MULTIMODAL SECTION) */}
      <section id="multimodal" className="py-20 lg:py-24 relative border-t border-white/5 bg-[#071018]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#091522] border border-cyan-500/25 text-xs font-semibold text-cyan-400 font-mono uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              <span>SUPPORTED KNOWLEDGE TYPES</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
              Universal Multimodal Ingestion
            </h2>
            <p className="text-slate-400 text-base sm:text-lg">
              Seamlessly unify documents, diagrams, recordings, and text into one searchable knowledge vault.
            </p>
          </div>

          {/* Floating File Representation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {multimodalTypes.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-[#0A131F] border border-white/5 hover:border-cyan-500/40 hover:-translate-y-1 transition-all duration-300 shadow-xl flex flex-col justify-between text-left group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${item.accent}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#060D15] text-slate-400 border border-white/5 font-semibold">
                        {item.format}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white font-mono">{item.title}</h4>
                      <p className="text-[11px] text-cyan-400 font-mono mt-0.5">{item.badge}</p>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 text-[10px] font-mono text-slate-500">
                    {item.meta}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>
    </div>
  );
};
