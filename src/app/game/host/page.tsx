import { redirect } from "next/navigation";

export default function LegacyGameHostPage() {
  redirect("/admin?tab=sessions");
}
