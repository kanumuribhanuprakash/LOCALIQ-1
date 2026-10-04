/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LandingPage } from './components/landing/LandingPage';
import { AuthPage } from './components/auth/AuthPage';
import { WorkspaceLayout } from './components/workspace/WorkspaceLayout';
import { motion, AnimatePresence } from 'motion/react';

const AppContent: React.FC = () => {
  const { currentView, isAuthenticated, user } = useApp();

  return (
    <AnimatePresence mode="wait">
      {currentView === 'landing' && (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <LandingPage />
        </motion.div>
      )}

      {currentView === 'signin' && (
        <motion.div
          key="signin"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <AuthPage initialMode="signin" />
        </motion.div>
      )}

      {currentView === 'signup' && (
        <motion.div
          key="signup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <AuthPage initialMode="signup" />
        </motion.div>
      )}

      {currentView === 'workspace' && (
        isAuthenticated && user ? (
          <motion.div
            key="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-screen h-[100dvh] w-full overflow-hidden"
          >
            <WorkspaceLayout />
          </motion.div>
        ) : (
          <motion.div
            key="signin-gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AuthPage initialMode="signin" />
          </motion.div>
        )
      )}
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
