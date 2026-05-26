import { useState, useCallback } from 'react';

export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

// Temporary mock backend URL - Replace with actual local network IP when running physical device
const BACKEND_URL = 'http://10.0.2.2:8000'; // Default Android emulator localhost

export function useChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "welcome",
            text: "As-salamu alaykum! I am your Deen AI Assistant. Ask me a question about Islam.",
            sender: "ai",
            timestamp: new Date()
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim()) return;

        // Add user message immediately
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            text,
            sender: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setIsTyping(true);

        try {
            // Try to connect to backend
            const response = await fetch(`${BACKEND_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: text }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            const aiResponse: ChatMessage = {
                id: (Date.now() + 1).toString(),
                text: data.response,
                sender: "ai",
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, aiResponse]);
        } catch (error) {
            console.error("Error connecting to AI backend:", error);

            // Fallback response if backend is unreachable
            const fallbackResponse: ChatMessage = {
                id: (Date.now() + 1).toString(),
                text: "I am unable to reach the knowledge base right now. Please ensure the backend server is running.",
                sender: "ai",
                timestamp: new Date()
            };
            setMessages((prev) => [...prev, fallbackResponse]);
        } finally {
            setIsTyping(false);
        }
    }, []);

    return {
        messages,
        isTyping,
        sendMessage
    };
}
