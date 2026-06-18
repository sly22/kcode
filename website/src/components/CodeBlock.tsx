interface CodeBlockProps {
  children: string;
  title?: string;
}

export function CodeBlock({ children, title }: CodeBlockProps) {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-border bg-surface">
      {title && <div className="border-b border-border bg-surface-elevated px-4 py-2 text-xs text-muted">{title}</div>}
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed"><code>{children.trim()}</code></pre>
    </div>
  );
}
