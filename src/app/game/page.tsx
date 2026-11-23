import { redirect } from "next/navigation";

export default function LegacyGameIndexPage() {
  redirect("/games");
}
