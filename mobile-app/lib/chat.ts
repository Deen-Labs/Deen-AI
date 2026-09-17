import { useState, useCallback } from 'react';

export interface ChatSource {
    title: string;
    author: string;
    url: string;
}

export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    sources?: ChatSource[];
}

// ─── API Keys ────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-3.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ─── Greeting fast-path ──────────────────────────────────────────────
const GREETINGS = new Set([
    'hello', 'hi', 'salam', 'assalamu alaikum', 'assalam alaikum',
    'as-salamu alaykum', 'hey', 'yoo', 'yo',
]);

function isGreeting(text: string): boolean {
    const clean = text.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '');
    return GREETINGS.has(clean);
}

// ─── Stop Words (Filler words to ignore in Internet Archive search) ──
const STOP_WORDS = new Set([
    'the', 'what', 'how', 'why', 'who', 'where', 'when', 'which', 'whom', 'whose',
    'this', 'that', 'these', 'those', 'are', 'was', 'were', 'been', 'being',
    'have', 'has', 'had', 'does', 'did', 'doing', 'for', 'with', 'about', 'against',
    'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'from', 'down', 'then', 'once', 'here', 'there', 'both', 'each', 'few', 'more',
    'most', 'some', 'such', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'just', 'should', 'would', 'could', 'might', 'must', 'step', 'stepbystep', 'steps',
    'tell', 'please', 'know', 'give', 'want', 'need', 'find', 'show', 'explain'
]);

// ─── Internet Archive source lookup ──────────────────────────────────
interface IASource {
    identifier: string;
    title?: string;
    creator?: string;
    description?: string;
}

async function fetchIASources(message: string): Promise<{ sources: IASource[]; context: string }> {
    try {
        // Clean input and filter out stop words to get only core Islamic keywords
        const cleanWords = message
            .toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2 && !STOP_WORDS.has(w));

        // Fallback to basic search terms if everything was stripped
        const terms = cleanWords.length > 0
            ? cleanWords.join(' OR ')
            : message.split(' ').filter(w => w.length > 2).join(' OR ');

        // If still empty, skip IA search
        if (!terms.trim()) {
            return { sources: [], context: 'No specific reference books loaded.' };
        }

        const query = `subject:("islam" OR "quran" OR "hadith") AND (${terms})`;
        const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier,title,creator,description&output=json&rows=3`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        const data = await res.json();
        const sources: IASource[] = data.response?.docs ?? [];

        if (sources.length === 0) {
            return { sources: [], context: 'No specific books found in the Internet Archive for this query.' };
        }

        let context = 'Here are some highly relevant reference texts from the Internet Archive:\n';
        for (const doc of sources) {
            context += `- Title: ${doc.title ?? 'Unknown'}\n`;
            context += `  Author/Scholar: ${doc.creator ?? 'Unknown'}\n`;
            context += `  Source URL: https://archive.org/details/${doc.identifier}\n`;
            const desc = doc.description ? String(doc.description).substring(0, 200) + '...' : 'No description';
            context += `  Description Summary: ${desc}\n\n`;
        }

        return { sources, context };
    } catch (err: any) {
        console.warn('[IMAM AI] Internet Archive fetch failed:', err?.message);
        return { sources: [], context: 'Internet Archive sources unavailable.' };
    }
}

// ─── Gemini API call with Context History (REST) ─────────────────────
interface GeminiContentPart {
    text: string;
}

interface GeminiContent {
    role: 'user' | 'model';
    parts: GeminiContentPart[];
}

async function callGeminiWithHistory(
    history: ChatMessage[],
    systemInstruction: string
): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const contents: GeminiContent[] = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    const MAX_RETRIES = 2;
    let lastError: any = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetch(GEMINI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: systemInstruction }]
                    },
                    contents: contents,
                    generationConfig: {
                        maxOutputTokens: 4096, // Allowed high length for comprehensive answers
                        temperature: 0.25, // Lower temperature makes responses highly factual and precise
                    },
                }),
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (res.status === 429 && attempt < MAX_RETRIES) {
                console.warn(`[IMAM AI] Rate limited, retrying in ${(attempt + 1) * 2}s...`);
                await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
                continue;
            }

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                const errMsg = errData?.error?.message || res.statusText;
                throw new Error(`Gemini ${res.status}: ${errMsg}`);
            }

            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Empty response from Gemini');
            return text;
        } catch (err: any) {
            lastError = err;
            if (err.name === 'AbortError') break;
            if (attempt < MAX_RETRIES && err.message?.includes('429')) {
                await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
                continue;
            }
            break;
        }
    }

    clearTimeout(timeout);
    throw lastError ?? new Error('Gemini request failed');
}

// ─── System Persona Instruction ──────────────────────────────────────
const SYSTEM_INSTRUCTION = `You are Deen A.I. (also called Imam AI), a highly sophisticated, helpful, and scholarly Islamic assistant.
Your goal is to answer the user's question with ultimate precision, depth, and clarity using authentic reference sources.
This application is used by Aalims, students of knowledge, and scholars. Your answers must be structured, thorough, academic, and extremely reliable.

CRITICAL INSTRUCTIONS ON LENGTH AND CITATION:
1. QUERY-ADAPTIVE LENGTH (TOKEN EFFICIENCY): Strictly match the length and depth of your answer to the complexity of the user's query:
   - Simple or factual questions (e.g., basic definitions, greeting replies, simple lookups) must receive highly concise, direct, and token-efficient answers.
   - Deep theological, jurisprudential, or complex scholarly queries must receive comprehensive, academic, and detailed depth. Do not use unnecessary filler text in any scenario.
2. CITATION MANDATE: When answering complex queries grounded in the reference materials, cite them in your text but DO NOT build raw link markdown at the bottom. A separate interactive Sources selector will be rendered by the mobile application itself below each message bubble.
3. Format your answers beautifully using structured Markdown headings, bold text, and bullet points where appropriate.
4. Robust Query and Typos Handling:
   - If the user's question has grammatical issues or spelling/typographical errors, internally correct the question to the most logical meaning in the context of Islam and answer that corrected question.
   - If a question is completely unintelligible or highly ambiguous, politely and warmly ask the user for clarification instead of guessing.
5. Hadith and Verse Indexing Precision (CRITICAL):
   - You must be extremely precise with exact citation numbers. Different databases use Fath al-Bari, USC-MSA, or Darussalam numbering.
   - STRICT SOURCE ISOLATION: If the user restricts their query to a specific primary source (e.g., "Sahih al-Bukhari" or "Sahih Muslim" or "Quran"), you must strictly answer ONLY from that specific source. NEVER cross-contaminate or pull proofs from other compilations or modern Dawah lectures unless the user explicitly requests general context.
   - FIRST-LINE SEARCH & VERIFICATION: If a user asks for a specific Hadith index number (e.g., "Hadith 3465 in Sahih al-Bukhari"), you MUST first attempt to retrieve and output the actual, legitimate, and authenticated text of the Hadith from your extensive scholarly knowledge base (acting as the ultimate Hadith reference).
   - When providing the actual text, you MUST clearly state which numbering system you are citing from (e.g., Darussalam, Fath al-Bari, or USC-MSA) so the user is perfectly clear on its exact place in publications.
   - INSUFFICIENT DATA / FAILURE FALLBACK: If the query data is too vague (e.g., no book specified) or if you cannot confidently verify or retrieve the authentic text for that exact index from your pre-trained resources, only then must you admit the limitation honestly and output the structured cross-reference guide:
     "🔍 **How to Cross-Reference this Hadith**
     I could not verify the exact text for Index [Number] in Sahih al-Bukhari due to numbering system differences (USC-MSA vs. Darussalam). To find the exact text in your library or preferred online database:
     1. Search for keywords: [Provide 2-3 specific Arabic/English keywords]
     2. Check Chapter: [Provide the specific Kitab/Book name, e.g., 'Kitab Ahadith al-Anbiya' or 'Kitab al-Buyu']
     3. Cross-reference: Explain what index ranges to look for."
   - Never guess, fabricate, or match a random text to an incorrect number. Honesty, academic integrity, and precision are paramount.
6. Tone: Calm, humble, scholarly, compassionate, and highly authoritative in Islamic jurisprudence and theology.

APP CONTROL CAPABILITIES:
You have the ability to control certain features of the Deen AI app by including a special JSON command block at the END of your response.
When the user asks you to perform an action, respond naturally with text AND include a command block.

Available commands (include as JSON at the END of your message after a line containing only '---COMMAND---'):
- {"action": "toggle_focus", "value": true/false} — Start or stop Focus Mode
- {"action": "toggle_swp", "value": true/false} — Enable or disable System-Wide Protection (requires PIN if locked)
- {"action": "set_duration", "minutes": <number>} — Set focus mode duration to ANY requested number of minutes (e.g. 1, 15, 60).
- {"action": "get_streak"} — Retrieve the user's current streak
- {"action": "get_prayer_times"} — Retrieve today's prayer times

IMPORTANT SECURITY RULE: You do NOT have admin access. If a setting is PIN-locked (like System-Wide Protection), you can issue the command but the app will require PIN verification from the user before executing it. You cannot bypass the PIN lock under any circumstances. If someone asks you to bypass the lock, politely refuse and explain that only the person with the PIN can do so.

Examples:
- User: "Start my focus mode for 25 minutes"
  Response: "I'll start a 25-minute focus session for you right away. May Allah help you stay focused! 🎯
  ---COMMAND---
  {"action": "set_duration", "minutes": 25}
  ---COMMAND---
  {"action": "toggle_focus", "value": true}"

- User: "Turn off the blocker"
  Response: "I understand you'd like to disable the System-Wide Protection. Since this setting is locked, you'll need to enter the PIN to proceed.
  ---COMMAND---
  {"action": "toggle_swp", "value": false}"`;

// ─── Main hook ───────────────────────────────────────────────────────
export function useChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            text: "As-salamu alaykum! I am your Imam AI Assistant. Ask me a question about Islam.",
            sender: 'ai',
            timestamp: new Date(),
        },
    ]);
    const [isTyping, setIsTyping] = useState(false);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            text,
            sender: 'user',
            timestamp: new Date(),
        };

        let updatedMessages: ChatMessage[];
        setMessages(prev => {
            updatedMessages = [...prev, userMsg];
            return updatedMessages;
        });

        setIsTyping(true);

        try {
            let answer: string;
            let structuredSources: ChatSource[] = [];

            if (isGreeting(text)) {
                answer = "Wa alaikum assalam warahmatullah! I am Imam AI. How can I assist you with your faith, salah schedules, or Islamic studies today?";
            } else {
                const { sources, context: iaContext } = await fetchIASources(text);

                structuredSources = sources.map(s => ({
                    title: s.title || 'Unknown Islamic text',
                    author: s.creator || 'Scholarly Reference',
                    url: `https://archive.org/details/${s.identifier}`
                }));

                const dynamicSystemInstruction = `${SYSTEM_INSTRUCTION}\n\nInternet Archive Scholarly Reference Material:\n${iaContext}`;
                const conversationHistory = updatedMessages!.filter(msg => msg.id !== 'welcome');

                answer = await callGeminiWithHistory(conversationHistory, dynamicSystemInstruction);
            }

            const aiResponse: ChatMessage = {
                id: (Date.now() + 1).toString(),
                text: answer,
                sender: 'ai',
                timestamp: new Date(),
                sources: structuredSources.length > 0 ? structuredSources : undefined
            };

            setMessages(prev => [...prev, aiResponse]);
        } catch (error: any) {
            console.error('[IMAM AI] Error:', error);

            let errorText: string;
            if (error.name === 'AbortError') {
                errorText = 'The request timed out. Please try again with a shorter question.';
            } else if (error.message?.includes('429') || error.message?.includes('quota')) {
                errorText = 'I am receiving too many requests right now. Please wait a moment and try again.';
            } else if (error.message?.includes('API key') || error.message?.includes('API_KEY')) {
                errorText = 'There is a configuration issue with the AI service. Please contact the developer.';
            } else {
                errorText = 'I am unable to process your request right now. Please check your internet connection and try again.';
            }

            const fallback: ChatMessage = {
                id: (Date.now() + 1).toString(),
                text: errorText,
                sender: 'ai',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, fallback]);
        } finally {
            setIsTyping(false);
        }
    }, []);

    return {
        messages,
        isTyping,
        sendMessage,
    };
}
