import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

type MarkdownProps = {
  content?: string | null
  className?: string
}

export function Markdown({ content, className }: MarkdownProps) {
  if (!content) return null

  return (
    <div className={cn("space-y-3 text-sm leading-6", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1 className="text-xl font-semibold tracking-tight" {...props} />
          ),
          h2: (props) => (
            <h2 className="text-lg font-semibold tracking-tight" {...props} />
          ),
          h3: (props) => (
            <h3 className="text-base font-semibold tracking-tight" {...props} />
          ),
          p: (props) => (
            <p className="whitespace-pre-wrap text-sm leading-6" {...props} />
          ),
          ul: (props) => <ul className="list-disc pl-5" {...props} />,
          ol: (props) => <ol className="list-decimal pl-5" {...props} />,
          li: (props) => <li className="mt-1" {...props} />,
          blockquote: (props) => (
            <blockquote
              className="border-l-2 border-border/60 pl-4 text-muted-foreground"
              {...props}
            />
          ),
          a: (props) => (
            <a
              className="text-primary underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isBlock = Boolean(codeClassName)
            if (isBlock) {
              return (
                <pre className="overflow-x-auto rounded-xl border border-border/60 bg-muted/40 p-3 text-xs">
                  <code className={codeClassName} {...props}>
                    {children}
                  </code>
                </pre>
              )
            }
            return (
              <code
                className="rounded-md bg-muted px-1.5 py-0.5 text-xs"
                {...props}
              >
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
