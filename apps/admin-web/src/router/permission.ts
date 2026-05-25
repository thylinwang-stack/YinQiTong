import { message } from 'ant-design-vue';
import { router } from './index';
import { hasPermission } from '@/config/menu';
import { useAuthStore } from '@/stores/auth';

router.beforeEach(async to => {
  const auth = useAuthStore();
  if (to.meta.public) return true;

  if (!auth.token) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  if (!auth.user) {
    await auth.fetchMe();
  }

  const required = to.meta.permission as string | undefined;
  if (!hasPermission(auth.permissions, required)) {
    message.warning('当前账号无权访问该模块');
    return { path: '/403' };
  }

  return true;
});
