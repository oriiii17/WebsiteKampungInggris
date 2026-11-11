import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function BelajarSlugPage() {
  redirect("/kelas?from=materi");
}
