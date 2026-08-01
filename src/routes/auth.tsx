import { createFileRoute, redirect } from "@tanstack/react-router";

type Search = { redirect?: string };

// Superseded by /login + /signup (real Supabase Auth) — kept as a redirect for old links/bookmarks.
export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/login", search: { redirect: search.redirect } });
  },
});
