// 一覧の shuffle（おすすめ順）を「セッション内で一貫」させるための seed クッキー名。
// 値は middleware が初回アクセス時に発行し、ブラウザを閉じるまで保持される（セッションクッキー）。
// 同じ seed＝同じ並び順なので、リロードしても商品が出たり消えたりしない（ページングも安定）。
export const FEED_SEED_COOKIE = "feed_seed";
