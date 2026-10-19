import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from './chat';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

const SESSIONS_STORAGE_KEY = '@deen_imam_chat_sessions_v1';
const ACTIVE_SESSION_STORAGE_KEY = '@deen_imam_active_session_id_v1';

export const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  text: "As-salamu alaykum! I am your Imam AI Assistant. Ask me a question about Islam, prayer times, masjids, or focus mode.",
  sender: 'ai',
  timestamp: new Date(),
};

/**
 * Automatically creates a concise session title from the user's first query.
 */
export function generateSessionTitle(firstPrompt: string): string {
  const clean = firstPrompt.trim().replace(/^[\W_]+/, '');
  if (clean.length <= 36) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return clean.substring(0, 33).trim() + '...';
}

/**
 * Returns a human-friendly display title for a session, always preferring the first question asked.
 */
export function getSessionDisplayTitle(session: ChatSession): string {
  const firstUserMsg = session.messages.find(m => m.sender === 'user');
  if (firstUserMsg && firstUserMsg.text && firstUserMsg.text.trim()) {
    return generateSessionTitle(firstUserMsg.text);
  }
  return session.title && session.title !== 'New Conversation' ? session.title : 'New Conversation';
}

/**
 * Loads all saved chat sessions from AsyncStorage, sorted newest first.
 */
export async function getAllSessions(): Promise<ChatSession[]> {
  try {
    const raw = await AsyncStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const sessions: ChatSession[] = JSON.parse(raw);
    return sessions.map(s => {
      const msgs = s.messages.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
      const firstUser = msgs.find(m => m.sender === 'user');
      const title = (firstUser && firstUser.text.trim())
        ? generateSessionTitle(firstUser.text)
        : (s.title && s.title !== 'New Conversation' ? s.title : 'New Conversation');
      return {
        ...s,
        title,
        messages: msgs,
      };
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.warn('[ChatSessions] Error reading sessions:', err);
    return [];
  }
}

/**
 * Gets or creates the active session.
 */
export async function getActiveSession(): Promise<ChatSession> {
  const sessions = await getAllSessions();
  const activeId = await AsyncStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);

  if (activeId) {
    const match = sessions.find(s => s.id === activeId);
    if (match) return match;
  }

  if (sessions.length > 0) {
    await AsyncStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessions[0].id);
    return sessions[0];
  }

  // Create brand new session
  return createNewSession();
}

/**
 * Creates and persists a brand new chat session with default welcome message.
 * Reuses existing empty session if the user hasn't asked a question yet.
 */
export async function createNewSession(customTitle?: string): Promise<ChatSession> {
  const sessions = await getAllSessions();

  // If the latest session has NO user queries yet, reuse it instead of creating duplicates
  if (sessions.length > 0) {
    const latest = sessions[0];
    const hasUserQueries = latest.messages.some(m => m.sender === 'user');
    if (!hasUserQueries) {
      await AsyncStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, latest.id);
      return latest;
    }
  }

  const now = Date.now();
  const newSession: ChatSession = {
    id: `session_${now}`,
    title: customTitle || 'New Conversation',
    createdAt: now,
    updatedAt: now,
    messages: [{ ...INITIAL_WELCOME_MESSAGE, timestamp: new Date() }],
  };

  const updated = [newSession, ...sessions.filter(s => s.id !== newSession.id)];

  await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
  await AsyncStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, newSession.id);

  return newSession;
}

/**
 * Saves or updates a session's messages and metadata.
 */
export async function saveSession(session: ChatSession): Promise<void> {
  try {
    const sessions = await getAllSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    
    // Auto-update title based on first user question
    const firstUserMsg = session.messages.find(m => m.sender === 'user');
    let title = session.title;
    if (firstUserMsg && firstUserMsg.text && firstUserMsg.text.trim()) {
      title = generateSessionTitle(firstUserMsg.text);
    }

    const updatedSession: ChatSession = {
      ...session,
      title,
      updatedAt: Date.now(),
    };

    let updatedList: ChatSession[];
    if (index >= 0) {
      updatedList = [...sessions];
      updatedList[index] = updatedSession;
    } else {
      updatedList = [updatedSession, ...sessions];
    }

    await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updatedList));
  } catch (err) {
    console.warn('[ChatSessions] Error saving session:', err);
  }
}

/**
 * Deletes a session by ID. If active session was deleted, falls back to the next or creates one.
 */
export async function deleteSession(sessionId: string): Promise<{ remainingSessions: ChatSession[]; activeSession: ChatSession }> {
  const sessions = await getAllSessions();
  const remaining = sessions.filter(s => s.id !== sessionId);

  await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(remaining));

  let nextActive: ChatSession;
  if (remaining.length > 0) {
    nextActive = remaining[0];
    await AsyncStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, nextActive.id);
  } else {
    nextActive = await createNewSession();
  }

  return { remainingSessions: remaining, activeSession: nextActive };
}

/**
 * Sets the active session ID.
 */
export async function setActiveSessionId(sessionId: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId);
}
