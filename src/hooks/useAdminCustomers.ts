import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CustomerDetail, CustomerListRow } from "@/types/database";

export const ADMIN_CUSTOMERS_PAGE_SIZE = 50;

export interface UseAdminCustomersOptions {
  search?: string;
  page: number; // 0-based
}

async function fetchAdminCustomers(
  opts: UseAdminCustomersOptions,
): Promise<{ rows: CustomerListRow[]; total: number }> {
  const { data, error } = await supabase.rpc("admin_list_customers", {
    p_search: opts.search?.trim() || null,
    p_limit: ADMIN_CUSTOMERS_PAGE_SIZE,
    p_offset: opts.page * ADMIN_CUSTOMERS_PAGE_SIZE,
  });
  if (error) throw error;

  const rows = (data ?? []) as (CustomerListRow & { total_count: number })[];
  return { rows, total: rows[0]?.total_count ?? 0 };
}

export function useAdminCustomers(opts: UseAdminCustomersOptions) {
  return useQuery({
    queryKey: ["admin-customers", opts],
    queryFn: () => fetchAdminCustomers(opts),
  });
}

async function fetchAdminCustomer(customerId: string): Promise<CustomerDetail> {
  const { data, error } = await supabase.rpc("admin_get_customer", {
    p_customer_id: customerId,
  });
  if (error) throw error;
  return data as CustomerDetail;
}

export function useAdminCustomer(customerId: string | null) {
  return useQuery({
    queryKey: ["admin-customer", customerId],
    queryFn: () => fetchAdminCustomer(customerId as string),
    enabled: !!customerId,
  });
}
