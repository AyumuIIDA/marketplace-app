// ABO fetch + seed。selected.json を消費して domain DB と storage を満たす。
//   各image: S3 original を取得 → 1024px縮小 → sha256 → storage put → listing_images へ
//   各listing: users(seller) / listings / listing_images を挿入（再実行で前回seedを置換）
// 実行(host例):
//   DATABASE_URL=postgres://app:app@localhost:5432/marketplace_domain \
//   STORAGE_EMULATOR_HOST=http://localhost:4443 STORAGE_BUCKET=marketplace-images \
//   PUBLIC_IMAGE_BASE_URL=http://localhost:4443/marketplace-images \
//   node scripts/seed-abo.mjs
import fs from "node:fs";
import crypto from "node:crypto";
import pg from "pg";
import sharp from "sharp";
import { Storage } from "@google-cloud/storage";

const SELECTED = "/home/iayu6/myapp/data/abo/selected.json";
const S3_BASE = "https://amazon-berkeley-objects.s3.amazonaws.com/images/original/";
const BUCKET = process.env.STORAGE_BUCKET || "marketplace-images";
const PUBLIC_BASE = process.env.PUBLIC_IMAGE_BASE_URL || "http://localhost:4443/marketplace-images";
const CONCURRENCY = 8;

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function hash32(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
  }));
  return out;
}

const storage = new Storage({ projectId: "marketplace-local" });
async function ensureBucket() {
  // SDKのcreateBucketはemulatorで不安定なため、GCS JSON APIで直接作成（既存なら無視）。
  const host = process.env.STORAGE_EMULATOR_HOST || "http://localhost:4443";
  try {
    await fetch(`${host}/storage/v1/b?project=marketplace-local`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: BUCKET }),
    });
  } catch { /* ignore */ }
}
async function putImage(key, buf) {
  await storage.bucket(BUCKET).file(key).save(buf, { contentType: "image/jpeg", resumable: false });
}

async function fetchBuf(url, tries = 3) {
  for (let t = 0; t < tries; t++) {
    try {
      const r = await fetch(url);
      if (r.ok) return Buffer.from(await r.arrayBuffer());
      if (r.status === 404) return null;
    } catch { /* 一時エラー→リトライ */ }
    await new Promise((s) => setTimeout(s, 300 * (t + 1)));
  }
  return null;
}

async function processImage(task) {
  try {
    const src = await fetchBuf(S3_BASE + task.path);
    if (!src) return null;
    const out = await sharp(src).resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    const hash = crypto.createHash("sha256").update(out).digest("hex");
    const key = `listings/${hash}.jpg`;
    await putImage(key, out);
    return { item_id: task.item_id, sort_order: task.sort_order, url: `${PUBLIC_BASE}/${key}`, hash };
  } catch (e) {
    console.error("image failed", task.path, String(e).slice(0, 80));
    return null;
  }
}

async function main() {
  const listings = JSON.parse(fs.readFileSync(SELECTED, "utf8"));
  await ensureBucket();

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // 1) sellers upsert
  const sellerNames = [...new Set(listings.map((l) => l.seller_key))];
  const sellerId = new Map();
  for (const name of sellerNames) {
    const email = `${slug(name)}@demo.local`;
    const verified = hash32(name) % 2 === 0 ? new Date() : null;
    const r = await client.query(
      `INSERT INTO users (display_name, email, human_verified_at) VALUES ($1,$2,$3)
       ON CONFLICT (email) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id`,
      [name, email, verified],
    );
    sellerId.set(name, r.rows[0].id);
  }
  const ids = [...sellerId.values()];

  // 3) 画像処理（fetch→縮小→hash→put）concurrency
  const tasks = listings.flatMap((l) => l.images.map((im) => ({ item_id: l.item_id, path: im.path, sort_order: im.sort_order })));
  console.log(`processing ${tasks.length} images (concurrency ${CONCURRENCY})...`);
  const processed = (await pool(tasks, CONCURRENCY, processImage)).filter(Boolean);
  const imgByItem = new Map();
  for (const p of processed) { if (!imgByItem.has(p.item_id)) imgByItem.set(p.item_id, []); imgByItem.get(p.item_id).push(p); }
  console.log(`images ok: ${processed.length}/${tasks.length}`);

  // 取りこぼし保護: 画像が全滅したら既存データを消さず中断（reset は成功確認後にのみ実行）。
  if (processed.length === 0) {
    await client.end();
    throw new Error("no images processed (network?). aborting WITHOUT touching existing data.");
  }

  // 前回seed(demo seller分)を置換（画像取得に成功した今だけ実施）
  await client.query(`DELETE FROM listing_images WHERE listing_id IN (SELECT id FROM listings WHERE seller_id = ANY($1))`, [ids]);
  await client.query(`DELETE FROM listings WHERE seller_id = ANY($1)`, [ids]);

  // 4) listings + listing_images 挿入（画像が1枚以上ある物のみ）
  let nListings = 0, nImages = 0, skipped = 0;
  for (const l of listings) {
    const imgs = (imgByItem.get(l.item_id) || []).sort((a, b) => a.sort_order - b.sort_order);
    if (imgs.length === 0) { skipped++; continue; }
    const publishedAt = l.status === "PUBLISHED" ? new Date() : null;
    const r = await client.query(
      `INSERT INTO listings (seller_id,title,description,price,currency,category,condition,status,published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [sellerId.get(l.seller_key), l.title, l.description, l.price, l.currency, l.category, l.condition, l.status, publishedAt],
    );
    const lid = r.rows[0].id;
    nListings++;
    for (let i = 0; i < imgs.length; i++) {
      await client.query(
        `INSERT INTO listing_images (listing_id,url,image_hash,sort_order) VALUES ($1,$2,$3,$4)`,
        [lid, imgs[i].url, imgs[i].hash, i],
      );
      nImages++;
    }
  }

  await client.end();
  console.log(`DONE: sellers=${sellerNames.length} listings=${nListings} images=${nImages} skipped(no image)=${skipped}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
