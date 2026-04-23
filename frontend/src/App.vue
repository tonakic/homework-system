<template>
  <PcLayout v-if="isPC" />
  <MobileLayout v-else />
</template>

<script setup>
import { onMounted } from 'vue';
import { useDeviceStore } from '@/store/device';
import { storeToRefs } from 'pinia';
import PcLayout from '@/layouts/PcLayout.vue';
import MobileLayout from '@/layouts/MobileLayout.vue';

const deviceStore = useDeviceStore();
const { isPC } = storeToRefs(deviceStore);

onMounted(() => {
  deviceStore.init();
});
</script>

<style>
#app {
  min-height: 100vh;
  background-color: #f5f5f5;
}
</style>
