import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Shield,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import type { UserRole, UserProfile } from '../types';
import {
  registerWithEmail,
  loginWithEmail,
  loginWithGithubSSO
} from '../services/firebase';
import { signInWithGoogleOAuth } from '../services/googleAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login'
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('reviewer');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState<'google' | 'github' | null>(null);

  if (!isOpen) return null;

  const handleSSO = async (provider: 'google' | 'github') => {
    setError(null);
    setSsoLoading(provider);

    try {
      if (provider === 'google') {
        const profile = await signInWithGoogleOAuth(role);
        onAuthSuccess(profile);
        onClose();
      } else {
        const profile = await loginWithGithubSSO(role);
        onAuthSuccess(profile);
        onClose();
      }
    } catch (err: any) {
      let msg = `Failed to sign in with ${provider === 'google' ? 'Google' : 'GitHub'}.`;
      if (err?.message?.includes('closed') || err?.message?.includes('cancel')) {
        msg = 'Google sign-in popup was closed before completing authentication.';
      } else if (err?.message?.includes('blocked')) {
        msg = 'Popup window was blocked by your browser. Please allow popups to sign in with Google.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setSsoLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) {
          setError('Please enter your full name');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setIsLoading(false);
          return;
        }

        const profile = await registerWithEmail(name, email, password, role);
        onAuthSuccess(profile);
        onClose();
      } else {
        const profile = await loginWithEmail(email, password);
        onAuthSuccess(profile);
        onClose();
      }
    } catch (err: any) {
      let msg = 'Failed to sign in. Please check your credentials.';
      if (err?.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please log in.';
      } else if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password' || err?.code === 'auth/user-not-found') {
        msg = 'Invalid email or password. Please try again.';
      } else if (err?.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err?.message && !err.message.includes('identity-toolkit')) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        id="auth-modal-card"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 via-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              PR
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {mode === 'login' ? 'Sign In to ProtoReview' : 'Create Stakeholder Account'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {mode === 'login'
                  ? 'Access your saved reviews and real comments'
                  : 'Collaborate with persistent identity and roles'}
              </p>
            </div>
          </div>
          <button
            id="close-auth-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-1">
          <button
            id="auth-tab-login"
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            id="auth-tab-register"
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              mode === 'register'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Role Picker for New Account (used by both SSO and Email signup) */}
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Review Role</label>
              <div className="relative">
                <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="auth-role-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full text-xs pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-all shadow-2xs cursor-pointer appearance-none"
                >
                  <option value="reviewer">Reviewer (Leaves pins & visual feedback)</option>
                  <option value="owner">Project Owner (Manages status & decisions)</option>
                  <option value="developer">Developer (Inspects DOM & implements fixes)</option>
                  <option value="client">Client (Signs off & approves milestones)</option>
                </select>
              </div>
            </div>
          )}

          {/* SSO Options */}
          <div className="space-y-2">
            {/* Google SSO Button */}
            <button
              id="google-sso-btn"
              type="button"
              disabled={ssoLoading !== null || isLoading}
              onClick={() => handleSSO('google')}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300/80 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs hover:shadow-xs flex items-center justify-center gap-2.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {ssoLoading === 'google' ? (
                <div className="flex items-center justify-center gap-2.5 text-slate-700">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                  <span>Connecting to Google OAuth...</span>
                </div>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* GitHub SSO Button */}
            <button
              id="github-sso-btn"
              type="button"
              disabled={ssoLoading !== null || isLoading}
              onClick={() => handleSSO('github')}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs flex items-center justify-center gap-2.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {ssoLoading === 'github' ? (
                <div className="flex items-center justify-center gap-2.5 text-slate-200">
                  <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                  <span>Signing in with GitHub...</span>
                </div>
              ) : (
                <>
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    />
                  </svg>
                  <span>Continue with GitHub</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="grow border-t border-slate-200"></div>
            <span className="shrink-0 mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {mode === 'login' ? 'Or sign in with email & password' : 'Or register with email'}
            </span>
            <div className="grow border-t border-slate-200"></div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-name-input"
                    type="text"
                    required
                    placeholder="Your Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-all shadow-2xs"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 block">Password</label>
                {mode === 'register' && (
                  <span className="text-[10px] text-slate-400">Min. 6 characters</span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={isLoading || ssoLoading !== null}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 text-white">
                  <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                  <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                </div>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In with Email' : 'Create Account with Email'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            {mode === 'login' ? "Don't have an account yet?" : 'Already have a registered account?'}
            {' '}
            <button
              id="auth-switch-mode-btn"
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2 ml-1"
            >
              {mode === 'login' ? 'Register now' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
