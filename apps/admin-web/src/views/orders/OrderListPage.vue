<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">订单管理</h1>
        <div class="page-desc">管理需求确认、支付状态、排班匹配、餐前准备和服务履约。</div>
      </div>
      <a-space>
        <a-button @click="reset">重置</a-button>
        <a-button @click="load">刷新</a-button>
        <a-button type="primary" :disabled="selectedRowKeys.length === 0" @click="openStatusModal()">
          批量推进 {{ selectedRowKeys.length ? `(${selectedRowKeys.length})` : '' }}
        </a-button>
      </a-space>
    </div>

    <div class="summary-grid compact">
      <button
        v-for="item in statusSummary"
        :key="item.status"
        class="summary-card as-button"
        :class="{ active: query.status === item.status }"
        @click="quickFilter(item.status)"
      >
        <span>{{ item.label }}</span>
        <strong>{{ item.count }}</strong>
      </button>
    </div>

    <div class="panel filter-panel">
      <a-form layout="inline" :model="query">
        <a-form-item label="关键词">
          <a-input v-model:value="query.keyword" allow-clear placeholder="订单号、客户、场景" />
        </a-form-item>
        <a-form-item label="城市">
          <a-select v-model:value="query.city" allow-clear placeholder="全部城市" style="width: 140px">
            <a-select-option value="上海">上海</a-select-option>
            <a-select-option value="北京">北京</a-select-option>
            <a-select-option value="深圳">深圳</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="query.status" allow-clear placeholder="全部状态" style="width: 160px">
            <a-select-option value="pending_payment">待支付</a-select-option>
            <a-select-option value="pending_match">待匹配</a-select-option>
            <a-select-option value="matched">已匹配</a-select-option>
            <a-select-option value="brief_preparing">餐前准备</a-select-option>
            <a-select-option value="in_service">服务中</a-select-option>
            <a-select-option value="completed">已完成</a-select-option>
            <a-select-option value="risk_hold">风控冻结</a-select-option>
          </a-select>
        </a-form-item>
        <a-button type="primary" @click="load">查询</a-button>
      </a-form>
    </div>

    <div class="panel table-panel">
      <a-table
        row-key="id"
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="pagination"
        :row-selection="rowSelection"
        :scroll="{ x: 1280 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <StatusTag v-if="column.dataIndex === 'status'" :status="record.status" />
          <template v-else-if="column.dataIndex === 'amount'">¥{{ record.amount.toLocaleString() }}</template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" @click="openDetail(record)">详情</a-button>
              <a-button type="link" :disabled="isLocked(record.status)" @click="openStatusModal(record)">改状态</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-drawer v-model:open="detailOpen" width="680" title="订单详情">
      <template v-if="selected">
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="订单号">{{ selected.orderNo }}</a-descriptions-item>
          <a-descriptions-item label="客户">{{ selected.customerName }}</a-descriptions-item>
          <a-descriptions-item label="服务场景">{{ selected.sceneName }}</a-descriptions-item>
          <a-descriptions-item label="城市">{{ selected.city }}</a-descriptions-item>
          <a-descriptions-item label="服务时间">{{ selected.serviceTime }}</a-descriptions-item>
          <a-descriptions-item label="商务助理人数">{{ selected.assistantCount }}</a-descriptions-item>
          <a-descriptions-item label="订单金额">¥{{ selected.amount.toLocaleString() }}</a-descriptions-item>
          <a-descriptions-item label="风险等级">{{ selected.riskLevel }}</a-descriptions-item>
          <a-descriptions-item label="状态"><StatusTag :status="selected.status" /></a-descriptions-item>
          <a-descriptions-item label="负责人">{{ selected.manager }}</a-descriptions-item>
        </a-descriptions>

        <div class="drawer-section-title">订单状态时间线</div>
        <a-timeline>
          <a-timeline-item v-for="item in selected.timeline" :key="item.time">
            <strong>{{ item.title }}</strong>
            <div class="timeline-meta">{{ item.time }} · {{ item.operator }}</div>
            <div v-if="item.note" class="timeline-note">{{ item.note }}</div>
          </a-timeline-item>
        </a-timeline>

        <AuditHint />
      </template>
    </a-drawer>

    <a-modal v-model:open="statusModalOpen" title="修改订单状态" :confirm-loading="savingStatus" @ok="saveStatus">
      <a-form layout="vertical" :model="statusForm">
        <a-alert
          type="info"
          show-icon
          :message="`本次将更新 ${statusForm.ids.length} 个订单`"
          description="系统会校验状态流转方向；取消和风控冻结必须填写原因，并写入审计日志。"
          class="modal-hint"
        />
        <a-form-item label="目标状态">
          <a-select v-model:value="statusForm.status">
            <a-select-option v-for="item in bookingStatusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="statusForm.note" :rows="4" placeholder="说明状态变更原因" />
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
import type { BookingRecord, PageQuery } from '@/types/domain';
import {
  bookingStatusOptions,
  canTransitionBookingStatus,
  getStatusText,
  isTerminalBookingStatus,
  suggestNextBookingStatus
} from '@/utils/status';

const loading = ref(false);
const savingStatus = ref(false);
const records = ref<BookingRecord[]>([]);
const total = ref(0);
const selected = ref<BookingRecord | null>(null);
const detailOpen = ref(false);
const statusModalOpen = ref(false);
const selectedRowKeys = ref<string[]>([]);
const query = reactive<PageQuery>({ page: 1, pageSize: 10, keyword: '', city: undefined, status: undefined });
const statusForm = reactive({ ids: [] as string[], status: 'pending_match', note: '' });

const columns = [
  { title: '订单号', dataIndex: 'orderNo', width: 160 },
  { title: '客户', dataIndex: 'customerName', width: 120 },
  { title: '场景', dataIndex: 'sceneName', width: 120 },
  { title: '城市', dataIndex: 'city', width: 90 },
  { title: '服务时间', dataIndex: 'serviceTime', width: 170 },
  { title: '助理人数', dataIndex: 'assistantCount', width: 100 },
  { title: '金额', dataIndex: 'amount', width: 110 },
  { title: '状态', dataIndex: 'status', width: 130 },
  { title: '负责人', dataIndex: 'manager', width: 140 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' }
];

const pagination = computed<TablePaginationConfig>(() => ({
  current: Number(query.page),
  pageSize: Number(query.pageSize),
  total: total.value,
  showSizeChanger: true,
  showTotal: value => `共 ${value} 条`
}));

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: string[]) => {
    selectedRowKeys.value = keys.map(String);
  },
  getCheckboxProps: (record: BookingRecord) => ({
    disabled: isLocked(record.status)
  })
}));

const statusSummary = computed(() => {
  const statuses = ['pending_payment', 'pending_match', 'matched', 'brief_preparing', 'in_service', 'completed', 'risk_hold'];
  return statuses.map(status => ({
    status,
    label: getStatusText(status),
    count: records.value.filter(item => item.status === status).length
  }));
});

async function load() {
  loading.value = true;
  try {
    const result = await apiClient.listBookings(query);
    records.value = result.list;
    total.value = result.total;
    selectedRowKeys.value = selectedRowKeys.value.filter(id => result.list.some(item => item.id === id));
  } catch (error) {
    message.error((error as Error).message || '订单加载失败');
  } finally {
    loading.value = false;
  }
}

function reset() {
  query.keyword = '';
  query.city = undefined;
  query.status = undefined;
  query.page = 1;
  load();
}

function quickFilter(status: string) {
  query.status = query.status === status ? undefined : status;
  query.page = 1;
  load();
}

function handleTableChange(next: TablePaginationConfig) {
  query.page = next.current || 1;
  query.pageSize = next.pageSize || 10;
  load();
}

function openDetail(record: BookingRecord) {
  selected.value = record;
  detailOpen.value = true;
}

function openStatusModal(record?: BookingRecord) {
  const ids = record ? [record.id] : [...selectedRowKeys.value];
  if (!ids.length) {
    message.warning('请先选择要推进的订单');
    return;
  }
  const first = records.value.find(item => item.id === ids[0]);
  statusForm.ids = ids;
  statusForm.status = suggestNextBookingStatus(first?.status || 'pending_match');
  statusForm.note = '';
  statusModalOpen.value = true;
}

async function saveStatus() {
  if (!statusForm.ids.length) return;
  const targets = records.value.filter(item => statusForm.ids.includes(item.id));
  const invalid = targets.find(item => !canTransitionBookingStatus(item.status, statusForm.status));
  if (invalid) {
    message.warning(`${invalid.orderNo} 不能从「${getStatusText(invalid.status)}」直接变更为「${getStatusText(statusForm.status)}」`);
    return;
  }
  if (['cancelled', 'risk_hold'].includes(statusForm.status) && !statusForm.note.trim()) {
    message.warning('取消订单或风控冻结必须填写原因');
    return;
  }
  savingStatus.value = true;
  try {
    await Promise.all(statusForm.ids.map(id => apiClient.updateBookingStatus(id, statusForm.status, statusForm.note)));
    message.success(`已更新 ${statusForm.ids.length} 个订单，并写入审计日志`);
    selectedRowKeys.value = [];
    statusModalOpen.value = false;
    await load();
  } catch (error) {
    message.error((error as Error).message || '订单状态更新失败');
  } finally {
    savingStatus.value = false;
  }
}

function isLocked(status: string) {
  return isTerminalBookingStatus(status);
}

load();
</script>

<style scoped>
.timeline-meta,
.timeline-note {
  margin-top: 4px;
  color: #8c98a8;
  font-size: 12px;
}

.modal-hint {
  margin-bottom: 16px;
}
</style>
