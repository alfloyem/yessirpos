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