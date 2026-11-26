import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { getSignedPdfUrl } from "@/lib/bunnyStorage";

// Given a course PDF id, returns a short-lived signed Bunny URL -- but ONLY
// after re-checking (server-side, from the database) that the logged-in user
// is enrolled in the course that PDF belongs to. Same rule as video lessons.
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { pdfId } = await req.json();
  if (!pdfId) return NextResponse.json({ error: "pdfId required" }, { status: 400 });

  const { data: pdf } = await supabase.from("course_pdfs").select("*").eq("id", pdfId).single();
  if (!pdf) return NextResponse.json({ error: "PDF not found" }, { status: 404 });

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", pdf.course_id)
    .maybeSingle();

  if (!enrollment) return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 });

  try {
    const url = getSignedPdfUrl(pdf.storage_path);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
