import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * 通用返回按钮 — 默认返回聊天主页 (/)
 * 圆角图标按钮，hover 有背景色和文字色变化
 */
export function BackButton({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
      title="返回"
    >
      <ArrowLeft size={18} />
    </Link>
  );
}
