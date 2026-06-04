<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">履约中台</h1>
        <div class="page-desc">围绕城市供给、订单履约、服务评价和异常风险，管理平台交付质量。</div>
      </div>
      <a-space>
        <a-button @click="go('/matching')">排班匹配</a-button>
        <a-button type="primary" @click="go('/meal-briefs')">餐前准备</a-button>
      </a-space>
    </div>

    <div class="summary-grid">
      <div class="summary-card" v-for="item in metrics" :key="item.title">
        <div class="metric-title">{{ item.title }}</div>
        <div class="metric-value">{{ item.value }}</div>
        <div class="metric-desc">{{ item.desc }}</div>
      </div>
    </div>

    <a-row :gutter="[16, 16]" class="main-row">
      <a-col :xs="24" :xl="9">
        <div class="panel">
          <div class="panel-head">
            <div>
              <div class="block-title">城市供给</div>
              <div class="block-desc">以头部履约平台的标准，把城市供给和 SLA 作为履约前置能力。</div>
            </div>
          </div>
          <div class="city-list">
            <div class="city-card" v-for="city in hub.cities" :key="city.city">
              <div class="city-head">
                <div>
                  <div class="city-name">{{ city.city }}</div>
                  <div class="city-meta">{{ city.availableToday }} / {{ city.assistantPool }} 今日可服务</div>
                </div>
                <StatusTag :status="city.coverageStatus" />
              </div>
              <div class="city-metrics">
                <span>利用率 {{ city.utilizationRate }}%</span>
                <span>投诉率 {{ city.complaintRate }}%</span>
                <span>SLA {{ city.responseSlaMinutes }}min</span>
              </div>
              <div class="city-note">{{ city.note }}</div>
            </div>
          </div>
        </div>
      </a-col>

      <a-col :xs="24" :xl="15">
        <div class="panel table-panel">
          <div class="panel-head">
            <div>
              <div class="block-title">履约队列</div>
              <div class="block-desc">订单不只看状态，还要同步看 brief、助理确认、风险和下一步动作。</div>
            </div>
            <a-button size="small" @click="go('/orders')">订单管理</a-button>
          </div>
          <a-table
            row-key="id"
            size="small"
            :columns="fulfillmentColumns"
            :data-source="hub.fulfillmentQueue"
            :loading="loading"
            :pagination="false"
            :scroll="{ x: 980 }"
          >
            <template #bodyCell="{ column, record }">
              <StatusTag v-if="column.dataIndex === 'stage'" :status="record.stage" />
              <StatusTag v-else-if="column.dataIndex === 'briefStatus'" :status="record.briefStatus" />
              <StatusTag v-else-if="column.dataIndex === 'assistantStatus'" :status="record.assistantStatus" />
              <StatusTag v-else-if="column.dataIndex === 'riskLevel'" :status="record.riskLevel" />
              <template v-else-if="column.dataIndex === 'nextAction'">
                <span class="next-action">{{ record.nextAction }}</span>
              </template>
            </template>
          </a-table>
        </div>
      </a-col>
    </a-row>

    <a-row :gutter="[16, 16]" class="main-row">
      <a-col :xs="24" :xl="15">
        <div class="panel table-panel">
          <div class="panel-head">
            <div>
              <div class="block-title">评价质检</div>
              <div class="block-desc">客户评价进入助理排班权重、培训复盘和风控跟进。</div>
            </div>
          </div>
          <a-table
            row-key="id"
            size="small"
            :columns="reviewColumns"
            :data-source="hub.serviceReviews"
            :loading="loading"
            :pagination="false"
            :scroll="{ x: 920 }"
          >
            <template #bodyCell="{ column, record }">
              <StatusTag v-if="column.dataIndex === 'status'" :status="record.status" />
              <template v-else-if="column.dataIndex === 'overallRating'">
                <span class="rating">{{ record.overallRating.toFixed(1) }}</span>
              </template>
              <template v-else-if="column.dataIndex === 'highlightTags'">
                <a-space wrap>
                  <a-tag v-for="tag in record.highlightTags" :key="tag">{{ tag }}</a-tag>
                </a-space>
              </template>
              <template v-else-if="column.dataIndex === 'repurchaseIntent'">
                <span class="next-action">{{ record.repurchaseIntent || '未选择' }}</span>
              </template>
            </template>
          </a-table>
        </div>
      </a-col>

      <a-col :xs="24" :xl="9">
        <div class="panel">
          <div class="panel-head">
            <div>
              <div class="block-title">移动执行原则</div>
              <div class="block-desc">PC 做决策，员工端做现场动作，避免工作流外溢到私聊。</div>
            </div>
          </div>
          <div class="principle-list">
            <div class="principle">
              <b>客户小程序</b>
              <span>展示、需求、支付、进度、评价。</span>
            </div>
            <div class="principle">
              <b>员工端小程序</b>
              <span>档期、brief、边界确认、签到、反馈、结算。</span>
            </div>
            <div class="principle">
              <b>PC OA</b>
              <span>CRM、排班、brief、财务、风控、审计。</span>
            </div>
            <div class="principle">
              <b>管理者移动视图</b>
              <span>只做提醒、轻审批和异常处理，不复制完整 OA。</span>
            </div>
          </div>
        </div>
      </a-col>
    </a-row>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiClient } from '@/api/client';
import StatusTag from '@/components/StatusTag.vue';
import type { OperationsHubSummary } from '@/types/domain';

const router = useRouter();
const loading = ref(false);
const hub = reactive<OperationsHubSummary>({
  cities: [],
  fulfillmentQueue: [],
  serviceReviews: []
});

const metrics = computed(() => {
  const cityCount = hub.cities.length;
  const available = hub.cities.reduce((sum, item) => sum + item.availableToday, 0);
  const queueCount = hub.fulfillmentQueue.length;
  const avgRating = hub.serviceReviews.length
    ? hub.serviceReviews.reduce((sum, item) => sum + item.overallRating, 0) / hub.serviceReviews.length
    : 0;
  const followUps = hub.serviceReviews.filter(item => item.followUpRequired).length;
  return [
    { title: '运营城市', value: cityCount, desc: `${available} 位助理今日可服务` },
    { title: '履约队列', value: queueCount, desc: '待匹配、待 brief、待评价' },
    { title: '平均评分', value: avgRating.toFixed(1), desc: '客户服务评价均值' },
    { title: '需回访', value: followUps, desc: '评价或风险触发复盘' }
  ];
});

const fulfillmentColumns = [
  { title: '订单号', dataIndex: 'orderNo', width: 140 },
  { title: '客户', dataIndex: 'customerName', width: 110 },
  { title: '城市', dataIndex: 'city', width: 80 },
  { title: '服务时间', dataIndex: 'serviceTime', width: 150 },
  { title: '阶段', dataIndex: 'stage', width: 110 },
  { title: 'Brief', dataIndex: 'briefStatus', width: 110 },
  { title: '助理', dataIndex: 'assistantStatus', width: 110 },
  { title: '风险', dataIndex: 'riskLevel', width: 90 },
  { title: '下一步', dataIndex: 'nextAction', width: 240 }
];

const reviewColumns = [
  { title: '订单号', dataIndex: 'orderNo', width: 140 },
  { title: '客户', dataIndex: 'customerName', width: 110 },
  { title: '商务助理', dataIndex: 'assistantName', width: 110 },
  { title: '编号', dataIndex: 'assistantNo', width: 110 },
  { title: '评分', dataIndex: 'overallRating', width: 80 },
  { title: '标签', dataIndex: 'highlightTags', width: 230 },
  { title: '复购', dataIndex: 'repurchaseIntent', width: 90 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '内部备注', dataIndex: 'internalNote', width: 240 }
];

async function load() {
  loading.value = true;
  try {
    const data = await apiClient.getOperationsHub();
    Object.assign(hub, data);
  } finally {
    loading.value = false;
  }
}

function go(path: string) {
  router.push(path);
}

onMounted(load);
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

.city-list,
.principle-list {
  display: grid;
  gap: 12px;
}

.city-card,
.principle {
  padding: 14px;
  border: 1px solid rgba(246, 234, 208, 0.1);
  border-radius: 8px;
  background: rgba(5, 11, 16, 0.48);
}

.city-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.city-name {
  color: #edf3fb;
  font-size: 16px;
  font-weight: 650;
}

.city-meta,
.city-note,
.principle span {
  color: #8c98a8;
  font-size: 12px;
  line-height: 1.65;
}

.city-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 8px;
  color: #d8c991;
  font-size: 12px;
}

.next-action {
  color: #d8c991;
}

.rating {
  color: #f6e9c6;
  font-weight: 700;
}

.principle b {
  display: block;
  margin-bottom: 6px;
  color: #f6e9c6;
  font-weight: 600;
}
</style>
