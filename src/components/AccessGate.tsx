import React from 'react';
import { ShieldAlert, Lock, ArrowLeft, LogIn, ExternalLink } from 'lucide-react';
import type { Project, UserProfile } from '../types';
import type { AccessCheckResult } from '../utils/permissions';

interface AccessGateProps {
  project: Project;
  currentUser: UserProfile;
  accessResult: AccessCheckResult;
  onOpenAuthModal: (mode: 'login' | 'register') => void;
  onBackToDashboard: () => void;
}

export const AccessGate: React.FC<AccessGateProps> = ({
  project,
  currentUser,
  accessResult,
  onOpenAuthModal,
  onBackToDashboard
}) => {
  const isNotSignedIn = accessResult.reason === 'not_signed_in';

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-100/80 overflow-y-auto">
      <div 
        id="access-restricted-card"
        className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 mx-auto flex items-center justify-center shadow-xs">
          {isNotSignedIn ? <Lock className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
            <span>Private HTML Prototype</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {isNotSignedIn ? 'Sign In Required' : 'Access Restricted'}
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            {isNotSignedIn ? (
              <>
                <strong className="text-slate-800 font-semibold">{project.title}</strong> is restricted to authorized team members and invited stakeholders. Please sign in to view this prototype and participate in reviews.
              </>
            ) : (
              <>
                Your active account (<strong className="text-slate-800 font-semibold">{currentUser.email || currentUser.name}</strong>) has not been invited to review <strong className="text-slate-800 font-semibold">{project.title}</strong>.
              </>
            )}
          </p>
        </div>

        {/* Project Metadata Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Attached Account</span>
            <span className="font-bold text-slate-800">{project.ownerEmail} ({project.ownerName})</span>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-slate-200/60 pt-2">
            <span className="text-slate-500 font-medium">Access Restriction</span>
            <span className="font-semibold text-rose-600">Attached to Owner's Team Only</span>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-slate-200/60 pt-2">
            <span className="text-slate-500 font-medium">Status</span>
            <span className="capitalize font-semibold text-indigo-600">{project.status.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          {isNotSignedIn ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="access-gate-signin-btn"
                onClick={() => onOpenAuthModal('login')}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-xs hover:shadow flex items-center justify-center gap-2 transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In with Account</span>
              </button>
              <button
                id="access-gate-register-btn"
                onClick={() => onOpenAuthModal('register')}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all"
              >
                Create Account
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="access-gate-switch-btn"
                onClick={() => onOpenAuthModal('login')}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Switch to Invited Account</span>
              </button>
            </div>
          )}

          <button
            id="access-gate-back-dashboard-btn"
            onClick={onBackToDashboard}
            className="w-full py-2.5 px-4 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
