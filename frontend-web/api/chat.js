import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Fast-path for simple greetings
    const cleanMsg = message.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
    const greetings = ["hello", "hi", "salam", "assalamu alaikum", "assalam alaikum", "as-salamu alaykum", "hey", "yoo", "yo"];
    
    if (greetings.includes(cleanMsg)) {
      return res.status(200).json({
        answer: "Wa alaikum assalam warahmatullah! I am Deen A.I. How can I assist you with your faith, salah schedules, or Islamic studies today?",
        sources: []
      });
    }

    // 1. Fetch relevant books/sources from Internet Archive based on the user's message
    // We are looking for Islamic texts to ground the AI's response.
    const query = `subject:("islam" OR "quran" OR "hadith") AND (${message.split(" ").join(" OR ")})`;
    const iaUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=title,creator,description&output=json&rows=3`;
    
    const iaResponse = await fetch(iaUrl);
    const iaData = await iaResponse.json();
    
    const sources = iaData.response?.docs || [];
    let contextString = "Here are some relevant books from the Internet Archive:\n";
    
    sources.forEach(doc => {
      contextString += `- Title: ${doc.title || 'Unknown'}\n`;
      contextString += `  Author: ${doc.creator || 'Unknown'}\n`;
      contextString += `  Description: ${doc.description ? String(doc.description).substring(0, 200) + '...' : 'No description'}\n\n`;
    });

    if (sources.length === 0) {
      contextString = "No specific books found in the Internet Archive for this query.";
    }

    // 2. Initialize Google Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // 3. Construct the prompt with the Internet Archive context
    const prompt = `
You are Deen A.I., a helpful, calm, and thoughtful Islamic assistant. 
Your goal is to answer the user's question accurately using authentic sources.
If applicable, mention the relevant books found in the Internet Archive data below.

Internet Archive Data:
${contextString}

User Question: ${message}

Provide a concise, thoughtful answer. If the question is not related to Islam, respectfully decline to answer.
    `;

    // 4. Generate the response
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({
      answer: text,
      response: text, // added for mobile app compatibility
      sources: sources
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
}
