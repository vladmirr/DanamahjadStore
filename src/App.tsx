import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { Login } from './components/auth/Login';
import { BottomNav } from './components/layout/BottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { PointOfSale } from './components/pos/PointOfSale';
import { InventoryManagement } from './components/inventory/InventoryManagement';
import { DebtLedger } from './components/payments/DebtLedger';
import { TransactionHistory } from './components/reports/TransactionHistory';
import { BackupManager } from './components/backup/BackupManager';
import { PopcornManagement } from './components/popcorn/PopcornManagement';
import { InvoiceModal } from './components/modals/InvoiceModal';
import { StatementModal } from './components/modals/StatementModal';
import { Lightning } from './components/ui/Lightning';

const MainLayout: React.FC = () => {
  const { adminUser, activeTab, setIsSidebarOpen } = useApp();

  // Shared modal states triggered across components/header
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // If user is not logged in, render ONLY the Login screen centered on the page
  if (!adminUser || !adminUser.isLoggedIn) {
    return (
      <div className="min-h-screen text-neutral-100 relative overflow-hidden">
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#0a0a0a]">
          <Lightning
            color="#FFD700"
            glow={1.6}
            intensity={1.5}
            speed={0.7}
            opacity={0.9}
            bolts={3}
            spread={1.2}
            branches={4}
            flicker={0.4}
          />
        </div>
        <div className="relative z-10">
          <Login />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-neutral-100 flex flex-col antialiased selection:bg-amber-500/20 selection:text-amber-200 relative overflow-x-hidden">
      {/* Fullscreen Animated Lightning Background (Warm Gold #FFD700 on Deep Charcoal #0a0a0a) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#0a0a0a]">
        <Lightning
          color="#FFD700"
          glow={1.6}
          intensity={1.5}
          speed={0.7}
          opacity={0.9}
          bolts={3}
          spread={1.2}
          branches={4}
          flicker={0.4}
        />
      </div>

      {/* Top Right Floating Action Buttons */}
      <div className="fixed top-3.5 right-3.5 sm:top-5 sm:right-6 z-40 flex items-center gap-2 select-none">
        {/* Menu Button Styled as Pill Island */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#0b0e14]/90 hover:bg-[#121620]/95 border border-white/10 hover:border-white/20 text-neutral-200 hover:text-white shadow-2xl shadow-black/80 backdrop-blur-xl transition-all cursor-pointer group"
          title="مێنۆ"
          aria-label="مێنۆ"
        >
          <span className="text-xs sm:text-sm font-semibold">مێنۆ</span>
          <Menu className="w-4 h-4 text-neutral-300 group-hover:text-white transition-colors" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 pb-24 lg:pb-20">
        {/* Page Container */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {activeTab === 'popcorn' && <PopcornManagement />}

              {activeTab === 'dashboard' && <OverviewDashboard />}

              {activeTab === 'pos' && <PointOfSale />}

              {activeTab === 'inventory' && (
                <InventoryManagement
                  isAddModalOpen={isAddProductModalOpen}
                  setIsAddModalOpen={setIsAddProductModalOpen}
                />
              )}

              {activeTab === 'payments' && (
                <DebtLedger
                  isPaymentModalOpen={isPaymentModalOpen}
                  setIsPaymentModalOpen={setIsPaymentModalOpen}
                />
              )}

              {activeTab === 'reports' && <TransactionHistory />}

              {activeTab === 'backup' && <BackupManager />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNav />

      {/* Slide-out Drawer Menu */}
      <Sidebar />

      {/* Global Modals */}
      <InvoiceModal />
      <StatementModal />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
