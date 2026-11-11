import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function MateriCatalogPage() {
  redirect("/kelas?from=materi");
}
