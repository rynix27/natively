import {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { relativeTime } from "../lib/utils";
import type { Tables } from "../types/database";
import NotificationBell from "../components/NotificationBell";
import EventCard from "../components/EventCard";
import type { EventCardData } from "../components/EventCard";
import {
  LogOut,
  Building2,
  Menu,
  X,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Clock,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─── Types ──────────────────────────────────────────────────────────

type Company = Tables<"companies">;

// ─── Helpers ────────────────────────────────────────────────────────

function toEventCategory(
  source: "funding" | "hiring" | "news",
  newsEventType?: string | null,
): "funding" | "hiring" | "product_launch" | "news" {
  if (source === "funding") return "funding";
  if (source === "hiring") return "hiring";
  if (newsEventType === "product_launch") return "product_launch";
  return "news";
}

// ─── Skeleton ───────────────────────────────────────────────────────

function EventSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-5 w-24 bg-surface-elevated rounded-full" />
        <div className="h-3 w-16 bg-surface-elevated rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-surface-elevated rounded w-full" />
        <div className="h-4 bg-surface-elevated rounded w-3/4" />
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-2 animate-pulse p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="w-8 h-8 rounded-md bg-surface-elevated shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-surface-elevated rounded w-3/4" />
            <div className="h-2.5 bg-surface-elevated rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // ── Sidebar mobile toggle ──────────────────────────────────────

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Data state ──────────────────────────────────────────────────

  const [watchlist, setWatchlist] = useState<Company[]>([]);
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // ── Fetch all dashboard data ────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Get watchlisted company IDs
      const { data: watchlistRows, error: wErr } = await supabase
        .from("user_watchlists")
        .select("company_id")
        .eq("user_id", user.id);

      if (wErr) throw new Error(wErr.message);

      const companyIds = (watchlistRows ?? []).map((r) => r.company_id);

      // No watchlist — stop here
      if (companyIds.length === 0) {
        setWatchlist([]);
        setEvents([]);
        setLoading(false);
        setLastFetched(new Date());
        return;
      }

      // 2. Fetch companies
      const { data: companies, error: cErr } = await supabase
        .from("companies")
        .select("*")
        .in("id", companyIds)
        .order("name");

      if (cErr) throw new Error(cErr.message);

      // 3. Fetch all event types in parallel
      const [fundingRes, hiringRes, newsRes] = await Promise.all([
        supabase
          .from("funding_events")
          .select("*")
          .in("company_id", companyIds)
          .order("announced_date", { ascending: false })
          .limit(100),
        supabase
          .from("hiring_signals")
          .select("*")
          .in("company_id", companyIds)
          .order("detected_at", { ascending: false })
          .limit(100),
        supabase
          .from("news_events")
          .select("*")
          .in("company_id", companyIds)
          .order("published_date", { ascending: false })
          .limit(100),
      ]);

      // 4. Merge events
      const merged: EventCardData[] = [];

      for (const f of fundingRes.data ?? []) {
        merged.push({
          id: f.id,
          companyName:
            (companies ?? []).find((c) => c.id === f.company_id)?.name ??
            "Unknown",
          category: "funding",
          headline: f.headline,
          sourceUrl: f.source_url,
          timestamp: f.announced_date,
          amount: f.amount,
          roundType: f.round_type,
          leadInvestor: f.lead_investor,
          isCritical: f.is_critical,
        });
      }

      for (const h of hiringRes.data ?? []) {
        merged.push({
          id: h.id,
          companyName:
            (companies ?? []).find((c) => c.id === h.company_id)?.name ??
            "Unknown",
          category: "hiring",
          headline: h.headline,
          sourceUrl: h.source_url,
          timestamp: h.detected_at,
          detail: h.detail,
        });
      }

      for (const n of newsRes.data ?? []) {
        merged.push({
          id: n.id,
          companyName:
            (companies ?? []).find((c) => c.id === n.company_id)?.name ??
            "Unknown",
          category: toEventCategory("news", n.event_type),
          headline: n.headline,
          sourceUrl: n.source_url,
          timestamp: n.published_date,
          summary: n.summary,
        });
      }

      // Sort by timestamp descending
      merged.sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tb - ta;
      });

      setWatchlist(companies ?? []);
      setEvents(merged);
      setLastFetched(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Group events by company ─────────────────────────────────────

  const eventsByCompany = useMemo(() => {
    const map = new Map<string, { company: Company; events: EventCardData[] }>();
    for (const company of watchlist) {
      map.set(company.id, { company, events: [] });
    }
    for (const event of events) {
      const company = watchlist.find((c) => c.name === event.companyName);
      if (!company) continue;
      const entry = map.get(company.id);
      if (entry) entry.events.push(event);
    }
    return Array.from(map.values());
  }, [watchlist, events]);

  // ── Active company for sidebar highlight ─────────────────────────

  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCompanyId(entry.target.id.replace("company-", ""));
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );

    for (const { company } of eventsByCompany) {
      const el = document.getElementById(`company-${company.id}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [eventsByCompany]);

  // ── Scroll to company ───────────────────────────────────────────

  const scrollToCompany = useCallback(
    (companyId: string) => {
      const el = document.getElementById(`company-${companyId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setSidebarOpen(false);
    },
    [],
  );

  // ── Is data stale (>24h)? ──────────────────────────────────────

  const isStale = useMemo(() => {
    if (!lastFetched) return false;
    return Date.now() - lastFetched.getTime() > 24 * 60 * 60 * 1000;
  }, [lastFetched]);

  // ── Close sidebar on Escape ─────────────────────────────────────

  useEffect(() => {
    if (!sidebarOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [sidebarOpen]);

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-background border-r border-border
          flex flex-col transform transition-transform duration-200 ease-out
          lg:relative lg:translate-x-0 lg:z-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        aria-label="Watchlist sidebar"
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="font-heading text-sm font-semibold text-foreground">
            Watchlist
          </h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-text-muted hover:text-foreground transition-colors
                       duration-150 cursor-pointer focus:outline-none focus:ring-2
                       focus:ring-ring rounded"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Watchlist items */}
        <nav
          className="flex-1 overflow-y-auto py-2"
          aria-label="Watchlisted companies"
        >
          {loading && <SidebarSkeleton />}

          {!loading && watchlist.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Building2 className="w-8 h-8 text-text-dim mx-auto mb-3" />
              <p className="text-text-muted text-sm">No companies yet</p>
              <button
                onClick={() => navigate("/onboarding")}
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary
                           hover:text-primary-hover transition-colors duration-150
                           cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                Add competitors
              </button>
            </div>
          )}

          {!loading &&
            watchlist.map((company) => {
              const isActive = activeCompanyId === company.id;
              const companyEvents = eventsByCompany.find(
                (e) => e.company.id === company.id,
              );
              const eventCount = companyEvents?.events.length ?? 0;

              return (
                <button
                  key={company.id}
                  onClick={() => scrollToCompany(company.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`w-full text-left flex items-center gap-3 px-4 py-2.5
                             transition-colors duration-150 cursor-pointer
                             ${
                               isActive
                                 ? "bg-primary/10 border-r-2 border-primary text-foreground"
                                 : "text-text-muted hover:bg-surface-elevated hover:text-foreground border-r-2 border-transparent"
                             }`}
                >
                  <div className="w-8 h-8 rounded-md bg-surface-elevated flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-text-muted" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {company.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {company.sector && (
                        <span className="text-[10px] text-text-dim uppercase tracking-wide truncate">
                          {company.sector}
                        </span>
                      )}
                      {eventCount > 0 && (
                        <span className="text-[10px] text-text-dim">
                          {eventCount} event{eventCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {isActive && (
                    <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-border p-4 shrink-0">
          <button
            onClick={() => {
              navigate("/onboarding");
              setSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg
                       bg-surface-elevated border border-border text-foreground
                       hover:border-primary/50 hover:text-primary
                       transition-all duration-150 cursor-pointer text-sm font-medium
                       active:scale-[0.97]"
          >
            <Building2 className="w-4 h-4" />
            Manage Watchlist
          </button>
        </div>
      </aside>

      {/* ── Main Area ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Top Nav ─────────────────────────────────────────── */}
        <header
          className="flex items-center justify-between shrink-0 h-14 px-4
                     border-b border-border bg-background/80 backdrop-blur-sm
                     sticky top-0 z-30"
        >
          {/* Left side */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-text-muted hover:text-foreground
                         transition-colors duration-150 cursor-pointer
                         focus:outline-none focus:ring-2 focus:ring-ring rounded-lg p-1"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h1 className="font-heading text-lg font-semibold text-foreground">
              Venture Compass
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg
                         text-text-muted hover:text-foreground hover:bg-surface-elevated
                         transition-all duration-150 cursor-pointer
                         focus:outline-none focus:ring-2 focus:ring-ring
                         disabled:opacity-50"
              aria-label="Refresh data"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>

            <NotificationBell />

            <span className="hidden sm:inline text-sm text-text-muted ml-2 truncate max-w-[160px]">
              {user?.email}
            </span>

            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-lg
                         border border-border bg-background px-3 py-1.5 text-sm
                         text-text-muted transition-all duration-150 ease-out cursor-pointer
                         hover:text-foreground hover:border-text-muted
                         active:scale-[0.97]
                         focus:outline-none focus:ring-2 focus:ring-ring ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {/* ── Main Content ─────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
            {/* ── Header with freshness ──────────────────────── */}
            {watchlist.length > 0 && !loading && (
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-heading text-base font-semibold text-foreground">
                    Activity Feed
                  </h2>
                  {lastFetched && (
                    <p className="text-xs text-text-dim mt-1 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Last updated {relativeTime(lastFetched.toISOString())}
                    </p>
                  )}
                </div>
                {isStale && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                               bg-warning/15 text-warning text-xs font-medium"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Data may be stale
                  </span>
                )}
              </div>
            )}

            {/* ── Error ──────────────────────────────────────── */}
            {error && (
              <div
                className="flex items-start gap-3 bg-destructive/10 border
                           border-destructive/30 rounded-xl p-5 mb-6"
              >
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-destructive font-medium text-sm">
                    Couldn't load dashboard data
                  </p>
                  <p className="text-foreground text-sm mt-1">{error}</p>
                </div>
                <button
                  onClick={fetchData}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                             bg-destructive/15 text-destructive hover:bg-destructive/25
                             transition-colors duration-150 cursor-pointer text-sm
                             font-medium shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </button>
              </div>
            )}

            {/* ── Loading skeleton ────────────────────────────── */}
            {loading && (
              <div className="space-y-8">
                {Array.from({ length: 3 }).map((_, ci) => (
                  <div key={ci} className="space-y-3">
                    <div className="flex items-center gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-md bg-surface-elevated" />
                      <div className="h-5 w-40 bg-surface-elevated rounded" />
                    </div>
                    <div className="space-y-3 pl-11">
                      {Array.from({ length: ci === 0 ? 3 : 2 }).map((_, ei) => (
                        <EventSkeleton key={ei} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── No watchlist ────────────────────────────────── */}
            {!loading && !error && watchlist.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-2xl bg-surface-elevated flex items-center justify-center mb-6">
                  <BarChart3 className="w-10 h-10 text-text-dim" />
                </div>
                <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
                  Your dashboard is empty
                </h2>
                <p className="text-text-muted text-sm max-w-sm mb-6">
                  Add competitors to your watchlist and we'll track their
                  funding rounds, hiring signals, and news for you.
                </p>
                <button
                  onClick={() => navigate("/onboarding")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg
                             bg-accent text-background font-semibold text-sm
                             hover:bg-accent-hover transition-all duration-150
                             active:scale-[0.97] cursor-pointer
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  Add Competitors
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── No events yet ────────────────────────────────── */}
            {!loading &&
              !error &&
              watchlist.length > 0 &&
              events.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center mb-4">
                    <RefreshCw className="w-8 h-8 text-text-dim" />
                  </div>
                  <h3 className="font-heading text-base font-semibold text-foreground mb-2">
                    Gathering intelligence
                  </h3>
                  <p className="text-text-muted text-sm max-w-sm mb-2">
                    We're collecting data for your competitors. Check back soon
                    for funding rounds, hiring signals, and news.
                  </p>
                  {lastFetched && (
                    <p className="text-text-dim text-xs flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Last checked {relativeTime(lastFetched.toISOString())}
                    </p>
                  )}
                </div>
              )}

            {/* ── Event Feed ───────────────────────────────────── */}
            {!loading &&
              !error &&
              eventsByCompany.length > 0 &&
              eventsByCompany.map(({ company, events: companyEvents }) => {
                if (companyEvents.length === 0) return null;
                return (
                  <section
                    key={company.id}
                    id={`company-${company.id}`}
                    className="mb-10 scroll-mt-20"
                    aria-labelledby={`company-heading-${company.id}`}
                  >
                    {/* Company header */}
                    <div className="flex items-center gap-3 mb-4 pl-1">
                      <div className="w-9 h-9 rounded-lg bg-surface-elevated flex items-center justify-center shrink-0 border border-border">
                        <Building2 className="w-4.5 h-4.5 text-text-muted" />
                      </div>
                      <div>
                        <h3
                          id={`company-heading-${company.id}`}
                          className="font-heading text-sm font-semibold text-foreground"
                        >
                          {company.name}
                        </h3>
                        {company.sector && (
                          <p className="text-xs text-text-dim">
                            {company.sector}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-text-dim ml-auto shrink-0">
                        {companyEvents.length} event
                        {companyEvents.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Event cards */}
                    <div className="space-y-3 pl-11">
                      {companyEvents.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  </section>
                );
              })}
          </div>
        </main>
      </div>
    </div>
  );
}
