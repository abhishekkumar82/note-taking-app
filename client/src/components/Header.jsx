// src/components/Header.jsx
import React, { useState, useEffect } from 'react';
import {
  Search, LogOut, Sun, Moon, Menu, X,
  Lightbulb, Bell, BookOpen, CalendarDays, BarChart2,
  FolderOpen, Lock, Archive, ArchiveRestore,
  ChevronDown, ChevronRight, Plus, Trash2, Pencil, Crown, Command,
} from 'lucide-react';
import { RefreshCw } from "lucide-react";
import api from '../utils/axiosInstance';
import SmartSearchBar from "./SmartSearchBar";
import { LogoFull } from './Logo';
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
  onSemanticResults,
  onOpenCommandPalette,
  showToastMsg,   // ⭐ ADD THIS
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
  const [darkMode,      setDarkMode]      = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [foldersOpen,   setFoldersOpen]   = useState(true);
  const [openFolders,   setOpenFolders]   = useState({});
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderInput,   setFolderInput]   = useState('');
const [reindexing, setReindexing] = useState(false);
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

const handleReindex = async () => {
  setReindexing(true);
  try {
    const res = await api.post("/api/search/reindex");
    showToastMsg?.(`🔄 Indexing ${res.data.queued} note(s) for smart search…`, "success");
  } catch (err) {
    showToastMsg?.("Reindex failed", "error");
  } finally {
    setReindexing(false);
  }
};

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

          {/* Hamburger — always visible */}
          <button className="hamburger-btn" onClick={() => setSidebarOpen(v => !v)} aria-label="Menu">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Logo — icon always, text hidden on mobile via CSS */}
          <LogoFull size={34} />

          {/* Search + palette — hidden on mobile, visible on tablet+ */}
          <div className="header-search-tools">
            <SmartSearchBar onSearch={onSearch} onSemanticResults={onSemanticResults} />
            <button
              type="button"
              className="cp-trigger"
              onClick={onOpenCommandPalette}
              title="Open command palette (Ctrl K)"
              aria-label="Open command palette"
            >
              <Command size={16} />
              <span className="cp-trigger-label">Palette</span>
              <kbd>Ctrl K</kbd>
            </button>
          </div>

          {/* Right nav — shrinks on mobile */}
          <div className="user-nav">
            <span className="user-greeting">Hi, {userName}</span>

            {isPremium && (
              <span className="header-pro-badge" title="Premium">
                <Crown size={11} /> PRO
              </span>
            )}

            <button onClick={toggleDarkMode} className="theme-btn" title="Toggle Dark Mode">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={handleReindex}
              className="theme-btn header-reindex-btn"
              title="Re-index notes for smart search"
              disabled={reindexing}
            >
              <RefreshCw size={16} style={{ animation: reindexing ? "spin 1s linear infinite" : "none" }} />
            </button>

            <button
              onClick={() => window.location.href = 'http://localhost:9090/auth/logout'}
              className="logout-btn"
              title="Logout"
            >
              <LogOut size={18} />
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

        {/* Mobile-only search bar inside the sidebar */}
        <div className="hs-mobile-search">
          <Search size={15} className="hs-mobile-search-icon" />
          <SmartSearchBar
            onSearch={(results, term) => { onSearch(results, term); setSidebarOpen(false); }}
            onSemanticResults={(results, term) => { onSemanticResults(results, term); setSidebarOpen(false); }}
          />
        </div>

        {/* Mobile-only command palette button */}
        <button
          className="hs-mobile-palette"
          onClick={() => { onOpenCommandPalette(); setSidebarOpen(false); }}
        >
          <Command size={16} /> Command Palette
          <kbd className="hs-kbd">Ctrl K</kbd>
        </button>

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

