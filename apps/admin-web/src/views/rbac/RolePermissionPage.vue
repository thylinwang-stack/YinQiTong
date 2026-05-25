<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">角色权限</h1>
        <div class="page-desc">基于 RBAC 控制菜单、路由、按钮和字段级能力。</div>
      </div>
    </div>

    <div class="panel table-panel">
      <a-table row-key="id" :columns="columns" :data-source="roles" :pagination="false">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'permissions'">
            <a-space wrap>
              <a-tag v-for="permission in record.permissions" :key="permission">{{ permission }}</a-tag>
            </a-space>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" @click="openEditor(record)">配置权限</a-button>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal v-model:open="open" title="配置角色权限" width="720px" @ok="save">
      <a-checkbox-group v-model:value="checkedPermissions">
        <a-row :gutter="[8, 8]">
          <a-col :span="8" v-for="permission in permissionOptions" :key="permission">
            <a-checkbox :value="permission">{{ permission }}</a-checkbox>
          </a-col>
        </a-row>
      </a-checkbox-group>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue';
import { ref } from 'vue';
import { apiClient } from '@/api/client';

const roles = ref<Array<{ id: string; code: string; name: string; permissions: string[] }>>([]);
const open = ref(false);
const currentRoleId = ref('');
const checkedPermissions = ref<string[]>([]);
const permissionOptions = [
  '*',
  'dashboard:view',
  'customer:read',
  'customer:update',
  'lead:read',
  'booking:read',
  'booking:update',
  'assistant:read',
  'assistant:update',
  'availability:read',
  'matching:read',
  'meal_brief:read',
  'meal_brief:update',
  'meal_brief:manager_note:read',
  'meal_brief:submit',
  'meal_brief:approve',
  'meal_brief:generate_tasks',
  'meal_brief:reminder',
  'meal_brief:review',
  'staff_meal_brief:read',
  'staff_meal_brief:confirm',
  'finance:read',
  'refund:approve',
  'settlement:read',
  'approval:read',
  'approval:decide',
  'risk:read',
  'risk:update',
  'risk:report',
  'risk:profile_review',
  'risk:blacklist',
  'risk:complaint',
  'risk:exception',
  'cms:read',
  'analytics:read',
  'system:read',
  'rbac:read',
  'audit_log:read',
  'audit_log:create'
];

const columns = [
  { title: '角色编码', dataIndex: 'code', width: 180 },
  { title: '角色名称', dataIndex: 'name', width: 160 },
  { title: '权限', dataIndex: 'permissions' },
  { title: '操作', key: 'action', width: 130, fixed: 'right' }
];

async function load() {
  roles.value = await apiClient.listRoles();
}

function openEditor(role: { id: string; permissions: string[] }) {
  currentRoleId.value = role.id;
  checkedPermissions.value = [...role.permissions];
  open.value = true;
}

async function save() {
  await apiClient.updateRolePermissions(currentRoleId.value, checkedPermissions.value);
  message.success('角色权限已更新，并写入审计日志');
  open.value = false;
  await load();
}

load();
</script>
