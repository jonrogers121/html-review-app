import React, { useState, useEffect, useMemo } from 'react';
import type {
  Project,
  ProjectStatus,
  CommentPin,
  AnnotationItem,
  ActivityEvent,
  ViewportMode,
  ActiveTool,
  UserProfile,
  TeamMember,
  CommentCategory,
  CommentPriority,
  CommentStatus,
  PinPlacement
} from './types';
import {
  subscribeProjects,
  createProject,
  updateProject,
  deleteProject,
  subscribeComments,
  createComment,
  updateComment,
  deleteComment,
  addCommentReply,
  subscribeAnnotations,
  saveAnnotation,
  clearAnnotations,
  subscribeActivities,
  getStoredUser,
  setStoredUser,
  subscribeAuthUser,
  logoutUser
} from './services/firebase';
import { Navbar } from './components/Navbar';
import { ProjectDashboard } from './components/ProjectDashboard';
import { PrototypeViewer } from './components/PrototypeViewer';
import { CommentSidebar } from './components/CommentSidebar';
import { InviteModal } from './components/InviteModal';
import { ExportModal } from './components/ExportModal';
import { NewProjectModal } from './components/NewProjectModal';
import { AuthModal } from './components/AuthModal';
import { AccessGate } from './components/AccessGate';
import { ToastContainer } from './components/Toast';
import { checkUserProjectAccess, filterAccessibleProjects } from './utils/permissions';

export default function App() {
  // Firebase Auth resolves asynchronously — start with GUEST_USER while it initialises
  const [currentUser, setCurrentUser] = useState<UserProfile>(getStoredUser());
  const [authLoading, setAuthLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // Active review states
  const [comments, setComments] = useState<CommentPin[]>([]);
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);

  // Workspace configuration
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [activeTool, setActiveTool] = useState<ActiveTool>('browse');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Pin & comment interaction
  const [pendingPin, setPendingPin] = useState<PinPlacement | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [inviteTargetProject, setInviteTargetProject] = useState<Project | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // 0. Listen to Firebase Auth state — fires once on mount with current session
  useEffect(() => {
    const unsub = subscribeAuthUser((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // 1. Subscribe to Projects — re-subscribed whenever the signed-in user changes
  useEffect(() => {
    if (authLoading) return; // wait for auth to resolve before querying Firestore

    const unsub = subscribeProjects(currentUser, (fetched) => {
      setProjects(fetched);

      // Check if URL has ?project=id query parameter
      const params = new URLSearchParams(window.location.search);
      const urlProjectId = params.get('project');

      if (urlProjectId) {
        const found = fetched.find((p) => p.id === urlProjectId);
        if (found) {
          setCurrentProject(found);
          return;
        }
      }

      // If a project was already active, keep it updated
      setCurrentProject((prev) => {
        if (!prev) return null;
        return fetched.find((p) => p.id === prev.id) || null;
      });
    });

    return () => unsub();
  }, [currentUser?.id, currentUser?.email, authLoading]);


  // 2. Subscribe to subcollections when currentProject changes
  useEffect(() => {
    if (!currentProject) {
      setComments([]);
      setAnnotations([]);
      setActivities([]);
      setPendingPin(null);
      setSelectedCommentId(null);
      return;
    }

    const unsubComments = subscribeComments(currentProject.id, setComments);
    const unsubAnnotations = subscribeAnnotations(currentProject.id, setAnnotations);
    const unsubActivities = subscribeActivities(currentProject.id, setActivities);

    return () => {
      unsubComments();
      unsubAnnotations();
      unsubActivities();
    };
  }, [currentProject?.id]);

  // Filter accessible projects for the current user session
  const accessibleProjects = useMemo(() => {
    return filterAccessibleProjects(projects, currentUser);
  }, [projects, currentUser]);

  // Check access authorization for the currently selected project
  const currentProjectAccess = useMemo(() => {
    if (!currentProject) return null;
    return checkUserProjectAccess(currentProject, currentUser);
  }, [currentProject, currentUser]);

  // Account switching is replaced by Firebase Auth sign-in/out.
  // This prop is kept on Navbar for UI compatibility but is a no-op.
  const handleSwitchUser = (_user: UserProfile) => {};


  // Handle Project Selection & URL update
  const handleSelectProject = (proj: Project | null) => {
    setCurrentProject(proj);
    setPendingPin(null);
    setSelectedCommentId(null);
    setActiveTool('browse');
    const url = new URL(window.location.href);
    if (proj) {
      url.searchParams.set('project', proj.id);
    } else {
      url.searchParams.delete('project');
    }
    window.history.replaceState({}, '', url.toString());
  };

  // Project Actions
  const handleCreateProject = async (projectData: Omit<Project, 'id'>) => {
    const created = await createProject(projectData);
    handleSelectProject(created);
  };

  const handleUpdateProjectStatus = async (status: ProjectStatus) => {
    if (!currentProject) return;
    await updateProject(currentProject.id, { status }, currentUser.name);
  };

  const handleDeleteProject = async (projectId: string) => {
    // Immediately remove from UI state
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (currentProject?.id === projectId) {
      handleSelectProject(null);
    }
    await deleteProject(projectId);
  };

  const handleRenameProject = async (projectId: string, newTitle: string, newDescription?: string) => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;

    const updates: Partial<Project> = {
      title: trimmedTitle,
      ...(newDescription !== undefined ? { description: newDescription.trim() } : {})
    };

    // Optimistically update projects state
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
    );
    if (currentProject?.id === projectId) {
      setCurrentProject((prev) => (prev ? { ...prev, ...updates, updatedAt: new Date().toISOString() } : null));
    }

    await updateProject(projectId, updates, currentUser.name);
  };

  const handleUpdateMembers = async (members: TeamMember[]) => {
    const target = inviteTargetProject || currentProject;
    if (!target) return;
    await updateProject(target.id, { members }, currentUser.name);
    setInviteTargetProject((prev) => (prev && prev.id === target.id ? { ...prev, members } : null));
    setCurrentProject((prev) => (prev && prev.id === target.id ? { ...prev, members } : prev));
  };

  // Comment Actions
  const handleDropPin = (coords: PinPlacement) => {
    setIsSidebarOpen(true);
    setPendingPin(coords);
    setSelectedCommentId(null);
  };

  const handleSubmitNewComment = async (data: {
    content: string;
    category: CommentCategory;
    priority: CommentPriority;
    suggestedChange?: string;
  }) => {
    if (!currentProject || !pendingPin) return;

    const pinCoords = { ...pendingPin };
    setPendingPin(null);

    const commentPayload: Parameters<typeof createComment>[1] = {
      projectId: currentProject.id,
      xPercent: pinCoords.xPercent,
      yPercent: pinCoords.yPercent,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorEmail: currentUser.email,
      authorRole: currentUser.role,
      content: data.content,
      category: data.category,
      priority: data.priority,
      status: 'open'
    };

    if (pinCoords.targetSelector) {
      commentPayload.targetSelector = pinCoords.targetSelector;
    }
    if (pinCoords.targetText) {
      commentPayload.targetText = pinCoords.targetText;
    }
    if (typeof pinCoords.anchorX === 'number') {
      commentPayload.anchorX = pinCoords.anchorX;
    }
    if (typeof pinCoords.anchorY === 'number') {
      commentPayload.anchorY = pinCoords.anchorY;
    }
    if (data.suggestedChange) {
      commentPayload.suggestedChange = data.suggestedChange;
    }

    await createComment(currentProject.id, commentPayload);
    // Smoothly return to Browse mode so the user can interact freely
    setActiveTool('browse');
  };

  const handleUpdateCommentStatus = async (commentId: string, status: CommentStatus) => {
    if (!currentProject) return;
    await updateComment(currentProject.id, commentId, { status });
  };

  const handleAddReply = async (commentId: string, content: string) => {
    if (!currentProject) return;
    await addCommentReply(currentProject.id, commentId, {
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorEmail: currentUser.email,
      authorRole: currentUser.role,
      content
    });
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentProject) return;
    await deleteComment(currentProject.id, commentId);
    if (selectedCommentId === commentId) {
      setSelectedCommentId(null);
    }
  };

  // Annotation Actions
  const handleSaveAnnotation = async (item: Omit<AnnotationItem, 'id' | 'createdAt'>) => {
    if (!currentProject) return;
    await saveAnnotation(currentProject.id, item);
  };

  const handleClearAnnotations = async () => {
    if (!currentProject) return;
    await clearAnnotations(currentProject.id);
  };

  // Show a minimal loading screen while Firebase Auth resolves (typically <1s)
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Connecting to ProtoReview…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden font-sans">
      <ToastContainer />

      {/* Global Navbar */}
      <Navbar
        currentProject={currentProject}
        onSelectProject={handleSelectProject}
        onUpdateProjectStatus={handleUpdateProjectStatus}
        onOpenInviteModal={() => {
          setInviteTargetProject(currentProject);
          setIsInviteModalOpen(true);
        }}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onOpenAuthModal={(mode) => {
          setAuthModalMode(mode);
          setIsAuthModalOpen(true);
        }}
        onLogout={async () => {
          const guestUser = await logoutUser();
          setCurrentUser(guestUser);
        }}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        commentCount={comments.length}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        {currentProject ? (
          currentProjectAccess && !currentProjectAccess.hasAccess ? (
            <AccessGate
              project={currentProject}
              currentUser={currentUser}
              accessResult={currentProjectAccess}
              onOpenAuthModal={(mode) => {
                setAuthModalMode(mode);
                setIsAuthModalOpen(true);
              }}
              onBackToDashboard={() => handleSelectProject(null)}
            />
          ) : (
            <>
              {/* Prototype Canvas & Annotation Layer */}
              <PrototypeViewer
                project={currentProject}
                comments={comments}
                annotations={annotations}
                selectedCommentId={selectedCommentId}
                onSelectComment={(id) => {
                  if (id) setIsSidebarOpen(true);
                  setSelectedCommentId(id);
                }}
                viewportMode={viewportMode}
                onViewportChange={setViewportMode}
                zoomLevel={zoomLevel}
                onZoomChange={setZoomLevel}
                activeTool={activeTool}
                onToolChange={setActiveTool}
                onClearAnnotations={handleClearAnnotations}
                onDropPin={handleDropPin}
                pendingPin={pendingPin}
                onSaveAnnotation={handleSaveAnnotation}
                currentUser={currentUser}
              />

              {/* Collapsible Comment & Activity Sidebar */}
              {isSidebarOpen && (
                <CommentSidebar
                  comments={comments}
                  activities={activities}
                  selectedCommentId={selectedCommentId}
                  onSelectComment={setSelectedCommentId}
                  pendingPin={pendingPin}
                  onCancelPendingPin={() => {
                    setPendingPin(null);
                    setActiveTool('browse');
                  }}
                  onSubmitComment={handleSubmitNewComment}
                  onUpdateCommentStatus={handleUpdateCommentStatus}
                  onAddReply={handleAddReply}
                  onDeleteComment={handleDeleteComment}
                  currentUser={currentUser}
                  activeTool={activeTool}
                  onToolChange={setActiveTool}
                />
              )}
            </>
          )
        ) : (
          /* Centralized Project Dashboard */
          <ProjectDashboard
            projects={accessibleProjects}
            allComments={comments}
            currentUser={currentUser}
            onOpenAuthModal={(mode) => {
              setAuthModalMode(mode);
              setIsAuthModalOpen(true);
            }}
            onSelectProject={handleSelectProject}
            onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
            onOpenInviteModalForProject={(proj) => {
              setInviteTargetProject(proj);
              setIsInviteModalOpen(true);
            }}
            onDeleteProject={handleDeleteProject}
            onRenameProject={handleRenameProject}
            onUpdateStatus={async (projId, status) => {
              await updateProject(projId, { status }, currentUser.name);
            }}
          />
        )}
      </main>

      {/* Modals */}
      {(inviteTargetProject || currentProject) && (
        <InviteModal
          isOpen={isInviteModalOpen}
          onClose={() => {
            setIsInviteModalOpen(false);
            setInviteTargetProject(null);
          }}
          project={
            (inviteTargetProject
              ? projects.find((p) => p.id === inviteTargetProject.id) || inviteTargetProject
              : currentProject)!
          }
          onUpdateMembers={handleUpdateMembers}
          onUpdateProject={async (id, data) => {
            await updateProject(id, data, currentUser.name);
          }}
        />
      )}

      {currentProject && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          project={currentProject}
          comments={comments}
        />
      )}

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        currentUser={currentUser}
        onCreateProject={handleCreateProject}
      />

      {/* Real Firebase Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
        }}
        initialMode={authModalMode}
      />
    </div>
  );
}
