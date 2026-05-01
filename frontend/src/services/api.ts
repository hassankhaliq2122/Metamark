import axios from 'axios';
import { Folder, Project, Comment, Reply } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';
const api = axios.create({ baseURL: API_URL });

export const MOCK_USER = {
  uid: 'default-user',
  displayName: 'Local Developer',
  email: 'dev@local.host',
  photoURL: '',
};

// Default pin color - blue
export function getAuthorColor(_authorId: string): string {
  return '#3b82f6';
}

export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ---- LocalStorage Fallback ----
const LS_KEYS = {
  FOLDERS: 'metamark_folders',
  PROJECTS: 'metamark_projects',
  COMMENTS: 'metamark_comments',
};

const lsGet = (key: string) => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } 
  catch { return []; }
};
const lsSave = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

// Track if we're in fallback mode
let usingFallback = false;

const localFallback = {
  getFolders: (): Folder[] => lsGet(LS_KEYS.FOLDERS),
  addFolder: (name: string): Folder => {
    const folders = lsGet(LS_KEYS.FOLDERS);
    const f: Folder = { id: crypto.randomUUID(), name, ownerId: MOCK_USER.uid, createdAt: new Date().toISOString() };
    lsSave(LS_KEYS.FOLDERS, [f, ...folders]);
    return f;
  },
  deleteFolder: (id: string) => {
    lsSave(LS_KEYS.FOLDERS, lsGet(LS_KEYS.FOLDERS).filter((f: any) => f.id !== id));
    const projects = lsGet(LS_KEYS.PROJECTS);
    const childIds = projects.filter((p: any) => p.folderId === id).map((p: any) => p.id);
    lsSave(LS_KEYS.PROJECTS, projects.filter((p: any) => p.folderId !== id));
    lsSave(LS_KEYS.COMMENTS, lsGet(LS_KEYS.COMMENTS).filter((c: any) => !childIds.includes(c.projectId)));
  },
  updateFolder: (id: string, name: string) => {
    lsSave(LS_KEYS.FOLDERS, lsGet(LS_KEYS.FOLDERS).map((f: any) => f.id === id ? { ...f, name } : f));
  },
  getProjects: (): Project[] => lsGet(LS_KEYS.PROJECTS),
  addProject: (folderId: string, name: string, url: string): Project => {
    const projects = lsGet(LS_KEYS.PROJECTS);
    const p: Project = {
      id: crypto.randomUUID(), name, url, folderId, ownerId: MOCK_USER.uid,
      createdAt: new Date().toISOString(), isPublic: true,
      thumbnailUrl: url ? `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=600` : undefined,
    };
    lsSave(LS_KEYS.PROJECTS, [p, ...projects]);
    return p;
  },
  deleteProject: (id: string) => {
    lsSave(LS_KEYS.PROJECTS, lsGet(LS_KEYS.PROJECTS).filter((p: any) => p.id !== id));
    lsSave(LS_KEYS.COMMENTS, lsGet(LS_KEYS.COMMENTS).filter((c: any) => c.projectId !== id));
  },
  updateProject: (id: string, updates: Partial<Project>) => {
    const projects = lsGet(LS_KEYS.PROJECTS).map((p: any) => {
      if (p.id === id) {
        const u = { ...p, ...updates };
        if (updates.url) u.thumbnailUrl = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(updates.url)}?w=600`;
        return u;
      }
      return p;
    });
    lsSave(LS_KEYS.PROJECTS, projects);
    return projects.find((p: any) => p.id === id);
  },
  getComments: (projectId: string): Comment[] => lsGet(LS_KEYS.COMMENTS).filter((c: any) => c.projectId === projectId),
  addComment: (projectId: string, data: Partial<Comment>): Comment => {
    const comments = lsGet(LS_KEYS.COMMENTS);
    const c: Comment = {
      id: crypto.randomUUID(), projectId, authorId: MOCK_USER.uid, authorName: MOCK_USER.displayName,
      createdAt: new Date().toISOString(), text: '', x: 0, y: 0, status: 'open',
      color: getAuthorColor(MOCK_USER.uid), replies: [], ...data,
    } as Comment;
    lsSave(LS_KEYS.COMMENTS, [...comments, c]);
    return c;
  },
  updateComment: (id: string, updates: Partial<Comment>) => {
    lsSave(LS_KEYS.COMMENTS, lsGet(LS_KEYS.COMMENTS).map((c: any) => c.id === id ? { ...c, ...updates } : c));
  },
  deleteComment: (id: string) => {
    lsSave(LS_KEYS.COMMENTS, lsGet(LS_KEYS.COMMENTS).filter((c: any) => c.id !== id));
  },
  addReply: (commentId: string, text: string): Comment => {
    const comments = lsGet(LS_KEYS.COMMENTS);
    const updated = comments.map((c: any) => {
      if (c.id === commentId) {
        const replies = c.replies || [];
        replies.push({
          _id: crypto.randomUUID(),
          authorId: MOCK_USER.uid,
          authorName: MOCK_USER.displayName,
          text,
          createdAt: new Date().toISOString(),
        });
        return { ...c, replies };
      }
      return c;
    });
    lsSave(LS_KEYS.COMMENTS, updated);
    return updated.find((c: any) => c.id === commentId);
  },
};

// ---- MongoDB _id → id transform ----
const transform = (item: any) => {
  if (!item) return item;
  if (Array.isArray(item)) return item.map(transform);
  const { _id, __v, ...rest } = item;
  return { id: _id, ...rest };
};

// ---- Hybrid API: tries MongoDB, falls back to localStorage ----
async function tryApi<T>(apiFn: () => Promise<T>, fallbackFn: () => T): Promise<T> {
  if (usingFallback) return fallbackFn();
  try {
    return await apiFn();
  } catch (err: any) {
    if (err?.response?.status === 503 || err?.code === 'ERR_NETWORK') {
      console.warn('MongoDB unavailable, switching to localStorage fallback');
      usingFallback = true;
      return fallbackFn();
    }
    throw err;
  }
}

export const storage = {
  isUsingFallback: () => usingFallback,

  // Folders
  getFolders: async (): Promise<Folder[]> =>
    tryApi(async () => transform((await api.get('/api/folders')).data), () => localFallback.getFolders()),

  addFolder: async (name: string): Promise<Folder> =>
    tryApi(
      async () => transform((await api.post('/api/folders', { name, ownerId: MOCK_USER.uid })).data),
      () => localFallback.addFolder(name)
    ),

  deleteFolder: async (id: string) =>
    tryApi(async () => { await api.delete(`/api/folders/${id}`); }, () => localFallback.deleteFolder(id)),

  updateFolder: async (id: string, name: string) =>
    tryApi(
      async () => transform((await api.patch(`/api/folders/${id}`, { name })).data),
      () => localFallback.updateFolder(id, name)
    ),

  // Projects
  getProjects: async (): Promise<Project[]> =>
    tryApi(async () => transform((await api.get('/api/projects')).data), () => localFallback.getProjects()),

  addProject: async (folderId: string, name: string, url: string): Promise<Project> =>
    tryApi(
      async () => transform((await api.post('/api/projects', { name, url, folderId, ownerId: MOCK_USER.uid })).data),
      () => localFallback.addProject(folderId, name, url)
    ),

  deleteProject: async (id: string) =>
    tryApi(async () => { await api.delete(`/api/projects/${id}`); }, () => localFallback.deleteProject(id)),

  updateProject: async (id: string, updates: Partial<Project>) =>
    tryApi(
      async () => transform((await api.patch(`/api/projects/${id}`, updates)).data),
      () => localFallback.updateProject(id, updates)
    ),

  // Comments
  getComments: async (projectId: string): Promise<Comment[]> =>
    tryApi(
      async () => transform((await api.get(`/api/comments/${projectId}`)).data),
      () => localFallback.getComments(projectId)
    ),

  addComment: async (projectId: string, data: Partial<Comment>): Promise<Comment> =>
    tryApi(
      async () => transform((await api.post('/api/comments', {
        ...data, projectId, authorId: MOCK_USER.uid, authorName: MOCK_USER.displayName,
        color: getAuthorColor(MOCK_USER.uid),
      })).data),
      () => localFallback.addComment(projectId, data)
    ),

  updateComment: async (id: string, updates: Partial<Comment>) =>
    tryApi(
      async () => transform((await api.patch(`/api/comments/${id}`, updates)).data),
      () => localFallback.updateComment(id, updates)
    ),

  deleteComment: async (id: string) =>
    tryApi(async () => { await api.delete(`/api/comments/${id}`); }, () => localFallback.deleteComment(id)),

  // Replies
  addReply: async (commentId: string, text: string): Promise<Comment> =>
    tryApi(
      async () => transform((await api.post(`/api/comments/${commentId}/replies`, {
        authorId: MOCK_USER.uid,
        authorName: MOCK_USER.displayName,
        text,
      })).data),
      () => localFallback.addReply(commentId, text)
    ),
};
