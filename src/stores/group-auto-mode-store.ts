/**
 * 群聊 Auto Mode 全局开关 store
 * 对齐原项目 is_group_automode_enabled (group-chats.js L111)
 */
import { create } from "zustand";

interface GroupAutoModeStore {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (v: boolean) => void;
}

export const useGroupAutoModeStore = create<GroupAutoModeStore>((set) => ({
  enabled: false,
  toggle: () => set((s) => ({ enabled: !s.enabled })),
  setEnabled: (v) => set({ enabled: v }),
}));
