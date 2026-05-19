<script setup>
import { computed, ref, watch } from 'vue'
import Sidebar from './components/Sidebar.vue'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
const currentRole = ref(localStorage.getItem('userRole'))

watch(
  () => route.fullPath,
  () => {
    currentRole.value = localStorage.getItem('userRole')
  },
)

const showSidebar = computed(() => !route.meta.hideSidebar && currentRole.value === 'admin')
const noContentPadding = computed(() => Boolean(route.meta.hideSidebar))
</script>

<template>
  <div class="app-layout">
    <Sidebar v-if="showSidebar" />
    <main class="app-content" :class="{ 'full-width': !showSidebar, 'no-padding': noContentPadding }">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.app-content {
  flex: 1;
  margin-left: 270px;
  min-height: 100vh;
  padding: 24px;
  background: #0f172a;
}

.app-content.full-width {
  margin-left: 0;
}

.app-content.no-padding {
  padding: 0;
}

@media (max-width: 900px) {
  .app-content {
    margin-left: 0;
    padding-top: 72px;
  }

  .app-content.full-width {
    margin-left: 0;
    padding-top: 24px;
  }

  .app-content.no-padding {
    padding-top: 0;
  }
}
</style>
