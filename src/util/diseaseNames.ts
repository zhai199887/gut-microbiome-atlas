/**
 * diseaseNames.ts — 疾病名称标准化显示工具
 * 统一将缩写 key（如 "IBD"）转为标准全称（如 "Inflammatory Bowel Disease (IBD)"）
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

let displayMap: Record<string, string> | null = null;
let loading: Promise<void> | null = null;

/** 预加载显示名称映射（应用启动时调用一次） */
export function preloadDiseaseNames(): void {
  if (displayMap || loading) return;
  loading = fetch(`${API_BASE}/api/disease-display-names`)
    .then((r) => r.json())
    .then((data: Record<string, string>) => { displayMap = data; })
    .catch(() => { displayMap = {}; });
}

/**
 * 获取疾病的标准化显示名称
 * - 有映射 → 返回全称（如 "Inflammatory Bowel Disease (IBD)"）
 * - 无映射 → 返回原始 key，下划线替换为空格，首字母大写
 */
export function diseaseDisplayName(key: string): string {
  if (displayMap && displayMap[key]) return displayMap[key];
  // 兜底：下划线转空格，首字母大写
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** 获取简短显示名（用于按钮/标签等空间有限的场景） */
export function diseaseShortName(key: string, maxLen = 30): string {
  const full = diseaseDisplayName(key);
  return full.length > maxLen ? full.slice(0, maxLen - 1) + "…" : full;
}
