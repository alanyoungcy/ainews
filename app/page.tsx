import { AppShell } from "@/components/app-shell/AppShell";
import { CommandCenter } from "@/components/dashboard/CommandCenter";
import { getTrendRadarFeed } from "@/lib/trendradar";

export default function HomePage() {
  return <AppShell><CommandCenter trendRadar={getTrendRadarFeed()} /></AppShell>;
}
