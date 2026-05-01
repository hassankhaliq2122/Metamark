import React, { useState, useEffect, useCallback } from 'react';
import { XCircle, X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Folder, Project, Comment, Reply } from './types';
import { storage, MOCK_USER } from './services/api';

// Components
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { FolderView } from './components/FolderView';
import { ProjectView } from './components/ProjectView';

// Toast types
type ToastType = 'success' | 'error' | 'warning' | 'info';
interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

// Confirmation dialog types
interface ConfirmDialog {
  title: string;
  message: string;
  onConfirm: () => void;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user] = useState<any>(MOCK_USER);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Toast system
  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Confirmation dialog
  const confirm = useCallback((title: string, message: string): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirmDialog({
        title,
        message,
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
      });
      // Handle cancel via the dialog's cancel button
    });
  }, []);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const refreshFolders = async () => {
    try {
      const data = await storage.getFolders();
      setFolders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to fetch folders:", err);
      setFolders([]);
    }
  };

  const refreshProjects = async () => {
    try {
      const data = await storage.getProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to fetch projects:", err);
      setProjects([]);
    }
  };

  const refreshComments = async () => {
    if (selectedProjectId) {
      try {
        const data = await storage.getComments(selectedProjectId);
        setComments(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error("Failed to fetch comments:", err);
        setComments([]);
      }
    } else {
      setComments([]);
    }
  };

  // Initial Data Fetch
  useEffect(() => {
    const init = async () => {
      await Promise.all([refreshFolders(), refreshProjects()]);
      setLoading(false);
    };
    init();
  }, []);

  // Comments Fetch
  useEffect(() => {
    refreshComments();
  }, [selectedProjectId]);

  const handleAddFolder = async (name: string) => {
    try {
      await storage.addFolder(name);
      await refreshFolders();
      addToast('success', `Folder "${name}" created`);
    } catch (err: any) {
      addToast('error', `Failed to create folder: ${err.message}`);
    }
  };

  const handleAddProject = async (folderId: string, name: string, url?: string) => {
    try {
      const newProject = await storage.addProject(folderId, name, url || '');
      await refreshProjects();
      setSelectedProjectId(newProject.id);
      addToast('success', `Project "${name}" created`);
    } catch (err: any) {
      addToast('error', `Failed to create project: ${err.message}`);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    const folder = folders.find(f => f.id === id);
    const childProjects = projects.filter(p => p.folderId === id);
    setConfirmDialog({
      title: 'Delete Folder',
      message: `Are you sure you want to delete "${folder?.name || 'this folder'}"?${childProjects.length > 0 ? ` This will also delete ${childProjects.length} project(s) and all their comments.` : ''}`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await storage.deleteFolder(id);
          await Promise.all([refreshFolders(), refreshProjects()]);
          if (selectedFolderId === id) setSelectedFolderId(null);
          addToast('success', `Folder deleted`);
        } catch (err: any) {
          addToast('error', `Failed to delete folder: ${err.message}`);
        }
      },
    });
  };

  const handleDeleteProject = async (id: string) => {
    const project = projects.find(p => p.id === id);
    setConfirmDialog({
      title: 'Delete Project',
      message: `Are you sure you want to delete "${project?.name || 'this project'}"? All comments will be permanently removed.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await storage.deleteProject(id);
          await refreshProjects();
          if (selectedProjectId === id) setSelectedProjectId(null);
          addToast('success', `Project deleted`);
        } catch (err: any) {
          addToast('error', `Failed to delete project: ${err.message}`);
        }
      },
    });
  };

  const handleAddComment = async (commentData: Partial<Comment>) => {
    if (!selectedProjectId) return;
    try {
      await storage.addComment(selectedProjectId, commentData);
      await refreshComments();
      addToast('success', 'Comment added');
    } catch (err: any) {
      addToast('error', `Failed to add comment: ${err.message}`);
    }
  };

  const handleUpdateComment = async (id: string, updates: Partial<Comment>) => {
    try {
      await storage.updateComment(id, updates);
      await refreshComments();
      if (updates.status === 'resolved') {
        addToast('success', 'Comment resolved');
      }
    } catch (err: any) {
      addToast('error', `Failed to update comment: ${err.message}`);
    }
  };

  const handleDeleteComment = async (id: string) => {
    try {
      await storage.deleteComment(id);
      await refreshComments();
      addToast('success', 'Comment deleted');
    } catch (err: any) {
      addToast('error', `Failed to delete comment: ${err.message}`);
    }
  };

  const handleAddReply = async (commentId: string, text: string) => {
    try {
      await storage.addReply(commentId, text);
      await refreshComments();
    } catch (err: any) {
      addToast('error', `Failed to add reply: ${err.message}`);
    }
  };

  const handleUpdateProject = async (id: string, updates: Partial<Project>) => {
    try {
      await storage.updateProject(id, updates);
      await refreshProjects();
      addToast('success', 'Project updated');
    } catch (err: any) {
      addToast('error', `Failed to update project: ${err.message}`);
    }
  };

  const handleUpdateFolder = async (id: string, name: string) => {
    try {
      await storage.updateFolder(id, name);
      await refreshFolders();
      addToast('success', 'Folder renamed');
    } catch (err: any) {
      addToast('error', `Failed to rename folder: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-400 text-sm animate-pulse">Loading MetaMark...</p>
      </div>
    );
  }

  const toastIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <CheckCircle size={18} className="text-emerald-400 shrink-0" />;
      case 'error': return <XCircle size={18} className="text-red-400 shrink-0" />;
      case 'warning': return <AlertTriangle size={18} className="text-amber-400 shrink-0" />;
      case 'info': return <Info size={18} className="text-blue-400 shrink-0" />;
    }
  };

  const toastBg = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-emerald-900/90 border-emerald-700/50';
      case 'error': return 'bg-red-900/90 border-red-700/50';
      case 'warning': return 'bg-amber-900/90 border-amber-700/50';
      case 'info': return 'bg-blue-900/90 border-blue-700/50';
    }
  };

  return (
    <div className="flex h-screen bg-white font-sans text-gray-900 overflow-hidden">
      {!selectedProject && (
        <Sidebar 
          user={user}
          folders={folders}
          projects={projects}
          onSelectProject={setSelectedProjectId}
          selectedProjectId={selectedProjectId}
          onAddFolder={handleAddFolder}
          onAddProject={handleAddProject}
          onDeleteFolder={handleDeleteFolder}
          onDeleteProject={handleDeleteProject}
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          onSelectFolder={setSelectedFolderId}
          selectedFolderId={selectedFolderId}
        />
      )}

      {selectedProject ? (
        <ProjectView 
          project={selectedProject}
          comments={comments}
          onAddComment={handleAddComment}
          onUpdateComment={handleUpdateComment}
          onDeleteComment={handleDeleteComment}
          onUpdateProject={handleUpdateProject}
          onAddReply={handleAddReply}
          onClose={() => setSelectedProjectId(null)}
          user={user}
        />
      ) : selectedFolderId ? (
        <FolderView 
          folder={folders.find(f => f.id === selectedFolderId)!}
          projects={projects.filter(p => p.folderId === selectedFolderId)}
          onSelectProject={setSelectedProjectId}
          onAddProject={handleAddProject}
          onDeleteProject={handleDeleteProject}
          onUpdateProject={handleUpdateProject}
          onBack={() => setSelectedFolderId(null)}
        />
      ) : (
        <DashboardView 
          folders={folders}
          projects={projects}
          onSelectFolder={setSelectedFolderId}
          onAddFolder={handleAddFolder}
          onDeleteFolder={handleDeleteFolder}
          onUpdateFolder={handleUpdateFolder}
        />
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl text-white text-sm font-medium animate-toast-in min-w-[280px] max-w-[400px] ${toastBg(toast.type)}`}
          >
            {toastIcon(toast.type)}
            <span className="flex-1">{toast.message}</span>
            <button 
              onClick={() => removeToast(toast.id)} 
              className="p-0.5 hover:bg-white/10 rounded transition-colors shrink-0"
            >
              <X size={14} className="text-white/60" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{confirmDialog.title}</h3>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="px-5 py-2.5 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 rounded-xl transition-colors shadow-lg shadow-red-100"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
