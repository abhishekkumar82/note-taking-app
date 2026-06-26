// src/data/noteTemplates.js
// ─────────────────────────────────────────────────────────────────────────────
// Static template definitions. Each template provides everything AddNote.jsx
// needs to pre-fill: title, tags, folder, color, and a body as Tiptap-
// compatible HTML (since AddNote's editor renders HTML via StarterKit).
//
// To add a new template: just add another object to TEMPLATES below — no
// other file needs to change, AddNote.jsx and TemplatePickerModal.jsx both
// render dynamically off this list.
// ─────────────────────────────────────────────────────────────────────────────

export const TEMPLATES = [
  {
    id: "blank",
    label: "Blank note",
    emoji: "📝",
    description: "Start from scratch",
    color: "#ffffff",
    tags: [],
    folder: "General",
    title: "",
    body: "",
  },

  {
    id: "meeting",
    label: "Meeting notes",
    emoji: "🗓️",
    description: "Agenda, discussion, action items",
    color: "#cbf0f8",
    tags: ["meeting"],
    folder: "Work",
    title: "Meeting — ",
    body: `
      <h1>Meeting Notes</h1>
      <p><strong>Date:</strong> </p>
      <p><strong>Attendees:</strong> </p>
      <h1>Agenda</h1>
      <ul>
        <li>Topic 1</li>
        <li>Topic 2</li>
      </ul>
      <h1>Discussion</h1>
      <p></p>
      <h1>Action Items</h1>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false">Assign owner for follow-up</li>
        <li data-type="taskItem" data-checked="false">Schedule next sync</li>
      </ul>
    `.trim(),
  },

  {
    id: "journal",
    label: "Daily journal",
    emoji: "📔",
    description: "Reflect on your day",
    color: "#fff475",
    tags: ["journal"],
    folder: "Personal",
    title: "Journal — ",
    body: `
      <h1>How was today?</h1>
      <p></p>
      <h1>Wins</h1>
      <ul>
        <li></li>
      </ul>
      <h1>Challenges</h1>
      <ul>
        <li></li>
      </ul>
      <h1>Tomorrow I want to focus on</h1>
      <p></p>
    `.trim(),
  },

  {
    id: "gratitude",
    label: "Gratitude list",
    emoji: "🙏",
    description: "Three things you're grateful for",
    color: "#ccff90",
    tags: ["gratitude"],
    folder: "Personal",
    title: "Gratitude — ",
    body: `
      <h1>Today I'm grateful for…</h1>
      <ol>
        <li>1. </li>
        <li>2. </li>
        <li>3. </li>
      </ol>
      <p><strong>One moment that made me smile:</strong></p>
      <p></p>
    `.trim(),
  },

  {
    id: "todo",
    label: "To-do list",
    emoji: "✅",
    description: "Simple checklist",
    color: "#a7ffeb",
    tags: ["todo"],
    folder: "General",
    title: "To-do — ",
    body: `
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false">First task</li>
        <li data-type="taskItem" data-checked="false">Second task</li>
        <li data-type="taskItem" data-checked="false">Third task</li>
      </ul>
    `.trim(),
  },

  {
    id: "brainstorm",
    label: "Brainstorm",
    emoji: "💡",
    description: "Free-form idea dump",
    color: "#d7aefb",
    tags: ["ideas"],
    folder: "General",
    title: "Brainstorm — ",
    body: `
      <h1>Idea / Problem</h1>
      <p></p>
      <h1>Possible directions</h1>
      <ul>
        <li></li>
        <li></li>
        <li></li>
      </ul>
      <h1>Next steps</h1>
      <p></p>
    `.trim(),
  },

  {
    id: "book",
    label: "Book notes",
    emoji: "📚",
    description: "Track quotes and takeaways",
    color: "#fbbc04",
    tags: ["reading"],
    folder: "Reading",
    title: "Book — ",
    body: `
      <p><strong>Author:</strong> </p>
      <p><strong>Started:</strong> </p>
      <h1>Key takeaways</h1>
      <ul>
        <li></li>
      </ul>
      <h1>Favorite quotes</h1>
      <blockquote><p></p></blockquote>
      <h1>My rating</h1>
      <p>⭐⭐⭐⭐⭐</p>
    `.trim(),
  },

  {
    id: "weekly-review",
    label: "Weekly review",
    emoji: "📊",
    description: "End-of-week reflection",
    color: "#aecbfa",
    tags: ["review"],
    folder: "Personal",
    title: "Weekly Review — Week of ",
    body: `
      <h1>What went well</h1>
      <ul>
        <li></li>
      </ul>
      <h1>What didn't go well</h1>
      <ul>
        <li></li>
      </ul>
      <h1>Lessons learned</h1>
      <p></p>
      <h1>Goals for next week</h1>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false"></li>
        <li data-type="taskItem" data-checked="false"></li>
      </ul>
    `.trim(),
  },
];

// Helper: look up a template by id (used by AddNote.jsx)
export const getTemplateById = (id) => TEMPLATES.find(t => t.id === id) || TEMPLATES[0];