"use client";

import { useState } from "react";
import { FileText, Image, Film, Music, Archive, File, ChevronDown, ChevronUp, X } from "lucide-react";
import type { FileAttachment } from "@/types";

interface MessageAttachmentsProps {
  files: FileAttachment[];
}

const FILE_ICONS: Record<string, typeof File> = {
  text: FileText,
  image: Image,
  video: Film,
  audio: Music,
  archive: Archive,
};

function getFileCategory(mimeType?: string): string {
  if (!mimeType) return "file";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("text/") || /json|xml|csv|javascript|markdown/.test(mimeType)) return "text";
  if (/zip|tar|rar|7z|gz/.test(mimeType)) return "archive";
  return "file";
}

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/** 消息内附件展示：图片内联预览、文件信息卡、文本内容可展开 */
export function MessageAttachments({ files }: MessageAttachmentsProps) {
  if (!files?.length) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {files.map((f, i) => {
        const category = getFileCategory(f.mimeType);

        if (category === "image" && f.url) {
          return <ImagePreview key={i} file={f} />;
        }

        if (category === "text" && f.text) {
          return <TextFilePreview key={i} file={f} />;
        }

        return <FileCard key={i} file={f} category={category} />;
      })}
    </div>
  );
}

/** 图片内联预览 */
function ImagePreview({ file }: { file: FileAttachment }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative group">
      <img
        src={file.url}
        alt={file.name || "image"}
        className={`rounded-lg border border-border cursor-pointer transition-all ${
          expanded ? "max-w-full" : "max-w-[280px] max-h-[200px] object-cover"
        }`}
        onClick={() => setExpanded(!expanded)}
      />
      {file.name && (
        <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[280px]">
          {file.name} {file.size ? `· ${formatSize(file.size)}` : ""}
        </div>
      )}
    </div>
  );
}

/** 文本文件可展开预览 */
function TextFilePreview({ file }: { file: FileAttachment }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = FileText;
  const preview = file.text?.slice(0, 200);
  const hasMore = (file.text?.length ?? 0) > 200;

  return (
    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden max-w-[360px]">
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50">
        <Icon size={14} className="text-primary shrink-0" />
        <span className="text-xs font-medium truncate flex-1">{file.name || "text"}</span>
        <span className="text-[10px] text-muted-foreground">{formatSize(file.size)}</span>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>
      <pre className="text-[11px] text-foreground/80 px-2.5 py-1.5 whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto font-mono">
        {expanded ? file.text : preview}
        {!expanded && hasMore && "..."}
      </pre>
    </div>
  );
}

/** 通用文件信息卡 */
function FileCard({ file, category }: { file: FileAttachment; category: string }) {
  const Icon = FILE_ICONS[category] || File;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-2 max-w-[280px]">
      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{file.name || "unknown"}</div>
        <div className="text-[10px] text-muted-foreground">
          {formatSize(file.size)}
          {file.mimeType && ` · ${file.mimeType.split("/").pop()}`}
        </div>
      </div>
    </div>
  );
}

// ========================
// 拖拽上传覆盖层
// ========================

interface DragOverlayProps {
  visible: boolean;
}

export function DragOverlay({ visible }: DragOverlayProps) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-40 bg-primary/10 border-2 border-dashed border-primary/50 rounded-xl flex items-center justify-center pointer-events-none backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-2 text-primary">
        <File size={32} />
        <span className="text-sm font-medium">拖放文件到此处上传</span>
      </div>
    </div>
  );
}
