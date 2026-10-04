import React from 'react';
import { BrandLogo } from '../common/BrandLogo';
import { ShieldCheck, Heart, Github, Terminal, ArrowUpRight, Lock, Radio } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const LandingFooter: React.FC = () => {
  const { setCurrentView } = useApp();

  return (
    <footer id="landing-footer" className="border-t border-white/5 bg-[#03060A] text-slate-400 text-sm select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          
          {/* Brand & Mission */}
          <div className="md:col-span-5 space-y-4">
            <BrandLogo showTagline size="md" />
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              LOCALIQ is a private intelligence workspace designed for on-device retrieval, zero-cloud data transmission, and verifiable source provenance.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>Client Vault v2.4 (Active)</span>
              </span>
              <span>•</span>
              <span className="text-slate-500">100% Browser-Local & WASM</span>
            </div>
          </div>

          {/* Supported Multimodal Formats */}
          <div id="supported-formats" className="md:col-span-3 space-y-3">
            <h5 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Supported Formats
            </h5>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>PDF Documents & Reports</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>DOC & DOCX Word Files</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>TXT & Markdown Notes</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>PNG, JPG, JPEG Diagrams</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>MP3 & WAV Audio Transcripts</span>
              </li>
            </ul>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-2 space-y-3">
            <h5 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Workspace
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => setCurrentView('signup')}
                  className="hover:text-cyan-400 transition-colors text-left cursor-pointer"
                >
                  Create Workspace
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView('signin')}
                  className="hover:text-cyan-400 transition-colors text-left cursor-pointer"
                >
                  Sign In
                </button>
              </li>
              <li>
                <a href="#features" className="hover:text-cyan-400 transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#multimodal" className="hover:text-cyan-400 transition-colors">
                  Multimodal Support
                </a>
              </li>
            </ul>
          </div>

          {/* Privacy & Governance */}
          <div className="md:col-span-2 space-y-3">
            <h5 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Privacy Governance
            </h5>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5 text-cyan-300">
                <Lock className="w-3 h-3 text-cyan-400" />
                <span>Local-Only Execution</span>
              </li>
              <li className="text-slate-400">Zero Analytics</li>
              <li className="text-slate-400">No Model Training</li>
              <li className="text-slate-400">PBKDF2 Enclave</li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 LOCALIQ. All knowledge remains strictly in user custody on this device.</p>
          <div className="flex items-center gap-6">
            <span className="text-cyan-400/80 font-mono">Private Intelligence Workspace</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
