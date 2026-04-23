import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useDeviceStore = defineStore('device', () => {
  const isPC = ref(false);
  const screenWidth = ref(0);

  const checkDevice = () => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent.toLowerCase();
    const isMobileUA = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    const width = window.innerWidth;

    screenWidth.value = width;
    isPC.value = !isMobileUA && width >= 768;
  };

  const init = () => {
    checkDevice();
    window.addEventListener('resize', checkDevice);
  };

  const destroy = () => {
    window.removeEventListener('resize', checkDevice);
  };

  return {
    isPC,
    screenWidth,
    checkDevice,
    init,
    destroy
  };
});
