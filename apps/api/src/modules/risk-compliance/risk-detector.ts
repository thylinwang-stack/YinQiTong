import { RiskLevel } from './risk.enums';

export interface SensitiveWordRule {
  keyword: string;
  category: string;
  level: RiskLevel;
  status?: string;
}

export interface RiskHit {
  keyword: string;
  category: string;
  level: RiskLevel;
  start: number;
  end: number;
  sample: string;
}

export interface RiskDetectionResult {
  safe: boolean;
  level: RiskLevel;
  hits: RiskHit[];
  sanitizedText: string;
}

export const DEFAULT_SENSITIVE_WORDS: SensitiveWordRule[] = [
  { keyword: '特殊服务', category: 'boundary_violation', level: RiskLevel.Critical },
  { keyword: '私下联系', category: 'off_platform_contact', level: RiskLevel.High },
  { keyword: '微信号', category: 'off_platform_contact', level: RiskLevel.High },
  { keyword: '手机号', category: 'off_platform_contact', level: RiskLevel.High },
  { keyword: '加微信', category: 'off_platform_contact', level: RiskLevel.High },
  { keyword: '线下转账', category: 'off_platform_payment', level: RiskLevel.High },
  { keyword: '绕过平台', category: 'off_platform_contact', level: RiskLevel.High }
];

const CONTACT_PATTERNS: SensitiveWordRule[] = [
  { keyword: 'phone_number_pattern', category: 'public_contact', level: RiskLevel.High },
  { keyword: 'wechat_id_pattern', category: 'public_contact', level: RiskLevel.High }
];

const LEVEL_WEIGHT: Record<RiskLevel, number> = {
  [RiskLevel.Low]: 1,
  [RiskLevel.Medium]: 2,
  [RiskLevel.High]: 3,
  [RiskLevel.Critical]: 4
};

export function detectSensitiveContent(text: string, rules: SensitiveWordRule[] = DEFAULT_SENSITIVE_WORDS): RiskDetectionResult {
  const source = text || '';
  const hits: RiskHit[] = [];

  for (const rule of rules.filter(item => item.status !== 'inactive')) {
    const keyword = rule.keyword.trim();
    if (!keyword) continue;
    let start = source.indexOf(keyword);
    while (start >= 0) {
      hits.push(toHit(source, keyword, rule.category, rule.level, start, start + keyword.length));
      start = source.indexOf(keyword, start + keyword.length);
    }
  }

  hits.push(...detectContactPatterns(source));

  const level = hits.reduce<RiskLevel>((current, hit) => (
    LEVEL_WEIGHT[hit.level] > LEVEL_WEIGHT[current] ? hit.level : current
  ), RiskLevel.Low);

  return {
    safe: hits.length === 0,
    level,
    hits,
    sanitizedText: maskRiskText(source, hits)
  };
}

function detectContactPatterns(source: string): RiskHit[] {
  const hits: RiskHit[] = [];
  const phonePattern = /(?<!\d)1[3-9]\d[\s-]?\d{4}[\s-]?\d{4}(?!\d)/g;
  const wechatPattern = /\b(?:wx|wechat|weixin|v信|微\s*信)[:：\s-]*[a-zA-Z][a-zA-Z0-9_-]{5,19}\b/gi;

  for (const match of source.matchAll(phonePattern)) {
    const start = match.index || 0;
    hits.push(toHit(source, match[0], 'public_contact', CONTACT_PATTERNS[0].level, start, start + match[0].length));
  }

  for (const match of source.matchAll(wechatPattern)) {
    const start = match.index || 0;
    hits.push(toHit(source, match[0], 'public_contact', CONTACT_PATTERNS[1].level, start, start + match[0].length));
  }

  return hits;
}

function toHit(source: string, keyword: string, category: string, level: RiskLevel, start: number, end: number): RiskHit {
  return {
    keyword,
    category,
    level,
    start,
    end,
    sample: source.slice(Math.max(0, start - 8), Math.min(source.length, end + 8))
  };
}

function maskRiskText(source: string, hits: RiskHit[]) {
  if (!hits.length) return source;
  const sorted = [...hits].sort((a, b) => b.start - a.start);
  return sorted.reduce((text, hit) => {
    const replacement = '*'.repeat(Math.max(2, hit.end - hit.start));
    return `${text.slice(0, hit.start)}${replacement}${text.slice(hit.end)}`;
  }, source);
}
