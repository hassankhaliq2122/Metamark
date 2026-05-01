import React, { useState, FormEvent } from 'react';
import { Plus, Layout as LayoutIcon, Trash2, ArrowLeft, MessageSquare, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { Folder, Project } from '../types';
import { timeAgo } from '../services/api';

interface FolderViewProps {
  folder: Folder;
  projects: Project[];
  comments?: any[];
  onSelectProject: (id: string) => void;
  onAddProject: (folderId: string, name: string, url: string) => void;
  onDeleteProject: (id: string) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onBack: () => void;
}

export const FolderView = ({ 
  folder, 
  projects, 
  onSelectProject, 
  onAddProject, 
  onDeleteProject,
  onBack 
}: FolderViewProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newUrl.trim()) {
      onAddProject(folder.id, newName.trim(), newUrl.trim());
      setNewName('');
      setNewUrl('');
      setIsAdding(false);
    }
  };

  const getFavicon = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch { return null; }
  };

  return (
    <div className="flex-1 bg-gray-50 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors mb-6 font-medium text-sm"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{folder.name}</h1>
            <p className="text-gray-500 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''} in this folder</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 gradient-blue text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={20} />
            New Project
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-2xl border-2 border-dashed border-blue-200"
            >
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Globe size={18} className="text-blue-600" />
                New Project
              </h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Project name..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setIsAdding(false)}
                />
                <input 
                  type="text" 
                  placeholder="https://example.com"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium gradient-blue text-white rounded-xl">Create</button>
                </div>
              </form>
            </motion.div>
          )}

          {projects.map((project, i) => {
            const favicon = project.url ? getFavicon(project.url) : null;
            return (
            <motion.div 
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              layout
              className="group bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50/50 transition-all cursor-pointer overflow-hidden"
              onClick={() => onSelectProject(project.id)}
            >
              <div className="h-40 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                {project.thumbnailUrl ? (
                  <img 
                    src={project.thumbnailUrl} 
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                    <LayoutIcon size={48} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                    className="p-2 bg-white/90 backdrop-blur hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors shadow-sm"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  {favicon && <img src={favicon} alt="" className="w-4 h-4 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                  <h3 className="text-base font-bold text-gray-900 truncate">{project.name}</h3>
                </div>
                <p className="text-xs text-gray-400 truncate mb-3">{project.url || 'No URL set'}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-gray-400">{timeAgo(project.createdAt)}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${project.url ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                    {project.url ? 'Active' : 'Draft'}
                  </span>
                </div>
              </div>
            </motion.div>
            );
          })}

          {projects.length === 0 && !isAdding && (
            <div className="col-span-full py-20 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl flex items-center justify-center text-blue-400 mx-auto mb-6 animate-float">
                <LayoutIcon size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No projects in this folder</h3>
              <p className="text-gray-500 mb-8 max-w-sm mx-auto">Add a website URL to start collecting feedback with pin comments.</p>
              <button 
                onClick={() => setIsAdding(true)}
                className="gradient-blue text-white px-8 py-3 rounded-xl font-semibold hover:shadow-xl hover:shadow-blue-200 transition-all hover:-translate-y-0.5"
              >
                Add Your First Project
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
