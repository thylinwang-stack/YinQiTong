<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">工作台</h1>
        <div class="page-desc">聚合今日订单、待办审批、异常提醒和核心经营指标。</div>
      </div>
      <a-button type="primary" @click="writeAudit">记录巡检审计</a-button>
    </div>

    <a-row :gutter="[16, 16]">
      <a-col :span="6" v-for="card in metricCards" :key="card.title">
        <div class="panel metric-card">
          <div class="metric-title">{{ card.title }}</div>
          <div class="metric-value">{{ card.value }}</div>
          <div class="metric-desc">{{ card.desc }}</div>
        </div>
      </a-col>
    </a-row>

    <a-row :gutter="[16, 16]" class="main-row">
      <a-col :span="14">
        <div class="panel table-panel">
          <div class="block-title">今日重点订单</div>
          <a-table row-key="orderNo" :columns="orderColumns" :data-source="orders" :pagination="false">
            <template #bodyCell="{ column, record }">
              <StatusTag v-if="column.dataIndex === 'status'" :status="record.status" />
            </template>
          </a-table>
        </div>
      </a-col>
      <a-col :span="10">
        <div class="panel table-panel">
          <div class="block-title">待办与异常</div>
          <a-list :data-source="todos">
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
  </section>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue';
import { apiClient } from '@/api/client';
import StatusTag from '@/components/StatusTag.vue';
import { bookings } from '@/mock/mock-data';

const metricCards = [
  { title: '今日新增需求', value: '18', desc: '较昨日 +12%' },
  { title: '待匹配订单', value: '7', desc: '上海 3，北京 2，深圳 2' },
  { title: '待审批', value: '5', desc: '退款 2，结算 3' },
  { title: '风控关注', value: '2', desc: '敏感需求需人工复核' }
];

const orders = bookings;
const orderColumns = [
  { title: '订单号', dataIndex: 'orderNo' },
  { title: '客户', dataIndex: 'customerName' },
  { title: '场景', dataIndex: 'sceneName' },
  { title: '城市', dataIndex: 'city' },
  { title: '服务时间', dataIndex: 'serviceTime' },
  { title: '状态', dataIndex: 'status' }
];

const todos = [
  { title: 'BS20260525001 待匹配', desc: '商务宴请，需确认上海可服务助理', status: 'pending_match' },
  { title: 'AP20260525001 退款审批', desc: '客户取消订单，待主管审批', status: 'pending' },
  { title: 'R202605001 风控复核', desc: '需求文本命中高风险规则', status: 'risk_hold' }
];

async function writeAudit() {
  await apiClient.writeAudit('dashboard.health_check', 'dashboard', 'workbench');
  message.success('已写入审计日志');
}
</script>

<style scoped>
.metric-card {
  padding: 18px;
}

.metric-title {
  color: #8c98a8;
  font-size: 12px;
}

.metric-value {
  margin-top: 12px;
  color: #edf3fb;
  font-size: 28px;
  font-weight: 600;
}

.metric-desc {
  margin-top: 6px;
  color: #8c98a8;
  font-size: 12px;
}

.main-row {
  margin-top: 16px;
}

.block-title {
  margin-bottom: 12px;
  color: #edf3fb;
  font-size: 15px;
  font-weight: 600;
}
</style>
