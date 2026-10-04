import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Lock,
  Play,
  CheckCircle2,
  HardDrive,
  Layers,
  Search,
  Cpu,
  FileCheck2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedKnowledgeVisual } from './AnimatedKnowledgeVisual';

export const LandingHero: React.FC = () => {
  const { setCurrentView, handleQuickDemoAccess } = useApp();
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  const featureStripItems = [
    {
      id: 'strip-local',
      title: '100% Local',
      desc: 'No cloud dependency.',
      icon: HardDrive,
    },
    {
      id: 'strip-multimodal',
      title: 'Multi-Modal',
      desc: 'PDF, DOCX, images & audio.',
      icon: Layers,
    },
    {
      id: 'strip-private',
      title: 'Private Knowledge',
      desc: 'Your data stays on your device.',
      icon: Lock,
    },
    {
      id: 'strip-semantic',
      title: 'Semantic Search',
      desc: 'Find meaning, not just keywords.',
      icon: Search,
    },
    {
      id: 'strip-rag',
      title: 'RAG Ready',
      desc: 'Grounded answers from knowledge.',
      icon: Cpu,
    },
  ];

  return (
    <section id="hero-section" className="relative pt-8 pb-16 lg:pt-14 lg:pb-24 overflow-hidden bg-[#05080D]">
      {/* Background Gradients & Ambient Lighting */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[450px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[350px] bg-indigo-600/10 rounded-full blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cinematic Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* LEFT COLUMN: Copy, Badges & Actions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6 space-y-6 text-left"
          >
            {/* Small status badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#091522] border border-cyan-500/30 text-xs font-mono text-cyan-300 shadow-sm shadow-cyan-500/10">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-bold tracking-wider uppercase text-[11px]">LOCAL AI</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">NO CLOUD</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-semibold">FULL PRIVACY</span>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white font-sans leading-[1.1]">
              Your knowledge.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">
                Your AI.
              </span>{' '}
              <br className="hidden sm:inline" />
              Kept private.
            </h1>

            {/* Supporting copy */}
            <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed font-normal">
              Ask questions across your documents, images and recordings — without sending your private knowledge to the cloud.
            </p>

            {/* Buttons: Primary with subtle animated glow + Watch Demo */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                id="hero-create-workspace-btn"
                onClick={() => setCurrentView('signup')}
                className="relative group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 rounded-xl shadow-xl shadow-cyan-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                {/* Subtle animated button border glow */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-xl blur-xs opacity-60 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                <span>Create Your Workspace</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                id="hero-watch-demo-btn"
                onClick={() => setDemoModalOpen(true)}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-semibold text-slate-200 hover:text-white bg-[#0D1520] hover:bg-[#121D2C] border border-white/10 hover:border-cyan-500/30 rounded-xl transition-all duration-200 cursor-pointer shadow-sm"
              >
                <div className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Play className="w-3 h-3 fill-cyan-400 ml-0.5" />
                </div>
                <span>Watch Demo</span>
              </button>
            </div>

            {/* Verification highlights */}
            <div className="pt-3 flex flex-wrap items-center gap-5 text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Client-Side Embeddings</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>IndexedDB In-Browser Vector Store</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verifiable Source Chunks</span>
              </div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN: MAIN WOW ELEMENT — ANIMATED KNOWLEDGE VISUALIZATION */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="lg:col-span-6 flex items-center justify-center relative"
          >
            <AnimatedKnowledgeVisual />
          </motion.div>

        </div>

        {/* 8. LANDING FEATURE STRIP (Below Hero) */}
        <div className="mt-16 sm:mt-20 pt-10 border-t border-white/5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {featureStripItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#09121C]/80 border border-white/5 hover:border-cyan-500/30 transition-all duration-200 text-left space-y-1.5 group"
                >
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-slate-100 font-mono tracking-wide">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug">
                    {item.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Demo Modal Dialog */}
      <AnimatePresence>
        {demoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl p-6 rounded-3xl bg-[#0B1522] border border-cyan-500/30 shadow-2xl shadow-black/80 space-y-5 relative text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <h3 className="text-base font-bold text-white font-mono">LOCALIQ Interactive Enclave Demo</h3>
                </div>
                <button
                  onClick={() => setDemoModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Experience on-device retrieval immediately. You can test LOCALIQ in demo mode without creating an account—with preloaded sample documents, local embeddings, and instant semantic search.
              </p>

              <div className="p-4 rounded-2xl bg-[#060D15] border border-white/5 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Execution Sandbox:</span>
                  <span className="text-emerald-400 font-semibold">100% In-Browser</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Storage Engine:</span>
                  <span className="text-cyan-400 font-semibold">IndexedDB Encrypted Vault</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Inference Hardware:</span>
                  <span className="text-slate-200 font-semibold">Client CPU / WebAssembly</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDemoModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    setDemoModalOpen(false);
                    await handleQuickDemoAccess();
                  }}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-xl shadow-lg shadow-cyan-500/20 hover:scale-[1.02] cursor-pointer"
                >
                  Launch Demo Enclave →
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

