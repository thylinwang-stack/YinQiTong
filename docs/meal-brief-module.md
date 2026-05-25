# 餐前准备模块

## 数据表

- `meal_briefs`：餐前 brief 主表，保存宴请主题、客户背景、饭局目的、到场人数、客人身份、氛围需求、禁忌话题、推荐话题、着装要求、角色分工、注意事项、`manager_private_note` 和 `assistant_visible_brief`。
- `meal_brief_status_logs`：brief 状态流转日志，记录客服提交、运营审核、助理确认、提醒、复盘等动作。
- `meal_brief_tasks`：助理任务清单，由 brief 一键生成，员工端可勾选完成。
- `meal_brief_reminders`：服务前提醒，支持员工端提醒渠道和幂等发送状态。
- `meal_brief_reviews`：服务后复盘，保存客户反馈、助理反馈、内部总结和评分。
- `audit_logs`：所有创建、编辑、提交、审核、生成任务、提醒、确认、复盘动作写入审计日志。

## API

- `GET /admin/meal-briefs`：后台分页查询 brief。
- `POST /admin/meal-briefs`：客服创建 brief。
- `GET /admin/meal-briefs/:id`：管理端查看完整 brief，包含内部备注。
- `PATCH /admin/meal-briefs/:id`：编辑 brief，已审核或已确认后锁定直接编辑。
- `POST /admin/meal-briefs/:id/submit`：客服提交。
- `POST /admin/meal-briefs/:id/approve`：运营审核通过。
- `POST /admin/meal-briefs/:id/generate-tasks`：一键生成助理任务清单。
- `POST /admin/meal-briefs/:id/reminders`：创建服务前提醒。
- `POST /admin/meal-briefs/:id/reminders/mark-sent`：系统标记提醒已发送。
- `POST /admin/meal-briefs/:id/review`：运营写入服务后复盘。
- `GET /staff/meal-briefs/:id`：员工端读取助理可见 brief，不返回 `manager_private_note`。
- `POST /staff/meal-briefs/:id/confirm`：助理确认 brief。
- `PATCH /staff/meal-briefs/:id/tasks/:taskId`：助理勾选任务。
- `POST /staff/meal-briefs/:id/review`：助理提交服务反馈。

## 后台页面

- 路径：`/meal-briefs`。
- 功能：筛选分页、详情抽屉、完整 brief 编辑器、内部备注字段权限、一键提交、审核、生成任务、服务前提醒、服务后复盘。
- 字段边界：`manager_private_note` 仅管理人员可见；`assistant_visible_brief` 是员工端唯一同步的 brief 正文。

## 员工端页面

- `pages/staff-brief/index`：读取任务 brief、查看推荐话题/禁忌话题/角色分工/注意事项、确认 brief、提交助理反馈。
- `pages/staff-task-list/index`：查看任务清单并勾选完成。

## 权限控制

- 后台菜单权限：`meal_brief:read`。
- 编辑权限：`meal_brief:update`。
- 内部备注字段权限：`meal_brief:manager_note:read`。
- 流程权限：`meal_brief:submit`、`meal_brief:approve`、`meal_brief:generate_tasks`、`meal_brief:reminder`、`meal_brief:review`。
- 员工端权限：`staff_meal_brief:read`、`staff_meal_brief:confirm`。

## 状态流转

`draft -> submitted -> approved -> assistant_confirmed -> reminder_sent -> reviewed`

`assistant_confirmed -> reviewed` 允许无提醒直接复盘。
