import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminUsers, useSetUserRole, ADMIN_USERS_PAGE_SIZE } from "@/hooks/useAdminUsers";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/lib/toast";
import type { UserRole } from "@/types/database";

export const Route = createFileRoute("/admin/users")({
  component: UsersAdmin,
});

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function UsersAdmin() {
  const { user } = useSupabaseAuth();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const setUserRole = useSetUserRole();

  const { data, isLoading } = useAdminUsers({ search, page });
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : page * ADMIN_USERS_PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * ADMIN_USERS_PAGE_SIZE);

  const changeRole = async (id: string, email: string, newRole: UserRole) => {
    const message =
      newRole === "admin"
        ? `Give ${email} full admin access to the Yaawun admin panel?`
        : `Remove admin access for ${email}? They will lose access to the admin panel immediately.`;
    if (!confirm(message)) return;
    try {
      await setUserRole(id, newRole);
      toast(newRole === "admin" ? "Admin access granted" : "Admin access removed");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not update role");
    }
  };

  return (
    <>
      <h1 className="admin-h1">Users</h1>
      <p className="admin-sub">
        {total} registered account{total === 1 ? "" : "s"}. Promote or demote admin access here — no
        manual SQL needed.
      </p>

      <div className="admin-card" style={{ marginBottom: 14 }}>
        <input
          className="form-input"
          placeholder="Search by email or name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          style={{ maxWidth: 320 }}
        />
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Last sign-in</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading &&
              rows.map((r) => {
                const isSelf = r.id === user?.id;
                return (
                  <tr key={r.id}>
                    <td>{r.email}</td>
                    <td>{r.full_name || "—"}</td>
                    <td>
                      <span className={`pill pill-${r.role === "admin" ? "approved" : "off"}`}>
                        {r.role === "admin" ? "Admin" : "Customer"}
                      </span>
                    </td>
                    <td>{formatDate(r.created_at)}</td>
                    <td>{formatDate(r.last_sign_in_at)}</td>
                    <td style={{ textAlign: "right" }}>
                      {r.role === "customer" && (
                        <button
                          className="btn-outline"
                          disabled={isSelf}
                          onClick={() => changeRole(r.id, r.email, "admin")}
                        >
                          Make admin
                        </button>
                      )}
                      {r.role === "admin" && (
                        <button
                          className="btn-text-rust"
                          disabled={isSelf}
                          title={isSelf ? "You can't remove your own admin access" : undefined}
                          onClick={() => changeRole(r.id, r.email, "customer")}
                        >
                          Remove admin
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            marginTop: 16,
            alignItems: "center",
          }}
        >
          <button
            className="btn-outline"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span style={{ fontSize: 12, color: "var(--ink3)" }}>
            Showing {from}-{to} of {total} users
          </span>
          <button
            className="btn-outline"
            disabled={to >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
