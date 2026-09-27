import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-zinc max-w-none text-[15px] leading-relaxed dark:prose-invert prose-p:my-2 prose-ol:my-2 prose-ul:my-2 prose-li:my-0.5 prose-pre:rounded-xl prose-pre:bg-zinc-900 prose-a:text-brand-600 dark:prose-a:text-brand-400">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Model output can contain links; open them safely in a new tab.
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
