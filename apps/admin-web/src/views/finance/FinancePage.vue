<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">支付与财务</h1>
        <div class="page-desc">展示支付、退款、结算三类财务流水，后端需保证支付回调幂等。</div>
      </div>
      <a-button @click="exportAudit">导出财务流水</a-button>
    </div>

    <a-tabs v-model:active-key="activeType" class="panel finance-tabs" @change="load">
      <a-tab-pane key="payment" tab="支付流水" />
      <a-tab-pane key="refund" tab="退款记录" />
      <a-tab-pane key="settlement" tab="结算流水" />
    </a-tabs>

    <div class="panel filter-panel">
      <a-form layout="inline" :model="query">
        <a-form-item label="关键词">
          <a-input v-model:value="query.keyword" allow-clear placeholder="流水号、订单号、科目" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="query.status" allow-clear style="width: 140px">
            <a-select-option value="paid">已支付</a-select-option>
            <a-select-option value="processing">处理中</a-select-option>
            <a-select-option value="pending">待处理</a-select-option>
            <a-select-option value="refunded">已退款</a-select-option>
          </a-select>
        </a-form-item>
        <a-button type="primary" @click="load">查询</a-button>
      </a-form>
    </div>

    <div class="panel table-panel">
      <a-table row-key="id" :columns="columns" :data-source="visibleRecords" :loading="loading" :pagination="pagination" @change="handleTableChange">
        <template #bodyCell="{ column, record }">
          <StatusTag v-if="column.dataIndex === 'status'" :status="record.status" />
          <template v-else-if="column.dataIndex === 'amount'">¥{{ record.amount.toLocaleString() }}</template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" @click="openDetail(record)">详情</a-button>
              <a-button type="link" @click="openEdit(record)">编辑</a-button>
              <a-button type="link" @click="writeFinanceAudit(record)">记录审计</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-drawer v-model:open="detailOpen" width="520" title="财务流水详情">
      <a-descriptions v-if="selected" :column="1" bordered size="small">
        <a-descriptions-item label="流水号">{{ selected.no }}</a-descriptions-item>
        <a-descriptions-item label="订单号">{{ selected.orderNo }}</a-descriptions-item>
        <a-descriptions-item label="科目">{{ selected.subject }}</a-descriptions-item>
        <a-descriptions-item label="金额">¥{{ selected.amount.toLocaleString() }}</a-descriptions-item>
        <a-descriptions-item label="状态"><StatusTag :status="selected.status" /></a-descriptions-item>
        <a-descriptions-item label="支付渠道">{{ selected.provider || '-' }}</a-descriptions-item>
        <a-descriptions-item label="创建时间">{{ selected.createdAt }}</a-descriptions-item>
      </a-descriptions>
      <div class="drawer-section-title">审计与幂等</div>
      <AuditHint />
    </a-drawer>

    <a-modal v-model:open="editOpen" title="编辑财务状态" @ok="saveEdit">
      <a-form layout="vertical" :model="editForm">
        <a-form-item label="状态">
          <a-select v-model:value="editForm.status">
            <a-select-option value="pending">待处理</a-select-option>
            <a-select-option value="processing">处理中</a-select-option>
            <a-select-option value="paid">已支付</a-select-option>
            <a-select-option value="refunded">已退款</a-select-option>
            <a-select-option value="failed">失败</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="editForm.remark" :rows="4" />
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import type { TablePaginationConfig } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { computed, reactive, ref } from 'vue';
import { apiClient } from '@/api/client';
import AuditHint from '@/components/AuditHint.vue';
import StatusTag from '@/components/StatusTag.vue';
import type { FinanceRecord, PageQuery } from '@/types/domain';

const activeType = ref<'payment' | 'refund' | 'settlement'>('payment');
const loading = ref(false);
const records = ref<FinanceRecord[]>([]);
const total = ref(0);
const selected = ref<FinanceRecord | null>(null);
const detailOpen = ref(false);
const editOpen = ref(false);
const query = reactive<PageQuery>({ page: 1, pageSize: 10, keyword: '', status: undefined });
const editForm = reactive({ id: '', status: 'pending', remark: '' });

const columns = [
  { title: '流水号', dataIndex: 'no', width: 160 },
  { title: '订单号', dataIndex: 'orderNo', width: 160 },
  { title: '科目', dataIndex: 'subject' },
  { title: '金额', dataIndex: 'amount', width: 120 },
  { title: '状态', dataIndex: 'status', width: 120 },
  { title: '渠道', dataIndex: 'provider', width: 120 },
  { title: '创建时间', dataIndex: 'createdAt', width: 170 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' }
];

const visibleRecords = computed(() => records.value.filter(item => item.type === activeType.value));
const pagination = computed<TablePaginationConfig>(() => ({
  current: Number(query.page),
  pageSize: Number(query.pageSize),
  total: total.value
}));

function handleTableChange(next: TablePaginationConfig) {
  query.page = next.current || 1;
  query.pageSize = next.pageSize || 10;
  load();
}

async function load() {
  loading.value = true;
  try {
    const result = await apiClient.listFinance(query);
    records.value = result.list;
    total.value = visibleRecords.value.length;
  } finally {
    loading.value = false;
  }
}

function openDetail(record: FinanceRecord) {
  selected.value = record;
  detailOpen.value = true;
}

function openEdit(record: FinanceRecord) {
  editForm.id = record.id;
  editForm.status = record.status;
  editForm.remark = '';
  editOpen.value = true;
}

async function saveEdit() {
  const target = records.value.find(item => item.id === editForm.id);
  if (target) target.status = editForm.status;
  await apiClient.writeAudit('finance.update_status', 'finance_record', editForm.id, {
    status: editForm.status,
    remark: editForm.remark
  });
  message.success('财务状态编辑已记录审计');
  editOpen.value = false;
  await load();
}

async function writeFinanceAudit(record: FinanceRecord) {
  await apiClient.writeAudit('finance.manual_check', record.type, record.id, { no: record.no });
  message.success('已写入审计日志');
}

async function exportAudit() {
  await apiClient.writeAudit('finance.export', 'finance', activeType.value);
  message.success('导出行为已写入审计日志');
}

load();
</script>

<style scoped>
.finance-tabs {
  margin-bottom: 12px;
  padding: 0 16px;
}
</style>
