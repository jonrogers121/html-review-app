import React, { useState } from 'react';
import { X, Copy, Check, UserPlus, Mail, Shield, Users, Lock, Globe, Trash2, Info } from 'lucide-react';
import type { Project, TeamMember, UserRole } from '../types';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdateMembers: (members: TeamMember[]) => void;
  onUpdateProject?: (projectId: string, updates: Partial<Project>) => Promise<void>;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateMembers,
  onUpdateProject
}) => {
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<UserRole>('reviewer');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isChangingPrivacy, setIsChangingPrivacy] = useState(false);

  if (!isOpen) return null;

  // Build direct shareable URL
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?project=${project.id}`
    : `https://app.review/${project.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setInviteError('Please enter a valid email address.');
      return;
    }

    // Avoid duplicate member
    if (project.members?.some((m) => m.email.toLowerCase() === cleanEmail)) {
      setInviteError(`User "${cleanEmail}" is already a member of this prototype.`);
      return;
    }

    const newMember: TeamMember = {
      id: `mem_${Date.now()}`,
      email: cleanEmail,
      role: roleInput,
      addedAt: new Date().toISOString(),
      status: 'active'
    };

    const updated = [...(project.members || []), newMember];
    onUpdateMembers(updated);
    setEmailInput('');
    setInviteSuccess(true);
    setTimeout(() => setInviteSuccess(false), 3000);
  };

  const handleRemoveMember = (memberId: string) => {
    const updated = (project.members || []).filter((m) => m.id !== memberId);
    onUpdateMembers(updated);
  };

  const roleColors: Record<UserRole, string> = {
    owner: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    reviewer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    developer: 'bg-blue-50 text-blue-700 border-blue-200',
    client: 'bg-amber-50 text-amber-700 border-amber-200'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        id="invite-modal-card"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl ring-1 ring-indigo-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Invite Team to Review</h2>
              <p className="text-xs text-slate-500">Collaborate with designers, devs, and clients</p>
            </div>
          </div>
          <button
            id="close-invite-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Share Link Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Direct Reviewer Link
            </label>
            <p className="text-xs text-slate-500">
              {project.isPublic 
                ? 'Public demo link. Anyone with this link can view this prototype.'
                : 'Shareable prototype link. Unauthenticated visitors will be prompted to sign in with their invited account.'}
            </p>
            <div className="flex items-center gap-2.5 mt-2">
              <div className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 truncate select-all">
                {shareUrl}
              </div>
              <button
                id="copy-invite-link-btn"
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all shrink-0 hover:-translate-y-0.5"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            {/* No-email warning — critical UX info */}
            {!project.isPublic && (
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">No email notification is sent automatically.</span>
                  <span className="text-amber-800">
                    After adding a member below, share the link above and ask them to sign in with their invited email address. They'll see this prototype on their dashboard once signed in.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Access & Visibility Setting */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {project.isPublic ? (
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {project.isPublic ? 'Public Demo Prototype' : 'Private Team Prototype (Protected)'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {project.isPublic
                      ? 'Anyone with the link can preview this prototype.'
                      : 'Requires sign-in. Only invited team accounts can access.'}
                  </div>
                </div>
              </div>

              {onUpdateProject && (
                <button
                  type="button"
                  id="toggle-project-privacy-btn"
                  disabled={isChangingPrivacy}
                  onClick={async () => {
                    setIsChangingPrivacy(true);
                    try {
                      await onUpdateProject(project.id, { isPublic: !project.isPublic });
                    } finally {
                      setIsChangingPrivacy(false);
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border transition-all bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs shrink-0"
                >
                  {project.isPublic ? 'Make Private' : 'Make Public'}
                </button>
              )}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Email Invite Form */}
          <form onSubmit={handleSendInvite} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Invite by Email
              </label>
              <span className="text-[11px] text-slate-400">Account required to view</span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="invite-email-input"
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                />
              </div>
              <select
                id="invite-role-select"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value as UserRole)}
                className="px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-medium shadow-2xs"
              >
                <option value="reviewer">Reviewer</option>
                <option value="developer">Developer</option>
                <option value="client">Client</option>
                <option value="owner">Admin</option>
              </select>
              <button
                id="send-invite-btn"
                type="submit"
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shrink-0 shadow-xs hover:-translate-y-0.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite</span>
              </button>
            </div>
            {inviteError && (
              <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5 pt-1">
                <span>⚠️</span> {inviteError}
              </p>
            )}
            {inviteSuccess && (
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 pt-1">
                <Check className="w-3.5 h-3.5" /> Invitation added to project roster!
              </p>
            )}

            {/* How Account Access Works Banner */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 mt-2">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-[11px] leading-relaxed">
                <span className="font-semibold block text-indigo-950">How account-based access works:</span>
                Inviting an email attaches access permissions to that account. Once they sign in with that email, this prototype will automatically appear in their <strong>Shared with You</strong> dashboard with full review capabilities.
              </div>
            </div>
          </form>

          {/* Active Members Roster */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Current Reviewers & Members ({project.members?.length || 1})
              </label>
              <span className="text-[11px] text-slate-400">Live sync via Firestore</span>
            </div>
            <div className="space-y-2 border border-slate-200/80 rounded-2xl p-2.5 bg-slate-50/50">
              {/* Owner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {(project?.ownerName || project?.ownerEmail || 'O').trim().charAt(0).toUpperCase() || 'O'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      {project?.ownerName || project?.ownerEmail || 'Project Owner'}
                      <span className="text-[10px] text-slate-400 font-normal">(Project Creator)</span>
                    </div>
                    <div className="text-[11px] text-slate-500">{project?.ownerEmail || 'No email specified'}</div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                  Owner
                </span>
              </div>

              {/* Invited Members */}
              {project?.members
                ?.filter((m) => m && m.email && m.email !== project.ownerEmail)
                .map((member) => (
                  <div
                    key={member.id || member.email}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {(member?.email || 'M').trim().charAt(0).toUpperCase() || 'M'}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-800 truncate">{member?.email || 'Invited User'}</div>
                        <div className="text-[11px] text-slate-400">
                          Added {new Date(member.addedAt || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${roleColors[member.role] || 'bg-slate-50 text-slate-600'}`}>
                        {member.role}
                      </span>
                      <button
                        type="button"
                        id={`remove-member-${member.id}-btn`}
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove member access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            id="done-invite-btn"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all hover:-translate-y-0.5"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
