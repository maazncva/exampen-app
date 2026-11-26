import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { requireApprovedDevice } from "@/lib/deviceGuard";
import DocumentViewer from "@/app/documents/DocumentViewer";

export const dynamic = "force-dynamic";

export default async function CoursePdfPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await requireApprovedDevice(supabase, user.id);

  const [{ data: pdf }, { data: enrollment }, { data: profile }] = await Promise.all([
    supabase.from("course_pdfs").select("id, title, course_id").eq("id", params.pdfId).eq("course_id", params.id).maybeSingle(),
    supabase.from("enrollments").select("id").eq("user_id", user.id).eq("course_id", params.id).maybeSingle(),
    supabase.from("profiles").select("email, full_name").eq("id", user.id).single()
  ]);

  if (!pdf) notFound();

  if (!enrollment) {
    return (
      <div className="container">
        <h1>🔒 Not enrolled</h1>
        <p>You don't have access to this course yet. Contact the admin.</p>
        <a href="/" className="btn">Back to courses</a>
      </div>
    );
  }

  const watermarkText = `${profile?.full_name || profile?.email || user.email} — ${new Date().toLocaleDateString()}`;

  return (
    <div className="container">
      <a href={`/course/${params.id}`} style={{ color: "#4f7cff", fontSize: 14 }}>&larr; Back to course</a>
      <h1>{pdf.title}</h1>
      <DocumentViewer coursePdfId={pdf.id} watermarkText={watermarkText} />
    </div>
  );
}
