import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
  image: string;
  imageAlt: string;
  imageTitle: string;
  imageDescription: string;
  admin?: boolean;
};

export default function AuthShell({ children, image, imageAlt, imageTitle, imageDescription, admin = false }: AuthShellProps) {
  const grid = <div className="auth-shell-grid">
    <section className="auth-shell-form">{children}</section>
    <figure className="auth-shell-photo"><Image src={image} alt={imageAlt} fill priority sizes="(max-width: 767px) 100vw, 50vw" /><figcaption><h2>{imageTitle}</h2><p>{imageDescription}</p></figcaption></figure>
  </div>;

  return <main className={`workbook-auth auth-shell-main${admin ? " auth-admin-shell" : ""}`}>
    {admin && <div className="site-background" aria-hidden="true" />}
    {admin ? <div className="auth-admin-layout">
      <header className="auth-admin-header"><Link href="/" aria-label="Sapen English Village, kembali ke beranda"><Image src="/sapen-english-village-logo.jpg" alt="Sapen English Village" width={651} height={453} priority /></Link><Link href="/" className="auth-back-link">← Kembali ke beranda</Link></header>
      {grid}
    </div> : grid}
  </main>;
}
