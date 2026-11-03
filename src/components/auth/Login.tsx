import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, Eye, EyeOff, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

// ==========================================
// ⚙️ ڕێکخستنی زانیاری بەڕێوەبەر (Admin Credentials Config)
// ==========================================
export const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'password123',
};

interface LoginProps {
  onSuccess?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setErrorMsg('تکایە ناوی بەکارهێنەر و وشەی نهێنی بنووسە');
      triggerShake();
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const success = login(trimmedUser, password);
      setIsLoading(false);
      if (success) {
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg('ناوی بەکارهێنەر یان وشەی نهێنی هەڵەیە!');
        triggerShake();
      }
    }, 250);
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#050505] select-none">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{
          opacity: 1,
          y: 0,
          x: isShaking ? [-10, 10, -10, 10, 0] : 0,
        }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="rounded-2xl p-7 sm:p-8 bg-[#0f1115] border border-white/10 shadow-2xl relative overflow-hidden">
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/10 p-2.5 mb-3.5 shadow-md">
              <img
                src="/logo-icon.png"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              DanaMahjadStore
            </h1>
            <p className="text-neutral-400 text-xs mt-1">
              سیستەمی پێشکەوتووی بەڕێوەبردنی کۆگا و فرۆشتن بە دینار
            </p>
          </div>

          {/* Error Message Alert */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-2.5 overflow-hidden"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="font-medium">{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                بەکارهێنەر (Username)
              </label>
              <div className="relative">
                <input
                  type="text"
                  dir="ltr"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoFocus
                  className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition-colors pl-10"
                />
                <User className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                وشەی نهێنی (Password)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition-colors pl-10 pr-10"
                />
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white focus:outline-none p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-bold text-black bg-white hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 shadow-sm"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-sm font-bold">چوونەژوورەوە</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security badge footer */}
        <p className="text-center text-xs text-neutral-500 mt-4 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-neutral-400" />
          <span>سیستەمی پارێزراوی بەڕێوەبردن (Secure Session Gate)</span>
        </p>
      </motion.div>
    </div>
  );
};

// Re-export as LoginScreen for backwards compatibility
export const LoginScreen = Login;
export default Login;
