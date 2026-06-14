-- Postgres初回起動時(/docker-entrypoint-initdb.d)に2DBを作成する。
-- 論理分離: marketplace_auth(BFF/Auth.js) と marketplace_domain(API/ドメイン)。
-- スキーマ適用は別途 migrate ワンショットサービスが drizzle で行う。
CREATE DATABASE marketplace_auth;
CREATE DATABASE marketplace_domain;
