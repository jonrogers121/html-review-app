import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  Download,
  CheckCircle2,
  ChevronDown,
  UserCheck,
  MessageSquare,
  Sparkles,
  LogIn,
  LogOut,
  UserPlus,
  ShieldCheck,
  Lock,
  Globe,
  Trash2,
  Edit3
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type {
  Project,
  ProjectStatus,
  UserProfile
} from '../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { RenameModal } from './RenameModal';
import { showToast } from './Toast';

interface NavbarProps {
  currentProject: Project | null;
  onSelectProject: (proj: Project | null) => void;
  onUpdateProjectStatus: (status: ProjectStatus) => void;
  onOpenInviteModal: () => void;
  onOpenExportModal: () => void;
  onDeleteProject?: (projectId: string) => Promise<void> | void;
  onRenameProject?: (projectId: string, newTitle: string, newDescription?: string) => Promise<void> | void;
  currentUser: UserProfile;
  onSwitchUser: (user: UserProfile) => void;
  onOpenAuthModal: (mode: 'login' | 'register') => void;
  onLogout: () => void | Promise<void>;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  commentCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProject,
  onSelectProject,
  onUpdateProjectStatus,
  onOpenInviteModal,
  onOpenExportModal,
  onDeleteProject,
  onRenameProject,
  currentUser,
  onSwitchUser,
  onOpenAuthModal,
  onLogout,
  isSidebarOpen = true,
  onToggleSidebar,
  commentCount = 0
}) => {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const isProjectOwnerOrAdmin = Boolean(
    currentProject && (
      (currentUser.id && currentProject.ownerId === currentUser.id) ||
      (currentUser.email && currentProject.ownerEmail?.toLowerCase() === currentUser.email.toLowerCase()) ||
      currentUser.role === 'owner'
    )
  );

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setStatusDropdownOpen(false);
      }
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statusConfig: Record<
    ProjectStatus,
    { label: string; bg: string; text: string; border: string; dot: string }
  > = {
    draft: {
      label: 'Draft',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
      dot: 'bg-slate-400'
    },
    in_review: {
      label: 'In Review',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
      dot: 'bg-amber-500'
    },
    changes_requested: {
      label: 'Changes Requested',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-300',
      dot: 'bg-rose-500'
    },
    approved: {
      label: 'Approved',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      dot: 'bg-emerald-500'
    },
    archived: {
      label: 'Archived',
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      border: 'border-slate-200',
      dot: 'bg-slate-400'
    }
  };

  const handleStatusSelect = (status: ProjectStatus) => {
    onUpdateProjectStatus(status);
    setStatusDropdownOpen(false);
    const label = statusConfig[status]?.label || status;
    showToast(`Status updated to "${label}"`);
    if (status === 'approved') {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.2 } });
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between z-30 select-none shrink-0 shadow-2xs gap-4">
      {/* Left: Brand Identity, Breadcrumb & Project Metadata */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          id="nav-brand-dashboard-btn"
          onClick={() => onSelectProject(null)}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-100/80 text-slate-900 transition-all group shrink-0"
          title="Back to Centralized Dashboard"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white flex items-center justify-center font-extrabold text-sm shadow-xs group-hover:scale-105 transition-transform">
            PR
          </div>
          <div className="hidden sm:block text-left">
            <span className="font-extrabold text-sm tracking-tight text-slate-900 block leading-tight">
              ProtoReview
            </span>
            <span className="text-[10px] text-slate-400 font-medium block leading-tight">
              Review Studio
            </span>
          </div>
        </button>

        {currentProject && (
          <div className="flex items-center gap-2.5 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200 min-w-0">
            <button
              id="back-to-dashboard-crumb"
              onClick={() => onSelectProject(null)}
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100 shrink-0 whitespace-nowrap"
              title="Return to Dashboard"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Dashboard</span>
            </button>

            <span className="text-slate-300 shrink-0">/</span>

            {/* Project Title & Rename Button */}
            <div className="flex items-center gap-1.5 min-w-0 group/navtitle">
              <span 
                className="text-xs font-bold text-slate-800 truncate max-w-[150px] sm:max-w-[200px] md:max-w-[260px]" 
                title={currentProject.title}
              >
                {currentProject.title}
              </span>
              {onRenameProject && isProjectOwnerOrAdmin && (
                <button
                  id="rename-prototype-nav-btn"
                  onClick={() => setIsRenameModalOpen(true)}
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors shrink-0 opacity-80 hover:opacity-100"
                  title="Rename prototype"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Project Status Badge — interactive for owners, read-only for reviewers */}
            <div className="relative shrink-0" ref={statusDropdownRef}>
              {isProjectOwnerOrAdmin ? (
                <button
                  id="project-status-badge-btn"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-2xs hover:shadow-xs transition-all whitespace-nowrap ${
                    statusConfig[currentProject.status]?.bg || 'bg-slate-100'
                  } ${statusConfig[currentProject.status]?.text || 'text-slate-700'} ${
                    statusConfig[currentProject.status]?.border || 'border-slate-300'
                  }`}
                  title="Change project status"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[currentProject.status]?.dot || 'bg-current'}`} />
                  <span>{statusConfig[currentProject.status]?.label || currentProject.status}</span>
                  <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                </button>
              ) : (
                <span
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${
                    statusConfig[currentProject.status]?.bg || 'bg-slate-100'
                  } ${statusConfig[currentProject.status]?.text || 'text-slate-700'} ${
                    statusConfig[currentProject.status]?.border || 'border-slate-300'
                  }`}
                  title="Status (only owners can change this)"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[currentProject.status]?.dot || 'bg-current'}`} />
                  <span>{statusConfig[currentProject.status]?.label || currentProject.status}</span>
                </span>
              )}

              {statusDropdownOpen && (
                <div 
                  id="status-dropdown-menu"
                  className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95"
                >
                  <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Update Status
                  </div>
                  {(Object.keys(statusConfig) as ProjectStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusSelect(status)}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        currentProject.status === status ? 'font-bold bg-indigo-50/50 text-indigo-950' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${statusConfig[status].dot}`} />
                        <span>{statusConfig[status].label}</span>
                      </div>
                      {currentProject.status === status && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Privacy Badge */}
            {currentProject.isPublic ? (
              <span
                id="navbar-project-public-badge"
                className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                title="Public Prototype Demo - Accessible by link"
              >
                <Globe className="w-2.5 h-2.5" />
                <span>Public Demo</span>
              </span>
            ) : (
              <span
                id="navbar-project-private-badge"
                className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                title="Private Team Prototype - Requires account sign-in"
              >
                <Lock className="w-2.5 h-2.5 text-amber-500" />
                <span>Private Team</span>
              </span>
            )}

            {/* Attached Account Badge */}
            <span
              id="navbar-project-owner-badge"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200"
              title={`Prototype attached to ${currentProject.ownerEmail}`}
            >
              <ShieldCheck className="w-3 h-3 text-indigo-500" />
              <span>Attached to: <strong className="text-slate-900 font-semibold">{currentProject.ownerEmail}</strong></span>
            </span>
          </div>
        )}
      </div>

      {/* Right: Global Actions & User Persona */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">


        {currentProject && (
          <>
            {/* Invite Team */}
            <button
              id="invite-team-nav-btn"
              onClick={onOpenInviteModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl transition-all border border-indigo-200/80 shadow-2xs hover:shadow-xs whitespace-nowrap"
              title="Invite stakeholders & team members"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Invite Team</span>
            </button>

            {/* Export Report */}
            <button
              id="export-report-nav-btn"
              onClick={onOpenExportModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all border border-slate-200/90 shadow-2xs hover:shadow-xs whitespace-nowrap"
              title="Export review report as Markdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Report</span>
            </button>

            {/* Delete Prototype Button (for owner or admin) */}
            {onDeleteProject && isProjectOwnerOrAdmin && (
              <button
                id="delete-prototype-nav-btn"
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-semibold rounded-xl transition-all border border-slate-200/90 hover:border-rose-200 shadow-2xs whitespace-nowrap"
                title="Delete this prototype"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}

            {/* Toggle Comments Sidebar Button */}
            {onToggleSidebar && (
              <button
                id="toggle-sidebar-nav-btn"
                onClick={onToggleSidebar}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap shadow-2xs ${
                  isSidebarOpen
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title={isSidebarOpen ? 'Hide feedback sidebar' : 'Show feedback sidebar'}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Comments</span>
                <span 
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSidebarOpen ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {commentCount}
                </span>
              </button>
            )}
          </>
        )}

        {/* Prominent Google Sign-In button for guest users */}
        {!currentUser.isRealAccount && (
          <button
            id="header-google-signin-btn"
            onClick={() => onOpenAuthModal('login')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs text-slate-700 hover:text-slate-900 transition-all shrink-0"
            title="Sign in with your Google Account"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
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
            <span className="hidden sm:inline">Sign In with Google</span>
            <span className="sm:hidden">Sign In</span>
          </button>
        )}

        {/* User Account & Persona Menu */}
        <div className="relative shrink-0" ref={userDropdownRef}>
          <button
            id="user-profile-menu-btn"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl hover:bg-slate-100 transition-all border border-slate-200/90 shadow-2xs whitespace-nowrap"
            title="User Account & Persona Menu"
          >
            <div
              className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[11px] font-bold shadow-xs shrink-0"
              style={{ backgroundColor: currentUser?.avatarColor || '#6366f1' }}
            >
              {(currentUser?.name || currentUser?.email || 'U').trim().charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-bold text-slate-800 leading-none flex items-center gap-1">
                <span>{currentUser?.name || currentUser?.email || 'User'}</span>
                {currentUser?.isRealAccount && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Authenticated Real Account" />
                )}
              </div>
              <div className="text-[10px] text-slate-400 capitalize leading-none mt-0.5">{currentUser?.role || 'reviewer'}</div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5 opacity-70" />
          </button>

          {userDropdownOpen && (
            <div 
              id="user-profile-dropdown"
              className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 overflow-hidden"
            >
              {/* Account Status Header */}
              <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50/40 to-slate-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Account</span>
                  {currentUser.isRealAccount ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Real User
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                      Persona / Guest
                    </span>
                  )}
                </div>
                <div className="font-bold text-slate-900 text-xs">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
              </div>

              {/* Real Account Actions */}
              <div className="p-2 border-b border-slate-100 space-y-1">
                {currentUser.isRealAccount ? (
                  <>
                    <button
                      id="switch-account-modal-btn"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenAuthModal('login');
                      }}
                      className="w-full text-left px-3 py-2 text-indigo-700 hover:bg-indigo-50 rounded-xl flex items-center gap-2 font-semibold transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Switch / Sign In with Another Account</span>
                    </button>
                    <button
                      id="sign-out-btn"
                      onClick={async () => {
                        setUserDropdownOpen(false);
                        await onLogout();
                      }}
                      className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 font-medium transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out of Account</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      id="navbar-google-sso-btn"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenAuthModal('login');
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2.5 font-semibold transition-colors border border-slate-200/80 mb-1"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
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
                      <span>Sign In with Google</span>
                    </button>
                    <button
                      id="sign-in-account-btn"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenAuthModal('login');
                      }}
                      className="w-full text-left px-3 py-2 text-indigo-700 hover:bg-indigo-50 rounded-xl flex items-center gap-2 font-semibold transition-colors"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In with Email</span>
                    </button>
                    <button
                      id="create-real-account-btn"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenAuthModal('register');
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 font-medium transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                      <span>Create New Account</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Prototype Confirmation Modal */}
      {currentProject && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          title="Delete Prototype"
          message={`Are you sure you want to permanently delete "${currentProject.title}"? This action cannot be undone and will remove all associated comments, pins, and drawing annotations.`}
          itemName={currentProject.title}
          confirmLabel="Delete Prototype"
          isDeleting={isDeletingProject}
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={async () => {
            if (!currentProject || !onDeleteProject) return;
            setIsDeletingProject(true);
            try {
              await onDeleteProject(currentProject.id);
              setIsDeleteModalOpen(false);
              onSelectProject(null);
            } finally {
              setIsDeletingProject(false);
            }
          }}
        />
      )}

      {/* Rename Prototype Modal */}
      {currentProject && onRenameProject && (
        <RenameModal
          isOpen={isRenameModalOpen}
          currentTitle={currentProject.title}
          currentDescription={currentProject.description}
          onCancel={() => setIsRenameModalOpen(false)}
          onSave={async (newTitle, newDescription) => {
            await onRenameProject(currentProject.id, newTitle, newDescription);
            setIsRenameModalOpen(false);
          }}
        />
      )}
    </header>
  );
};
