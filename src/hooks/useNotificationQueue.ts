import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { NotificationChannel } from "@/types/database";

const QUEUE_KEY = "notification-queue";

export interface NotificationQueueStats {
  queuedCount: number;
  failedCount: number;
  lastProcessedAt: string | null;
}

export interface FailedNotificationRow {
  id: string;
  event_type: string;
  channel: NotificationChannel;
  attempts: number;
  last_error: string | null;
  created_at: string;
}

async function fetchStats(): Promise<NotificationQueueStats> {
  const [queuedRes, failedRes, lastProcessedRes] = await Promise.all([
    supabase
      .from("notification_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued"),
    supabase
      .from("notification_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase
      .from("notification_queue")
      .select("processed_at")
      .not("processed_at", "is", null)
      .order("processed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (queuedRes.error) throw queuedRes.error;
  if (failedRes.error) throw failedRes.error;
  if (lastProcessedRes.error) throw lastProcessedRes.error;

  return {
    queuedCount: queuedRes.count ?? 0,
    failedCount: failedRes.count ?? 0,
    lastProcessedAt: lastProcessedRes.data?.processed_at ?? null,
  };
}

async function fetchFailedNotifications(): Promise<FailedNotificationRow[]> {
  const { data, error } = await supabase
    .from("notification_queue")
    .select("id, event_type, channel, attempts, last_error, created_at")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export function useNotificationQueueStats() {
  return useQuery({ queryKey: [QUEUE_KEY, "stats"], queryFn: fetchStats });
}

export function useFailedNotifications() {
  return useQuery({ queryKey: [QUEUE_KEY, "failed"], queryFn: fetchFailedNotifications });
}

/** Uses the notif_queue_admin_retry RLS policy — WITH CHECK there only allows the
 * resulting row to land at status='queued', attempts=0, so this is the only shape
 * of update that policy will accept. */
export function useRetryNotification() {
  const queryClient = useQueryClient();
  return async (id: string) => {
    const { error } = await supabase
      .from("notification_queue")
      .update({ status: "queued", attempts: 0, process_after: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: [QUEUE_KEY] });
  };
}
