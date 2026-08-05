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
  | "otp_request"
  | "order_confirmed"
  | "order_dispatched"
  | "order_delivered"
  | "order_cancelled"
  | "refund_processed"
  | "review_approved"
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
    // Sprint 2D: email added wherever process-notifications has a real email
    // template (order lifecycle events) — see supabase/functions/_shared/templates.ts.
    // otp_request stays SMS-only: email OTP would be redundant with the magic-link
    // email flow Supabase Auth already handles outside this queue. review_approved/
    // welcome have no email template yet, so they're left as-is too.
    switch (eventType) {
      case "otp_request":
        return ["sms"];
      case "order_confirmed":
        return ["sms", "whatsapp", "email"];
      case "order_dispatched":
        return ["sms", "whatsapp", "email"];
      case "order_delivered":
        return ["whatsapp", "email"];
      case "order_cancelled":
        return ["sms", "email"];
      case "refund_processed":
        return ["sms", "email"];
      case "review_approved":
        return ["whatsapp"];
      case "welcome":
        return ["sms"];
      default:
        return ["sms"];
    }
  }
}

export const NotificationService = new NotificationServiceClass();
