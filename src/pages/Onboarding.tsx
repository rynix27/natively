import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useTransition,
  useRef,
} from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { Tables } from "../types/database";
import {
  Search,
  X,
  Building2,
  Plus,
  Check,
  ChevronDown,
  AlertTriangle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────

type Company = Tables<"companies">;

// ─── Helpers ──────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Skeleton Card ────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface-elevated" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-surface-elevated rounded w-3/4" />
          <div className="h-3 bg-surface-elevated rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-3 bg-surface-elevated rounded w-full" />
        <div className="h-3 bg-surface-elevated rounded w-5/6" />
      </div>
      <div className="h-9 bg-surface-elevated rounded-lg w-full" />
    </div>
  );
}

// ─── Sector Badge Color ───────────────────────────────────────────────

const SECTOR_PALETTE = [
  "bg-funding-bg text-funding",
  "bg-hiring-bg text-hiring",
  "bg-launch-bg text-launch",
  "bg-news-bg text-news",
  "bg-primary/15 text-primary",
  "bg-accent/15 text-accent",
] as const;

function sectorColor(index: number): string {
  return SECTOR_PALETTE[index % SECTOR_PALETTE.length];
}

// ─── Main Component ───────────────────────────────────────────────────

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Data ──────────────────────────────────────────────────────

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Search ────────────────────────────────────────────────────

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [isPending, startTransition] = useTransition();

  // ── Sector filter ─────────────────────────────────────────────

  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [sectorDropdownOpen, setSectorDropdownOpen] = useState(false);
  const sectorDropdownRef = useRef<HTMLDivElement>(null);

  // ── Watchlist ─────────────────────────────────────────────────

  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  const [watchlistLoading, setWatchlistLoading] = useState<Set<string>>(
    new Set(),
  );
  const [watchlistError, setWatchlistError] = useState<string | null>(null);

  // ── Fetch companies ───────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("name");

      if (cancelled) return;

      if (error) {
        setLoadError(error.message);
      } else {
        setCompanies(data ?? []);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Fetch watchlist ───────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("user_watchlists")
        .select("company_id")
        .eq("user_id", user!.id);

      if (cancelled) return;
      if (error) return;

      setWatchlistIds(new Set((data ?? []).map((r) => r.company_id)));
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ── Unique sectors ────────────────────────────────────────────

  const sectors = useMemo(() => {
    const set = new Set<string>();
    for (const c of companies) {
      if (c.sector) set.add(c.sector);
    }
    return Array.from(set).sort();
  }, [companies]);

  // ── Filtered companies ────────────────────────────────────────

  const filteredCompanies = useMemo(() => {
    let result = companies;

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }

    if (selectedSectors.length > 0) {
      result = result.filter(
        (c) => c.sector && selectedSectors.includes(c.sector),
      );
    }

    return result;
  }, [companies, debouncedSearch, selectedSectors]);

  // ── Selected companies (those in watchlist) ───────────────────

  const selectedCompanies = useMemo(
    () => companies.filter((c) => watchlistIds.has(c.id)),
    [companies, watchlistIds],
  );

  // ── Close sector dropdown on outside click ────────────────────

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        sectorDropdownRef.current &&
        !sectorDropdownRef.current.contains(e.target as Node)
      ) {
        setSectorDropdownOpen(false);
      }
    }
    if (sectorDropdownOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [sectorDropdownOpen]);

  // ── Handlers ──────────────────────────────────────────────────

  const toggleSector = useCallback((sector: string) => {
    setSelectedSectors((prev) =>
      prev.includes(sector)
        ? prev.filter((s) => s !== sector)
        : [...prev, sector],
    );
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearch(value); // update input immediately
      startTransition(() => {
        // debounce handles the actual filter delay
      });
    },
    [],
  );

  const addToWatchlist = useCallback(
    async (companyId: string) => {
      if (!user) return;
      setWatchlistError(null);
      setWatchlistLoading((prev) => new Set(prev).add(companyId));

      const { error } = await supabase
        .from("user_watchlists")
        .insert({ user_id: user.id, company_id: companyId });

      setWatchlistLoading((prev) => {
        const next = new Set(prev);
        next.delete(companyId);
        return next;
      });

      if (error) {
        setWatchlistError("Couldn't add that company — try again?");
      } else {
        setWatchlistIds((prev) => new Set(prev).add(companyId));
      }
    },
    [user],
  );

  const removeFromWatchlist = useCallback(
    async (companyId: string) => {
      if (!user) return;
      setWatchlistError(null);
      setWatchlistLoading((prev) => new Set(prev).add(companyId));

      const { error } = await supabase
        .from("user_watchlists")
        .delete()
        .eq("user_id", user.id)
        .eq("company_id", companyId);

      setWatchlistLoading((prev) => {
        const next = new Set(prev);
        next.delete(companyId);
        return next;
      });

      if (error) {
        setWatchlistError("Couldn't remove that company — try again?");
      } else {
        setWatchlistIds((prev) => {
          const next = new Set(prev);
          next.delete(companyId);
          return next;
        });
      }
    },
    [user],
  );

  const handleContinue = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1
            className="text-xl font-semibold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Build Your Watchlist
          </h1>
          <span className="text-text-muted text-sm">
            {selectedCompanies.length} selected
          </span>
        </div>
      </header>

      {/* Search + Filter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <label htmlFor="company-search" className="sr-only">
              Search companies
            </label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              id="company-search"
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by name…"
              className="w-full bg-surface border border-border rounded-lg py-2.5 pl-10 pr-4 text-foreground placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring transition-colors duration-200"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground transition-colors duration-150 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sector dropdown */}
          <div className="relative" ref={sectorDropdownRef}>
            <button
              onClick={() => setSectorDropdownOpen((o) => !o)}
              className="flex items-center gap-2 bg-surface border border-border rounded-lg py-2.5 px-4 text-foreground hover:border-primary transition-colors duration-200 cursor-pointer min-w-[160px]"
              aria-expanded={sectorDropdownOpen}
              aria-haspopup="listbox"
            >
              <span className="text-sm">
                {selectedSectors.length === 0
                  ? "All sectors"
                  : `${selectedSectors.length} selected`}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-text-muted ml-auto transition-transform duration-200 ${
                  sectorDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {sectorDropdownOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-64 max-h-72 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg z-30"
                role="listbox"
                aria-multiselectable="true"
              >
                {selectedSectors.length > 0 && (
                  <button
                    onClick={() => setSelectedSectors([])}
                    className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-surface-elevated transition-colors duration-150 cursor-pointer border-b border-border-light"
                  >
                    Clear all filters
                  </button>
                )}
                {sectors.map((sector) => {
                  const isSelected = selectedSectors.includes(sector);
                  return (
                    <button
                      key={sector}
                      onClick={() => toggleSector(sector)}
                      role="option"
                      aria-selected={isSelected}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-surface-elevated transition-colors duration-150 cursor-pointer"
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors duration-150 ${
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-text-dim"
                        }`}
                      >
                        {isSelected && (
                          <Check className="w-3 h-3 text-on-primary" />
                        )}
                      </span>
                      {sector}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected sector chips */}
        {selectedSectors.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedSectors.map((sector) => (
              <span
                key={sector}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
              >
                {sector}
                <button
                  onClick={() => toggleSector(sector)}
                  className="hover:text-foreground transition-colors duration-150 cursor-pointer"
                  aria-label={`Remove ${sector} filter`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Company grid */}
          <div className="flex-1 min-w-0">
            {/* Error state */}
            {loadError && (
              <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-xl p-5 mb-4">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-destructive font-medium text-sm">
                    Couldn't load companies
                  </p>
                  <p className="text-foreground text-sm mt-1">{loadError}</p>
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {/* Empty search */}
            {!loading && !loadError && filteredCompanies.length === 0 && (
              <div className="text-center py-16">
                <Search className="w-12 h-12 text-text-dim mx-auto mb-4" />
                <p className="text-foreground font-medium text-lg">
                  {companies.length === 0
                    ? "No companies yet"
                    : "No companies match your search"}
                </p>
                <p className="text-text-muted text-sm mt-2">
                  {companies.length === 0
                    ? "Import companies via the admin page to get started."
                    : "Try adjusting your search or filters."}
                </p>
                {companies.length === 0 && (
                  <a
                    href="/admin/import"
                    className="inline-flex items-center gap-2 mt-4 text-primary hover:underline text-sm cursor-pointer"
                  >
                    <UploadIcon className="w-4 h-4" />
                    Go to Admin Import
                  </a>
                )}
              </div>
            )}

            {/* Cards */}
            {!loading && !loadError && filteredCompanies.length > 0 && (
              <>
                <p className="text-text-muted text-sm mb-4">
                  {isPending ? (
                    <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                  ) : null}
                  Showing {filteredCompanies.length} of {companies.length}{" "}
                  companies
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredCompanies.map((company) => {
                    const isWatched = watchlistIds.has(company.id);
                    const isUpdating = watchlistLoading.has(company.id);
                    const sectorIdx = sectors.indexOf(company.sector ?? "");

                    return (
                      <div
                        key={company.id}
                        className={`bg-surface border rounded-xl p-5 transition-all duration-200 hover:shadow-lg ${
                          isWatched
                            ? "border-primary/40"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        {/* Top row: logo + name */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5 text-text-muted" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-foreground font-semibold text-sm truncate">
                              {company.name}
                            </h3>
                            {company.sector && (
                              <span
                                className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full mt-1 ${sectorColor(sectorIdx)}`}
                              >
                                {company.sector}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        {company.description && (
                          <p className="text-text-muted text-sm line-clamp-2 mb-4">
                            {company.description}
                          </p>
                        )}

                        {/* Meta row */}
                        <div className="flex items-center gap-3 text-xs text-text-dim mb-4">
                          {company.country && <span>{company.country}</span>}
                          {company.founded_year && (
                            <span>Founded {company.founded_year}</span>
                          )}
                        </div>

                        {/* Action button */}
                        {isWatched ? (
                          <button
                            onClick={() => removeFromWatchlist(company.id)}
                            disabled={isUpdating}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors duration-200 cursor-pointer text-sm font-medium disabled:opacity-50"
                          >
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Added
                          </button>
                        ) : (
                          <button
                            onClick={() => addToWatchlist(company.id)}
                            disabled={isUpdating}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-background border border-border text-foreground hover:border-primary hover:text-primary transition-colors duration-200 cursor-pointer text-sm font-medium disabled:opacity-50"
                          >
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                            Add to Watchlist
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Selected panel (sidebar on desktop) */}
          <div className="lg:w-80 xl:w-96 shrink-0">
            <div className="bg-surface border border-border rounded-xl p-5 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-lg font-semibold text-foreground"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Your Watchlist
                </h2>
                <span className="text-text-muted text-sm">
                  {selectedCompanies.length} selected
                </span>
              </div>

              {/* Empty watchlist */}
              {selectedCompanies.length === 0 && (
                <div className="text-center py-8">
                  <Building2 className="w-10 h-10 text-text-dim mx-auto mb-3" />
                  <p className="text-text-muted text-sm">
                    Add at least 3 companies to your watchlist to continue.
                  </p>
                </div>
              )}

              {/* Selected list */}
              {selectedCompanies.length > 0 && (
                <ul className="space-y-2 max-h-[40vh] lg:max-h-[50vh] overflow-y-auto mb-4">
                  {selectedCompanies.map((company) => (
                    <li
                      key={company.id}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-background border border-border-light"
                    >
                      <div className="w-8 h-8 rounded-md bg-surface-elevated flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-text-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-medium truncate">
                          {company.name}
                        </p>
                        {company.sector && (
                          <p className="text-text-dim text-xs">{company.sector}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromWatchlist(company.id)}
                        disabled={watchlistLoading.has(company.id)}
                        className="text-text-muted hover:text-destructive transition-colors duration-150 cursor-pointer p-1"
                        aria-label={`Remove ${company.name} from watchlist`}
                      >
                        {watchlistLoading.has(company.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Error */}
              {watchlistError && (
                <div className="flex items-center gap-2 text-destructive text-xs mb-4">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {watchlistError}
                </div>
              )}

              {/* Continue button */}
              <button
                onClick={handleContinue}
                disabled={selectedCompanies.length < 3}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all duration-200 active:scale-[0.97] cursor-pointer disabled:cursor-not-allowed bg-accent hover:bg-accent-hover text-background disabled:bg-surface-elevated disabled:text-text-dim"
              >
                Continue to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
              {selectedCompanies.length < 3 && selectedCompanies.length > 0 && (
                <p className="text-text-dim text-xs text-center mt-2">
                  {3 - selectedCompanies.length} more to go
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tiny inline helper component for the empty-state admin link
function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
