# Brand Design Automation

这套自动化用于品牌视觉、Logo、小程序首页视觉、海报和管理后台关键界面的设计前置流程与 QA 门禁。

它解决的问题不是“自动生成高级设计”，而是防止低级错误反复出现：未定义气质就出图、没有版式网格、没有光学对齐、小尺寸不可用、未定稿就提交或推送。

## 运行方式

在项目根目录运行：

```bash
node brand/design-automation/scripts/design-qa.mjs brand/youge-fanjv-logo
```

如果在 `YinQiTong` 工作区内运行：

```bash
node brand/design-automation/scripts/design-qa.mjs brand/youge-fanjv-logo
```

## 目录

- `brand-design-process.md`：设计工作流，定义每一步何时进入下一步。
- `brand-guardrails.md`：品牌气质、禁区、文字表达和视觉禁用项。
- `design-qa-checklist.md`：人工验收清单。
- `design-qa.config.json`：当前品牌自动检查参数。
- `templates/design-brief-template.md`：每次开工前必须补齐的 brief 模板。
- `scripts/design-qa.mjs`：本地 QA 脚本。

## Git 规则

未定稿前：

- 不 commit
- 不 push
- 不把临时预览文件纳入资产目录
- 不覆盖已确认资产

定稿后：

- 先运行 QA
- 再导出最终 SVG/PNG/PDF
- 再提交 Git
