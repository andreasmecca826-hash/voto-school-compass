import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type AssistantMarkdownProps = {
  text: string;
  className?: string;
};

const components: Components = {
  p: ({ children }) => <p className="my-2 whitespace-normal first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  h1: ({ children }) => <h1 className="mb-2 mt-3 text-base font-semibold">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-3 text-sm font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-semibold">{children}</h3>,
  a: ({ children, href }) =>
    href ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-border pl-3 text-muted-foreground">
      {children}
    </blockquote>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-muted/60 p-2 text-xs">{children}</pre>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[0.95em]">{children}</code>
  ),
  table: ({ children }) => (
    <table className="my-2 w-full border-collapse text-left text-xs">{children}</table>
  ),
  th: ({ children }) => (
    <th className="border border-border px-2 py-1 font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
  hr: () => <hr className="my-3 border-border" />,
};

export function AssistantMarkdown({ text, className }: AssistantMarkdownProps) {
  return (
    <div className={`min-w-0 whitespace-normal break-words leading-relaxed ${className ?? ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
