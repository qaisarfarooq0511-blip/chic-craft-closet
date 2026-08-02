/**
 * Real Supabase Auth session + profile, kept in a small external store so it
 * can be read synchronously (useSyncExternalStore) from anywhere — route
 * guards, nav, etc. — without prop drilling a context through every route.
 */
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";
import { guestCartStore } from "@/lib/guest-cart-store";

export interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

let state: AuthState = { session: null, profile: null, loading: true };
const listeners = new Set<() => void>();

function setState(next: Partial<AuthState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    console.warn("[auth-store] failed to load profile", error);
    return null;
  }
  return data as Profile | null;
}

/** Merges the local guest cart into cart_items for the now-signed-in customer, summing quantities on conflict. */
async function mergeGuestCart(customerId: string) {
  const lines = guestCartStore.getSnapshot();
  if (!lines.length) return;
  try {
    const { data: existing } = await supabase
      .from("cart_items")
      .select("product_id, quantity")
      .eq("customer_id", customerId);
    const existingQty = new Map((existing ?? []).map((r) => [r.product_id, r.quantity]));
    const rows = lines.map((l) => ({
      customer_id: customerId,
      product_id: l.productId,
      quantity: (existingQty.get(l.productId) ?? 0) + l.quantity,
    }));
    const { error } = await supabase
      .from("cart_items")
      .upsert(rows, { onConflict: "customer_id,product_id" });
    if (error) throw error;
    guestCartStore.clear();
  } catch (e) {
    console.warn("[auth-store] guest cart merge failed", e);
  }
}

let initialized = false;

function init() {
  if (initialized) return;
  initialized = true;

  supabase.auth.getSession().then(async ({ data }) => {
    const session = data.session ?? null;
    const profile = session ? await loadProfile(session.user.id) : null;
    setState({ session, profile, loading: false });
  });

  let hadSession = false;
  supabase.auth.onAuthStateChange(async (_event, session) => {
    const profile = session ? await loadProfile(session.user.id) : null;
    if (session && !hadSession) await mergeGuestCart(session.user.id);
    hadSession = !!session;
    setState({ session, profile, loading: false });
  });
}

export const authStore = {
  init,
  getState: (): AuthState => state,
  subscribe: (listener: () => void) => {
    init();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /**
   * Re-fetch the profile row -- e.g. after a signup trigger just created it,
   * or after a role change lands in the DB while this session is already
   * active (see ProtectedRoute.tsx, which calls this once before treating a
   * role mismatch as a real access denial). Returns the freshly loaded
   * profile directly so a caller can check it without waiting on a re-render.
   */
  async refreshProfile(): Promise<Profile | null> {
    if (!state.session) return state.profile;
    const profile = await loadProfile(state.session.user.id);
    setState({ profile });
    return profile;
  },
};
