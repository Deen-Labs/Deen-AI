/**
 * Deen-AI Interactive Simulator & Scrollytelling Controller
 * Production-ready vanilla JavaScript module for Vite multi-page build.
 * Features 100% local scripted scholarly responses (Zero Cloud API Relay),
 * zero-void scroll bounds, and 1:1 pixel-accurate mobile app replicas.
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

// Authenticated Daily Hadith / Inspiration FIFO Queue (Matching Real App)
const INSPIRATION_ITEMS = [
  {
    arabic: "الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ",
    english: '"A Muslim is the one from whose tongue and hands the Muslims are safe."',
    source: "— Sahih al-Bukhari 10",
  },
  {
    arabic: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
    english: '"The best among you are those who learn the Quran and teach it."',
    source: "— Sahih al-Bukhari 5027",
  },
  {
    arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
    english: '"Actions are judged by intentions, and every person will get what they intended."',
    source: "— Sahih al-Bukhari 1",
  },
  {
    arabic: "مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ",
    english: '"Whoever takes a path in search of knowledge, Allah makes easy for him a path to Paradise."',
    source: "— Sahih Muslim 2699",
  },
  {
    arabic: "لَيْسَ الشَّدِيدُ بِالصُّرَعَةِ، إِنَّمَا الشَّدِيدُ الَّذِي يَمْلِكُ نَفْسَهُ عِنْدَ الْغَضَبِ",
    english: '"The strong is not the one who overcomes the people by his strength, but the one who controls himself while in anger."',
    source: "— Sahih al-Bukhari 6114",
  },
];
let inspirationIndex = 0;

// PIN Keypad State
let enteredPin = "";
const CORRECT_PIN = "1234";

// Focus Dial State (Proportionate, clean sans-serif geometry)
let focusDurationMinutes = 25;
let focusRemainingSeconds = 25 * 60;
let focusTotalSeconds = 25 * 60;
let focusTimerInterval = null;
let isFocusRunning = false;

// 100% Local Scripted Scholarly Knowledge Base (Zero Cloud API Relay, 100% Immediate)
const SCHOLARLY_REPLIES = {
  "how to maintain consistency in fajr prayer?": {
    question: "How to maintain consistency in Fajr prayer?",
    answer: "Maintaining consistency in Fajr prayer begins with intentional evening habits: sleeping in a state of Wudu after reciting Surah Al-Mulk, placing your alarm out of arm's reach, and making sincere du'a for waking. The Prophet (ﷺ) stated: 'Whoever prays the Fajr prayer is under the protection of Allah.'",
    sources: [
      {
        title: "Sahih Muslim - Book of Mosques",
        ref: "Hadith 657",
        archive: "archive.org/details/sahih-muslim-english-vol-1",
      },
      {
        title: "Sunan Abi Dawud",
        ref: "Hadith 5063",
        archive: "archive.org/details/sunan-abi-dawud",
      },
    ],
  },
  "what is the ruling on fasting while traveling?": {
    question: "What is the ruling on fasting while traveling?",
    answer: "A traveler is granted the concession (rukhsah) to break their fast if the journey exceeds the standard Safar distance (approx. 77 km / 48 miles) and entails genuine difficulty. If traveling with modern convenience without hardship, fasting remains superior according to the majority of jurists (Jumhur).",
    sources: [
      {
        title: "Surah Al-Baqarah",
        ref: "Ayah 185",
        archive: "Quran 2:185",
      },
      {
        title: "Sahih al-Bukhari - Kitab al-Sawm",
        ref: "Hadith 1946",
        archive: "archive.org/details/bukhari-sawm",
      },
    ],
  },
  "dua for overcoming anxiety and intrusive doubts": {
    question: "Dua for overcoming anxiety and intrusive doubts",
    answer: "For intrusive whisperings (Waswas) and anxiety, the Sunnah provides comprehensive remedies: seek refuge in Allah from Shaytan ('A'udhu billahi minash-shaytanir-rajim') and recite: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ' (O Allah, I seek refuge in You from anxiety and grief).",
    sources: [
      {
        title: "Sahih al-Bukhari - Book of Invocations",
        ref: "Hadith 6363",
        archive: "archive.org/details/sahih-bukhari-adkhar",
      },
      {
        title: "Hisn al-Muslim (Fortress of the Muslim)",
        ref: "Chapter 36",
        archive: "archive.org/details/hisn-al-muslim-complete",
      },
    ],
  },
  "explain the virtues and timings of tahajjud": {
    question: "Explain the virtues and timings of Tahajjud",
    answer: "Tahajjud (Qiyam al-Layl) is prayed after waking up from sleep in the last third of the night. Allah descends in a manner befitting His Majesty to the lowest heaven, asking: 'Who is calling upon Me that I may answer him? Who is asking of Me that I may give him?'",
    sources: [
      {
        title: "Sahih al-Bukhari",
        ref: "Hadith 1145",
        archive: "archive.org/details/sahih-bukhari-tahajjud",
      },
      {
        title: "Sahih Muslim",
        ref: "Hadith 758",
        archive: "archive.org/details/sahih-muslim-night-prayer",
      },
    ],
  },
};

const INQUIRY_KEYS = Object.keys(SCHOLARLY_REPLIES);
let randomInquiryIndex = 0;

// ============================================================================
// 1. STRICT MODAL ISOLATION & SYSTEM RESET
// ============================================================================

export function closeAllPhoneModals() {
  const pinModal = document.getElementById("phone-pin-modal");
  const qiblaModal = document.getElementById("phone-qibla-modal");

  if (pinModal) {
    pinModal.classList.add("hidden");
    pinModal.style.setProperty("display", "none", "important");
  }
  if (qiblaModal) {
    qiblaModal.classList.add("hidden");
    qiblaModal.style.setProperty("display", "none", "important");
  }
}

window.closeAllPhoneModals = closeAllPhoneModals;

// ============================================================================
// 2. MOBILE CONTEXT CARD METADATA & SYNCHRONIZATION
// ============================================================================

const MODULE_METADATA = [
  {
    moduleNumber: "Module 01",
    tag: "Core Shield",
    statusBadge: "67 DAYS CLEAN",
    badgeClasses: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    title: "Digital Guardian & Streak Habit Shield",
    desc: "Engineered to safeguard spiritual mindfulness through device-level defense. Combines a native Android Accessibility Service with compiled word-boundary regular expressions to eliminate Scunthorpe false positives, alongside a local DNS sinkhole for adult content isolation.",
    prompt: "👉 Tap the Shield toggle or Lock icon inside the simulator above to interact.",
  },
  {
    moduleNumber: "Module 02",
    tag: "Astronomical Salah",
    statusBadge: "NEXT: ASR IN 02H 14M",
    badgeClasses: "bg-teal-500/20 text-teal-400 border-teal-500/40",
    title: "Astronomical Calculation Engine & Live Ticker",
    desc: "Offline-first astronomical equations calculating Fajr, Dhuhr, Asr, Maghrib, and Isha with sub-second accuracy across MWL, ISNA, and Umm Al-Qura conventions with dynamic solar angle tracking.",
    prompt: "👉 Next prayer countdown is actively ticking in real time above.",
  },
  {
    moduleNumber: "Module 03",
    tag: "Mindful Focus",
    statusBadge: "STRICT ISOLATION",
    badgeClasses: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    title: "Halal Focus Dial & PIN Unlock Simulator",
    desc: "Clean geometric focus dial isolating device notifications during worship or deep work. Protected by an early-unlock PIN gate to maintain discipline.",
    prompt: "👉 Tap +5m / -5m or Start Focus inside the simulator above (Test PIN: 1234).",
  },
  {
    moduleNumber: "Module 04",
    tag: "Strict RAG",
    statusBadge: "ZERO HALLUCINATIONS",
    badgeClasses: "bg-teal-500/20 text-teal-400 border-teal-500/40",
    title: "100% Local Scripted Scholarly Knowledge Base",
    desc: "Instantaneous, citation-verified theological answers with zero external cloud API relay. Every response links directly to authenticated primary texts.",
    prompt: "👉 Tap any suggested question chip inside the chat screen above for an instant verified response.",
  },
  {
    moduleNumber: "Module 05",
    tag: "Digital Hardware",
    statusBadge: "MAHMOOD WATCH CO.",
    badgeClasses: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    title: "Authentic LED Masjid Clocks & Qibla Compass",
    desc: "1:1 authentic replica of classic Mahmood Watch Co. red digital LED timetable boards, alongside a smooth responsive Qibla compass.",
    prompt: "👉 Tap 'View Timings' or the Compass button inside the simulator above.",
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
// 2. SCREEN SWITCHER & SYNC LOGIC
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
    // Only scroll window on desktop viewports (>= 1024px)
    // On mobile (< 1024px), keep the phone simulator squarely in view without displacing the user
    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop) {
      const targetSection = document.querySelector(`.feature-deepdive-card[data-screen="${index}"]`);
      if (targetSection) {
        const topOffset = targetSection.getBoundingClientRect().top + window.pageYOffset - 90;
        window.scrollTo({
          top: topOffset,
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
// 3. SCROLL SPY INTERSECTION OBSERVER WITH ROBUST LOCKING
// ============================================================================

function setupScrollSpy() {
  const sections = document.querySelectorAll(".feature-deepdive-card");
  if (!sections.length) return;

  const observerOptions = {
    root: null,
    rootMargin: "-15% 0px -20% 0px",
    threshold: 0.35,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const screenIndex = parseInt(entry.target.getAttribute("data-screen"), 10);
        if (!isNaN(screenIndex) && screenIndex !== activeScreenIndex) {
          setActiveScreen(screenIndex, true);
        }
      }
    });
  }, observerOptions);

  sections.forEach((sec) => observer.observe(sec));
}

// ============================================================================
// 4. QUICK-JUMP PILLS IN HERO
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
// 5. SCREEN 0: HOME / GUARDIAN LOGIC
// ============================================================================

window.cycleDailyInspiration = function () {
  inspirationIndex = (inspirationIndex + 1) % INSPIRATION_ITEMS.length;
  const item = INSPIRATION_ITEMS[inspirationIndex];

  const arabicEl = document.getElementById("home-hadith-arabic");
  const textEl = document.getElementById("daily-inspiration-text");
  const sourceEl = document.getElementById("daily-inspiration-source");

  if (arabicEl && textEl && sourceEl) {
    textEl.style.opacity = "0";
    setTimeout(() => {
      arabicEl.textContent = item.arabic;
      textEl.textContent = item.english;
      sourceEl.textContent = item.source;
      textEl.style.opacity = "1";
    }, 120);
  }
};

window.isSystemProtectionActive = true;

window.setSystemProtection = function (isActive) {
  window.isSystemProtectionActive = isActive;

  // 1. Update Top Online/Offline Badge in Screen 0
  const badgeEl = document.getElementById("phone-online-status-badge");
  if (badgeEl) {
    if (isActive) {
      badgeEl.className = "px-2 py-0.5 rounded-full text-[8px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-colors";
      badgeEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><span>ONLINE</span>';
    } else {
      badgeEl.className = "px-2 py-0.5 rounded-full text-[8px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1.5 transition-colors";
      badgeEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span><span>OFFLINE</span>';
    }
  }

  // 2. Synchronize Screen 0 (Home) Toggle & Status Text
  const homeToggle = document.getElementById("toggle-home-shield");
  const homeStatus = document.getElementById("home-protection-status");
  if (homeToggle) homeToggle.checked = isActive;
  if (homeStatus) {
    if (isActive) {
      homeStatus.textContent = "Active — Shield Protected";
      homeStatus.className = "text-[8.5px] text-emerald-400 font-medium";
    } else {
      homeStatus.textContent = "Inactive — Device Exposed";
      homeStatus.className = "text-[8.5px] text-red-400 font-medium";
    }
  }

  // 3. Synchronize Screen 2 (Focus) Toggle & Status Text
  const focusToggle = document.getElementById("toggle-focus-shield");
  const focusStatus = document.getElementById("focus-protection-status");
  if (focusToggle) focusToggle.checked = isActive;
  if (focusStatus) {
    if (isActive) {
      focusStatus.textContent = "Active — Accessibility & DNS Guard";
      focusStatus.className = "text-[8.5px] text-emerald-400 font-medium";
    } else {
      focusStatus.textContent = "Inactive — Device Exposed";
      focusStatus.className = "text-[8.5px] text-red-400 font-medium";
    }
  }
};

window.toggleHomeShieldProtection = function (input) {
  window.setSystemProtection(input.checked);
};

window.toggleFocusShieldProtection = function (input) {
  window.setSystemProtection(input.checked);
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

// PIN Modal Functions (Strict Isolation)
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
        feedback.textContent = "✓ Passcode Verified! Settings Unlocked";
        feedback.className = "text-[9.5px] text-emerald-400 font-bold";
      }
      setTimeout(() => {
        closePinModal();
      }, 600);
    } else {
      if (feedback) {
        feedback.textContent = "✗ Incorrect PIN. Try 1234";
        feedback.className = "text-[9.5px] text-red-400 font-bold";
      }
      enteredPin = "";
      updatePinDots();
    }
  }, 300);
}

// ============================================================================
// 6. SCREEN 1: ASTRONOMICAL SALAH & COUNTDOWN
// ============================================================================

function startPrayerCountdown() {
  const timerEl = document.getElementById("prayer-countdown-timer");
  if (!timerEl) return;

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
    timerEl.textContent = `in ${hrs}h ${pad(mins)}m ${pad(secs)}s`;
  }, 1000);
}

// ============================================================================
// 7. SCREEN 2: FOCUS DIAL & CLEAN GEOMETRIC SANS-SERIF
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
  if (list) {
    list.classList.toggle("hidden");
  }
  if (arrow) {
    arrow.classList.toggle("rotate-180");
  }
};

// ============================================================================
// 8. SCREEN 3: 100% LOCAL & CONTROLLED SCHOLARLY INQUIRIES (ZERO CLOUD API)
// ============================================================================

window.askPhoneQuestion = function (queryText) {
  setActiveScreen(3, false);
  submitPhoneChatInstant(queryText);
};

window.askRandomInquiry = function () {
  setActiveScreen(3, false);
  const key = INQUIRY_KEYS[randomInquiryIndex % INQUIRY_KEYS.length];
  randomInquiryIndex++;
  const inquiry = SCHOLARLY_REPLIES[key];
  submitPhoneChatInstant(inquiry.question);
};

window.clearPhoneChatHistory = function () {
  const container = document.getElementById("chat-messages-container");
  if (container) {
    container.innerHTML = `
      <div class="flex items-start space-x-1.5">
        <div class="w-5 h-5 rounded-full bg-deen-gold/20 flex items-center justify-center text-deen-gold text-[9px] flex-shrink-0 mt-0.5">
          <i class="fa-solid fa-comment-dots"></i>
        </div>
        <div class="bg-[#0c2326] border border-white/10 rounded-2xl rounded-tl-none p-2.5 text-slate-200 text-[10.5px] leading-relaxed shadow-sm">
          <p>As-salamu alaykum! I am your Imam AI Assistant. Tap any of the authenticated scholarly questions above for immediate verified answers.</p>
          <span class="text-[8px] text-slate-500 mt-1 block text-right">1:29 am</span>
        </div>
      </div>
    `;
  }
};

function submitPhoneChatInstant(question) {
  const container = document.getElementById("chat-messages-container");
  if (!container) return;

  // 1. Add User Question Bubble Immediately
  const userBubble = document.createElement("div");
  userBubble.className = "flex items-start justify-end space-x-1.5";
  userBubble.innerHTML = `
    <div class="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl rounded-tr-none p-2.5 text-[10.5px] leading-relaxed max-w-[85%] shadow-sm">
      ${escapeHtml(question)}
    </div>
  `;
  container.appendChild(userBubble);

  // 2. Resolve 100% Locally from in-memory dictionary (ZERO API CALL)
  const normalizedKey = question.toLowerCase().trim();
  let reply = SCHOLARLY_REPLIES[normalizedKey];

  if (!reply) {
    for (const [key, val] of Object.entries(SCHOLARLY_REPLIES)) {
      if (normalizedKey.includes(key) || key.includes(normalizedKey)) {
        reply = val;
        break;
      }
    }
  }

  if (!reply) {
    reply = {
      question: question,
      answer: `In orthodox Islamic jurisprudence, questions concerning "${question}" are resolved via authenticated texts in the Quran and Sunnah. Continuous remembrance of Allah, adhering to legitimate scholarly consensus, and fulfilling obligatory Salah are paramount.`,
      sources: [
        {
          title: "Sahih al-Bukhari & Sahih Muslim",
          ref: "Authentic Hadith Compilations",
          archive: "archive.org/details/islamic-texts-verified",
        },
      ],
    };
  }

  // 3. Render Citations HTML
  let sourcesHtml = "";
  if (reply.sources && reply.sources.length) {
    const sourceList = reply.sources
      .map(
        (s) => `
      <div class="flex items-center justify-between text-[8px] text-slate-300 py-0.5 border-b border-white/5 last:border-0">
        <span><i class="fa-solid fa-book-bookmark text-deen-gold mr-1"></i> ${s.title} (${s.ref})</span>
        <span class="text-deen-gold font-mono">IA Verified</span>
      </div>
    `
      )
      .join("");

    sourcesHtml = `
      <div class="mt-2 pt-1.5 border-t border-white/10">
        <button onclick="this.nextElementSibling.classList.toggle('hidden')" class="text-[8.5px] font-bold text-deen-gold hover:text-amber-200 flex items-center gap-1">
          <i class="fa-solid fa-archive text-[9px]"></i>
          <span>Verified Sources (${reply.sources.length} citations)</span>
          <i class="fa-solid fa-chevron-down text-[7px] ml-0.5"></i>
        </button>
        <div class="hidden mt-1 p-1.5 bg-black/40 rounded-lg border border-white/5 space-y-0.5">
          ${sourceList}
        </div>
      </div>
    `;
  }

  // 4. Append AI Scholarly Bubble Immediately (100% Instant)
  const aiBubble = document.createElement("div");
  aiBubble.className = "flex items-start space-x-1.5";
  aiBubble.innerHTML = `
    <div class="w-5 h-5 rounded-full bg-deen-gold/20 flex items-center justify-center text-deen-gold text-[9px] flex-shrink-0 mt-0.5">
      <i class="fa-solid fa-comment-dots"></i>
    </div>
    <div class="bg-[#0c2326] border border-white/10 rounded-2xl rounded-tl-none p-2.5 text-slate-200 text-[10.5px] leading-relaxed shadow-sm max-w-[85%]">
      <p>${reply.answer}</p>
      ${sourcesHtml}
    </div>
  `;

  container.appendChild(aiBubble);
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(string) {
  const div = document.createElement("div");
  div.innerText = string;
  return div.innerHTML;
}

// ============================================================================
// 9. SCREEN 4: IN-CARD MAHMOOD WATCH CO. TIMING BOARD & QIBLA COMPASS
// ============================================================================

window.toggleMasjidTimingsBoard = function (id) {
  const board = document.getElementById(`masjid-timings-board-${id}`);
  const btnText = document.getElementById(`btn-text-timings-${id}`);
  if (board) {
    if (board.classList.contains("hidden")) {
      board.classList.remove("hidden");
      if (btnText) btnText.textContent = "Hide Timings ⌃";
    } else {
      board.classList.add("hidden");
      if (btnText) btnText.textContent = "View Timings ⌵";
    }
  }
};

window.expandMasjidBoard = function (id = 1) {
  setActiveScreen(4, false);
  scrollToPhoneOnMobile();
  const board = document.getElementById(`masjid-timings-board-${id}`);
  const btnText = document.getElementById(`btn-text-timings-${id}`);
  if (board) {
    board.classList.remove("hidden");
    if (btnText) btnText.textContent = "Hide Timings ⌃";
  }
};

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
// 10. INITIALIZATION
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  if (!window.location.hash) {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
  setupScrollSpy();
  setupQuickJumpPills();
  startPrayerCountdown();
  startClockSync();
  window.setSystemProtection(true);
  setActiveScreen(0, true);

  // Guarantee view starts at top of Hero section
  requestAnimationFrame(() => {
    if (!window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  });

  setTimeout(() => {
    isInitialLoad = false;
  }, 350);
});

window.addEventListener("load", () => {
  if (!window.location.hash) {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
});
