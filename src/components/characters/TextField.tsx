"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { DEBOUNCE_INPUT_MS } from "@/lib/constants/ui";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  multiline?: boolean;
  placeholder?: string;
  helpLink?: string;
}

/** 防抖文本输入组件 — 角色新建/编辑页共享 */
export function TextField({
  label, value, onChange, multiline = false, placeholder, helpLink,
}: TextFieldProps) {
  const [localVal, setLocalVal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = (newVal: string) => {
    setLocalVal(newVal);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(newVal), DEBOUNCE_INPUT_MS);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        {helpLink && (
          <a href={helpLink} target="_blank" rel="noreferrer" className="text-muted-foreground/60 hover:text-primary text-xs">?</a>
        )}
      </div>
      {multiline ? (
        <textarea
          value={localVal}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          rows={5}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y min-h-[100px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
        />
      ) : (
        <Input value={localVal} onChange={(e) => handleChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}
