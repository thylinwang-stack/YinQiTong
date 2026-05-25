import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { apiClient } from '@/api/client';
import type { UserProfile } from '@/types/domain';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '');
  const user = ref<UserProfile | null>(null);

  const permissions = computed(() => user.value?.permissions || []);

  async function login(username: string, password: string) {
    const result = await apiClient.login({ username, password });
    token.value = result.token;
    user.value = result.user;
    localStorage.setItem('admin_token', result.token);
  }

  async function fetchMe() {
    user.value = await apiClient.me();
  }

  function logout() {
    token.value = '';
    user.value = null;
    localStorage.removeItem('admin_token');
  }

  return {
    token,
    user,
    permissions,
    login,
    fetchMe,
    logout
  };
});
