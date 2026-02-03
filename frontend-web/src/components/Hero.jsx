import React from "react";
import SectionTitle from "./SectionTitle.jsx";

export default function Hero({ tags, badges }) {
  return (
    <>
      {/* PAGE 1 - HERO INTRODUCTION */}
      <section className="hero hero--fullscreen" id="hero">
        <div className="hero__grid hero__grid--page1">
          <div className="hero__content">
            <div className="pill pill--highlight">DEEN AI PREVIEW</div>
            <h1 className="hero__title">
              Reimagining day-to-day Prayers with calm, thoughtful technology.
            </h1>
          
            <a
              href="#"
              className="button button--lg"
              style={{
                display: "inline-block",
                marginTop: "32px",
                alignSelf: "flex-start",
              }}>
              App coming soon
            </a>
          </div>
          <div className="hero__image-wrapper">
            <img
              src="/assets/hero.png"
              alt="DEEN A.I. Hero"
              className="hero__image"
            />
          </div>
        </div>
      </section>

      <section className="hero hero--mission" id="mission">
        <div className="hero__grid hero__grid--mission">
          <div className="panel panel--mission">
            <SectionTitle text="Our mission at Deen Labs" />
            <p className="text-block text-block--inset">
              DEEN A.I. links masjid schedules to your pocket, syncs imam
              updates in real-time, and gently blocks distracting content so you
              can stay present.It has tools that strengthen faith practice instead of distracting from it—connecting people to
              their masajid, filtering content mindfully, and delivering trustworthy, source-backed answers.
              DEEN AI is our flagship app to make that mission tangible.
            </p>
          </div>
        </div>
      </section>
      {/* PAGE 2 - DETAILS */}
      <section className="hero hero--details" id="hero-details">
        <div className="hero__grid hero__grid--zigzag">
          <div className="hero__box-wrapper">
            <div className="panel panel--feature">
              <SectionTitle text="Why we built this" />
              <p className="text-block text-block--inset">
                We want an assistant grounded in Qur'an and authenticated sources that respects your privacy,
                knows your local masjid rhythms, and gives practical help in minutes.
              </p>
              <div className="hero__card hero__card--stack">
                <h3>What makes it different?</h3>
                <div className="badge-list badge-list--solid">
                  {[...tags, ...badges].map((item) => (
                    <div key={item} className="badge badge--solid">
                      <span className="badge__dot" aria-hidden="true"></span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="page-indicator">page 2</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
