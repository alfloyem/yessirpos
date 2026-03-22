import pkg from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const { PrismaClient } = pkg

// Global prisma instance to prevent multiple connections in development
const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined
}

const connectionString = process.env.DATABASE_URL

if (!connectionString && process.env.NODE_ENV === 'production') {
  console.error('DATABASE_URL is missing in production environment!')
}

const poolConfig: any = { 
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}

// Add SSL for production (usually required by Neon/Supabase/etc on Vercel)
if (process.env.NODE_ENV === 'production' || connectionString?.includes('neon.tech') || connectionString?.includes('supabase')) {
  poolConfig.ssl = { rejectUnauthorized: false }
}

const pool = new Pool(poolConfig)
const adapter = new PrismaPg(pool)

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
