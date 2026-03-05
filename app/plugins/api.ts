export default defineNuxtPlugin(() => {
  const { token, logout } = useAuth()

  const apiFetch = $fetch.create({
    onRequest({ options }) {
      // Her istekte token'ı ekle
      if (token.value) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token.value}`
        }
      }
    },
    onResponseError({ response }) {
      // 401 hatası alırsak otomatik logout yap
      if (response.status === 401) {
        logout()
      }
    }
  })

  return {
    provide: {
      api: apiFetch
    }
  }
})
