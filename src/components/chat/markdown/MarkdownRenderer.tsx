"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";

export interface MarkdownRendererProps {
  content: string;
  /** 是否允许内嵌 raw HTML（默认 true，对齐原项目 messageFormatting） */
  allowHtml?: boolean;
  /** 强制紧凑型样式（用于 reasoning 等小区域） */
  compact?: boolean;
  className?: string;
}

/**
 * SillyTavern 风格的轻预处理：
 * - 保留 \n 用于 remark-breaks
 * - 把 *action* / **bold** 让 markdown 原生处理（无需替换）
 * - 处理 ST 风格的 {{user}} / {{char}} 已在 build-prompt 阶段被替换，这里不再处理
 */
function preprocess(input: string): string {
  if (!input) return input;
  // 把 \r\n 归一化
  return input.replace(/\r\n/g, "\n");
}

/** 受控组件覆盖，让链接安全打开、code 块默认可滚动等 */
const components: Components = {
  a({ href, children, ...rest }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-primary underline underline-offset-2 hover:text-primary/80"
        {...rest}
      >
        {children}
      </a>
    );
  },
  code({ className, children, ...rest }) {
    const isBlock = /\blanguage-/.test(className ?? "");
    if (isBlock) {
      return (
        <code className={cn("font-mono text-[12.5px]", className)} {...rest}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-muted/70 text-foreground px-1 py-0.5 text-[0.85em] font-mono break-words"
        {...rest}
      >
        {children}
      </code>
    );
  },
  pre({ children, ...rest }) {
    return (
      <pre
        className="my-2 overflow-x-auto rounded-md border border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed"
        {...rest}
      >
        {children}
      </pre>
    );
  },
  table({ children, ...rest }) {
    return (
      <div className="my-2 overflow-x-auto rounded-md border border-border">
        <table className="min-w-full text-xs" {...rest}>
          {children}
        </table>
      </div>
    );
  },
  thead({ children, ...rest }) {
    return (
      <thead className="bg-muted/50 text-foreground" {...rest}>
        {children}
      </thead>
    );
  },
  th({ children, ...rest }) {
    return (
      <th className="px-2 py-1 text-left font-medium border-b border-border" {...rest}>
        {children}
      </th>
    );
  },
  td({ children, ...rest }) {
    return (
      <td className="px-2 py-1 border-b border-border/50" {...rest}>
        {children}
      </td>
    );
  },
  blockquote({ children, ...rest }) {
    return (
      <blockquote
        className="my-2 border-l-2 border-primary/40 pl-3 italic text-muted-foreground"
        {...rest}
      >
        {children}
      </blockquote>
    );
  },
  hr() {
    return <hr className="my-3 border-border/60" />;
  },
  ul({ children, ...rest }) {
    return (
      <ul className="my-1.5 ml-5 list-disc space-y-0.5" {...rest}>
        {children}
      </ul>
    );
  },
  ol({ children, ...rest }) {
    return (
      <ol className="my-1.5 ml-5 list-decimal space-y-0.5" {...rest}>
        {children}
      </ol>
    );
  },
  h1({ children, ...rest }) {
    return (
      <h1 className="mt-3 mb-1.5 text-base font-semibold" {...rest}>
        {children}
      </h1>
    );
  },
  h2({ children, ...rest }) {
    return (
      <h2 className="mt-2.5 mb-1 text-[15px] font-semibold" {...rest}>
        {children}
      </h2>
    );
  },
  h3({ children, ...rest }) {
    return (
      <h3 className="mt-2 mb-1 text-sm font-semibold" {...rest}>
        {children}
      </h3>
    );
  },
  img({ alt, src, ...rest }) {
    if (!src) return null;
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        alt={alt ?? ""}
        src={typeof src === "string" ? src : undefined}
        className="my-2 max-w-full rounded-md border border-border"
        loading="lazy"
        {...rest}
      />
    );
  },
};

function MarkdownRendererInner({
  content,
  allowHtml = true,
  compact = false,
  className,
}: MarkdownRendererProps) {
  const text = preprocess(content);
  const remarkPlugins = [remarkGfm, remarkBreaks, remarkMath];
  const rehypePlugins = allowHtml ? [rehypeRaw, rehypeKatex] : [rehypeKatex];

  return (
    <div
      className={cn(
        "markdown-body break-words leading-relaxed text-sm",
        compact ? "text-xs leading-snug" : "",
        // 段落间距
        "[&>p]:my-1 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rehypePlugins={rehypePlugins as any}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownRenderer = memo(MarkdownRendererInner);
