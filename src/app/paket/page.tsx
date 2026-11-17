import { redirect } from "next/navigation";

/** Alamat lama dipertahankan sebagai pengalihan dari paket ke katalog kelas individual. */
export default function PaketPage() {
  redirect("/kelas");
}
