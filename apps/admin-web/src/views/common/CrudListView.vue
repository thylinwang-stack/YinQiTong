<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ config.title }}</h1>
        <div class="page-desc">{{ config.description }}</div>
      </div>
      <a-button type="primary" :disabled="!canCreate" @click="openEdit()">新增</a-button>
    </div>

    <div class="panel filter-panel">
      <a-form layout="inline" :model="query">
        <a-form-item label="关键词">
          <a-input v-model:value="query.keyword" allow-clear placeholder="编号、名称、负责人" />
        </a-form-item>
        <a-form-item label="城市">
          <a-select v-model:value="query.city" allow-clear placeholder="全部城市" style="width: 140px">
            <a-select-option value="上海">上海</a-select-option>
            <a-select-option value="北京">北京</a-select-option>
            <a-select-option value="深圳">深圳</a-select-option>
            <a-select-option value="杭州">杭州</a-select-option>
            <a-select-option value="全局">全局</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="query.status" allow-clear placeholder="全部状态" style="width: 140px">
            <a-select-option v-for="item in config.statusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-space>
          <a-button type="primary" @click="load">查询</a-button>
          <a-button @click="reset">重置</a-button>
        </a-space>
      </a-form>
    </div>

    <div class="panel table-panel">
      <a-table
        row-key="id"
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'status'">
            <StatusTag :status="record.status" />
          </template>
          <template v-else-if="column.dataIndex === 'amount'">
            ¥{{ Number(record.amount || 0).toLocaleString() }}
          </template>
          <template v-else-if="column.dataIndex === 'tags'">
            <a-space wrap>
              <a-tag v-for="tag in record.tags || []" :key="tag">{{ tag }}</a-tag>
            </a-space>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" @click="openDetail(record)">详情</a-button>
              <a-button type="link" :disabled="!canUpdate" @click="openEdit(record)">编辑</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-drawer v-model:open="detailOpen" width="520" title="详情">
      <a-descriptions v-if="selected" :column="1" bordered size="small">
        <a-descriptions-item label="编号">{{ selected.no }}</a-descriptions-item>
        <a-descriptions-item label="名称">{{ selected.name }}</a-descriptions-item>
        <a-descriptions-item label="城市">{{ selected.city }}</a-descriptions-item>
        <a-descriptions-item label="状态"><StatusTag :status="selected.status" /></a-descriptions-item>
        <a-descriptions-item label="负责人">{{ selected.owner }}</a-descriptions-item>
        <a-descriptions-item label="备注">{{ selected.remark || '-' }}</a-descriptions-item>
      </a-descriptions>
      <div class="drawer-section-title">审计说明</div>
      <AuditHint />
    </a-drawer>

    <a-modal v-model:open="editOpen" title="编辑记录" @ok="saveEdit">
      <a-form :model="editForm" layout="vertical">
        <a-form-item label="名称">
          <a-input v-model:value="editForm.name" />
        </a-form-item>
        <a-form-item label="城市">
          <a-input v-model:value="editForm.city" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="editForm.status">
            <a-select-option v-for="item in config.statusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
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
import { computed, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { apiClient } from '@/api/client';
import AuditHint from '@/components/AuditHint.vue';
import StatusTag from '@/components/StatusTag.vue';
import { hasPermission } from '@/config/menu';
import { crudModules } from '@/config/module-registry';
import { useAuthStore } from '@/stores/auth';
import type { BasicRecord, PageQuery } from '@/types/domain';

const route = useRoute();
const auth = useAuthStore();
const loading = ref(false);
const records = ref<BasicRecord[]>([]);
const selected = ref<BasicRecord | null>(null);
const detailOpen = ref(false);
const editOpen = ref(false);
const editForm = reactive<Partial<BasicRecord>>({});
const query = reactive<PageQuery>({
  page: 1,
  pageSize: 10,
  keyword: '',
  city: undefined,
  status: undefined
});
const total = ref(0);

const moduleKey = computed(() => String(route.meta.moduleKey));
const config = computed(() => crudModules[moduleKey.value]);
const canCreate = computed(() => hasPermission(auth.permissions, config.value.createPermission));
const canUpdate = computed(() => hasPermission(auth.permissions, config.value.updatePermission));
const columns = computed(() => [
  ...config.value.columns,
  { title: '操作', key: 'action', width: 140, fixed: 'right' }
]);
const pagination = computed<TablePaginationConfig>(() => ({
  current: Number(query.page),
  pageSize: Number(query.pageSize),
  total: total.value,
  showSizeChanger: true,
  showTotal: value => `共 ${value} 条`
}));

async function load() {
  loading.value = true;
  try {
    const result = await apiClient.listBasic(config.value.moduleKey, query);
    records.value = result.list;
    total.value = result.total;
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

function handleTableChange(next: TablePaginationConfig) {
  query.page = next.current || 1;
  query.pageSize = next.pageSize || 10;
  load();
}

function openDetail(record: BasicRecord) {
  selected.value = record;
  detailOpen.value = true;
}

function openEdit(record?: BasicRecord) {
  if (record && !canUpdate.value) {
    message.warning('当前账号没有编辑权限');
    return;
  }
  if (!record && !canCreate.value) {
    message.warning('当前账号没有新增权限');
    return;
  }
  Object.assign(editForm, record || {
    id: `new_${Date.now()}`,
    no: `NEW${Date.now()}`,
    name: '',
    city: '上海',
    status: config.value.statusOptions[0]?.value || 'active',
    owner: '当前用户',
    createdAt: new Date().toLocaleString()
  });
  editOpen.value = true;
}

async function saveEdit() {
  if (editForm.id && !String(editForm.id).startsWith('new_') && !canUpdate.value) {
    message.warning('当前账号没有编辑权限');
    return;
  }
  if (String(editForm.id || '').startsWith('new_') && !canCreate.value) {
    message.warning('当前账号没有新增权限');
    return;
  }
  await apiClient.updateBasic(config.value.moduleKey, String(editForm.id), editForm);
  message.success('已保存，关键操作已写入审计日志');
  editOpen.value = false;
  await load();
}

watch(() => route.fullPath, () => {
  reset();
}, { immediate: true });
</script>
