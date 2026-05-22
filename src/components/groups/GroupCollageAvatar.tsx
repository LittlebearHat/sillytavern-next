"use client";

import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroupCollageAvatarProps {
  /** 群组成员的 character id 列表 */
  members: string[];
  /** characterId -> avatar URL 映射 */
  avatarMap: Map<string, string | null | undefined>;
  /** 群组自定义头像（优先级最高） */
  customAvatar?: string | null;
  /** 像素尺寸 */
  size?: number;
  className?: string;
  title?: string;
}

/**
 * 群组头像组件 - 对齐原项目 collage_1/2/3/4 布局
 * - 自定义头像优先
 * - 否则取前 1~4 个有头像的成员做拼贴
 * - 全无头像时显示 Users 图标
 */
export function GroupCollageAvatar({
  members,
  avatarMap,
  customAvatar,
  size = 40,
  className,
  title,
}: GroupCollageAvatarProps) {
  // 自定义头像优先
  if (customAvatar) {
    return (
      <div
        className={cn("rounded-full overflow-hidden bg-secondary shrink-0", className)}
        style={{ width: size, height: size }}
        title={title}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={customAvatar} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  // 取前 4 个有 avatar 的成员
  const avatars: string[] = [];
  for (const id of members) {
    const a = avatarMap.get(id);
    if (a) avatars.push(a);
    if (avatars.length >= 4) break;
  }

  const n = avatars.length;
  const box = `rounded-full overflow-hidden bg-secondary shrink-0 relative`;
  const style = { width: size, height: size };

  if (n === 0) {
    return (
      <div className={cn(box, "flex items-center justify-center", className)} style={style} title={title}>
        <Users size={size * 0.45} className="text-primary opacity-60" />
      </div>
    );
  }

  if (n === 1) {
    return (
      <div className={cn(box, className)} style={style} title={title}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatars[0]} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  if (n === 2) {
    return (
      <div className={cn(box, "flex", className)} style={style} title={title}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatars[0]} alt="" className="object-cover" style={{ width: "50%", height: "100%" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatars[1]} alt="" className="object-cover" style={{ width: "50%", height: "100%" }} />
      </div>
    );
  }

  if (n === 3) {
    return (
      <div className={cn(box, "flex flex-wrap", className)} style={style} title={title}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatars[0]} alt="" className="object-cover" style={{ width: "50%", height: "50%" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatars[1]} alt="" className="object-cover" style={{ width: "50%", height: "50%" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatars[2]} alt="" className="object-cover" style={{ width: "100%", height: "50%" }} />
      </div>
    );
  }

  // n >= 4
  return (
    <div className={cn(box, "flex flex-wrap", className)} style={style} title={title}>
      {avatars.slice(0, 4).map((a, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={a} alt="" className="object-cover" style={{ width: "50%", height: "50%" }} />
      ))}
    </div>
  );
}
