<script setup>
import { useI18n } from '#i18n'
const { t } = useI18n()
const date = new Date().getFullYear();
</script>

<template>
  <footer class="p-8 text-center border-t border-[var(--border-app)] mt-auto">
    <div class="flex flex-col items-center gap-4">
      <p class="text-[8px] text-[var(--text-app)] opacity-40 tracking-[.5em] font-black">
        &copy; {{ date }} YESSIRPOS
      </p>
      
      <div class="flex gap-8 opacity-40">
        <a href="#" class="text-[7px] text-[var(--text-app)] tracking-widest font-black hover:opacity-100 hover:text-[var(--text-primary)] transition-all">{{ t('footer.terms') }}</a>
        <a href="#" class="text-[7px] text-[var(--text-app)] tracking-widest font-black hover:opacity-100 hover:text-[var(--text-primary)] transition-all">{{ t('footer.privacy') }}</a>
      </div>
    </div>
  </footer>
</template>
