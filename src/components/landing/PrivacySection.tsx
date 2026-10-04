import React from 'react';
import {
  ShieldCheck,
  HardDrive,
  Lock,
  EyeOff,
  ServerOff,
  ArrowRight,
  FileText,
  Cpu,
  Database,
  Bot,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const PrivacySection: React.FC = () => {
  const { setCurrentView } = useApp();

  const privacyGuarantees = [
    {
      title: 'Zero Cloud Telemetry',
      desc: 'No tracking beacons, no analytics logs, no background network pings. Your application runs as a self-contained local enclave.',
      icon: ServerOff,
      metric: '0 KB Outbound',
    },
    {
      title: 'No Model Training',
      desc: 'Your proprietary research, contracts, blueprints, and records are NEVER scraped, harvested, or fed into global model training sets.',
      icon: EyeOff,
      metric: '100% Private',
    },
    {
      title: 'No External Transmission',
      desc: 'Embeddings, vector indexing, text chunking, and similarity math occur directly inside your browser process memory.',
      icon: Lock,
      metric: 'Air-Gapped Ready',
    },
    {
      title: 'Local-Only Execution',
      desc: 'Persistence uses encrypted browser IndexedDB and Web Crypto primitives. You own the keys and the storage directory.',
      icon: HardDrive,
      metric: 'On-Device RAM',
    },
  ];

  return (
    <section id="privacy" className="py-20 lg:py-28 relative border-t border-white/5 bg-[#05080D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#091522] border border-cyan-500/25 text-xs font-semibold text-cyan-400 font-mono uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>UNCOMPROMISED DATA SOVEREIGNTY</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
            Your knowledge belongs to you.
          </h2>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
            Unlike cloud-hosted AI tools that stream confidential data over third-party networks, LOCALIQ executes in your private custody.
          </p>
        </div>

        {/* Visual Technical Pipeline Diagram */}
        <div className="mb-16 p-6 sm:p-10 rounded-3xl bg-[#08121D] border border-cyan-500/20 shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-cyan-500/10 blur-[100px] pointer-events-none" />

          <div className="text-center mb-8">
            <span className="text-[11px] font-mono tracking-widest text-slate-400 uppercase font-semibold">
              LOCAL ISOLATION FLOW (NO EXTERNAL SERVERS)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
            {/* Step 1: Your Files */}
            <div className="p-5 rounded-2xl bg-[#071018] border border-white/5 flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-mono tracking-wider">YOUR FILES</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  PDF, DOCX, TXT, Images, Audio on your disk
                </p>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                In-Memory Stream
              </span>
            </div>

            {/* Step 2: Local Processing */}
            <div className="p-5 rounded-2xl bg-[#071018] border border-cyan-500/30 flex flex-col items-center text-center space-y-3 relative">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/15">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-mono tracking-wider">LOCAL PROCESSING</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Client-side chunking & neural embeddings
                </p>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300">
                WASM / Hardware Accelerated
              </span>
            </div>

            {/* Step 3: Local Knowledge Index */}
            <div className="p-5 rounded-2xl bg-[#071018] border border-white/5 flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-mono tracking-wider">LOCAL KNOWLEDGE INDEX</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Isolated in-browser IndexedDB repository
                </p>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300">
                PBKDF2 Salted Storage
              </span>
            </div>

            {/* Step 4: LOCALIQ */}
            <div className="p-5 rounded-2xl bg-[#091522] border border-cyan-400/40 flex flex-col items-center text-center space-y-3 shadow-lg shadow-cyan-500/15">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center text-slate-950 font-bold shadow-md">
                <Bot className="w-6 h-6 text-[#05080D]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-mono tracking-wider">LOCALIQ</h4>
                <p className="text-[11px] text-cyan-300 mt-1">
                  Direct intelligence with verified citations
                </p>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-400/15 text-cyan-200 font-semibold">
                Sovereign Workspace
              </span>
            </div>
          </div>

          {/* Privacy Security Status Banner */}
          <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-semibold">ISOLATION METRIC: 0 BYTE EXFILTRATION RISK</span>
            </div>
            <div className="text-slate-400">
              All computations stay on your local CPU & RAM.
            </div>
          </div>
        </div>

        {/* 4 Trust Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {privacyGuarantees.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#071018] border border-white/5 hover:border-cyan-500/30 transition-all text-left space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {item.metric}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white font-mono tracking-wide">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
