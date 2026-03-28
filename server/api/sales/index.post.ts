import { defineEventHandler, readBody, createError } from 'h3'
import prisma from '../../utils/prisma'
import { createNotification } from '../../utils/notifications'

export default defineEventHandler(async (event: any) => {
  const body = await readBody(event)
  const { 
    subtotal, 
    discountTotal, 
    finalTotal, 
    cashbackEarned, 
    paymentDetails, 
    cashierId, 
    cashierName, 
    customerId, 
    customerName, 
    customerBarcode,
    items 
  } = body

  try {
    // Ensure prisma instance is ready with models
    if (!(prisma as any).sale) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Verilənlər bazası bağlantısı hazır deyil (Sale model tapılmadı). Zəhmət olmasa bir neçə saniyə sonra yenidən yoxlayın.'
      })
    }

    // 1. Get next receipt number
    const lastSale = await (prisma as any).sale.findFirst({
      orderBy: { id: 'desc' }
    })
    
    let nextNum = 1
    if (lastSale && lastSale.receiptNo) {
      const lastNum = parseInt(lastSale.receiptNo)
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1
      }
    }
    const receiptNo = nextNum.toString().padStart(13, '0')

    // 2. Execute everything in a transaction
    const result = await (prisma as any).$transaction(async (tx: any) => {
      // a. Create Sale record
      const sale = await tx.sale.create({
        data: {
          receiptNo,
          subtotal: Number(subtotal) || 0,
          discountTotal: Number(discountTotal) || 0,
          finalTotal: Number(finalTotal) || 0,
          cashbackEarned: Number(cashbackEarned) || 0,
          paymentDetails: typeof paymentDetails === 'object' ? JSON.stringify(paymentDetails) : (paymentDetails || null),
          
          // ID validation: Only use numeric IDs
          cashierId: (cashierId && !isNaN(Number(cashierId))) ? Number(cashierId) : null,
          cashierName: cashierName || null,
          
          customerId: (customerId && !isNaN(Number(customerId))) ? Number(customerId) : null,
          customerName: customerName || null,
          customerBarcode: customerBarcode || null,
          
          items: {
            create: items.map((item: any) => {
              const pId = Number(item.productId)
              return {
                productId: (!isNaN(pId) && item.productId) ? pId : null,
                productName: item.productName,
                barcode: item.barcode,
                qty: Number(item.qty) || 0,
                price: Number(item.retailPrice) || 0,
                wholesalePrice: Number(item.wholesalePrice) || 0,
                discount: Number(item.itemDiscount) || 0,
                total: (Number(item.qty) || 0) * (Number(item.finalPrice) || 0),
                attribute: item.attribute ? (typeof item.attribute === 'object' ? JSON.stringify(item.attribute) : String(item.attribute)) : null
              }
            })
          }
        },
        include: {
          items: true
        }
      })

      // b. Update stock for each product/variant (if it's a real product, not ghost)
      for (const item of items) {
        const pId = Number(item.productId)
        if (!isNaN(pId) && item.productId) {
          const updatedProduct = await tx.product.update({
            where: { id: pId },
            data: {
              stock: {
                decrement: Number(item.qty) || 0
              }
            }
          })

          // Check for low stock notification
          if (updatedProduct.reorderLevel !== null && updatedProduct.stock <= updatedProduct.reorderLevel) {
            await (prisma as any).notification.create({ // Use raw prisma here as we are in transaction or prefer to wait until after tx
              data: {
                type: 'LOW_STOCK',
                title: 'Stok Xəbərdarlığı',
                message: `${updatedProduct.productName} məhsulunun stoku bitmək üzrədir (${updatedProduct.stock} ədəd qalıb).`,
                data: JSON.stringify({ productId: updatedProduct.id, barcode: updatedProduct.barcode }),
              }
            })
          }
        }
      }

      return sale
    })

    // Sale completed notification
    await createNotification({
      type: 'SALE_COMPLETED',
      title: 'Yeni Satış',
      message: `${result.receiptNo} nömrəli çek ilə ${result.finalTotal.toFixed(2)} ₼ satış edildi.`,
      data: { saleId: result.id, receiptNo: result.receiptNo, amount: result.finalTotal }
    })

    return result
  } catch (error: any) {
    console.error('Sale Save Error:', error)
    
    let msg = error.message || 'Bilinməyən xəta'
    // Azerbaijani translations for common errors
    if (msg.includes('Null constraint violation')) {
      msg = 'Məcburi xanalardan biri boş buraxılıb'
    } else if (msg.includes('Unique constraint failed')) {
      msg = 'Bu qeyd (məs. Çek No) artıq mövcuddur'
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Satış qeyd edilərkən xəta baş verdi: ' + msg
    })
  }
})
