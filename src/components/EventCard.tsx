import { ExternalLink, DollarSign, Briefcase, Rocket, Newspaper } from "lucide-react";
import { relativeTime, formatAmount } from "../lib/utils";

// ─── Types ──────────────────────────────────────────────────────────

export type EventCategory =
  | "funding"
  | "hiring"
  | "product_launch"
  | "news";

export interface EventCardData {
  id: string;
  companyName: string;
  category: EventCategory;
  headline: string;
  sourceUrl?: string | null;
  timestamp: string | null;
  // Funding
  amount?: number | null;
  roundType?: string | null;
  leadInvestor?: string | null;
  isCritical?: boolean | null;
  // Hiring
  detail?: string | null;
  // News
  summary?: string | null;
}

// ─── Style maps ─────────────────────────────────────────────────────

const CATEGORY_STYLE: Record<
  EventCategory,
  { icon: typeof DollarSign; bg: string; text: string; label: string }
> = {
  funding: {
    icon: DollarSign,
    bg: "bg-funding-bg",
    text: "text-funding",
    label: "Funding",
  },
  hiring: {
    icon: Briefcase,
    bg: "bg-hiring-bg",
    text: "text-hiring",
    label: "Hiring",
  },
  product_launch: {
    icon: Rocket,
    bg: "bg-launch-bg",
    text: "text-launch",
    label: "Launch",
  },
  news: {
    icon: Newspaper,
    bg: "bg-news-bg",
    text: "text-news",
    label: "News",
  },
};

// ─── Component ──────────────────────────────────────────────────────

export default function EventCard({ event }: { event: EventCardData }) {
  const style = CATEGORY_STYLE[event.category];
  const Icon = style.icon;

  return (
    <div
      className="group bg-surface border border-border rounded-xl p-4
                 transition-all duration-200 hover:border-primary/30 hover:shadow-md"
    >
      {/* Top row: event type badge + timestamp */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
        >
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          {style.label}
          {event.category === "funding" && event.roundType && (
            <span className="opacity-70">
              &middot; {event.roundType}
            </span>
          )}
        </span>

        <span className="text-xs text-text-dim shrink-0 ml-2">
          {relativeTime(event.timestamp)}
        </span>
      </div>

      {/* Headline */}
      <h4 className="text-foreground font-medium text-sm leading-snug mb-2">
        {event.headline}
      </h4>

      {/* Amount (funding) */}
      {event.category === "funding" && event.amount != null && (
        <p className="text-funding font-semibold text-sm mb-2">
          {formatAmount(event.amount)}
          {event.leadInvestor && (
            <span className="text-text-dim font-normal text-xs ml-2">
              led by {event.leadInvestor}
            </span>
          )}
        </p>
      )}

      {/* Detail (hiring) */}
      {event.category === "hiring" && event.detail && (
        <p className="text-text-muted text-xs mb-2 line-clamp-2">
          {event.detail}
        </p>
      )}

      {/* Summary (news) */}
      {(event.category === "news" || event.category === "product_launch") &&
        event.summary && (
          <p className="text-text-muted text-xs mb-2 line-clamp-2">
            {event.summary}
          </p>
        )}

      {/* Source link */}
      {event.sourceUrl && (
        <a
          href={event.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover
                     transition-colors duration-150 cursor-pointer mt-1"
        >
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
          Source
        </a>
      )}

      {/* Critical badge */}
      {event.isCritical && (
        <span className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded bg-destructive/15 text-destructive text-[10px] font-semibold">
          Critical
        </span>
      )}
    </div>
  );
}
