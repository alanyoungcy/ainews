import { NextResponse } from "next/server";
import { getEditionStatus, markEditionSent } from "@/lib/edition-status.server";

export async function GET() {
  return NextResponse.json(getEditionStatus());
}

export async function POST(request: Request) {
  let stories: Array<{ id: string; title: string; source: string; url: string | null }> = [];
  try {
    const body = await request.json() as { stories?: Array<{ id?: string; title?: string; source?: string; url?: string | null }> };
    stories = (body.stories ?? []).filter((story): story is { id: string; title: string; source: string; url: string | null } => Boolean(story.id && story.title && story.source)).map((story) => ({ id: story.id, title: story.title, source: story.source, url: story.url ?? null }));
  } catch {
    // Empty POSTs remain valid for callers that only need the weekly sent marker.
  }
  return NextResponse.json(markEditionSent(stories));
}
