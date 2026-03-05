import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Veritabanı seed işlemi başlıyor...')

  // Test şifresi: 12345678
  const hashedPassword = await bcrypt.hash('12345678', 10)

  // Çalışanları ekle
  const employees = await Promise.all([
    prisma.employee.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        email: 'admin@yessirpos.com',
        phone: '+90 555 000 0000',
        gender: 'Kişi',
        status: 'Aktif',
        password: hashedPassword,
        notes: 'Sistem yöneticisi'
      }
    }),
    prisma.employee.upsert({
      where: { username: 'ahmet_yilmaz' },
      update: {},
      create: {
        firstName: 'Ahmet',
        lastName: 'Yılmaz',
        username: 'ahmet_yilmaz',
        email: 'ahmet@yessirpos.com',
        phone: '+90 555 123 4567',
        gender: 'Kişi',
        status: 'Aktif',
        password: hashedPassword,
        notes: 'Hızlı çalışan'
      }
    }),
    prisma.employee.upsert({
      where: { username: 'ayse_kaya' },
      update: {},
      create: {
        firstName: 'Ayşe',
        lastName: 'Kaya',
        username: 'ayse_kaya',
        email: 'ayse@yessirpos.com',
        phone: '+90 555 987 6543',
        gender: 'Qadın',
        status: 'Aktif',
        password: hashedPassword,
        notes: ''
      }
    })
  ])

  console.log('✅ Çalışanlar eklendi:', employees.length)

  // Ürünleri ekle
  const products = await Promise.all([
    prisma.product.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'Çay',
        price: 5.0,
        stock: 100
      }
    }),
    prisma.product.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: 'Kahve',
        price: 15.0,
        stock: 50
      }
    })
  ])

  console.log('✅ Ürünler eklendi:', products.length)

  console.log('🎉 Seed işlemi tamamlandı!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
  .catch(async (e) => {
    console.error('❌ Seed hatası:', e)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })

