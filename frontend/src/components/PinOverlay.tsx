import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, CheckCircle, Trash2, Send, X, Download, FileText } from 'lucide-react';
import { Comment, Reply } from '../types';
import { getAuthorColor, getInitials, timeAgo, MOCK_USER } from '../services/api';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';
const api = axios.create({ baseURL: API_URL });

interface PinOverlayProps {
  comments: Comment[];
  activePinId: string | null;
  setActivePinId: (id: string | null) => void;
  pinPositions: Record<string, { x: number; y: number }>;
  onUpdateComment: (id: string, updates: Partial<Comment>) => void;
  onDeleteComment: (id: string) => void;
  onAddReply: (commentId: string, text: string) => void;
  isGuest: boolean;
}

export const PinOverlay = ({
  comments,
  activePinId,
  setActivePinId,
  pinPositions,
  onUpdateComment,
  onDeleteComment,
  onAddReply,
  isGuest,
}: PinOverlayProps) => {
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);

  const handleReply = async (commentId: string) => {
    const text = replyTexts[commentId]?.trim();
    if (!text) return;
    setSubmittingReply(commentId);
    await onAddReply(commentId, text);
    setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
    setSubmittingReply(null);
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {comments.filter(c => c.status === 'open').map((comment, idx) => {
        const dynPos = pinPositions[comment.id];
        const pinX = dynPos ? dynPos.x : comment.x;
        const pinY = dynPos ? dynPos.y : comment.y;
        const color = comment.color || getAuthorColor(comment.authorId);
        const replyCount = comment.replies?.length || 0;
        const isActive = activePinId === comment.id;

        return (
          <div
            key={comment.id}
            className="absolute pointer-events-auto"
            style={{ left: `${pinX}px`, top: `${pinY}px`, zIndex: isActive ? 30 : 10 }}
          >
            {/* Pin Button */}
            <div
              onClick={(e) => { e.stopPropagation(); setActivePinId(isActive ? null : comment.id); }}
              className={`w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-all hover:scale-110 ${isActive ? 'scale-110 ring-4 ring-offset-1' : ''}`}
              style={{ 
                backgroundColor: color, 
                color: 'white',
                ringColor: color + '40'
              }}
            >
              <span className="text-[11px] font-bold">{idx + 1}</span>
              {replyCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-800 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                  {replyCount}
                </span>
              )}
            </div>

            {/* Popover */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 8 }}
                  className="absolute top-10 left-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                  style={{ zIndex: 50 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center gap-2.5 px-4 pt-3 pb-2 border-b border-gray-50">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ backgroundColor: color }}>
                      {getInitials(comment.authorName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">{comment.authorName}</p>
                      <p className="text-[10px] text-gray-400">{timeAgo(comment.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => onUpdateComment(comment.id, { status: 'resolved' })} className="p-1.5 hover:bg-green-50 text-gray-400 hover:text-green-600 rounded-lg transition-colors" title="Resolve">
                        <CheckCircle size={14} />
                      </button>
                      {!isGuest && (
                        <button onClick={() => onDeleteComment(comment.id)} className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                      <button onClick={() => setActivePinId(null)} className="p-1.5 hover:bg-gray-100 text-gray-400 rounded-lg transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Comment body */}
                  <div className="px-4 py-3 max-h-48 overflow-y-auto space-y-2">
                    {comment.text && <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{comment.text}</p>}
                    {comment.audioUrl && (
                      <audio controls className="w-full h-8"><source src={comment.audioUrl} type="audio/webm" /></audio>
                    )}
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="space-y-1">
                        {comment.attachments.map((f, i) => (
                          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs text-blue-600 transition-colors">
                            <FileText size={12} className="text-gray-400" />
                            <span className="truncate flex-1">{f.name}</span>
                            <Download size={12} className="text-gray-300" />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="space-y-2 pt-1 border-t border-gray-50 mt-2">
                        {comment.replies.map((r, i) => (
                          <div key={i} className="flex gap-2">
                            <div className="w-5 h-5 rounded-full gradient-blue flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-0.5">
                              {getInitials(r.authorName)}
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-lg px-2.5 py-1.5">
                              <p className="text-[10px] font-bold text-gray-600">{r.authorName} <span className="font-normal text-gray-400">{timeAgo(r.createdAt)}</span></p>
                              <p className="text-xs text-gray-700">{r.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reply input */}
                  <div className="px-4 pb-3 pt-1 border-t border-gray-50">
                    <div className="flex gap-2 items-center">
                      <div className="w-6 h-6 rounded-full gradient-blue flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                        {getInitials(MOCK_USER.displayName)}
                      </div>
                      <input
                        type="text"
                        placeholder="Reply..."
                        className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                        value={replyTexts[comment.id] || ''}
                        onChange={(e) => setReplyTexts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(comment.id); } }}
                      />
                      <button
                        onClick={() => handleReply(comment.id)}
                        disabled={!replyTexts[comment.id]?.trim() || submittingReply === comment.id}
                        className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
