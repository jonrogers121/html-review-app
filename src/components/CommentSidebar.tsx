import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  MessageSquarePlus,
  CheckCircle2,
  Clock,
  Send,
  Trash2,
  Tag,
  CornerDownRight,
  Filter,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  X,
  Flag,
  MapPin,
  Reply
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type {
  CommentPin,
  CommentCategory,
  CommentPriority,
  CommentStatus,
  UserProfile,
  ActivityEvent,
  ActiveTool,
  PinPlacement
} from '../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { showToast } from './Toast';
import { describeSelector } from '../utils/pinAnchor';


interface CommentSidebarProps {
  comments: CommentPin[];
  activities: ActivityEvent[];
  selectedCommentId: string | null;
  onSelectComment: (id: string | null) => void;
  pendingPin: PinPlacement | null;
  onCancelPendingPin: () => void;
  onSubmitComment: (data: {
    content: string;
    category: CommentCategory;
    priority: CommentPriority;
    suggestedChange?: string;
  }) => Promise<void>;
  onUpdateCommentStatus: (commentId: string, status: CommentStatus) => Promise<void>;
  onAddReply: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  currentUser: UserProfile;
  activeTool?: ActiveTool;
  onToolChange?: (tool: ActiveTool) => void;
}

export const CommentSidebar: React.FC<CommentSidebarProps> = ({
  comments,
  activities,
  selectedCommentId,
  onSelectComment,
  pendingPin,
  onCancelPendingPin,
  onSubmitComment,
  onUpdateCommentStatus,
  onAddReply,
  onDeleteComment,
  currentUser,
  activeTool = 'browse',
  onToolChange
}) => {
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // New comment draft state (tailored for stakeholder review)
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<CommentCategory>('design');
  const [newPriority, setNewPriority] = useState<CommentPriority>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply draft states mapped by commentId
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [openReplyIds, setOpenReplyIds] = useState<Set<string>>(new Set());
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);

  const openCount = comments.filter((c) => c.status !== 'resolved').length;
  const resolvedCount = comments.filter((c) => c.status === 'resolved').length;

  // Filtered comments
  const filteredComments = comments.filter((c) => {
    if (filterStatus === 'open' && c.status === 'resolved') return false;
    if (filterStatus === 'resolved' && c.status !== 'resolved') return false;
    if (filterCategory !== 'all' && c.category !== filterCategory) return false;
    return true;
  });

  // Automatically reset comment composer whenever the pending pin changes or closes
  useEffect(() => {
    if (!pendingPin) {
      setNewContent('');
      setIsSubmitting(false);
    }
  }, [pendingPin]);

  const handlePostNewComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newContent.trim() || isSubmitting) return;

    const contentToPost = newContent.trim();
    const categoryToPost = newCategory;
    const priorityToPost = newPriority;

    setIsSubmitting(true);
    try {
      await onSubmitComment({
        content: contentToPost,
        category: categoryToPost,
        priority: priorityToPost
      });
      setNewContent('');
      showToast('Comment pinned successfully');
    } catch (err) {
      console.error('Failed to post comment:', err);
      showToast('Failed to post comment — please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleResolve = async (comment: CommentPin) => {
    const nextStatus: CommentStatus = comment.status === 'resolved' ? 'open' : 'resolved';
    await onUpdateCommentStatus(comment.id, nextStatus);
    if (nextStatus === 'resolved') {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
      showToast('Comment resolved ✓');
    }
  };

  const handleSendReply = async (commentId: string) => {
    const text = replyDrafts[commentId]?.trim();
    if (!text) return;
    await onAddReply(commentId, text);
    setReplyDrafts((prev) => ({ ...prev, [commentId]: '' }));
    setOpenReplyIds((prev) => { const next = new Set(prev); next.delete(commentId); return next; });
  };

  const toggleReply = (commentId: string) => {
    setOpenReplyIds((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };


  const categoryBadgeStyle: Record<CommentCategory, string> = {
    bug: 'bg-rose-50 text-rose-700 border-rose-200',
    design: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    copy: 'bg-amber-50 text-amber-700 border-amber-200',
    question: 'bg-blue-50 text-blue-700 border-blue-200',
    general: 'bg-slate-50 text-slate-700 border-slate-200'
  };

  const priorityBadgeStyle: Record<CommentPriority, string> = {
    low: 'text-slate-500 bg-slate-100',
    medium: 'text-amber-700 bg-amber-50',
    high: 'text-orange-700 bg-orange-50',
    critical: 'text-rose-700 bg-rose-50 font-bold'
  };

  return (
    <aside 
      id="review-comment-sidebar"
      className="w-72 sm:w-80 lg:w-[410px] bg-white border-l border-slate-200/90 flex flex-col h-[calc(100vh-4rem)] select-none shrink-0 shadow-xs"
    >
      {/* Top Sidebar Tabs */}
      <div className="p-3 border-b border-slate-100 bg-white">
        <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 text-xs">
          <button
            id="sidebar-comments-tab"
            onClick={() => setActiveTab('comments')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'comments'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comments ({comments.length})</span>
          </button>
          <button
            id="sidebar-activity-tab"
            onClick={() => setActiveTab('activity')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'activity'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Activity Log</span>
          </button>
        </div>
      </div>

      {activeTab === 'comments' ? (
        <>
          {/* Filter Bar */}
          <div className="px-4 py-3 border-b border-slate-100 space-y-2.5 bg-white">
            {/* Status pills */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                id="filter-all-comments-btn"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                All ({comments.length})
              </button>
              <button
                id="filter-open-comments-btn"
                onClick={() => setFilterStatus('open')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === 'open'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Open ({openCount})
              </button>
              <button
                id="filter-resolved-comments-btn"
                onClick={() => setFilterStatus('resolved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === 'resolved'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Resolved ({resolvedCount})
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
              <span className="text-slate-400 pl-0.5">
                <Filter className="w-3.5 h-3.5" />
              </span>
              {(['all', 'bug', 'design', 'copy', 'question'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2.5 py-1 rounded-full capitalize shrink-0 text-xs transition-colors ${
                    filterCategory === cat
                      ? 'bg-indigo-100 text-indigo-800 font-bold'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* New Pin Composer (Shown when user clicks to drop a pin) */}
          {pendingPin && (
            <div className="p-4 bg-gradient-to-b from-indigo-50/90 via-slate-50 to-white border-b border-indigo-100/80 shadow-xs animate-in slide-in-from-top-2 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </span>
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Add Review Note</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        {pendingPin.targetSelector
                          ? 'attached to element'
                          : `(${Math.round(pendingPin.xPercent)}%, ${Math.round(pendingPin.yPercent)}%)`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {pendingPin.targetSelector && (
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 bg-indigo-100/70 text-indigo-800 rounded-md truncate max-w-[130px] border border-indigo-200/50"
                      title={pendingPin.targetSelector}
                    >
                      {describeSelector(pendingPin.targetSelector)}
                    </span>
                  )}
                  <button
                    id="close-pending-pin-header-btn"
                    type="button"
                    onClick={() => {
                      setNewContent('');
                      setIsSubmitting(false);
                      onCancelPendingPin();
                      onToolChange?.('browse');
                    }}
                    className="w-6 h-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
                    title="Dismiss note"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handlePostNewComment} className="space-y-3">
                <div className="relative">
                  <textarea
                    id="new-pin-comment-textarea"
                    autoFocus
                    required
                    rows={3}
                    placeholder="Leave your feedback, observation, or requested change..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handlePostNewComment();
                      }
                    }}
                    className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder:text-slate-400 shadow-2xs leading-relaxed resize-none transition-all"
                  />
                </div>

                {/* Dropdowns: Category & Priority */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Category Selector */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Tag className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <select
                      id="new-comment-category-select"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as CommentCategory)}
                      className="w-full text-xs pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer transition-all truncate"
                    >
                      <option value="design">Design & Visual</option>
                      <option value="copy">Copy & Content</option>
                      <option value="question">Question</option>
                      <option value="bug">Issue / Defect</option>
                      <option value="general">General Note</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Priority Selector */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Flag className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <select
                      id="new-comment-priority-select"
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as CommentPriority)}
                      className="w-full text-xs pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer transition-all truncate"
                    >
                      <option value="medium">Normal Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Urgent / Blocker</option>
                      <option value="low">Low Priority</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400 hidden sm:inline-flex items-center gap-1">
                    Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-600">⌘+Enter</kbd>
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      id="cancel-pending-pin-btn"
                      type="button"
                      onClick={() => {
                        setNewContent('');
                        setIsSubmitting(false);
                        onCancelPendingPin();
                        onToolChange?.('browse');
                      }}
                      className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      id="submit-pending-pin-btn"
                      type="submit"
                      disabled={isSubmitting || !newContent.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Posting...' : 'Post Comment'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Active Pin Mode Helper Banner in Sidebar */}
          {!pendingPin && activeTool === 'comment' && (
            <div className="p-3.5 bg-amber-50 border-b border-amber-200/80 text-xs animate-in fade-in">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                    +
                  </span>
                  <div>
                    <span className="font-bold text-amber-950 block">Comment Pin Active</span>
                    <span className="text-[11px] text-amber-800/90 block truncate">Click anywhere on the prototype</span>
                  </div>
                </div>
                <button
                  id="sidebar-cancel-comment-mode-btn"
                  onClick={() => onToolChange?.('browse')}
                  className="text-[11px] font-bold text-amber-900 hover:text-amber-950 bg-white border border-amber-300 px-2.5 py-1 rounded-lg transition-colors shadow-2xs shrink-0"
                >
                  Cancel (Esc)
                </button>
              </div>
            </div>
          )}

          {/* Browse Mode Quick Comment Action Bar */}
          {!pendingPin && activeTool !== 'comment' && (
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-slate-500">
                Mode: <strong className="text-slate-700">Browse</strong>
              </span>
              <button
                id="sidebar-add-comment-btn"
                onClick={() => onToolChange?.('comment')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-98"
                title="Click to place a pin on the prototype (Hot-key: C)"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>Add Comment</span>
                <kbd className="text-[10px] px-1.5 py-0.5 bg-indigo-700/80 rounded font-mono text-indigo-100">C</kbd>
              </button>
            </div>
          )}

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {filteredComments.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">No review comments yet</h4>
                <p className="text-xs text-slate-400 mt-1.5 max-w-[220px] mx-auto leading-relaxed">
                  Browse the prototype and click &quot;Add Comment&quot; (or press C) to leave targeted feedback.
                </p>
                <button
                  id="empty-state-add-comment-btn"
                  onClick={() => onToolChange?.('comment')}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 active:scale-98"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  <span>Drop First Pin (or press C)</span>
                </button>
              </div>
            ) : (
              filteredComments.map((comment) => {
                const isSelected = selectedCommentId === comment.id;
                const isResolved = comment.status === 'resolved';

                return (
                  <div
                    key={comment.id}
                    id={`comment-card-${comment.id}`}
                    onClick={() => onSelectComment(comment.id)}
                    className={`rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30 shadow-xs'
                        : isResolved
                        ? 'border-slate-200 bg-slate-50/70 opacity-85'
                        : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs hover:shadow-xs'
                    }`}
                  >
                    {/* Header */}
                    <div className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shadow-xs shrink-0 ${
                              isResolved
                                ? 'bg-emerald-600 text-white'
                                : comment.priority === 'critical'
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-900 text-white'
                            }`}
                          >
                            {comment.pinNumber}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{comment.authorName}</span>
                              <span className="text-[10px] font-normal text-slate-400 capitalize">
                                • {comment.authorRole}
                              </span>
                            </div>
                             <div className="text-[10px] text-slate-400">
                              {(() => {
                                const d = new Date(comment.createdAt);
                                const now = new Date();
                                const isToday = d.toDateString() === now.toDateString();
                                const isYesterday = d.toDateString() === new Date(now.getTime() - 86400000).toDateString();
                                const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                if (isToday) return `Today ${time}`;
                                if (isYesterday) return `Yesterday ${time}`;
                                return d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + time;
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Resolve toggle CTA */}
                        <button
                          id={`toggle-resolve-btn-${comment.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleResolve(comment);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all shadow-2xs hover:shadow-xs ${
                            isResolved
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                          title={isResolved ? 'Mark as Open' : 'Mark as Resolved'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isResolved ? 'Resolved' : 'Resolve'}</span>
                        </button>
                      </div>

                      {/* Badges: Category & Priority */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${
                            categoryBadgeStyle[comment.category] || categoryBadgeStyle.general
                          }`}
                        >
                          {comment.category}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                            priorityBadgeStyle[comment.priority] || priorityBadgeStyle.medium
                          }`}
                        >
                          {comment.priority}
                        </span>
                        {comment.targetSelector && (
                          <span
                            className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded truncate max-w-[150px]"
                            title={comment.targetSelector}
                          >
                            {describeSelector(comment.targetSelector)}
                          </span>
                        )}
                      </div>

                      {/* Comment text */}
                      <p className={`text-xs text-slate-800 leading-relaxed ${isResolved ? 'line-through text-slate-400' : ''}`}>
                        {comment.content}
                      </p>

                      {/* Suggested Adjustment / Note (Stakeholder friendly) */}
                      {comment.suggestedChange && (
                        <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Suggested Adjustment
                          </span>
                          <p className="text-slate-800">{comment.suggestedChange}</p>
                        </div>
                      )}
                    </div>

                    {/* Replies Thread */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="px-4 pb-3 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-2.5">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="text-xs flex gap-2.5 pl-1">
                            <CornerDownRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800 text-xs">{reply.authorName}</span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-slate-700 text-xs leading-relaxed mt-0.5">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply / Delete Footer */}
                    <div
                      className="px-4 py-2.5 border-t border-slate-100 bg-white rounded-b-2xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {openReplyIds.has(comment.id) ? (
                        /* Expanded reply form */
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Write a reply..."
                            value={replyDrafts[comment.id] || ''}
                            onChange={(e) => setReplyDrafts({ ...replyDrafts, [comment.id]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSendReply(comment.id);
                              if (e.key === 'Escape') toggleReply(comment.id);
                            }}
                            className="flex-1 text-xs px-3 py-1.5 bg-slate-50 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          />
                          <button
                            onClick={() => handleSendReply(comment.id)}
                            disabled={!replyDrafts[comment.id]?.trim()}
                            className="w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg transition-colors shrink-0 shadow-2xs"
                            title="Send reply (Enter)"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleReply(comment.id)}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                            title="Cancel (Esc)"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        /* Collapsed — show Reply + Delete buttons */
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleReply(comment.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
                          >
                            <Reply className="w-3.5 h-3.5" />
                            <span>Reply</span>
                            {comment.replies && comment.replies.length > 0 && (
                              <span className="text-[10px] text-slate-400">({comment.replies.length})</span>
                            )}
                          </button>
                          {(comment.authorId === currentUser.id || currentUser.role === 'owner') && (
                            <button
                              id={`delete-comment-btn-${comment.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCommentToDeleteId(comment.id);
                              }}
                              className="ml-auto w-7 h-7 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* Activity Timeline */
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Project Audit Trail</h4>
            <span className="text-[10px] text-slate-400 font-medium">Live sync</span>
          </div>

          {activities.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-12">No recorded activity yet.</p>
          ) : (
            <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {activities.map((act) => (
                <div key={act.id} className="relative pl-6 text-xs">
                  <div className="absolute left-1 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>{act.actorName}</span>
                    <span className="font-normal text-slate-500">• {act.action}</span>
                  </div>
                  <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">{act.details}</p>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {(() => {
                      const d = new Date(act.timestamp);
                      const now = new Date();
                      const isToday = d.toDateString() === now.toDateString();
                      const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return isToday ? `Today ${time}` : d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + time;
                    })()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Comment Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(commentToDeleteId)}
        title="Delete Feedback Comment"
        message="Are you sure you want to delete this comment thread? This will permanently remove the pin and all its replies."
        confirmLabel="Delete Comment"
        isDeleting={isDeletingComment}
        onCancel={() => setCommentToDeleteId(null)}
        onConfirm={async () => {
          if (!commentToDeleteId) return;
          setIsDeletingComment(true);
          try {
            await onDeleteComment(commentToDeleteId);
            setCommentToDeleteId(null);
          } finally {
            setIsDeletingComment(false);
          }
        }}
      />
    </aside>
  );
};
