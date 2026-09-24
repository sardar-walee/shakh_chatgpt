import { supabase } from "./supabase";

export type CarListingItem = {
  id: string;
  title: string;
  category: string;
  price: number;
  status: string;
  vendor?: string;
  image_url?: string | null;
  created_at: string;
  user_id?: string;
  attributes?: Record<string, unknown>;
};

/**
 * Dual-tone audio chime using the Web Audio API.
 * Synthesized purely in browser memory - zero network requests or audio file dependencies.
 */
export function playCarNotificationChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;

    // Chime Tone 1: High crisp bell
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.14, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Chime Tone 2: Harmonious chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(987.77, now + 0.1); // B5
    gain2.gain.setValueAtTime(0.18, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.6);
  } catch {
    // Browser audio autoplay policy handled gracefully
  }
}

/**
 * Broadcast a new car submission event across open browser tabs and local windows.
 */
export function broadcastCarSubmission(listing: CarListingItem): void {
  if (typeof window === "undefined") return;

  // Local window event
  window.dispatchEvent(
    new CustomEvent("shakh:new_car_listing", {
      detail: listing
    })
  );

  // Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("shakh_car_approvals");
      channel.postMessage({
        type: "NEW_CAR_LISTING",
        listing
      });
      channel.close();
    }
  } catch {
    // BroadcastChannel unsupported or restricted in environment
  }
}

/**
 * Format relative timestamp for Kurdish, Arabic, and English
 */
export function formatTimeAgo(
  dateString: string,
  t: (ku: string, ar: string, en: string) => string
): string {
  try {
    const timestamp = new Date(dateString).getTime();
    if (isNaN(timestamp)) return dateString;

    const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

    if (diffSeconds < 60) {
      return t("کەمێک لەمەوبەر", "منذ قليل", "Just now");
    }
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return t(`لەمەوبەر ${diffMinutes} خولەک`, `منذ ${diffMinutes} دقيقة`, `${diffMinutes}m ago`);
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return t(`لەمەوبەر ${diffHours} کاتژمێر`, `منذ ${diffHours} ساعة`, `${diffHours}h ago`);
    }
    const diffDays = Math.floor(diffHours / 24);
    return t(`لەمەوبەر ${diffDays} ڕۆژ`, `منذ ${diffDays} يوم`, `${diffDays}d ago`);
  } catch {
    return dateString;
  }
}
