import { useAuth } from '~/composables/useAuth'

export default defineNuxtRouteMiddleware((to: any) => {
    const clientData = getClientData()
    const { user } = useAuth()
    const localePath = useLocalePath()
    
    // Combine global and employee permissions
    const globalForbidden = clientData.permissions?.notAllowed || []
    const localForbidden = user.value?.notAllowed || []
    const notAllowedPaths = [...new Set([...globalForbidden, ...localForbidden])]
    
    // Check if the current path (normalized) is in the restricted list (or its sub-routes)
    const isRestricted = notAllowedPaths.some((path: string | any) => 
        to.path === path || to.path.startsWith(path + '/')
    )

    if (isRestricted) {
        console.warn(`Access to ${to.path} is restricted for this client.`)
        return navigateTo(localePath('/'))
    }
})
