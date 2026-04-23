import { useDeviceStore } from '@/store/device';
import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted } from 'vue';

export function useDevice() {
  const deviceStore = useDeviceStore();
  const { isPC, screenWidth } = storeToRefs(deviceStore);

  onMounted(() => {
    deviceStore.init();
  });

  onUnmounted(() => {
    deviceStore.destroy();
  });

  return {
    isPC,
    screenWidth
  };
}
