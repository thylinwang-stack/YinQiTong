<template>
  <a-result status="403" title="无访问权限" sub-title="当前账号缺少访问该模块的 RBAC 权限">
    <template #extra>
      <a-button type="primary" @click="$router.replace('/dashboard')">返回工作台</a-button>
    </template>
  </a-result>
</template>
