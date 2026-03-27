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
  showBarcodeString?: boolean
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
  // Load settings from localStorage with defaults
  const defaultSettings = {
    showLogo: true,
    showStoreName: true,
    showAddress: true,
    showPhone: true,
    showCashierName: true,
    showCustomerName: true,
    showFooterMessage: true,
    showReturnPolicy: true
  }
  
  let settings = { ...defaultSettings }
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('yessir_pos_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        settings = { ...defaultSettings, ...parsed }
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  // Apply settings to client data
  const clientData = getClientData()
  const modifiedClientData = {
    ...clientData,
    logoSvg: settings.showLogo ? clientData.logoSvg : '',
    name: settings.showStoreName ? clientData.name : '',
    address: settings.showAddress ? clientData.address : '',
    phone: settings.showPhone ? clientData.phone : ''
  }

  // Apply settings to receipt data
  const modifiedData = {
    ...data,
    cashierName: settings.showCashierName ? data.cashierName : '',
    customer: settings.showCustomerName ? data.customer : undefined
  }

  const barcodeUrl = generateBarcodeDataUrl(data.receiptNo, { displayValue: false })
  const html = buildReceiptHtml(modifiedData, modifiedClientData, barcodeUrl, settings.showFooterMessage, settings.showReturnPolicy ?? true)
  executePrintWindow(html, { width: 302, height: 800, dynamicHeight: true })
}

export const printIntakeReceipt = (data: IntakeReceiptData) => {
  const barcodeUrl = generateBarcodeDataUrl(data.receiptNo, { height: 40 })
  const html = buildIntakeReceiptHtml(data, getClientData(), barcodeUrl)
  executePrintWindow(html, { width: 400, height: 600 })
}

export const printBarcode = (data: BarcodeData) => {
  // Load settings from localStorage with defaults
  const defaultSettings = {
    showProductName: true,
    showPrice: true,
    showAttribute: true,
    showBarcodeString: true,
    showStoreName: true
  }
  
  let settings = { ...defaultSettings }
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('yessir_pos_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        settings = { ...defaultSettings, ...parsed }
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  // Apply settings to barcode data
  const barcodeData = {
    barcode: data.barcode,
    productName: settings.showProductName ? data.productName : '',
    price: settings.showPrice ? data.price : undefined,
    attribute: settings.showAttribute ? data.attribute : undefined,
    showBarcodeString: settings.showBarcodeString
  }

  const clientData = getClientData()
  const modifiedClientData = {
    ...clientData,
    name: settings.showStoreName ? clientData.name : ''
  }

  const barcodeUrl = generateBarcodeDataUrl(data.barcode, { height: 40, displayValue: false, margin: 2 })
  if (!barcodeUrl) return
  const html = buildBarcodeHtml(barcodeData, modifiedClientData, barcodeUrl)
  executePrintWindow(html, { width: 300, height: 200 })
}

export const printDebtPaymentReceipt = (data: DebtPaymentReceiptData) => {
  const barcodeUrl = generateBarcodeDataUrl(data.receiptNo, { height: 40 })
  const html = buildDebtPaymentHtml(data, getClientData(), barcodeUrl)
  executePrintWindow(html, { width: 302, height: 600, dynamicHeight: true })
}
