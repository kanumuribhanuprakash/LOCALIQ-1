import React from 'react';
import { LandingNavbar } from './LandingNavbar';
import { LandingHero } from './LandingHero';
import { FeatureCards } from './FeatureCards';
import { WorkflowSection } from './WorkflowSection';
import { PrivacySection } from './PrivacySection';
import { LandingFooter } from './LandingFooter';
import { ArrowRight, ShieldCheck, Sparkles, Cpu, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const LandingPage: React.FC = () => {
  const { setCurrentView } = useApp();

  return (
    <div id="landing-page-root" className="min-h-screen bg-[#05080D] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-white">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <FeatureCards />
        <WorkflowSection />
        <PrivacySection />

        {/* 12. FINAL LANDING CTA */}
        <section id="final-cta" className="py-20 lg:py-28 relative border-t border-white/5 bg-[#05080D] overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
            <div className="w-[600px] h-[350px] rounded-full bg-cyan-500/10 blur-[140px]" />
            <div className="w-[450px] h-[300px] rounded-full bg-indigo-600/10 blur-[130px]" />
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#091522] border border-cyan-500/30 text-xs font-mono text-cyan-300 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>100% PRIVATE KNOWLEDGE GUARANTEE</span>
            </div>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight font-sans">
              Ready to build your private knowledge workspace?
            </h2>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Start organizing, searching and questioning your knowledge locally.
            </p>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                id="final-cta-create-workspace-btn"
                onClick={() => setCurrentView('signup')}
                className="group inline-flex items-center gap-3 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 rounded-2xl shadow-xl shadow-cyan-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>Create Your Workspace</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                id="final-cta-signin-btn"
                onClick={() => setCurrentView('signin')}
                className="inline-flex items-center gap-2 px-6 py-4 text-base font-semibold text-slate-300 hover:text-white bg-[#0D1520] hover:bg-[#121D2C] border border-white/10 rounded-2xl transition-all duration-200 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Sign In</span>
              </button>
            </div>

            <div className="pt-4 flex items-center justify-center gap-6 text-xs text-slate-500 font-mono">
              <span>● Client PBKDF2 Vault</span>
              <span>● No Telemetry</span>
              <span>● Instant Local Setup</span>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};
