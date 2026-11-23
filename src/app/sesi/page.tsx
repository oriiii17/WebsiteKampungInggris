import ClassSessionCodeClient from "@/components/ClassSessionCodeClient";
import { publicPageMetadata } from "@/lib/site";

export const metadata = publicPageMetadata({
  title: "Gabung Sesi Belajar Bahasa Inggris",
  description: "Masukkan kode sesi untuk bergabung dengan kegiatan belajar Kampung Inggris Sapen. Ikuti kuis dan presensi sesuai arahan pengajar.",
  pathname: "/sesi",
});

export default function ClassSessionCodePage() { return <ClassSessionCodeClient />; }
