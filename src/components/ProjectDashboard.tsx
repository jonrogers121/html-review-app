import React, { useState } from 'react';
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCode,
  Users,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  Upload,
  Calendar,
  Trash2,
  Share2,
  Edit3,
  Lock,
  Globe,
  LogIn,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import type { Project, ProjectStatus, CommentPin, UserProfile } from '../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { RenameModal } from './RenameModal';
import { isUserMatch } from '../utils/permissions';

interface ProjectDashboardProps {
  projects: Project[];
  allComments: CommentPin[];
  currentUser: UserProfile;
  onOpenAuthModal: (mode: 'login' | 'register') => void;
  onSelectProject: (project: Project) => void;
  onOpenNewProjectModal: () => void;
  onOpenInviteModalForProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => Promise<void>;
  onRenameProject?: (projectId: string, newTitle: string, newDescription?: string) => Promise<void> | void;
  onUpdateStatus: (projectId: string, status: ProjectStatus) => Promise<void>;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  projects,
  allComments,
  currentUser,
  onOpenAuthModal,
  onSelectProject,
  onOpenNewProjectModal,
  onOpenInviteModalForProject,
  onDeleteProject,
  onRenameProject,
  onUpdateStatus
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [accessFilter, setAccessFilter] = useState<'all' | 'mine' | 'shared' | 'public'>('all');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Metrics calculations
  const userEmail = (currentUser.email || '').trim().toLowerCase();
  const isRealUser = Boolean(currentUser.isRealAccount);

  const isProjectOwner = (p: Project) =>
    Boolean(
      (currentUser.id && p.ownerId === currentUser.id) ||
      isUserMatch(p.ownerEmail, currentUser) ||
      isUserMatch(p.ownerName, currentUser)
    );

  const isProjectMember = (p: Project) =>
    Boolean(p.members?.some((m) => isUserMatch(m.email, currentUser) || (m.id && isUserMatch(m.id, currentUser))));

  const mineProjects = projects.filter(isProjectOwner);
  const sharedProjects = projects.filter((p) => !isProjectOwner(p) && isProjectMember(p));
  const publicProjects = projects.filter((p) => Boolean(p.isPublic));

  const mineCount = mineProjects.length;
  const sharedCount = sharedProjects.length;
  const publicCount = publicProjects.length;

  const totalProjects = projects.length;
  const inReviewCount = projects.filter((p) => p.status === 'in_review').length;
  const changesReqCount = projects.filter((p) => p.status === 'changes_requested').length;
  const approvedCount = projects.filter((p) => p.status === 'approved').length;

  const totalComments = allComments.length;
  const openComments = allComments.filter((c) => c.status !== 'resolved').length;
  const resolvedComments = allComments.filter((c) => c.status === 'resolved').length;

  const filteredProjects = projects.filter((p) => {
    // Status filter
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;

    // Access / Ownership filter
    const isOwner = isProjectOwner(p);
    const isShared = !isOwner && isProjectMember(p);
    const isPublic = Boolean(p.isPublic);

    if (accessFilter === 'mine' && !isOwner) return false;
    if (accessFilter === 'shared' && !isShared) return false;
    if (accessFilter === 'public' && !isPublic) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (p.title || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.ownerName || '').toLowerCase().includes(q) ||
        (p.ownerEmail || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusBadgeStyle: Record<ProjectStatus, { bg: string; text: string; border: string; label: string }> = {
    draft: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: 'Draft' },
    in_review: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: 'In Review' },
    changes_requested: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', label: 'Changes Requested' },
    approved: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', label: 'Approved' },
    archived: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', label: 'Archived' }
  };

  const handleNewProjectClick = () => {
    if (!isRealUser) {
      onOpenAuthModal('login');
      return;
    }
    onOpenNewProjectModal();
  };


  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/70 p-6 md:p-10 space-y-9">
      <div className="max-w-7xl mx-auto space-y-9">
        {/* Guest Mode Notice Banner */}
        {!isRealUser && (
          <div
            id="dashboard-guest-banner"
            className="bg-gradient-to-r from-amber-500/10 via-indigo-500/5 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-amber-500/15 text-amber-700 rounded-xl border border-amber-500/20 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span>Guest Mode — Showing Public Prototypes Only</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                    Not Signed In
                  </span>
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Private prototypes shared with your team require an active sign-in. Sign in to view your projects and leave verified reviews.
                </p>
              </div>
            </div>
            <button
              id="guest-banner-signin-btn"
              onClick={() => onOpenAuthModal('login')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all shrink-0 flex items-center gap-2"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In to Access Prototypes</span>
            </button>
          </div>
        )}

        {/* Signed In Account Status Header */}
        {isRealUser && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold text-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">Connected Account:</span>
                  <span className="text-xs font-semibold text-indigo-600">{currentUser.name}</span>
                  <span className="text-xs text-slate-400">({currentUser.email})</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  You have access to your personal prototypes and projects shared with {currentUser.email}.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                Active Session
              </span>
            </div>
          </div>
        )}

        {/* Top Banner / Welcome */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-slate-200/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Workspace Overview
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              ProtoReview Workspace
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
              Centralized hub for interactive review sessions, pinpoint annotations, and stakeholder sign-off
            </p>
          </div>

          <button
            id="dashboard-new-prototype-btn"
            onClick={handleNewProjectClick}
            className="flex items-center gap-2.5 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-xs hover:shadow transition-all self-start md:self-auto hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Prototype Review</span>
          </button>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attached to You</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{mineCount}</div>
            <div className="text-xs text-slate-400 mt-1.5">Owned by your account</div>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shared with You</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-emerald-700 tracking-tight">{sharedCount}</div>
            <div className="text-xs text-slate-400 mt-1.5">Invited team prototypes</div>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Review</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-amber-600 tracking-tight">{inReviewCount}</div>
            <div className="text-xs text-slate-400 mt-1.5">Awaiting team feedback</div>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-emerald-600 tracking-tight">{approvedCount}</div>
            <div className="text-xs text-slate-400 mt-1.5">Ready for production</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-1">
          {/* Access Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 bg-slate-200/60 rounded-xl border border-slate-200/80 text-xs font-semibold">
              {(
                [
                  { key: 'all', label: `All (${projects.length})` },
                  { key: 'mine', label: `Attached to You (${mineCount})` },
                  { key: 'shared', label: `Shared with You (${sharedCount})` },
                  { key: 'public', label: `Public Demos (${publicCount})` }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  id={`access-filter-${tab.key}`}
                  onClick={() => setAccessFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    accessFilter === tab.key
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center p-1 bg-slate-200/60 rounded-xl border border-slate-200/80 text-xs font-semibold">
              {(
                [
                  { key: 'all', label: 'All Statuses' },
                  { key: 'in_review', label: 'In Review' },
                  { key: 'changes_requested', label: 'Changes Req.' },
                  { key: 'approved', label: 'Approved' }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  id={`filter-tab-${tab.key}`}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    statusFilter === tab.key
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              id="dashboard-search-input"
              type="text"
              placeholder="Search by title, owner, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-14 text-center shadow-2xs">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileCode className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No prototypes found</h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
              {!isRealUser
                ? 'Only public prototypes are accessible in guest mode. Sign in to see prototypes shared with your team or create your own.'
                : searchQuery
                ? 'Try adjusting your search query or filter settings.'
                : 'Upload your first HTML prototype to begin interactive team review sessions.'}
            </p>
            {!isRealUser ? (
              <button
                onClick={() => onOpenAuthModal('login')}
                className="mt-5 px-5 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-xs hover:bg-indigo-700 transition-all flex items-center gap-2 mx-auto"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In with Account</span>
              </button>
            ) : (
              <button
                onClick={onOpenNewProjectModal}
                className="mt-5 px-5 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-xs hover:bg-indigo-700 transition-all"
              >
                Upload Prototype
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const totalPins = project.commentCount ?? 0;
              const style = statusBadgeStyle[project.status] || statusBadgeStyle.draft;

              const isOwner = Boolean(
                (currentUser.id && project.ownerId === currentUser.id) ||
                (userEmail && project.ownerEmail?.toLowerCase() === userEmail)
              );
              const isShared = Boolean(
                !isOwner && project.members?.some((m) => (m.email || '').trim().toLowerCase() === userEmail)
              );

              return (
                <div
                  key={project.id}
                  id={`project-card-${project.id}`}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col overflow-hidden group hover:border-slate-300"
                >
                  {/* Visual Preview Header */}
                  <div
                    onClick={() => onSelectProject(project)}
                    className="h-44 bg-slate-950 relative cursor-pointer overflow-hidden border-b border-slate-100 flex items-center justify-center group-hover:opacity-95 transition-opacity"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/50 to-transparent z-10" />

                    {/* Scaled preview thumbnail with skeleton while loading */}
                    <div className="absolute inset-0 z-0">
                      <div className="absolute inset-0 bg-slate-800 animate-pulse" />
                      <iframe
                        title={`${project.title} Preview`}
                        srcDoc={project.htmlContent}
                        sandbox=""
                        loading="lazy"
                        tabIndex={-1}
                        onLoad={(e) => {
                          const el = e.currentTarget.previousElementSibling as HTMLElement | null;
                          if (el) el.style.display = 'none';
                        }}
                        className="w-[800px] h-[500px] origin-top-left transform scale-[0.32] pointer-events-none opacity-45 select-none absolute -top-2 -left-2"
                      />
                    </div>

                    {/* Overlay Badges */}
                    <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold border shadow-xs ${style.bg} ${style.text} ${style.border}`}
                      >
                        {style.label}
                      </span>
                      {project.isPublic ? (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-blue-900/80 text-blue-200 flex items-center gap-1 border border-blue-700/50">
                          <Globe className="w-3 h-3" /> Public Demo
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-slate-900/80 text-slate-300 flex items-center gap-1 border border-slate-700/50">
                          <Lock className="w-3 h-3 text-amber-400" /> Private Team
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3.5 right-3.5 z-20">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-800/90 text-slate-300">
                        v{project.version}
                      </span>
                    </div>

                    <div className="absolute bottom-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between text-white">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <MessageSquare className="w-4 h-4 text-indigo-400" />
                        <span>{totalPins} Comment{totalPins !== 1 ? 's' : ''}</span>
                      </div>
                      <span className="text-xs font-medium text-slate-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Open Review <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* Account Attachment Bar */}
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1.5 text-slate-600 truncate min-w-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="text-slate-400 text-[11px] shrink-0">Attached Account:</span>
                      <span className="font-semibold text-slate-800 text-[11px] truncate" title={project.ownerEmail}>
                        {project.ownerEmail}
                      </span>
                    </div>
                    {isOwner ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 shrink-0">
                        👑 Your Account
                      </span>
                    ) : isShared ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        👥 Shared with You
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-700 shrink-0">
                        🌐 Public Demo
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        {isOwner ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                            <span>👑 Created by You</span>
                          </span>
                        ) : isShared ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            <span>Shared with You</span>
                          </span>
                        ) : project.isPublic ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Public Template
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-start justify-between gap-2 group/title">
                        <h3
                          onClick={() => onSelectProject(project)}
                          className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer line-clamp-1 flex-1"
                          title={project.title}
                        >
                          {project.title}
                        </h3>
                        {onRenameProject && (isOwner || currentUser.role === 'owner') && (
                          <button
                            id={`card-rename-title-btn-${project.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToRename(project);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors opacity-70 hover:opacity-100 shrink-0"
                            title="Rename prototype"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    </div>

                    {/* Comment summary */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span>{totalPins} comment{totalPins !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Footer info: Members, updated time & actions */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          <div
                            className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white shadow-2xs"
                            title={`Owner: ${project?.ownerName || project?.ownerEmail || 'Owner'}`}
                          >
                            {(project?.ownerName || project?.ownerEmail || 'O').trim().charAt(0).toUpperCase() || 'O'}
                          </div>
                          {project?.members
                            ?.filter((m) => m && m.email && m.email !== project.ownerEmail)
                            .slice(0, 2)
                            .map((m) => (
                              <div
                                key={m.id || m.email}
                                className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold ring-2 ring-white shadow-2xs"
                                title={m.email}
                              >
                                {(m.email || 'M').trim().charAt(0).toUpperCase() || 'M'}
                              </div>
                            ))}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Allow owner or admin to rename */}
                        {onRenameProject && (isOwner || currentUser.role === 'owner') && (
                          <button
                            id={`card-rename-btn-${project.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToRename(project);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Rename prototype"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          id={`card-invite-btn-${project.id}`}
                          onClick={() => onOpenInviteModalForProject(project)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Manage team access & invite"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        {/* Allow owner or admin to delete */}
                        {(isOwner || currentUser.role === 'owner') && (
                          <button
                            id={`card-delete-btn-${project.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToDelete(project);
                            }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete project"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          id={`card-open-btn-${project.id}`}
                          onClick={() => onSelectProject(project)}
                          className="ml-1 px-3 py-1.5 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow-2xs hover:shadow-xs transition-all flex items-center gap-1"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={Boolean(projectToDelete)}
          title="Delete Prototype"
          message={`Are you sure you want to permanently delete "${projectToDelete?.title}"? All review pins, comments, and annotations will be deleted.`}
          itemName={projectToDelete?.title}
          confirmLabel="Delete Prototype"
          isDeleting={isDeleting}
          onCancel={() => setProjectToDelete(null)}
          onConfirm={async () => {
            if (!projectToDelete) return;
            setIsDeleting(true);
            try {
              await onDeleteProject(projectToDelete.id);
              setProjectToDelete(null);
            } finally {
              setIsDeleting(false);
            }
          }}
        />

        {/* Rename Prototype Modal */}
        {projectToRename && onRenameProject && (
          <RenameModal
            isOpen={Boolean(projectToRename)}
            currentTitle={projectToRename.title}
            currentDescription={projectToRename.description}
            onCancel={() => setProjectToRename(null)}
            onSave={async (newTitle, newDescription) => {
              await onRenameProject(projectToRename.id, newTitle, newDescription);
              setProjectToRename(null);
            }}
          />
        )}
      </div>
    </div>
  );
};
