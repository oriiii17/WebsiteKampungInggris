import BlueprintGameClient from "@/components/games/BlueprintGameClient";

export default async function BlueprintGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  return <BlueprintGameClient gameId={gameId} />;
}
