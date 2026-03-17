export interface ClientData {
  name: string
  address: string
  logoSvg: string
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
  const config = useRuntimeConfig()
  const id = config.public.clientId || 'bakustreet'
  return clients[id] ?? clients['bakustreet'] as ClientData
}
