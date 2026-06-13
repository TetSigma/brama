import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

type MarkdownProps = {
  children: string
}

/** Renders model/retrieved markdown. Sanitized — output is untrusted (D5 guardrails). */
export function Markdown({ children }: MarkdownProps) {
  return (
    <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:mt-0 [&_p]:mb-[var(--space-3)]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
