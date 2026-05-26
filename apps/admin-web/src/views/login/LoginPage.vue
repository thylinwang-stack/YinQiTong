<template>
  <main class="login-page">
    <section class="login-panel">
      <div class="brand-line">
        <span class="brand-mark">饭</span>
        <div>
          <h1>有个饭局 OA 运营后台</h1>
          <p>客户、订单、助理、财务、风控一体化管理</p>
        </div>
      </div>

      <a-form layout="vertical" :model="form" @finish="submit">
        <a-form-item label="账号" name="username" :rules="[{ required: true, message: '请输入账号' }]">
          <a-input v-model:value="form.username" placeholder="admin" size="large" />
        </a-form-item>
        <a-form-item label="密码" name="password" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password v-model:value="form.password" placeholder="任意密码进入 mock 后台" size="large" />
        </a-form-item>
        <a-button type="primary" html-type="submit" size="large" block :loading="loading">登录</a-button>
      </a-form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const loading = ref(false);
const form = reactive({
  username: 'admin',
  password: 'admin123'
});

async function submit() {
  loading.value = true;
  try {
    await auth.login(form.username, form.password);
    router.replace(String(route.query.redirect || '/dashboard'));
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
    radial-gradient(circle at 78% 16%, rgba(39, 110, 241, 0.16), transparent 32%),
    linear-gradient(180deg, #071426 0%, #0d1b2f 100%);
}

.login-panel {
  width: min(440px, calc(100vw - 40px));
  padding: 32px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: #fff;
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
  background: linear-gradient(135deg, #276ef1, #c99a38);
  color: #fff;
  font-weight: 800;
}

h1 {
  margin: 0;
  font-size: 22px;
}

p {
  margin: 6px 0 0;
  color: #667085;
}
</style>
