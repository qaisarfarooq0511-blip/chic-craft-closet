import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IconArrowLeft, IconExternalLink } from "@tabler/icons-react";
import { getPage, upsertPage } from "@/lib/storage";
import type { StaticPage } from "@/lib/types";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/pages/$slug")({
  component: PageEditor,
});

function PageEditor() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState<StaticPage | null>(null);

  useEffect(() => {
    setPage(getPage(slug) ?? null);
  }, [slug]);

  if (!page) {
    return (
      <>
        <Link to="/admin/pages" className="admin-back"><IconArrowLeft size={14} /> Back to pages</Link>
        <h1 className="admin-h1">Page not found</h1>
        <p className="admin-sub">No page exists with slug <code>{slug}</code>.</p>
      </>
    );
  }

  const set = <K extends keyof StaticPage>(k: K, v: StaticPage[K]) =>
    setPage({ ...page, [k]: v });

  const save = () => {
    upsertPage({ ...page, updatedAt: Date.now() });
    toast("Page saved");
  };

  return (
    <>
      <Link to="/admin/pages" className="admin-back"><IconArrowLeft size={14} /> Back to pages</Link>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 className="admin-h1" style={{ marginBottom: 0 }}>Edit page</h1>
        <Link
          to="/page/$slug"
          params={{ slug: page.slug }}
          target="_blank"
          className="admin-nav-link"
          style={{ width: "auto", padding: "6px 10px" }}
        >
          <IconExternalLink size={14} /> <span>View live</span>
        </Link>
      </div>
      <p className="admin-sub">URL: <code>/page/{page.slug}</code></p>

      <div className="admin-card">
        <div className="form-field">
          <label className="form-label">Title</label>
          <input
            className="form-input"
            value={page.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Body</label>
          <textarea
            className="form-textarea"
            rows={22}
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, lineHeight: 1.7 }}
            value={page.body}
            onChange={(e) => set("body", e.target.value)}
          />
          <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 6, lineHeight: 1.6 }}>
            You can write plain text or basic HTML. Supported: <code>&lt;p&gt;</code>, <code>&lt;h2&gt;</code>,
            <code>&lt;h3&gt;</code>, <code>&lt;ul&gt;</code>/<code>&lt;li&gt;</code>, <code>&lt;a href&gt;</code>,
            <code>&lt;strong&gt;</code>, <code>&lt;em&gt;</code>.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="cta-primary" onClick={save}>Save changes</button>
          <button className="cta-secondary" onClick={() => navigate({ to: "/admin/pages" })}>Cancel</button>
        </div>
      </div>
    </>
  );
}
