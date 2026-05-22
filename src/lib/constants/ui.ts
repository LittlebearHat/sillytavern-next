/**
 * UI 全局常量 —— 集中管理 setTimeout 延迟、防抖间隔等 Magic Number
 */

/** 下拉菜单/建议浮层 onBlur 后延迟隐藏（ms），防止 mousedown 与 blur 时序冲突 */
export const DROPDOWN_HIDE_DELAY = 150;

/** 文本输入防抖延迟（ms），用于搜索框和防抖 TextField */
export const DEBOUNCE_INPUT_MS = 300;

/** 保存成功反馈消失延迟（ms） */
export const SAVE_FEEDBACK_MS = 2000;
