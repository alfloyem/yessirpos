<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps<{
  images: string[]
  maxImages?: number
}>()

const emit = defineEmits(['update:images', 'remove'])

const currentIndex = ref(0)
const fileInputRef = ref<HTMLInputElement | null>(null)
const scrollContainerRef = ref<HTMLElement | null>(null)
const thumbRefs = ref<HTMLElement[]>([])
const inputId = ref(`image-upload-${Math.random().toString(36).substring(2, 9)}`)

const canAddMore = computed(() => props.maxImages ? props.images.length < props.maxImages : true)

// Auto-scroll to selected thumbnail
watch(currentIndex, async (newVal) => {
  await nextTick()
  const el = thumbRefs.value?.[newVal]
  if (el && typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    })
  }
})

// Reset thumb refs when images change
watch(() => props.images.length, () => {
  thumbRefs.value = []
})

const processFile = (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      alert(`${file.name} - Yalnız şəkil faylları yükləyə bilərsiniz!`)
      resolve(null)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(`${file.name} - Şəkil ölçüsü 5MB-dan çox ola bilməz!`)
      resolve(null)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (result && typeof result === 'string') resolve(result)
      else resolve(null)
    }
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

const handleImageUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (!files || files.length === 0) return
  
  const remainingSlots = props.maxImages ? props.maxImages - props.images.length : Infinity
  const filesToProcess = props.maxImages ? Math.min(files.length, remainingSlots) : files.length
  
  if (props.maxImages && filesToProcess === 0) {
    alert(`Maksimum ${props.maxImages} şəkil əlavə edə bilərsiniz!`)
    target.value = ''
    return
  }
  
  const filesArray = Array.from(files).slice(0, filesToProcess)
  const results = await Promise.all(filesArray.map(f => processFile(f)))
  const validImages = results.filter(r => r !== null) as string[]

  if (validImages.length > 0) {
    emit('update:images', [...props.images, ...validImages])
    // If it was empty, set current to 0
    if (props.images.length === 0) currentIndex.value = 0
  }
  
  target.value = ''
}

const removeImage = (index: number, e?: Event) => {
  e?.stopPropagation()
  const newImages = props.images.filter((_, i) => i !== index)
  emit('update:images', newImages)
  
  if (currentIndex.value >= newImages.length && newImages.length > 0) {
    currentIndex.value = newImages.length - 1
  } else if (newImages.length === 0) {
    currentIndex.value = 0
  }
}

const goToPrevious = (e?: Event) => {
  e?.stopPropagation()
  if (props.images.length === 0) return
  if (currentIndex.value > 0) {
    currentIndex.value--
  } else {
    currentIndex.value = props.images.length - 1
  }
}

const goToNext = (e?: Event) => {
  e?.stopPropagation()
  if (props.images.length === 0) return
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++
  } else {
    currentIndex.value = 0
  }
}

const goToIndex = (index: number, e?: Event) => {
  e?.stopPropagation()
  currentIndex.value = index
}

const triggerUpload = () => {
  if (fileInputRef.value) fileInputRef.value.click()
}
</script>

<template>
  <div class="flex flex-col h-full gap-4 min-h-0">
    <!-- Main Image Display (Above) -->
    <div 
      class="relative aspect-square w-full bg-[var(--input-bg)] border border-[var(--border-app)] rounded-2xl overflow-hidden group transition-all duration-300"
      :class="!images.length && canAddMore ? 'hover:border-[var(--text-primary)] border-dashed border-2 cursor-pointer hover:bg-[var(--bg-app)]' : ''"
      @click="!images.length && canAddMore ? triggerUpload() : null"
    >
      <!-- Empty State -->
      <div v-if="images.length === 0" class="absolute inset-0 flex flex-col items-center justify-center p-8">
        <UiIcon name="lucide:image-plus" class="w-12 h-12 mb-3 text-[var(--text-primary)] opacity-40 group-hover:opacity-100 transition-opacity duration-300 group-hover:scale-110" />
        <span class="text-sm font-bold text-[var(--text-app)] opacity-60 group-hover:opacity-100 group-hover:text-[var(--text-primary)] transition-all tracking-wide">ŞƏKİL ƏLAVƏ ET</span>
      </div>

      <!-- Main Preview -->
      <div v-else class="relative w-full h-full bg-white/5 flex items-center justify-center min-h-0">
        <!-- Current Main Image -->
        <img 
          :src="images[currentIndex]" 
          class="w-full h-full object-contain transition-opacity duration-500 p-2"
          alt="Product Image"
        />

        <!-- Navigation Arrows -->
        <button
          v-if="images.length > 1"
          @click="goToPrevious"
          class="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer z-10 opacity-0 group-hover:opacity-100 hover:scale-110"
        >
          <UiIcon name="lucide:chevron-left" class="w-6 h-6" />
        </button>

        <button
          v-if="images.length > 1"
          @click="goToNext"
          class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer z-10 opacity-0 group-hover:opacity-100 hover:scale-110"
        >
          <UiIcon name="lucide:chevron-right" class="w-6 h-6" />
        </button>

        <!-- Main Delete Button -->
        <button
          @click="removeImage(currentIndex)"
          class="absolute top-4 right-4 w-10 h-10 bg-[var(--color-brand-danger)]/80 hover:bg-[var(--color-brand-danger)] backdrop-blur-md text-white rounded-xl flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer z-10 opacity-0 group-hover:opacity-100 hover:scale-110"
        >
          <UiIcon name="lucide:trash-2" class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Mini Thumbnail Row (Below) -->
    <div 
      v-if="images.length > 0 || canAddMore" 
      ref="scrollContainerRef"
      class="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar scroll-smooth"
    >
      <!-- Thumbnails -->
      <div 
        v-for="(img, index) in images" 
        :key="index"
        :ref="el => { if (el) thumbRefs[index] = el as HTMLElement }"
        @click="goToIndex(index)"
        class="relative min-w-[80px] w-20 aspect-square rounded-xl border-2 transition-all duration-300 cursor-pointer overflow-hidden group/thumb"
        :class="currentIndex === index 
          ? 'border-[var(--text-primary)] shadow-lg scale-95 brightness-100 grayscale-0' 
          : 'border-[var(--border-app)] hover:border-[var(--text-primary)]/50 brightness-[0.6] grayscale'"
      >
        <img :src="img" class="w-full h-full object-contain p-1" />
      </div>

      <!-- Add New Button (Square, dashed border) -->
      <div 
        v-if="canAddMore"
        @click="triggerUpload"
        class="min-w-[80px] w-20 aspect-square rounded-xl border-2 border-dashed border-[var(--border-app)] hover:border-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-200 group/add"
      >
        <UiIcon name="lucide:plus" class="w-6 h-6 text-[var(--text-app)] opacity-40 group-hover/add:opacity-100 group-hover/add:text-[var(--text-primary)] transition-all" />
        <span class="text-[9px] font-bold text-[var(--text-app)] opacity-40 group-hover/add:opacity-100 group-hover/add:text-[var(--text-primary)]">ƏLAVƏ ET</span>
      </div>

      <input
        type="file"
        accept="image/*"
        multiple
        @change="handleImageUpload"
        class="hidden"
        ref="fileInputRef"
        :id="inputId"
      />
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
