import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminStaticPages, updateStaticPage } from "@/hooks/useAdminStaticPages";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/pages/")({
  component: PagesAdmin,
});

function PagesAdmin() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: pages, isLoading, error } = useAdminStaticPages();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-static-pages"] });

  const togglePublished = async (slug: string, current: boolean) => {
    try {
      await updateStaticPage(slug, { is_published: !current });
      invalidate();
      toast(!current ? "Page published" : "Page unpublished");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update");
    }
  };

  return (
    <>
      <h1 className="admin-h1">Static pages</h1>
      <p className="admin-sub">
        About, legal and help pages. Content here renders at <code>/about</code> or{" "}
        <code>/pages/&lt;slug&gt;</code>.
      </p>

      {error && (
        <p style={{ color: "#b91c1c", fontSize: 13, marginBottom: 12 }}>
          {error instanceof Error ? error.message : "Failed to load pages"}
        </p>
      )}

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Published</th>
              <th>Last updated</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading &&
              pages?.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link
                      to="/admin/pages/$slug"
                      params={{ slug: p.slug }}
                      style={{ color: "var(--ink)", fontWeight: 500, textDecoration: "none" }}
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td>
                    <code>{p.slug}</code>
                  </td>
                  <td>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={p.is_published}
                        onChange={() => void togglePublished(p.slug, p.is_published)}
                      />
                      <span className={`pill ${p.is_published ? "pill-live" : "pill-off"}`}>
                        {p.is_published ? "Published" : "Draft"}
                      </span>
                    </label>
                  </td>
                  <td>
                    {new Date(p.updated_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            {!isLoading && pages?.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
                  No pages found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
