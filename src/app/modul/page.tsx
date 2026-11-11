import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ModulIndexPage() {
  redirect("/kelas?from=materi");
}
