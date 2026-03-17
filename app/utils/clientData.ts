import bakustreet from '~/clients/bakustreet.json'
import cosmetics from '~/clients/cosmetics.json'

export interface ClientData {
  name: string
  address: string
  logoSvg: string
}

const clients: Record<string, ClientData> = { bakustreet, cosmetics }

export const getClientData = (): ClientData => {
  const config = useRuntimeConfig()
  const id = config.public.clientId || 'bakustreet'
  return (clients[id] ?? clients['bakustreet']) as ClientData
}
