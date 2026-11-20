<script setup lang="ts">
import NavigationComponent from "@/components/NavigationComponent.vue";
import { onMounted } from "vue";
import { RouterView, useRouter } from "vue-router";

const router = useRouter();

// Fetch the other sections' chunks once the first screen is idle, so the
// first click on a tab does not wait for the network.
onMounted(() => {
  const warm = () => {
    for (const record of router.getRoutes()) {
      const component = record.components?.default;
      if (typeof component === "function") (component as () => Promise<unknown>)().catch(() => undefined);
    }
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(warm, { timeout: 4000 });
  else setTimeout(warm, 2000);
});
</script>

<template>
  <div class="shell">
    <NavigationComponent />
    <main class="shell-main">
      <RouterView v-slot="{ Component }">
        <!-- The map keeps its WebGL context, tiles and markers between visits. -->
        <Transition name="view" mode="out-in">
          <KeepAlive include="MapView">
            <component :is="Component" />
          </KeepAlive>
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.shell-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
/* Enter only: the outgoing view leaves at once, so a tab never waits on an exit. */
.view-enter-active {
  transition: opacity 220ms var(--ease-out), transform 220ms var(--ease-out);
}
.view-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
</style>
