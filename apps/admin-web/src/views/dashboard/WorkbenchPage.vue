<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">工作台</h1>
        <div class="page-desc">聚合今日订单、待办审批、异常提醒和核心经营指标。</div>
      </div>
      <a-space>
        <a-button @click="go('/orders')">查看订单</a-button>
        <a-button type="primary" @click="writeAudit">记录巡检审计</a-button>
      </a-space>
    </div>

    <div class="summary-grid">
      <div class="summary-card" v-for="card in metricCards" :key="card.title">
        <div class="metric-title">{{ card.title }}</div>
        <div class="metric-value">{{ card.value }}</div>
        <div class="metric-desc">{{ card.desc }}</div>
      </div>
    </div>

    <a-row :gutter="[16, 16]" class="main-row">
      <a-col :xs="24" :xl="15">
        <div class="panel table-panel">
          <div class="panel-head">
            <div>
              <div class="block-title">运营队列</div>
              <div class="block-desc">按订单状态、审批和风控事件汇总需要人工推进的事项。</div>
            </div>
            <a-button size="small" @click="go('/orders')">进入订单</a-button>
          </div>
          <a-table
            row-key="key"
            size="middle"
            :columns="queueColumns"
            :data-source="operationQueue"
            :pagination="false"
            :scroll="{ x: 760 }"
          >
            <template #bodyCell="{ column, record }">
              <StatusTag v-if="column.dataIndex === 'status'" :status="record.status" />
              <template v-else-if="column.key === 'action'">
                <a-button type="link" @click="go(record.path)">处理</a-button>
              </template>
            </template>
          </a-table>
        </div>
      </a-col>

      <a-col :xs="24" :xl="9">
        <div class="panel table-panel">
          <div class="panel-head">
            <div>
              <div class="block-title">风险与合规</div>
              <div class="block-desc">高风险事项优先处理，避免订单进入不可控履约。</div>
            </div>
            <a-button size="small" @click="go('/risk-cases')">进入风控</a-button>
          </div>
          <a-list :data-source="riskTodos">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta :title="item.title" :description="item.desc" />
                <StatusTag :status="item.status" />
              </a-list-item>
            </template>
          </a-list>
        </div>
      </a-col>
    </a-row>

    <a-row :gutter="[16, 16]" class="main-row">
      <a-col :xs="24" :xl="12">
        <div class="panel table-panel">
          <div class="panel-head">
            <div>
              <div class="block-title">近期服务</div>
              <div class="block-desc">按服务时间排序，关注餐前准备、提醒和现场执行。</div>
            </div>
          </div>
          <a-table
            row-key="orderNo"
            size="small"
            :columns="orderColumns"
            :data-source="upcomingOrders"
            :pagination="false"
            :scroll="{ x: 720 }"
          >
            <template #bodyCell="{ column, record }">
              <StatusTag v-if="column.dataIndex === 'status'" :status="record.status" />
            </template>
          </a-table>
        </div>
      </a-col>

      <a-col :xs="24" :xl="12">
        <div class="panel table-panel">
          <div class="panel-head">
            <div>
              <div class="block-title">Brief 进度</div>
              <div class="block-desc">服务前资料必须在助理确认后才能进入执行。</div>
            </div>
            <a-button size="small" @click="go('/meal-briefs')">进入餐前准备</a-button>
          </div>
          <a-table
            row-key="id"
            size="small"
            :columns="briefColumns"
            :data-source="briefQueue"
            :pagination="false"
            :scroll="{ x: 760 }"
          >
            <template #bodyCell="{ column, record }">
              <StatusTag v-if="column.dataIndex === 'status'" :status="record.status" />
            </template>
          </a-table>
        </div>
      </a-col>
    </a-row>
  </section>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { apiClient } from '@/api/client';
import StatusTag from '@/components/StatusTag.vue';
import { approvals, bookings, mealBriefs, riskReport } from '@/mock/mock-data';

const router = useRouter();

const pendingMatchCount = computed(() => bookings.filter(item => item.status === 'pending_match').length);
const activeOrderCount = computed(() => bookings.filter(item => !['completed', 'cancelled'].includes(item.status)).length);
const pendingApprovalCount = computed(() => approvals.filter(item => item.status === 'pending').length);
const briefTodoCount = computed(() => mealBriefs.filter(item => ['draft', 'submitted', 'approved'].includes(item.status)).length);

const metricCards = computed(() => [
  { title: '进行中订单', value: activeOrderCount.value, desc: '未完成/未取消订单' },
  { title: '待匹配', value: pendingMatchCount.value, desc: '需要调度确认助理' },
  { title: '待审批', value: pendingApprovalCount.value, desc: '退款、结算、资料审批' },
  { title: '风控关注', value: riskReport.highRiskEvents, desc: `${riskReport.openExceptions} 个异常订单` }
]);

const operationQueue = computed(() => [
  {
    key: 'orders_pending_match',
    title: '待匹配订单',
    count: pendingMatchCount.value,
    owner: '调度主管',
    status: pendingMatchCount.value ? 'pending_match' : 'completed',
    path: '/orders'
  },
  {
    key: 'briefs_todo',
    title: '餐前 Brief 待推进',
    count: briefTodoCount.value,
    owner: '客服/运营',
    status: briefTodoCount.value ? 'submitted' : 'completed',
    path: '/meal-briefs'
  },
  {
    key: 'approvals_pending',
    title: '审批中心待处理',
    count: pendingApprovalCount.value,
    owner: '主管/财务',
    status: pendingApprovalCount.value ? 'pending' : 'completed',
    path: '/approvals'
  },
  {
    key: 'risk_open',
    title: '异常订单与投诉',
    count: riskReport.openExceptions + riskReport.pendingComplaints,
    owner: '风控合规',
    status: riskReport.openExceptions ? 'risk_hold' : 'processing',
    path: '/risk-cases'
  }
]);

const riskTodos = computed(() => [
  { title: '对外资料复核', desc: `${riskReport.pendingProfileReviews} 条资料待审`, status: riskReport.pendingProfileReviews ? 'manual_review' : 'completed' },
  { title: '投诉处理', desc: `${riskReport.pendingComplaints} 条投诉待闭环`, status: riskReport.pendingComplaints ? 'processing' : 'completed' },
  { title: '异常订单', desc: `${riskReport.openExceptions} 个订单处于异常队列`, status: riskReport.openExceptions ? 'risk_hold' : 'completed' },
  { title: '黑名单状态', desc: `${riskReport.activeBlacklist} 个对象处于启用状态`, status: riskReport.activeBlacklist ? 'high' : 'completed' }
]);

const upcomingOrders = computed(() =>
  [...bookings]
    .sort((a, b) => String(a.serviceTime).localeCompare(String(b.serviceTime)))
    .slice(0, 5)
);

const briefQueue = computed(() =>
  [...mealBriefs]
    .sort((a, b) => String(a.serviceTime || '').localeCompare(String(b.serviceTime || '')))
    .slice(0, 5)
);

const queueColumns = [
  { title: '事项', dataIndex: 'title', width: 180 },
  { title: '数量', dataIndex: 'count', width: 80 },
  { title: '负责人', dataIndex: 'owner', width: 120 },
  { title: '状态', dataIndex: 'status', width: 120 },
  { title: '操作', key: 'action', width: 90, fixed: 'right' }
];

const orderColumns = [
  { title: '订单号', dataIndex: 'orderNo', width: 150 },
  { title: '客户', dataIndex: 'customerName', width: 120 },
  { title: '城市', dataIndex: 'city', width: 80 },
  { title: '服务时间', dataIndex: 'serviceTime', width: 160 },
  { title: '状态', dataIndex: 'status', width: 120 }
];

const briefColumns = [
  { title: '订单号', dataIndex: 'bookingNo', width: 150 },
  { title: '客户', dataIndex: 'customerName', width: 120 },
  { title: '主题', dataIndex: 'banquetTheme', width: 220 },
  { title: '服务时间', dataIndex: 'serviceTime', width: 160 },
  { title: '状态', dataIndex: 'status', width: 120 }
];

function go(path: string) {
  router.push(path);
}

async function writeAudit() {
  await apiClient.writeAudit('dashboard.health_check', 'dashboard', 'workbench');
  message.success('已写入审计日志');
}
</script>

<style scoped>
.main-row {
  margin-top: 16px;
}

.metric-title {
  color: #8c98a8;
  font-size: 12px;
}

.metric-value {
  margin-top: 10px;
  color: #edf3fb;
  font-size: 28px;
  font-weight: 650;
}

.metric-desc {
  margin-top: 4px;
  color: #8c98a8;
  font-size: 12px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.block-title {
  color: #edf3fb;
  font-size: 15px;
  font-weight: 600;
}

.block-desc {
  margin-top: 4px;
  color: #8c98a8;
  font-size: 12px;
}
</style>
