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

  // Admin kullanıcısı - username: admin, password: admin
  const hashedPassword = await bcrypt.hash('admin', 10)

  const admin = await prisma.employee.upsert({
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
  })

  console.log('✅ Admin kullanıcısı oluşturuldu:', admin.username)
  console.log('🎉 Seed işlemi tamamlandı!')
  console.log('')
  console.log('Giriş bilgileri:')
  console.log('  Kullanıcı adı: admin')
  console.log('  Şifre: admin')
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

