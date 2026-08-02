import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { IconArrowLeft } from "@tabler/icons-react";
import { useAdminStaticPage, updateStaticPage } from "@/hooks/useAdminStaticPages";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/pages/$slug")({
  component: PageEditor,
});

interface FormState {
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  isPublished: boolean;
}

const EMPTY_FORM: FormState = {
  title: "",
  content: "",
  metaTitle: "",
  metaDescription: "",
  isPublished: false,
};

function PageEditor() {
  const { slug } = Route.useParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: page, isLoading } = useAdminStaticPage(slug);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [baseline, setBaseline] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!page) return;
    const loaded: FormState = {
      title: page.title,
      content: page.content,
      metaTitle: page.meta_title ?? "",
      metaDescription: page.meta_description ?? "",
      isPublished: page.is_published,
    };
    setForm(loaded);
    setBaseline(loaded);
  }, [page]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);

  // Warn on real browser navigation/close/refresh with unsaved edits. This
  // does not (and per spec isn't meant to) catch in-app SPA navigation.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await updateStaticPage(slug, {
        title: form.title.trim(),
        content: form.content,
        meta_title: form.metaTitle.trim() || null,
        meta_description: form.metaDescription.trim() || null,
        is_published: form.isPublished,
      });
      setBaseline(form);
      queryClient.invalidateQueries({ queryKey: ["admin-static-page", slug] });
      queryClient.invalidateQueries({ queryKey: ["admin-static-pages"] });
      toast("Page saved");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p style={{ color: "var(--ink3)" }}>Loading…</p>;

  if (!page) {
    return (
      <>
        <BackLink />
        <h1 className="admin-h1">Page not found</h1>
        <p className="admin-sub">
          No page exists with slug <code>{slug}</code>.
        </p>
      </>
    );
  }

  return (
    <>
      <BackLink />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 4,
        }}
      >
        <h1 className="admin-h1" style={{ marginBottom: 0 }}>
          Edit page
        </h1>
        <span className={`pill ${form.isPublished ? "pill-live" : "pill-off"}`}>
          {form.isPublished ? "Published" : "Draft"}
        </span>
      </div>
      <p className="admin-sub">
        URL: <code>{page.slug === "about" ? "/about" : `/pages/${page.slug}`}</code>
      </p>

      <div className="admin-card">
        <div className="form-field">
          <label className="form-label">Title</label>
          <input
            className="form-input"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Content (HTML)</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
              gap: 16,
            }}
          >
            <textarea
              className="form-textarea"
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              style={{
                minHeight: 400,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 12,
                lineHeight: 1.7,
              }}
            />
            <div
              style={{
                minHeight: 400,
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: 16,
                overflow: "auto",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 10 }}>Preview</div>
              <div
                className="static-page-body"
                dangerouslySetInnerHTML={{ __html: form.content }}
              />
            </div>
          </div>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--ink2)",
            marginTop: 4,
            marginBottom: 16,
          }}
        >
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => set("isPublished", e.target.checked)}
          />
          Published (visible on the storefront)
        </label>

        <div className="cart-sum-title" style={{ marginBottom: 10 }}>
          SEO
        </div>
        <div className="form-field">
          <label className="form-label">Meta title</label>
          <input
            className="form-input"
            value={form.metaTitle}
            onChange={(e) => set("metaTitle", e.target.value)}
            placeholder="Defaults to page title if left blank"
          />
        </div>
        <div className="form-field">
          <label className="form-label">Meta description</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={form.metaDescription}
            onChange={(e) => set("metaDescription", e.target.value)}
            placeholder="Defaults to the first 160 characters of the content if left blank"
          />
          <div
            style={{
              fontSize: 11,
              marginTop: 4,
              color: form.metaDescription.length > 160 ? "var(--rust)" : "var(--ink3)",
            }}
          >
            {form.metaDescription.length} / 160
          </div>
        </div>

        <button className="btn-ink" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </>
  );
}

function BackLink() {
  return (
    <Link
      to="/admin/pages"
      style={{
        fontSize: 12,
        color: "var(--ink3)",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        marginBottom: 10,
      }}
    >
      <IconArrowLeft size={14} /> Back to pages
    </Link>
  );
}
