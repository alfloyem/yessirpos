<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

const toastContainerRef = ref()
const toast = useToast()

onMounted(async () => {
  await nextTick()
  if (toastContainerRef.value) {
    toast.setContainer(toastContainerRef.value)
  }
})
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ToastContainer ref="toastContainerRef" />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
</style>
