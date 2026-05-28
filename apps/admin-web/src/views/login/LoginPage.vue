<template>
  <main class="login-page">
    <section class="login-panel">
      <div class="brand-line">
        <span class="brand-mark">礼</span>
        <div>
          <h1>商务礼宾运营后台</h1>
          <p>客户、订单、助理、财务、风控一体化管理</p>
        </div>
      </div>

      <a-form layout="vertical" :model="form" @finish="submit">
        <a-form-item label="账号" name="username" :rules="[{ required: true, message: '请输入账号' }]">
          <a-input v-model:value="form.username" placeholder="admin" size="large" autocomplete="username" />
        </a-form-item>
        <a-form-item label="密码" name="password" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password
            v-model:value="form.password"
            :placeholder="passwordPlaceholder"
            size="large"
            autocomplete="current-password"
          />
        </a-form-item>
        <a-button type="primary" html-type="submit" size="large" block :loading="loading">登录</a-button>
      </a-form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const loading = ref(false);
const passwordPlaceholder = import.meta.env.VITE_USE_MOCK === 'false' ? '请输入管理员密码' : '本地 mock 默认：admin123';
const form = reactive({
  username: 'admin',
  password: 'admin123'
});

async function submit() {
  loading.value = true;
  try {
    await auth.login(form.username, form.password);
    router.replace(String(route.query.redirect || '/dashboard'));
  } catch (error) {
    message.error((error as Error).message || '登录失败');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  background:
    linear-gradient(180deg, rgba(8, 18, 20, 0.94), rgba(2, 6, 7, 1));
}

.login-panel {
  width: min(440px, calc(100vw - 40px));
  padding: 32px;
  border: 1px solid rgba(246, 234, 208, 0.12);
  border-radius: 8px;
  background: rgba(7, 17, 19, 0.96);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34);
}

.brand-line {
  display: flex;
  gap: 14px;
  margin-bottom: 28px;
}

.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: linear-gradient(135deg, #0b1a1d, #b08a3a);
  color: #f7f0de;
  font-weight: 800;
}

h1 {
  margin: 0;
  color: #f4efe4;
  font-size: 22px;
}

p {
  margin: 6px 0 0;
  color: #96978e;
}
</style>
