const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

try {
  if (typeof process.loadEnvFile !== "function") {
    throw new Error("Versi Node.js tidak mendukung process.loadEnvFile().");
  }
  process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
} catch (error) {
  console.error(`Gagal memuat .env.local: ${error.message}`);
  process.exit(1);
}

function chapterCount(item) {
  if (Array.isArray(item.modules)) return item.modules.length;
  if (Array.isArray(item.moduleIds)) return item.moduleIds.length;
  if (Array.isArray(item.materi)) return item.materi.length;
  return 0;
}

async function main() {
  const backupPath = path.resolve(process.cwd(), ".data", "db.json.bak");
  const currentPath = path.resolve(process.cwd(), ".data", "db.json");
  const snapshotPath = fs.existsSync(backupPath) ? backupPath : currentPath;
  if (!fs.existsSync(snapshotPath)) {
    throw new Error("Snapshot .data/db.json.bak maupun .data/db.json tidak ditemukan.");
  }

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const localClasses = Array.isArray(snapshot.classes) ? snapshot.classes : [];
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!projectUrl || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.");
  }

  const supabase = createClient(projectUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: remoteClasses, error } = await supabase
    .from("classes")
    .select("id, slug, title, price_idr, status");
  if (error) throw new Error(`Gagal membaca kelas dari Supabase (${error.code || "query error"}).`);

  const remote = remoteClasses || [];
  const remoteIds = new Set(remote.map((item) => String(item.id)));
  const localOnly = localClasses
    .filter((item) => !remoteIds.has(String(item.id)))
    .map((item) => ({
      id: item.id,
      judul: item.title || "",
      harga: Number(item.priceIdr ?? item.price_idr ?? 0),
      status: item.status || (item.isPublished === false ? "draft" : "terbit"),
      jumlah_bab: chapterCount(item),
    }));

  console.log(`Snapshot lokal: ${path.basename(snapshotPath)}`);
  console.log("(a) Kelas di snapshot lokal yang tidak ada di Supabase");
  console.table(localOnly);
  console.log("(b) Kelas di Supabase");
  console.table(remote.map((item) => ({
    id: item.id,
    slug: item.slug,
    judul: item.title,
    harga: item.price_idr,
    status: item.status,
  })));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
