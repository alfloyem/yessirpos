import { defineEventHandler, readBody, createError } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const body = await readBody(event)
  const user = event.context.user // Requires auth middleware

  if (!user || (!user.id && !user.employeeId)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { token } = body
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Token gərəklidir' })
  }

  try {
    const employeeId = user.employeeId || user.id
    const dbUser = await prisma.employee.findUnique({ where: { id: parseInt(employeeId) } })
    
    if (dbUser) {
      // Parse existing tokens or start fresh array
      let tokens: string[] = []
      if (dbUser.fcmTokens) {
        try {
          tokens = JSON.parse(dbUser.fcmTokens)
        } catch (e) { tokens = [] }
      }

      // Add new token if not present
      if (!tokens.includes(token)) {
        tokens.push(token)
        // Keep only max 5 tokens per user, dropping oldest
        if (tokens.length > 5) tokens = tokens.slice(tokens.length - 5)
        
        await prisma.employee.update({
          where: { id: dbUser.id },
          data: { fcmTokens: JSON.stringify(tokens) }
        })
      }
    }
    
    return { success: true, message: 'FCM Token qeyd edildi' }
  } catch (err: any) {
    console.error('FCM Token sync error:', err)
    throw createError({ statusCode: 500, statusMessage: 'Token saxlanıla bilmədi' })
  }
})
