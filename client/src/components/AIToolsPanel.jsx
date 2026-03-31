// src/components/AIToolsPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Drop this panel into AddNote.jsx and EditNoteModal.jsx
// Usage:
//   <AIToolsPanel
//     getText={() => editor.getText()}
//     onResult={(text) => editor.commands.setContent(text)}
//     showToastMsg={showToastMsg}
//   />
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import {
  summarizeNote,
  improveNote,
  extractTodos,
  translateNote,
  suggestTitle,
  expandNote,
  analyzeMood,
} from "../services/groqAI";

const TOOLS = [
  { id: "summarize", label: "Summarize",     emoji: "📝", desc: "Condense into 2–3 lines" },
  { id: "improve",   label: "Improve",       emoji: "✨", desc: "Make clearer & professional" },
  { id: "expand",    label: "Expand",        emoji: "🔍", desc: "Add more detail" },
  { id: "todos",     label: "Extract Todos", emoji: "✅", desc: "Pull out action items" },
  { id: "title",     label: "Suggest Title", emoji: "🏷️", desc: "Auto-generate a title" },
  { id: "translate", label: "Translate",     emoji: "🌐", desc: "Translate to another language" },
  { id: "mood",      label: "Mood Analysis", emoji: "💭", desc: "Understand the emotion" },
];

const LANGUAGES = ["Hindi","Spanish","French","German","Japanese","Arabic","Portuguese","Bengali","Tamil"];

const AIToolsPanel = ({ getText, onResult, onTitleSuggest, showToastMsg }) => {
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(null); // tool id currently running
  const [lang, setLang]         = useState("Hindi");
  const [preview, setPreview]   = useState(null); // { tool, result }

  const run = async (toolId) => {
    const text = getText?.();
    if (!text || text.trim().length < 5) {
      showToastMsg?.("Write something first ✍️", "error");
      return;
    }

    setLoading(toolId);
    setPreview(null);

    try {
      let result = "";
      if (toolId === "summarize") result = await summarizeNote(text);
      if (toolId === "improve")   result = await improveNote(text);
      if (toolId === "expand")    result = await expandNote(text);
      if (toolId === "todos")     result = await extractTodos(text);
      if (toolId === "title")     result = await suggestTitle(text);
      if (toolId === "translate") result = await translateNote(text, lang);
      if (toolId === "mood")      result = await analyzeMood(text);

      // Title just fills the title input, not the editor
      if (toolId === "title" && onTitleSuggest) {
        onTitleSuggest(result);
        showToastMsg?.("🏷️ Title suggested!", "success");
      } else {
        setPreview({ tool: toolId, result });
      }
    } catch (err) {
      showToastMsg?.(`AI error: ${err.message}`, "error");
    } finally {
      setLoading(null);
    }
  };

  const applyResult = () => {
    if (!preview) return;
    onResult?.(preview.result);
    setPreview(null);
    showToastMsg?.("✅ Applied!", "success");
  };

  return (
    <div className="ai-panel">
      {/* Toggle button */}
      <button
        type="button"
        className={`ai-panel-toggle ${open ? "active" : ""}`}
        onClick={() => { setOpen(v => !v); setPreview(null); }}
      >
        🤖 AI Tools {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="ai-panel-body">
          {/* Tool grid */}
          <div className="ai-tools-grid">
            {TOOLS.map(t => (
              <div key={t.id} className="ai-tool-col">
                {t.id === "translate" && (
                  <select
                    className="ai-lang-select"
                    value={lang}
                    onChange={e => setLang(e.target.value)}
                  >
                    {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                  </select>
                )}
                <button
                  type="button"
                  className={`ai-tool-btn ${loading === t.id ? "loading" : ""}`}
                  onClick={() => run(t.id)}
                  disabled={!!loading}
                  title={t.desc}
                >
                  <span className="ai-tool-emoji">{loading === t.id ? "⏳" : t.emoji}</span>
                  <span className="ai-tool-label">{t.label}</span>
                </button>
              </div>
            ))}
          </div>

          {/* Preview / apply result */}
          {preview && (
            <div className="ai-preview">
              <div className="ai-preview-header">
                <span className="ai-preview-title">AI Result</span>
                <button type="button" className="ai-preview-close" onClick={() => setPreview(null)}>✕</button>
              </div>
              <div className="ai-preview-text">{preview.result}</div>
              <div className="ai-preview-actions">
                <button type="button" className="ai-apply-btn" onClick={applyResult}>
                  ✅ Apply to note
                </button>
                <button
                  type="button"
                  className="ai-copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(preview.result);
                    showToastMsg?.("Copied!", "success");
                  }}
                >
                  📋 Copy
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIToolsPanel;
