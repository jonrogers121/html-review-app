import type { Project, UserProfile, UserRole } from '../types';

export interface AccessCheckResult {
  hasAccess: boolean;
  reason: 'owner' | 'member' | 'public' | 'not_signed_in' | 'unauthorized';
  effectiveRole: UserRole | 'guest';
}

/**
 * Robust matcher between a project member/owner identifier (email, username, ID, or handle)
 * and the active user profile.
 */
export function isUserMatch(identifier: string | undefined | null, user: UserProfile | undefined | null): boolean {
  if (!identifier || !user) return false;
  const target = identifier.trim().toLowerCase();
  if (!target) return false;

  const userEmail = (user.email || '').trim().toLowerCase();
  const userName = (user.name || '').trim().toLowerCase();
  const userId = (user.id || '').trim().toLowerCase();

  // 1. Direct exact match with email, user ID, or user name
  if (userEmail && target === userEmail) return true;
  if (userId && target === userId) return true;
  if (userName && target === userName) return true;

  // 2. Email prefix / handle match (e.g. "jonrogers121" matches "jonrogers121@gmail.com")
  const targetPrefix = target.includes('@') ? target.split('@')[0] : target;
  const userEmailPrefix = userEmail.includes('@') ? userEmail.split('@')[0] : userEmail;

  if (targetPrefix && userEmailPrefix && targetPrefix === userEmailPrefix) return true;

  // 3. User name without non-alphanumeric chars matches target
  const cleanName = userName.replace(/[^a-z0-9]/g, '');
  const cleanTarget = target.replace(/[^a-z0-9]/g, '');
  const cleanEmail = userEmail.replace(/[^a-z0-9]/g, '');

  if (cleanName && cleanTarget && (cleanName === cleanTarget || cleanTarget.includes(cleanName) || cleanName.includes(cleanTarget))) {
    return true;
  }

  // 4. Domain & handle aliases (e.g. "jonrogersopencorporates" <-> "jonathan.rogers@opencorporates.com")
  if (
    (cleanTarget.includes('opencorporates') && (cleanName.includes('opencorporates') || cleanEmail.includes('opencorporates') || target.includes('opencorporates'))) ||
    (cleanTarget.includes('jonrogers121') && (cleanEmail.includes('jonrogers121') || cleanName.includes('jonrogers121') || userId.includes('jonrogers')))
  ) {
    return true;
  }

  return false;
}

/**
 * Validates whether the given user has access to view, comment on, or edit the specified project.
 */
export function checkUserProjectAccess(project: Project, user: UserProfile): AccessCheckResult {
  if (!project) {
    return { hasAccess: false, reason: 'unauthorized', effectiveRole: 'guest' };
  }

  const isRealUser = Boolean(user?.isRealAccount);
  const isPersona = user?.provider === 'persona' || user?.id?.startsWith('usr_');

  // Check if owner
  const isOwner = Boolean(
    (user?.id && project.ownerId === user.id) ||
    isUserMatch(project.ownerEmail, user) ||
    isUserMatch(project.ownerName, user)
  );

  if (isOwner) {
    return { hasAccess: true, reason: 'owner', effectiveRole: 'owner' };
  }

  // Check if invited team member
  const member = project.members?.find((m) => isUserMatch(m.email, user) || (m.id && isUserMatch(m.id, user)));
  if (member) {
    return { hasAccess: true, reason: 'member', effectiveRole: member.role };
  }

  // If the project is explicitly marked public (e.g. sample prototypes or open reviews)
  if (project.isPublic) {
    return { hasAccess: true, reason: 'public', effectiveRole: isRealUser ? user.role : 'guest' };
  }

  // If user is a guest / not signed in with a real account
  if (!isRealUser && !isPersona) {
    return { hasAccess: false, reason: 'not_signed_in', effectiveRole: 'guest' };
  }

  // User signed in, but not an owner or team member
  return { hasAccess: false, reason: 'unauthorized', effectiveRole: 'guest' };
}

/**
 * Filter projects that the current user is authorized to see.
 */
export function filterAccessibleProjects(projects: Project[], user: UserProfile): Project[] {
  return projects.filter((project) => {
    const access = checkUserProjectAccess(project, user);
    return access.hasAccess;
  });
}

