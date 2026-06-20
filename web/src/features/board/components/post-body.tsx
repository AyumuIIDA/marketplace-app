import { combineClassNames } from "../../../components/ui/class-name";

type PostBodyProps = {
  body: string;
  className?: string;
};

/*
  本文。改行/空行は pre-wrap でそのまま保持し、2ch の象徴であるレスアンカー ">>N" だけを
  #pN へのリンクに変換する（朱で示し、過度な装飾はしない）。
*/
export function PostBody({ body, className }: PostBodyProps) {
  const parts = body.split(/(>>\d+)/g);

  return (
    <div className={combineClassNames("whitespace-pre-wrap break-words text-sm leading-7 text-ink", className)}>
      {parts.map((part, index) => {
        const match = /^>>(\d+)$/.exec(part);
        if (match) {
          return (
            <a className="font-mono font-medium text-seal hover:underline" href={`#p${match[1]}`} key={index}>
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
}
