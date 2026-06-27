import React, { useState, useEffect, useRef, useCallback } from "react";
import { Star, ChevronLeft, ChevronRight, Crown, Quote } from "lucide-react";
import api from "../utils/axiosInstance";

function StarRow({ rating, size = 14 }) {
  return (
    <div className="rs-stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          fill={n <= rating ? "#f59e0b" : "none"}
          stroke={n <= rating ? "#f59e0b" : "#d1d5db"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }) {
  const { user, rating, reviewText, createdAt } = review;
  const name    = user?.firstName || user?.displayName || "Anonymous";
  const isPro   = user?.isPremium;
  const initials = name.slice(0, 2).toUpperCase();
  const date    = new Date(createdAt).toLocaleDateString("en-IN", {
    month: "short",
    year:  "numeric",
  });

  return (
    <div className={`rs-card ${isPro ? "rs-card--pro" : ""}`}>
      {isPro && (
        <div className="rs-pro-badge">
          <Crown size={11} />
          Pro
        </div>
      )}

      <Quote size={22} className="rs-quote-icon" />

      <p className="rs-text">{reviewText}</p>

      <StarRow rating={rating} />

      <div className="rs-author">
        {user?.profileImage ? (
          <img src={user.profileImage} alt={name} className="rs-avatar" />
        ) : (
          <div className="rs-avatar-placeholder">{initials}</div>
        )}
        <div>
          <p className="rs-name">{name}</p>
          <p className="rs-date">{date}</p>
        </div>
      </div>
    </div>
  );
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex]     = useState(0);
  const timerRef              = useRef(null);

  useEffect(() => {
    api.get("/api/reviews")
      .then(({ data }) => setReviews(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // How many cards visible depends on viewport — we handle it via CSS grid
  // but the carousel index still shifts one at a time
  const total     = reviews.length;
  const maxIndex  = Math.max(0, total - 1);

  const next = useCallback(() => setIndex((i) => (i >= maxIndex ? 0 : i + 1)), [maxIndex]);
  const prev = useCallback(() => setIndex((i) => (i <= 0 ? maxIndex : i - 1)), [maxIndex]);

  // Auto-advance
  useEffect(() => {
    if (total <= 1) return;
    timerRef.current = setInterval(next, 5000);
    return () => clearInterval(timerRef.current);
  }, [next, total]);

  const pause = () => clearInterval(timerRef.current);
  const resume = () => {
    if (total <= 1) return;
    timerRef.current = setInterval(next, 5000);
  };

  if (loading) {
    return (
      <section className="rs-section">
        <div className="rs-heading-wrap">
          <h2 className="rs-heading">What our users say</h2>
        </div>
        <div className="rs-skeleton-row">
          {[1, 2, 3].map((n) => <div key={n} className="rs-skeleton" />)}
        </div>
      </section>
    );
  }

  if (!reviews.length) return null;

  // Group reviews into visible window: show up to 3 at a time
  const visible = [];
  for (let i = 0; i < Math.min(3, total); i++) {
    visible.push(reviews[(index + i) % total]);
  }

  // Average rating
  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1);

  return (
    <section className="rs-section">
      <div className="rs-heading-wrap">
        <h2 className="rs-heading">What our users say</h2>
        <p className="rs-subheading">
          <span className="rs-avg-stars">
            <Star size={16} fill="#f59e0b" stroke="#f59e0b" />
            {avg}
          </span>
          average rating from {total} review{total !== 1 ? "s" : ""}
        </p>
      </div>

      <div
        className="rs-carousel"
        onMouseEnter={pause}
        onMouseLeave={resume}
      >
        <button
          className="rs-nav rs-nav--prev"
          onClick={() => { pause(); prev(); resume(); }}
          aria-label="Previous reviews"
          disabled={total <= 1}
        >
          <ChevronLeft size={20} />
        </button>

        <div className="rs-track">
          {visible.map((r, i) => (
            <ReviewCard key={`${r._id}-${i}`} review={r} />
          ))}
        </div>

        <button
          className="rs-nav rs-nav--next"
          onClick={() => { pause(); next(); resume(); }}
          aria-label="Next reviews"
          disabled={total <= 1}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Dot indicators */}
      {total > 1 && (
        <div className="rs-dots" role="tablist" aria-label="Review pages">
          {reviews.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === index}
              className={`rs-dot ${i === index ? "rs-dot--active" : ""}`}
              onClick={() => { pause(); setIndex(i); resume(); }}
              aria-label={`Go to review ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
