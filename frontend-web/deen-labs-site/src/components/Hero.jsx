import React from "react";
import SectionTitle from "./SectionTitle.jsx";

export default function Hero({ tags, badges }) {
  return (
    <section className="hero" id="hero">
      <div className="hero__grid">
        <div>
          <div className="pill">deen a.i. launch preview</div>
          <h1>Reimagining day-to-day faith with calm, thoughtful technology.</h1>
          <p className="lead">
            DEEN A.I. links masjid schedules to your pocket, syncs imam updates in real-time, and gently blocks distracting
            content so you can stay present.
          </p>
          <div className="hero__tags">
            {tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
          <div className="hero__card panel">
            <h3>What makes it different?</h3>
            <div className="badge-list">
              {badges.map((badge) => (
                <div key={badge} className="badge">
                  <span className="badge__dot" aria-hidden="true"></span>
                  <span>{badge}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="panel">
          <SectionTitle text="Why we built this" />
          <p className="text-block">
            We want an assistant grounded in Qur'an and authenticated sources that respects your privacy, knows your local masjid
            rhythms, and gives practical help in minutes.
          </p>
          <div className="page-indicator">page 1</div>
        </div>
      </div>
    </section>
  );
}
