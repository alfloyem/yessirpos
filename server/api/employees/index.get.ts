import { defineEventHandler, createError, readBody, getRouterParam, getQuery, getCookie, getHeader } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        phone: true,
        gender: true,
        role: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true
        // password'u döndürmüyoruz
      }
    })

    return employees.map((e: any) => {
      let parsedRole = []
      if (e.role) {
        try {
          if (e.role.startsWith('[') || e.role.startsWith('{') || e.role.startsWith('"')) {
             parsedRole = JSON.parse(e.role)
          } else {
             parsedRole = [e.role]
          }
        } catch {
          parsedRole = [e.role]
        }
      }
      return {
        ...e,
        role: Array.isArray(parsedRole) ? parsedRole : [parsedRole]
      }
    })
  } catch (error: any) {
    console.error('Error in /api/employees GET:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Çalışanlar yüklenirken hata oluştu'
    })
  }
})
