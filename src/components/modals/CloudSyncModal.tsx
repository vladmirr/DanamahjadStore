import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  RefreshCw,
  Trash2,
  HelpCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FirebaseConfig,
  getSavedFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig,
  parseFirebaseConfig,
  testFirebaseConnection,
  bulkUploadToCloud,
} from '../../services/firebase';
import { useApp } from '../../context/AppContext';
import { playSound } from '../../utils/formatters';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const { products, sales, payments } = useApp();

  const [savedConfig, setSavedConfig] = useState<FirebaseConfig | null>(null);
  const [rawInput, setRawInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [appId, setAppId] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSavedFirebaseConfig();
      setSavedConfig(cfg);
      if (cfg) {
        setApiKey(cfg.apiKey || '');
        setProjectId(cfg.projectId || '');
        setAuthDomain(cfg.authDomain || '');
        setAppId(cfg.appId || '');
      }
      setStatusMessage(null);
    }
  }, [isOpen]);

  // Handle Quick Paste
  const handleRawInputChange = (text: string) => {
    setRawInput(text);
    const parsed = parseFirebaseConfig(text);
    if (parsed) {
      setApiKey(parsed.apiKey);
      setProjectId(parsed.projectId);
      setAuthDomain(parsed.authDomain);
      setAppId(parsed.appId);
      playSound?.('success');
      setStatusMessage({
        type: 'success',
        text: 'زانیارییەکان بە سەرکەوتوویی لە دەقەکە دەرکێشران!',
      });
    }
  };

  // Test and Save Configuration
  const handleSaveAndConnect = async () => {
    let configToSave: FirebaseConfig | null = null;

    if (rawInput) {
      configToSave = parseFirebaseConfig(rawInput);
    }

    if (!configToSave) {
      if (apiKey && projectId) {
        configToSave = {
          apiKey: apiKey.trim(),
          projectId: projectId.trim(),
          authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
          appId: appId.trim(),
        };
      }
    }

    if (!configToSave || !configToSave.apiKey || !configToSave.projectId) {
      setStatusMessage({
        type: 'error',
        text: 'تکایە لانیکەم API Key و Project ID پڕبکەرەوە یان کۆدی تەواوی Firebase لێرە دابنێ.',
      });
      playSound?.('error');
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    const testResult = await testFirebaseConnection(configToSave);
    setIsLoading(false);

    if (testResult.success) {
      saveFirebaseConfig(configToSave);
      setSavedConfig(configToSave);
      setStatusMessage({
        type: 'success',
        text: testResult.message,
      });
      playSound?.('success');
      // Trigger full page reload after a short delay so AppContext re-subscribes cleanly
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      setStatusMessage({
        type: 'error',
        text: testResult.message,
      });
      playSound?.('error');
    }
  };

  // Disconnect
  const handleDisconnect = () => {
    if (confirm('دڵنیایت لە بڕینی پەیوەندی لەگەڵ هەور؟ داتاکان لەم ئامێرە دەمێننەوە.')) {
      clearFirebaseConfig();
      setSavedConfig(null);
      setRawInput('');
      setApiKey('');
      setProjectId('');
      setAuthDomain('');
      setAppId('');
      setStatusMessage({
        type: 'success',
        text: 'پەیوەندی لەگەڵ داتابەیسی هەور بڕا.',
      });
      playSound?.('click');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  // Bulk Upload Local Data to Cloud
  const handleBulkUpload = async () => {
    if (!savedConfig) return;
    setIsUploading(true);
    setStatusMessage(null);

    const result = await bulkUploadToCloud(products, sales, payments);
    setIsUploading(false);

    if (result.success) {
      setStatusMessage({
        type: 'success',
        text: `سەرکەوتووانە (${result.count}) کاڵا و فرۆشتن و پارەدان ئاپلۆدکران بۆ هەور!`,
      });
      playSound?.('success');
    } else {
      setStatusMessage({
        type: 'error',
        text: result.error || 'هەڵە لە بارکردنی داتاکان.',
      });
      playSound?.('error');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-xl bg-[#0c0e14] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 text-amber-400">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  هاوکاتکردنی هەور (Firebase Cloud Sync)
                  {savedConfig && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      پەیوەستە
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  داتاکانی نێوان مۆبایل و لاپتۆپ و هەموو ئامێرەکانت دەستبەجێ هاوکات بکە
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar text-sm">
            {/* Status Feedback */}
            {statusMessage && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 rounded-xl flex items-start gap-2.5 text-xs ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{statusMessage.text}</span>
              </motion.div>
            )}

            {/* Active Connected State */}
            {savedConfig ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      سیستەمەکە بەستراوەتەوە بە هەوری گووگڵ
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Project: {savedConfig.projectId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    هەر کاڵایەک، فرۆشتنێک یان وەرگرتنێکی قەرز لە مۆبایل یان لە لاپتۆپ تۆمار بکەیت، لە هەمان چرکەدا لەسەر هەموو ئامێرەکان بە شێوەیەکی ئۆتۆماتیکی نوێ دەبێتەوە.
                  </p>
                </div>

                {/* Actions when connected */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleBulkUpload}
                    disabled={isUploading}
                    className="p-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <UploadCloud className="w-4 h-4" />
                    )}
                    <span>ئاپلۆدکردنی داتای لاپتۆپ بۆ هەور</span>
                  </button>

                  <button
                    onClick={handleDisconnect}
                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-medium hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>بڕینی پەیوەندی هەور</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Setup State */
              <div className="space-y-4">
                {/* Quick Paste Area */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      کۆدی ئامادەکراوی Firebase لێرە پەیست (Paste) بکە:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowGuide(!showGuide)}
                      className="text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>چۆن دروستی بکەم؟</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={rawInput}
                    onChange={(e) => handleRawInputChange(e.target.value)}
                    placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  projectId: "danamahjad-store",\n  appId: "..."\n};`}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                    dir="ltr"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    دەتوانیت تەواوی ئەو کۆدەی لە Google Firebase وەریدەگریت ڕاستەوخۆ لێرە پەیستی بکەیت، سیستەمەکە خۆکارانە زانیارییەکان دەردەکێشێت.
                  </p>
                </div>

                {/* How-to guide expander */}
                {showGuide && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-700 space-y-2 text-xs text-slate-300"
                  >
                    <div className="flex items-center justify-between text-amber-400 font-bold border-b border-slate-800 pb-2">
                      <span>ڕێنمایی دروستکردنی داتابەیسی بێبەرامبەری Firebase:</span>
                      <a
                        href="https://console.firebase.google.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] text-amber-400 underline hover:text-amber-300"
                      >
                        <span>کردنەوەی کۆنسۆڵ</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                      <li>بچۆ بۆ <strong>console.firebase.google.com</strong> و بە ئیمەیڵی گووگڵ بچۆ ژوورەوە.</li>
                      <li>کلیک لە <strong>Add project</strong> بکە و ناوێکی لێبنێ (وەک: DanaMahjadStore).</li>
                      <li>لە مێنۆی لای چەپ بڕۆ بەشی <strong>Build &gt; Firestore Database</strong> و کلیک لە <strong>Create database</strong> بکە (دۆخی Start in test mode هەڵبژێرە).</li>
                      <li>لە سەرەوە کلیک لە ئایکۆنی ڕێکخستن ⚙️ (Project settings) بکە، بڕۆ خوارەوە بۆ بەشی Web App <code>&lt;/&gt;</code>.</li>
                      <li>کۆدی <strong>firebaseConfig</strong> کۆپی بکە و لە سەرەوە پەیستی بکە!</li>
                    </ol>
                  </motion.div>
                )}

                {/* Individual inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Project ID</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      placeholder="e.g. danamahjad-store"
                      className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">API Key</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Connect button */}
                <button
                  onClick={handleSaveAndConnect}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Cloud className="w-4 h-4" />
                  )}
                  <span>پشکنین و پەیوەستبوون بە هەور</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
