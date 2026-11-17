import type { GameKind, GameQuestion, GameRecord } from "./types";

const now = () => new Date().toISOString();
const qid = (p: string, i: number) => `${p}-q${i}`;

export function getBuiltinGames(): GameRecord[] {
  const t = now();
  return [
    {
      id: "game-kuis-live",
      title: "Soal Pilihan Ganda",
      kind: "kuis_live",
      description: "Jawab pertanyaan Bahasa Inggris dengan memilih satu dari empat opsi.",
      migratedFromTemplateId: "quick-quiz",
      createdAt: t,
      updatedAt: t,
      questions: [
        { id: qid("kq",1), type:"kuis_live", prompt:"Lengkapi kalimat: 'They ___ playing football in the field.'", options:["is","am","are","be"], correctIndexes:[2], timeLimitSec:15, points:"standard", choiceMode:"single", explanation:"Subjek jamak 'They' berpasangan dengan To Be 'are'." },
        { id: qid("kq",2), type:"kuis_live", prompt:"Frasa yang tepat untuk meminta tolong secara sopan adalah?", options:["Give me that!","Could you please help me?","Help now!","You must help me."], correctIndexes:[1], timeLimitSec:15, points:"standard", choiceMode:"single", explanation:"'Could you please help me?' adalah ungkapan permohonan sopan." },
        { id: qid("kq",3), type:"kuis_live", prompt:"Bentuk lampau (Verb 2) dari kata kerja 'GO' adalah?", options:["Goed","Gone","Went","Going"], correctIndexes:[2], timeLimitSec:15, points:"standard", choiceMode:"single", explanation:"Verb 2 dari 'Go' adalah 'Went'." },
      ],
    },
    {
      id: "game-tebak-kata",
      title: "Tebak Kata (Vocabulary)",
      kind: "tebak_kata",
      description: "Tebak kata Bahasa Inggris dari petunjuk yang diberikan.",
      migratedFromTemplateId: "word-match",
      createdAt: t,
      updatedAt: t,
      questions: [
        { id: qid("tk",1), type:"tebak_kata", prompt:"Kata bahasa Inggris untuk 'Keluarga' adalah?", hint:"Dimulai huruf F", answer:"family", timeLimitSec:20, points:"standard", choiceMode:"single", explanation:"'Family' berarti keluarga." },
      ],
    },
    {
      id: "game-pasangkan-kata",
      title: "Pasangkan Kata (Vocabulary Match)",
      kind: "pasangkan_kata",
      description: "Cocokkan kosakata Bahasa Inggris dengan artinya.",
      migratedFromTemplateId: "word-match",
      createdAt: t,
      updatedAt: t,
      questions: [
        { id: qid("pk",1), type:"pasangkan_kata", prompt:"Pasangkan kata Inggris dengan arti Indonesianya.", pairs:[{left:"Family",right:"Keluarga"},{left:"Farmer",right:"Petani"},{left:"Bed",right:"Tempat tidur"}], timeLimitSec:30, points:"standard", choiceMode:"single", explanation:"Cocokkan pasangan kata yang tepat." },
      ],
    },
    {
      id: "game-susun-kalimat",
      title: "Susun Kalimat (Word Builder)",
      kind: "susun_kalimat",
      description: "Susun kata-kata menjadi kalimat Bahasa Inggris yang benar.",
      migratedFromTemplateId: "word-builder",
      createdAt: t,
      updatedAt: t,
      questions: [
        { id: qid("sk",1), type:"susun_kalimat", prompt:"Susun kata-kata berikut menjadi kalimat yang benar.", words:["He","drinks","water","every","morning","."], sentence:"He drinks water every morning .", timeLimitSec:30, points:"standard", choiceMode:"single", explanation:"Pola: Subject + Verb + Object + Adverb." },
      ],
    },
    {
      id: "game-tebak-gambar",
      title: "Tebak Gambar",
      kind: "tebak_gambar",
      description: "Tebak nama benda dalam Bahasa Inggris dari gambar.",
      createdAt: t,
      updatedAt: t,
      questions: [
        { id: qid("tg",1), type:"tebak_gambar", prompt:"Benda apa ini dalam bahasa Inggris? (petunjuk: tempat tidur)", answer:"bed", acceptAlternatives:["a bed"], options:["Bed","Table","Chair","Door"], timeLimitSec:20, points:"standard", choiceMode:"single", explanation:"'Bed' adalah tempat tidur." },
      ],
    },
    {
      id: "game-kata-hilang",
      title: "Kata Hilang (Fill in the Blank)",
      kind: "kata_hilang",
      description: "Lengkapi kalimat Bahasa Inggris dengan kata yang tepat.",
      createdAt: t,
      updatedAt: t,
      questions: [
        { id: qid("kh",1), type:"kata_hilang", prompt:"Lengkapi kalimat berikut.", sentence:"I ___ to school every day.", answer:"go", acceptAlternatives:["Go"], options:["go","goes","going","went"], timeLimitSec:20, points:"standard", choiceMode:"single", explanation:"Subjek 'I' memakai verb 1: go." },
      ],
    },
    {
      id: "game-duel-kata-cepat",
      title: "Duel Kata Cepat",
      kind: "duel_kata_cepat",
      description: "Jawab petunjuk kosakata dengan cepat dan tepat.",
      migratedFromTemplateId: "quick-quiz",
      createdAt: t,
      updatedAt: t,
      questions: [
        { id: qid("dk",1), type:"duel_kata_cepat", prompt:"Ketik arti 'Terima kasih' dalam bahasa Inggris!", hint:"Dua kata, diawali T", answer:"thank you", acceptAlternatives:["thanks","thankyou"], timeLimitSec:10, points:"standard", choiceMode:"single", explanation:"'Thank you' berarti terima kasih." },
      ],
    },
  ];
}

export function emptyQuestion(kind: GameKind, id: string): GameQuestion {
  const base = { id, prompt: "", timeLimitSec: 20, points: "standard" as const, choiceMode: "single" as const, explanation: "" };
  switch (kind) {
    case "kuis_live": return { ...base, type:"kuis_live", options:["","","",""], correctIndexes:[0] };
    case "tebak_kata": return { ...base, type:"tebak_kata", answer:"", hint:"", acceptAlternatives:[] };
    case "pasangkan_kata": return { ...base, type:"pasangkan_kata", pairs:[{left:"",right:""},{left:"",right:""}] };
    case "susun_kalimat": return { ...base, type:"susun_kalimat", words:[""], sentence:"" };
    case "tebak_gambar": return { ...base, type:"tebak_gambar", answer:"", options:["","","",""], acceptAlternatives:[] };
    case "kata_hilang": return { ...base, type:"kata_hilang", sentence:"", answer:"", options:["","","",""], acceptAlternatives:[] };
    case "duel_kata_cepat": return { ...base, type:"duel_kata_cepat", answer:"", hint:"", acceptAlternatives:[] };
  }
}
