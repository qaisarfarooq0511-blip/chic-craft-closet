import { createFileRoute, redirect } from "@tanstack/react-router";

// No password concept anymore (phone + OTP auth) — kept as a redirect for old links.
export const Route = createFileRoute("/reset-password")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});
