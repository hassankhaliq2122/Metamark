export interface Folder {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  url: string;
  folderId: string;
  ownerId: string;
  createdAt: string;
  isPublic: boolean;
  thumbnailUrl?: string;
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Reply {
  _id?: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  text: string;
  x: number;
  y: number;
  refW?: number;
  refH?: number;
  selector?: string;
  offsetXPct?: number;
  offsetYPct?: number;
  status: 'open' | 'resolved';
  color?: string;
  createdAt: string;
  audioUrl?: string;
  attachments?: Attachment[];
  replies?: Reply[];
  elementInfo?: {
    tagName: string;
    id: string;
    className: string;
  };
}
