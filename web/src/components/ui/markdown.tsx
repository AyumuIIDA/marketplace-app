import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { combineClassNames } from "./class-name";

// LLM応答(Markdown)の安全レンダラ。生HTMLは描画しない(react-markdown既定=XSS安全)。
// 色は継承(text-current)し、light/dark どちらの面でも親の文字色に従う。
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={combineClassNames("space-y-2 text-sm leading-7", className)}>
      <ReactMarkdown
        components={{
          h1: (props) => <h3 className="text-base font-bold" {...props} />,
          h2: (props) => <h3 className="text-base font-bold" {...props} />,
          h3: (props) => <h4 className="text-sm font-bold" {...props} />,
          p: (props) => <p className="leading-7" {...props} />,
          ul: (props) => <ul className="list-disc space-y-1 pl-5" {...props} />,
          ol: (props) => <ol className="list-decimal space-y-1 pl-5" {...props} />,
          li: (props) => <li className="leading-6" {...props} />,
          strong: (props) => <strong className="font-semibold" {...props} />,
          em: (props) => <em className="italic" {...props} />,
          a: (props) => (
            <a className="underline underline-offset-2" rel="noreferrer" target="_blank" {...props} />
          ),
          code: (props) => <code className="rounded bg-current/10 px-1 font-mono text-[0.9em]" {...props} />,
        }}
        remarkPlugins={[remarkGfm]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
