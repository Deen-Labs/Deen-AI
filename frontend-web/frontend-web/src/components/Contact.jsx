import React from "react";

export default function Contact({ email, location, github }) {
  return (
    <div className="contact">
      <div>
        Email: <a href={`mailto:${email}`}>{email}</a>
      </div>
      <div>Location: {location}</div>
      <div>
        GitHub: <a href={github}>{github.replace("https://", "")}</a>
      </div>
    </div>
  );
}
