/**
 * ProtoReview Firebase Service Layer
 *
 * Firebase Auth for identity management.
 * Firestore SDK for real-time cloud persistence.
 * onSnapshot listeners for instant cross-device/cross-user updates.
 *
 * Replaces the previous Express REST API + db.json backend entirely.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  arrayUnion
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type {
  Project,
  CommentPin,
  CommentReply,
  AnnotationItem,
  ActivityEvent,
  UserProfile,
  UserRole,
  TeamMember
} from '../types';

// -----------------------------------------------------------------------
// CONSTANTS & GUEST USER
// -----------------------------------------------------------------------

export const GUEST_USER: UserProfile = {
  id: 'guest_unauthenticated',
  name: 'Guest Reviewer',
  email: '',
  role: 'reviewer',
  avatarColor: '#64748b',
  isRealAccount: false,
  provider: 'persona'
};

// -----------------------------------------------------------------------
// INTERNAL HELPERS
// -----------------------------------------------------------------------

function fbUserToProfile(fbUser: FirebaseUser, extra?: Partial<UserProfile>): UserProfile {
  const providerMap: Record<string, UserProfile['provider']> = {
    'google.com': 'google',
    password: 'email',
    'github.com': 'github'
  };
  const colorMap: Record<string, string> = {
    'google.com': '#4285F4',
    password: '#6366f1',
    'github.com': '#24292f'
  };
  const providerId = fbUser.providerData[0]?.providerId || 'password';

  return {
    id: fbUser.uid,
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
    email: fbUser.email || '',
    role: extra?.role || 'reviewer',
    avatarColor: extra?.avatarColor || colorMap[providerId] || '#6366f1',
    isRealAccount: true,
    provider: providerMap[providerId] || 'email',
    ...extra
  };
}

function sanitizeProject(id: string, data: Record<string, any>): Project {
  return {
    id,
    title: data.title || 'Untitled Prototype',
    description: data.description || '',
    status: data.status || 'in_review',
    ownerId: data.ownerId || '',
    ownerName: data.ownerName || '',
    ownerEmail: data.ownerEmail || '',
    htmlContent: data.htmlContent || '',
    originalFileName: data.originalFileName || 'prototype.html',
    version: typeof data.version === 'number' ? data.version : 1.0,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    isPublic: Boolean(data.isPublic),
    members: Array.isArray(data.members) ? data.members.filter(Boolean) : [],
    commentCount: typeof data.commentCount === 'number' ? data.commentCount : 0
  };
}

/** Build a de-duplicated lowercase email list for Firestore array-contains queries. */
function buildMemberEmails(ownerEmail: string, members: TeamMember[]): string[] {
  const emails = [ownerEmail, ...members.map((m) => m.email)]
    .filter(Boolean)
    .map((e) => e.toLowerCase());
  return [...new Set(emails)];
}

// -----------------------------------------------------------------------
// AUTHENTICATION
// -----------------------------------------------------------------------

/** Kept for backward compatibility — auth state is now managed by Firebase Auth. */
export function getStoredUser(): UserProfile {
  const fbUser = auth.currentUser;
  return fbUser ? fbUserToProfile(fbUser) : GUEST_USER;
}

/** No-op — localStorage session storage is replaced by Firebase Auth persistence. */
export function setStoredUser(_user: UserProfile | null): void {}

export function sanitizeUserProfile(u: any): UserProfile {
  if (!u || typeof u !== 'object') return GUEST_USER;
  const email = typeof u.email === 'string' ? u.email.trim() : '';
  return {
    id: u.id || 'usr_' + Math.random().toString(36).substring(2, 8),
    name: typeof u.name === 'string' && u.name.trim() ? u.name.trim() : email.split('@')[0] || 'User',
    email,
    role: (u.role as UserRole) || 'reviewer',
    avatarColor: u.avatarColor || '#6366f1',
    isRealAccount: Boolean(u.isRealAccount),
    provider: u.provider || 'email'
  };
}

/**
 * Real-time auth state subscription backed by Firebase Auth.
 * Fires immediately with the current user (or GUEST_USER) and on every sign-in/out.
 */
export function subscribeAuthUser(callback: (user: UserProfile) => void): () => void {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      callback(GUEST_USER);
      return;
    }
    try {
      const userSnap = await getDoc(doc(db, 'users', fbUser.uid));
      if (userSnap.exists()) {
        const data = userSnap.data() as Partial<UserProfile>;
        callback(fbUserToProfile(fbUser, data));
      } else {
        callback(fbUserToProfile(fbUser));
      }
    } catch {
      callback(fbUserToProfile(fbUser));
    }
  });
}

export async function loginWithEmail(email: string, password: string): Promise<UserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  const userSnap = await getDoc(doc(db, 'users', cred.user.uid));
  return fbUserToProfile(cred.user, userSnap.exists() ? (userSnap.data() as Partial<UserProfile>) : {});
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
  role: UserRole
): Promise<UserProfile> {
  const roleColors: Record<string, string> = {
    owner: '#4f46e5',
    reviewer: '#10b981',
    developer: '#0284c7',
    client: '#f59e0b'
  };

  const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  await updateProfile(cred.user, { displayName: name.trim() });

  const profile: UserProfile = {
    id: cred.user.uid,
    name: name.trim(),
    email: cred.user.email || email,
    role,
    avatarColor: roleColors[role] || '#6366f1',
    isRealAccount: true,
    provider: 'email'
  };

  await setDoc(doc(db, 'users', cred.user.uid), {
    ...profile,
    createdAt: new Date().toISOString()
  });

  return profile;
}

export async function loginWithGoogleSSO(role: UserRole = 'reviewer'): Promise<UserProfile> {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');

  const cred = await signInWithPopup(auth, provider);
  const fbUser = cred.user;
  const userRef = doc(db, 'users', fbUser.uid);
  const userSnap = await getDoc(userRef);

  let profile: UserProfile;
  if (userSnap.exists()) {
    const data = userSnap.data() as UserProfile;
    profile = fbUserToProfile(fbUser, { role: data.role, avatarColor: data.avatarColor });
    await updateDoc(userRef, {
      name: fbUser.displayName || data.name,
      avatarUrl: fbUser.photoURL || null,
      updatedAt: new Date().toISOString()
    });
  } else {
    profile = {
      id: fbUser.uid,
      name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
      email: fbUser.email || '',
      role,
      avatarColor: '#4285F4',
      isRealAccount: true,
      provider: 'google'
    };
    await setDoc(userRef, { ...profile, createdAt: new Date().toISOString() });
  }

  return profile;
}

export async function loginWithGithubSSO(
  _role: UserRole = 'reviewer',
  _explicitUsername?: string
): Promise<UserProfile> {
  throw new Error(
    'GitHub sign-in is not currently configured. Please use Google or Email/Password sign-in.'
  );
}

/** @deprecated Use loginWithGoogleSSO directly. */
export async function completeSSOLogin(
  _email: string,
  _role: UserRole = 'reviewer',
  _provider: 'google' | 'github' = 'google'
): Promise<UserProfile> {
  throw new Error('Use loginWithGoogleSSO or loginWithEmail instead.');
}

export async function logoutUser(): Promise<UserProfile> {
  await signOut(auth);
  return GUEST_USER;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { ...updates, updatedAt: new Date().toISOString() });
  const snap = await getDoc(userRef);
  return (snap.data() as UserProfile) || GUEST_USER;
}

// -----------------------------------------------------------------------
// PROJECTS — real-time subscriptions via onSnapshot
// -----------------------------------------------------------------------

/**
 * Subscribes to all projects accessible by the current user.
 *
 * Strategy: two parallel Firestore queries (owned + member) merged client-side.
 * Public projects are included in the member query because the owner's email
 * is always in memberEmails, so public projects owned by anyone appear only
 * via a third optional query if needed. For guests, only isPublic==true is queried.
 */
export function subscribeProjects(
  currentUser: UserProfile | null,
  callback: (projects: Project[]) => void
): () => void {
  const projectsRef = collection(db, 'projects');

  // Guests: public projects only
  if (!currentUser || !currentUser.isRealAccount || !currentUser.id) {
    const publicQ = query(projectsRef, where('isPublic', '==', true));
    return onSnapshot(publicQ, (snap) => {
      const projects = snap.docs
        .map((d) => sanitizeProject(d.id, d.data()))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      callback(projects);
    });
  }

  // Authenticated users: merge owned + member + public into a single sorted list
  const projectMap = new Map<string, Project>();
  let emitted = false;

  const emit = () => {
    const sorted = Array.from(projectMap.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    callback(sorted);
    emitted = true;
  };

  // Query 1: projects the user owns
  const ownedQ = query(projectsRef, where('ownerId', '==', currentUser.id));
  const unsubOwned = onSnapshot(ownedQ, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === 'removed') {
        projectMap.delete(change.doc.id);
      } else {
        projectMap.set(change.doc.id, sanitizeProject(change.doc.id, change.doc.data()));
      }
    });
    // Also handle initial full set
    if (!emitted) {
      snap.docs.forEach((d) => projectMap.set(d.id, sanitizeProject(d.id, d.data())));
    }
    emit();
  });

  // Query 2: projects where user is in the memberEmails array (includes shared + public owned by others)
  const memberQ = query(
    projectsRef,
    where('memberEmails', 'array-contains', currentUser.email.toLowerCase())
  );
  const unsubMember = onSnapshot(memberQ, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === 'removed') {
        // Only evict if not also owned by this user
        const existing = projectMap.get(change.doc.id);
        if (existing && existing.ownerId !== currentUser.id) {
          projectMap.delete(change.doc.id);
        }
      } else {
        projectMap.set(change.doc.id, sanitizeProject(change.doc.id, change.doc.data()));
      }
    });
    if (!emitted) {
      snap.docs.forEach((d) => projectMap.set(d.id, sanitizeProject(d.id, d.data())));
    }
    emit();
  });

  // Query 3: public projects (for browsing demos even if not a member)
  const publicQ = query(projectsRef, where('isPublic', '==', true));
  const unsubPublic = onSnapshot(publicQ, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === 'removed') {
        const existing = projectMap.get(change.doc.id);
        if (existing && existing.ownerId !== currentUser.id) {
          projectMap.delete(change.doc.id);
        }
      } else {
        projectMap.set(change.doc.id, sanitizeProject(change.doc.id, change.doc.data()));
      }
    });
    emit();
  });

  return () => {
    unsubOwned();
    unsubMember();
    unsubPublic();
  };
}

export async function createProject(projectData: Omit<Project, 'id'>): Promise<Project> {
  const memberEmails = buildMemberEmails(projectData.ownerEmail, projectData.members || []);
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, 'projects'), {
    ...projectData,
    memberEmails,
    createdAt: projectData.createdAt || now,
    updatedAt: now
  });

  const created = sanitizeProject(docRef.id, { ...projectData, id: docRef.id });

  logActivity({
    projectId: docRef.id,
    actorName: projectData.ownerName,
    actorEmail: projectData.ownerEmail,
    action: 'Created Prototype',
    details: `Uploaded initial prototype "${projectData.title}" (v${projectData.version})`
  }).catch(() => {});

  return created;
}

export async function updateProject(
  id: string,
  updates: Partial<Project>,
  actorName?: string
): Promise<void> {
  const payload: Record<string, any> = {
    ...updates,
    updatedAt: new Date().toISOString()
  };

  // Recompute memberEmails whenever the members list changes
  if (updates.members !== undefined) {
    const projectSnap = await getDoc(doc(db, 'projects', id));
    const currentData = projectSnap.data() || {};
    const ownerEmail = updates.ownerEmail || currentData.ownerEmail || '';
    payload.memberEmails = buildMemberEmails(ownerEmail, updates.members);
  }

  await updateDoc(doc(db, 'projects', id), payload);

  if (updates.status) {
    logActivity({
      projectId: id,
      actorName: actorName || auth.currentUser?.displayName || 'Team Member',
      actorEmail: auth.currentUser?.email || '',
      action: 'Status Updated',
      details: `Project status changed to ${updates.status.replace('_', ' ')}`
    }).catch(() => {});
  }
}

export async function deleteProject(id: string): Promise<void> {
  // Firestore does not cascade-delete subcollections — delete them manually first
  for (const sub of ['comments', 'annotations', 'activities']) {
    const snap = await getDocs(collection(db, 'projects', id, sub));
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  await deleteDoc(doc(db, 'projects', id));
}

// -----------------------------------------------------------------------
// COMMENTS — real-time subscriptions
// -----------------------------------------------------------------------

export function subscribeComments(
  projectId: string,
  callback: (comments: CommentPin[]) => void
): () => void {
  const q = query(
    collection(db, 'projects', projectId, 'comments'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CommentPin));
  });
}

export async function createComment(
  projectId: string,
  commentData: Omit<CommentPin, 'id' | 'pinNumber' | 'createdAt' | 'replies'>
): Promise<CommentPin> {
  const snap = await getDocs(collection(db, 'projects', projectId, 'comments'));
  const pinNumber = snap.size + 1;
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, 'projects', projectId, 'comments'), {
    ...commentData,
    projectId,
    pinNumber,
    replies: [],
    createdAt: now
  });

  // Increment denormalised count so dashboard cards stay accurate
  updateDoc(doc(db, 'projects', projectId), {
    commentCount: snap.size + 1
  }).catch(() => {});

  logActivity({
    projectId,
    actorName: commentData.authorName,
    actorEmail: commentData.authorEmail,
    action: 'Pinned Comment',
    details: `Added ${commentData.category} feedback #${pinNumber}: "${commentData.content.substring(0, 50)}..."`
  }).catch(() => {});

  return {
    id: docRef.id,
    ...commentData,
    projectId,
    pinNumber,
    replies: [],
    createdAt: now
  };
}

export async function updateComment(
  projectId: string,
  commentId: string,
  updates: Partial<CommentPin>
): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId, 'comments', commentId), updates as Record<string, any>);
}

export async function updateCommentStatus(
  projectId: string,
  commentId: string,
  status: CommentPin['status'],
  actorName?: string
): Promise<void> {
  await updateComment(projectId, commentId, { status });
  logActivity({
    projectId,
    actorName: actorName || auth.currentUser?.displayName || 'Reviewer',
    actorEmail: auth.currentUser?.email || '',
    action: 'Comment Status',
    details: `Marked comment as ${status.replace('_', ' ')}`
  }).catch(() => {});
}

export async function addCommentReply(
  projectId: string,
  commentId: string,
  replyData: {
    authorId: string;
    authorName: string;
    authorEmail: string;
    authorRole: UserRole;
    content: string;
  }
): Promise<void> {
  const newReply: CommentReply = {
    ...replyData,
    id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString()
  };

  const commentSnap = await getDoc(doc(db, 'projects', projectId, 'comments', commentId));
  const pinNumber = commentSnap.data()?.pinNumber || '?';

  await updateDoc(doc(db, 'projects', projectId, 'comments', commentId), {
    replies: arrayUnion(newReply)
  });

  logActivity({
    projectId,
    actorName: replyData.authorName,
    actorEmail: replyData.authorEmail,
    action: 'Replied to Feedback',
    details: `Replied to comment #${pinNumber}: "${replyData.content.substring(0, 50)}..."`
  }).catch(() => {});
}

export async function deleteComment(projectId: string, commentId: string): Promise<void> {
  await deleteDoc(doc(db, 'projects', projectId, 'comments', commentId));
}

// -----------------------------------------------------------------------
// ANNOTATIONS — real-time subscriptions
// -----------------------------------------------------------------------

export function subscribeAnnotations(
  projectId: string,
  callback: (annotations: AnnotationItem[]) => void
): () => void {
  const q = query(
    collection(db, 'projects', projectId, 'annotations'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AnnotationItem));
  });
}

export async function saveAnnotation(
  projectId: string,
  annotation: Omit<AnnotationItem, 'id' | 'createdAt'>
): Promise<AnnotationItem> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'projects', projectId, 'annotations'), {
    ...annotation,
    projectId,
    createdAt: now
  });
  return { id: docRef.id, ...annotation, projectId, createdAt: now };
}

export async function clearAnnotations(projectId: string): Promise<void> {
  const snap = await getDocs(collection(db, 'projects', projectId, 'annotations'));
  if (!snap.empty) {
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

// -----------------------------------------------------------------------
// ACTIVITY LOG — real-time subscriptions
// -----------------------------------------------------------------------

export function subscribeActivities(
  projectId: string,
  callback: (activities: ActivityEvent[]) => void
): () => void {
  const q = query(
    collection(db, 'projects', projectId, 'activities'),
    orderBy('timestamp', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActivityEvent));
  });
}

export async function logActivity(
  activity: Omit<ActivityEvent, 'id' | 'timestamp'> & { timestamp?: string }
): Promise<ActivityEvent> {
  const timestamp = activity.timestamp || new Date().toISOString();
  const docRef = await addDoc(collection(db, 'projects', activity.projectId, 'activities'), {
    ...activity,
    timestamp
  });
  return { id: docRef.id, ...activity, timestamp };
}
