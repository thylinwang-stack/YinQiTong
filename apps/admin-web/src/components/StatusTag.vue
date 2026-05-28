<template>
  <a-tag :color="color">{{ getStatusText(status) }}</a-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getStatusKind, getStatusText } from '@/utils/status';

const props = defineProps<{
  status: string;
}>();

const color = computed(() => {
  const kind = getStatusKind(props.status);
  const map = {
    default: 'default',
    processing: 'gold',
    success: 'green',
    warning: 'gold',
    error: 'red'
  };
  return map[kind];
});
</script>
