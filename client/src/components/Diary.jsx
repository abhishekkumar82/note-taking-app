import React, { useState } from "react";

const Diary = () => {
  const [text, setText] = useState("");

  return (
    <div className="diary-container">
      <h2>📖 My Personal Diary</h2>

      <textarea
        placeholder="Write your thoughts..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="diary-textarea"
      />

      <button className="save-btn">Save Entry</button>
    </div>
  );
};

export default Diary;