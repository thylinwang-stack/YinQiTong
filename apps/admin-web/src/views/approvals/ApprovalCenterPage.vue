<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">审批中心</h1>
        <div class="page-desc">支持退款、结算、助理资料变更和异常订单审批。</div>
      </div>
    </div>

    <div class="panel filter-panel">
      <a-form layout="inline" :model="query">
        <a-form-item label="关键词">
          <a-input v-model:value="query.keyword" allow-clear placeholder="审批号、标题、申请人" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="query.status" allow-clear style="width: 140px">
            <a-select-option value="pending">待处理</a-select-option>
            <a-select-option value="approved">已通过</a-select-option>
            <a-select-option value="rejected">已驳回</a-select-option>
          </a-select>
        </a-form-item>
        <a-button type="primary" @click="load">查询</a-button>
      </a-form>
    </div>

    <div class="panel table-panel">
      <a-table row-key="id" :columns="columns" :data-source="records" :loading="loading" :pagination="pagination" @change="handleTableChange">
        <template #bodyCell="{ column, record }">
          <StatusTag v-if="column.dataIndex === 'status'" :status="record.status" />
          <template v-else-if="column.dataIndex === 'amount'">¥{{ Number(record.amount || 0).toLocaleString() }}</template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" @click="openDetail(record)">详情</a-button>
              <a-button type="link" :disabled="record.status !== 'pending'" @click="openDecision(record, 'approved')">通过</a-button>
              <a-button type="link" danger :disabled="record.status !== 'pending'" @click="openDecision(record, 'rejected')">驳回</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal v-model:open="decisionOpen" :title="decisionTitle" @ok="submitDecision">
      <a-form layout="vertical">
        <a-form-item label="备注">
          <a-textarea v-model:value="decisionRemark" :rows="4" placeholder="请输入审批意见" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer v-model:open="detailOpen" width="520" title="审批详情">
      <a-descriptions v-if="detailRecord" :column="1" bordered size="small">
        <a-descriptions-item label="审批号">{{ detailRecord.approvalNo }}</a-descriptions-item>
        <a-descriptions-item label="类型">{{ detailRecord.bizType }}</a-descriptions-item>
        <a-descriptions-item label="标题">{{ detailRecord.title }}</a-descriptions-item>
        <a-descriptions-item label="申请人">{{ detailRecord.applicant }}</a-descriptions-item>
        <a-descriptions-item label="金额">¥{{ Number(detailRecord.amount || 0).toLocaleString() }}</a-descriptions-item>
        <a-descriptions-item label="状态"><StatusTag :status="detailRecord.status" /></a-descriptions-item>
        <a-descriptions-item label="备注">{{ detailRecord.remark || '-' }}</a-descriptions-item>
      </a-descriptions>
    </a-drawer>
  </section>
</template>

<script setup lang="ts">
import type { TablePaginationConfig } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { computed, reactive, ref } from 'vue';
import { apiClient } from '@/api/client';
import StatusTag from '@/components/StatusTag.vue';
import type { ApprovalRecord, PageQuery } from '@/types/domain';

const loading = ref(false);
const records = ref<ApprovalRecord[]>([]);
const total = ref(0);
const query = reactive<PageQuery>({ page: 1, pageSize: 10, keyword: '', status: undefined });
const decisionOpen = ref(false);
const decisionAction = ref<'approved' | 'rejected'>('approved');
const decisionRemark = ref('');
const current = ref<ApprovalRecord | null>(null);
const detailOpen = ref(false);
const detailRecord = ref<ApprovalRecord | null>(null);
const decisionTitle = computed(() => decisionAction.value === 'approved' ? '审批通过' : '审批驳回');

const columns = [
  { title: '审批号', dataIndex: 'approvalNo', width: 160 },
  { title: '类型', dataIndex: 'bizType', width: 130 },
  { title: '标题', dataIndex: 'title' },
  { title: '申请人', dataIndex: 'applicant', width: 120 },
  { title: '金额', dataIndex: 'amount', width: 120 },
  { title: '状态', dataIndex: 'status', width: 120 },
  { title: '申请时间', dataIndex: 'createdAt', width: 170 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' }
];

const pagination = computed<TablePaginationConfig>(() => ({ current: Number(query.page), pageSize: Number(query.pageSize), total: total.value }));

function handleTableChange(next: TablePaginationConfig) {
  query.page = next.current || 1;
  query.pageSize = next.pageSize || 10;
  load();
}

async function load() {
  loading.value = true;
  try {
    const result = await apiClient.listApprovals(query);
    records.value = result.list;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

function openDecision(record: ApprovalRecord, action: 'approved' | 'rejected') {
  current.value = record;
  decisionAction.value = action;
  decisionRemark.value = '';
  decisionOpen.value = true;
}

function openDetail(record: ApprovalRecord) {
  detailRecord.value = record;
  detailOpen.value = true;
}

async function submitDecision() {
  if (!current.value) return;
  await apiClient.decideApproval(current.value.id, decisionAction.value, decisionRemark.value);
  message.success('审批已处理，并写入审计日志');
  decisionOpen.value = false;
  await load();
}

load();
</script>
