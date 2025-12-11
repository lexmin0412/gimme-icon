/**
 * 为图标生成自然语言描述，用于向量化
 * @param name 图标名称，如 "access-point-minus"
 * @param series 图标所属语义系列，如 "Network / Connectivity" 或 "Account / User"
 * @returns 适合向量化的英文描述句子
 */
export function generateDescriptionForIcon(name: string, series: string): string {
  // 1. 标准化图标名称
  let normalizedName = name
    .replace(/-/g, ' ')
    .toLowerCase()
    .trim();

  // 2. 术语优化（同前）
  const termReplacements: [RegExp, string][] = [
    [/\bplus\b/g, 'add'],
    [/\bminus\b/g, 'remove'],
    [/\bdelete\b/g, 'remove'],
    [/\btrash\b/g, 'delete'],
    [/\barrow left\b/g, 'left arrow'],
    [/\barrow right\b/g, 'right arrow'],
    [/\buser\b/g, 'user profile'],
    [/\baccount\b/g, 'user account'],
    [/\bsettings\b/g, 'system settings'],
    [/\bwifi\b/g, 'wireless network'],
    [/ +/g, ' '],
  ];

  for (const [regex, replacement] of termReplacements) {
    normalizedName = normalizedName.replace(regex, replacement);
  }

  // 3. 处理 series：提取关键词并去重
  let seriesKeywords = '';
  if (series && series !== 'Other') {
    // 将 "Account / User" → ["Account", "User"] → "account user"
    const keywords = series
      .split('/')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    // 合并到描述中（避免与名称重复）
    const uniqueKeywords = keywords.filter(kw =>
      !normalizedName.includes(kw)
    );

    if (uniqueKeywords.length > 0) {
      seriesKeywords = uniqueKeywords.join(', ');
    }
  }

  // 4. 构建最终描述
  let description = `An icon representing ${normalizedName}`;
  if (seriesKeywords) {
    description += `, related to ${seriesKeywords}`;
  }
  description += '.';

  return description.replace(/\s+/g, ' ').trim();
}