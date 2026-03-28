<script setup lang="ts">
const isSidebarCollapsed = useState("sidebarCollapsed", () => false);
const { t } = useI18n();
const route = useRoute();

import { menuItems } from '~/utils/menu'
import type { MenuItem } from '~/utils/menu'

const { user, logout } = useAuth();
const { unreadCount, fetchNotifications } = useNotifications();
const clientData = getClientData()
const notAllowedPaths = computed(() => {
    const globalForbidden = clientData.permissions?.notAllowed || []
    const localForbidden = user.value?.notAllowed || []
    return [...new Set([...globalForbidden, ...localForbidden])]
})

const filteredMenuItems = computed(() => {
    return menuItems.map((category: MenuItem) => ({
        ...category,
        children: category.children.filter((child: any) => !notAllowedPaths.value.includes(child.to))
    })).filter((category: any) => category.children.length > 0)
})

const expandedCategories = ref<Set<string>>(new Set());

// Sync and persist state with localStorage
onMounted(() => {
    // Restore sidebar collapse state
    const savedCollapsed = localStorage.getItem("sidebar_collapsed");
    if (savedCollapsed !== null) {
        isSidebarCollapsed.value = savedCollapsed === "true";
    }

    // Restore expanded categories
    const savedExpanded = localStorage.getItem("sidebar_expanded_categories");
    if (savedExpanded) {
        try {
            const categories = JSON.parse(savedExpanded);
            expandedCategories.value = new Set(categories);
        } catch (e) {
            console.error("Failed to parse expanded categories", e);
        }
    }

    // Notifications polling
    fetchNotifications();
    setInterval(fetchNotifications, 5000);
});

const isCategoryActive = (category: MenuItem) => {
    return category.children.some((child) => route.path === child.to || route.path.startsWith(child.to + "/"));
};

const isChildActive = (to: string) => {
    return route.path === to || route.path.startsWith(to + "/");
};

const toggleCategory = (titleKey: string) => {
    if (isSidebarCollapsed.value) {
        isSidebarCollapsed.value = false;
        expandedCategories.value.add(titleKey);
        return;
    }

    if (expandedCategories.value.has(titleKey)) {
        expandedCategories.value.delete(titleKey);
    } else {
        expandedCategories.value.add(titleKey);
    }

    // Persist expanded categories
    localStorage.setItem("sidebar_expanded_categories", JSON.stringify(Array.from(expandedCategories.value)));
};

const isSidebarResizing = ref(false);

const toggleSidebar = () => {
    isSidebarCollapsed.value = !isSidebarCollapsed.value;
};

watch(isSidebarCollapsed, (collapsed) => {
    // Persist collapse state
    localStorage.setItem("sidebar_collapsed", String(collapsed));

    isSidebarResizing.value = true;
    if (collapsed) {
        expandedCategories.value.clear();
        localStorage.removeItem("sidebar_expanded_categories");
    }

    // Reset resizing state after transition completes
    setTimeout(() => {
        isSidebarResizing.value = false;
    }, 300);
});
</script>

<template>
    <aside :class="['h-screen border-r border-[var(--border-app)] flex flex-col transition-all duration-300 ease-in-out', isSidebarCollapsed ? 'w-20' : 'w-64']">
        <!-- Logo Section -->
        <div class="h-16 flex items-center px-4">
            <div class="flex items-center gap-1 overflow-hidden">
                <img src="~/assets/images/logo/emblem.svg" alt="Logo" class="w-10 h-10 flex-shrink-0" />
                <img src="~/assets/images/logo/typography.svg" alt="YESSIR POS" :class="['!h-10 transition-all duration-300 overflow-hidden !flex-shrink-0', isSidebarCollapsed ? 'opacity-0' : 'opacity-100']" />
            </div>
        </div>

        <!-- Navigation Menu -->
        <nav :class="['flex-1 flex flex-col gap-2 p-3 pt-2 no-scrollbar', isSidebarCollapsed || isSidebarResizing ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden']">
            <div v-for="category in filteredMenuItems" :key="category.titleKey" class="group/category relative">
                <!-- Category Header -->
                <button
                    @click="toggleCategory(category.titleKey)"
                    :class="[
                        'w-full flex items-center gap-3 px-5 p-3 transition-all duration-300 rounded-xl group',
                        isCategoryActive(category) ? 'bg-[var(--text-primary)]/10 text-[var(--text-primary)]' : 'text-[var(--text-app)] hover:bg-[var(--input-bg)]',
                    ]">
                    <Icon :name="category.icon" :class="['!w-4 !h-4 flex-shrink-0 transition-opacity duration-300', isCategoryActive(category) ? 'opacity-100' : 'opacity-60 group-hover/category:opacity-100']" />
                    <span
                        :class="[
                            'flex-1 text-left text-sm font-medium transition-all duration-300 text-nowrap',
                            isSidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : isCategoryActive(category) ? 'w-auto opacity-100' : 'w-auto opacity-60 group-hover/category:opacity-100',
                        ]">
                        {{ t(category.titleKey) }}
                    </span>
                    <Icon
                        name="lucide:chevron-down"
                        :class="[
                            'w-4 h-4 transition-all duration-300',
                            expandedCategories.has(category.titleKey) && 'rotate-180',
                            isSidebarCollapsed ? 'opacity-0 w-0' : isCategoryActive(category) ? 'opacity-100' : 'opacity-60 group-hover/category:opacity-100',
                        ]" />
                </button>

                <!-- Category Children -->
                <div
                    :class="[
                        'ease-in-out flex flex-col',
                        isSidebarResizing ? 'transition-none' : 'transition-all duration-300',
                        !isSidebarCollapsed
                            ? expandedCategories.has(category.titleKey)
                                ? 'max-h-96 opacity-100 overflow-hidden mt-1 gap-1'
                                : 'max-h-0 opacity-0 overflow-hidden pointer-events-none'
                            : 'absolute left-[60px] top-0 w-52 bg-[var(--bg-app)] border border-[var(--border-app)] rounded-2xl shadow-xl invisible opacity-0 translate-x-4 blur-sm group-hover/category:visible group-hover/category:opacity-100 group-hover/category:translate-x-0 group-hover/category:blur-none z-[100] p-2 transition-all duration-300',
                    ]">
                    <!-- Header (Only for collapsed hover mode) -->
                    <div v-if="isSidebarCollapsed" class="px-3 py-2 border-b border-[var(--border-app)] mb-1 flex items-center gap-2">
                        <Icon :name="category.icon" class="w-4 h-4 text-[var(--text-primary)]" />
                        <span class="font-bold text-[13px] text-[var(--text-app)] truncate">{{ t(category.titleKey) }}</span>
                    </div>

                    <NuxtLink
                        v-for="child in category.children"
                        :key="child.to"
                        :to="child.to"
                        :class="[
                            'flex items-center gap-3 px-4 py-2 text-sm transition-all duration-300 rounded-xl group/child relative',
                            isChildActive(child.to)
                                ? 'bg-[var(--text-primary)] text-white font-medium'
                                : 'text-[var(--text-muted)] hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] shadow-none',
                            !isSidebarCollapsed ? 'mx-2 pl-12' : 'mx-1 my-0.5',
                        ]">
                        <span :class="['text-nowrap transition-all duration-300', isSidebarCollapsed ? 'opacity-90' : isChildActive(child.to) ? 'opacity-100' : 'opacity-80 group-hover/child:opacity-100']">
                            {{ t(child.titleKey) }}
                        </span>
                    </NuxtLink>
                </div>
            </div>

            <div class="flex-1"></div>
            <!-- Notifications Button -->
            <NuxtLink v-if="!notAllowedPaths.includes('/notifications')" to="/notifications" class="relative flex items-center gap-3 px-5 p-3 text-[var(--text-muted)] hover:text-[var(--text-app)] hover:bg-[var(--input-bg)] transition-all rounded-xl group/notifications">
                <div class="relative flex-shrink-0">
                    <Icon name="lucide:bell" class="w-5 h-5 opacity-60 group-hover/notifications:opacity-100 transition-opacity" />
                    <span 
                        v-if="unreadCount > 0"
                        class="absolute -top-1 -right-1 flex h-[14px] min-w-[14px] px-[3px] items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-sm ring-2 ring-[var(--bg-app)]"
                    >
                        {{ unreadCount > 99 ? '99+' : unreadCount }}
                    </span>
                </div>
                <span :class="['text-sm font-medium transition-all duration-300 whitespace-nowrap', isSidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100']">
                    {{ t("notifications.title", "Bildirişlər") }}
                </span>
            </NuxtLink>
            <!-- Settings Button -->
            <NuxtLink v-if="!notAllowedPaths.includes('/settings')" to="/settings" class="flex items-center gap-3 px-5 p-3 text-[var(--text-muted)] hover:text-[var(--text-app)] hover:bg-[var(--input-bg)] transition-all rounded-xl group/settings">
                <Icon name="lucide:settings" class="w-5 h-5 flex-shrink-0 opacity-60 group-hover/settings:opacity-100 transition-opacity" />
                <span :class="['text-sm font-medium transition-all duration-300 whitespace-nowrap', isSidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100']">
                    {{ t("menu.settings") }}
                </span>
            </NuxtLink>
            <!-- Logout Button -->
            <button @click="logout" class="flex items-center gap-3 px-5 p-3 text-red-500 hover:bg-red-500/10 transition-all rounded-xl group/logout">
                <Icon name="lucide:log-out" class="w-5 h-5 flex-shrink-0 opacity-60 group-hover/logout:opacity-100 transition-opacity" />
                <span :class="['text-sm font-medium transition-all duration-300 whitespace-nowrap', isSidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100']">
                    {{ t("logout") }}
                </span>
            </button>
        </nav>
    </aside>
</template>
