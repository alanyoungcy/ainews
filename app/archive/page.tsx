import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";
import { Icon } from "@/components/ui/Icon";

const editions = [
  { period: "01–07 September 2026", title: "The infrastructure week", stories: 5, status: "Published", confidence: "91%" },
  { period: "25–31 August 2026", title: "Trust becomes a product feature", stories: 4, status: "Published", confidence: "88%" },
  { period: "18–24 August 2026", title: "The new shape of the AI stack", stories: 6, status: "Published", confidence: "86%" },
  { period: "11–17 August 2026", title: "From pilots to patterns", stories: 4, status: "Published", confidence: "90%" },
];

export default function ArchivePage() {
  return <AppShell><header className="topbar"><div><div className="topbar-kicker">Archive</div><div className="topbar-period">Previous editions</div></div><div className="topbar-actions"><button className="button ghost small"><Icon name="download" size={15} />Export archive</button></div></header><div className="page-wrap archive-page"><div className="review-heading"><div><div className="section-kicker">Archive / editorial memory</div><h1>Keep the thread</h1><p>Revisit published editions, source confidence, and the narratives that shaped the last six weeks.</p></div></div><div className="archive-list">{editions.map((item, index) => <Link href={`/editions/archive-${index}`} className="archive-row panel" key={item.period}><div className="archive-date"><span>W{38 - index}</span><strong>{item.period}</strong></div><div className="archive-title"><h2>{item.title}</h2><span>{item.stories} stories · grounded edition</span></div><div className="archive-confidence"><span>Confidence</span><strong>{item.confidence}</strong></div><div className="archive-status"><span className="source-status healthy"><i />{item.status}</span><Icon name="arrow" size={18} /></div></Link>)}</div><div className="archive-note"><div className="archive-note-mark">↗</div><div><strong>Want to compare the narrative?</strong><p>Use the archive to spot recurring themes before the next editorial review.</p></div></div></div></AppShell>;
}
