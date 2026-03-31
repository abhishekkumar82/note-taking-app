// src/components/Header.jsx
import React, { useState, useEffect } from 'react';
import {
  Search, LogOut, Sun, Moon, Menu, X,
  Lightbulb, Bell, BookOpen, CalendarDays, BarChart2,
  FolderOpen, Lock, Archive, ArchiveRestore,
  ChevronDown, ChevronRight, Plus, Trash2, Pencil, Crown,
} from 'lucide-react';
import api from '../utils/axiosInstance';
import '../index.css';

// Sections visible to everyone (no premium gate in sidebar)
const SIDEBAR_SECTIONS = [
  { id: "notes",     label: "Notes",          icon: Lightbulb,    premium: false },
  { id: "reminders", label: "Reminders",      icon: Bell,         premium: false },
  { id: "diary",     label: "Personal Diary", icon: BookOpen,     premium: true  },
  // { id: "routine",   label: "Daily Routine",  icon: CalendarDays, premium: false },
  { id: "habits",    label: "Habit Tracker",  icon: BarChart2,    premium: true  },
];

const Header = ({
  onSearch,
  userName,
  activeSection,
  setActiveSection,
  folders,
  onAddFolder,
  onDeleteFolder,
  onRenameFolder,
  onFolderSelect,
  selectedFolder,
  onFetchTrash,
  archivedCount = 0,
  isPremium = false,   // ← received from Dashboard
}) => {
  const [searchTerm,    setSearchTerm]    = useState('');
  const [darkMode,      setDarkMode]      = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [foldersOpen,   setFoldersOpen]   = useState(true);
  const [openFolders,   setOpenFolders]   = useState({});
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderInput,   setFolderInput]   = useState('');

  // Theme persistence
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { document.body.classList.add('dark'); setDarkMode(true); }
    else if (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark'); setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('themeColor');
    if (saved) {
      document.body.classList.remove('theme-blue', 'theme-green', 'theme-purple');
      document.body.classList.add(saved);
    }
  }, []);

  const toggleDarkMode = () => {
    document.body.classList.toggle('dark', !darkMode);
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
    setDarkMode(!darkMode);
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchTerm.trim()) { onSearch(null, ''); return; }
      try {
        const res = await api.post('/api/dashboard/search', { searchTerm });
        onSearch(res.data.searchResults, searchTerm);
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const navClick = (id) => {
    setActiveSection(id);          // Dashboard's intercepted version handles premium check
    if (id === 'trash') onFetchTrash?.();
    setSidebarOpen(false);
  };

  const toggleSubfolder = (name) => setOpenFolders(p => ({ ...p, [name]: !p[name] }));

  const handleAddFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    onAddFolder?.(name);
    setNewFolderName('');
  };

  const groupedFolders = (folders || []).reduce((acc, f) => {
    const parent = f.parent || null;
    if (!parent) { if (!acc[f.name]) acc[f.name] = []; }
    else { if (!acc[parent]) acc[parent] = []; acc[parent].push(f.name); }
    return acc;
  }, {});

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="main-header">
        <div className="header-container">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(v => !v)} aria-label="Menu">
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="logo-section">
            <img src="/logo (1).png" alt="WriteUp" className="logo-img" />
            <span className="logo-text">Write Up</span>
          </div>
          <form onSubmit={e => e.preventDefault()} className="search-form">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search your notes…"
              className="search-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </form>
          <div className="user-nav">
            <span className="user-greeting">Hi, {userName}</span>
            {/* Premium badge in header */}
            {isPremium && (
              <span title="Premium" style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                background: "linear-gradient(135deg,#f59e0b,#f97316)",
                color: "#fff", fontSize: 11, fontWeight: 700,
                padding: "2px 8px", borderRadius: 20, letterSpacing: 0.3,
              }}>
                <Crown size={11} /> PRO
              </span>
            )}
            <button onClick={toggleDarkMode} className="theme-btn" title="Toggle Dark Mode">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => window.location.href = 'http://localhost:9090/auth/logout'}
              className="logout-btn"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`hamburger-sidebar ${sidebarOpen ? 'hamburger-sidebar--open' : ''}`}>
        <div className="hs-header">
          <span className="hs-brand">Menu</span>
          <button className="hs-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>

        <nav className="hs-nav">
          {/* Main sections */}
          {SIDEBAR_SECTIONS.map(({ id, label, icon: Icon, premium: needsPremium }) => (
            <button
              key={id}
              className={`hs-item ${activeSection === id ? 'hs-item--active' : ''}`}
              onClick={() => navClick(id)}
              title={needsPremium && !isPremium ? `${label} — Premium feature 💎` : label}
            >
              <Icon size={18} />
              <span>{label}</span>
              {/* Lock icon for non-premium users on premium sections */}
              {needsPremium && !isPremium && (
                <span style={{
                  marginLeft: "auto", display: "flex", alignItems: "center", gap: 2,
                  fontSize: 10, fontWeight: 700, color: "#f59e0b",
                }}>
                  💎
                </span>
              )}
            </button>
          ))}

          <div className="hs-divider" />

          {/* Folders */}
          <button className="hs-item hs-item--section" onClick={() => setFoldersOpen(v => !v)}>
            <FolderOpen size={18} /><span>Folders</span>
            {foldersOpen
              ? <ChevronDown  size={13} style={{ marginLeft: 'auto' }} />
              : <ChevronRight size={13} style={{ marginLeft: 'auto' }} />}
          </button>

          {foldersOpen && (
            <div className="hs-folders">
              <button
                className={`hs-folder-item ${selectedFolder === 'All' && activeSection === 'notes' ? 'active' : ''}`}
                onClick={() => { onFolderSelect?.('All'); setActiveSection('notes'); setSidebarOpen(false); }}
              >
                All Notes
              </button>

              {Object.keys(groupedFolders).map(parent => (
                <div key={parent}>
                  <div className="hs-folder-row">
                    {editingFolder === parent ? (
                      <input
                        className="hs-folder-input"
                        value={folderInput}
                        onChange={e => setFolderInput(e.target.value)}
                        onBlur={() => { onRenameFolder?.(parent, folderInput.trim()); setEditingFolder(null); }}
                        autoFocus
                      />
                    ) : (
                      <>
                        <button
                          className={`hs-folder-item ${selectedFolder === parent && activeSection === 'notes' ? 'active' : ''}`}
                          onClick={() => { onFolderSelect?.(parent); setActiveSection('notes'); setSidebarOpen(false); }}
                        >
                          <span onClick={e => { e.stopPropagation(); toggleSubfolder(parent); }}>
                            {openFolders[parent] ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                          </span>
                          📁 {parent}
                        </button>
                        <div className="hs-folder-actions">
                          <Pencil size={11} onClick={() => { setEditingFolder(parent); setFolderInput(parent); }} />
                          <Trash2 size={11} onClick={() => onDeleteFolder?.(parent)} />
                        </div>
                      </>
                    )}
                  </div>

                  {openFolders[parent] && groupedFolders[parent].map(child => (
                    <button
                      key={child}
                      className={`hs-folder-item hs-folder-child ${selectedFolder === child ? 'active' : ''}`}
                      onClick={() => { onFolderSelect?.(child); setActiveSection('notes'); setSidebarOpen(false); }}
                    >
                      📂 {child}
                    </button>
                  ))}
                </div>
              ))}

              <div className="hs-new-folder">
                <input
                  placeholder="New folder…"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddFolder()}
                />
                <button onClick={handleAddFolder}><Plus size={13} /></button>
              </div>
            </div>
          )}

          <div className="hs-divider" />

          {/* Archive */}
          <button
            className={`hs-item ${activeSection === 'archived' ? 'hs-item--active' : ''}`}
            onClick={() => navClick('archived')}
          >
            <Archive size={18} />
            <span>Archive</span>
            {archivedCount > 0 && (
              <span className="hs-badge">{archivedCount}</span>
            )}
          </button>

          {/* Trash */}
          <button
            className={`hs-item ${activeSection === 'trash' ? 'hs-item--active' : ''}`}
            onClick={() => navClick('trash')}
          >
            <Trash2 size={18} /><span>Trash</span>
          </button>

          {/* Locked notes — premium gated */}
          <button
            className={`hs-item ${activeSection === 'locked' ? 'hs-item--active' : ''}`}
            onClick={() => navClick('locked')}
            title={!isPremium ? "Locked Notes — Premium feature 💎" : "Locked Notes"}
          >
            <Lock size={18} />
            <span>Locked Notes</span>
            {!isPremium && (
              <span style={{
                marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "#f59e0b",
              }}>
                💎
              </span>
            )}
          </button>
        </nav>
      </aside>
    </>
  );
};

export default Header;

