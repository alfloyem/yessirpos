<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import imageCompression from 'browser-image-compression'
import draggable from 'vuedraggable'
import { useI18n } from '#i18n'

interface ImageMetadata {
  id: string
  originalName: string
  originalSize: number
  processedSize: number
  originalFormat: string
  error?: string
}

const props = withDefaults(defineProps<{
  images: string[] // This contains the final WebP dataURLs
  maxImages?: number
  maxFileSizeMB?: number
  maxTotalSizeMB?: number
  webpQuality?: number
  maxOutputWidth?: number
  maxOutputHeight?: number
  targetFileSizeKB?: number
  productName?: string
  attributes?: string[]
}>(), {
  maxImages: 20,
  maxFileSizeMB: 20,
  maxTotalSizeMB: 100,
  webpQuality: 0.97,
  maxOutputWidth: 3840,
  maxOutputHeight: 2160,
  targetFileSizeKB: 500
})

const emit = defineEmits(['update:images'])

const { t } = useI18n()

// --- State ---
const currentIndex = ref(0)
const isDraggingOver = ref(false)
const imageMetadata = ref<Record<string, ImageMetadata>>({})
const processedImages = ref<string[]>([...props.images])
const fileInput = ref<HTMLInputElement | null>(null)

const suggestedBaseName = computed(() => {
  if (!props.productName) return 'product-image'
  return props.productName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
})

const getSuggestedFilename = (index: number) => {
  let name = suggestedBaseName.value
  if (props.attributes && props.attributes.length > 0) {
    name += '_' + props.attributes.join('_').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }
  if (index > 0) name += `-${index}`
  return name + '.webp'
}

// Logic to keep synced with prop if needed
watch(() => props.images, (newVal) => {
  if (JSON.stringify(newVal) !== JSON.stringify(processedImages.value)) {
    processedImages.value = [...newVal]
  }
}, { deep: true })

// --- Helpers ---
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

const getExtension = (filename: string) => filename.split('.').pop()?.toUpperCase() || ''

// --- Processing Logic ---
const compressImage = async (file: File) => {
  let quality = props.webpQuality
  const minQuality = 0.85
  const options = {
    maxSizeMB: props.targetFileSizeKB / 1024,
    maxWidthOrHeight: Math.max(props.maxOutputWidth, props.maxOutputHeight),
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: quality,
    alwaysKeepAspectRatio: true
  }

  try {
    let compressedFile = await imageCompression(file, options)
    
    // Binary search quality loop (approximate by trial)
    // browser-image-compression handles some of this, but let's do a refined loop if needed
    let iterations = 0
    while (compressedFile.size / 1024 > props.targetFileSizeKB && iterations < 6 && quality > minQuality) {
      quality -= 0.02
      compressedFile = await imageCompression(file, { ...options, initialQuality: quality })
      iterations++
    }
    
    return compressedFile
  } catch (error) {
    console.error('Compression failed', error)
    return file
  }
}

const handleFiles = async (files: FileList | File[]) => {
  const incomingFiles = Array.from(files)
  const acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/tiff', 'image/bmp', 'image/svg+xml']
  
  if (processedImages.value.length + incomingFiles.length > props.maxImages) {
    alert(t('toast.maxFilesReached', `Maksimum ${props.maxImages} şəkil əlavə edə bilərsiniz!`))
    return
  }

  const validFiles = incomingFiles.filter(file => {
    if (!acceptedTypes.includes(file.type)) {
      alert(`${file.name} - ${t('toast.unsupportedFileType', 'Dəstəklənməyən fayl növü!')}`)
      return false
    }
    if (file.size > props.maxFileSizeMB * 1024 * 1024) {
      alert(`${file.name} - ${t('toast.fileTooLarge', `Fayl ölçüsü ${props.maxFileSizeMB}MB-dan çox ola bilməz!`)}`)
      return false
    }
    return true
  })

  // Process files directly without cropping
  for (const file of validFiles) {
    let dataUrl = ''
    let processedSize = 0
    let isSvg = file.type === 'image/svg+xml'

    if (isSvg) {
      // Skip compression for SVG
      dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      })
      processedSize = file.size
    } else {
      const compressedWebp = await compressImage(file)
      dataUrl = await imageCompression.getDataUrlFromFile(compressedWebp)
      processedSize = compressedWebp.size
    }
    
    const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    const meta: ImageMetadata = {
      id,
      originalName: file.name,
      originalSize: file.size,
      processedSize: processedSize,
      originalFormat: isSvg ? 'SVG' : (getExtension(file.name) || (file.type.split('/')[1]?.toUpperCase() || 'IMG'))
    }

    imageMetadata.value[dataUrl] = meta
    processedImages.value.push(dataUrl)
  }
  
  emit('update:images', [...processedImages.value])
}

// --- Interaction Handlers ---

const onDrop = (e: DragEvent) => {
  isDraggingOver.value = false
  if (e.dataTransfer?.files) {
    handleFiles(e.dataTransfer.files)
  }
}

const onPaste = (e: ClipboardEvent) => {
  if (e.clipboardData?.files.length) {
    handleFiles(e.clipboardData.files)
  }
}

const removeImage = (index: number) => {
  const removedUrl = processedImages.value[index]
  if (removedUrl) {
    delete imageMetadata.value[removedUrl]
  }
  processedImages.value.splice(index, 1)
  emit('update:images', [...processedImages.value])
  if (currentIndex.value >= processedImages.value.length && currentIndex.value > 0) {
    currentIndex.value--
  }
}

const onDragEnd = () => {
  emit('update:images', [...processedImages.value])
}

onMounted(() => {
  window.addEventListener('paste', onPaste)
})

onUnmounted(() => {
  window.removeEventListener('paste', onPaste)
})

// --- Carousel Logic ---
const nextImage = () => {
  if (processedImages.value.length === 0) return
  currentIndex.value = (currentIndex.value + 1) % processedImages.value.length
}

const prevImage = () => {
  if (processedImages.value.length === 0) return
  currentIndex.value = (currentIndex.value - 1 + processedImages.value.length) % processedImages.value.length
}

const handleKeydown = (e: KeyboardEvent) => {
  if (processedImages.value.length === 0) return
  if (e.key === 'ArrowRight') nextImage()
  if (e.key === 'ArrowLeft') prevImage()
}

// Safe access for template
const currentImageUrl = computed(() => {
  if (processedImages.value.length === 0) return null
  return processedImages.value[currentIndex.value] || null
})

const currentImageMeta = computed(() => {
  const url = currentImageUrl.value
  if (!url) return null
  return imageMetadata.value[url] || null
})
</script>

<template>
  <div class="flex flex-col gap-4 w-full" @keydown="handleKeydown" tabindex="0">
    <!-- Main Dropzone / Display Area -->
    <div 
      class="relative aspect-square w-full rounded-2xl transition-all duration-300 overflow-hidden group focus-within:ring-2 focus-within:ring-[var(--text-primary)] focus:outline-none"
        :class="[
        isDraggingOver ? 'border-[var(--text-primary)] bg-[var(--text-primary)]/5 scale-[1.01]' : 'border-[var(--border-app)] hover:border-[var(--text-primary)]/50 bg-[var(--input-bg)]',
        !processedImages.length ? 'cursor-pointer' : ''
      ]"
      @dragover.prevent="isDraggingOver = true"
      @dragleave.prevent="isDraggingOver = false"
      @drop.prevent="onDrop"
      @click="!processedImages.length ? fileInput?.click() : null"
    >
      <!-- Display Main Image -->
      <template v-if="currentImageUrl">
        <div class="relative w-full h-full bg-black/5 flex items-center justify-center">
          <img 
            :src="currentImageUrl" 
            class="w-full h-full object-contain p-4"
          />
          
          <!-- Metadata Overlay (Removed technical clutter) -->
          <div class="absolute bottom-3 left-3 flex gap-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <span v-if="currentImageMeta" class="px-2 py-1 bg-black/40 backdrop-blur-md text-white text-[10px] rounded-md font-semibold">
              {{ currentIndex + 1 }} / {{ processedImages.length }}
            </span>
          </div>

          <div class="absolute inset-x-0 top-0 p-4 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity z-10">
             <button @click.stop="removeImage(currentIndex)" class="p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg transition-all cursor-pointer">
               <UiIcon name="lucide:trash-2" class="w-5 h-5" />
             </button>
             <button @click.stop="fileInput?.click()" class="p-2 bg-[var(--text-primary)] text-white rounded-xl shadow-lg transition-all cursor-pointer">
               <UiIcon name="lucide:plus" class="w-5 h-5" />
             </button>
          </div>

          <!-- Nav controls -->
          <template v-if="processedImages.length > 1">
            <button @click.stop="prevImage" class="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-all cursor-pointer opacity-0 group-hover:opacity-100">
              <UiIcon name="lucide:chevron-left" class="w-6 h-6" />
            </button>
            <button @click.stop="nextImage" class="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-all cursor-pointer opacity-0 group-hover:opacity-100">
              <UiIcon name="lucide:chevron-right" class="w-6 h-6" />
            </button>
          </template>
        </div>
      </template>

      <!-- Empty State -->
      <template v-else>
        <div class="h-full flex flex-col items-center justify-center p-6 text-center pointer-events-none">
          <div class="w-12 h-12 rounded-full bg-[var(--text-primary)]/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <UiIcon name="lucide:image-plus" class="w-6 h-6 text-[var(--text-primary)] opacity-40" />
          </div>
          <h4 class="text-sm font-semibold text-[var(--text-app)] mb-1">{{ t('products.dropImgs', 'Şəkil əlavə et') }}</h4>
          <p class="text-[10px] font-medium text-[var(--text-app)] opacity-30 tracking-wider">JPG, PNG, WEBP, SVG</p>
        </div>
      </template>

      <input 
        type="file" 
        ref="fileInput" 
        class="hidden" 
        multiple 
        accept="image/jpeg,image/png,image/gif,image/webp,image/avif,image/tiff,image/bmp,image/svg+xml"
        @change="handleFiles(($event.target as HTMLInputElement).files || [])"
      />
    </div>

    <!-- Thumbnails Reorderable -->
    <draggable 
      v-model="processedImages" 
      class="flex flex-wrap gap-2"
      item-key="index"
      handle=".drag-handle"
      @end="onDragEnd"
    >
      <template #item="{ element, index }">
        <div 
          class="relative w-20 aspect-square rounded-xl border-2 transition-all group/thumb overflow-hidden"
          :class="currentIndex === index ? 'border-[var(--text-primary)] scale-[0.98]' : 'border-[var(--border-app)] opacity-70 hover:opacity-100'"
          @click="currentIndex = index"
        >
          <img :src="element" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1">
             <div class="drag-handle p-1.5 cursor-grab active:cursor-grabbing text-white hover:text-[var(--text-primary)]">
               <UiIcon name="lucide:grip-vertical" class="w-4 h-4" />
             </div>
             <button @click.stop="removeImage(index)" class="p-1.5 text-white hover:text-red-400 transition-colors">
               <UiIcon name="lucide:trash-2" class="w-4 h-4" />
             </button>
          </div>
        </div>
      </template>
    </draggable>
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

:deep(.vue-advanced-cropper__background) {
  background: transparent !important;
}
</style>
