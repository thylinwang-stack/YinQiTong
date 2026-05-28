<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">餐前准备</h1>
        <div class="page-desc">围绕宴请主题、客户背景、禁忌事项和现场分工生成可执行 brief，并按客服提交、运营审核、助理确认流转。</div>
      </div>
      <a-space>
        <a-button @click="load">刷新</a-button>
        <a-button type="primary" :disabled="!can('meal_brief:update')" @click="openEditor()">新建 Brief</a-button>
      </a-space>
    </div>

    <div class="panel filter-panel">
      <a-form layout="inline" :model="query">
        <a-form-item label="关键词">
          <a-input v-model:value="query.keyword" allow-clear placeholder="订单号、客户、主题、场景" />
        </a-form-item>
        <a-form-item label="城市">
          <a-select v-model:value="query.city" allow-clear placeholder="全部城市" style="width: 130px">
            <a-select-option value="上海">上海</a-select-option>
            <a-select-option value="北京">北京</a-select-option>
            <a-select-option value="深圳">深圳</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="query.status" allow-clear style="width: 160px">
            <a-select-option value="draft">草稿</a-select-option>
            <a-select-option value="submitted">待运营审核</a-select-option>
            <a-select-option value="approved">已通过</a-select-option>
            <a-select-option value="assistant_confirmed">助理已确认</a-select-option>
            <a-select-option value="reminder_sent">已提醒</a-select-option>
            <a-select-option value="reviewed">已复盘</a-select-option>
          </a-select>
        </a-form-item>
        <a-button type="primary" @click="load">查询</a-button>
      </a-form>
    </div>

    <div class="panel table-panel">
      <a-table row-key="id" :columns="columns" :data-source="records" :loading="loading" :pagination="pagination" @change="handleTableChange">
        <template #bodyCell="{ column, record }">
          <StatusTag v-if="column.dataIndex === 'status'" :status="record.status" />
          <template v-else-if="column.dataIndex === 'assistantCount'">{{ record.assistantCount || 0 }} 人</template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" @click="openPreview(record)">详情</a-button>
              <a-button type="link" :disabled="!can('meal_brief:update') || !canEdit(record)" @click="openEditor(record)">编辑</a-button>
              <a-dropdown>
                <a-button type="link">流程</a-button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item :disabled="!canSubmit(record)" @click="submitBrief(record)">客服提交</a-menu-item>
                    <a-menu-item :disabled="!canApprove(record)" @click="approveBrief(record)">运营审核通过</a-menu-item>
                    <a-menu-item :disabled="!canGenerateTasks(record)" @click="generateTasks(record)">生成任务清单</a-menu-item>
                    <a-menu-item :disabled="!canScheduleReminder(record)" @click="openReminder(record)">服务前提醒</a-menu-item>
                    <a-menu-item :disabled="!canReview(record)" @click="openReview(record)">服务后复盘</a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-drawer v-model:open="previewOpen" width="820" title="餐前 Brief 详情">
      <template v-if="selected">
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="订单号">{{ selected.bookingNo }}</a-descriptions-item>
          <a-descriptions-item label="客户">{{ selected.customerName }}</a-descriptions-item>
          <a-descriptions-item label="场景">{{ selected.sceneName }}</a-descriptions-item>
          <a-descriptions-item label="城市">{{ selected.city }}</a-descriptions-item>
          <a-descriptions-item label="服务时间">{{ selected.serviceTime }}</a-descriptions-item>
          <a-descriptions-item label="助理人数">{{ selected.assistantCount }} 人</a-descriptions-item>
          <a-descriptions-item label="主题">{{ selected.banquetTheme }}</a-descriptions-item>
          <a-descriptions-item label="状态"><StatusTag :status="selected.status" /></a-descriptions-item>
        </a-descriptions>

        <a-tabs class="detail-tabs">
          <a-tab-pane key="core" tab="核心信息">
            <div class="brief-grid">
              <div class="info-block">
                <div class="info-title">客户背景</div>
                <div class="info-content">{{ selected.customerBackground || '未填写' }}</div>
              </div>
              <div class="info-block">
                <div class="info-title">饭局目的</div>
                <div class="info-content">{{ selected.diningPurpose || '未填写' }}</div>
              </div>
              <div class="info-block">
                <div class="info-title">现场氛围需求</div>
                <div class="info-content">{{ selected.atmosphereNeeds || '未填写' }}</div>
              </div>
              <div class="info-block">
                <div class="info-title">着装要求</div>
                <div class="info-content">{{ selected.dressCode || '未填写' }}</div>
              </div>
            </div>
            <div class="drawer-section-title">到场身份</div>
            <a-space wrap><a-tag v-for="item in selected.guestIdentities || []" :key="item">{{ item }}</a-tag></a-space>
            <div class="drawer-section-title">推荐话题</div>
            <a-space wrap><a-tag color="gold" v-for="item in selected.recommendedTopics || []" :key="item">{{ item }}</a-tag></a-space>
            <div class="drawer-section-title">禁忌话题</div>
            <a-space wrap><a-tag color="red" v-for="item in selected.tabooTopics || []" :key="item">{{ item }}</a-tag></a-space>
          </a-tab-pane>

          <a-tab-pane key="assistant" tab="助理可见">
            <a-alert type="info" show-icon message="员工端只展示本区域和任务清单，不展示运营内部备注。" />
            <div class="drawer-section-title">assistant_visible_brief</div>
            <div class="brief-box">{{ selected.assistantVisibleBrief }}</div>
            <div class="drawer-section-title">角色分工</div>
            <a-table size="small" row-key="owner" :pagination="false" :columns="roleColumns" :data-source="selected.roleAssignments || []" />
            <div class="drawer-section-title">注意事项</div>
            <a-list size="small" bordered :data-source="selected.attentionPoints || []">
              <template #renderItem="{ item }"><a-list-item>{{ item }}</a-list-item></template>
            </a-list>
          </a-tab-pane>

          <a-tab-pane key="tasks" tab="任务与提醒">
            <a-empty v-if="!selected.tasks?.length" description="尚未生成助理任务清单" />
            <a-list v-else bordered :data-source="selected.tasks">
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta :title="item.title" :description="item.detail" />
                  <StatusTag :status="item.status" />
                </a-list-item>
              </template>
            </a-list>
            <div class="drawer-section-title">服务前提醒</div>
            <div class="brief-box">{{ selected.reminderAt || '尚未创建提醒' }}</div>
          </a-tab-pane>

          <a-tab-pane key="private" tab="内部备注">
            <template v-if="can('meal_brief:manager_note:read')">
              <a-alert type="warning" show-icon message="manager_private_note 仅管理人员可见，不同步到员工端。" />
              <div class="drawer-section-title">manager_private_note</div>
              <div class="brief-box private">{{ selected.managerPrivateNote || '无' }}</div>
            </template>
            <a-result v-else status="403" title="无字段权限" sub-title="当前账号不可查看运营内部备注。" />
          </a-tab-pane>

          <a-tab-pane key="review" tab="服务后复盘">
            <a-empty v-if="!selected.review" description="尚未复盘" />
            <a-descriptions v-else :column="1" bordered size="small">
              <a-descriptions-item label="客户反馈">{{ selected.review.customerFeedback }}</a-descriptions-item>
              <a-descriptions-item label="助理反馈">{{ selected.review.assistantFeedback }}</a-descriptions-item>
              <a-descriptions-item label="内部总结">{{ selected.review.internalSummary }}</a-descriptions-item>
              <a-descriptions-item label="评分">{{ selected.review.rating || '-' }}</a-descriptions-item>
            </a-descriptions>
          </a-tab-pane>
        </a-tabs>

        <AuditHint />
      </template>
    </a-drawer>

    <a-modal v-model:open="editorOpen" :title="selected ? '编辑餐前 Brief' : '新建餐前 Brief'" width="1040px" @ok="saveBrief">
      <a-form layout="vertical" :model="form">
        <a-row :gutter="16">
          <a-col :span="8"><a-form-item label="订单号"><a-input v-model:value="form.bookingNo" placeholder="BS202605..." /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="客户"><a-input v-model:value="form.customerName" placeholder="客户名称" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="服务场景"><a-input v-model:value="form.sceneName" placeholder="商务宴请/客户接待" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="城市"><a-input v-model:value="form.city" placeholder="上海" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="服务时间"><a-input v-model:value="form.serviceTime" placeholder="2026-06-02 19:00" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="助理人数"><a-input-number v-model:value="form.assistantCount" :min="1" :max="20" style="width: 100%" /></a-form-item></a-col>
          <a-col :span="16"><a-form-item label="宴请主题"><a-input v-model:value="form.banquetTheme" placeholder="例如：外地客户到访接待晚宴" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="到场人数"><a-input-number v-model:value="form.attendeeCount" :min="1" :max="100" style="width: 100%" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="客户背景"><a-textarea v-model:value="form.customerBackground" :rows="4" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="饭局目的"><a-textarea v-model:value="form.diningPurpose" :rows="4" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="到场身份，每行一个"><a-textarea v-model:value="form.guestIdentitiesText" :rows="4" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="现场氛围需求"><a-textarea v-model:value="form.atmosphereNeeds" :rows="4" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="禁忌话题，每行一个"><a-textarea v-model:value="form.tabooTopicsText" :rows="5" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="推荐话题，每行一个"><a-textarea v-model:value="form.recommendedTopicsText" :rows="5" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="注意事项，每行一个"><a-textarea v-model:value="form.attentionPointsText" :rows="5" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="着装要求"><a-textarea v-model:value="form.dressCode" :rows="4" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="角色分工，每行：角色 | 助理编号/工作名 | 职责"><a-textarea v-model:value="form.roleAssignmentsText" :rows="4" /></a-form-item></a-col>
          <a-col :span="12" v-if="can('meal_brief:manager_note:read')">
            <a-form-item label="manager_private_note，仅管理人员可见">
              <a-textarea v-model:value="form.managerPrivateNote" :rows="7" placeholder="内部风控、客户偏好、客服跟进要点" />
            </a-form-item>
          </a-col>
          <a-col :span="can('meal_brief:manager_note:read') ? 12 : 24">
            <a-form-item label="assistant_visible_brief，员工端可见">
              <a-textarea v-model:value="form.assistantVisibleBrief" :rows="7" placeholder="只放助理执行所需信息，避免内部备注和不必要隐私" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
      <AuditHint />
    </a-modal>

    <a-modal v-model:open="reminderOpen" title="创建服务前提醒" @ok="saveReminder">
      <a-form layout="vertical">
        <a-form-item label="提醒时间">
          <a-date-picker v-model:value="reminderAt" show-time format="YYYY-MM-DD HH:mm" style="width: 100%" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="reviewOpen" title="服务后复盘" width="760px" @ok="saveReview">
      <a-form layout="vertical" :model="reviewForm">
        <a-form-item label="客户反馈"><a-textarea v-model:value="reviewForm.customerFeedback" :rows="4" /></a-form-item>
        <a-form-item label="助理反馈"><a-textarea v-model:value="reviewForm.assistantFeedback" :rows="4" /></a-form-item>
        <a-form-item label="内部总结"><a-textarea v-model:value="reviewForm.internalSummary" :rows="5" /></a-form-item>
        <a-form-item label="服务评分"><a-rate v-model:value="reviewForm.rating" /></a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import type { TablePaginationConfig } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import dayjs, { type Dayjs } from 'dayjs';
import { computed, reactive, ref } from 'vue';
import { apiClient } from '@/api/client';
import AuditHint from '@/components/AuditHint.vue';
import StatusTag from '@/components/StatusTag.vue';
import { hasPermission } from '@/config/menu';
import { useAuthStore } from '@/stores/auth';
import type { MealBriefRecord, PageQuery } from '@/types/domain';

const auth = useAuthStore();
const loading = ref(false);
const records = ref<MealBriefRecord[]>([]);
const total = ref(0);
const selected = ref<MealBriefRecord | null>(null);
const previewOpen = ref(false);
const editorOpen = ref(false);
const reminderOpen = ref(false);
const reviewOpen = ref(false);
const reminderAt = ref<Dayjs>(dayjs().add(2, 'hour'));
const query = reactive<PageQuery>({ page: 1, pageSize: 10, keyword: '', city: undefined, status: undefined });
const form = reactive({
  bookingNo: '',
  customerName: '',
  sceneName: '',
  city: '',
  serviceTime: '',
  assistantCount: 1,
  banquetTheme: '',
  customerBackground: '',
  diningPurpose: '',
  attendeeCount: 1,
  guestIdentitiesText: '',
  atmosphereNeeds: '',
  tabooTopicsText: '',
  recommendedTopicsText: '',
  dressCode: '',
  roleAssignmentsText: '',
  attentionPointsText: '',
  managerPrivateNote: '',
  assistantVisibleBrief: ''
});
const reviewForm = reactive({
  customerFeedback: '',
  assistantFeedback: '',
  internalSummary: '',
  rating: 5
});

const columns = [
  { title: '订单号', dataIndex: 'bookingNo', width: 160 },
  { title: '客户', dataIndex: 'customerName', width: 130 },
  { title: '城市', dataIndex: 'city', width: 90 },
  { title: '服务时间', dataIndex: 'serviceTime', width: 170 },
  { title: '宴请主题', dataIndex: 'banquetTheme', width: 220 },
  { title: '助理', dataIndex: 'assistantCount', width: 90 },
  { title: '状态', dataIndex: 'status', width: 130 },
  { title: '更新时间', dataIndex: 'updatedAt', width: 170 },
  { title: '操作', key: 'action', width: 220, fixed: 'right' }
];
const roleColumns = [
  { title: '角色', dataIndex: 'role', width: 120 },
  { title: '负责人', dataIndex: 'owner', width: 160 },
  { title: '职责', dataIndex: 'responsibility' }
];
const pagination = computed<TablePaginationConfig>(() => ({
  current: Number(query.page),
  pageSize: Number(query.pageSize),
  total: total.value,
  showSizeChanger: true
}));

function can(permission: string) {
  return hasPermission(auth.permissions, permission);
}

function canEdit(record: MealBriefRecord) {
  return ['draft', 'submitted'].includes(record.status);
}

function canSubmit(record: MealBriefRecord) {
  return can('meal_brief:submit') && record.status === 'draft';
}

function canApprove(record: MealBriefRecord) {
  return can('meal_brief:approve') && record.status === 'submitted';
}

function canGenerateTasks(record: MealBriefRecord) {
  return can('meal_brief:generate_tasks') && ['submitted', 'approved', 'assistant_confirmed'].includes(record.status);
}

function canScheduleReminder(record: MealBriefRecord) {
  return can('meal_brief:reminder') && ['approved', 'assistant_confirmed'].includes(record.status);
}

function canReview(record: MealBriefRecord) {
  return can('meal_brief:review') && ['assistant_confirmed', 'reminder_sent', 'reviewed'].includes(record.status);
}

async function load() {
  loading.value = true;
  try {
    const result = await apiClient.listMealBriefs(query);
    records.value = result.list;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

function handleTableChange(next: TablePaginationConfig) {
  query.page = next.current || 1;
  query.pageSize = next.pageSize || 10;
  load();
}

function openPreview(record: MealBriefRecord) {
  selected.value = record;
  previewOpen.value = true;
}

function openEditor(record?: MealBriefRecord) {
  selected.value = record || null;
  Object.assign(form, toForm(record));
  editorOpen.value = true;
}

async function saveBrief() {
  if (!form.bookingNo || !form.banquetTheme) {
    message.warning('请至少填写订单号和宴请主题');
    return;
  }
  const payload = buildPayload();
  if (selected.value) {
    await apiClient.updateMealBrief(selected.value.id, payload);
    message.success('餐前 brief 已保存，并写入审计日志');
  } else {
    await apiClient.createMealBrief(payload as Partial<MealBriefRecord> & { bookingNo: string });
    message.success('餐前 brief 已创建，并写入审计日志');
  }
  editorOpen.value = false;
  await load();
}

async function submitBrief(record: MealBriefRecord) {
  await apiClient.submitMealBrief(record.id);
  message.success('客服已提交 brief，等待运营审核');
  await load();
}

async function approveBrief(record: MealBriefRecord) {
  await apiClient.approveMealBrief(record.id);
  message.success('运营审核已通过，员工端可确认 brief');
  await load();
}

async function generateTasks(record: MealBriefRecord) {
  await apiClient.generateMealBriefTasks(record.id);
  message.success('助理任务清单已生成');
  await load();
}

function openReminder(record: MealBriefRecord) {
  selected.value = record;
  reminderAt.value = dayjs(record.serviceTime || undefined).isValid()
    ? dayjs(record.serviceTime).subtract(2, 'hour')
    : dayjs().add(2, 'hour');
  reminderOpen.value = true;
}

async function saveReminder() {
  if (!selected.value) return;
  await apiClient.scheduleMealBriefReminder(selected.value.id, reminderAt.value.toISOString());
  message.success('服务前提醒已创建，并写入审计日志');
  reminderOpen.value = false;
  await load();
}

function openReview(record: MealBriefRecord) {
  selected.value = record;
  Object.assign(reviewForm, {
    customerFeedback: record.review?.customerFeedback || '',
    assistantFeedback: record.review?.assistantFeedback || '',
    internalSummary: record.review?.internalSummary || '',
    rating: record.review?.rating || 5
  });
  reviewOpen.value = true;
}

async function saveReview() {
  if (!selected.value) return;
  await apiClient.reviewMealBrief(selected.value.id, { ...reviewForm });
  message.success('服务后复盘已保存，并写入审计日志');
  reviewOpen.value = false;
  await load();
}

function splitLines(value: string) {
  return value.split('\n').map(item => item.trim()).filter(Boolean);
}

function formatLines(values?: string[]) {
  return (values || []).join('\n');
}

function formatRoles(values?: MealBriefRecord['roleAssignments']) {
  return (values || []).map(item => `${item.role} | ${item.owner} | ${item.responsibility}`).join('\n');
}

function parseRoles(value: string) {
  return splitLines(value).map(line => {
    const [role = '', owner = '', responsibility = ''] = line.split('|').map(item => item.trim());
    return { role, owner, responsibility };
  }).filter(item => item.role || item.owner || item.responsibility);
}

function toForm(record?: MealBriefRecord | null) {
  return {
    bookingNo: record?.bookingNo || '',
    customerName: record?.customerName || '',
    sceneName: record?.sceneName || '',
    city: record?.city || '',
    serviceTime: record?.serviceTime || '',
    assistantCount: record?.assistantCount || 1,
    banquetTheme: record?.banquetTheme || '',
    customerBackground: record?.customerBackground || '',
    diningPurpose: record?.diningPurpose || '',
    attendeeCount: record?.attendeeCount || 1,
    guestIdentitiesText: formatLines(record?.guestIdentities),
    atmosphereNeeds: record?.atmosphereNeeds || '',
    tabooTopicsText: formatLines(record?.tabooTopics),
    recommendedTopicsText: formatLines(record?.recommendedTopics),
    dressCode: record?.dressCode || '',
    roleAssignmentsText: formatRoles(record?.roleAssignments),
    attentionPointsText: formatLines(record?.attentionPoints),
    managerPrivateNote: record?.managerPrivateNote || '',
    assistantVisibleBrief: record?.assistantVisibleBrief || ''
  };
}

function buildPayload(): Partial<MealBriefRecord> & { bookingNo: string } {
  return {
    bookingNo: form.bookingNo,
    customerName: form.customerName,
    sceneName: form.sceneName,
    city: form.city,
    serviceTime: form.serviceTime,
    assistantCount: Number(form.assistantCount || 1),
    banquetTheme: form.banquetTheme,
    customerBackground: form.customerBackground,
    diningPurpose: form.diningPurpose,
    attendeeCount: Number(form.attendeeCount || 1),
    guestIdentities: splitLines(form.guestIdentitiesText),
    atmosphereNeeds: form.atmosphereNeeds,
    tabooTopics: splitLines(form.tabooTopicsText),
    recommendedTopics: splitLines(form.recommendedTopicsText),
    dressCode: form.dressCode,
    roleAssignments: parseRoles(form.roleAssignmentsText),
    attentionPoints: splitLines(form.attentionPointsText),
    managerPrivateNote: can('meal_brief:manager_note:read') ? form.managerPrivateNote : selected.value?.managerPrivateNote || '',
    assistantVisibleBrief: form.assistantVisibleBrief
  };
}

load();
</script>

<style scoped>
.detail-tabs {
  margin-top: 18px;
}

.brief-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.info-block,
.brief-box {
  white-space: pre-wrap;
  padding: 14px;
  border: 1px solid rgba(214, 226, 243, 0.1);
  border-radius: 8px;
  background: rgba(5, 10, 16, 0.66);
  color: #dfe8f5;
  line-height: 1.7;
}

.info-title {
  margin-bottom: 6px;
  color: #edf3fb;
  font-weight: 700;
}

.info-content {
  color: #b8c4d4;
}

.brief-box.private {
  border-color: rgba(198, 163, 96, 0.34);
  background: rgba(198, 163, 96, 0.08);
}
</style>
