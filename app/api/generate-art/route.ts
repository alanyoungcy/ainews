import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ status: "generated", variantId: "variant-02", output: "/generated/operating-model-variant-02.svg" });
}
