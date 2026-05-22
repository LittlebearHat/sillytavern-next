"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AlternateGreetingsEditorProps {
  greetings: string[];
  onChange: (g: string[]) => void;
}

/** 替代问候语编辑 — 角色新建/编辑页共享 */
export function AlternateGreetingsEditor({ greetings, onChange }: AlternateGreetingsEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">替代问候语 (Alt. Greetings)</label>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...greetings, ""])}>
          <Plus size={14} className="mr-1" /> 添加
        </Button>
      </div>
      {greetings.map((g, i) => (
        <div key={i} className="flex gap-2">
          <textarea
            value={g}
            onChange={(e) => { const u = [...greetings]; u[i] = e.target.value; onChange(u); }}
            rows={3}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm resize-y font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder={`问候语 #${i + 1}`}
          />
          <button onClick={() => onChange(greetings.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive self-start mt-2">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
