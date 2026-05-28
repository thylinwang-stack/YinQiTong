<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">投诉与风控</h1>
        <div class="page-desc">管理敏感词、资料审核、图片审核、投诉、黑名单、异常订单和风险报告。</div>
      </div>
      <a-space>
        <a-button @click="loadAll">刷新</a-button>
        <a-button type="primary" @click="openDetect">敏感词检测</a-button>
      </a-space>
    </div>

    <div class="risk-report">
      <div class="metric-card"><a-statistic title="待审资料" :value="report.pendingProfileReviews" /></div>
      <div class="metric-card"><a-statistic title="待处理投诉" :value="report.pendingComplaints" /></div>
      <div class="metric-card"><a-statistic title="黑名单" :value="report.activeBlacklist" /></div>
      <div class="metric-card"><a-statistic title="异常订单" :value="report.openExceptions" /></div>
      <div class="metric-card danger"><a-statistic title="高风险事件" :value="report.highRiskEvents" /></div>
    </div>

    <div class="panel table-panel">
      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="profile" tab="对外资料审核">
          <a-table row-key="id" :columns="profileColumns" :data-source="profileReviews" :pagination="false">
            <template #bodyCell="{ column, record }">
              <StatusTag v-if="column.dataIndex === 'status'" :status="record.status" />
              <StatusTag v-else-if="column.dataIndex === 'imageAuditStatus'" :status="record.imageAuditStatus" />
              <StatusTag v-else-if="column.dataIndex === 'riskLevel'" :status="record.riskLevel" />
              <template v-else-if="column.dataIndex === 'findings'">
                <a-space wrap><a-tag v-for="hit in record.findings" :key="hit.keyword" color="red">{{ hit.keyword }}</a-tag></a-space>
              </template>
              <template v-else-if="column.key === 'action'">
                <a-space>
                  <a-button type="link" @click="openProfileDetail(record)">详情</a-button>
                  <a-button type="link" :disabled="!canOperateProfile" @click="decideProfile(record, 'approved')">通过</a-button>
                  <a-button type="link" danger :disabled="!canOperateProfile" @click="openReject(record)">驳回</a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="words" tab="敏感词库">
          <div class="tab-toolbar">
            <a-button type="primary" @click="openWord()">新增敏感词</a-button>
          </div>
          <a-table row-key="id" :columns="wordColumns" :data-source="sensitiveWords" :pagination="false">
            <template #bodyCell="{ column, record }">
              <StatusTag v-if="column.dataIndex === 'status'" :status="record.status" />
              <StatusTag v-else-if="column.dataIndex === 'level'" :status="record.level" />
              <template v-else-if="column.key === 'action'">
                <a-button type="link" @click="openWord(record)">编辑</a-button>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="complaints" tab="投诉管理">
          <a-table row-key="id" :columns="complaintColumns" :data-source="complaints" :pagination="false">
            <template #bodyCell="{ column, record }">
              <StatusTag v-if="column.dataIndex === 'status'" :status="record.status" />
              <StatusTag v-else-if="column.dataIndex === 'priority'" :status="record.priority" />
              <template v-else-if="column.key === 'action'">
                <a-space>
                  <a-button type="link" @click="openComplaint(record)">处理</a-button>
                  <a-button type="link" @click="resolveComplaint(record)">解决</a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="blacklist" tab="黑名单">
          <div class="tab-toolbar">
            <a-button type="primary" @click="openBlacklist">新增黑名单</a-button>
          </div>
          <a-table row-key="id" :columns="blacklistColumns" :data-source="blacklist" :pagination="false">
            <template #bodyCell="{ column, record }">
              <StatusTag v-if="column.dataIndex === 'status'" :status="record.status" />
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="exceptions" tab="异常订单">
          <a-table row-key="id" :columns="exceptionColumns" :data-source="exceptions" :pagination="false">
            <template #bodyCell="{ column, record }">
              <StatusTag v-if="column.dataIndex === 'status'" :status="record.status" />
              <StatusTag v-else-if="column.dataIndex === 'riskLevel'" :status="record.riskLevel" />
              <template v-else-if="column.key === 'action'">
                <a-space>
                  <a-button type="link" @click="resolveException(record, 'processing')">处理中</a-button>
                  <a-button type="link" @click="resolveException(record, 'resolved')">解决</a-button>
                  <a-button type="link" @click="resolveException(record, 'ignored')">忽略</a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </div>

    <a-modal v-model:open="detectOpen" title="敏感词检测" width="760px" @ok="runDetect">
      <a-textarea v-model:value="detectText" :rows="6" placeholder="粘贴助理对外展示资料、客户需求、投诉文本或 brief 文案" />
      <div v-if="detectResult" class="detect-result">
        <a-alert :type="detectResult.safe ? 'success' : 'error'" show-icon :message="detectResult.safe ? '未命中风险规则' : `命中 ${detectResult.hits.length} 条风险规则`" />
        <div class="drawer-section-title">脱敏文本</div>
        <div class="brief-box">{{ detectResult.sanitizedText }}</div>
        <a-space wrap>
          <a-tag v-for="hit in detectResult.hits" :key="hit.keyword" color="red">{{ hit.keyword }} · {{ hit.category }}</a-tag>
        </a-space>
      </div>
    </a-modal>

    <a-modal v-model:open="wordOpen" title="敏感词" @ok="saveWord">
      <a-form layout="vertical" :model="wordForm">
        <a-form-item label="词条"><a-input v-model:value="wordForm.keyword" /></a-form-item>
        <a-form-item label="分类"><a-input v-model:value="wordForm.category" /></a-form-item>
        <a-form-item label="等级">
          <a-select v-model:value="wordForm.level">
            <a-select-option value="medium">中</a-select-option>
            <a-select-option value="high">高</a-select-option>
            <a-select-option value="critical">严重</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="wordForm.status">
            <a-select-option value="active">启用</a-select-option>
            <a-select-option value="inactive">停用</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注"><a-textarea v-model:value="wordForm.note" :rows="3" /></a-form-item>
      </a-form>
    </a-modal>

    <a-drawer v-model:open="profileOpen" title="资料审核详情" width="640">
      <template v-if="selectedProfile">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="助理编号">{{ selectedProfile.assistantNo }}</a-descriptions-item>
          <a-descriptions-item label="工作名">{{ selectedProfile.workName }}</a-descriptions-item>
          <a-descriptions-item label="审核状态"><StatusTag :status="selectedProfile.status" /></a-descriptions-item>
          <a-descriptions-item label="图片审核"><StatusTag :status="selectedProfile.imageAuditStatus" /></a-descriptions-item>
          <a-descriptions-item label="风险等级"><StatusTag :status="selectedProfile.riskLevel" /></a-descriptions-item>
          <a-descriptions-item label="快照">{{ JSON.stringify(selectedProfile.contentSnapshot) }}</a-descriptions-item>
        </a-descriptions>
        <div class="drawer-section-title">命中项</div>
        <a-space wrap><a-tag v-for="hit in selectedProfile.findings" :key="hit.keyword" color="red">{{ hit.keyword }}</a-tag></a-space>
      </template>
    </a-drawer>

    <a-modal v-model:open="rejectOpen" title="驳回资料" @ok="saveReject">
      <a-textarea v-model:value="rejectReason" :rows="4" placeholder="说明驳回原因" />
    </a-modal>

    <a-modal v-model:open="complaintOpen" title="处理投诉" @ok="saveComplaint">
      <a-form layout="vertical">
        <a-form-item label="处理结论"><a-textarea v-model:value="complaintResolution" :rows="4" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="blacklistOpen" title="新增黑名单" @ok="saveBlacklist">
      <a-form layout="vertical" :model="blacklistForm">
        <a-form-item label="对象类型"><a-select v-model:value="blacklistForm.subjectType"><a-select-option value="customer">客户</a-select-option><a-select-option value="assistant">商务助理</a-select-option></a-select></a-form-item>
        <a-form-item label="对象名称"><a-input v-model:value="blacklistForm.subjectName" /></a-form-item>
        <a-form-item label="原因"><a-textarea v-model:value="blacklistForm.reason" :rows="4" /></a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue';
import { computed, reactive, ref } from 'vue';
import { apiClient } from '@/api/client';
import StatusTag from '@/components/StatusTag.vue';
import { hasPermission } from '@/config/menu';
import { useAuthStore } from '@/stores/auth';
import type {
  BlacklistRecord,
  ComplaintRecord,
  OrderExceptionRecord,
  PublicProfileReviewRecord,
  RiskDetectionResult,
  RiskReportSummary,
  SensitiveWordRecord
} from '@/types/domain';

const auth = useAuthStore();
const activeTab = ref('profile');
const report = reactive<RiskReportSummary>({ pendingProfileReviews: 0, pendingComplaints: 0, activeBlacklist: 0, openExceptions: 0, highRiskEvents: 0 });
const sensitiveWords = ref<SensitiveWordRecord[]>([]);
const profileReviews = ref<PublicProfileReviewRecord[]>([]);
const complaints = ref<ComplaintRecord[]>([]);
const blacklist = ref<BlacklistRecord[]>([]);
const exceptions = ref<OrderExceptionRecord[]>([]);
const detectOpen = ref(false);
const detectText = ref('');
const detectResult = ref<RiskDetectionResult | null>(null);
const wordOpen = ref(false);
const wordForm = reactive<Partial<SensitiveWordRecord>>({ level: 'medium', status: 'active' });
const selectedWordId = ref<string | undefined>();
const profileOpen = ref(false);
const selectedProfile = ref<PublicProfileReviewRecord | null>(null);
const rejectOpen = ref(false);
const rejectReason = ref('');
const complaintOpen = ref(false);
const selectedComplaint = ref<ComplaintRecord | null>(null);
const complaintResolution = ref('');
const blacklistOpen = ref(false);
const blacklistForm = reactive<Partial<BlacklistRecord>>({ subjectType: 'customer', subjectName: '', reason: '', status: 'active' });

const canOperateProfile = computed(() => hasPermission(auth.permissions, 'risk:profile_review'));

const profileColumns = [
  { title: '助理编号', dataIndex: 'assistantNo', width: 120 },
  { title: '工作名', dataIndex: 'workName', width: 120 },
  { title: '状态', dataIndex: 'status', width: 120 },
  { title: '图片审核', dataIndex: 'imageAuditStatus', width: 120 },
  { title: '风险', dataIndex: 'riskLevel', width: 100 },
  { title: '命中项', dataIndex: 'findings' },
  { title: '更新时间', dataIndex: 'updatedAt', width: 170 },
  { title: '操作', key: 'action', width: 180, fixed: 'right' }
];
const wordColumns = [
  { title: '词条', dataIndex: 'keyword', width: 160 },
  { title: '分类', dataIndex: 'category', width: 180 },
  { title: '等级', dataIndex: 'level', width: 100 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '命中次数', dataIndex: 'hitCount', width: 100 },
  { title: '备注', dataIndex: 'note' },
  { title: '操作', key: 'action', width: 100 }
];
const complaintColumns = [
  { title: '投诉编号', dataIndex: 'complaintNo', width: 160 },
  { title: '订单号', dataIndex: 'orderNo', width: 160 },
  { title: '分类', dataIndex: 'category', width: 140 },
  { title: '描述', dataIndex: 'description' },
  { title: '状态', dataIndex: 'status', width: 110 },
  { title: '优先级', dataIndex: 'priority', width: 100 },
  { title: '操作', key: 'action', width: 140 }
];
const blacklistColumns = [
  { title: '对象类型', dataIndex: 'subjectType', width: 120 },
  { title: '对象名称', dataIndex: 'subjectName', width: 180 },
  { title: '原因', dataIndex: 'reason' },
  { title: '状态', dataIndex: 'status', width: 110 },
  { title: '创建时间', dataIndex: 'createdAt', width: 170 }
];
const exceptionColumns = [
  { title: '异常编号', dataIndex: 'exceptionNo', width: 160 },
  { title: '订单号', dataIndex: 'orderNo', width: 160 },
  { title: '分类', dataIndex: 'category', width: 150 },
  { title: '等级', dataIndex: 'riskLevel', width: 100 },
  { title: '状态', dataIndex: 'status', width: 110 },
  { title: '摘要', dataIndex: 'summary' },
  { title: '操作', key: 'action', width: 180 }
];

async function loadAll() {
  const [nextReport, words, reviews, complaintPage, blacklistPage, exceptionPage] = await Promise.all([
    apiClient.getRiskReport(),
    apiClient.listSensitiveWords({ page: 1, pageSize: 50 }),
    apiClient.listProfileReviews({ page: 1, pageSize: 50 }),
    apiClient.listComplaints({ page: 1, pageSize: 50 }),
    apiClient.listBlacklist({ page: 1, pageSize: 50 }),
    apiClient.listOrderExceptions({ page: 1, pageSize: 50 })
  ]);
  Object.assign(report, nextReport);
  sensitiveWords.value = words.list;
  profileReviews.value = reviews.list;
  complaints.value = complaintPage.list;
  blacklist.value = blacklistPage.list;
  exceptions.value = exceptionPage.list;
}

function openDetect() {
  detectOpen.value = true;
  detectResult.value = null;
}

async function runDetect() {
  detectResult.value = await apiClient.detectRiskText(detectText.value);
  message.success('检测完成');
}

function openWord(record?: SensitiveWordRecord) {
  selectedWordId.value = record?.id;
  Object.assign(wordForm, record || { keyword: '', category: 'boundary_violation', level: 'medium', status: 'active', note: '' });
  wordOpen.value = true;
}

async function saveWord() {
  if (!wordForm.keyword || !wordForm.category) {
    message.warning('请填写词条和分类');
    return;
  }
  await apiClient.saveSensitiveWord(selectedWordId.value, wordForm);
  message.success('敏感词已保存，并写入审计日志');
  wordOpen.value = false;
  await loadAll();
}

function openProfileDetail(record: PublicProfileReviewRecord) {
  selectedProfile.value = record;
  profileOpen.value = true;
}

async function decideProfile(record: PublicProfileReviewRecord, status: string) {
  await apiClient.decideProfileReview(record.id, status, 'approved');
  message.success('资料审核已通过');
  await loadAll();
}

function openReject(record: PublicProfileReviewRecord) {
  selectedProfile.value = record;
  rejectReason.value = record.rejectionReason || '';
  rejectOpen.value = true;
}

async function saveReject() {
  if (!selectedProfile.value) return;
  await apiClient.decideProfileReview(selectedProfile.value.id, 'rejected', 'rejected', rejectReason.value);
  message.success('资料已驳回');
  rejectOpen.value = false;
  await loadAll();
}

function openComplaint(record: ComplaintRecord) {
  selectedComplaint.value = record;
  complaintResolution.value = record.resolution || '';
  complaintOpen.value = true;
}

async function saveComplaint() {
  if (!selectedComplaint.value) return;
  await apiClient.updateComplaint(selectedComplaint.value.id, 'processing', complaintResolution.value);
  message.success('投诉处理记录已保存');
  complaintOpen.value = false;
  await loadAll();
}

async function resolveComplaint(record: ComplaintRecord) {
  await apiClient.updateComplaint(record.id, 'resolved', record.resolution || '已完成复核并闭环。');
  message.success('投诉已解决');
  await loadAll();
}

function openBlacklist() {
  Object.assign(blacklistForm, { subjectType: 'customer', subjectName: '', reason: '', status: 'active' });
  blacklistOpen.value = true;
}

async function saveBlacklist() {
  if (!blacklistForm.subjectName || !blacklistForm.reason) {
    message.warning('请填写对象名称和原因');
    return;
  }
  await apiClient.saveBlacklist(blacklistForm);
  message.success('黑名单已新增');
  blacklistOpen.value = false;
  await loadAll();
}

async function resolveException(record: OrderExceptionRecord, status: string) {
  await apiClient.resolveOrderException(record.id, status);
  message.success('异常单状态已更新');
  await loadAll();
}

loadAll();
</script>

<style scoped>
.risk-report {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.metric-card {
  padding: 18px;
  border: 1px solid rgba(214, 226, 243, 0.1);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(14, 23, 35, 0.96), rgba(8, 14, 23, 0.96));
}

.metric-card.danger {
  border-color: rgba(255, 120, 117, 0.38);
  background: rgba(255, 77, 79, 0.08);
}

.tab-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.detect-result {
  margin-top: 16px;
}

.brief-box {
  white-space: pre-wrap;
  padding: 14px;
  border: 1px solid rgba(214, 226, 243, 0.1);
  border-radius: 8px;
  background: rgba(5, 10, 16, 0.66);
  color: #dfe8f5;
  line-height: 1.7;
}

@media (max-width: 1200px) {
  .risk-report {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
