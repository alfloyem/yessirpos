import { defineEventHandler } from 'h3'
import prisma from '../utils/prisma'

export default defineEventHandler(async () => {
  return {
    keys: Object.keys(prisma),
    models: Object.keys((prisma as any)._dmmf?.modelMap || {}),
    env: process.env.NODE_ENV
  }
})
