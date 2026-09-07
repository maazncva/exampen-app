"use client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/documents/logout", { method: "POST" });
    router.push("/documents/login");
    router.refresh();
  }
  return (
    <button className="btn-secondary" onClick={logout}>
      Log out
    </button>
  );
}
