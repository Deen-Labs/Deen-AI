import React from "react";

export default function Features({ items }) {
  return (
    <div className="grid grid--features">
      {items.map(({ title, copy }) => (
        <div key={title} className="feature">
          <h4>{title}</h4>
          <p>{copy}</p>
        </div>
      ))}
    </div>
  );
}
