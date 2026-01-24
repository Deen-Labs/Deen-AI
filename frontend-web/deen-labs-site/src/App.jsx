import React from "react";
import Loader from "./components/Loader.jsx";
import TopBar from "./components/TopBar.jsx";
import Hero from "./components/Hero.jsx";
import SectionTitle from "./components/SectionTitle.jsx";
import Features from "./components/Features.jsx";
import Team from "./components/Team.jsx";
import Contact from "./components/Contact.jsx";

const heroTags = [
  "Masjid timing sync",
  "Nearby detection",
  "Content mindfulness",
  "Trusted hadith sources",
];

const heroBadges = [
  "Imam-driven live updates",
  "Auto-detects nearby masajid",
  "Camera + mic protections",
  "Trained on verified hadith",
];

const features = [
  {
    title: "Content calm",
    copy: "Block apps and sites during prayer or study windows, with gentle reminders instead of hard stops.",
  },
  {
    title: "Masjid network",
    copy: "Connects to local masajid so imam updates instantly refresh your timings.",
  },
  {
    title: "Context-aware detection",
    copy: "Auto-detects nearby masjid and surfaces the right schedule, iqamah, and events.",
  },
  {
    title: "Source-backed answers",
    copy: "Responses trained on Qur'an and verified hadith sources for trustworthy guidance.",
  },
];

const team = [
  {
    initials: "SA",
    name: "Syed Aamair Shareef Ahmed",
    role: "Founder · Cloud & DevOps",
    bio: "Architecting reliable infrastructure and shipping secure AI ops.",
    github: "https://github.com",
  },
  {
    initials: "SK",
    name: "Sadiq Khan",
    role: "Co-founder · Web",
    bio: "Designs and builds the product experiences for web and mobile.",
    github: "https://github.com",
  },
  {
    initials: "IS",
    name: "Ibrahim Shareef",
    role: "Co-founder · Data",
    bio: "Models data pipelines and keeps your schedules accurate.",
    github: "https://github.com",
  },
];

const contact = {
  email: "deenlabs.AI@gmail.com",
  location: "Hyderabad, Telangana, India",
  github: "https://github.com",
};

export default function App() {
  return (
    <>
      <Loader />
      <div className="page">
        <TopBar />

        <main className="wrapper">
          <Hero tags={heroTags} badges={heroBadges} />

          <section className="section" id="mission">
            <SectionTitle text="Mission" />
            <p className="text-block">
              Build an AI that strengthens faith practice, not distracts from it—combining respectful
              content filtering, masjid connectivity, and fast, source-backed answers.
            </p>
          </section>

          <section className="section" id="features">
            <SectionTitle text="Core capabilities" />
            <Features items={features} />
          </section>

          <section className="section team" id="team">
            <SectionTitle text="Founding team" />
            <Team members={team} />
          </section>

          <section className="section" id="contact">
            <SectionTitle text="Contact" />
            <Contact {...contact} />
          </section>
        </main>

        <footer className="wrapper footer">
          <div>DEEN LABS — building tools for mindful, connected worship.</div>
        </footer>
      </div>
    </>
  );
}
