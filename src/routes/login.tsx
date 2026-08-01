import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { MagicLinkForm } from "@/components/MagicLinkForm";

type Search = { redirect?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Yaawun" },
      { name: "description", content: "Sign in to your Yaawun account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { isAuthenticated } = useSupabaseAuth();

  const targetPath = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/";

  useEffect(() => {
    if (isAuthenticated) navigate({ to: targetPath, replace: true });
  }, [isAuthenticated, targetPath, navigate]);

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        padding: "48px 16px",
        background: "var(--cream)",
      }}
    >
      <MagicLinkForm
        title="Sign in or sign up"
        subtitle="We'll email you a link — no password needed. You can add your mobile number after signing in."
        redirectPath={targetPath}
      />
    </div>
  );
}
