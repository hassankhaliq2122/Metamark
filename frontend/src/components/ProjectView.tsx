import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  Settings, 
  History, 
  MessageSquare, 
  Share2, 
  ExternalLink, 
  CheckCircle, 
  Trash2, 
  Plus, 
  X, 
  Mic, 
  Paperclip,
  FileText,
  Download,
  XCircle,
  Layout as LayoutIcon,
  Sparkles,
  Monitor,
  Tablet,
  Smartphone,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioRecorder } from 'react-audio-voice-recorder';
import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || '';
const api = axios.create({ baseURL: API_URL });
import { Project, Comment, Attachment } from '../types';
import { getAuthorColor, getInitials, timeAgo, MOCK_USER } from '../services/api';

type DeviceType = 'desktop' | 'tablet' | 'mobile';
const DEVICE_WIDTHS: Record<DeviceType, number> = { desktop: 1440, tablet: 768, mobile: 390 };

interface ProjectViewProps {
  project: Project;
  comments: Comment[];
  onAddComment: (comment: Partial<Comment>) => void;
  onUpdateComment: (id: string, updates: Partial<Comment>) => void;
  onDeleteComment: (id: string) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onAddReply?: (commentId: string, text: string) => void;
  onClose: () => void;
  user: any;
}

const CommentContent = ({ comment }: { comment: Comment }) => {
  return (
    <div className="space-y-3">
      {comment.text && (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
      )}
      
      {comment.audioUrl && (
        <div className="mt-2">
          <audio controls className="w-full h-8 bg-gray-100 rounded-lg">
            <source src={comment.audioUrl} type="audio/webm" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {comment.attachments && comment.attachments.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {comment.attachments.map((file, idx) => (
            <a 
              key={idx} 
              href={file.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs text-blue-600 transition-colors group"
            >
              <FileText size={14} className="text-gray-400 group-hover:text-blue-500" />
              <span className="flex-1 truncate">{file.name}</span>
              <Download size={14} className="text-gray-300 group-hover:text-blue-500" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export const ProjectView = ({ 
  project, 
  comments, 
  onAddComment, 
  onUpdateComment, 
  onDeleteComment,
  onUpdateProject,
  onAddReply,
  onClose,
  user
}: ProjectViewProps) => {
  const [showComments, setShowComments] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'active' | 'resolved'>('active');
  const [showSettings, setShowSettings] = useState(false);
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [newPinPos, setNewPinPos] = useState<{ 
    x: number, y: number, 
    selector: string, offsetXPct: number, offsetYPct: number,
    refW: number, refH: number 
  } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [iframeHeight, setIframeHeight] = useState(0);
  const [editUrl, setEditUrl] = useState(project.url);
  const [editName, setEditName] = useState(project.name);
  const [pendingAudioBlob, setPendingAudioBlob] = useState<Blob | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'comment' | 'browse'>('comment');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pinPositions, setPinPositions] = useState<Record<string, { x: number, y: number }>>({});
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (newPinPos) { setNewPinPos(null); setPendingAudioBlob(null); setPendingAttachments([]); }
        else if (activePinId) setActivePinId(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && newPinPos) {
        e.preventDefault();
        handleAddComment();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [newPinPos, activePinId, commentText]);

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setIframeLoading(true);
  };

  useEffect(() => {
    setEditUrl(project.url);
    setEditName(project.name);
  }, [project]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      const action = data.action || data.type;
      const payload = data.message || data.payload;

      if (!action || !payload) return;

      if (action === 'blipEvent:ELEMENT_CLICKED' || action === 'ELEMENT_CLICKED') {
        const { x, y, selector, offsetXPct, offsetYPct, containerWidth, containerHeight } = payload;
        setNewPinPos({ 
          x, y, 
          selector: selector || '', 
          offsetXPct: offsetXPct ?? 50, 
          offsetYPct: offsetYPct ?? 50,
          refW: containerWidth, refH: containerHeight 
        });
        setActivePinId(null);
      } else if (action === 'blipEvent:RESIZE' || action === 'IFRAME_HEIGHT') {
        setIframeHeight(payload.height);
      } else if (action === 'PIN_POSITIONS_UPDATE') {
        // Iframe reports updated positions for all registered pins
        const positions: Record<string, { x: number, y: number }> = {};
        (payload.positions || []).forEach((p: any) => {
          positions[p.id] = { x: p.x, y: p.y };
        });
        setPinPositions(positions);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Register pins with the iframe so it can track their element positions
  useEffect(() => {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow && !iframeLoading) {
      const pins = comments
        .filter(c => c.status === 'open' && c.selector)
        .map(c => ({
          id: c.id,
          selector: c.selector,
          offsetXPct: c.offsetXPct ?? 50,
          offsetYPct: c.offsetYPct ?? 50,
        }));
      iframe.contentWindow.postMessage({ action: 'REGISTER_PINS', pins }, '*');
    }
  }, [comments, iframeLoading, refreshKey]);

  // Sync mode with iframe
  useEffect(() => {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ action: 'SET_MODE', mode: viewMode }, '*');
    }
  }, [viewMode, iframeLoading, refreshKey]);

  const isGuest = user?.uid !== project.ownerId;

  const handleSaveSettings = async () => {
    if (!editUrl || !editName || isGuest) return;
    await onUpdateProject(project.id, { name: editName, url: editUrl });
    setShowSettings(false);
  };

  const handleAddComment = async () => {
    if ((!commentText.trim() && !pendingAudioBlob && pendingAttachments.length === 0) || !newPinPos || isGuest) return;
    
    setIsUploading(true);
    try {
      let audioUrl: string | undefined;
      const attachments: Attachment[] = [];

      if (pendingAudioBlob) {
        const formData = new FormData();
        formData.append('file', pendingAudioBlob, 'voice_message.webm');
        const res = await api.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        audioUrl = res.data.url;
      }

      for (const file of pendingAttachments) {
        const formData = new FormData();
        formData.append('file', file, file.name);
        const res = await api.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        attachments.push({
          name: file.name,
          url: res.data.url,
          type: file.type,
          size: file.size
        });
      }

      onAddComment({
        text: commentText,
        x: newPinPos.x,
        y: newPinPos.y,
        selector: newPinPos.selector,
        offsetXPct: newPinPos.offsetXPct,
        offsetYPct: newPinPos.offsetYPct,
        refW: newPinPos.refW,
        refH: newPinPos.refH,
        status: 'open',
        audioUrl,
        attachments: attachments.length > 0 ? attachments : undefined
      });

      setCommentText('');
      setNewPinPos(null);
      setPendingAudioBlob(null);
      setPendingAttachments([]);
    } catch (error) {
      console.error("Upload failed", error);
      showStatus('error', 'Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSummarize = async () => {
    if (comments.length === 0) return;
    setIsSummarizing(true);
    setAiSummary(null);
    try {
      const res = await api.post('/api/ai/summarize', {
        comments: comments.map(c => ({ text: c.text, status: c.status })),
        projectName: project.name
      });
      setAiSummary(res.data.summary);
    } catch (error) {
      console.error("AI Summarization failed", error);
      showStatus('error', 'Failed to generate AI summary.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const openComments = comments.filter(c => c.status === 'open');
  const resolvedComments = comments.filter(c => c.status === 'resolved');

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen overflow-hidden relative">
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">{project.name}</h2>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                {comments.length} Comments
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate max-w-xs">{project.url}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user && user.uid === project.ownerId && (
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Project Settings"
            >
              <Settings size={18} />
            </button>
          )}
          <button 
            onClick={handleRefresh}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
            title="Refresh Preview"
          >
            <History size={18} className={iframeLoading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showComments ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <MessageSquare size={18} />
            Comments ({openComments.length})
          </button>
          <button 
            onClick={handleSummarize}
            disabled={isSummarizing || comments.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors disabled:opacity-50"
          >
            <div className={`w-2 h-2 rounded-full bg-purple-500 ${isSummarizing ? 'animate-ping' : ''}`} />
            {isSummarizing ? 'Analyzing...' : 'AI Summary'}
          </button>
          <button 
            onClick={() => {
              const shareUrl = `${window.location.origin}?project=${project.id}`;
              navigator.clipboard.writeText(shareUrl);
              showStatus('success', 'Share link copied to clipboard!');
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Share2 size={18} />
            Copy Link
          </button>
          
          <div className="flex bg-gray-100 p-1 rounded-lg ml-2">
            <button 
              onClick={() => setViewMode('comment')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'comment' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Comment
            </button>
            <button 
              onClick={() => setViewMode('browse')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'browse' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Browse
            </button>
          </div>

          {/* Device Viewport Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-lg ml-1">
            <button onClick={() => setDeviceType('desktop')} className={`p-1.5 rounded-md transition-all ${deviceType === 'desktop' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="Desktop (1440px)">
              <Monitor size={15} />
            </button>
            <button onClick={() => setDeviceType('tablet')} className={`p-1.5 rounded-md transition-all ${deviceType === 'tablet' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="Tablet (768px)">
              <Tablet size={15} />
            </button>
            <button onClick={() => setDeviceType('mobile')} className={`p-1.5 rounded-md transition-all ${deviceType === 'mobile' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title="Mobile (390px)">
              <Smartphone size={15} />
            </button>
          </div>

          <a 
            href={project.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
          >
            <ExternalLink size={18} />
          </a>
        </div>
      </div>

      <div className="flex-1 relative overflow-auto bg-gray-100" onClick={() => { if (!isGuest) { setActivePinId(null); setNewPinPos(null); } else { setActivePinId(null); } }}>
        {!project.url ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
              <ExternalLink size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Set up your project URL</h3>
            <p className="text-gray-500 mb-8 max-w-sm">Enter the URL of the website you want to collect feedback on.</p>
            <div className="w-full max-w-md flex gap-2">
              <input 
                type="text" 
                placeholder="https://example.com"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
              />
              <button 
                onClick={handleSaveSettings}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Start
              </button>
            </div>
          </div>
        ) : (
          <div 
            className="preview-container device-frame relative mx-auto bg-white shadow-2xl rounded-lg overflow-hidden" 
            style={{ 
              width: deviceType === 'desktop' ? '100%' : `${DEVICE_WIDTHS[deviceType]}px`, 
              maxWidth: `${DEVICE_WIDTHS[deviceType]}px`,
              height: iframeHeight ? `${iframeHeight}px` : '100vh' 
            }}
          >
            {iframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-50">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-500 text-sm animate-pulse">Fetching preview...</p>
              </div>
            )}
            <iframe 
              key={refreshKey}
              src={`/api/proxy?url=${encodeURIComponent(project.url)}`}
              className="w-full h-full border-none"
              title="Project Preview"
              scrolling="no"
              onLoad={() => setIframeLoading(false)}
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-forms"
            />
            
            <div className="absolute inset-0 pointer-events-none">
              <div className="relative w-full h-full">
                {openComments.map(comment => {
                  // Use dynamic position from iframe if available, else fall back to stored position
                  const dynPos = pinPositions[comment.id];
                  const pinX = dynPos ? dynPos.x : comment.x;
                  const pinY = dynPos ? dynPos.y : comment.y;
                  return (
                  <div 
                    key={comment.id}
                    className="absolute pointer-events-auto z-10"
                    style={{ left: `${pinX}px`, top: `${pinY}px` }}
                  >
                    <div 
                      onClick={(e) => { e.stopPropagation(); setActivePinId(activePinId === comment.id ? null : comment.id); }}
                      className={`w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-110 text-white ${activePinId === comment.id ? 'scale-110 ring-4 ring-offset-1' : ''}`}
                      style={{ backgroundColor: comment.color || getAuthorColor(comment.authorId), ringColor: (comment.color || getAuthorColor(comment.authorId)) + '40' }}
                    >
                      <span className="text-[11px] font-bold">{openComments.indexOf(comment) + 1}</span>
                      {(comment.replies?.length || 0) > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-800 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">{comment.replies!.length}</span>}
                    </div>

                    <AnimatePresence>
                      {activePinId === comment.id && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          className="absolute top-10 left-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: comment.color || getAuthorColor(comment.authorId) }}>
                              {getInitials(comment.authorName)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-gray-700">{comment.authorName}</span>
                              <span className="text-[10px] text-gray-400 ml-1.5">{timeAgo(comment.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <button onClick={() => onUpdateComment(comment.id, { status: 'resolved' })} className="p-1 hover:bg-green-50 text-gray-400 hover:text-green-600 rounded transition-colors" title="Resolve"><CheckCircle size={14} /></button>
                              {!isGuest && <button onClick={() => onDeleteComment(comment.id)} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-colors" title="Delete"><Trash2 size={14} /></button>}
                              <button onClick={() => setActivePinId(null)} className="p-1 hover:bg-gray-100 text-gray-400 rounded transition-colors"><X size={14} /></button>
                            </div>
                          </div>
                          <CommentContent comment={comment} />
                          {/* Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-50 space-y-2">
                              {comment.replies.map((r, ri) => (
                                <div key={ri} className="flex gap-2">
                                  <div className="w-5 h-5 rounded-full gradient-blue flex items-center justify-center text-white text-[8px] font-bold shrink-0 mt-0.5">{getInitials(r.authorName)}</div>
                                  <div className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5">
                                    <p className="text-[10px] font-bold text-gray-600">{r.authorName} <span className="font-normal text-gray-400">{timeAgo(r.createdAt)}</span></p>
                                    <p className="text-xs text-gray-700">{r.text}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Reply input */}
                          {onAddReply && (
                            <div className="mt-2 pt-2 border-t border-gray-50 flex gap-1.5 items-center">
                              <input type="text" placeholder="Reply..." className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" value={replyTexts[comment.id] || ''} onChange={(e) => setReplyTexts(prev => ({ ...prev, [comment.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = replyTexts[comment.id]?.trim(); if (t) { onAddReply(comment.id, t); setReplyTexts(prev => ({ ...prev, [comment.id]: '' })); } } }} />
                              <button onClick={() => { const t = replyTexts[comment.id]?.trim(); if (t) { onAddReply(comment.id, t); setReplyTexts(prev => ({ ...prev, [comment.id]: '' })); } }} disabled={!replyTexts[comment.id]?.trim()} className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-40 transition-colors"><Send size={11} /></button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  );
                })}

                {newPinPos && !isGuest && (() => {
                  const container = document.querySelector('.preview-container');
                  const currentW = container?.clientWidth || 1440;
                  const currentH = iframeHeight || 900;
                  const pinX = (newPinPos.x / newPinPos.refW) * currentW;
                  const pinY = (newPinPos.y / newPinPos.refH) * currentH;
                  return (
                  <div 
                    className="absolute pointer-events-auto z-30"
                    style={{ left: `${pinX}px`, top: `${pinY}px` }}
                  >
                    <div className="w-8 h-8 -ml-4 -mt-4 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <Plus size={18} />
                    </div>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="absolute top-10 left-0 w-80 bg-white rounded-xl shadow-2xl border border-blue-100 p-4 z-40"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <textarea 
                        autoFocus
                        placeholder="Add a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="w-full p-3 text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-24 mb-1"
                        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleAddComment(); } }}
                      />
                      <p className="text-[10px] text-gray-400 mb-2">Ctrl+Enter to submit · Esc to cancel</p>
                      
                      {pendingAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {pendingAttachments.map((file, i) => (
                            <div key={i} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] group">
                              <span className="truncate max-w-[100px]">{file.name}</span>
                              <button onClick={() => removeAttachment(i)} className="hover:text-red-500">
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {pendingAudioBlob && (
                        <div className="flex items-center gap-2 mb-3 p-2 bg-green-50 text-green-700 rounded text-[10px]">
                          <Mic size={14} />
                          <span>Voice note recorded</span>
                          <button onClick={() => setPendingAudioBlob(null)} className="ml-auto hover:text-red-500">
                            <X size={10} />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 mt-3">
                        <div className="flex items-center gap-1">
                          <AudioRecorder 
                            onRecordingComplete={(blob) => setPendingAudioBlob(blob)}
                            audioTrackConstraints={{
                              noiseSuppression: true,
                              echoCancellation: true,
                            }} 
                            showVisualizer={true}
                          />
                          <label className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer text-gray-500 transition-colors">
                            <input 
                              type="file" 
                              className="hidden" 
                              multiple 
                              onChange={handleFileChange}
                            />
                            <Paperclip size={18} />
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => { setNewPinPos(null); setPendingAudioBlob(null); setPendingAttachments([]); }}
                            className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleAddComment}
                            disabled={isUploading || (!commentText.trim() && !pendingAudioBlob && pendingAttachments.length === 0)}
                            className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isUploading ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Uploading...
                              </>
                            ) : 'Drop Pin'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute right-0 top-14 bottom-0 w-80 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col"
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Settings size={18} className="text-blue-600" />
                Project Settings
              </h3>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Project Name</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Target URL</label>
                <input 
                  type="text" 
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button 
                onClick={handleSaveSettings}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute right-0 top-14 bottom-0 w-80 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col"
          >
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare size={18} className="text-blue-600" />
                  Feedback
                </h3>
                <button onClick={() => setShowComments(false)} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                  <XCircle size={20} />
                </button>
              </div>

              {aiSummary && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-purple-50 border border-purple-100 rounded-xl relative group"
                >
                  <button 
                    onClick={() => setAiSummary(null)}
                    className="absolute top-2 right-2 p-1 text-purple-300 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                  <div className="flex items-center gap-2 mb-2 text-purple-700">
                    <div className="p-1 bg-purple-100 rounded-lg">
                      <LayoutIcon size={14} className="text-purple-600" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">AI Insights</span>
                  </div>
                  <div className="prose prose-sm prose-purple max-h-60 overflow-y-auto text-[11px] leading-relaxed text-purple-900 scrollbar-thin scrollbar-thumb-purple-200">
                    {aiSummary.split('\n').map((line, i) => (
                      <p key={i} className="mb-1">{line}</p>
                    ))}
                  </div>
                </motion.div>
              )}
              <div className="flex p-1 bg-gray-100 rounded-lg">
                <button 
                  onClick={() => setSidebarTab('active')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${sidebarTab === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Active ({openComments.length})
                </button>
                <button 
                  onClick={() => setSidebarTab('resolved')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${sidebarTab === 'resolved' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Resolved ({resolvedComments.length})
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {sidebarTab === 'active' ? (
                openComments.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare size={40} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No active comments</p>
                  </div>
                ) : (
                  openComments.map((comment, idx) => (
                    <div 
                      key={comment.id} 
                      onClick={() => setActivePinId(comment.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${activePinId === comment.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-gray-100 hover:border-blue-100 hover:shadow-sm'}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: comment.color || getAuthorColor(comment.authorId) }}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-gray-700">{comment.authorName}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">{timeAgo(comment.createdAt)}</span>
                        <button onClick={(e) => { e.stopPropagation(); onUpdateComment(comment.id, { status: 'resolved' }); }} className="p-1 hover:bg-green-50 text-gray-400 hover:text-green-600 rounded transition-colors"><CheckCircle size={13} /></button>
                      </div>
                      <CommentContent comment={comment} />
                      {(comment.replies?.length || 0) > 0 && <p className="text-[10px] text-blue-500 mt-1.5 font-medium">{comment.replies!.length} repl{comment.replies!.length === 1 ? 'y' : 'ies'}</p>}
                    </div>
                  ))
                )
              ) : (
                resolvedComments.length === 0 ? (
                  <div className="text-center py-12">
                    <History size={40} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No resolved comments yet</p>
                  </div>
                ) : (
                  resolvedComments.map(comment => (
                    <div key={comment.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 opacity-75">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: comment.color || getAuthorColor(comment.authorId) }}>{getInitials(comment.authorName)}</div>
                        <span className="text-xs font-medium text-gray-500 flex-1">{comment.authorName}</span>
                        <button onClick={() => onUpdateComment(comment.id, { status: 'open' })} className="text-[10px] font-semibold text-blue-600 hover:underline">Reopen</button>
                      </div>
                      <CommentContent comment={comment} />
                      <p className="text-[9px] text-gray-400 mt-2">{timeAgo(comment.createdAt)}</p>
                    </div>
                  ))
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Toast */}
      {statusMessage && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl text-sm font-medium text-white shadow-2xl backdrop-blur-xl animate-toast-in flex items-center gap-2 ${
          statusMessage.type === 'success' ? 'bg-emerald-600/90' : 'bg-red-600/90'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {statusMessage.text}
        </div>
      )}
    </div>
  );
};
