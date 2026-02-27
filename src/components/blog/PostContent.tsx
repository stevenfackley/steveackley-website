export function PostContent({ content }: { content: string }) {
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-[var(--accent)] prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl" dangerouslySetInnerHTML={{ __html: content }} />
  );
}
