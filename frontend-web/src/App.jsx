import React, { useState } from "react";
import { motion } from "framer-motion";
import { CursorProvider } from "./context/CursorContext";
import RotatedSquareCursor from "./components/RotatedSquareCursor";
import MagneticButton from "./components/MagneticButton";
import InteractiveProjectCard from "./components/InteractiveProjectCard";

export default function App() {
  const [formState, setFormState] = useState({ status: 'idle' });

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormState({ status: 'submitting' });

    const formData = new FormData(e.target);
    const formBody = new URLSearchParams();

    formBody.append("entry.1013697644", formData.get("name"));
    formBody.append("entry.403824665", formData.get("email"));
    formBody.append("entry.1284336773", formData.get("message"));

    try {
      await fetch("https://docs.google.com/forms/u/0/d/e/1FAIpQLSclAmCIhe4qrS1QEFG1VP_Zw-Ilet71Ya_bqjYnqauTMXD_sQ/formResponse", {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formBody.toString()
      });

      setFormState({ status: 'success' });
      e.target.reset();
      setTimeout(() => setFormState({ status: 'idle' }), 5000);
    } catch (error) {
      console.error("Form submission error", error);
      setFormState({ status: 'error' });
    }
  };
  return (
    <CursorProvider>
      <RotatedSquareCursor />
      <div className="font-sans text-slate-100 antialiased min-h-screen flex flex-col">
        {/* We wrap the generated JSX in a fragment just in case it returned multiple siblings */}
        <>
<div>

  {/* ==========================================
       GLOBAL STICKY NAVIGATION BAR
       ========================================== */}
  <header id="navbar" className="sticky top-0 z-50 transition-all duration-300 w-full border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between min-h-[5rem] py-3">
        
        {/* Branding Logo / Title */}
        <a href="#" className="flex flex-col items-start group">
          <img src="/assets/logo.png" alt="DEEN LABS Logo" className="h-14 w-auto object-contain group-hover:scale-105 transition-transform duration-300" />
          <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold font-display mt-1.5 ml-1 select-none">Technology Lab</span>
        </a>

        {/* Desktop Navigation Items */}
        <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
          <a href="#deen-ai" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-900/50 border border-transparent hover:border-slate-800/60 transition-all duration-200">Deen-AI</a>
          <a href="#shadowplane" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-900/50 border border-transparent hover:border-slate-800/60 transition-all duration-200">ShadowPlane</a>
          <a href="#ihateats" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-900/50 border border-transparent hover:border-slate-800/60 transition-all duration-200">ihateATS</a>
          
          <MagneticButton as="a" href="#contact" className="ml-4 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-brand-gold to-[#ffd175] hover:from-[#c28424] hover:to-brand-gold rounded-lg shadow-lg shadow-amber-950/20 hover:shadow-amber-900/30 transition-all duration-200">
            Connect With Me
          </MagneticButton>
        </nav>

        {/* Mobile Menu Toggle Button */}
        <button id="mobile-menu-btn" className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all duration-200" aria-label="Toggle Navigation Menu" aria-expanded="false">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path id="menu-icon" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

      </div>
    </div>

    {/* Mobile Drawer Overlay Menu */}
    <div id="mobile-menu" className="hidden md:hidden bg-slate-950/98 border-b border-slate-900 backdrop-blur-xl transition-all duration-300 ease-in-out">
      <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
        <a href="#deen-ai" className="block px-4 py-3 text-base font-medium text-slate-300 hover:text-white hover:bg-slate-900/80 rounded-lg border-b border-slate-900">Deen-AI</a>
        <a href="#shadowplane" className="block px-4 py-3 text-base font-medium text-slate-300 hover:text-white hover:bg-slate-900/80 rounded-lg border-b border-slate-900">ShadowPlane</a>
        <a href="#ihateats" className="block px-4 py-3 text-base font-medium text-slate-300 hover:text-white hover:bg-slate-900/80 rounded-lg border-b border-slate-900">ihateATS</a>
        
        <MagneticButton as="a" href="#contact" className="block text-center mt-4 mx-4 py-3 text-sm font-semibold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-brand-gold to-[#ffd175] rounded-lg shadow-lg">
            Connect With Me
          </MagneticButton>
      </div>
    </div>
  </header>

  {/* ==========================================
       THE HERO SECTION
       ========================================== */}
  <section id="hero" className="relative pt-16 sm:pt-24 lg:pt-32 pb-20 lg:pb-32 overflow-hidden flex items-center">
    {/* Grid Overlay Graphics */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>
    
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        
        {/* Hero Information Column */}
        <div className="lg:col-span-7 flex flex-col text-left space-y-8">
          
          {/* Premium Micro-Badge */}
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-teal-500/10 to-amber-500/10 border border-teal-500/20 px-3.5 py-1.5 rounded-full w-fit animate-pulse-slow">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-accent"></span>
            </span>
            <span className="text-xs font-semibold tracking-wider uppercase text-teal-400 font-display">Enterprise Technology Lab</span>
          </div>

          {/* Bold Display Heading */}
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.08] text-white">
            I architect robust <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-accent via-teal-300 to-[#92e2d6]">cloud systems</span> and build <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-gold via-amber-300 to-[#ffeab8]">intelligent AI</span> products.
          </h1>

          {/* Descriptive Subtitle copy */}
          <p className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed">
            I am a Cloud & DevOps Architect bridging physical infrastructures, hybrid deployments, and advanced RAG-based AI applications to build reliable technology for scale.
          </p>

          {/* Core Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <MagneticButton as="a" href="#consulting" className="px-8 py-4 text-sm font-semibold uppercase tracking-wider text-center text-slate-950 bg-gradient-to-r from-brand-gold to-[#ffd175] hover:from-[#c28424] hover:to-brand-gold rounded-xl shadow-xl shadow-amber-950/20 hover:scale-[1.01] transition-all duration-200">Contact Me</MagneticButton>
            <a href="#products" className="px-8 py-4 text-sm font-semibold uppercase tracking-wider text-center text-white border border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/80 rounded-xl transition-all duration-200">
              Explore Our Lab Products
            </a>
          </div>

        </div>

        {/* Hero Visualization Column (Custom CSS Server Cluster nodes graphic) */}
        <div className="lg:col-span-5 flex justify-center items-center relative">
          {/* Ambient Glow backdrops */}
          <div className="absolute w-72 h-72 rounded-full bg-brand-accent/10 blur-[80px] -top-10 -left-10"></div>
          <div className="absolute w-72 h-72 rounded-full bg-brand-gold/10 blur-[80px] -bottom-10 -right-10"></div>

          {/* Graphic Container */}
          <div className="w-full max-w-md bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-sm relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
              <div className="flex space-x-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
              </div>
              <span className="text-xs font-mono text-slate-500 tracking-wider">deennode-cluster-01.local</span>
            </div>

            {/* Server Node Blocks */}
            <div className="space-y-4 font-mono text-xs text-slate-300">
              
              {/* Node 1 */}
              <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-lg flex items-center justify-between hover:border-teal-500/30 transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <i className="fa-solid fa-server text-teal-400 text-sm"></i>
                  <div>
                    <p className="font-bold text-white">DEEN-AI-RAG-01</p>
                    <p className="text-[10px] text-slate-500">FastAPI backend engine</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-400 animate-ping"></span>
                  <span className="text-teal-400 text-[10px] uppercase font-bold">Active</span>
                </div>
              </div>

              {/* Node 2 */}
              <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-lg flex items-center justify-between hover:border-indigo-500/30 transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <i className="fa-solid fa-file-pdf text-indigo-400 text-sm"></i>
                  <div>
                    <p className="font-bold text-white">RESUMELABS-CORE-02</p>
                    <p className="text-[10px] text-slate-500">Streamlit + pdflatex compiler</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                  <span className="text-indigo-400 text-[10px] uppercase font-bold">Idle</span>
                </div>
              </div>

              {/* Node 3 */}
              <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-lg flex items-center justify-between hover:border-amber-500/30 transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <i className="fa-solid fa-shield-halved text-brand-gold text-sm"></i>
                  <div>
                    <p className="font-bold text-white">DEV-CLOUDOPS-GATE</p>
                    <p className="text-[10px] text-slate-500">Reverse proxy & CDN firewall</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-gold animate-ping"></span>
                  <span className="text-brand-gold text-[10px] uppercase font-bold">Secure</span>
                </div>
              </div>

            </div>

            {/* Terminal Output Area */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3.5 mt-5 font-mono text-[10px] text-slate-400 leading-relaxed max-h-32 overflow-y-auto">
              <p className="text-teal-400">&gt; Booting Deen-Labs main orchestrator...</p>
              <p className="text-slate-500">[INFO] Connecting to postgres-pgvector.db.secure...</p>
              <p className="text-slate-500">[SUCCESS] Vector databases verified (Cosine limit: 0.15).</p>
              <p className="text-slate-500">[INFO] pdfLaTeX engine binary check: SUCCESS.</p>
              <p className="text-slate-500">[STATUS] All services cluster nodes reporting HEALTHY.</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  </section>

  {/* ==========================================
       THE PRODUCTS SECTION (Showcase Container)
       ========================================== */}
  <section id="products" className="py-24 border-t border-slate-900 bg-zinc-950/30 relative">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Section Heading */}
      <div className="text-center max-w-3xl mx-auto mb-20 flex flex-col items-center">
        <h2 className="inline-block font-display font-semibold text-xs tracking-widest text-brand-accent uppercase border border-teal-500/20 bg-teal-500/5 px-3.5 py-1.5 rounded-full mb-4">
          Proprietary Software Systems
        </h2>
        <h3 className="font-display font-bold text-3xl sm:text-4xl text-white">
          My Engineering Projects
        </h3>
        <p className="text-sm sm:text-base text-slate-400 mt-4 leading-relaxed">
          I construct specialized vertical applications utilizing strict RAG frameworks, high-speed semantic document optimizers, and automated code-compiling architectures.
        </p>
        <div className="w-16 h-1 bg-gradient-to-r from-brand-accent to-[#80c0a1] rounded-full mt-6"></div>
      </div>

      {/* Products List (Horizontal Rows) */}
      <div className="space-y-12">

        {/* ==========================================
             DEEN-AI PRODUCT SHOWCASE (Row 1)
             ========================================== */}
        <InteractiveProjectCard id="deen-ai"   className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 hover:border-teal-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-teal-950/10 group relative overflow-hidden">

          {/* Top subtle glow line */}
          <div className="absolute -top-6 sm:-top-8 -left-6 sm:-left-8 -right-6 sm:-right-8 h-[2px] bg-gradient-to-r from-brand-accent to-emerald-500"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Copy & Details */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              <div className="flex items-center space-x-3.5">
                <div className="h-12 w-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-brand-accent group-hover:scale-105 transition-transform">
                  <i className="fa-solid fa-kaaba text-lg"></i>
                </div>
                <div>
                  <h4 className="font-display font-bold text-xl sm:text-2xl text-white tracking-tight">Deen-AI Mobile App</h4>
                  <p className="text-xs text-slate-400">Islamic Practice Mobile App featuring built-in Imam AI</p>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Deen-AI is a context-aware Islamic mobile application featuring nearby masjid detection, digital prayer display sync, and <strong>Imam AI</strong>—the core chatbot assistant built directly into the app. Powered by the <strong>Google Gemini API</strong>, Imam AI prevents logical hallucinations and reference errors by utilizing a specialized Retrieval-Augmented Generation (RAG) pipeline. It queries and checks verified Islamic source records via the <strong>Internet Archive API</strong>, performing strict cross-reference validation before generating response texts.
              </p>

              {/* Tech badges */}
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">FastAPI</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Python</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Google Gemini API</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Internet Archive API</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Uvicorn</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">RAG Pipeline</span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <MagneticButton as="a" href="/assets/deen-app-beta.apk" download className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-center text-slate-950 bg-gradient-to-r from-[#fcd34d] to-[#fbbf24] hover:from-[#fbbf24] hover:to-[#f59e0b] rounded-xl shadow-lg shadow-amber-950/20 transition-all duration-200">
                  <i className="fa-solid fa-download mr-2"></i> Download App (Beta)
                </MagneticButton>
                <a href="https://github.com/Deen-Labs/Deen-AI" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-center text-white border border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/80 rounded-xl transition-all duration-200">
                  <i className="fa-brands fa-github mr-2"></i> Explore Codebase
                </a>
                <a href="#" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-center text-slate-400 hover:text-white border border-slate-800/40 hover:border-slate-800 bg-transparent rounded-xl transition-all duration-200">
                  Read Docs
                </a>
              </div>

              {/* Warning Disclaimer */}
              <div className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl max-w-xl">
                <i className="fa-solid fa-triangle-exclamation text-brand-gold mt-0.5 text-xs"></i>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  <strong>Notice:</strong> This application is currently in an active development phase. The built-in AI may generate incorrect or unverified responses. Please use it for testing purposes only.
                </p>
              </div>
            </div>

            {/* Right Column: Interactive Mockup */}
            <div className="lg:col-span-5">
              <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-4 sm:p-5 font-mono text-[10.5px] text-slate-300 leading-relaxed shadow-inner">
                <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-4">
                  <span className="text-teal-400 font-bold text-[10px] flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block animate-pulse"></span>
                    <span>IMAM-AI QUERY CONSOLE v1.0.0</span>
                  </span>
                  <span className="text-[9px] text-slate-500">RAG-STATUS: STRICT</span>
                </div>
                <div className="space-y-2">
                  <p><span className="text-slate-500">&gt; Input prompt:</span> What is the verse on prayers being at specified times?</p>
                  <p className="text-slate-500">[1] Querying Internet Archive API indexes for reference texts...</p>
                  <p className="text-emerald-400">[2] TEXT SEARCH RESULT: Surah An-Nisa (4:103) identified.</p>
                  <p className="text-slate-500">[3] Gemini API context compilation & validation: SUCCESS.</p>
                  <div className="bg-slate-900/60 p-2.5 rounded border border-slate-900 text-[11px] text-slate-200 mt-2 font-sans border-l-2 border-l-teal-500">
                    "Indeed, prayer has been decreed upon the believers a decree of specified times." 
                    <span className="block mt-1 text-[10px] font-mono font-bold text-teal-400">— Qur'an (4:103) [Source-Verified]</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        
</InteractiveProjectCard>

        {/* ==========================================
             SHADOWPLANE PRODUCT SHOWCASE (Row 3)
             ========================================== */}
                <InteractiveProjectCard id="shadowplane" className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 hover:border-blue-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-950/10 group relative overflow-hidden">
          {/* Top subtle glow line */}
          <div className="absolute -top-6 sm:-top-8 -left-6 sm:-left-8 -right-6 sm:-right-8 h-[2px] bg-gradient-to-r from-blue-500 to-cyan-400"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Copy & Details */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              <div className="flex items-center space-x-3.5">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                  <i className="fa-solid fa-shield-halved text-lg"></i>
                </div>
                <div>
                  <h4 className="font-display font-bold text-xl sm:text-2xl text-white tracking-tight">ShadowPlane</h4>
                  <p className="text-xs text-slate-400">Autonomous CI/CD Gatekeeper for Agentic DevOps</p>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                ShadowPlane is a deterministic, secure sandbox that intercepts AI-generated infrastructure code (Terraform) before it reaches production. It provisions the code inside an isolated <strong>LocalStack</strong> container. If the deployment fails, ShadowPlane's AI self-healing engine parses the logs, patches the <code>.tf</code> files, and safely retries. It strictly enforces system exit codes, ensuring your CI/CD runner knows exactly when it is safe to proceed.
              </p>

              {/* Tech badges */}
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Python</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Docker</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Terraform</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">LocalStack</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">GitHub Actions</span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <MagneticButton as="a" href="https://hub.docker.com/r/goldstealth/shadowplane" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-center text-slate-950 bg-gradient-to-r from-blue-400 to-cyan-400 hover:from-blue-500 hover:to-cyan-500 rounded-xl shadow-lg shadow-blue-950/20 transition-all duration-200">
                  <i className="fa-brands fa-docker mr-2"></i> View on Docker Hub
                </MagneticButton>
                <MagneticButton as="a" href="https://github.com/GOLDSTEALTH/ShadowPlane" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-center text-slate-400 hover:text-white border border-slate-800/40 hover:border-slate-800 bg-transparent rounded-xl transition-all duration-200">
                  <i className="fa-brands fa-github mr-2"></i> Explore Codebase
                </MagneticButton>
              </div>
            </div>

            {/* Right Column: Interactive Mockup */}
            <div className="lg:col-span-5">
              <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-4 sm:p-5 font-mono text-[10.5px] text-slate-300 leading-relaxed shadow-inner">
                <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-4">
                  <span className="text-blue-400 font-bold text-[10px] flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block animate-pulse"></span>
                    <span>SHADOWPLANE GATEKEEPER</span>
                  </span>
                  <span className="text-[9px] text-slate-500">ENV: SANDBOX</span>
                </div>
                <div className="space-y-2">
                  <p className="text-slate-500">&gt; target-dir: ./infra</p>
                  <p className="text-slate-500">[1] Initializing ephemeral LocalStack sandbox...</p>
                  <p className="text-red-400">[2] terraform apply FAILED: Invalid IAM Policy.</p>
                  <p className="text-blue-400">[3] AI Self-Healing Engine patching main.tf...</p>
                  <p className="text-emerald-400">[4] terraform apply SUCCESS. Infrastructure verified.</p>
                  <div className="bg-slate-900/60 p-2.5 rounded border border-slate-900 text-[11px] text-slate-200 mt-2 font-sans border-l-2 border-l-blue-500">
                    Gatekeeper passed. Blast radius contained.
                    <span className="block mt-1 text-[10px] font-mono font-bold text-blue-400">sys.exit(0)</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </InteractiveProjectCard>

        {/* ==========================================
             RESUMELABS PRODUCT SHOWCASE (Row 2)
             ========================================== */}
                <InteractiveProjectCard id="ihateats"   className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-950/10 group relative overflow-hidden">
          {/* Top subtle glow line */}
          <div className="absolute -top-6 sm:-top-8 -left-6 sm:-left-8 -right-6 sm:-right-8 h-[2px] bg-gradient-to-r from-indigo-500 to-violet-500"></div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Copy & Details */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              <div className="flex items-center space-x-3.5">
                <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                  <i className="fa-solid fa-file-invoice text-lg"></i>
                </div>
                <div>
                  <h4 className="font-display font-bold text-xl sm:text-2xl text-white tracking-tight">ihateATS</h4>
                  <p className="text-xs text-slate-400">AI-powered, 100% free ATS resume builder</p>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                ihateATS transforms your rough notes, old resumes, or LinkedIn profiles into recruiter-tested, ATS-optimized resumes instantly. Powered by my proprietary <strong>Lab Engine AI</strong>, it features a Target Job Matcher that analyzes job descriptions, and a Live Preview Editor with one-click PDF generation via <strong>React-PDF</strong>—no LaTeX installation required.
              </p>

              {/* Tech badges */}
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Next.js 16</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">TypeScript</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Tailwind CSS</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Google Gemini</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">React-PDF</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Zod</span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <MagneticButton as="a" href="https://ihateats.deenlabs.tech/" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-center text-slate-950 bg-gradient-to-r from-indigo-400 to-violet-500 hover:from-indigo-500 hover:to-violet-600 rounded-xl shadow-lg shadow-indigo-950/20 transition-all duration-200">
                  <i className="fa-solid fa-rocket mr-2"></i> Launch Application
                </MagneticButton>
                <MagneticButton as="a" href="https://github.com/Deen-Labs/ihateATS" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-center text-slate-400 hover:text-white border border-slate-800/40 hover:border-slate-800 bg-transparent rounded-xl transition-all duration-200">
                  <i className="fa-brands fa-github mr-2"></i> View Codebase
                </MagneticButton>
              </div>
            </div>

            {/* Right Column: Interactive Mockup */}
            <div className="lg:col-span-5">
              <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-4 sm:p-5 shadow-inner flex flex-col sm:flex-row gap-4 justify-between">
                
                {/* Left Visual Score gauge dial */}
                <div className="flex flex-col items-center justify-center p-3 border border-slate-800 bg-slate-900/20 rounded-lg text-center flex-1">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono mb-2">ATS Score</span>
                  <div className="relative flex items-center justify-center h-16 w-16">
                    <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 36 36">
                      <path className="text-slate-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-teal-400" strokeDasharray="95, 100" strokeWidth="3.2" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <span className="font-display font-bold text-base text-white">95%</span>
                  </div>
                  <span className="text-[10px] text-teal-400 font-mono mt-2 uppercase font-bold">ATS Optimal</span>
                </div>

                {/* Right Visual React-PDF compilation panel */}
                <div className="flex-2 flex flex-col justify-center space-y-2 font-mono text-[9px] text-slate-400 border-l border-slate-900 sm:pl-4">
                  <p className="text-indigo-400">&gt; LabEngine.matchJob()</p>
                  <div className="text-slate-300">
                    <span className="text-red-400 line-through">"did database tuning"</span> 
                    <span className="text-green-400 block font-bold">&gt; "Architected PostgreSQL cluster."</span>
                  </div>
                  <div className="flex items-center space-x-2 pt-1 border-t border-slate-900 mt-2">
                    <i className="fa-solid fa-circle-check text-green-400"></i>
                    <span className="text-[8px] uppercase tracking-wider text-slate-500">React-PDF: SUCCESS</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </InteractiveProjectCard>

      </div>
    </div>
  </section>

  {/* ==========================================
       THE CONSULTING & INFRASTRUCTURE SECTION
       ========================================== */}
  <section id="consulting" className="py-24 border-t border-slate-900 relative">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-800/50 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        
        {/* Left Side: Copy details */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              <h2 className="inline-block font-display font-semibold text-xs tracking-widest text-brand-gold uppercase border border-amber-500/20 bg-amber-500/5 px-3.5 py-1.5 rounded-full w-fit">
                DevOps & Platform Engineering
              </h2>
              <h3 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight">
                Architecting Resilient CI/CD & Cloud Infrastructure
              </h3>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              I am a Multi-Cloud & DevOps Engineer who builds resilient, automated cloud infrastructure. Beyond provisioning backend environments, my full-stack background allows me to build custom developer tools, agentic sandboxes like ShadowPlane, and deployment pipelines from the ground up. I extend this architectural control to the client side, engineering native Android applications with complete end-to-end backend integration.
            </p>
    
              {/* Key Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                
                <motion.div 
                  whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(226, 162, 59, 0.15)" }} 
                  className="flex items-start space-x-3.5 p-3 rounded-xl border border-transparent hover:border-amber-500/20 hover:bg-slate-900/50 transition-colors cursor-none"
                >
                  <div className="h-10 w-10 shrink-0 bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-brand-gold rounded-lg">
                    <i className="fa-solid fa-code-commit text-sm"></i>
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-white">Infrastructure as Code</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Using Terraform & CloudFormation to build declarative, version-controlled environments.</p>
                  </div>
                </motion.div>
    
                <motion.div 
                  whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(226, 162, 59, 0.15)" }} 
                  className="flex items-start space-x-3.5 p-3 rounded-xl border border-transparent hover:border-amber-500/20 hover:bg-slate-900/50 transition-colors cursor-none"
                >
                  <div className="h-10 w-10 shrink-0 bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-brand-gold rounded-lg">
                    <i className="fa-solid fa-rotate text-sm"></i>
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-white">CI/CD Pipeline Automation</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Engineering GitHub Actions & GitOps pipelines for secure, automated releases.</p>
                  </div>
                </motion.div>
    
                <motion.div 
                  whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(30, 143, 130, 0.15)" }} 
                  className="flex items-start space-x-3.5 p-3 rounded-xl border border-transparent hover:border-teal-500/20 hover:bg-slate-900/50 transition-colors cursor-none"
                >
                  <div className="h-10 w-10 shrink-0 bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 rounded-lg">
                    <i className="fa-solid fa-cubes text-sm"></i>
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-white">Container Orchestration</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Managing Dockerized microservices and highly available cluster deployments.</p>
                  </div>
                </motion.div>
    
                <motion.div 
                  whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(59, 130, 246, 0.15)" }} 
                  className="flex items-start space-x-3.5 p-3 rounded-xl border border-transparent hover:border-blue-500/20 hover:bg-slate-900/50 transition-colors cursor-none"
                >
                  <div className="h-10 w-10 shrink-0 bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 rounded-lg">
                    <i className="fa-solid fa-code text-sm"></i>
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-white">Full-Stack Engineering</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Developing end-to-end applications (Next.js, AI integration) to bridge software and infrastructure.</p>
                  </div>
                </motion.div>
    
              </div>
            </div>
            
            {/* Right Side: Structured Team Info */}
        <div className="lg:col-span-5 flex justify-center items-center">
          <div className="w-full max-w-[420px] bg-slate-950/60 border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
            {/* Glow background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-b from-brand-gold/10 to-transparent blur-[60px] rounded-full pointer-events-none -z-10"></div>
            
            <div className="flex items-center justify-between mb-6 border-b border-slate-800/60 pb-4">
              <h4 className="font-display font-bold text-xl text-white">About Me</h4>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-900 px-2 py-1 rounded">Core Team</span>
            </div>
            
            <div className="space-y-4">
              
              {/* Team Member 1 */}
              <div className="group relative p-6 sm:p-8 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 hover:border-amber-500/40 rounded-2xl transition-all duration-300 overflow-hidden cursor-none">
                  {/* Background Hover Glow */}
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-all duration-1000 ease-in-out pointer-events-none"></div>
                  
                  <div className="flex flex-col items-center text-center relative z-10">
                    
                    {/* Enlarged Avatar Placeholder */}
                    <div className="h-24 w-24 mb-4 shrink-0 rounded-full bg-slate-900 flex items-center justify-center shadow-lg border-4 border-slate-900/50 overflow-hidden group-hover:scale-105 group-hover:shadow-amber-500/20 transition-all duration-300">
                      <img src="/assets/profile.jpg" alt="Syed Aamair" className="w-full h-full object-cover object-top" />
                    </div>
                    
                    <div className="flex-1 w-full">
                      <h5 className="font-bold text-lg sm:text-xl text-white group-hover:text-amber-300 transition-colors tracking-tight">Syed Aamair Shareef Ahmed</h5>
                      <p className="text-[11px] sm:text-xs text-brand-gold font-medium mt-1.5 uppercase tracking-wide">DevOps & Platform Engineer</p>
                        
                        
                      
                      {/* Interactive Action Buttons with Individual Glows */}
                        <div className="mt-6 flex flex-col gap-3 w-full sm:max-w-[340px] mx-auto">
                          
                          {/* Resume Button */}
                          <a href="/assets/resume.pdf" download className="inline-flex items-center justify-center w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-gold to-[#ffd175] hover:from-[#c28424] hover:to-brand-gold border border-amber-500/30 text-sm text-slate-950 font-bold transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(226,162,59,0.5)] cursor-none relative z-20">
                            <i className="fa-solid fa-file-pdf text-lg mr-2.5"></i> Download Resume
                          </a>
                          
                          {/* Social Row */}
                          <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                            <a href="https://linkedin.com/in/syed-aamair" target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex justify-center items-center px-4 py-2.5 rounded-xl bg-[#0a66c2]/10 hover:bg-[#0a66c2]/20 border border-[#0a66c2]/30 text-sm text-[#0a66c2] font-semibold transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_0_20px_rgba(10,102,194,0.6)] cursor-none relative z-20">
                              <i className="fa-brands fa-linkedin text-lg mr-2"></i> syed-aamair
                            </a>
                            <a href="https://github.com/GOLDSTEALTH" target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex justify-center items-center px-4 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 text-sm text-slate-300 font-semibold transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-none relative z-20">
                              <i className="fa-brands fa-github text-lg mr-2"></i> GOLDSTEALTH
                            </a>
                          </div>
                        </div>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  </section>

  {/* ==========================================
       CONTACT / FOOTER SECTION
       ========================================== */}
  <section id="contact" className="py-20 bg-slate-950 border-t border-slate-900 mt-auto relative">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        
        {/* Left: Quick Contact Info */}
        <div className="md:col-span-6 flex flex-col space-y-6">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
            Partner With Me
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md">
            Whether you need bare-metal architecture deployment, optimized database indexing limits, or robust generative AI models, I can assist. Get in touch to schedule a custom technology consult.
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-slate-300">
              <i className="fa-solid fa-envelope text-brand-gold"></i>
              <a href="mailto:syedaamairshareef@gmail.com" className="text-sm hover:underline hover:text-white transition-colors">syedaamairshareef@gmail.com</a>
            </div>
            <div className="flex items-center space-x-3 text-slate-300">
              <i className="fa-solid fa-location-dot text-brand-gold"></i>
              <span className="text-sm">Hyderabad, Telangana, India</span>
            </div>
          </div>
        </div>

        {/* Right: Professional Contact Form Panel */}
        <div className="md:col-span-6">
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <form id="contact-form" className="space-y-4" onSubmit={handleFormSubmit}>
              <div>
                <label htmlFor="contact-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Your Name</label>
                <input id="contact-name" name="name" type="text" placeholder="John Doe" required className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-accent transition-colors" />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Email Address</label>
                <input id="contact-email" name="email" type="email" placeholder="john@company.com" required className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-accent transition-colors" />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Brief Message</label>
                <textarea id="contact-message" name="message" rows="3" placeholder="Tell me about your infrastructure or AI needs..." required className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-accent transition-colors resize-none"></textarea>
              </div>
              <button 
                type="submit" 
                disabled={formState.status === 'submitting'}
                className={`w-full py-3 text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg transition-all duration-200 ${
                  formState.status === 'success' 
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white' 
                    : 'text-slate-950 bg-gradient-to-r from-brand-gold to-[#ffd175] hover:from-[#c28424] hover:to-brand-gold'
                }`}
              >
                {formState.status === 'submitting' ? (
                  <span><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Sending...</span>
                ) : formState.status === 'success' ? (
                  <span><i className="fa-solid fa-check mr-2"></i> Message Sent!</span>
                ) : (
                  'Submit Consultation Request'
                )}
              </button>
              {formState.status === 'error' && (
                <p className="text-xs text-red-400 text-center mt-2">Failed to send message. Please try again.</p>
              )}
            </form>
          </div>
        </div>

      </div>

      {/* Copyright Area */}
      <div className="mt-16 pt-8 border-t border-slate-900/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
        <p>&copy; 2026 Syed Aamair. All rights reserved. Building mindful, scalable systems.</p>
        <div className="flex items-center space-x-6 mt-4 sm:mt-0">
          <a href="https://linkedin.com/in/syed-aamair" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-[#0a66c2] transition-colors">
              <i className="fa-brands fa-linkedin text-[14px]"></i> 
              <span>LinkedIn</span>
            </a>
            <a href="https://github.com/GOLDSTEALTH" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-slate-300 transition-colors">
              <i className="fa-brands fa-github text-[14px]"></i> 
              <span>GitHub</span>
            </a>
          <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
        </div>
      </div>

    </div>
  </section>

  {/* ==========================================
       MOBILE NAV DRAWER OPEN/CLOSE JAVASCRIPT
       ========================================== */}
  
</div>
        </>
      </div>
    </CursorProvider>
  );
}






