// ABO選定スクリプト（Stage 0-5）。
//   入力: data/abo/meta/{images.csv, listings_*.json}
//   出力: data/abo/selected.json（投入用マニフェスト）
// 方針: en/ja を持つ商品を母集団に、12カテゴリへ写像し、解像度フィルタ＋層化サンプリング
//       （ja優先確保 + 段階キャップ）で選ぶ。price/conditionは item_id seed で決定論合成。
import fs from "node:fs";
import path from "node:path";

const META = "/home/iayu6/myapp/data/abo/meta";
const OUT = "/home/iayu6/myapp/data/abo/selected.json";
const RES_MIN = 1024; // main画像の最小辺(px)。粗い原画を除外。

// product_type → 自前カテゴリコード（= i18n category.* キー）
const CATEGORY_MAP = {
  SHOES: "shoes", BOOT: "shoes", SANDAL: "shoes",
  FINERING: "jewelry", FINEEARRING: "jewelry", FINENECKLACEBRACELETANKLET: "jewelry",
  EARRING: "jewelry", NECKLACE: "jewelry", RING: "jewelry",
  HANDBAG: "bags_accessories", SUITCASE: "bags_accessories", ACCESSORY: "bags_accessories", HAT: "bags_accessories",
  CHAIR: "furniture", SOFA: "furniture", TABLE: "furniture", STOOL_SEATING: "furniture", OTTOMAN: "furniture", HEADBOARD: "furniture",
  HOME: "home_decor", HOME_FURNITURE_AND_DECOR: "home_decor", WALL_ART: "home_decor", RUG: "home_decor",
  HOME_BED_AND_BATH: "bedding_bath", FLAT_SHEET: "bedding_bath",
  LAMP: "lighting", LIGHT_FIXTURE: "lighting", LIGHT_BULB: "lighting",
  KITCHEN: "kitchen", DRINKING_CUP: "kitchen", FOOD_SERVICE_SUPPLY: "kitchen",
  CELLULAR_PHONE_CASE: "phone_accessories", PORTABLE_ELECTRONIC_DEVICE_COVER: "phone_accessories",
  BEAUTY: "beauty_health", HEALTH_PERSONAL_CARE: "beauty_health",
  GROCERY: "grocery",
  PET_SUPPLIES: "pet_office_sports", OFFICE_PRODUCTS: "pet_office_sports",
  SPORTING_GOODS: "pet_office_sports", OUTDOOR_LIVING: "pet_office_sports", TOOLS: "pet_office_sports",
};

// カテゴリ上限。バランス重視で全カテゴリ一律1500（母集団がこれ未満ならその全件）。
const CAP = {
  shoes: 1500, jewelry: 1500, bags_accessories: 1500, furniture: 1500,
  home_decor: 1500, lighting: 1500, kitchen: 1500, bedding_bath: 1500,
  phone_accessories: 1500, grocery: 1500, beauty_health: 1500, pet_office_sports: 1500,
};

// JPY価格レンジ
const PRICE = {
  shoes: [2500, 18000], jewelry: [4000, 60000], bags_accessories: [2000, 25000], furniture: [6000, 80000],
  home_decor: [1500, 30000], bedding_bath: [2000, 15000], lighting: [2000, 20000], kitchen: [1000, 12000],
  phone_accessories: [800, 3500], beauty_health: [800, 8000], grocery: [500, 5000], pet_office_sports: [1000, 15000],
};

// 中古市場らしい状態分布（累積）
const CONDITIONS = [
  ["new", 0.12], ["like_new", 0.32], ["good", 0.34], ["fair", 0.16], ["poor", 0.06],
];

const SELLERS = [
  "Aoi Tanaka", "Ken Sato", "Mika Studio", "North Desk", "Loop Supply", "Sound Table",
  "Haruki Mori", "Yuki Ito", "Atelier Grid", "Key Works", "Sora Goods", "Rin Market",
  "Daichi Lab", "Nao Collective",
];

const LANG_PRIORITY = ["ja_JP", "en_US", "en_GB", "en_CA", "en_AU", "en_IN"];

// --- helpers ---
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
// item_id seed の決定論 [0,1)
function rand(seed, salt) {
  return (hash(seed + ":" + salt) % 100000) / 100000;
}
function pickLang(itemName) {
  const tags = (itemName || []).map((n) => n.language_tag);
  for (const p of LANG_PRIORITY) if (tags.includes(p)) return p;
  const en = tags.find((t) => /^en/.test(t));
  return en ?? null;
}
function valueFor(arr, lang) {
  if (!arr) return null;
  const exact = arr.find((e) => e.language_tag === lang);
  if (exact) return exact.value;
  const sameBase = arr.find((e) => e.language_tag?.slice(0, 2) === lang.slice(0, 2));
  return sameBase?.value ?? arr[0]?.value ?? null;
}
function synthCondition(seed) {
  const r = rand(seed, "cond");
  let acc = 0;
  for (const [c, w] of CONDITIONS) {
    acc += w;
    if (r <= acc) return c;
  }
  return "good";
}
function synthPrice(seed, cat) {
  const [lo, hi] = PRICE[cat];
  const p = lo + rand(seed, "price") * (hi - lo);
  return Math.max(lo, Math.round(p / 100) * 100);
}

// --- Stage 0: images.csv → dims ---
const dim = new Map();
{
  const csv = fs.readFileSync(path.join(META, "images.csv"), "utf8").split("\n");
  for (let i = 1; i < csv.length; i++) {
    const c = csv[i].split(",");
    if (c.length < 4) continue;
    dim.set(c[0], { h: +c[1], w: +c[2], path: c[3], min: Math.min(+c[1], +c[2]) });
  }
}

// --- Stage 1-2: candidates ---
const shards = fs.readdirSync(META).filter((f) => /^listings_\d+\.json$/.test(f));
const byCat = new Map(); // cat -> candidate[]
let scanned = 0;
for (const f of shards) {
  for (const line of fs.readFileSync(path.join(META, f), "utf8").split("\n")) {
    if (!line) continue;
    scanned++;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    const pt = r.product_type?.[0]?.value;
    const cat = CATEGORY_MAP[pt];
    if (!cat) continue;
    const lang = pickLang(r.item_name);
    if (!lang) continue; // en/ja を持たない → 除外
    const main = dim.get(r.main_image_id);
    if (!main || main.min < RES_MIN) continue; // 解像度フィルタ
    const title = (valueFor(r.item_name, lang) || "").trim().slice(0, 200);
    if (!title) continue;
    const bullets = (r.bullet_point || []).filter((b) => b.language_tag === lang).map((b) => b.value);
    const description =
      bullets.length > 0
        ? bullets.join(" / ").slice(0, 1200)
        : [valueFor(r.brand, lang), valueFor(r.color, lang), title].filter(Boolean).join(" / ");
    // 追加画像（解像度>=768でmainと別なら1枚まで）
    const extra = [];
    for (const id of r.other_image_id || []) {
      if (id === r.main_image_id) continue;
      const d = dim.get(id);
      if (d && d.min >= 768) { extra.push({ image_id: id, path: d.path, h: d.h, w: d.w }); break; }
    }
    const cand = {
      item_id: r.item_id,
      lang: lang === "ja_JP" ? "ja" : "en",
      isJa: lang === "ja_JP",
      title,
      description,
      category: cat,
      product_type: pt,
      images: [{ image_id: r.main_image_id, path: main.path, h: main.h, w: main.w }, ...extra],
      _res: main.min,
      _rich: bullets.length + (valueFor(r.brand, lang) ? 1 : 0),
    };
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(cand);
  }
}

// --- Stage 3: 層化サンプリング（ja優先 + キャップ）---
const selected = [];
const summary = {};
for (const [cat, cands] of byCat) {
  const cap = CAP[cat] ?? 1500;
  const score = (c) => c._res + c._rich * 200; // 解像度 + テキスト充実
  const ja = cands.filter((c) => c.isJa).sort((a, b) => score(b) - score(a));
  const en = cands.filter((c) => !c.isJa).sort((a, b) => score(b) - score(a));
  const take = [...ja.slice(0, cap), ...en].slice(0, cap); // ja優先で詰め、残りをenで
  summary[cat] = { total: cands.length, picked: take.length, ja: take.filter((c) => c.isJa).length };
  selected.push(...take);
}

// --- Stage 4: 合成・割当 ---
const out = selected.map((c, i) => {
  const seller = SELLERS[hash(c.item_id) % SELLERS.length];
  const status = rand(c.item_id, "status") < 0.05 ? "DRAFT" : "PUBLISHED";
  return {
    item_id: c.item_id,
    lang: c.lang,
    title: c.title,
    description: c.description,
    category: c.category,
    product_type: c.product_type,
    price: synthPrice(c.item_id, c.category),
    currency: "JPY",
    condition: synthCondition(c.item_id),
    seller_key: seller,
    status,
    images: c.images.map((im, idx) => ({ ...im, sort_order: idx })),
  };
});

// --- Stage 5: 出力 ---
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));

// summary
console.log("scanned records:", scanned, " selected:", out.length);
console.log("category            total  picked  ja  imgs");
let totalImgs = 0;
for (const cat of Object.keys(CAP)) {
  const s = summary[cat] || { total: 0, picked: 0, ja: 0 };
  const imgs = out.filter((o) => o.category === cat).reduce((a, o) => a + o.images.length, 0);
  totalImgs += imgs;
  console.log(cat.padEnd(18), String(s.total).padStart(6), String(s.picked).padStart(6), String(s.ja).padStart(4), String(imgs).padStart(5));
}
console.log("total images to fetch:", totalImgs, " | ja listings:", out.filter((o) => o.lang === "ja").length);
console.log("status:", "PUBLISHED=" + out.filter((o) => o.status === "PUBLISHED").length, "DRAFT=" + out.filter((o) => o.status === "DRAFT").length);
console.log("written:", OUT);
