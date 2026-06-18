// 内部UUIDをユーザー向けの短い参照番号に変換する（例: #A1B2C3D4）。
// 生UUIDをUIに露出しないための共通整形。
export function shortRef(id: string): string {
  const tail = id.replace(/-/g, "").slice(-8).toUpperCase();
  return `#${tail}`;
}
