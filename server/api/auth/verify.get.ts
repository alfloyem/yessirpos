import { defineEventHandler, createError } from 'h3'

export default defineEventHandler((event) => {
  const user = event.context.user

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'İstifadəçi doğrulanmadı' })
  }

  return { valid: true, user }
})
