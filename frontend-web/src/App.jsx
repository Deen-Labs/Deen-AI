import React from "react";
import { CursorProvider } from "./context/CursorContext";
import RotatedSquareCursor from "./components/RotatedSquareCursor";
import MagneticButton from "./components/MagneticButton";
import InteractiveProjectCard from "./components/InteractiveProjectCard";

export default function App() {
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
          <a href="#resumelabs" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-900/50 border border-transparent hover:border-slate-800/60 transition-all duration-200">ResumeLabs</a>
          
          <MagneticButton as="a" href="#contact" className="ml-4 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-brand-gold to-[#ffd175] hover:from-[#c28424] hover:to-brand-gold rounded-lg shadow-lg shadow-amber-950/20 hover:shadow-amber-900/30 transition-all duration-200">
            Connect With Us
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
        <a href="#resumelabs" className="block px-4 py-3 text-base font-medium text-slate-300 hover:text-white hover:bg-slate-900/80 rounded-lg border-b border-slate-900">ResumeLabs</a>
        
        <MagneticButton as="a" href="#contact" className="block text-center mt-4 mx-4 py-3 text-sm font-semibold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-brand-gold to-[#ffd175] rounded-lg shadow-lg">
          Connect With Us
        </MagneticButton>
      </div>
    </div>
  </header>

  {/* ==========================================
       THE HERO SECTION
       ========================================== */}
  <section id="hero" className="relative pt-10 pb-20 lg:pt-12 lg:pb-32 overflow-hidden flex items-center">
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
            We architect robust <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-accent via-teal-300 to-[#92e2d6]">cloud systems</span> and build <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-gold via-amber-300 to-[#ffeab8]">intelligent AI</span> products.
          </h1>

          {/* Descriptive Subtitle copy */}
          <p className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed">
            Deen-Labs is a premium engineering lab and IT consulting partner. We bridge physical infrastructures, hybrid deployments, and advanced RAG-based AI applications to build reliable technology for scale.
          </p>

          {/* Core Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <MagneticButton as="a" href="#consulting" className="px-8 py-4 text-sm font-semibold uppercase tracking-wider text-center text-slate-950 bg-gradient-to-r from-brand-gold to-[#ffd175] hover:from-[#c28424] hover:to-brand-gold rounded-xl shadow-xl shadow-amber-950/20 hover:scale-[1.01] transition-all duration-200">Schedule Consulting</MagneticButton>
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
          Our Advanced AI Software Lab
        </h3>
        <p className="text-sm sm:text-base text-slate-400 mt-4 leading-relaxed">
          We construct specialized vertical applications utilizing strict RAG frameworks, high-speed semantic document optimizers, and automated code-compiling architectures.
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
          <div className="absolute -top-4 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-accent to-emerald-500"></div>
          
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
        <InteractiveProjectCard id="shadowplane" className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 hover:border-amber-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-950/10 group relative overflow-hidden">
          {/* Top subtle glow line */}
          <div className="absolute -top-4 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 to-amber-400"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Copy & Details */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              <div className="flex items-center space-x-3.5">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
                  <i className="fa-solid fa-cloud-bolt text-lg"></i>
                </div>
                <div>
                  <h4 className="font-display font-bold text-xl sm:text-2xl text-white tracking-tight">ShadowPlane</h4>
                  <p className="text-xs text-slate-400">Local Terraform Sandbox Gateway</p>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                ShadowPlane is a high-speed Model Context Protocol (MCP) server that instantly provisions isolated AWS LocalStack environments. It intercepts standard Terraform deployments, rewrites endpoint bindings dynamically, and securely boots containerized sandbox architectures—allowing LLMs to safely provision, test, and destroy cloud infrastructure entirely offline.
              </p>

              {/* Tech badges */}
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">FastMCP</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Terraform</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Python</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Docker</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">LocalStack</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">AWS</span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <MagneticButton as="a" href="https://github.com/Deen-Labs/ShadowPlane" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-center text-slate-950 bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 rounded-xl shadow-lg shadow-orange-950/20 transition-all duration-200">
                  <i className="fa-solid fa-play mr-2"></i> Execute Terraform
                </MagneticButton>
                <a href="#" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-center text-slate-400 hover:text-white border border-slate-800/40 hover:border-slate-800 bg-transparent rounded-xl transition-all duration-200">
                  Explore Architecture
                </a>
              </div>
            </div>

            {/* Right Column: Interactive Mockup */}
            <div className="lg:col-span-5">
              <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-4 sm:p-5 font-mono text-[9px] text-slate-300 leading-relaxed shadow-inner">
                <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-4">
                  <span className="text-orange-400 font-bold text-[10px] flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block animate-pulse"></span>
                    <span>SHADOWPLANE MCP RUNTIME</span>
                  </span>
                  <span className="text-[9px] text-slate-500">STATUS: READY</span>
                </div>
                <div className="space-y-2">
                  <p><span className="text-slate-500">&gt; mcp.call_tool("clone_and_deploy", {"{"}"dir": "./demo-infra"{"}"})</span></p>
                  <p className="text-slate-500">[INFO] Starting stopped container 'localstack-shadowplane'</p>
                  <p className="text-emerald-400">[INFO] LocalStack port 4566 is ready!</p>
                  <p className="text-emerald-400">[SUCCESS] terraform apply -auto-approve completed.</p>
                  
                  <p className="mt-3"><span className="text-slate-500">&gt; mcp.call_tool("read_sandbox_logs", "latest")</span></p>
                  <div className="bg-slate-900/60 p-2.5 rounded border border-slate-900 text-[10px] text-slate-300 mt-2 font-mono border-l-2 border-l-orange-500">
                    Apply complete! Resources: 14 added, 0 changed, 0 destroyed.
                    <span className="block mt-2 text-slate-500">Outputs:</span>
                    <span className="block text-amber-400">api_endpoint = "http://localhost:4566/restapis/..."</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </InteractiveProjectCard>

        {/* ==========================================
             RESUMELABS PRODUCT SHOWCASE (Row 2)
             ========================================== */}
        <InteractiveProjectCard id="resumelabs"   className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-950/10 group relative overflow-hidden">

          {/* Top subtle glow line */}
          <div className="absolute -top-4 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 to-violet-500"></div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Copy & Details */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              <div className="flex items-center space-x-3.5">
                <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                  <i className="fa-solid fa-file-invoice text-lg"></i>
                </div>
                <div>
                  <h4 className="font-display font-bold text-xl sm:text-2xl text-white tracking-tight">ResumeLabs</h4>
                  <p className="text-xs text-slate-400">ATS Resume Architect</p>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Applicant Tracking System (ATS) parsers reject over 75% of qualified engineering applications due to multi-column graphics, parsing timeouts, and weak descriptions. ResumeLabs resolves this by processing raw, conversational resumes via <strong>Semantic Gemini AI</strong> to rewrite passive phrasing and quantify bullet points. The system then automatically formats the resume into an ATS-optimal LaTeX template, compiling it in the background using <code className="text-xs text-indigo-400 font-mono">pdflatex</code> into a highly machine-readable PDF.
              </p>

              {/* Tech badges */}
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Streamlit</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Google Gemini</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Python</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">pdflatex</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Plotly</span>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-950/70 border border-slate-800 text-slate-300 rounded-md">Pydantic</span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <MagneticButton as="a" href="https://resumelabs.streamlit.app/" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-center text-slate-950 bg-gradient-to-r from-indigo-400 to-violet-500 hover:from-indigo-500 hover:to-violet-600 rounded-xl shadow-lg shadow-indigo-950/20 transition-all duration-200">
                  <i className="fa-solid fa-rocket mr-2"></i> Launch Application
                </MagneticButton>
                <a href="#" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-center text-slate-400 hover:text-white border border-slate-800/40 hover:border-slate-800 bg-transparent rounded-xl transition-all duration-200">
                  View Architecture
                </a>
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
                      <path className="text-slate-800" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-teal-400" stroke-dasharray="95, 100" stroke-width="3.2" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <span className="font-display font-bold text-base text-white">95%</span>
                  </div>
                  <span className="text-[10px] text-teal-400 font-mono mt-2 uppercase font-bold">ATS Optimal</span>
                </div>

                {/* Right Visual LaTeX compilation panel */}
                <div className="flex-2 flex flex-col justify-center space-y-2 font-mono text-[9px] text-slate-400 border-l border-slate-900 sm:pl-4">
                  <p className="text-indigo-400">&gt; _escape_latex(data.summary)</p>
                  <div className="text-slate-300">
                    <span className="text-red-400 line-through">"did database tuning"</span> 
                    <span className="text-green-400 block font-bold">&gt; "Architected high-availability PostgreSQL cluster."</span>
                  </div>
                  <div className="flex items-center space-x-2 pt-1 border-t border-slate-900 mt-2">
                    <i className="fa-solid fa-circle-check text-green-400"></i>
                    <span className="text-[8px] uppercase tracking-wider text-slate-500">pdflatex: SUCCESS</span>
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
            DevOps & Infrastructure
          </h2>
          <h3 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight">
            Physical-to-Cloud Infrastructure Engineering & Support
          </h3>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Deen-Labs specializes in commissioning physical server rack environments and compiling automated migrations to premium public and hybrid clouds. We audit and manage secure networking protocols, virtualization containers, and robust database replication layers, ensuring 24/7 reliability for your company.
          </p>

          {/* Key Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            
            <div className="flex items-start space-x-3.5">
              <div className="h-10 w-10 shrink-0 bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-brand-gold rounded-lg">
                <i className="fa-solid fa-network-wired text-sm"></i>
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-white">Hybrid Cloud & GitOps</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Automating zero-downtime CI/CD container deployments and monitoring.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <div className="h-10 w-10 shrink-0 bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-brand-gold rounded-lg">
                <i className="fa-solid fa-toolbox text-sm"></i>
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-white">Bare Metal Server setups</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Provisioning hardware, routing, firewalls, and local server storage partitions.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <div className="h-10 w-10 shrink-0 bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-brand-gold rounded-lg">
                <i className="fa-solid fa-database text-sm"></i>
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-white">Relational Scale & Security</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Setting up pgvector matching limits, SSL, and data replication matrices.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <div className="h-10 w-10 shrink-0 bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-brand-gold rounded-lg">
                <i className="fa-solid fa-headset text-sm"></i>
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-white">Enterprise IT Support</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Regular patching cycles, proactive scaling audits, and backup verification.</p>
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Structured Team Info */}
        <div className="lg:col-span-5 flex justify-center items-center">
          <div className="w-full max-w-[420px] bg-slate-950/60 border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
            {/* Glow background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-b from-brand-gold/10 to-transparent blur-[60px] rounded-full pointer-events-none -z-10"></div>
            
            <div className="flex items-center justify-between mb-6 border-b border-slate-800/60 pb-4">
              <h4 className="font-display font-bold text-xl text-white">Lab Leadership</h4>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-900 px-2 py-1 rounded">Core Team</span>
            </div>
            
            <div className="space-y-4">
              
              {/* Team Member 1 */}
              <a href="https://github.com/GOLDSTEALTH" target="_blank" className="group block relative p-4 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 hover:border-amber-500/40 rounded-2xl transition-all duration-300 overflow-hidden cursor-none">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out pointer-events-none"></div>
                <div className="flex items-center space-x-4 relative z-10">
                  <div className="h-14 w-14 shrink-0 rounded-full bg-gradient-to-tr from-brand-gold to-yellow-300 flex items-center justify-center text-slate-950 font-bold font-display text-lg shadow-lg group-hover:scale-110 group-hover:rotate-[5deg] transition-transform duration-300">
                    SA
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-base text-white group-hover:text-amber-300 transition-colors tracking-tight">Syed Aamair Shareef Ahmed</h5>
                    <p className="text-[11px] text-brand-gold font-medium mb-1.5 uppercase tracking-wide">Founder &middot; Cloud Architect</p>
                    <span className="inline-flex items-center px-2.5 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono group-hover:border-amber-500/30 group-hover:text-amber-200 transition-colors">
                      <i className="fa-brands fa-github text-sm mr-1.5 text-amber-500/70 group-hover:text-amber-400"></i> @GOLDSTEALTH
                    </span>
                  </div>
                  <div className="text-slate-600 group-hover:text-amber-400 transition-transform duration-300 transform group-hover:translate-x-1 group-hover:-translate-y-1">
                    <i className="fa-solid fa-arrow-up-right-from-square text-sm"></i>
                  </div>
                </div>
              </a>

              {/* Team Member 2 */}
              <a href="https://github.com/mr-sf-khan" target="_blank" className="group block relative p-4 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 hover:border-teal-500/40 rounded-2xl transition-all duration-300 overflow-hidden cursor-none">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out pointer-events-none"></div>
                <div className="flex items-center space-x-4 relative z-10">
                  <div className="h-14 w-14 shrink-0 rounded-full bg-gradient-to-tr from-teal-500 to-[#80c0a1] flex items-center justify-center text-slate-950 font-bold font-display text-lg shadow-lg group-hover:scale-110 group-hover:rotate-[5deg] transition-transform duration-300">
                    SK
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-base text-white group-hover:text-teal-300 transition-colors tracking-tight">Sadiq Khan</h5>
                    <p className="text-[11px] text-teal-400 font-medium mb-1.5 uppercase tracking-wide">Co-founder &middot; Web Architect</p>
                    <span className="inline-flex items-center px-2.5 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono group-hover:border-teal-500/30 group-hover:text-teal-200 transition-colors">
                      <i className="fa-brands fa-github text-sm mr-1.5 text-teal-500/70 group-hover:text-teal-400"></i> @mr-sf-khan
                    </span>
                  </div>
                  <div className="text-slate-600 group-hover:text-teal-400 transition-transform duration-300 transform group-hover:translate-x-1 group-hover:-translate-y-1">
                    <i className="fa-solid fa-arrow-up-right-from-square text-sm"></i>
                  </div>
                </div>
              </a>



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
            Partner With Deen-Labs
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md">
            Whether you need bare-metal architecture deployment, optimized database indexing limits, or robust generative AI models, we can assist. Get in touch to schedule a custom technology consult.
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
            <form id="contact-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Thank you for connecting! We will reach out within 24 hours.'); }}>
              <div>
                <label htmlFor="contact-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Your Name</label>
                <input id="contact-name" type="text" placeholder="John Doe" required className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-accent transition-colors" />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Email Address</label>
                <input id="contact-email" type="email" placeholder="john@company.com" required className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-accent transition-colors" />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Brief Message</label>
                <textarea id="contact-message" rows="3" placeholder="Tell us about your infrastructure or AI needs..." required className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-accent transition-colors resize-none"></textarea>
              </div>
              <button type="submit" className="w-full py-3 text-xs font-bold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-brand-gold to-[#ffd175] hover:from-[#c28424] hover:to-brand-gold rounded-lg shadow-lg transition-all duration-200">
                Submit Consultation Request
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Copyright Area */}
      <div className="mt-16 pt-8 border-t border-slate-900/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
        <p>&copy; 2026 Deen-Labs. All rights reserved. Building mindful, scalable systems.</p>
        <div className="flex space-x-6 mt-4 sm:mt-0">
          <a href="https://github.com/Deen-Labs" className="hover:text-slate-300 transition-colors"><i className="fa-brands fa-github text-sm"></i> GitHub</a>
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






