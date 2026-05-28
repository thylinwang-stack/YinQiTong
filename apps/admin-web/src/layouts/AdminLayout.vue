<template>
  <a-layout class="admin-layout">
    <a-layout-sider v-model:collapsed="collapsed" collapsible width="236" class="sider">
      <div class="brand">
        <div class="brand-mark">礼</div>
        <div v-if="!collapsed" class="brand-text">
          <strong>商务礼宾</strong>
          <span>运营管理后台</span>
        </div>
      </div>

      <a-menu
        theme="dark"
        mode="inline"
        :selected-keys="[selectedKey]"
        :items="menuItems"
        @click="handleMenuClick"
      />
    </a-layout-sider>

    <a-layout>
      <a-layout-header class="header">
        <div>
          <div class="header-title">{{ currentTitle }}</div>
          <div class="header-subtitle">OA 级业务管理系统 · 所有关键操作进入审计日志</div>
        </div>
        <a-space>
          <a-tag color="blue">RBAC 已启用</a-tag>
          <a-dropdown>
            <a-button>{{ auth.user?.name || '管理员' }}</a-button>
            <template #overlay>
              <a-menu @click="logout">
                <a-menu-item key="logout">退出登录</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </a-space>
      </a-layout-header>
      <a-layout-content class="content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import {
  AccountBookOutlined,
  AuditOutlined,
  BarChartOutlined,
  BranchesOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
  EditOutlined,
  FileTextOutlined,
  IdcardOutlined,
  InboxOutlined,
  KeyOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  WalletOutlined
} from '@ant-design/icons-vue';
import { computed, h, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { adminMenus, filterMenus } from '@/config/menu';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const collapsed = ref(false);

const iconMap = {
  AccountBookOutlined,
  AuditOutlined,
  BarChartOutlined,
  BranchesOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
  EditOutlined,
  FileTextOutlined,
  IdcardOutlined,
  InboxOutlined,
  KeyOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  WalletOutlined
};

const visibleMenus = computed(() => filterMenus(auth.permissions));
const selectedKey = computed(() => {
  const matched = adminMenus.find(item => route.path.startsWith(item.path));
  return matched?.key || 'dashboard';
});
const currentTitle = computed(() => String(route.meta.title || '工作台'));

const menuItems = computed(() =>
  visibleMenus.value.map(item => ({
    key: item.key,
    label: item.title,
    icon: item.icon ? () => h(iconMap[item.icon as keyof typeof iconMap]) : undefined
  }))
);

function handleMenuClick(event: { key: string }) {
  const target = visibleMenus.value.find(item => item.key === event.key);
  if (target) router.push(target.path);
}

function logout() {
  auth.logout();
  router.replace('/login');
}
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
}

.sider {
  border-right: 1px solid rgba(214, 226, 243, 0.1);
  background: rgba(8, 13, 20, 0.96) !important;
}

.sider :deep(.ant-layout-sider-trigger),
.sider :deep(.ant-menu-dark),
.sider :deep(.ant-menu-dark .ant-menu-sub),
.sider :deep(.ant-menu) {
  background: transparent !important;
}

.sider :deep(.ant-menu-item) {
  height: 38px;
  border-radius: 8px;
  color: #aeb8c7;
}

.sider :deep(.ant-menu-item-selected) {
  background: rgba(79, 140, 255, 0.16) !important;
  color: #fff;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 68px;
  padding: 0 18px;
  color: #fff;
  border-bottom: 1px solid rgba(214, 226, 243, 0.1);
}

.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: linear-gradient(135deg, #4f8cff, #c6a360);
  font-weight: 800;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-text span {
  margin-top: 4px;
  color: #8c98a8;
  font-size: 12px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 68px;
  padding: 0 24px;
  border-bottom: 1px solid rgba(214, 226, 243, 0.1);
  background: rgba(5, 8, 13, 0.78);
  backdrop-filter: blur(16px);
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #edf3fb;
}

.header-subtitle {
  margin-top: 3px;
  color: #8c98a8;
  font-size: 12px;
}

.content {
  min-height: calc(100vh - 68px);
  padding: 20px;
  background: transparent;
}
</style>
