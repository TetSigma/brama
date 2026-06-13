import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

type MarkdownProps = {
  children: string
}

/** Renders model/retrieved markdown. Sanitized — output is untrusted (D5 guardrails). */
export function Markdown({ children }: MarkdownProps) {
  return (
    <div className="chat-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
