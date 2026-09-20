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
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">C</div>
          <div>
            <div className="brand-name">Capco</div>
            <div className="brand-subtitle">AI intelligence</div>
          </div>
        </div>
        <div className="sidebar-rule" />
        <nav className="side-nav" aria-label="Primary navigation">
          <div className="side-nav-label">Workspace</div>
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return <Link className={`side-link ${active ? "active" : ""}`} href={item.href} key={item.href}><Icon name={item.icon} size={17} /><span>{item.label}</span>{active && <span className="active-dot" />}</Link>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-nav-label">System</div>
          <Link className={`side-link ${pathname === "/settings" ? "active" : ""}`} href="/settings"><Icon name="settings" size={17} /><span>Settings</span></Link>
          <div className="profile-card"><div className="avatar">AY</div><div><div className="profile-name">Alex Young</div><div className="profile-role">Editorial lead</div></div><Icon name="chevron" size={15} /></div>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
