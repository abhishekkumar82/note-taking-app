import React, { useState, useEffect } from "react";
import { Star, X, Send, Pencil } from "lucide-react";
import api from "../utils/axiosInstance";

export default function RateReviewModal({ onClose }) {
  const [rating, setRating]         = useState(0);
  const [hovered, setHovered]       = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [existing, setExisting]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(false);

  // Load the user's existing review (if any)
  useEffect(() => {
    api.get("/api/reviews/mine")
      .then(({ data }) => {
        if (data) {
          setExisting(data);
          setRating(data.rating);
          setReviewText(data.reviewText);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return setError("Please select a star rating.");
    if (!reviewText.trim()) return setError("Please write a short review.");
    setError("");
    setSaving(true);
    try {
      await api.post("/api/reviews", { rating, reviewText });
      setSuccess(true);
      setTimeout(onClose, 1800);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  const active = hovered || rating;

  return (
    <div className="rrm-backdrop" onClick={onClose}>
      <div className="rrm-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rrm-header">
          <div>
            <h2 className="rrm-title">
              {existing ? "Update your review" : "Rate WriteUp"}
            </h2>
            <p className="rrm-subtitle">Your feedback helps others discover the platform</p>
          </div>
          <button className="rrm-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="rrm-loading">Loading…</div>
        ) : success ? (
          <div className="rrm-success">
            <span className="rrm-success-icon">🎉</span>
            <p>{existing ? "Review updated!" : "Thank you for your review!"}</p>
          </div>
        ) : (
          <form className="rrm-form" onSubmit={handleSubmit}>
            {/* Stars */}
            <div className="rrm-stars-wrap">
              <div
                className="rrm-stars"
                onMouseLeave={() => setHovered(0)}
                role="group"
                aria-label="Star rating"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`rrm-star ${n <= active ? "rrm-star--active" : ""}`}
                    onMouseEnter={() => setHovered(n)}
                    onClick={() => setRating(n)}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  >
                    <Star size={32} fill={n <= active ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
              {active > 0 && (
                <span className="rrm-label">{labels[active]}</span>
              )}
            </div>

            {/* Text */}
            <textarea
              className="rrm-textarea"
              placeholder="Tell us about your experience…"
              rows={4}
              maxLength={1000}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
            />
            <div className="rrm-char-count">{reviewText.length}/1000</div>

            {error && <p className="rrm-error">{error}</p>}

            <button
              type="submit"
              className="rrm-submit"
              disabled={saving}
            >
              {saving ? (
                "Saving…"
              ) : (
                <>
                  {existing ? <Pencil size={15} /> : <Send size={15} />}
                  {existing ? "Update Review" : "Submit Review"}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
