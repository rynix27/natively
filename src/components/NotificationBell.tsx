import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { relativeTime } from "../lib/utils";
import type { Tables } from "../types/database";

type Notification = Tables<"notifications">;

// ─── Event type → color & icon mapping ─────────────────────────────

const EVENT_STYLE: Record<string, { dot: string; label: string }> = {
  funding: { dot: "bg-funding", label: "Funding" },
  hiring: { dot: "bg-hiring", label: "Hiring" },
  product_launch: { dot: "bg-launch", label: "Launch" },
  news: { dot: "bg-news", label: "News" },
  partnership: { dot: "bg-launch", label: "Partnership" },
  press_mention: { dot: "bg-news", label: "Press" },
  general: { dot: "bg-news", label: "General" },
  executive_hire: { dot: "bg-hiring", label: "Exec Hire" },
  team_growth: { dot: "bg-hiring", label: "Growth" },
  job_opening_spike: { dot: "bg-hiring", label: "Hiring Spike" },
};

function eventStyle(type: string) {
  return EVENT_STYLE[type] ?? { dot: "bg-news", label: "Update" };
}

// ─── Component ─────────────────────────────────────────────────────

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const bellRef = useRef<HTMLButtonElement>(null);

  // ── Fetch notifications ────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (err) {
      setError("Couldn't load notifications");
    } else {
      setNotifications(data ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── Outside click to close ─────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // ── Close on Escape ────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // ── Mark one as read ───────────────────────────────────────────

  const markAsRead = useCallback(
    async (id: string) => {
      const { error: err } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", user!.id);

      if (!err) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        );
      }
    },
    [user],
  );

  // ── Mark all as read ───────────────────────────────────────────

  const markAllAsRead = useCallback(async () => {
    if (!user || markingAll) return;
    setMarkingAll(true);

    const unreadIds = notifications
      .filter((n) => !n.is_read)
      .map((n) => n.id);

    if (unreadIds.length === 0) {
      setMarkingAll(false);
      return;
    }

    const { error: err } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds)
      .eq("user_id", user.id);

    if (!err) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
    setMarkingAll(false);
  }, [user, notifications, markingAll]);

  // ── Computed values ────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) fetchNotifications(); // refresh on open
        }}
        aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg
                   text-text-muted hover:text-foreground hover:bg-surface-elevated
                   transition-all duration-150 ease-out cursor-pointer
                   focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center
                       min-w-[18px] h-[18px] px-1 rounded-full bg-destructive
                       text-[10px] font-semibold text-white leading-none"
            aria-hidden="true"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] overflow-hidden
                     bg-surface border border-border rounded-xl shadow-xl z-50
                     flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3
              className="font-heading text-sm font-semibold text-foreground"
            >
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={markingAll}
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover
                           transition-colors duration-150 cursor-pointer disabled:opacity-50"
              >
                {markingAll ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-2 py-8 px-4">
                <p className="text-destructive text-sm">{error}</p>
                <button
                  onClick={fetchNotifications}
                  className="text-sm text-primary hover:underline cursor-pointer"
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="text-center py-10 px-4">
                <Bell className="w-8 h-8 text-text-dim mx-auto mb-3" />
                <p className="text-text-muted text-sm">
                  No notifications yet.
                </p>
                <p className="text-text-dim text-xs mt-1">
                  Alerts about your watchlisted companies will appear here.
                </p>
              </div>
            )}

            {!loading &&
              !error &&
              notifications.map((notification) => {
                const style = eventStyle(notification.event_type);
                return (
                  <button
                    key={notification.id}
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      if (!notification.is_read) markAsRead(notification.id);
                    }}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3
                               border-b border-border-light last:border-b-0
                               transition-colors duration-150 cursor-pointer
                               hover:bg-surface-elevated
                               ${!notification.is_read ? "bg-primary/5" : ""}`}
                  >
                    {/* Dot */}
                    <span
                      className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`}
                      aria-hidden="true"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-medium text-text-dim uppercase tracking-wide">
                          {style.label}
                        </span>
                        <span className="text-[11px] text-text-dim">
                          {notification.company_name}
                        </span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2 leading-snug">
                        {notification.headline}
                      </p>
                      <p className="text-xs text-text-dim mt-1">
                        {relativeTime(notification.created_at)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!notification.is_read && (
                      <span
                        className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0"
                        aria-label="Unread"
                      />
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
