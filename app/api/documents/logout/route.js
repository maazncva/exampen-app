import { NextResponse } from "next/server";
import { destroyDocSession } from "@/lib/docSession";

export async function POST() {
  await destroyDocSession();
  return NextResponse.json({ ok: true });
}
