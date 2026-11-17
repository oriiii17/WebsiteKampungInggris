import Image from "next/image";

export default function CommunityIllustrationPanel({
  title,
  description,
  image = "/assets/WhatsApp Image 2026-11-17 at 04.41.05.jpg",
}: {
  title: string;
  description: string;
  image?: string;
}) {
  return (
    <aside className="auth-illustration-panel illustration-frame">
      <div className="auth-illustration-art">
        <Image
          src={image}
          alt="Warga Sapen belajar Bahasa Inggris bersama di ruang terbuka"
          fill
          priority
          sizes="(max-width: 899px) 100vw, 46vw"
          className="object-cover"
        />
      </div>
      <div className="auth-illustration-copy">
        <p className="workbook-print-note">Sapen English · ruang belajar bersama</p>
        <h2 className="mt-2 text-2xl sm:text-3xl">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-body">{description}</p>
      </div>
    </aside>
  );
}
