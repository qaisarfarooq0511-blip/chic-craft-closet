/**
 * NotificationService
 *
 * CLAUDE.md LAW: All notification calls must go through this service.
 * NEVER import Resend, Twilio, SendGrid, or any vendor SDK directly
 * into a feature component, page, or hook.
 *
 * To swap providers: change the implementation inside this file.
 * Feature code never changes. (framework §8.5)
 */
import { supabase } from "@/lib/supabase";
import type { NotificationChannel } from "@/types/database";

export type NotificationEventType =
  | "order_confirmed"
  | "order_dispatched"
  | "order_delivered"
  | "order_cancelled"
  | "review_approved"
  | "password_reset"
  | "welcome";

export interface NotificationPayload {
  order_number?: string;
  product_name?: string;
  tracking_number?: string;
  tracking_url?: string;
  customer_name?: string;
  [key: string]: unknown;
}

class NotificationServiceClass {
  /**
   * Queue a notification. The edge function worker processes the queue async.
   * This method is fire-and-forget from the caller's perspective — it writes
   * to the queue table and returns. The actual delivery happens separately.
   * (framework §1: write-then-async-process pattern)
   */
  async send(
    userId: string,
    eventType: NotificationEventType,
    payload: NotificationPayload,
    channels?: NotificationChannel[],
  ): Promise<void> {
    const defaultChannels = this.getDefaultChannels(eventType);
    const targetChannels = channels ?? defaultChannels;

    const inserts = targetChannels.map((channel) => ({
      user_id: userId,
      channel,
      event_type: eventType,
      payload,
    }));

    const { error } = await supabase.from("notification_queue").insert(inserts);

    if (error) {
      // Log but don't throw — notification failure must not break the main flow
      console.error("[NotificationService] Failed to queue notification:", error);
    }
  }

  private getDefaultChannels(eventType: NotificationEventType): NotificationChannel[] {
    switch (eventType) {
      case "order_confirmed":
        return ["email", "whatsapp"];
      case "order_dispatched":
        return ["email", "whatsapp", "sms"];
      case "order_delivered":
        return ["email"];
      case "order_cancelled":
        return ["email", "sms"];
      case "review_approved":
        return ["email"];
      case "password_reset":
        return ["email"];
      case "welcome":
        return ["email"];
      default:
        return ["email"];
    }
  }
}

export const NotificationService = new NotificationServiceClass();
