<script setup>
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="p-4 text-center border-t border-[var(--border-app)] mt-auto font-sans">
    <div class="flex items-center justify-center">
      <p class="text-xs text-[var(--text-app)] opacity-60 font-medium">
        &copy; {{ currentYear }} Powered by <span class="font-bold text-[var(--text-primary)]">YESSIR</span>. Bütün Hüquqlar Qorunur.
      </p>
    </div>
  </footer>
</template>
