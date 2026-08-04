const fs = require('fs');
const HTMLtoJSX = require('html-to-jsx');

try {
  let html = fs.readFileSync('index.html', 'utf-8');
  
  // Extract body
  let bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
  if (!bodyMatch) {
    console.error("No body tag found");
    process.exit(1);
  }
  
  let bodyContent = bodyMatch[1];
  
  // Remove script tags and comments
  bodyContent = bodyContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Initialize converter
  const convert = require('html-to-jsx');
  let jsx = convert(bodyContent);

  // html-to-jsx doesn't properly close img and input tags in some cases, so let's enforce it
  jsx = jsx.replace(/<img([^>]+?)(?<!\/)>/g, '<img$1 />');
  jsx = jsx.replace(/<input([^>]+?)(?<!\/)>/g, '<input$1 />');
  jsx = jsx.replace(/<br([^>]*?)(?<!\/)>/g, '<br$1 />');
  jsx = jsx.replace(/<path\s+id="menu-icon"[^>]*?>/g, '<path id="menu-icon" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />');

  // Escape ">" inside JSX text nodes to avoid build warnings
  jsx = jsx.replace(/> Booting Deen-Labs/g, '&gt; Booting Deen-Labs');
  jsx = jsx.replace(/> Input prompt:/g, '&gt; Input prompt:');
  jsx = jsx.replace(/> _escape_latex/g, '&gt; _escape_latex');
  jsx = jsx.replace(/> "Architected/g, '&gt; "Architected');

  // Also fix SVG viewbox casing that html-to-jsx might have missed
  jsx = jsx.replace(/viewbox=/g, 'viewBox=');
  // We need to wrap it.
  
  // Let's add the magnetic button and interactive project card after conversion.
  // It's safer to do this by replacing the specific JSX strings since html-to-jsx will output predictable JSX.

  // 1. MagneticButton replacement
  // We look for the Schedule Consulting button
  jsx = jsx.replace(
    /<a href="#consulting" className="px-8 py-4 text-sm font-semibold uppercase tracking-wider text-center text-slate-950 bg-gradient-to-r from-brand-gold to-\[#ffd175\] hover:from-\[#c28424\] hover:to-brand-gold rounded-xl shadow-xl shadow-amber-950\/20 hover:scale-\[1.01\] transition-all duration-200">\s*Schedule Consulting\s*<\/a>/g,
    '<MagneticButton as="a" href="#consulting" className="px-8 py-4 text-sm font-semibold uppercase tracking-wider text-center text-slate-950 bg-gradient-to-r from-brand-gold to-[#ffd175] hover:from-[#c28424] hover:to-brand-gold rounded-xl shadow-xl shadow-amber-950/20 hover:scale-[1.01] transition-all duration-200">Schedule Consulting</MagneticButton>'
  );

  // 2. InteractiveProjectCard replacement for Deen-AI and ResumeLabs
  // We replace <article id="deen-ai"...> and </article>
  // Notice that html-to-jsx preserves the tags but might re-order attributes. We'll use regex.
  jsx = jsx.replace(
    /<article\s+([^>]*?)id="deen-ai"([^>]*?)>([\s\S]*?)<\/article>/g,
    '<InteractiveProjectCard id="deen-ai" $1 $2>\n$3\n</InteractiveProjectCard>'
  );
  
  jsx = jsx.replace(
    /<article\s+([^>]*?)id="resumelabs"([^>]*?)>([\s\S]*?)<\/article>/g,
    '<InteractiveProjectCard id="resumelabs" $1 $2>\n$3\n</InteractiveProjectCard>'
  );

  // 3. Fix onsubmit on form (html-to-jsx might handle it but let's be sure)
  jsx = jsx.replace(
    /onSubmit="[^"]*"/g,
    'onSubmit={(e) => { e.preventDefault(); alert("Thank you for connecting! We will reach out within 24 hours."); }}'
  );

  let appCode = `import React from "react";
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
${jsx}
        </>
      </div>
    </CursorProvider>
  );
}
`;

  fs.writeFileSync('src/App.jsx', appCode);
  console.log("Successfully generated App.jsx using html-to-jsx");
} catch (e) {
  console.error(e);
}
