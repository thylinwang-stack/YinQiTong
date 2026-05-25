<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">商务助理管理</h1>
        <div class="page-desc">内部资料与对外展示资料分层管理，客户端只展示公开资料。</div>
      </div>
      <a-button type="primary" @click="openEdit()">新增助理</a-button>
    </div>

    <div class="panel filter-panel">
      <a-form layout="inline" :model="query">
        <a-form-item label="关键词">
          <a-input v-model:value="query.keyword" allow-clear placeholder="编号、工作名、城市" />
        </a-form-item>
        <a-form-item label="城市">
          <a-select v-model:value="query.city" allow-clear style="width: 140px">
            <a-select-option value="上海">上海</a-select-option>
            <a-select-option value="北京">北京</a-select-option>
            <a-select-option value="深圳">深圳</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="query.status" allow-clear style="width: 140px">
            <a-select-option value="active">启用</a-select-option>
            <a-select-option value="pending_review">待审核</a-select-option>
            <a-select-option value="disabled">停用</a-select-option>
          </a-select>
        </a-form-item>
        <a-button type="primary" @click="load">查询</a-button>
      </a-form>
    </div>

    <div class="panel table-panel">
      <a-table row-key="id" :columns="columns" :data-source="records" :loading="loading" :pagination="pagination" @change="handleTableChange">
        <template #bodyCell="{ column, record }">
          <StatusTag v-if="column.dataIndex === 'status'" :status="record.status" />
          <StatusTag v-else-if="column.dataIndex === 'publicProfileStatus'" :status="record.publicProfileStatus" />
          <StatusTag v-else-if="column.dataIndex === 'publicProfile.imageAuditStatus'" :status="record.publicProfile.imageAuditStatus" />
          <template v-else-if="column.dataIndex === 'publicProfile.styleTags'">
            <a-space wrap>
              <a-tag v-for="tag in record.publicProfile.styleTags" :key="tag">{{ tag }}</a-tag>
            </a-space>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" @click="openDetail(record)">资料</a-button>
              <a-button type="link" @click="openEdit(record)">编辑</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-drawer v-model:open="detailOpen" width="760" title="商务助理资料">
      <template v-if="selected">
        <a-tabs>
          <a-tab-pane key="public" tab="对外展示资料">
            <div class="profile-head">
              <img :src="selected.publicProfile.avatarUrl" alt="" />
              <div>
                <h3>{{ selected.workName }} · {{ selected.city }}</h3>
                <div>{{ selected.assistantNo }}</div>
                <a-space wrap class="tag-space">
                  <a-tag v-for="tag in selected.publicProfile.styleTags" :key="tag" color="blue">{{ tag }}</a-tag>
                </a-space>
              </div>
            </div>
            <a-descriptions :column="1" bordered size="small">
              <a-descriptions-item label="擅长场景">{{ selected.publicProfile.sceneSkills.join('、') }}</a-descriptions-item>
              <a-descriptions-item label="图片审核"><StatusTag :status="selected.publicProfile.imageAuditStatus" /></a-descriptions-item>
              <a-descriptions-item label="商务能力">{{ selected.publicProfile.businessSkills.join('、') }}</a-descriptions-item>
              <a-descriptions-item label="公开简介">{{ selected.publicProfile.publicIntro }}</a-descriptions-item>
            </a-descriptions>
          </a-tab-pane>
          <a-tab-pane key="internal" tab="内部资料">
            <a-alert type="warning" show-icon message="内部资料受字段级权限保护，不能出现在客户端或员工端。" />
            <a-descriptions :column="1" bordered size="small" class="internal-desc">
              <a-descriptions-item label="真实姓名">{{ selected.internalProfile.realName }}</a-descriptions-item>
              <a-descriptions-item label="手机号">{{ selected.internalProfile.phoneMasked }}</a-descriptions-item>
              <a-descriptions-item label="身份证">{{ selected.internalProfile.idNumberMasked }}</a-descriptions-item>
              <a-descriptions-item label="内部标签">{{ selected.internalProfile.internalTags.join('、') }}</a-descriptions-item>
              <a-descriptions-item label="培训记录">{{ selected.internalProfile.trainingRecords.join('、') }}</a-descriptions-item>
              <a-descriptions-item label="内部备注">{{ selected.internalProfile.internalNote }}</a-descriptions-item>
            </a-descriptions>
          </a-tab-pane>
        </a-tabs>
      </template>
    </a-drawer>

    <a-modal v-model:open="editOpen" title="编辑助理资料" width="720px" @ok="saveEdit">
      <a-tabs>
        <a-tab-pane key="public" tab="对外展示">
          <a-form layout="vertical" :model="editForm">
            <a-form-item label="工作名"><a-input v-model:value="editForm.workName" /></a-form-item>
            <a-form-item label="城市"><a-input v-model:value="editForm.city" /></a-form-item>
            <a-form-item label="公开简介"><a-textarea v-model:value="publicIntro" :rows="4" /></a-form-item>
          </a-form>
        </a-tab-pane>
        <a-tab-pane key="internal" tab="内部资料">
          <a-form layout="vertical">
            <a-form-item label="内部备注"><a-textarea v-model:value="internalNote" :rows="4" /></a-form-item>
          </a-form>
        </a-tab-pane>
      </a-tabs>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import type { TablePaginationConfig } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { computed, reactive, ref } from 'vue';
import { apiClient } from '@/api/client';
import StatusTag from '@/components/StatusTag.vue';
import type { AssistantRecord, PageQuery } from '@/types/domain';

const loading = ref(false);
const records = ref<AssistantRecord[]>([]);
const selected = ref<AssistantRecord | null>(null);
const detailOpen = ref(false);
const editOpen = ref(false);
const total = ref(0);
const query = reactive<PageQuery>({ page: 1, pageSize: 10, keyword: '', city: undefined, status: undefined });
const editForm = reactive<Partial<AssistantRecord>>({});
const publicIntro = ref('');
const internalNote = ref('');

const columns = [
  { title: '编号', dataIndex: 'assistantNo', width: 130 },
  { title: '工作名', dataIndex: 'workName', width: 120 },
  { title: '城市', dataIndex: 'city', width: 90 },
  { title: '账号状态', dataIndex: 'status', width: 120 },
  { title: '公开资料审核', dataIndex: 'publicProfileStatus', width: 130 },
  { title: '图片审核', dataIndex: 'publicProfile.imageAuditStatus', width: 120 },
  { title: '风格标签', dataIndex: 'publicProfile.styleTags' },
  { title: '操作', key: 'action', width: 130, fixed: 'right' }
];

const pagination = computed<TablePaginationConfig>(() => ({
  current: Number(query.page),
  pageSize: Number(query.pageSize),
  total: total.value,
  showSizeChanger: true
}));

async function load() {
  loading.value = true;
  try {
    const result = await apiClient.listAssistants(query);
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

function openDetail(record: AssistantRecord) {
  selected.value = record;
  detailOpen.value = true;
}

function openEdit(record?: AssistantRecord) {
  const fallback = record || records.value[0];
  if (!fallback) return;
  Object.assign(editForm, fallback);
  publicIntro.value = fallback.publicProfile.publicIntro;
  internalNote.value = fallback.internalProfile.internalNote;
  editOpen.value = true;
}

async function saveEdit() {
  if (!editForm.id) return;
  await apiClient.updateAssistant(editForm.id, {
    ...editForm,
    publicProfile: { ...(editForm.publicProfile as AssistantRecord['publicProfile']), publicIntro: publicIntro.value },
    internalProfile: { ...(editForm.internalProfile as AssistantRecord['internalProfile']), internalNote: internalNote.value }
  });
  message.success('助理资料已保存，并写入审计日志');
  editOpen.value = false;
  await load();
}

load();
</script>

<style scoped>
.profile-head {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.profile-head img {
  width: 96px;
  height: 128px;
  border-radius: 8px;
  object-fit: cover;
}

.profile-head h3 {
  margin: 0 0 6px;
}

.tag-space {
  margin-top: 12px;
}

.internal-desc {
  margin-top: 16px;
}
</style>
