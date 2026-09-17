export type ProjectStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'archived';

export type CommentCategory = 'bug' | 'design' | 'copy' | 'question' | 'general';
export type CommentPriority = 'low' | 'medium' | 'high' | 'critical';
export type CommentStatus = 'open' | 'in_progress' | 'resolved';

export type UserRole = 'owner' | 'reviewer' | 'developer' | 'client';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarColor: string;
  isOnline?: boolean;
  isRealAccount?: boolean;
  provider?: 'google' | 'github' | 'email' | 'persona' | 'sso';
}

export interface CommentReply {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
}

/** Where a review pin was placed. New pins also store an element anchor so they stay put. */
export interface PinPlacement {
  xPercent: number; // 0 - 100, iframe-viewport fallback
  yPercent: number; // 0 - 100, iframe-viewport fallback
  targetSelector?: string;
  /** Optional text content snippet to reliably re-identify the element even if class/DOM structure differs */
  targetText?: string;
  /** Horizontal offset within the target element (0–1). Present on element-anchored pins. */
  anchorX?: number;
  /** Vertical offset within the target element (0–1). Present on element-anchored pins. */
  anchorY?: number;
}

export interface CommentPin extends PinPlacement {
  id: string;
  projectId: string;
  pinNumber: number;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorRole: UserRole;
  content: string;
  category: CommentCategory;
  priority: CommentPriority;
  status: CommentStatus;
  suggestedChange?: string; // Proposed HTML or CSS change
  createdAt: string;
  replies: CommentReply[];
}

export interface AnnotationItem {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  type: 'pencil' | 'rectangle' | 'arrow';
  points: string; // SVG path data or rect coords "x,y,width,height"
  color: string;
  strokeWidth: number;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  email: string;
  role: UserRole;
  addedAt: string;
  status: 'pending' | 'active';
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  htmlContent: string;
  originalFileName?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  members: TeamMember[];
  isPublic?: boolean;
  commentCount?: number;
}

export interface ActivityEvent {
  id: string;
  projectId: string;
  actorName: string;
  actorEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

export type ViewportMode = 'fluid' | 'desktop' | 'tablet' | 'mobile';
export type ActiveTool = 'browse' | 'comment' | 'pencil' | 'rectangle' | 'arrow';
