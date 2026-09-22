type IconName = "grid" | "rss" | "layers" | "archive" | "settings" | "arrow" | "chevron" | "spark" | "mail" | "check" | "plus" | "search" | "download" | "refresh" | "close" | "external" | "alert";

export function Icon({ name, size = 18, stroke = 1.7 }: { name: IconName; size?: number; stroke?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, 'aria-hidden': true };
  switch (name) {
    case "grid": return <svg {...common}><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></svg>;
    case "rss": return <svg {...common}><path d="M5 19h.01"/><path d="M5 12a7 7 0 0 1 7 7"/><path d="M5 5a14 14 0 0 1 14 14"/></svg>;
    case "layers": return <svg {...common}><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></svg>;
    case "archive": return <svg {...common}><path d="M4 7h16v13H4z"/><path d="M3 4h18v3H3z"/><path d="M9 12h6"/></svg>;
    case "settings": return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05-1.42 1.42-.05-.05a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V20h-2v-.31a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-1.98.36l-.05.05-1.42-1.42.05-.05A1.8 1.8 0 0 0 9.1 15a1.8 1.8 0 0 0-1.65-1.1H7v-2h.31A1.8 1.8 0 0 0 8.96 10a1.8 1.8 0 0 0-.36-1.98l-.05-.05 1.42-1.42.05.05A1.8 1.8 0 0 0 12 7.04a1.8 1.8 0 0 0 1.1-1.65V5h2v.31A1.8 1.8 0 0 0 16.2 6.96a1.8 1.8 0 0 0 1.98-.36l.05-.05 1.42 1.42-.05.05A1.8 1.8 0 0 0 19.24 10a1.8 1.8 0 0 0 1.65 1.1H21v2h-.31A1.8 1.8 0 0 0 19.4 15Z"/></svg>;
    case "arrow": return <svg {...common}><path d="M5 12h13"/><path d="m13 6 6 6-6 6"/></svg>;
    case "chevron": return <svg {...common}><path d="m8 10 4 4 4-4"/></svg>;
    case "spark": return <svg {...common}><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z"/></svg>;
    case "mail": return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>;
    case "check": return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;
    case "plus": return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case "search": return <svg {...common}><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>;
    case "download": return <svg {...common}><path d="M12 4v11"/><path d="m8 11 4 4 4-4"/><path d="M5 20h14"/></svg>;
    case "refresh": return <svg {...common}><path d="M20 11a8 8 0 0 0-14.9-4L3 10"/><path d="M3 4v6h6"/><path d="M4 13a8 8 0 0 0 14.9 4L21 14"/><path d="M21 20v-6h-6"/></svg>;
    case "close": return <svg {...common}><path d="m6 6 12 12M18 6 6 18"/></svg>;
    case "external": return <svg {...common}><path d="M14 5h5v5"/><path d="m19 5-8 8"/><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>;
    case "alert": return <svg {...common}><path d="M12 4 3.5 19h17L12 4Z"/><path d="M12 9v4"/><path d="M12 16h.01"/></svg>;
  }
}
