import { useSyncExternalStore } from "react";
import { authStore } from "@/lib/auth-store";

export function useSupabaseAuth() {
  const state = useSyncExternalStore(authStore.subscribe, authStore.getState, authStore.getState);
  return {
    session: state.session,
    user: state.session?.user ?? null,
    profile: state.profile,
    loading: state.loading,
    isAuthenticated: !!state.session,
    isAdmin: state.profile?.role === "admin",
  };
}
