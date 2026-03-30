import { useServerConfig } from '~/composables/useServerConfig'

export interface ClientData {
  name: string
  address: string
  phone?: string
  logoSvg: string
  permissions?: {
    notAllowed?: string[]
  }
}

// Automatically picks up all JSON files in ~/clients/
const modules = import.meta.glob<ClientData>('~/clients/*.json', { eager: true })

// Normalize keys: "~/clients/bakustreet.json" → "bakustreet"
const clients: Record<string, ClientData> = Object.fromEntries(
  Object.entries(modules).map(([path, data]) => [
    path.replace(/^.*\/(.+)\.json$/, '$1'),
    data,
  ])
)

export const getClientData = (): ClientData => {
  const { activeClientId } = useServerConfig()
  const id = activeClientId.value || 'bakustreet'
  return clients[id] ?? clients['bakustreet'] as ClientData
}
