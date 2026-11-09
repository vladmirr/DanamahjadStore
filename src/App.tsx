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

const MainLayout: React.FC = () => {
  const { adminUser, activeTab, setIsSidebarOpen } = useApp();

  // Shared modal states triggered across components/header
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // If user is not logged in, render ONLY the Login screen centered on the page
  if (!adminUser || !adminUser.isLoggedIn) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-100 flex flex-col antialiased selection:bg-white/20 selection:text-white relative">
      {/* Top Right Floating Action Buttons */}
      <div className="fixed top-4 right-4 sm:top-5 sm:right-6 z-40 flex items-center gap-2 select-none">
        {/* Menu Button */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="flex items-center justify-center p-2.5 rounded-2xl bg-[#0b0e14]/90 hover:bg-[#121620] border border-white/10 hover:border-white/25 text-white shadow-2xl backdrop-blur-xl transition-all cursor-pointer group"
          title="مێنۆ"
          aria-label="مێنۆ"
        >
          <Menu className="w-5 h-5 text-neutral-300 group-hover:text-white transition-colors" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-20">
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
