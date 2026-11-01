import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SavedPlan } from '../types/plan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'events.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('Could not create data directory:', err);
  }
}

// In-memory cache for ultra-fast response times
let inMemoryStore: Record<string, SavedPlan[]> = {};

function loadDb(): Record<string, SavedPlan[]> {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        inMemoryStore = parsed;
        return inMemoryStore;
      }
    }
  } catch (err) {
    console.warn('Failed to load events DB from disk:', err);
  }
  return inMemoryStore;
}

function persistDb(): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to persist events DB to disk:', err);
  }
}

// Initial load
loadDb();

export async function getUserEvents(userId: string): Promise<SavedPlan[]> {
  const store = inMemoryStore;
  return store[userId] || [];
}

export async function saveUserEvent(userId: string, event: SavedPlan): Promise<SavedPlan> {
  if (!inMemoryStore[userId]) {
    inMemoryStore[userId] = [];
  }

  const existingIdx = inMemoryStore[userId].findIndex((e) => e.id === event.id);
  const now = new Date().toISOString();
  const toSave: SavedPlan = {
    ...event,
    userId,
    updatedAt: now,
    createdAt: event.createdAt || now,
  };

  if (existingIdx >= 0) {
    inMemoryStore[userId][existingIdx] = toSave;
  } else {
    inMemoryStore[userId].unshift(toSave);
  }

  persistDb();
  return toSave;
}

export async function deleteUserEvent(userId: string, eventId: string): Promise<boolean> {
  if (!inMemoryStore[userId]) return false;
  const initialLen = inMemoryStore[userId].length;
  inMemoryStore[userId] = inMemoryStore[userId].filter((e) => e.id !== eventId);
  if (inMemoryStore[userId].length !== initialLen) {
    persistDb();
    return true;
  }
  return false;
}

export async function getEventById(userId: string, eventId: string): Promise<SavedPlan | null> {
  const list = inMemoryStore[userId] || [];
  return list.find((e) => e.id === eventId) || null;
}
