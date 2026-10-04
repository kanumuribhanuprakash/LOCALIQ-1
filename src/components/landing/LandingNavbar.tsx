import React, { useState } from 'react';
import { BrandLogo } from '../common/BrandLogo';
import { useApp } from '../../context/AppContext';
import { ArrowRight, Lock, Menu, X, ShieldCheck, Sparkles, Cpu, Radio } from 'lucide-react';

export const LandingNavbar: React.FC = () => {
  const { setCurrentView } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header id="landing-navbar" className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#05080D]/85 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* LEFT: LOCALIQ logo */}
        <BrandLogo onClick={() => setCurrentView('landing')} size="md" />

        {/* CENTER: Features | How It Works | Privacy | Multimodal | About */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-medium text-slate-300">
          <a
            href="#features"
            className="hover:text-cyan-400 transition-colors duration-150 py-1"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="hover:text-cyan-400 transition-colors duration-150 py-1"
          >
            How It Works
          </a>
          <a
            href="#privacy"
            className="hover:text-cyan-400 transition-colors duration-150 py-1"
          >
            Privacy
          </a>
          <a
            href="#multimodal"
            className="hover:text-cyan-400 transition-colors duration-150 py-1"
          >
            Multimodal
          </a>
          <a
            href="#about"
            className="hover:text-cyan-400 transition-colors duration-150 py-1"
          >
            About
          </a>
        </nav>

        {/* RIGHT: LOCAL status indicator | Get Started */}
        <div className="hidden sm:flex items-center gap-4">
          {/* LOCAL status indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#091522] border border-cyan-500/25 text-[11px] font-mono text-cyan-300 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-semibold tracking-wider uppercase">LOCAL STATUS: ACTIVE</span>
          </div>

          <button
            id="nav-signin-btn"
            onClick={() => setCurrentView('signin')}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            Sign In
          </button>
          
          <button
            id="nav-get-started-btn"
            onClick={() => setCurrentView('signup')}
            className="group relative inline-flex items-center gap-2 px-4.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 rounded-xl shadow-lg shadow-cyan-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <button
            id="mobile-menu-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 focus:outline-none cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-white/5 bg-[#071018]/98 backdrop-blur-xl px-4 pt-3 pb-6 space-y-3">
          {/* Mobile Local Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#091522] border border-cyan-500/20 text-[11px] font-mono text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>LOCAL STATUS: ACTIVE (ON-DEVICE)</span>
          </div>

          <div className="flex flex-col space-y-2 text-slate-200 text-xs font-medium pt-1">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-white/5"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-white/5"
            >
              How It Works
            </a>
            <a
              href="#privacy"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-white/5"
            >
              Privacy
            </a>
            <a
              href="#multimodal"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-white/5"
            >
              Multimodal
            </a>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-white/5"
            >
              About
            </a>
          </div>
          <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setCurrentView('signin');
              }}
              className="w-full py-2.5 text-center text-xs font-medium text-slate-200 bg-[#0D1520] hover:bg-white/5 rounded-xl border border-white/10"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setCurrentView('signup');
              }}
              className="w-full py-2.5 text-center text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-xl"
            >
              Get Started →
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

