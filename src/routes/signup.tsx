import { createFileRoute, redirect } from "@tanstack/react-router";

type Search = { redirect?: string };

// Superseded by /login (phone + OTP unifies signup and login into one flow) — kept as
// a redirect for old links/bookmarks.
export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/login", search: { redirect: search.redirect } });
  },
});
