import 'dotenv/config'
import { createRequire } from 'module'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'

// Prisma Client 7 ships as CJS; use createRequire for ESM compatibility
const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const username = process.argv[2] || 'admin'
  const password = process.argv[3] || 'admin123'

  const existing = await prisma.employee.findFirst({ where: { username } })
  if (existing) {
    console.log(`⚠️  "${username}" adlı istifadəçi artıq mövcuddur.`)
    return
  }

  const hashed = await bcrypt.hash(password, 10)

  await prisma.employee.create({
    data: {
      firstName: 'Admin',
      lastName: 'User',
      username,
      email: `${username}@admin.local`,
      phone: '',
      gender: 'Kişi',
      status: 'Aktif',
      password: hashed,
      role: JSON.stringify(['Admin']),
      notes: 'Sistem administratoru',
    },
  })

  console.log(`✅ Admin hesabı yaradıldı!`)
  console.log(`   İstifadəçi adı : ${username}`)
  console.log(`   Şifrə          : ${password}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
  .catch(async (e) => {
    console.error('❌ Xəta:', e.message)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })
