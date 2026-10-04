import React, { useState } from 'react';
import { BrandLogo } from '../common/BrandLogo';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  Mail,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Loader2,
  Cpu,
  Database,
  Play,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedKnowledgeVisual } from '../landing/AnimatedKnowledgeVisual';

interface AuthPageProps {
  initialMode?: 'signin' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'signin' }) => {
  const { currentView, setCurrentView, handleSignIn, handleSignUp, handleQuickDemoAccess } = useApp();
  const [isSignUp, setIsSignUp] = useState<boolean>(currentView === 'signup' || initialMode === 'signup');
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage('');

    if (isSignUp) {
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
      if (!password || password.length < 6) {
        setErrorMessage('Password must be at least 6 characters in length.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please verify and retry.');
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await handleSignUp(fullName, email, password, confirmPassword);
        if (!result.success) {
          setErrorMessage(result.error || 'Registration failed. Please check your credentials.');
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'An unexpected cryptographic error occurred.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
      if (!password) {
        setErrorMessage('Please enter your password.');
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await handleSignIn(email, password);
        if (!result.success) {
          setErrorMessage(result.error || 'Invalid credentials or user not found.');
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'An unexpected authentication error occurred.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDemoClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const result = await handleQuickDemoAccess();
      if (!result.success) {
        setErrorMessage(result.error || 'Failed to initialize demonstration enclave.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load demo workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="auth-page-root" className="min-h-screen bg-[#05080D] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[350px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#22d3ee_0.5px,transparent_0.5px)] [background-size:24px_24px] opacity-10" />
      </div>

      {/* Top Header Bar */}
      <header className="px-6 py-4 max-w-7xl mx-auto w-full flex items-center justify-between z-20">
        <BrandLogo onClick={() => setCurrentView('landing')} size="md" />
        <button
          onClick={() => setCurrentView('landing')}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white px-3.5 py-2 rounded-xl bg-[#091522] border border-white/5 hover:border-cyan-500/30 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>
      </header>

      {/* Main Split Content on Desktop */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 z-10">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* LEFT COLUMN (Desktop): Animated LOCALIQ Knowledge Visualization */}
          <div className="hidden lg:flex lg:col-span-6 flex-col items-center justify-center text-center space-y-6 px-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#091522] border border-cyan-500/30 text-[11px] font-mono text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>ON-DEVICE PBKDF2 VAULT</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
                Your private knowledge workspace.
              </h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Experience multimodal understanding where sensitive documents, recordings, and schematics never leave your machine.
              </p>
            </div>

            {/* Glowing Core & Floating Node Visualization */}
            <div className="w-full flex items-center justify-center">
              <AnimatedKnowledgeVisual compact />
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Client Isolated
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-400" /> Local Vector DB
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: Authentication Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md mx-auto lg:col-span-6 p-7 sm:p-9 rounded-3xl bg-[#08121D] border border-cyan-500/25 shadow-2xl shadow-black/80 backdrop-blur-xl relative text-left"
          >
            {/* Top Form Header */}
            <div className="mb-6 space-y-2">
              {/* Security Badge */}
              <div className="p-2.5 rounded-xl bg-[#060D15] border border-cyan-500/25 text-[11px] font-mono text-cyan-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                <span className="font-semibold uppercase tracking-wider">
                  LOCAL PROCESSING — Credentials remain on this device.
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight pt-1">
                {isSignUp ? 'Create your private workspace.' : 'Welcome back.'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                {isSignUp
                  ? 'Build your personal knowledge environment with LOCALIQ.'
                  : 'Continue to your private workspace.'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 mb-6 rounded-2xl bg-[#050C14] border border-white/5">
              <button
                type="button"
                id="tab-switch-signin"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMessage('');
                }}
                className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  !isSignUp
                    ? 'bg-[#0E1A29] text-white shadow-sm border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="tab-switch-signup"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMessage('');
                }}
                className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  isSignUp
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Workspace
              </button>
            </div>

            {/* Error message alert */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name for Sign Up */}
              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-300 uppercase tracking-wider block">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-fullname-input"
                      type="text"
                      placeholder="e.g., Alex Vance"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9.5 pr-4 py-2.5 rounded-xl bg-[#060D15] border border-white/10 text-white placeholder:text-slate-600 text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-sans"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-300 uppercase tracking-wider block">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-email-input"
                    type="email"
                    placeholder="name@organization.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9.5 pr-4 py-2.5 rounded-xl bg-[#060D15] border border-white/10 text-white placeholder:text-slate-600 text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-slate-300 uppercase tracking-wider">
                    Master Password
                  </label>
                  {!isSignUp && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      PBKDF2 Encrypted
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9.5 pr-10 py-2.5 rounded-xl bg-[#060D15] border border-white/10 text-white placeholder:text-slate-600 text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password for Sign Up */}
              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-300 uppercase tracking-wider block">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-confirmpassword-input"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9.5 pr-10 py-2.5 rounded-xl bg-[#060D15] border border-white/10 text-white placeholder:text-slate-600 text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  id="auth-submit-btn"
                  disabled={isSubmitting}
                  className="relative group w-full py-3 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-xl shadow-cyan-500/20 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Cryptographic verification...</span>
                    </>
                  ) : (
                    <>
                      <span>{isSignUp ? 'Initialize Workspace' : 'Open Workspace'}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Demo Divider */}
            <div className="my-5 relative flex items-center justify-center">
              <div className="border-t border-white/5 w-full" />
              <span className="bg-[#08121D] px-3 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Instant Sandbox Preview
              </span>
            </div>

            {/* Quick Demo Button */}
            <button
              type="button"
              id="auth-demo-btn"
              onClick={handleDemoClick}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-cyan-300 hover:text-white bg-[#0A1624] hover:bg-[#0E2034] border border-cyan-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
              <span>Launch Demo Workspace (No signup needed)</span>
            </button>
          </motion.div>

        </div>
      </main>

      {/* Bottom Security Footer */}
      <footer className="p-4 text-center text-slate-500 text-[11px] font-mono z-10 border-t border-white/5 bg-[#03060A]">
        LOCALIQ Private Intelligence Workspace · PBKDF2 100k Key Derivation · Zero Cloud Telemetry
      </footer>
    </div>
  );
};
