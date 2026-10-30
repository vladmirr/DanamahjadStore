import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { BottomNav } from './components/layout/BottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { PointOfSale } from './components/pos/PointOfSale';
import { InventoryManagement } from './components/inventory/InventoryManagement';
import { DebtLedger } from './components/payments/DebtLedger';
import { TransactionHistory } from './components/reports/TransactionHistory';
import { BackupManager } from './components/backup/BackupManager';
import { InvoiceModal } from './components/modals/InvoiceModal';
import { StatementModal } from './components/modals/StatementModal';

const MainLayout: React.FC = () => {
  const { adminUser, activeTab, setIsSidebarOpen } = useApp();

  // Shared modal states triggered across components/header
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // If user is not logged in, enforce the strict single-admin authentication barrier
  if (!adminUser || !adminUser.isLoggedIn) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col antialiased selection:bg-amber-500/30 selection:text-amber-200 relative">
      {/* Top Right Floating Action Buttons */}
      <div className="fixed top-4 right-4 sm:top-5 sm:right-6 z-40 flex items-center gap-2">
        {/* Menu Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsSidebarOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#0e111a]/95 hover:bg-[#151926] border border-amber-500/35 hover:border-amber-500/60 text-white shadow-xl shadow-black/80 backdrop-blur-md transition-all cursor-pointer group select-none"
          title="کردنەوەی مێنۆ"
        >
          <Menu className="w-4 h-4 text-amber-400 transition-transform group-hover:scale-110" />
          <span className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
            مێنۆ
          </span>
        </motion.button>
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
