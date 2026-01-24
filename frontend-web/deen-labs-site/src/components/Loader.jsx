import React, { useEffect, useState } from "react";

export default function Loader() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const hide = () => setTimeout(() => setHidden(true), 900);
    if (document.readyState === "complete") {
      hide();
    } else {
      window.addEventListener("load", hide, { once: true });
    }
    return () => window.removeEventListener("load", hide);
  }, []);

  return (
    <div className={`loader ${hidden ? "is-hidden" : ""}`} id="loader" aria-label="Loading DEEN LABS">
      <div className="loader__stack">
        <div className="loader__orb" aria-hidden="true">
          <div className="loader__ring"></div>
          <div className="loader__mark">D</div>
        </div>
        <div className="loader__text">initializing deen a.i.</div>
      </div>
    </div>
  );
}
