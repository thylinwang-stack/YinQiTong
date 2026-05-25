import { detectSensitiveContent } from '../risk-detector';
import { RiskLevel } from '../risk.enums';

describe('detectSensitiveContent', () => {
  it('detects sensitive boundary wording', () => {
    const result = detectSensitiveContent('客户要求私下联系并询问特殊服务');

    expect(result.safe).toBe(false);
    expect(result.level).toBe(RiskLevel.Critical);
    expect(result.hits.map(item => item.keyword)).toEqual(expect.arrayContaining(['私下联系', '特殊服务']));
  });

  it('detects public phone number in public profile text', () => {
    const result = detectSensitiveContent('商务助理介绍：沟通自然，电话 13812345678');

    expect(result.safe).toBe(false);
    expect(result.hits.some(item => item.category === 'public_contact')).toBe(true);
    expect(result.sanitizedText).not.toContain('13812345678');
  });

  it('passes compliant business profile copy', () => {
    const result = detectSensitiveContent('适合正式商务宴请，擅长自然开场、话题承接和礼仪分寸。');

    expect(result.safe).toBe(true);
    expect(result.hits).toHaveLength(0);
    expect(result.level).toBe(RiskLevel.Low);
  });
});
