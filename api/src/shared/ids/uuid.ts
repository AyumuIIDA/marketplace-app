// 検証済みUUIDを表す branded type。生stringと型で区別し、未検証値がDBクエリへ届くのを防ぐ。
// `Uuid` を作る入口は parseUuid（検証）と IdGenerator.newId（生成）のみに限定する。
declare const uuidBrand: unique symbol;
export type Uuid = string & { readonly [uuidBrand]: true };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 型ガード兼用。narrowing が効く。
export function isUuid(value: string): value is Uuid {
  return UUID_RE.test(value);
}

// 検証して branded 値を返す唯一の parser。不正形式は undefined（呼び出し側が方針で扱う）。
export function parseUuid(value: string): Uuid | undefined {
  return isUuid(value) ? value : undefined;
}
