<script setup>
import Navbar from '~/components/layout/Navbar.vue'
import Footer from '~/components/layout/Footer.vue'
import Sidebar from '~/components/layout/Sidebar.vue'

const isSidebarCollapsed = useState('sidebarCollapsed', () => false)
</script>

<template>
  <div class="h-screen max-w-screen bg-[var(--bg-app)] text-[var(--text-app)] flex transition-colors duration-200">
        <!-- Fixed Sidebar -->
    <Sidebar/>
    <!-- Main Right Content Container -->
    <div 
      class="min-w-0 flex-1 flex flex-col h-full transition-all duration-200 ease-in-out"
    >
      <Navbar />

      <div class="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
        <!-- Content Area -->
        <main class="flex-1 p-8">
          <slot />
        </main>

        <Footer />
      </div>
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
