<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">审计日志</h1>
        <div class="page-desc">查询登录、状态变更、审批、财务处理和敏感资料查看记录。</div>
      </div>
    </div>

    <div class="panel filter-panel">
      <a-form layout="inline" :model="query">
        <a-form-item label="关键词">
          <a-input v-model:value="query.keyword" allow-clear placeholder="操作者、动作、资源" />
        </a-form-item>
        <a-button type="primary" @click="load">查询</a-button>
      </a-form>
    </div>

    <div class="panel table-panel">
      <a-table row-key="id" :columns="columns" :data-source="records" :loading="loading" :pagination="pagination" @change="handleTableChange">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'metadata'">
            <code>{{ JSON.stringify(record.metadata) }}</code>
          </template>
        </template>
      </a-table>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { TablePaginationConfig } from 'ant-design-vue';
import { computed, reactive, ref } from 'vue';
import { apiClient } from '@/api/client';
import type { AuditLogRecord, PageQuery } from '@/types/domain';

const loading = ref(false);
const records = ref<AuditLogRecord[]>([]);
const total = ref(0);
const query = reactive<PageQuery>({ page: 1, pageSize: 10, keyword: '' });

const columns = [
  { title: '操作者', dataIndex: 'actor', width: 130 },
  { title: '动作', dataIndex: 'action', width: 210 },
  { title: '资源类型', dataIndex: 'resourceType', width: 120 },
  { title: '资源 ID', dataIndex: 'resourceId', width: 150 },
  { title: 'IP', dataIndex: 'ip', width: 120 },
  { title: '元数据', dataIndex: 'metadata' },
  { title: '时间', dataIndex: 'createdAt', width: 170 }
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
    const result = await apiClient.listAuditLogs(query);
    records.value = result.list;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

load();
</script>
