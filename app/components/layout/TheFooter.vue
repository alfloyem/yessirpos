<script setup>
const date = new Date().getFullYear();
</script>

<template>
  <footer class="p-12 text-center bg-app-bg border-t border-app-border">
    <div class="flex flex-col items-center gap-4">
      <p class="text-[8px] text-app-text opacity-20 uppercase tracking-[.5em] font-black">
        &copy; {{ date }} YESSIRPOS
      </p>
      
      <div class="flex gap-8 opacity-10">
        <a href="#" class="text-[7px] uppercase tracking-widest font-black hover:opacity-100 transition-opacity">Terms</a>
        <a href="#" class="text-[7px] uppercase tracking-widest font-black hover:opacity-100 transition-opacity">Privacy</a>
      </div>
    </div>
  </footer>
</template>
