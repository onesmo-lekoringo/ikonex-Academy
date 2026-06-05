/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GraduationCap, Lock, User as UserIcon, Eye, EyeOff, Loader2, AlertCircle, BookOpen, Pencil, Compass, Calculator, Award, Sparkles } from 'lucide-react';
import { User } from '../types';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const ParticleBackground = () => {
  const icons = [GraduationCap, BookOpen, Pencil, Compass, Calculator, Award, Sparkles];

  // Fixed list of random properties in React.useMemo so they don't change on render
  const particles = React.useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => {
      const IconComponent = icons[Math.floor(Math.random() * icons.length)];
      return {
        id: i,
        Icon: IconComponent,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: Math.floor(Math.random() * 18) + 14, // 14px to 32px
        delay: `${Math.random() * -15}s`, // Negative delay so they start animated
        duration: `${Math.random() * 15 + 15}s`, // 15s to 30s
        opacity: Math.random() * 0.12 + 0.04, // 0.04 to 0.16
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => {
        const Icon = p.Icon;
        return (
          <div
            key={p.id}
            className="absolute animate-float-particle"
            style={{
              left: p.left,
              top: p.top,
              opacity: p.opacity,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          >
            <Icon size={p.size} className="text-slate-500" />
          </div>
        );
      })}
    </div>
  );
};

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all credentials');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      let email = username.trim();
      if (!email.includes('@')) {
        email = `${email}@gmail.com`; // Helper for simple username inputs
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      onLoginSuccess({
        id: fbUser.uid,
        username: fbUser.email?.split('@')[0] || 'admin',
        email: fbUser.email || '',
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Administrator',
        role: 'Admin'
      });
    } catch (err: any) {
      console.error('Firebase Login error:', err);
      // Map common Firebase errors to user-friendly messages
      let msg = err.message;
      if (err.code === 'auth/invalid-credential') {
        msg = 'Invalid username/email or password.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No user account found with this email.';
      } else if (err.code === 'auth/wrong-password') {
        msg = 'Incorrect password.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      setError(msg || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 antialiased font-sans relative overflow-hidden">
      {/* Floating school particles background */}
      <ParticleBackground />

      {/* Decorative ambient background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-slate-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-slate-600/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-slate-500 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-500/10 mb-4 transition-transform hover:scale-105 duration-300">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome to Ikonex Academy</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">School Management System Portal</p>
        </div>

        {/* Login form card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-white mb-6">Account Log In</h2>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 mb-6 flex items-start space-x-3 text-rose-400 animate-shake text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block" htmlFor="username">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <UserIcon size={16} />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="Enter your administrative name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-all outline-none"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block" htmlFor="password">
                  Password
                </label>
                <span className="text-[11px] text-slate-400 font-semibold cursor-not-allowed hover:text-slate-300">
                  Forgot Password?
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock size={16} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder-slate-500 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-slate-900/35 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2 text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <span>Access Portal</span>
              )}
            </button>
          </form>

          {/* Hint details */}
          <div className="mt-6 pt-6 border-t border-slate-850 text-center">
            <p className="text-[11px] text-slate-500 font-medium">
              Demo Admin Account: <span className="text-slate-400 font-mono">lekoringoeliakim@gmail.com</span> / <span className="text-slate-400 font-mono">12345678</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
