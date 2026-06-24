import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IconPencil, IconTrash, IconPlus, IconExternalLink } from "@tabler/icons-react";
import { getPages, deletePage, upsertPage } from "@/lib/storage";
import type { StaticPage } from "@/lib/types";
import { slugify } from "@/lib/types";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/pages/")({
  component: PagesAdmin,
});

function PagesAdmin() {
  const toast = useToast();
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [newTitle, setNewTitle] = useState("");

  const refresh = () => setPages(getPages());
  useEffect(() => { refresh(); }, []);

  const addPage = () => {
    const title = newTitle.trim();
    if (!title) return;
    const slug = slugify(title);
    if (pages.some((p) => p.slug === slug)) {
      toast("A page with that slug already exists");
      return;
    }
    upsertPage({
      slug,
      title,
      body: "<p>Write your content here.</p>",
      order: pages.length,
      updatedAt: Date.now(),
    });
    setNewTitle("");
    refresh();
    toast("Page created");
  };

  const removePage = (slug: string) => {
    if (!confirm("Delete this page? This cannot be undone.")) return;
    deletePage(slug);
    refresh();
    toast("Page deleted");
  };

  return (
    <>
      <h1 className="admin-h1">Static pages</h1>
      <p className="admin-sub">About, policy and help pages. Content here renders at <code>/page/&lt;slug&gt;</code> and appears in the footer.</p>

      <div className="admin-card" style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <div className="form-field" style={{ flex: 1, marginBottom: 0 }}>
          <label className="form-label">New page title</label>
          <input
            className="form-input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Shipping Policy"
          />
        </div>
        <button className="cta-primary" onClick={addPage} style={{ whiteSpace: "nowrap" }}>
          <IconPlus size={16} style={{ marginRight: 6, verticalAlign: "-3px" }} />Add page
        </button>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--cream2)", textAlign: "left" }}>
              <th style={{ padding: "12px 14px", fontWeight: 500, color: "var(--ink2)" }}>Title</th>
              <th style={{ padding: "12px 14px", fontWeight: 500, color: "var(--ink2)" }}>Slug</th>
              <th style={{ padding: "12px 14px", fontWeight: 500, color: "var(--ink2)" }}>Updated</th>
              <th style={{ padding: "12px 14px", fontWeight: 500, color: "var(--ink2)", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.slug} style={{ borderTop: "0.5px solid var(--b)" }}>
                <td style={{ padding: "12px 14px", color: "var(--ink)" }}>{p.title}</td>
                <td style={{ padding: "12px 14px", color: "var(--ink3)" }}><code>/page/{p.slug}</code></td>
                <td style={{ padding: "12px 14px", color: "var(--ink3)" }}>
                  {new Date(p.updatedAt).toLocaleDateString()}
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right" }}>
                  <Link
                    to="/page/$slug"
                    params={{ slug: p.slug }}
                    target="_blank"
                    title="View"
                    style={{ marginRight: 12, color: "var(--ink2)" }}
                  >
                    <IconExternalLink size={16} />
                  </Link>
                  <Link
                    to="/admin/pages/$slug"
                    params={{ slug: p.slug }}
                    title="Edit"
                    style={{ marginRight: 12, color: "var(--ink2)" }}
                  >
                    <IconPencil size={16} />
                  </Link>
                  <button
                    onClick={() => removePage(p.slug)}
                    title="Delete"
                    style={{ background: "none", border: "none", color: "var(--rust)", cursor: "pointer" }}
                  >
                    <IconTrash size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 18, textAlign: "center", color: "var(--ink3)" }}>No pages yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
