<script setup>
import TheSidebar from '~/components/layout/TheSidebar.vue'
import TheNavbar from '~/components/layout/TheNavbar.vue'
import TheFooter from '~/components/layout/TheFooter.vue'

const isSidebarCollapsed = useState('sidebarCollapsed', () => false)
</script>

<template>
  <div class="h-screen max-w-screen bg-[var(--bg-app)] text-[var(--text-app)] flex transition-colors duration-200">
    <!-- Fixed Sidebar -->
    <TheSidebar/>

    <!-- Main Right Content Container -->
    <div 
      class="min-w-0 flex-1 flex flex-col h-full transition-all duration-200 ease-in-out"
    >
      <TheNavbar />

      <!-- Content Area -->
      <main class="flex-1 p-8">
        <slot />
      </main>

      <TheFooter />
    </div>
  </div>
</template>

<style>
/* Nuxt Page Transitions */
.page-enter-active,
.page-leave-active {
  transition: all 0.4s;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
  filter: blur(1rem);
}
</style>
