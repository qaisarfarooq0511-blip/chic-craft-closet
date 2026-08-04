import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/database";

export const ADMIN_USERS_PAGE_SIZE = 50;

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface UseAdminUsersOptions {
  search?: string;
  page: number; // 0-based
}

async function fetchAdminUsers(
  opts: UseAdminUsersOptions,
): Promise<{ rows: AdminUserRow[]; total: number }> {
  const { data, error } = await supabase.rpc("admin_list_users", {
    p_search: opts.search?.trim() || null,
    p_limit: ADMIN_USERS_PAGE_SIZE,
    p_offset: opts.page * ADMIN_USERS_PAGE_SIZE,
  });
  if (error) throw error;

  const rows = (data ?? []) as (AdminUserRow & { total_count: number })[];
  return { rows, total: rows[0]?.total_count ?? 0 };
}

export function useAdminUsers(opts: UseAdminUsersOptions) {
  return useQuery({
    queryKey: ["admin-users", opts],
    queryFn: () => fetchAdminUsers(opts),
  });
}

export function useSetUserRole() {
  const queryClient = useQueryClient();
  return async (id: string, role: UserRole) => {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };
}
