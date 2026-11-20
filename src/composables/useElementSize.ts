import { onMounted, onUnmounted, ref, type Ref } from "vue";

export function useElementSize(target: Ref<HTMLElement | undefined>) {
  const width = ref(0);
  const height = ref(0);
  let observer: ResizeObserver | null = null;

  onMounted(() => {
    if (!target.value) return;
    observer = new ResizeObserver(([entry]) => {
      width.value = entry.contentRect.width;
      height.value = entry.contentRect.height;
    });
    observer.observe(target.value);
  });

  onUnmounted(() => observer?.disconnect());

  return { width, height };
}
