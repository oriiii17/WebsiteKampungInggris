import { notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import TellingTimeGame from "@/components/games/TellingTimeGame";
import WordMatchGame from "@/components/games/WordMatchGame";
import WordBuilderGame from "@/components/games/WordBuilderGame";
import StoryQuestGame from "@/components/games/StoryQuestGame";
import QuickQuizGame from "@/components/games/QuickQuizGame";

const VALID_GAME_IDS = [
  "telling-time",
  "word-match",
  "word-builder",
  "story-quest",
  "quick-quiz",
] as const;

type GameId = (typeof VALID_GAME_IDS)[number];

interface Props {
  params: Promise<{ gameId: string }>;
}

export default async function GameDetailPage({ params }: Props) {
  const { gameId } = await params;
  const session = await getServerSession();

  if (!VALID_GAME_IDS.includes(gameId as GameId)) {
    notFound();
  }

  const game = gameId as GameId;

  return (
    <div className="workbook-page min-h-screen pb-24 md:pb-12">
      {game === "telling-time" && <TellingTimeGame session={session} />}
      {game === "word-match" && <WordMatchGame session={session} />}
      {game === "word-builder" && <WordBuilderGame session={session} />}
      {game === "story-quest" && <StoryQuestGame session={session} />}
      {game === "quick-quiz" && <QuickQuizGame session={session} />}
    </div>
  );
}

export async function generateStaticParams() {
  return VALID_GAME_IDS.map((gameId) => ({ gameId }));
}
