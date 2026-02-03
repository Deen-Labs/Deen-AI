import React from "react";

export default function Team({ members }) {
  return (
    <div className="team-grid">
      {members.map(({ initials, name, role, bio, github }) => (
        <div key={name} className="person">
          <div className="avatar" aria-hidden="true">
            {initials}
          </div>
          <h5>{name}</h5>
          <div className="role">{role}</div>
          <p className="bio">{bio}</p>
          <a className="button" href={github} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      ))}
    </div>
  );
}
