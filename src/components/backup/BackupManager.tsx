import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileSpreadsheet,
  Download,
  Shield,
  Key,
  Check,
  Database,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BackupManager: React.FC = () => {
  const {
    exportExcel,
    changePassword,
    products,
    sales,
    payments,
    customers,
  } = useApp();

  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      alert('وشەی نهێنی دەبێت لانیکەم ٤ پیت بێت');
      return;
    }
    changePassword(newPassword);
    setPasswordSuccess(true);
    setNewPassword('');
    setTimeout(() => setPasswordSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-2xl glass-card border border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              پاراستنی زانیارییەکان و داگرتنی ئێکسڵ
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              هەناردەکردنی سەرجەم ژمێریاری و کۆگا بە شێوازی ئێکسڵ و پاراستنی سیستەم
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Single Click Excel Export */}
        <div className="p-6 rounded-2xl glass-card border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              داگرتنی داتاکان بە شێوەی ئێکسڵ (Excel Export)
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              بە یەک کلیک، فایلی XLSX بە فۆرماتی ڕاستەوخۆ (RTL) دادەبەزێت کە چوار پەڕەی سەرەکی
              لەخۆدەگرێت:
            </p>
            <ul className="text-xs text-slate-300 space-y-1.5 mt-3 pr-4 list-disc list-inside">
              <li>کۆگای کاڵاکان (Inventory / کۆگا) - {products.length} کاڵا</li>
              <li>مێژووی فرۆشتنەکان (Sales Logs / فرۆشتن) - {sales.length} وەسڵ</li>
              <li>مێژووی پارەدانەکان (Payments / پارەدان) - {payments.length} پسوولە</li>
              <li>حسابی کڕیاران و قەرزەکان (Customer Balances) - {customers.length} کڕیار</li>
            </ul>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => exportExcel()}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs btn-gold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>داگرتنی فایلی تەواوی ئێکسڵ (.xlsx)</span>
          </motion.button>
        </div>

        {/* 2. Admin Security & Password Change */}
        <div className="p-6 rounded-2xl glass-card border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <Key className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              گۆڕینی وشەی نهێنی بەڕێوەبەر (Admin Security)
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              بۆ پاراستنی سیستەم و ڕێگریکردن لە دەستکاریکردنی داتاکان، وشەی نهێنی تایبەت بە خۆت دابنێ.
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div className="relative">
              <input
                type="password"
                dir="ltr"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="وشەی نهێنی نوێ بنووسە..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {passwordSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">وشەی نهێنی نوێکراوە!</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>پاشەکەوتکردنی وشەی نهێنی نوێ</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
