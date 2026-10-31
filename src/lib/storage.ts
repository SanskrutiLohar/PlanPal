import { SavedPlan } from '../types/plan.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

const LOCAL_STORAGE_KEY = 'planpal_saved_plans';
const USER_ID_KEY = 'planpal_user_id';

// Generate or retrieve persistent user identifier for multi-device sync
export function getPersistentUserId(): string {
  try {
    let uid = localStorage.getItem(USER_ID_KEY);
    if (!uid) {
      uid = 'usr_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem(USER_ID_KEY, uid);
    }
    return uid;
  } catch {
    return 'usr_guest_session';
  }
}

export function setPersistentUserId(newUid: string): void {
  try {
    localStorage.setItem(USER_ID_KEY, newUid.trim());
  } catch {
    // Ignore storage errors
  }
}

// Load locally cached events
export function getLocalSavedPlans(): SavedPlan[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Save to local cache
export function setLocalSavedPlans(plans: SavedPlan[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(plans));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Universal Event Fetch:
 * 1. Checks Supabase if configured with active credentials.
 * 2. Falls back to backend API /api/events with persistent user token.
 * 3. Falls back to local cache if network is unavailable.
 */
export async function fetchAllEvents(): Promise<SavedPlan[]> {
  const userId = getPersistentUserId();
  const localPlans = getLocalSavedPlans();

  // 1. Try Supabase if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: SavedPlan[] = data.map((row) => ({
          id: row.id,
          userId: row.user_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          title: row.title,
          formData: row.form_data,
          plan: row.plan,
          expenses: row.expenses || [],
          tasks: row.tasks || [],
          vendorComparisons: row.vendor_comparisons || [],
        }));
        setLocalSavedPlans(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to server API:', err);
    }
  }

  // 2. Try Backend REST API
  try {
    const res = await fetch('/api/events', {
      headers: {
        'x-user-id': userId,
      },
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.events)) {
        // Merge with local plans to ensure no offline plans were lost
        const serverIds = new Set(json.events.map((e: SavedPlan) => e.id));
        const merged = [...json.events];
        for (const local of localPlans) {
          if (!serverIds.has(local.id)) {
            merged.push(local);
            // Sync offline created plan up to server
            saveEventToServer(local).catch(() => {});
          }
        }
        setLocalSavedPlans(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('Backend API fetch error, relying on local cache:', err);
  }

  // 3. Fallback to local storage mirror
  return localPlans;
}

/**
 * Save / Update Event across all persistence layers
 */
export async function persistEvent(planToSave: SavedPlan): Promise<SavedPlan> {
  const userId = getPersistentUserId();
  const updatedPlan: SavedPlan = {
    ...planToSave,
    userId: planToSave.userId || userId,
    updatedAt: new Date().toISOString(),
  };

  // 1. Update local cache immediately (Optimistic UI)
  const currentLocal = getLocalSavedPlans();
  const existingIdx = currentLocal.findIndex((p) => p.id === updatedPlan.id);
  let nextLocal: SavedPlan[];
  if (existingIdx >= 0) {
    nextLocal = [...currentLocal];
    nextLocal[existingIdx] = updatedPlan;
  } else {
    nextLocal = [updatedPlan, ...currentLocal];
  }
  setLocalSavedPlans(nextLocal);

  // 2. Save to Supabase if configured
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('events').upsert({
        id: updatedPlan.id,
        user_id: updatedPlan.userId,
        title: updatedPlan.title,
        form_data: updatedPlan.formData,
        plan: updatedPlan.plan,
        expenses: updatedPlan.expenses || [],
        tasks: updatedPlan.tasks || [],
        vendor_comparisons: updatedPlan.vendorComparisons || [],
        updated_at: updatedPlan.updatedAt,
      });
    } catch (err) {
      console.warn('Supabase upsert error:', err);
    }
  }

  // 3. Save to Backend REST API
  await saveEventToServer(updatedPlan);

  return updatedPlan;
}

/**
 * Delete Event across layers
 */
export async function deleteEventPersisted(eventId: string): Promise<void> {
  const userId = getPersistentUserId();

  // 1. Local update
  const current = getLocalSavedPlans().filter((p) => p.id !== eventId);
  setLocalSavedPlans(current);

  // 2. Supabase delete if configured
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('events').delete().eq('id', eventId);
    } catch (err) {
      console.warn('Supabase delete error:', err);
    }
  }

  // 3. Server delete
  try {
    await fetch(`/api/events/${eventId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    });
  } catch (err) {
    console.warn('Server delete error:', err);
  }
}

async function saveEventToServer(event: SavedPlan): Promise<void> {
  try {
    const userId = getPersistentUserId();
    await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify(event),
    });
  } catch (err) {
    console.warn('Server event persistence error:', err);
  }
}
