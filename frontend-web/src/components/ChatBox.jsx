import React, { useState } from "react";
import SectionTitle from "./SectionTitle.jsx";

export default function ChatBox() {
  const [messages, setMessages] = useState([
    { role: "ai", content: "As-salamu alaykum! I am Deen A.I. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, { role: "ai", content: data.answer }]);
      } else {
        setMessages(prev => [...prev, { role: "ai", content: "Sorry, I encountered an error: " + data.error }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "ai", content: "Sorry, I could not reach the server. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="section" id="ai-chat" style={{ background: "var(--color-surface)", padding: "4rem 1.5rem" }}>
      <div className="wrapper" style={{ maxWidth: "800px", margin: "0 auto" }}>
        <SectionTitle text="Ask Deen A.I." />
        <div style={{
          backgroundColor: "var(--color-bg)",
          borderRadius: "16px",
          border: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          height: "500px",
          overflow: "hidden"
        }}>
          
          <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                backgroundColor: msg.role === "user" ? "var(--color-primary)" : "var(--color-surface)",
                color: msg.role === "user" ? "var(--color-bg)" : "var(--color-text)",
                padding: "1rem 1.5rem",
                borderRadius: "16px",
                borderBottomRightRadius: msg.role === "user" ? "4px" : "16px",
                borderBottomLeftRadius: msg.role === "ai" ? "4px" : "16px",
                maxWidth: "80%",
                border: msg.role === "ai" ? "1px solid var(--color-border)" : "none",
                lineHeight: "1.5"
              }}>
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div style={{ alignSelf: "flex-start", padding: "1rem" }}>
                <span className="badge__dot" aria-hidden="true" style={{ animation: "pulse 1s infinite" }}></span>
                <span style={{marginLeft: "8px", color: "var(--color-text-muted)"}}>Thinking...</span>
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} style={{ 
            display: "flex", 
            padding: "1rem", 
            borderTop: "1px solid var(--color-border)",
            backgroundColor: "var(--color-surface)",
            gap: "0.5rem"
          }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about Islam..."
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                outline: "none"
              }}
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="button"
              style={{ padding: "0.75rem 1.5rem", borderRadius: "8px", opacity: isLoading || !input.trim() ? 0.5 : 1 }}
            >
              Send
            </button>
          </form>

        </div>
      </div>
    </section>
  );
}
