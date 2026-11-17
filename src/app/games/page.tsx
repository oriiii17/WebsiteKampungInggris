import type { Metadata } from "next";
import GameCatalogClient from "@/components/games/GameCatalogClient";

export const metadata: Metadata = { title: "Games Bahasa Inggris | Sapen English", description: "Pilih permainan Bahasa Inggris untuk belajar kosakata, membaca, dan menyusun kalimat." };

export default function GamesPage() { return <GameCatalogClient />; }
