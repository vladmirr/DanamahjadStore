import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  Shield,
  Key,
  Check,
  AlertTriangle,
  HardDrive,
  Database,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BackupManager: React.FC = () => {
  const {
    exportExcel,
    exportJSONBackup,
    importJSONBackup,
    resetToSampleData,
    loadScreenshotSampleData,
    changePassword,
    products,
    sales,
    payments,
    customers,
  } = useApp();

  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

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

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importJSONBackup(content);
      if (success) {
        setImportStatus('داتاکان بە سەرکەوتوویی گەڕێنرانەوە! ✅');
      } else {
        setImportStatus('هەڵەیەک ڕوویدا لە کاتی خوێندنەوەی فایلەکە! ❌');
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
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
              هەڵگرتن، گەڕاندنەوە و هەناردەکردنی سەرجەم ژمێریاری و کۆگا بە شێوازی ئێکسڵ
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

        {/* 2. JSON Backup & Restore */}
        <div className="p-6 rounded-2xl glass-card border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
              <HardDrive className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              پاراستن و هێنانەوەی باکئەپ (JSON Backup)
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              دەتوانیت کۆپییەکی پارێزراوی تەواوی سیستمەکە دابگریت و لە هەر کاتێکدا بیگەڕێنیتەوە لەسەر
              ئەم کۆمپیوتەرە یان کۆمپیوتەرێکی تر بەبێ لەدەستچوونی هیچ زانیارییەک.
            </p>

            {importStatus && (
              <div className="mt-3 p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-center text-emerald-400">
                {importStatus}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={exportJSONBackup}
              className="py-2.5 px-3 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>داگرتنی باکئەپ</span>
            </button>

            <label className="py-2.5 px-3 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer text-center">
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>گەڕاندنەوەی باکئەپ</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* 3. Reset to Rich Kurdish Sample Data */}
        <div className="p-6 rounded-2xl glass-card border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              گەڕانەوە بۆ داتای سەرەتایی نموونەیی
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              ئەگەر دەتەوێت داتای تاقیکردنەوەی سەرەتا (کۆگای کاڵاکان، کڕیاران و فرۆشتنە نموونەییەکان)
              نوێ بکەیتەوە، کلیک لەم دوگمەیە بکە.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => {
                if (confirm('ئایا دەتەوێت داتای نموونەیی هاوشێوەی وێنەی ئێکسڵ (کاڵاکانی A, B, C و کاک هەڤاڵ) باربکەیت؟')) {
                  loadScreenshotSampleData();
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              <span>بارکردنی داتای نموونەی ئێکسڵ (A, B, C و کاک هەڤاڵ)</span>
            </button>

            <button
              onClick={() => {
                if (confirm('ئایا دڵنیایت لە گەڕانەوە بۆ داتای نموونەیی ئاسایی؟')) {
                  resetToSampleData();
                }
              }}
              className="w-full py-2 px-4 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>ڕێکخستنەوەی سیستم بۆ داتای سەرەتایی خۆراکی</span>
            </button>
          </div>
        </div>

        {/* 4. Admin Security & Password Change */}
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
