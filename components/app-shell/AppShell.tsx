"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

const navItems = [
  { href: "/", label: "Weekly edition", icon: "grid" as const },
  { href: "/sources", label: "Sources", icon: "rss" as const },
  { href: "/infographics/operating-model", label: "Infographics", icon: "layers" as const },
  { href: "/archive", label: "Archive", icon: "archive" as const },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <header className="studio-header">
        <div className="studio-header-inner">
          <div className="studio-brand-group">
            <Link className="studio-brand" href="/">
              <span className="studio-mark">C</span>
              <span className="studio-brand-copy"><strong>Capco Intel</strong><small>AI-News Workspace</small></span>
            </Link>
            <div className="studio-divider" />
            <div className="edition-context"><strong>Week 42 Edition: GenAI in Tier-1 Wealth &amp; Banking</strong><span><i />Status: Drafting / HITL Stage 2 of 3</span></div>
          </div>
          <nav className="pipeline-nav" aria-label="Editorial pipeline">
            <Link className={pathname === "/" ? "active" : ""} href="/"><span>01 Triage &amp; Ingestion</span><small>Live</small></Link>
            <Link className={pathname.startsWith("/editions") ? "active" : ""} href="/editions/week-42-2026"><span>02 Editorial Synthesis</span><small>{pathname.startsWith("/editions") ? "Review" : "Ready"}</small></Link>
            <Link className={pathname.startsWith("/infographics") ? "active" : ""} href="/infographics/operating-model"><span>03 Infographic Studio</span><small>{pathname.startsWith("/infographics") ? "Active" : "Next"}</small></Link>
            <Link className={pathname.startsWith("/dispatch") ? "active" : ""} href="/dispatch"><span>04 Dispatch &amp; Newsletter</span><small>{pathname.startsWith("/dispatch") ? "Preview" : "Pending"}</small></Link>
          </nav>
          <div className="studio-actions">
            <div className="edition-chip"><span>Edition:</span><strong>W42-2026</strong><Icon name="chevron" size={14} /></div>
            <span className="autosave-status"><Icon name="refresh" size={13} /> Auto-saved</span>
            <Link className="quick-export" href="/dispatch"><Icon name="download" size={14} /> Quick Export Brief</Link>
            <div className="studio-user"><span className="studio-user-copy"><strong>Alex Young</strong><small>Editorial lead</small></span><span className="studio-avatar">AY</span></div>
          </div>
        </div>
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
}
