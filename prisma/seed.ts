import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🔄 Verilənlər bazası təmizlənir...')

  // Təmizləmə əməliyyatı (sıralama vacibdir)
  await prisma.paymentMethod.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.attribute.deleteMany()
  await prisma.giftCard.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.order.deleteMany()
  await prisma.product.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.user.deleteMany()

  console.log('🌱 "Salash" Mağazası üçün demo məlumatlar əlavə edilir...')

  // --- Əməkdaşlar ---
  const hashedAdminPassword = await bcrypt.hash('admin123', 10)
  await prisma.employee.create({
    data: {
      firstName: 'Admin',
      lastName: 'User',
      username: 'admin',
      email: 'admin@salash.az',
      phone: '+994 50 123 45 67',
      gender: 'Kişi',
      status: 'Aktif',
      password: hashedAdminPassword,
      role: JSON.stringify(['Admin']),
      notes: 'Baş idarəçi'
    }
  })

  const hashedCashierPassword = await bcrypt.hash('kassa123', 10)
  await prisma.employee.create({
    data: {
      firstName: 'Günel',
      lastName: 'Məmmədova',
      username: 'gunel.m',
      email: 'gunel@salash.az',
      phone: '+994 55 987 65 43',
      gender: 'Qadın',
      status: 'Aktif',
      password: hashedCashierPassword,
      role: JSON.stringify(['Cashier']),
      notes: 'Baş kasiyer'
    }
  })

  // --- Ödəniş Metodları ---
  await prisma.paymentMethod.createMany({
    data: [
      { name: 'Nəğd', icon: 'lucide:banknote', color: 'emerald', isSystem: true },
      { name: 'Kart', icon: 'lucide:credit-card', color: 'blue', isSystem: true },
      { name: 'Bonus', icon: 'lucide:gift', color: 'amber', isSystem: true },
      { name: 'Hədiyyə Kartı', icon: 'lucide:ticket', color: 'purple', isSystem: true },
      { name: 'BirKart', icon: 'lucide:credit-card', color: 'red', isSystem: false },
      { name: 'TamKart', icon: 'lucide:credit-card', color: 'indigo', isSystem: false },
    ]
  })

  // --- Müştərilər ---
  const cust1 = await prisma.customer.create({
    data: { firstName: 'Anar', lastName: 'Əliyev', barcode: 'C10001', phone: '0501112233', city: 'Bakı', bonus: 12.50 }
  })
  const cust2 = await prisma.customer.create({
    data: { firstName: 'Leyla', lastName: 'Həsənova', barcode: 'C10002', phone: '0703334455', city: 'Bakı', bonus: 5.00 }
  })
  const cust3 = await prisma.customer.create({
    data: { firstName: 'Tural', lastName: 'Qasımov', barcode: 'C10003', phone: '0554445566', city: 'Sumqayıt', bonus: 0 }
  })

  // --- Hədiyyə Kartları ---
  await prisma.giftCard.createMany({
    data: [
      { barcode: 'GC-SALASH-50', value: 50.0, customerId: cust1.id },
      { barcode: 'GC-SALASH-100', value: 100.0, customerId: cust2.id },
      { barcode: 'GC-FREE-20', value: 20.0 }
    ]
  })

  // --- Atributlar ---
  await prisma.attribute.createMany({
    data: [
      { name: 'Ölçü', values: JSON.stringify(['S', 'M', 'L', 'XL', 'XXL']) },
      { name: 'Rəng', values: JSON.stringify(['Qara', 'Ağ', 'Bej', 'Antrasit', 'Haki']) },
      { name: 'Material', values: JSON.stringify(['100% Pambıq', 'Kətan', 'Polyester']) }
    ]
  })

  // --- Təchizatçılar ---
  await prisma.supplier.createMany({
    data: [
      { brandName: 'Urban Wear', companyName: JSON.stringify(['Urban Textile LLC']), city: 'Bakı', phone: '0125556677' },
      { brandName: 'Salash Studio', companyName: JSON.stringify(['Salash Pro Azerbaijan']), city: 'Sumqayıt', phone: '0184443322' }
    ]
  })

  // --- Məhsullar ---

  // 1. Oversized T-shirt (Variantlar ilə)
  const tshirt = await prisma.product.create({
    data: {
      productName: 'Oversized "Salash" Basic T-shirt',
      brandName: JSON.stringify(['Urban Wear']),
      category: JSON.stringify(['Geyim', 'T-shirt']),
      description: 'Yüksək keyfiyyətli, 100% pambıq, salash kəsim basic t-shirt.',
      images: JSON.stringify(['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=300']),
      createdBy: 'Admin'
    }
  })

  await prisma.product.createMany({
    data: [
      {
        productName: 'Oversized "Salash" T-shirt - S / Qara',
        barcode: 'TS-BLK-S',
        wholesalePrice: 12.0,
        retailPrice: 28.0,
        stock: 15,
        parentProductId: tshirt.id,
        attribute: JSON.stringify({ 'Ölçü': 'S', 'Rəng': 'Qara' }),
        createdBy: 'Admin'
      },
      {
        productName: 'Oversized "Salash" T-shirt - M / Qara',
        barcode: 'TS-BLK-M',
        wholesalePrice: 12.0,
        retailPrice: 28.0,
        stock: 25,
        parentProductId: tshirt.id,
        attribute: JSON.stringify({ 'Ölçü': 'M', 'Rəng': 'Qara' }),
        createdBy: 'Admin'
      },
      {
        productName: 'Oversized "Salash" T-shirt - L / Qara',
        barcode: 'TS-BLK-L',
        wholesalePrice: 12.0,
        retailPrice: 28.0,
        stock: 20,
        parentProductId: tshirt.id,
        attribute: JSON.stringify({ 'Ölçü': 'L', 'Rəng': 'Qara' }),
        createdBy: 'Admin'
      },
      {
        productName: 'Oversized "Salash" T-shirt - M / Bej',
        barcode: 'TS-BEJ-M',
        wholesalePrice: 12.0,
        retailPrice: 28.0,
        stock: 18,
        parentProductId: tshirt.id,
        attribute: JSON.stringify({ 'Ölçü': 'M', 'Rəng': 'Bej' }),
        createdBy: 'Admin'
      }
    ]
  })

  // 2. Cargo Pants (Variantlar ilə)
  const cargoPants = await prisma.product.create({
    data: {
      productName: 'Street Style Cargo Şalvar',
      brandName: JSON.stringify(['Salash Studio']),
      category: JSON.stringify(['Geyim', 'Şalvar']),
      description: 'Çox cibli, street style, rahat cargo şalvar.',
      images: JSON.stringify(['https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=300']),
      createdBy: 'Admin'
    }
  })

  await prisma.product.createMany({
    data: [
      {
        productName: 'Cargo Şalvar - M / Haki',
        barcode: 'CP-HAK-M',
        wholesalePrice: 25.0,
        retailPrice: 55.0,
        stock: 10,
        parentProductId: cargoPants.id,
        attribute: JSON.stringify({ 'Ölçü': 'M', 'Rəng': 'Haki' }),
        createdBy: 'Admin'
      },
      {
        productName: 'Cargo Şalvar - L / Haki',
        barcode: 'CP-HAK-L',
        wholesalePrice: 25.0,
        retailPrice: 55.0,
        stock: 12,
        parentProductId: cargoPants.id,
        attribute: JSON.stringify({ 'Ölçü': 'L', 'Rəng': 'Haki' }),
        createdBy: 'Admin'
      },
      {
        productName: 'Cargo Şalvar - M / Antrasit',
        barcode: 'CP-ANT-M',
        wholesalePrice: 25.0,
        retailPrice: 55.0,
        stock: 8,
        parentProductId: cargoPants.id,
        attribute: JSON.stringify({ 'Ölçü': 'M', 'Rəng': 'Antrasit' }),
        createdBy: 'Admin'
      }
    ]
  })

  // 3. Hoodie (Variantlar ilə)
  const hoodie = await prisma.product.create({
    data: {
      productName: 'Box Fit Kapüşonlu Hoodie',
      brandName: JSON.stringify(['Salash Studio']),
      category: JSON.stringify(['Geyim', 'Hoodie']),
      description: 'İçi şardonlu, isti saxlayan box fit hoodie.',
      images: JSON.stringify(['https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=300']),
      createdBy: 'Admin'
    }
  })

  await prisma.product.createMany({
    data: [
      {
        productName: 'Box Fit Hoodie - L / Antrasit',
        barcode: 'HD-ANT-L',
        wholesalePrice: 18.0,
        retailPrice: 45.0,
        stock: 30,
        parentProductId: hoodie.id,
        attribute: JSON.stringify({ 'Ölçü': 'L', 'Rəng': 'Antrasit' }),
        createdBy: 'Admin'
      },
      {
        productName: 'Box Fit Hoodie - XL / Antrasit',
        barcode: 'HD-ANT-XL',
        wholesalePrice: 18.0,
        retailPrice: 45.0,
        stock: 15,
        parentProductId: hoodie.id,
        attribute: JSON.stringify({ 'Ölçü': 'XL', 'Rəng': 'Antrasit' }),
        createdBy: 'Admin'
      }
    ]
  })

  // 4. Sadə məhsullar (Aksesuarlar)
  await prisma.product.create({
    data: {
      productName: 'Gümüşü Rəngli Zəncir',
      brandName: JSON.stringify(['Aksesuar Dünyası']),
      category: JSON.stringify(['Aksesuar']),
      barcode: 'ACC-CH-01',
      wholesalePrice: 5.0,
      retailPrice: 15.0,
      stock: 50,
      description: 'Polad, qaralmayan gümüşü rəngli boyunbağı.',
      images: JSON.stringify(['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=300']),
      createdBy: 'Admin'
    }
  })

  await prisma.product.create({
    data: {
      productName: 'Qara "Beanie" Papaq',
      brandName: JSON.stringify(['Urban Wear']),
      category: JSON.stringify(['Aksesuar', 'Papaq']),
      barcode: 'ACC-BN-BLK',
      wholesalePrice: 3.5,
      retailPrice: 12.0,
      stock: 100,
      description: 'Toxunma, qış üçün rahat beanie papaq.',
      createdBy: 'Admin'
    }
  })

  // --- Xərclər ---
  await prisma.expense.createMany({
    data: [
      { employeeName: 'Admin', amount: 50.0, category: 'Təmizlik', paymentMethod: 'Nəğd', notes: 'Dükanın təmizliyi üçün ləvazimatlar' },
      { employeeName: 'Admin', amount: 350.0, category: 'İcarə', paymentMethod: 'Kart', notes: 'Mart ayı dükan arendası' },
      { employeeName: 'Günel Məmmədova', amount: 15.0, category: 'Ofis', paymentMethod: 'Nəğd', notes: 'Kassa kağızı və dəftərxana' }
    ]
  })

  console.log('✅ "Salash" demo məlumatları uğurla əlavə edildi!')
  console.log('🎉 Seed prosesi başa çatdı!')
  console.log('')
  console.log('--- GİRİŞ MƏLUMATLARI (AZ) ---')
  console.log('Admin: admin / admin123')
  console.log('Kasiyer: gunel.m / kassa123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
  .catch(async (e) => {
    console.error('❌ Xəta baş verdi:', e)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })
