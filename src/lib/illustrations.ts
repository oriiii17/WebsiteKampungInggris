export function classIllustration(title: string, index = 0) {
  const label = title.toLocaleLowerCase("id-ID");
  if (/grammar|tata bahasa|kalimat/.test(label)) return "/images/cover-grammar.svg";
  if (/reading|baca|literasi|cerita/.test(label)) return "/images/cover-reading.svg";
  if (/conversation|percakapan|speaking|bicara/.test(label)) return "/images/cover-conversation.svg";
  return ["/images/cover-conversation.svg", "/images/cover-grammar.svg", "/images/cover-reading.svg"][index % 3];
}

export function gameIllustration(gameId: string) {
  const id = gameId.toLocaleLowerCase("id-ID");
  if (id.includes("time")) return "/images/game-time.svg";
  if (id.includes("match")) return "/images/game-match.svg";
  if (id.includes("builder")) return "/images/game-builder.svg";
  if (id.includes("story")) return "/images/game-story.svg";
  if (id.includes("pin")) return "/images/game-pin.svg";
  return "/images/game-quiz.svg";
}
