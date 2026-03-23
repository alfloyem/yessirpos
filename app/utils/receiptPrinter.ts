import { getClientData } from '~/utils/clientData'
import { generateBarcodeDataUrl, executePrintWindow } from './print/helpers'
import { 
  buildReceiptHtml, 
  buildIntakeReceiptHtml, 
  buildBarcodeHtml, 
  buildDebtPaymentHtml 
} from './print/templates'

// Interfaces 
export interface ReceiptItem {
  productName: string
  barcode?: string
  qty: number
  price: number 
  finalPrice: number 
  discount: number 
  discountType: 'amount' | 'percent'
  discountValue: number 
  total: number
  attribute?: string | string[]
}

export interface ReceiptData {
  receiptNo: string
  cashierName: string
  currentDate: string
  items: ReceiptItem[]
  subtotal: number
  finalTotal: number
  discountTotal: number
  discountVal?: number
  discountType?: 'amount' | 'percent'
  customer?: {
    name: string
    barcode?: string
    newBalance?: number
    earned?: number
    spent?: number
  }
  paymentDetails: {
    isMulti: boolean
    method?: string
    payments?: Record<string, number>
    received?: number
    change?: number
    giftCard?: {
      barcode: string
      remaining: number
    }
  }
  shiftReceiptCount?: number
  isArchive?: boolean
}

export interface IntakeReceiptData {
  receiptNo: string
  supplierName: string
  createdBy: string
  date: string
  items: any[]
  totalAmount: number
  paidAmount: number
  balanceDue: number
  paymentMethod: string
  notes?: string
}

export interface BarcodeData {
  barcode: string
  productName?: string
  attribute?: string | string[]
  price?: number
}

export interface DebtPaymentReceiptData {
  receiptNo: string
  relatedIntakeNo: string
  supplierName: string
  amount: number
  paymentMethod: string
  paidBy?: string
  notes?: string
  date: string
  remainingBalance: number
}

// Optimized Print Functions
export const printReceipt = (data: ReceiptData) => {
  const barcodeUrl = generateBarcodeDataUrl(data.receiptNo)
  const html = buildReceiptHtml(data, getClientData(), barcodeUrl)
  executePrintWindow(html, { width: 302, height: 800, dynamicHeight: true })
}

export const printIntakeReceipt = (data: IntakeReceiptData) => {
  const barcodeUrl = generateBarcodeDataUrl(data.receiptNo, { height: 40 })
  const html = buildIntakeReceiptHtml(data, getClientData(), barcodeUrl)
  executePrintWindow(html, { width: 400, height: 600 })
}

export const printBarcode = (data: BarcodeData) => {
  const barcodeUrl = generateBarcodeDataUrl(data.barcode, { height: 40, displayValue: false, margin: 2 })
  if (!barcodeUrl) return
  const html = buildBarcodeHtml(data, getClientData(), barcodeUrl)
  executePrintWindow(html, { width: 300, height: 200 })
}

export const printDebtPaymentReceipt = (data: DebtPaymentReceiptData) => {
  const barcodeUrl = generateBarcodeDataUrl(data.receiptNo, { height: 40 })
  const html = buildDebtPaymentHtml(data, getClientData(), barcodeUrl)
  executePrintWindow(html, { width: 302, height: 600, dynamicHeight: true })
}
