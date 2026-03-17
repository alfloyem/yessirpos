import { defineEventHandler, readBody, createError } from 'h3'
import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const id = Number(event.context.params.id)
  const { amount, paymentMethod, paidBy, notes } = await readBody(event)

  if (!id || !amount || amount <= 0) {
    throw createError({ statusCode: 400, message: 'Yanlış məlumat' })
  }

  const intake = await (prisma as any).intake.findUnique({ where: { id } })
  if (!intake) throw createError({ statusCode: 404, message: 'Qəbul tapılmadı' })

  // Generate receipt no: DP0000001
  const lastPayment = await (prisma as any).intakePayment.findFirst({ orderBy: { id: 'desc' } })
  let nextNum = 1
  if (lastPayment?.receiptNo) {
    const match = lastPayment.receiptNo.match(/DP(\d+)/)
    if (match) nextNum = parseInt(match[1]) + 1
  }
  const receiptNo = `DP${nextNum.toString().padStart(7, '0')}`

  const newPaid = Number(intake.paidAmount) + Number(amount)
  const newBalance = Math.max(0, Number(intake.totalAmount) - newPaid)

  const [payment, updated] = await (prisma as any).$transaction([
    (prisma as any).intakePayment.create({
      data: {
        receiptNo,
        intakeId: id,
        amount: Number(amount),
        paymentMethod: paymentMethod || 'Nəğd',
        paidBy: paidBy || null,
        notes: notes || null,
      }
    }),
    (prisma as any).intake.update({
      where: { id },
      data: { paidAmount: newPaid, balanceDue: newBalance }
    })
  ])

  return {
    payment,
    paidAmount: updated.paidAmount,
    balanceDue: updated.balanceDue,
    intake: {
      receiptNo: intake.receiptNo,
      supplierName: intake.supplierName,
    }
  }
})
