import { Seal } from "../../../components/ui/seal";
import { shortRef } from "../../../lib/format/id";

type PostMetaProps = {
  // スレ内のレス番号（No.N）。一覧では省略する。
  index?: number;
  authorId: string;
  authorName: string;
  authorVerified: boolean;
  verifiedLabel: string;
  nameLabel: string;
  date: string;
};

/*
  2ch の「名前欄」を踏襲した等幅の登録行。No.→名前→本人印→ID→日時 を一行に詰める。
  検証済みは朱印(Seal)を本人証として押す（緑名ではなく当サイトの朱で統一）。実IDハッシュが
  テキストボードらしさと「誰が書いたか」を同時に担う。
*/
export function PostMeta({ authorId, authorName, authorVerified, date, index, nameLabel, verifiedLabel }: PostMetaProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] leading-none text-ink-faint">
      {index !== undefined && <span className="font-bold text-seal">No.{index}</span>}
      <span>
        <span className="text-ink-faint">{nameLabel}: </span>
        <span className="font-medium text-ink-soft">{authorName}</span>
      </span>
      {authorVerified && <Seal label={verifiedLabel} size="xs" />}
      <span>ID:{shortRef(authorId)}</span>
      <span>{date}</span>
    </div>
  );
}
