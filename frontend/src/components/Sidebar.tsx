import React, { useState, FormEvent } from 'react';
import { 
  FolderPlus, 
  Plus, 
  Folder as FolderIcon, 
  Layout as LayoutIcon, 
  PanelLeftClose, 
  PanelLeftOpen,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Project } from '../types';
import { getInitials } from '../services/api';

interface SidebarProps {
  user: any;
  folders: Folder[];
  projects: Project[];
  onSelectProject: (id: string | null) => void;
  selectedProjectId: string | null;
  onAddFolder: (name: string) => void;
  onAddProject: (folderId: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onDeleteProject: (id: string) => void;
  expandedFolders: Record<string, boolean>;
  toggleFolder: (id: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onSelectFolder: (id: string | null) => void;
  selectedFolderId: string | null;
}

export const Sidebar = ({ 
  user, 
  folders, 
  projects, 
  onSelectProject, 
  selectedProjectId,
  onAddFolder,
  onAddProject,
  expandedFolders,
  toggleFolder,
  isCollapsed,
  setIsCollapsed,
  onSelectFolder,
  selectedFolderId
}: SidebarProps) => {
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [addingProjectToFolder, setAddingProjectToFolder] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');

  const handleAddFolderSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onAddFolder(newFolderName.trim());
      setNewFolderName('');
      setIsAddingFolder(false);
    }
  };

  const handleAddProjectSubmit = (e: FormEvent, folderId: string) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      onAddProject(folderId, newProjectName.trim());
      setNewProjectName('');
      setAddingProjectToFolder(null);
    }
  };

  const getProjectCount = (folderId: string) => projects.filter(p => p.folderId === folderId).length;

  if (isCollapsed) {
    return (
      <div className="w-16 gradient-dark text-white h-screen flex flex-col border-r border-gray-800/50 shrink-0 transition-all duration-300 items-center py-4">
        <button 
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <PanelLeftOpen size={20} />
        </button>
        <div className="flex-1 flex flex-col items-center gap-3">
          <button onClick={() => { onSelectFolder(null); onSelectProject(null); }} className={`p-3 rounded-xl transition-all ${!selectedFolderId && !selectedProjectId ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-400 hover:bg-white/10'}`}>
            <LayoutIcon size={20} />
          </button>
          {folders.map(f => (
            <button 
              key={f.id} 
              onClick={() => { onSelectFolder(f.id); onSelectProject(null); }}
              className={`p-3 rounded-xl transition-all relative ${selectedFolderId === f.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-400 hover:bg-white/10'}`}
              title={f.name}
            >
              <FolderIcon size={20} />
              {getProjectCount(f.id) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-[9px] font-bold rounded-full flex items-center justify-center">
                  {getProjectCount(f.id)}
                </span>
              )}
            </button>
          ))}
        </div>
        {user && (
          <div className="w-9 h-9 rounded-full gradient-blue flex items-center justify-center text-white text-xs font-bold border-2 border-gray-700">
            {getInitials(user.displayName || 'U')}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-64 gradient-dark text-white h-screen flex flex-col border-r border-gray-800/50 shrink-0 transition-all duration-300">
      <div className="p-5 border-b border-gray-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 gradient-blue rounded-lg flex items-center justify-center font-bold text-lg shrink-0 shadow-lg shadow-blue-600/30">M</div>
          <h1 className="text-lg font-bold tracking-tight truncate">MetaMark</h1>
        </div>
        <button 
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <button 
          onClick={() => { onSelectFolder(null); onSelectProject(null); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-5 transition-all ${!selectedFolderId && !selectedProjectId ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
          <LayoutIcon size={18} />
          <span className="font-medium text-sm">Dashboard</span>
        </button>

        <div className="flex items-center justify-between mb-3 px-2">
          <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Folders</h2>
          <button 
            onClick={() => setIsAddingFolder(true)} 
            className="p-1 hover:bg-white/10 rounded-lg text-gray-500 hover:text-blue-400 transition-colors"
            title="Add Folder"
          >
            <FolderPlus size={14} />
          </button>
        </div>

        {isAddingFolder && (
          <form onSubmit={handleAddFolderSubmit} className="mb-3 px-1">
            <input 
              autoFocus
              type="text" 
              placeholder="Folder name..."
              className="w-full bg-white/5 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-gray-600"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onBlur={() => !newFolderName && setIsAddingFolder(false)}
              onKeyDown={(e) => e.key === 'Escape' && setIsAddingFolder(false)}
            />
          </form>
        )}

        <div className="space-y-0.5">
          {folders.map(folder => {
            const projectCount = getProjectCount(folder.id);
            const isExpanded = expandedFolders[folder.id];
            return (
            <div key={folder.id} className="space-y-0.5">
              <div 
                className={`group flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer transition-all ${selectedFolderId === folder.id && !selectedProjectId ? 'bg-blue-600/15 text-blue-400' : 'hover:bg-white/5 text-gray-300 hover:text-white'}`}
                onClick={() => { onSelectFolder(folder.id); onSelectProject(null); toggleFolder(folder.id); }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isExpanded ? <ChevronDown size={14} className="text-gray-500 shrink-0" /> : <ChevronRight size={14} className="text-gray-500 shrink-0" />}
                  <FolderIcon size={15} className={selectedFolderId === folder.id ? 'text-blue-400' : 'text-gray-500'} />
                  <span className="truncate text-sm font-medium">{folder.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {projectCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-white/10 text-[10px] font-bold rounded-md text-gray-400">
                      {projectCount}
                    </span>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setAddingProjectToFolder(folder.id); if (!isExpanded) toggleFolder(folder.id); }} 
                    className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all"
                    title="Add Project"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="ml-5 pl-3 border-l border-gray-800/50 space-y-0.5 overflow-hidden"
                  >
                    {addingProjectToFolder === folder.id && (
                      <form onSubmit={(e) => handleAddProjectSubmit(e, folder.id)} className="mb-1 pr-1">
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="Project name..."
                          className="w-full bg-white/5 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-gray-600"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          onBlur={() => !newProjectName && setAddingProjectToFolder(null)}
                          onKeyDown={(e) => e.key === 'Escape' && setAddingProjectToFolder(null)}
                        />
                      </form>
                    )}
                    {projects.filter(p => p.folderId === folder.id).map(project => (
                      <div 
                        key={project.id}
                        onClick={() => onSelectProject(project.id)}
                        className={`group/item flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all ${selectedProjectId === project.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-white/5 text-gray-400 hover:text-gray-200'}`}
                      >
                        <LayoutIcon size={13} className="shrink-0" />
                        <span className="truncate text-[13px]">{project.name}</span>
                      </div>
                    ))}
                    {projects.filter(p => p.folderId === folder.id).length === 0 && addingProjectToFolder !== folder.id && (
                      <p className="text-[11px] text-gray-600 py-2 px-2">No projects yet</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            );
          })}
        </div>

        {folders.length === 0 && !isAddingFolder && (
          <div className="text-center py-8 px-2">
            <FolderIcon size={28} className="text-gray-700 mx-auto mb-3" />
            <p className="text-xs text-gray-600">No folders yet</p>
            <button 
              onClick={() => setIsAddingFolder(true)}
              className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              + Create your first folder
            </button>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-800/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full gradient-blue flex items-center justify-center text-white text-xs font-bold shrink-0">
            {getInitials(user?.displayName || 'U')}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.displayName}</p>
            <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
