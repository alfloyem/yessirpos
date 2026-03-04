<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  images: string[]
  maxImages?: number
}>()

const emit = defineEmits(['update:images', 'remove'])

const currentIndex = ref(0)
const fileInputRef = ref<HTMLInputElement | null>(null)

const maxImagesCount = computed(() => props.maxImages || Infinity)

const canAddMore = computed(() => props.maxImages ? props.images.length < props.maxImages : true)

const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (!files || files.length === 0) return
  
  const newImages: string[] = []
  let processedCount = 0
  
  // Calculate how many files we can process
  const remainingSlots = props.maxImages ? props.maxImages - props.images.length : Infinity
  const filesToProcess = props.maxImages ? Math.min(files.length, remainingSlots) : files.length
  
  if (props.maxImages && filesToProcess === 0) {
    alert(`Maksimum ${props.maxImages} şəkil əlavə edə bilərsiniz!`)
    target.value = ''
    return
  }
  
  Array.from(files).slice(0, filesToProcess).forEach((file) => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Yalnız şəkil faylları yükləyə bilərsiniz!')
      processedCount++
      return
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(`${file.name} - Şəkil ölçüsü 5MB-dan çox ola bilməz!`)
      processedCount++
      return
    }
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (result && typeof result === 'string') {
        newImages.push(result)
      }
      processedCount++
      
      // When all files are processed, emit update
      if (processedCount === filesToProcess) {
        if (newImages.length > 0) {
          emit('update:images', [...props.images, ...newImages])
        }
        // Reset input
        target.value = ''
      }
    }
    reader.onerror = () => {
      processedCount++
      if (processedCount === filesToProcess) {
        if (newImages.length > 0) {
          emit('update:images', [...props.images, ...newImages])
        }
        target.value = ''
      }
    }
    reader.readAsDataURL(file)
  })
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
  if (currentIndex.value > 0) {
    currentIndex.value--
  } else {
    currentIndex.value = props.images.length - 1
  }
}

const goToNext = (e?: Event) => {
  e?.stopPropagation()
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
  <div class="space-y-4">
    <!-- Main Image Display -->
    <div 
      class="relative w-full aspect-square bg-[var(--input-bg)] border border-[var(--border-app)] rounded-2xl overflow-hidden group transition-all duration-300"
      :class="!images.length && canAddMore ? 'hover:border-[var(--text-primary)] border-dashed border-2 cursor-pointer hover:bg-[var(--bg-app)]' : ''"
      @click="!images.length && canAddMore ? triggerUpload() : null"
    >
      <div v-if="images.length === 0" class="absolute inset-0 flex flex-col items-center justify-center p-8">
        <UiIcon name="lucide:image-plus" class="w-10 h-10 mb-3 text-[var(--text-primary)] opacity-40 group-hover:opacity-100 transition-opacity duration-300 group-hover:scale-110" />
        <span class="text-sm font-semibold text-[var(--text-app)] opacity-60 group-hover:opacity-100 group-hover:text-[var(--text-primary)] transition-all">Şəkil əlavə et</span>
      </div>

      <div v-else class="relative w-full h-full bg-white/5 flex items-center justify-center">
        <!-- Current Image -->
        <img 
          :src="images[currentIndex]" 
          alt="Product" 
          class="w-full h-full object-contain mix-blend-normal p-2"
        />

        <!-- Navigation Arrows - Left -->
        <button
          v-if="images.length > 1"
          @click="goToPrevious"
          class="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/80 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer z-10 opacity-0 group-hover:opacity-100 hover:scale-110"
        >
          <UiIcon name="lucide:chevron-left" class="w-5 h-5" />
        </button>

        <!-- Navigation Arrows - Right -->
        <button
          v-if="images.length > 1"
          @click="goToNext"
          class="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/80 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer z-10 opacity-0 group-hover:opacity-100 hover:scale-110"
        >
          <UiIcon name="lucide:chevron-right" class="w-5 h-5" />
        </button>

        <!-- Remove Button -->
        <button
          @click="removeImage(currentIndex)"
          class="absolute top-3 right-3 w-8 h-8 bg-[var(--color-brand-danger)]/80 hover:bg-[var(--color-brand-danger)] backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer z-10 opacity-0 group-hover:opacity-100 hover:scale-110"
          title="Şəkli sil"
        >
          <UiIcon name="lucide:trash-2" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Thumbnails & Upload Controls -->
    <div class="flex items-center justify-between px-1 mt-3">
      <div class="flex items-center gap-2">
        <!-- Custom indicator dots -->
        <div v-if="images.length > 1" class="flex items-center gap-1.5 mr-2">
          <div
            v-for="(_, index) in images"
            :key="index"
            @click="goToIndex(index)"
            class="h-1.5 rounded-full transition-all duration-300 cursor-pointer"
            :class="currentIndex === index 
              ? 'bg-[var(--text-primary)] w-5' 
              : 'bg-[var(--border-app)] hover:bg-[var(--text-primary)]/50 w-1.5'"
          ></div>
        </div>

        <input
          type="file"
          accept="image/*"
          multiple
          @change="handleImageUpload"
          class="hidden"
          ref="fileInputRef"
          :id="`image-upload-carousel-${Date.now()}`"
        />
        <label
          v-if="images.length > 0"
          :for="`image-upload-carousel-${Date.now()}`"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase transition-all cursor-pointer"
          :class="canAddMore 
            ? 'bg-[var(--text-primary)]/10 text-[var(--text-primary)] hover:bg-[var(--text-primary)]/20' 
            : 'bg-[var(--input-bg)] text-[var(--text-app)] opacity-50 cursor-not-allowed pointer-events-none'"
        >
          <UiIcon name="lucide:plus" class="w-3.5 h-3.5" />
          YENİ ŞƏKİL
        </label>
      </div>
      
      <!-- Counter indicator -->
      <div v-if="images.length > 0" class="text-[11px] font-bold tracking-widest text-[var(--text-app)] bg-[var(--input-bg)]/50 px-2.5 py-1 rounded-md opacity-70">
        {{ currentIndex + 1 }} / {{ images.length }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: var(--bg-app);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-app);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--text-primary);
}
</style>
