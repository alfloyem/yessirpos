import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { getClientData } from '~/utils/clientData'
import { useLocalePath } from '#i18n'

export default defineNuxtRouteMiddleware((to: any) => {
    const clientData = getClientData()
    const localePath = useLocalePath()
    
    // Check if the client has restricted this page
    const notAllowedPaths = clientData.permissions?.notAllowed || []
    
    // Check if the current path (normalized) is in the restricted list (or its sub-routes)
    const isRestricted = notAllowedPaths.some((path: string) => 
        to.path === path || to.path.startsWith(path + '/')
    )

    if (isRestricted) {
        console.warn(`Access to ${to.path} is restricted for this client.`)
        return navigateTo(localePath('/'))
    }
})
