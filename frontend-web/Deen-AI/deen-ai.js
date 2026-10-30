import React from "react";
import { createRoot } from "react-dom/client";
import DeenAiMotionController from "./DeenAiMotionController.jsx";

/**
 * DeenHub: Masjid & SalahTime — Interactive Simulator & Scrollytelling Controller
 * Production-ready vanilla JavaScript module for Vite multi-page build.
 * Synchronized 1:1 with the DeenHub Android application architecture.
 * Features 5 core tabs, live LED boards, GPS/A-Z masjid directory, Jumu'ah topics,
 * 3x3 spiritual hub, and dynamic sub-screen modals.
 */

// Global State
let activeScreenIndex = 0;
let isInitialLoad = true;

// Ensure manual scroll restoration so browsers never restore deep-scroll positions
if (typeof history !== "undefined" && "scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
if (typeof window !== "undefined" && !window.location.hash) {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

// PIN Keypad State
let enteredPin = "";
const CORRECT_PIN = "1234";

// Focus Dial State
let focusDurationMinutes = 25;
let focusRemainingSeconds = 25 * 60;
let focusTotalSeconds = 25 * 60;
let focusTimerInterval = null;
let isFocusRunning = false;

// ============================================================================
// 1. STRICT MODAL ISOLATION & SYSTEM RESET
// ============================================================================

export function closeAllPhoneModals() {
  const pinModal = document.getElementById("phone-pin-modal");
  const qiblaModal = document.getElementById("phone-qibla-modal");
  const subModal = document.getElementById("phone-subscreen-modal");

  if (pinModal) {
    pinModal.classList.add("hidden");
    pinModal.style.setProperty("display", "none", "important");
  }
  if (qiblaModal) {
    qiblaModal.classList.add("hidden");
    qiblaModal.style.setProperty("display", "none", "important");
  }
  if (subModal) {
    subModal.classList.add("hidden");
    subModal.style.setProperty("display", "none", "important");
    subModal.innerHTML = "";
  }
}

window.closeAllPhoneModals = closeAllPhoneModals;

// ============================================================================
// 2. MOBILE CONTEXT CARD METADATA & SYNCHRONIZATION (5 PRODUCTION MODULES)
// ============================================================================

const MODULE_METADATA = [
  {
    moduleNumber: "Module 01",
    tag: "Home & LED Board",
    statusBadge: "HIJRI + LIVE LED BOARD",
    badgeClasses: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    title: "Unified Home Dashboard & Digital LED Clock",
    desc: "Combines today's Hijri date, 12-hour Sahar & Iftar timings, and your pinned Default Masjid's Mahmood Watch Co. digital LED board right at the top of the home screen—complete with Fajr interval badges (+25m), toggleable Dhuhr/Maghrib heavy rain alerts, and 3-tile purity bento.",
    prompt: "Tap the LED Board, Gratitude button, or Clean Streak tile inside the simulator above.",
  },
  {
    moduleNumber: "Module 02",
    tag: "Nearby Masajid",
    statusBadge: "140+ MASAJID NETWORK",
    badgeClasses: "bg-deen-gold/20 text-deen-gold border-deen-gold/40",
    title: "Nearby Masajid Directory & Live Jama'at Timings",
    desc: "Real-time Haversine GPS proximity and A–Z alphabetical sorting across 140+ connected masajid. Collapsed cards preview upcoming Jama'at times, while pinned cards stay ultra-compact until expanded.",
    prompt: "Tap 'A–Z Sort' or 'View Timings' inside the simulator above to explore masajid.",
  },
  {
    moduleNumber: "Module 03",
    tag: "Focus & Shield",
    statusBadge: "24/7 DEVICE SHIELD",
    badgeClasses: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    title: "Content Calm & Distraction Lockdown",
    desc: "Pure Muraqabah focus timer with circular SVG progress dials, app blocking, and native Android Accessibility + Private DNS shielding that automatically resets clean streak if adult content is intercepted.",
    prompt: "Tap +5m/-5m or Start Focus inside the simulator above.",
  },
  {
    moduleNumber: "Module 04",
    tag: "Jumu'ah Topics",
    statusBadge: "KHUTBAH ROSTER",
    badgeClasses: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    title: "Jumu'ah Khutbah Topics & Verified Scholars",
    desc: "Dedicated community broadcast for upcoming Friday Khutbah topics, verified isAalim scholars, past weeks archive, and helpful community likes.",
    prompt: "Tap the filter chips or '+ Add Friday Topic' to preview the roster.",
  },
  {
    moduleNumber: "Module 05",
    tag: "Deen Hub & More",
    statusBadge: "9 HUB TOOLS + ADMIN",
    badgeClasses: "bg-deen-gold/20 text-deen-gold border-deen-gold/40",
    title: "Deen Hub, Custom Azkar & Khadim Leaderboard",
    desc: "Unified 3x3 spiritual and community hub housing Qibla Compass, Daily & Custom Azkar, 99 Names audio, 12-Month Hijri Fasting, Solar Start/End windows, and Admin controls.",
    prompt: "Tap any of the 3x3 Hub tiles or 'Open Khadim Leaderboard' to test.",
  },
];

function updateMobileModuleCard(index) {
  const card = document.getElementById("mobile-active-module-card");
  if (!card) return;
  const meta = MODULE_METADATA[index];
  if (!meta) return;

  const tagEl = document.getElementById("mobile-card-tag");
  const badgeEl = document.getElementById("mobile-card-badge");
  const titleEl = document.getElementById("mobile-card-title");
  const descEl = document.getElementById("mobile-card-desc");
  const promptEl = document.getElementById("mobile-card-prompt");

  if (tagEl) tagEl.textContent = `${meta.moduleNumber} / ${meta.tag}`;
  if (badgeEl) {
    badgeEl.textContent = meta.statusBadge;
    badgeEl.className = `px-2 py-0.5 rounded-full text-[8.5px] font-mono font-bold border ${meta.badgeClasses}`;
  }
  if (titleEl) titleEl.textContent = meta.title;
  if (descEl) descEl.textContent = meta.desc;
  if (promptEl) promptEl.textContent = meta.prompt;
}

// ============================================================================
// 3. SCREEN SWITCHER & SYNC LOGIC
// ============================================================================

export function setActiveScreen(index, fromScroll = false) {
  if (index < 0 || index > 4) return;
  activeScreenIndex = index;

  // Automatically close ANY open modal whenever screen changes
  closeAllPhoneModals();

  // Reset scroll position on phone viewport to eliminate blank scroll voids
  const viewport = document.getElementById("phone-viewport");
  if (viewport) {
    viewport.scrollTop = 0;
  }

  // Update synchronized mobile info card in-place
  updateMobileModuleCard(index);

  // 1. Update Phone Screen Panes
  const panes = document.querySelectorAll(".phone-screen-pane");
  panes.forEach((pane) => {
    const paneIdx = parseInt(pane.getAttribute("data-pane"), 10);
    if (paneIdx === index) {
      pane.classList.add("active");
      pane.style.setProperty("display", "flex", "important");
      pane.scrollTop = 0;
    } else {
      pane.classList.remove("active");
      pane.style.setProperty("display", "none", "important");
    }
  });

  // 2. Update Bottom Nav Bar Tabs
  const tabs = document.querySelectorAll(".phone-tab-btn");
  tabs.forEach((tab) => {
    const tabIdx = parseInt(tab.getAttribute("data-tab"), 10);
    if (tabIdx === index) {
      tab.classList.add("text-deen-gold", "active");
      tab.classList.remove("text-slate-500");
    } else {
      tab.classList.remove("text-deen-gold", "active");
      tab.classList.add("text-slate-500");
    }
  });

  // 3. Update Left Column Deep-Dive Cards
  const sections = document.querySelectorAll(".feature-deepdive-card");
  sections.forEach((sec) => {
    const secIdx = parseInt(sec.getAttribute("data-screen"), 10);
    if (secIdx === index) {
      sec.classList.add("active-section");
    } else {
      sec.classList.remove("active-section");
    }
  });

  // 4. Update Hero Quick-Jump Pills
  const pills = document.querySelectorAll(".quick-jump-pill");
  pills.forEach((pill) => {
    const pillIdx = parseInt(pill.getAttribute("data-jump"), 10);
    if (pillIdx === index) {
      pill.classList.add("bg-deen-card", "border-deen-gold", "text-deen-goldsoft");
    } else {
      pill.classList.remove("bg-deen-card", "border-deen-gold", "text-deen-goldsoft");
    }
  });

  // 5. If triggered by click (not scroll and not initial page load)
  if (!fromScroll && !isInitialLoad) {
    isProgrammaticScroll = true;
    clearTimeout(programmaticScrollTimer);
    programmaticScrollTimer = setTimeout(() => {
      isProgrammaticScroll = false;
    }, 750);

    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop) {
      const targetSection = document.querySelector(`.feature-deepdive-card[data-screen="${index}"]`);
      if (targetSection) {
        const targetRect = targetSection.getBoundingClientRect();
        const cardCenter = targetRect.top + window.pageYOffset + targetRect.height / 2;
        const targetScrollTop = cardCenter - window.innerHeight / 2;
        window.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: "smooth",
        });
      }
    }
  }
}

window.handleTriggerPhoneTab = function (index) {
  setActiveScreen(index, false);
};

// ============================================================================
// 4. PRECISION CENTER-LOCKING SCROLL SPY
// ============================================================================

let isProgrammaticScroll = false;
let programmaticScrollTimer = null;

export function updateActiveCardByCenter() {
  if (isProgrammaticScroll) return;

  const cards = document.querySelectorAll(".feature-deepdive-card");
  if (!cards || cards.length === 0) return;

  const focalCenter = window.innerHeight * 0.5;

  let bestIndex = -1;
  let minDistance = Infinity;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const rect = card.getBoundingClientRect();
    const screenIdx = parseInt(card.getAttribute("data-screen"), 10);
    if (isNaN(screenIdx)) continue;

    if (rect.top <= focalCenter && rect.bottom >= focalCenter) {
      bestIndex = screenIdx;
      break;
    }

    const cardCenter = (rect.top + rect.bottom) / 2;
    const distance = Math.abs(cardCenter - focalCenter);
    if (distance < minDistance) {
      minDistance = distance;
      bestIndex = screenIdx;
    }
  }

  if ((window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 60)) {
    bestIndex = 4;
  }

  if (window.scrollY < 120) {
    bestIndex = 0;
  }

  if (bestIndex !== -1 && bestIndex !== activeScreenIndex) {
    setActiveScreen(bestIndex, true);
  }
}

export function setupScrollSpy() {
  let ticking = false;

  const handleScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateActiveCardByCenter();
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", handleScroll, { passive: true });

  window.addEventListener("wheel", () => {
    isProgrammaticScroll = false;
    clearTimeout(programmaticScrollTimer);
  }, { passive: true });

  window.addEventListener("touchmove", () => {
    isProgrammaticScroll = false;
    clearTimeout(programmaticScrollTimer);
  }, { passive: true });

  requestAnimationFrame(updateActiveCardByCenter);
}

// ============================================================================
// 5. QUICK-JUMP PILLS IN HERO
// ============================================================================

function setupQuickJumpPills() {
  const pills = document.querySelectorAll(".quick-jump-pill");
  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const idx = parseInt(pill.getAttribute("data-jump"), 10);
      if (!isNaN(idx)) {
        setActiveScreen(idx, false);
        const isMobile = window.innerWidth < 1024;
        if (isMobile) {
          const phoneContainer = document.getElementById("phone-container");
          if (phoneContainer) {
            const topOffset = phoneContainer.getBoundingClientRect().top + window.pageYOffset - 80;
            window.scrollTo({
              top: topOffset,
              behavior: "smooth",
            });
          }
        }
      }
    });
  });
}

// ============================================================================
// 6. SCREEN 0 (HOME) INTERACTIVE CONTROLLERS
// ============================================================================

window.isSystemProtectionActive = true;

window.setSystemProtection = function (isActive) {
  window.isSystemProtectionActive = isActive;

  const badgeEl = document.getElementById("phone-online-status-badge");
  if (badgeEl) {
    if (isActive) {
      badgeEl.className = "px-2 py-0.5 rounded-full text-[8px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer";
      badgeEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><span>PROTECTED</span>';
    } else {
      badgeEl.className = "px-2 py-0.5 rounded-full text-[8px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1.5 transition-colors cursor-pointer";
      badgeEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span><span>OFFLINE</span>';
    }
  }

  const bentoShieldStatus = document.getElementById("home-bento-shield-status");
  if (bentoShieldStatus) {
    bentoShieldStatus.textContent = isActive ? "ACTIVE" : "OFFLINE";
    bentoShieldStatus.className = isActive ? "text-xs font-bold text-emerald-400 leading-tight" : "text-xs font-bold text-red-400 leading-tight";
  }
};

window.toggleHomeLedBoard = function () {
  const rows = document.getElementById("home-led-rows");
  const btn = document.getElementById("home-led-collapse-btn");
  if (rows && btn) {
    if (rows.classList.contains("hidden")) {
      rows.classList.remove("hidden");
      btn.textContent = "▲ Hide LED Board";
    } else {
      rows.classList.add("hidden");
      btn.textContent = "▼ View LED Board";
    }
  }
};

window.toggleRainNotice = function () {
  const strip = document.getElementById("home-rain-strip");
  if (strip) {
    strip.classList.toggle("hidden");
  }
};

window.sendMasjidJazak = function (counterId, btnEl) {
  const counter = document.getElementById(counterId);
  if (counter) {
    const current = parseInt(counter.textContent, 10) || 0;
    counter.textContent = current + 1;
  }
  if (btnEl) {
    btnEl.innerHTML = '<i class="fa-solid fa-check mr-1 text-emerald-400"></i><span>JazakAllahu Khairan Sent!</span>';
    btnEl.classList.add("opacity-90");
    btnEl.disabled = true;
  }
};

function scrollToPhoneOnMobile() {
  if (typeof window !== "undefined" && window.innerWidth < 1024) {
    const phoneContainer = document.getElementById("phone-container");
    if (phoneContainer) {
      const topOffset = phoneContainer.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({
        top: topOffset,
        behavior: "smooth",
      });
    }
  }
}

// PIN Keypad Handlers
window.simulatePinUnlock = function () {
  closeAllPhoneModals();
  scrollToPhoneOnMobile();
  const modal = document.getElementById("phone-pin-modal");
  if (modal) {
    enteredPin = "";
    updatePinDots();
    const feedback = document.getElementById("pin-feedback-msg");
    if (feedback) {
      feedback.textContent = "Demo PIN: 1234";
      feedback.className = "text-[9.5px] text-emerald-400 font-medium";
    }
    modal.classList.remove("hidden");
    modal.style.setProperty("display", "flex", "important");
  }
};

window.closePinModal = function () {
  const modal = document.getElementById("phone-pin-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.setProperty("display", "none", "important");
  }
};

window.pressPinDigit = function (digit) {
  if (enteredPin.length < 4) {
    enteredPin += digit;
    updatePinDots();

    if (enteredPin.length === 4) {
      verifyPin();
    }
  }
};

window.pressPinBackspace = function () {
  if (enteredPin.length > 0) {
    enteredPin = enteredPin.slice(0, -1);
    updatePinDots();
  }
};

function updatePinDots() {
  const dots = document.querySelectorAll(".pin-dot");
  dots.forEach((dot, idx) => {
    if (idx < enteredPin.length) {
      dot.classList.add("bg-deen-gold");
    } else {
      dot.classList.remove("bg-deen-gold");
    }
  });
}

function verifyPin() {
  const feedback = document.getElementById("pin-feedback-msg");
  if (feedback) feedback.textContent = "Verifying 10,000-Round SHA-256...";

  setTimeout(() => {
    if (enteredPin === CORRECT_PIN) {
      if (feedback) {
        feedback.textContent = "Passcode Verified! Protection Unlocked";
        feedback.className = "text-[9.5px] text-emerald-400 font-bold";
      }
      setTimeout(() => {
        closePinModal();
      }, 600);
    } else {
      if (feedback) {
        feedback.textContent = "Incorrect PIN. Try 1234";
        feedback.className = "text-[9.5px] text-red-400 font-bold";
      }
      enteredPin = "";
      updatePinDots();
    }
  }, 300);
}

// ============================================================================
// 7. SCREEN 1 (MASJID DIRECTORY) CONTROLLERS
// ============================================================================

window.toggleMasjidBoardExpand = function (id) {
  const tray = document.getElementById(`masjid-expandable-${id}`);
  const btn = document.getElementById(`btn-text-masjid-${id}`);
  if (tray && btn) {
    if (tray.classList.contains("hidden")) {
      tray.classList.remove("hidden");
      btn.textContent = "Hide Timings ⌃";
    } else {
      tray.classList.add("hidden");
      btn.textContent = "View Timings • Next: Asr ⌵";
    }
  }
};

window.setMasjidSortMode = function (mode) {
  const chipNearby = document.getElementById("sort-chip-nearby");
  const chipAz = document.getElementById("sort-chip-az");
  const list = document.getElementById("simulator-masjid-list");
  if (!list) return;

  const cards = Array.from(list.querySelectorAll(".masjid-sim-card"));

  if (mode === "az") {
    if (chipAz) {
      chipAz.className = "flex-1 py-1 rounded-lg bg-deen-gold text-slate-950 font-bold text-[8px] flex items-center justify-center gap-1 shadow-sm transition-all";
    }
    if (chipNearby) {
      chipNearby.className = "flex-1 py-1 rounded-lg bg-[#0c2326] border border-white/10 text-slate-300 hover:text-white font-medium text-[8px] flex items-center justify-center gap-1 transition-all";
    }
    cards.sort((a, b) => {
      const nameA = a.getAttribute("data-name") || "";
      const nameB = b.getAttribute("data-name") || "";
      return nameA.localeCompare(nameB);
    });
  } else {
    if (chipNearby) {
      chipNearby.className = "flex-1 py-1 rounded-lg bg-deen-gold text-slate-950 font-bold text-[8px] flex items-center justify-center gap-1 shadow-sm transition-all";
    }
    if (chipAz) {
      chipAz.className = "flex-1 py-1 rounded-lg bg-[#0c2326] border border-white/10 text-slate-300 hover:text-white font-medium text-[8px] flex items-center justify-center gap-1 transition-all";
    }
    cards.sort((a, b) => {
      const distA = parseInt(a.getAttribute("data-distance"), 10) || 0;
      const distB = parseInt(b.getAttribute("data-distance"), 10) || 0;
      return distA - distB;
    });
  }

  cards.forEach((card) => list.appendChild(card));
};

window.filterSimulatorMasjids = function (query) {
  const list = document.getElementById("simulator-masjid-list");
  if (!list) return;
  const q = (query || "").toLowerCase().trim();
  const cards = list.querySelectorAll(".masjid-sim-card");

  cards.forEach((card) => {
    const name = (card.getAttribute("data-name") || "").toLowerCase();
    const area = (card.getAttribute("data-area") || "").toLowerCase();
    const pres = (card.getAttribute("data-president") || "").toLowerCase();

    if (!q || name.includes(q) || area.includes(q) || pres.includes(q)) {
      card.style.display = "";
    } else {
      card.style.display = "none";
    }
  });
};

// ============================================================================
// 8. SCREEN 2 (FOCUS) CONTROLLERS
// ============================================================================

window.setFocusDuration = function (mins) {
  if (isFocusRunning) return;
  focusDurationMinutes = mins;
  focusRemainingSeconds = mins * 60;
  focusTotalSeconds = mins * 60;

  document.querySelectorAll(".duration-pill").forEach((pill) => {
    if (pill.textContent.trim().startsWith(mins.toString())) {
      pill.className = "duration-pill active px-2.5 py-0.5 text-[9px] font-semibold rounded-lg bg-deen-gold text-slate-950 font-bold border border-deen-gold";
    } else {
      pill.className = "duration-pill px-2.5 py-0.5 text-[9px] font-semibold rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:border-deen-gold transition-colors";
    }
  });

  updateFocusTimerDisplay();
};

window.togglePhoneFocusTimer = function () {
  const btn = document.getElementById("phone-focus-action-btn");
  const leftBtn = document.getElementById("left-focus-toggle-btn");
  const label = document.getElementById("focus-state-label");

  if (!isFocusRunning) {
    isFocusRunning = true;
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-pause text-xs"></i><span>Pause Focus</span>';
      btn.className = "w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5";
    }
    if (leftBtn) leftBtn.innerHTML = '<i class="fa-solid fa-pause text-amber-400 text-xs mr-1.5"></i><span>Pause Focus Session</span>';
    if (label) {
      label.textContent = "Focusing...";
      label.className = "text-[9px] text-emerald-400 font-medium mt-1.5 leading-none animate-pulse";
    }

    focusTimerInterval = setInterval(() => {
      if (focusRemainingSeconds > 0) {
        focusRemainingSeconds -= 1;
        updateFocusTimerDisplay();
      } else {
        clearInterval(focusTimerInterval);
        isFocusRunning = false;
        if (btn) btn.innerHTML = '<i class="fa-solid fa-play text-xs"></i><span>Start Focus</span>';
        if (label) label.textContent = "Session Complete!";
      }
    }, 1000);
  } else {
    isFocusRunning = false;
    clearInterval(focusTimerInterval);
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-play text-xs"></i><span>Resume Focus</span>';
      btn.className = "w-full py-2 rounded-xl bg-deen-gold hover:bg-[#c28424] text-slate-950 font-bold text-[11px] uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5";
    }
    if (leftBtn) leftBtn.innerHTML = '<i class="fa-solid fa-play text-emerald-400 text-xs mr-1.5"></i><span>Start 25:00 Focus Session</span>';
    if (label) {
      label.textContent = "Paused";
      label.className = "text-[9px] text-amber-400 font-medium mt-1.5 leading-none";
    }
  }
};

function updateFocusTimerDisplay() {
  const display = document.getElementById("focus-display-timer");
  const circle = document.getElementById("timer-progress-circle");

  const mins = Math.floor(focusRemainingSeconds / 60);
  const secs = focusRemainingSeconds % 60;
  const pad = (n) => (n < 10 ? "0" + n : n);

  if (display) display.textContent = `${pad(mins)}:${pad(secs)}`;

  if (circle) {
    const totalCircumference = 339; // 2 * PI * 54
    const fraction = focusRemainingSeconds / focusTotalSeconds;
    const offset = totalCircumference * (1 - fraction);
    circle.style.strokeDashoffset = offset;
  }
}

window.toggleAppBlockerDrawer = function () {
  const list = document.getElementById("app-blocker-list");
  const arrow = document.getElementById("app-blocker-arrow");
  if (list) list.classList.toggle("hidden");
  if (arrow) arrow.classList.toggle("rotate-180");
};

// ============================================================================
// 9. SCREEN 3 (JUMU'AH TOPICS) CONTROLLERS
// ============================================================================

window.filterJumuahTopics = function (mode, btnEl) {
  document.querySelectorAll(".jumuah-filter-chip").forEach((chip) => {
    chip.className = "jumuah-filter-chip py-1 rounded-lg bg-[#0c2326] border border-white/10 text-slate-300 font-medium text-[7.5px] text-center transition-all";
  });
  if (btnEl) {
    btnEl.className = "jumuah-filter-chip active py-1 rounded-lg bg-deen-gold text-slate-950 font-bold text-[7.5px] text-center transition-all";
  }

  const cards = document.querySelectorAll(".jumuah-topic-card");
  cards.forEach((card) => {
    if (mode === "all") {
      card.style.display = "";
    } else if (mode === "nearby") {
      const dist = parseInt(card.getAttribute("data-distance"), 10) || 0;
      card.style.display = dist <= 300 ? "" : "none";
    } else if (mode === "khateeb") {
      const khateeb = card.getAttribute("data-khateeb") || "";
      card.style.display = khateeb === "ibrahim" ? "" : "none";
    } else if (mode === "masjid") {
      const cat = card.getAttribute("data-category") || "";
      card.style.display = cat === "makkah" ? "" : "none";
    }
  });
};

window.likeJumuahTopic = function (btnEl) {
  if (!btnEl) return;
  const numSpan = btnEl.querySelector(".like-num");
  if (numSpan) {
    const count = parseInt(numSpan.textContent, 10) || 0;
    numSpan.textContent = count + 1;
    btnEl.classList.add("text-red-400", "border-red-500/40");
  }
};

// ============================================================================
// 10. SCREEN 4 (MORE & QIBLA) CONTROLLERS
// ============================================================================

window.openPhoneQiblaCompass = function () {
  closeAllPhoneModals();
  scrollToPhoneOnMobile();
  const modal = document.getElementById("phone-qibla-modal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.style.setProperty("display", "flex", "important");
    const needle = document.getElementById("compass-needle");
    if (needle) {
      needle.style.transform = "rotate(-45deg)";
      setTimeout(() => {
        needle.style.transform = "rotate(0deg)";
      }, 50);
    }
  }
};

window.closeQiblaCompass = function () {
  const modal = document.getElementById("phone-qibla-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.setProperty("display", "none", "important");
  }
};

// ============================================================================
// 11. DYNAMIC SUB-SCREEN OVERLAY MODAL (RICH 1:1 REPLICAS)
// ============================================================================

function renderSubModalContent(type) {
  const wrap = (title, iconClass, bodyHtml) => `
    <div class="flex flex-col h-full text-slate-200">
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-2 mb-2 border-b border-white/10 flex-shrink-0">
        <div class="flex items-center gap-1.5">
          <i class="${iconClass} text-deen-gold text-xs"></i>
          <h4 class="text-xs font-bold text-white font-display">${title}</h4>
        </div>
        <button onclick="closePhoneSubModal()" class="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <!-- Modal Scrollable Body -->
      <div class="flex-1 overflow-y-auto space-y-2 pr-0.5 text-[9px] leading-relaxed">
        ${bodyHtml}
      </div>
    </div>
  `;

  switch (type) {
    case "clean-stats":
      return wrap(
        "Days Clean & Protection Stats",
        "fa-solid fa-shield",
        `
        <div class="bg-[#081517] border border-white/5 rounded-2xl p-3 text-center">
          <div class="w-20 h-20 mx-auto rounded-full border-2 border-deen-gold flex flex-col items-center justify-center shadow-lg my-1">
            <span class="text-2xl font-extrabold text-deen-gold leading-none">67</span>
            <span class="text-[7px] font-bold text-white uppercase tracking-wider mt-0.5">DAYS CLEAN</span>
          </div>
          <p class="text-[8.5px] text-emerald-400 font-semibold mt-1">Status: Clean & Protected</p>
        </div>

        <div class="grid grid-cols-3 gap-1.5">
          <div class="bg-[#081517] rounded-xl p-2 border border-white/5 text-center">
            <strong class="text-deen-gold text-xs block">67</strong>
            <span class="text-[7.5px] text-slate-400">Max Clean</span>
          </div>
          <div class="bg-[#081517] rounded-xl p-2 border border-white/5 text-center">
            <strong class="text-white text-xs block">42</strong>
            <span class="text-[7.5px] text-slate-400">Avg Streak</span>
          </div>
          <div class="bg-[#081517] rounded-xl p-2 border border-white/5 text-center">
            <strong class="text-emerald-400 text-xs block">3</strong>
            <span class="text-[7.5px] text-slate-400">Blocks Saved</span>
          </div>
        </div>

        <div class="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2">
          <strong class="text-emerald-300 block text-[8px] mb-0.5">Surah Al-Baqarah (2:222)</strong>
          <p class="text-[7.5px] text-slate-300 italic">"Indeed, Allah loves those who are constantly repentant and loves those who purify themselves."</p>
        </div>

        <div class="bg-[#081517] rounded-xl p-2 border border-white/5 space-y-1">
          <strong class="text-white text-[8px] block">Purity Journey History</strong>
          <div class="flex items-center justify-between text-[7.5px] text-slate-400 py-0.5 border-b border-white/5">
            <span>Milestone: 60 Days Clean</span>
            <span class="text-emerald-400 font-mono">Achieved</span>
          </div>
          <div class="flex items-center justify-between text-[7.5px] text-slate-400 py-0.5 border-b border-white/5">
            <span>Milestone: 30 Days Clean</span>
            <span class="text-emerald-400 font-mono">Achieved</span>
          </div>
          <div class="flex items-center justify-between text-[7.5px] text-slate-400 py-0.5">
            <span>Milestone: 7 Days Shield Start</span>
            <span class="text-emerald-400 font-mono">Achieved</span>
          </div>
        </div>
        `
      );

    case "community":
      return wrap(
        "Khadim-e-Masjid Community",
        "fa-solid fa-trophy",
        `
        <div class="grid grid-cols-4 gap-1 text-[7.5px] font-bold text-center">
          <span class="py-1 rounded bg-deen-gold text-slate-950">Ranks</span>
          <span class="py-1 rounded bg-[#081517] text-slate-300">Community</span>
          <span class="py-1 rounded bg-[#081517] text-slate-300">Requests</span>
          <span class="py-1 rounded bg-[#081517] text-slate-300">Reach Us</span>
        </div>

        <div class="bg-amber-950/30 border border-amber-500/30 rounded-xl p-2 text-[7.5px] text-amber-200">
          <strong class="block mb-0.5 text-[8px]">Sadaqah Point Engine Legend</strong>
          <span>+100 pts New Masjid • +50 pts Unique Masjid • +10 pts Verified Timing Update</span>
        </div>

        <div class="bg-[#081517] rounded-xl p-2 border border-white/5 space-y-1.5">
          <strong class="text-white text-[8px] block">Top Khadims (Leaderboard)</strong>
          
          <div class="flex items-center justify-between p-1.5 rounded-lg bg-black/40 border border-white/5">
            <div class="flex items-center gap-1.5">
              <span class="w-4 h-4 rounded-full bg-deen-gold text-slate-950 font-bold text-[8px] flex items-center justify-center">1</span>
              <div><strong class="text-white block">Qasim Bhai</strong><span class="text-slate-400 text-[7px]">Historic Makkah Masjid</span></div>
            </div>
            <span class="text-deen-gold font-bold font-mono">3,940 pts</span>
          </div>

          <div class="flex items-center justify-between p-1.5 rounded-lg bg-black/40 border border-white/5">
            <div class="flex items-center gap-1.5">
              <span class="w-4 h-4 rounded-full bg-slate-400 text-slate-950 font-bold text-[8px] flex items-center justify-center">2</span>
              <div><strong class="text-white block">Hafiz Ibrahim</strong><span class="text-slate-400 text-[7px]">Resident Aalim & Qari</span></div>
            </div>
            <span class="text-slate-300 font-bold font-mono">2,460 pts</span>
          </div>

          <div class="flex items-center justify-between p-1.5 rounded-lg bg-black/40 border border-white/5">
            <div class="flex items-center gap-1.5">
              <span class="w-4 h-4 rounded-full bg-amber-700 text-white font-bold text-[8px] flex items-center justify-center">3</span>
              <div><strong class="text-white block">Syed Ahmed Quadri</strong><span class="text-slate-400 text-[7px]">Jamia Masjid Bilal</span></div>
            </div>
            <span class="text-amber-400 font-bold font-mono">1,920 pts</span>
          </div>
        </div>

        <button onclick="this.textContent='Reset Completed'; setTimeout(() => this.textContent='Reset Leaderboard Stats', 1200)" class="w-full py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-red-500 text-slate-400 hover:text-red-300 text-[8px] font-bold transition-colors">
          Reset Leaderboard Stats
        </button>
        `
      );

    case "network":
      return wrap(
        "SalahTime Community Network",
        "fa-solid fa-globe",
        `
        <div class="grid grid-cols-2 gap-1.5 text-center">
          <div class="bg-[#081517] rounded-xl p-2 border border-white/5"><strong class="text-deen-gold text-sm block">140+</strong>Connected Masjids</div>
          <div class="bg-[#081517] rounded-xl p-2 border border-white/5"><strong class="text-white text-sm block">2,840</strong>Active Musallis</div>
          <div class="bg-[#081517] rounded-xl p-2 border border-white/5"><strong class="text-emerald-400 text-sm block">482</strong>JazakAllah Sent</div>
          <div class="bg-[#081517] rounded-xl p-2 border border-white/5"><strong class="text-cyan-400 text-sm block">38</strong>Verified Updaters</div>
          <div class="bg-[#081517] rounded-xl p-2 border border-white/5"><strong class="text-amber-400 text-sm block">99.4%</strong>Freshness Rate</div>
          <div class="bg-[#081517] rounded-xl p-2 border border-white/5"><strong class="text-teal-400 text-sm block">12</strong>City Clusters</div>
        </div>

        <div class="bg-[#081517] rounded-xl p-2 border border-white/5 space-y-1">
          <strong class="text-white text-[8px] block">Active Regional Clusters</strong>
          <div class="flex items-center justify-between text-[7.5px] text-slate-300 py-0.5 border-b border-white/5">
            <span>Hyderabad Central & Old City</span>
            <span class="text-emerald-400 font-bold">68 Masajid</span>
          </div>
          <div class="flex items-center justify-between text-[7.5px] text-slate-300 py-0.5 border-b border-white/5">
            <span>Cyberabad (Hitec City & Gachibowli)</span>
            <span class="text-emerald-400 font-bold">42 Masajid</span>
          </div>
          <div class="flex items-center justify-between text-[7.5px] text-slate-300 py-0.5">
            <span>Secunderabad & Cantonment</span>
            <span class="text-emerald-400 font-bold">30 Masajid</span>
          </div>
        </div>
        `
      );

    case "prayer-api":
      return wrap(
        "Solar Start & End Windows",
        "fa-solid fa-sun",
        `
        <div class="bg-[#081517] rounded-xl p-2 border border-white/5 text-center">
          <p class="text-[8.5px] text-deen-gold font-bold">Hyderabad, Telangana • Karachi (Hanafi)</p>
          <p class="text-[7.5px] text-slate-400">Wednesday, 28 October 2026 • 17 Jumada I, 1448 AH</p>
        </div>

        <div class="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2 text-center">
          <span class="text-[8px] text-slate-300 uppercase">Upcoming Solar Window</span>
          <p class="text-xs font-bold text-emerald-400 mt-0.5">Asr: 03:22 PM – 05:51 PM</p>
        </div>

        <div class="bg-[#081517] rounded-xl p-2 border border-white/5 space-y-1 font-mono text-[8px]">
          <div class="flex items-center justify-between py-0.5 border-b border-white/5">
            <span class="text-white font-sans font-bold">Fajr</span>
            <span class="text-slate-300">04:56 AM – 06:10 AM</span>
          </div>
          <div class="flex items-center justify-between py-0.5 border-b border-white/5">
            <span class="text-white font-sans font-bold">Dhuhr</span>
            <span class="text-slate-300">12:01 PM – 03:22 PM</span>
          </div>
          <div class="flex items-center justify-between py-0.5 border-b border-white/5 text-emerald-400 font-bold">
            <span class="font-sans font-bold">Asr</span>
            <span>03:22 PM – 05:51 PM</span>
          </div>
          <div class="flex items-center justify-between py-0.5 border-b border-white/5">
            <span class="text-white font-sans font-bold">Maghrib</span>
            <span class="text-slate-300">05:51 PM – 07:21 PM</span>
          </div>
          <div class="flex items-center justify-between py-0.5">
            <span class="text-white font-sans font-bold">Isha</span>
            <span class="text-slate-300">07:21 PM – 11:38 PM</span>
          </div>
        </div>
        `
      );

    case "fasting":
      return wrap(
        "12-Month Hijri Fasting Calendar",
        "fa-solid fa-moon",
        `
        <div class="flex items-center gap-1 overflow-x-auto pb-1 text-[7.5px] font-bold">
          <span class="px-2 py-0.5 rounded bg-deen-gold text-slate-950 shrink-0">1. Muharram</span>
          <span class="px-2 py-0.5 rounded bg-[#081517] text-slate-300 shrink-0">7. Rajab</span>
          <span class="px-2 py-0.5 rounded bg-[#081517] text-slate-300 shrink-0">8. Sha'ban</span>
          <span class="px-2 py-0.5 rounded bg-[#081517] text-slate-300 shrink-0">9. Ramadhan</span>
          <span class="px-2 py-0.5 rounded bg-[#081517] text-slate-300 shrink-0">12. Dhu al-Hijjah</span>
        </div>

        <div class="grid grid-cols-2 gap-1.5 text-center">
          <div class="bg-[#081517] rounded-xl p-2 border border-white/5">
            <span class="text-[7.5px] text-slate-400 block">SUHOOR ENDS</span>
            <strong class="text-deen-gold text-xs">05:05 AM</strong>
          </div>
          <div class="bg-[#081517] rounded-xl p-2 border border-white/5">
            <span class="text-[7.5px] text-slate-400 block">IFTAR TIME</span>
            <strong class="text-amber-400 text-xs">06:04 PM</strong>
          </div>
        </div>

        <div class="bg-[#081517] rounded-xl p-2 border border-white/5 space-y-1">
          <strong class="text-white text-[8px] block">Ayam-ul-Bidh (White Days 13, 14, 15)</strong>
          <div class="flex items-center justify-between text-[7.5px] text-slate-300 py-0.5 border-b border-white/5">
            <span>13th Jumada I (Sunnah Fast)</span>
            <span class="text-deen-gold font-bold">Upcoming</span>
          </div>
          <div class="flex items-center justify-between text-[7.5px] text-slate-300 py-0.5 border-b border-white/5">
            <span>14th Jumada I (Sunnah Fast)</span>
            <span class="text-deen-gold font-bold">Upcoming</span>
          </div>
          <div class="flex items-center justify-between text-[7.5px] text-slate-300 py-0.5">
            <span>15th Jumada I (Sunnah Fast)</span>
            <span class="text-deen-gold font-bold">Upcoming</span>
          </div>
        </div>

        <div class="bg-black/40 rounded-xl p-2 border border-white/5 text-[7.5px] text-slate-300">
          <strong class="text-deen-gold block mb-0.5">Iftar Dua:</strong>
          ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ
        </div>
        `
      );

    case "azkar":
      return wrap(
        "Daily & Custom Azkar",
        "fa-solid fa-book-open",
        `
        <div class="flex items-center justify-between text-[7.5px] font-bold border-b border-white/5 pb-1">
          <span class="text-deen-gold">Morning Azkar</span>
          <span class="text-slate-400">Evening Azkar</span>
          <span class="text-slate-400">Rabbana Duas</span>
          <span class="text-slate-400">+ Custom</span>
        </div>

        <div class="bg-[#081517] rounded-xl p-2.5 border border-white/5 space-y-1.5">
          <div class="flex items-center justify-between">
            <strong class="text-white text-[8.5px]">Ayat al-Kursi (Surah 2:255)</strong>
            <button onclick="this.querySelector('.count').textContent = (parseInt(this.querySelector('.count').textContent) + 1) % 4" class="px-2 py-0.5 rounded-full bg-deen-gold text-slate-950 font-bold text-[7.5px]">
              Tap: <span class="count">0</span> / 3
            </button>
          </div>
          <p class="font-arabic text-amber-200 text-[10px] text-right" dir="rtl">اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ</p>
          <p class="text-[7.5px] text-slate-300">"Allah! There is no deity except Him, the Ever-Living, the Sustainer of existence."</p>
        </div>

        <div class="bg-[#081517] rounded-xl p-2.5 border border-white/5 space-y-1.5">
          <div class="flex items-center justify-between">
            <strong class="text-white text-[8.5px]">Sayyidul Istighfar</strong>
            <button onclick="this.querySelector('.count').textContent = (parseInt(this.querySelector('.count').textContent) + 1) % 2" class="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-[7.5px]">
              Tap: <span class="count">0</span> / 1
            </button>
          </div>
          <p class="font-arabic text-amber-200 text-[10px] text-right" dir="rtl">اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ</p>
        </div>
        `
      );

    case "names99":
      return wrap(
        "99 Names of Allah (Asma-ul-Husna)",
        "fa-solid fa-hands-praying",
        `
        <button id="play-all-names-btn" onclick="this.innerHTML = this.innerHTML.includes('Pause') ? '<i class=\'fa-solid fa-play text-[8px]\'></i><span>Play All (1–99)</span>' : '<i class=\'fa-solid fa-pause text-[8px]\'></i><span>Pause Audio (Playing #1)</span>'" class="w-full py-1.5 rounded-xl bg-deen-gold text-slate-950 font-bold text-[8.5px] flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-play text-[8px]"></i>
          <span>Play All (1–99)</span>
        </button>

        <div class="grid grid-cols-2 gap-1.5">
          <div class="bg-[#081517] rounded-xl p-2 border border-white/5 text-center">
            <span class="font-arabic text-deen-gold text-xs block">الرَّحْمَٰنُ</span>
            <strong class="text-white text-[8px] block">1. Ar-Rahman</strong>
            <span class="text-[7px] text-slate-400">The Most Merciful</span>
          </div>
          <div class="bg-[#081517] rounded-xl p-2 border border-white/5 text-center">
            <span class="font-arabic text-deen-gold text-xs block">الرَّحِيمُ</span>
            <strong class="text-white text-[8px] block">2. Ar-Rahim</strong>
            <span class="text-[7px] text-slate-400">The Bestower of Mercy</span>
          </div>
          <div class="bg-[#081517] rounded-xl p-2 border border-white/5 text-center">
            <span class="font-arabic text-deen-gold text-xs block">الْمَلِكُ</span>
            <strong class="text-white text-[8px] block">3. Al-Malik</strong>
            <span class="text-[7px] text-slate-400">The King & Owner</span>
          </div>
          <div class="bg-[#081517] rounded-xl p-2 border border-white/5 text-center">
            <span class="font-arabic text-deen-gold text-xs block">الْقُدُّوسُ</span>
            <strong class="text-white text-[8px] block">4. Al-Quddus</strong>
            <span class="text-[7px] text-slate-400">The Absolutely Pure</span>
          </div>
        </div>
        `
      );

    case "admin":
      return wrap(
        "Admin Control Center",
        "fa-solid fa-shield-halved",
        `
        <div class="grid grid-cols-4 gap-1 text-[7.5px] font-bold text-center">
          <span class="py-1 rounded bg-deen-gold text-slate-950">Users</span>
          <span class="py-1 rounded bg-[#081517] text-slate-300">Masjids</span>
          <span class="py-1 rounded bg-[#081517] text-slate-300">Stats</span>
          <span class="py-1 rounded bg-[#081517] text-slate-300">Broadcasts</span>
        </div>

        <div class="bg-[#081517] rounded-xl p-2 border border-white/5 space-y-1.5">
          <div class="flex items-center justify-between">
            <div><strong class="text-white text-[8.5px] block">Qasim Bhai (Super Admin)</strong><span class="text-slate-400 text-[7.5px]">qasim@salahtime.org</span></div>
            <button onclick="this.nextElementSibling.classList.toggle('hidden')" class="px-2 py-0.5 rounded bg-deen-gold text-slate-950 font-bold text-[7.5px]">Fetch Update Count</button>
            <span class="hidden text-emerald-400 font-bold font-mono text-[7.5px]">84 Live Updates</span>
          </div>
        </div>

        <div class="bg-[#081517] rounded-xl p-2 border border-white/5 space-y-1.5">
          <strong class="text-white text-[8px] block">Pending Masjid Approvals</strong>
          <div class="flex items-center justify-between text-[7.5px] bg-black/40 p-1.5 rounded-lg border border-white/5">
            <span>Masjid Usmani (Amberpet)</span>
            <div class="flex items-center gap-1">
              <button onclick="this.parentElement.innerHTML='<span class=\'text-emerald-400 font-bold\'>Approved</span>'" class="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold">Approve</button>
              <button onclick="this.parentElement.innerHTML='<span class=\'text-red-400 font-bold\'>Rejected</span>'" class="px-1.5 py-0.5 rounded bg-red-600 text-white font-bold">Reject</button>
            </div>
          </div>
        </div>

        <div class="bg-[#081517] rounded-xl p-2 border border-white/5 space-y-1">
          <strong class="text-white text-[8px] block">SalahTime FCM Push Broadcast</strong>
          <input type="text" placeholder="Notification Title..." class="w-full bg-black/40 rounded p-1 text-[7.5px] text-white border border-white/10" value="Jumu'ah Timings Updated Across Hyderabad">
          <button onclick="this.textContent='Broadcast Sent to 2,840 Musallis!'" class="w-full py-1 rounded bg-emerald-600 text-white font-bold text-[7.5px] mt-1">
            SalahTime FCM Push Broadcast
          </button>
        </div>
        `
      );

    case "add-juma":
      return wrap(
        "Add Friday Topic",
        "fa-solid fa-microphone",
        `
        <div class="space-y-1.5">
          <div>
            <label class="text-[7.5px] font-bold text-slate-300 block mb-0.5">Select Masjid</label>
            <select class="w-full bg-[#081517] text-slate-200 border border-white/10 rounded-lg p-1 text-[8px]">
              <option>Historic Makkah Masjid (Charminar)</option>
              <option>Jamia Masjid Bilal (Mehdipatnam)</option>
              <option>Masjid Al-Noor (Tolichowki)</option>
            </select>
          </div>

          <div>
            <label class="text-[7.5px] font-bold text-slate-300 block mb-0.5">Khutbah Topic Title</label>
            <input type="text" placeholder="e.g. Importance of Sincerity & Cleanliness..." class="w-full bg-[#081517] text-white border border-white/10 rounded-lg p-1 text-[8px]">
          </div>

          <div>
            <label class="text-[7.5px] font-bold text-slate-300 block mb-0.5">Select Verified Scholar (isAalim)</label>
            <select class="w-full bg-[#081517] text-slate-200 border border-white/10 rounded-lg p-1 text-[8px]">
              <option>Maulana Hafiz Mohammed Ibrahim (Resident Aalim)</option>
              <option>Shaikh Saleh Saed Ba Yazid (Verified Scholar)</option>
              <option>Mufti Abdul Qadeer (Darul Uloom Al-Huda)</option>
              <option>None of the above / Manual Input</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-1.5">
            <div>
              <label class="text-[7.5px] font-bold text-slate-300 block mb-0.5">Friday Date</label>
              <input type="text" value="30/10/2026" class="w-full bg-[#081517] text-white border border-white/10 rounded-lg p-1 text-[8px]">
            </div>
            <div>
              <label class="text-[7.5px] font-bold text-slate-300 block mb-0.5">Jama'at Time</label>
              <input type="text" value="01:15 PM" class="w-full bg-[#081517] text-white border border-white/10 rounded-lg p-1 text-[8px]">
            </div>
          </div>

          <button onclick="this.textContent='Friday Topic Published Successfully!'; this.className='w-full py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-[8.5px] mt-2'" class="w-full py-1.5 rounded-xl bg-deen-gold hover:bg-[#c28424] text-slate-950 font-bold text-[8.5px] mt-2 transition-colors">
            Publish Friday Topic
          </button>
        </div>
        `
      );

    default:
      return wrap("Detail View", "fa-solid fa-circle-info", "<p>Content not available.</p>");
  }
}

window.openPhoneSubModal = function (type) {
  closeAllPhoneModals();
  scrollToPhoneOnMobile();
  const modal = document.getElementById("phone-subscreen-modal");
  if (!modal) return;
  modal.innerHTML = renderSubModalContent(type);
  modal.classList.remove("hidden");
  modal.style.setProperty("display", "flex", "important");
};

window.closePhoneSubModal = function () {
  const modal = document.getElementById("phone-subscreen-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.setProperty("display", "none", "important");
    modal.innerHTML = "";
  }
};

// ============================================================================
// 12. SALAH COUNTDOWN ENGINE (UPDATING BOTH PRAYER & HOME LED COUNTDOWNS)
// ============================================================================

function startPrayerCountdown() {
  let secondsRemaining = 1 * 3600 + 39 * 60 + 2;

  setInterval(() => {
    if (secondsRemaining > 0) {
      secondsRemaining -= 1;
    } else {
      secondsRemaining = 2 * 3600;
    }

    const hrs = Math.floor(secondsRemaining / 3600);
    const mins = Math.floor((secondsRemaining % 3600) / 60);
    const secs = secondsRemaining % 60;
    const pad = (n) => (n < 10 ? "0" + n : n);

    const prayerTimerEl = document.getElementById("prayer-countdown-timer");
    if (prayerTimerEl) {
      prayerTimerEl.textContent = `in ${hrs}h ${pad(mins)}m ${pad(secs)}s`;
    }

    const homeLedCountdownEl = document.getElementById("home-led-countdown");
    if (homeLedCountdownEl) {
      homeLedCountdownEl.textContent = `${hrs}H ${pad(mins)}M ${pad(secs)}S`;
    }
  }, 1000);
}

function startClockSync() {
  function updateClocks() {
    const now = new Date();
    let hours = now.getHours();
    const mins = now.getMinutes();
    hours = hours % 12;
    hours = hours ? hours : 12;
    const pad = (n) => (n < 10 ? "0" + n : n);

    const statusTime = document.getElementById("phone-status-time");
    if (statusTime) {
      statusTime.textContent = `${hours}:${pad(mins)} am`;
    }
  }

  updateClocks();
  setInterval(updateClocks, 1000);
}

// ============================================================================
// 13. AUTOMATIC DYNAMIC DISPLAY SCALING ENGINE
// ============================================================================

export function initDisplayScalingEngine() {
  const root = document.documentElement;

  function getDisplayProfile() {
    const sw = window.screen.width || window.innerWidth;
    const sh = window.screen.height || window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const iw = window.innerWidth;

    let autoScale = 1.0;

    if (sw >= 3440 || (sw >= 1920 && dpr >= 2 && sw * dpr >= 3840)) {
      autoScale = (sw / sh > 2.0) ? 1.30 : 1.45;
    } else if (sw >= 2400 || (sw >= 2000 && sh >= 1300) || iw >= 2200) {
      autoScale = 1.25;
    } else if (sw >= 1800 || iw >= 1800) {
      autoScale = 1.05;
    } else {
      autoScale = 1.0;
    }

    return autoScale;
  }

  function applyScale(scale) {
    const num = Math.min(Math.max(parseFloat(scale) || 1.0, 0.85), 1.6);
    root.style.setProperty("--display-scale", num.toString());
    root.style.setProperty("--phone-scale", num.toString());
    root.style.fontSize = `${16 * num}px`;

    let styleEl = document.getElementById("dynamic-display-scale-style");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "dynamic-display-scale-style";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = 
      `#phone-container { zoom: ${num} !important; }\n` +
      `#scrolly-sections-wrapper { zoom: ${num} !important; }\n` +
      `#hero-content-container { zoom: ${num} !important; }\n` +
      `.max-w-7xl { max-width: min(${88 * num}rem, 95vw) !important; }\n`;

    const phone = document.getElementById("phone-container");
    if (phone) {
      phone.style.zoom = num;
      phone.style.setProperty("--phone-scale", num.toString());
    }
    const scrollyCards = document.getElementById("scrolly-sections-wrapper");
    if (scrollyCards) {
      scrollyCards.style.zoom = num;
    }
    const heroContent = document.getElementById("hero-content-container");
    if (heroContent) {
      heroContent.style.zoom = num;
    }
  }

  applyScale(getDisplayProfile());

  window.addEventListener("resize", () => {
    applyScale(getDisplayProfile());
  }, { passive: true });
}

// ============================================================================
// 14. THEME ENGINE (Dark, Light, System Sync)
// ============================================================================

function initThemeEngine() {
  const THEME_STORAGE_KEY = "deen_theme_mode";

  function getSystemDark() {
    return !(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches);
  }

  function getStoredMode() {
    try {
      const mode = localStorage.getItem(THEME_STORAGE_KEY);
      if (mode === "dark" || mode === "light" || mode === "system") {
        return mode;
      }
    } catch (e) {}
    return "dark";
  }

  function applyTheme(mode) {
    const isDark = mode === "light" ? false : (mode === "system" ? getSystemDark() : true);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.classList.toggle("dark", isDark);

    const buttons = document.querySelectorAll("[data-theme-btn]");
    buttons.forEach((btn) => {
      const btnMode = btn.getAttribute("data-theme-btn");
      if (btnMode === mode) {
        btn.classList.add("active-theme");
      } else {
        btn.classList.remove("active-theme");
      }
    });
  }

  function setThemeMode(mode) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {}
    applyTheme(mode);
  }

  const buttons = document.querySelectorAll("[data-theme-btn]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const mode = btn.getAttribute("data-theme-btn");
      if (mode) {
        setThemeMode(mode);
      }
    });
  });

  window.addEventListener("storage", (e) => {
    if (e.key === THEME_STORAGE_KEY) {
      applyTheme(getStoredMode());
    }
  });

  if (window.matchMedia) {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    mediaQuery.addEventListener("change", () => {
      if (getStoredMode() === "system") {
        applyTheme("system");
      }
    });
  }

  applyTheme(getStoredMode());
}

// ============================================================================
// 15. INITIALIZATION
// ============================================================================

function runInit() {
  if (!window.location.hash) {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
  const motionRoot = document.getElementById("motion-cursor-root");
  if (motionRoot && !motionRoot.dataset.mounted) {
    motionRoot.dataset.mounted = "true";
    const reactRoot = createRoot(motionRoot);
    reactRoot.render(React.createElement(DeenAiMotionController));
  }

  initThemeEngine();
  initDisplayScalingEngine();
  setupScrollSpy();
  setupQuickJumpPills();
  startPrayerCountdown();
  startClockSync();
  window.setSystemProtection(true);
  setActiveScreen(0, true);

  requestAnimationFrame(() => {
    if (!window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  });

  setTimeout(() => {
    isInitialLoad = false;
  }, 350);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runInit);
} else {
  runInit();
}

window.addEventListener("load", () => {
  if (!window.location.hash) {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
});
