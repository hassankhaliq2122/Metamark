import React, { useState, FormEvent } from 'react';
import { Plus, Folder as FolderIcon, FolderPlus, Edit2, Trash2, Layout as LayoutIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Folder } from '../types';

interface DashboardViewProps {
  folders: Folder[];
  projects?: any[];
  onSelectFolder: (id: string) => void;
  onAddFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onUpdateFolder: (id: string, name: string) => void;
}

export const DashboardView = ({ 
  folders, 
  projects = [],
  onSelectFolder, 
  onAddFolder, 
  onDeleteFolder,
  onUpdateFolder 
}: DashboardViewProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddFolder(newName.trim());
      setNewName('');
      setIsAdding(false);
    }
  };

  const handleUpdate = (e: FormEvent, id: string) => {
    e.preventDefault();
    if (editName.trim()) {
      onUpdateFolder(id, editName.trim());
      setEditingId(null);
    }
  };

  const getProjectCount = (folderId: string) => projects.filter(p => p.folderId === folderId).length;

  const totalProjects = projects.length;

  return (
    <div className="flex-1 bg-gray-50 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Hero Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
              <p className="text-gray-500 mt-1">
                {folders.length} folder{folders.length !== 1 ? 's' : ''} · {totalProjects} project{totalProjects !== 1 ? 's' : ''}
              </p>
            </div>
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 gradient-blue text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus size={20} />
              New Folder
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-2xl border-2 border-dashed border-blue-200 flex flex-col items-center justify-center text-center"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                <FolderPlus size={24} className="text-blue-600" />
              </div>
              <form onSubmit={handleSubmit} className="w-full">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Folder name..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3 text-sm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setIsAdding(false)}
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium gradient-blue text-white rounded-xl">Create</button>
                </div>
              </form>
            </motion.div>
          )}

          {folders.map((folder, i) => {
            const projectCount = getProjectCount(folder.id);
            return (
            <motion.div 
              key={folder.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              layout
              className="group bg-white p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50/50 transition-all cursor-pointer relative"
              onClick={() => onSelectFolder(folder.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <FolderIcon size={22} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingId(folder.id); setEditName(folder.name); }}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {editingId === folder.id ? (
                <form onSubmit={(e) => handleUpdate(e, folder.id)} onClick={e => e.stopPropagation()}>
                  <input 
                    autoFocus
                    type="text" 
                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 text-sm"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                  />
                </form>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{folder.name}</h3>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">{new Date(folder.createdAt).toLocaleDateString()}</p>
                    <div className="flex items-center gap-1.5">
                      <LayoutIcon size={13} className="text-gray-400" />
                      <span className="text-xs font-medium text-gray-400">{projectCount} project{projectCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
            );
          })}

          {folders.length === 0 && !isAdding && (
            <div className="col-span-full py-20 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl flex items-center justify-center text-blue-400 mx-auto mb-6 animate-float">
                <FolderIcon size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Welcome to MetaMark</h3>
              <p className="text-gray-500 mb-8 max-w-sm mx-auto">Create your first folder to start organizing your website feedback projects.</p>
              <button 
                onClick={() => setIsAdding(true)}
                className="gradient-blue text-white px-8 py-3 rounded-xl font-semibold hover:shadow-xl hover:shadow-blue-200 transition-all hover:-translate-y-0.5"
              >
                Create Your First Folder
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
