import JsBarcode from 'jsbarcode'
import { getClientData } from '~/utils/clientData'

export interface ReceiptItem {
  productName: string
  barcode?: string
  qty: number
  price: number // Original retail price
  finalPrice: number // Price after discount
  discount: number // Discount amount per line
  discountType: 'amount' | 'percent'
  discountValue: number // The value entered (e.g. 10 for 10% or 10 AZN)
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

export const printReceipt = (data: ReceiptData) => {
  const clientData = getClientData()
  const {
    receiptNo,
    cashierName,
    currentDate,
    items,
    subtotal,
    finalTotal,
    discountTotal,
    discountVal = 0,
    discountType = 'amount',
    customer,
    paymentDetails,
    shiftReceiptCount,
    isArchive = false
  } = data

  // Generate Barcode as Base64
  let barcodeDataUrl = ''
  try {
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, receiptNo, {
      format: 'CODE128',
      width: 2,
      height: 50,
      displayValue: true,
      fontSize: 14,
      margin: 10
    })
    barcodeDataUrl = canvas.toDataURL('image/png')
  } catch (err) {
    console.error('Barcode generation error:', err)
  }

  const itemsHtml = items.map(item => {
    const cleanName = item.productName.replace(/\s+\d+$/, '')
    let attrStr = ''
    if (item.attribute) {
      if (Array.isArray(item.attribute)) {
        attrStr = item.attribute.map((a: string) => a.split(':').pop()?.trim()).join(', ')
      } else {
        attrStr = item.attribute.split(':').pop()?.trim() || item.attribute
      }
    }

    const hasDiscount = item.discount > 0

    return `
      <div style="margin-bottom: 8px; border-bottom: 1px dotted #eee; padding-bottom: 4px;">
        <div style="font-weight: bold; font-size: 13px;">${cleanName}</div>
        <div style="font-size: 10px; color: #555;">
          ${item.barcode || ''} ${attrStr ? ` | ${attrStr}` : ''}
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 2px; font-family: monospace; font-size: 12px;">
          <span>${item.qty.toFixed(2)} x ${item.price.toFixed(2)}</span>
          <span>${(item.price * item.qty).toFixed(2)}</span>
        </div>
        ${hasDiscount ? `
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #000; font-style: italic;">
            <span>Endirim (${item.discountType === 'percent' ? item.discountValue + '%' : item.discountValue.toFixed(2) + ' ₼'}):</span>
            <span>-${(item.discount * item.qty).toFixed(2)} ₼</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-top: 2px;">
            <span>${item.qty.toFixed(2)} x ${item.finalPrice.toFixed(2)}</span>
            <span>${item.total.toFixed(2)} ₼</span>
          </div>
        ` : ''}
      </div>
    `
  }).join('')

  const customerInfoHtml = customer ? `
    <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 0; margin-bottom: 10px; font-size: 11px;">
      <div style="font-weight: bold;">MÜŞTƏRİ: ${customer.name}</div>
    </div>
  ` : ''

  const summaryHtml = `
    <div style="font-size: 12px; margin-top: 5px; border-top: 2px solid #000; padding-top: 5px;">
      <div style="display: flex; justify-content: space-between;">
        <span>Ara Cəmi:</span>
        <span>${subtotal.toFixed(2)} ₼</span>
      </div>
      ${discountVal > 0 ? `
        <div style="display: flex; justify-content: space-between; color: #000;">
          <span>Ümumi Endirim (${discountType === 'percent' ? discountVal + '%' : discountVal + ' ₼'}):</span>
          <span>-${discountTotal.toFixed(2)} ₼</span>
        </div>
      ` : ''}
    </div>
  `

  let paymentMethodsHtml = ''
  if (paymentDetails.isMulti && paymentDetails.payments) {
    paymentMethodsHtml = Object.entries(paymentDetails.payments)
      .filter(([_, amt]) => (amt as number) > 0)
      .map(([name, amt]) => {
        let extra = ''
        if (name === 'Bonus' && customer) extra = `<div style="font-size: 9px; opacity: 0.7;">Bonus Kart: ${customer.barcode || '---'}</div>`
        if (name === 'Hədiyyə Kartı' && paymentDetails.giftCard) {
          extra = `<div style="font-size: 9px; opacity: 0.7;">Kart: ${paymentDetails.giftCard.barcode} | Qalıq Balans: ${paymentDetails.giftCard.remaining.toFixed(2)} ₼</div>`
        }
        return `
          <div style="margin-bottom: 4px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span style="text-transform: capitalize; font-weight: bold;">${name}:</span>
              <span>${(amt as number).toFixed(2)} ₼</span>
            </div>
            ${extra}
          </div>
        `
      }).join('')
  } else {
    paymentMethodsHtml = `
      <div style="display: flex; justify-content: space-between; font-size: 11px;">
        <span>Ödəniş Üsulu:</span>
        <span style="font-weight: bold;">${paymentDetails.method}</span>
      </div>
      ${(paymentDetails.method === 'Bonus' && customer) ? `<div style="font-size: 9px; opacity: 0.7;">Bonus Kart: ${customer.barcode || '---'}</div>` : ''}
      ${(paymentDetails.method === 'Hədiyyə Kartı' && paymentDetails.giftCard) ? `
        <div style="font-size: 9px; opacity: 0.7;">
          Kart: ${paymentDetails.giftCard.barcode} | Qalıq Balans: ${paymentDetails.giftCard.remaining.toFixed(2)} ₼
        </div>
      ` : ''}
      ${paymentDetails.received ? `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px;">
          <span>Alınan:</span>
          <span>${Number(paymentDetails.received).toFixed(2)} ₼</span>
        </div>
      ` : ''}
    `
  }

  let changeHtml = ''
  if (paymentDetails.change && paymentDetails.change > 0.01) {
    changeHtml = `
      <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-top: 5px; border-top: 1px dotted #000; padding-top: 3px;">
        <span>${paymentDetails.isMulti ? 'Qalıq' : 'Qaytarılan Məbləğ'}:</span>
        <span>${paymentDetails.change.toFixed(2)} ₼</span>
      </div>
    `
  }

  let loyaltyHtml = ''
  if (customer && !isArchive) {
    loyaltyHtml = `
      <div style="margin-top: 10px; padding: 5px; background: #f9f9f9; border: 1px solid #ddd; font-size: 10px;">
        <div style="display: flex; justify-content: space-between;">
          <span>Kazanılan Keşbek:</span>
          <span style="font-weight: bold;">+${(customer.earned || 0).toFixed(2)} ₼</span>
        </div>
        ${customer.spent && customer.spent > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span>İstifadə edilən Bonus:</span>
            <span style="font-weight: bold;">-${customer.spent.toFixed(2)} ₼</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; border-top: 1px dashed #ccc; margin-top: 3px; padding-top: 3px;">
          <span>Yeni Bonus Balansı:</span>
          <span style="font-weight: bold;">${(customer.newBalance || 0).toFixed(2)} ₼</span>
        </div>
      </div>
    `
  }

  const printContent = `
    <html>
      <head>
        <title>Satış Çeki</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          @media print { html, body { margin: 0 !important; padding: 0 !important; } }
          body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; color: #000; padding: 10px; }
          .center { text-align: center; }
          .logo-svg { margin-bottom: 15px; }
          .header-info { font-size: 11px; margin-bottom: 2px; }
          .title { font-size: 16px; font-weight: bold; text-decoration: underline; margin: 15px 0 10px 0; }
          .info-block { font-size: 12px; text-align: left; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .total-section { margin-top: 10px; border-top: 1px solid #000; padding-top: 5px; }
          .yekun { display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; margin-bottom: 10px; }
          .footer-note { font-style: italic; font-size: 11px; margin-top: 15px; }
          .shift-info { font-size: 10px; margin-top: 20px; opacity: 0.7; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="logo-svg">
            ${clientData.logoSvg}
          </div>
          <div class="header-info">TS adı: ${clientData.name}</div>
          <div class="header-info">TS ünvanı: ${clientData.address}</div>
          
          <div class="title">SATIŞ ÇEKİ</div>
          
          <div class="info-block">
            <div>Çek no: ${receiptNo}</div>
            <div>Kassir: ${cashierName}</div>
            <div>Tarix: ${currentDate}</div>
          </div>
        </div>

        <div class="items">
          ${customerInfoHtml}
          ${itemsHtml}
        </div>

        ${summaryHtml}

        <div class="total-section">
          <div class="yekun">
            <span>YEKUN:</span>
            <span>${finalTotal.toFixed(2)} ₼</span>
          </div>
          
          <div style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px;">
            <div style="font-size: 10px; font-weight: bold; margin-bottom: 4px; text-decoration: underline;">ÖDƏNİŞ DETALLARI:</div>
            ${paymentMethodsHtml}
            ${changeHtml}
          </div>
        </div>

        ${loyaltyHtml}

        <div class="center">
          <div class="footer-note">* Məhsulun qaytarılması 14 gün * ${isArchive ? '(ARXİV SURƏTİ)' : ''}</div>
          
          ${shiftReceiptCount !== undefined ? `<div class="shift-info">Növbə ərzində vurulmuş çek sayı: ${shiftReceiptCount}</div>` : ''}
          
          <div style="margin-top: 10px;">
            ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" style="max-width: 100%;" />` : ''}
          </div>

          <div style="margin-top: 15px; font-size: 10px;">TEŞEKKÜR EDİRİK!</div>
        </div>
      </body>
    </html>
  `

  const printWin = window.open('', '', 'width=400,height=600')
  if (printWin) {
    printWin.document.write(printContent)
    printWin.document.close()
    printWin.focus()
    setTimeout(() => {
      printWin.print()
      printWin.close()
    }, 350)
  }
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

export const printIntakeReceipt = (data: IntakeReceiptData) => {
  const clientData = getClientData()
  const {
    receiptNo,
    supplierName,
    createdBy,
    date,
    items,
    totalAmount,
    paidAmount,
    balanceDue,
    paymentMethod,
    notes
  } = data

  let barcodeDataUrl = ''
  try {
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, receiptNo, {
      format: 'CODE128',
      width: 2,
      height: 40,
      displayValue: true,
      fontSize: 12,
      margin: 5
    })
    barcodeDataUrl = canvas.toDataURL('image/png')
  } catch (err) {
    console.error('Barcode generation error:', err)
  }

  const itemsHtml = items.map(item => {
    let attrStr = ''
    if (item.attribute) {
      if (Array.isArray(item.attribute)) {
        attrStr = item.attribute.join(', ')
      } else if (typeof item.attribute === 'string' && item.attribute.startsWith('[')) {
        try {
          const parsed = JSON.parse(item.attribute)
          attrStr = Array.isArray(parsed) ? parsed.join(', ') : item.attribute
        } catch {
          attrStr = item.attribute
        }
      } else {
        attrStr = item.attribute
      }
    }

    const hasDiscount = item.discount > 0
    const baseTotal = item.costPrice * item.qty
    
    let discPerUnit = 0
    if (item.discountType === 'percent') {
      discPerUnit = (item.costPrice * item.discount) / 100
    } else {
      discPerUnit = item.discount
    }
    const finalPrice = item.costPrice - discPerUnit

    return `
      <div style="margin-bottom: 8px; border-bottom: 1px dotted #ccc; padding-bottom: 6px;">
        <div style="font-weight: bold; font-size: 13px;">${item.productName.replace(/\s+\d+$/, '')}</div>
        <div style="font-size: 10px; color: #666; margin-bottom: 2px;">
          ${item.barcode || ''} ${attrStr ? ` | ${attrStr}` : ''}
        </div>
        
        <div style="display: flex; justify-content: space-between; font-family: monospace; font-size: 12px;">
          <span>Topdan: ${item.qty} x ${item.costPrice.toFixed(2)}</span>
          <span>${baseTotal.toFixed(2)} ₼</span>
        </div>

        ${hasDiscount ? `
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #000; font-style: italic; margin-top: 2px;">
            <span>Endirim (${item.discountType === 'percent' ? item.discount + '%' : item.discount.toFixed(2) + ' ₼'}):</span>
            <span>-${(discPerUnit * item.qty).toFixed(2)} ₼</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-top: 2px; border-top: 1px dashed #eee; pt: 2px;">
            <span>Yekun (${item.qty} x ${finalPrice.toFixed(2)}):</span>
            <span>${item.total.toFixed(2)} ₼</span>
          </div>
        ` : ''}
      </div>
    `
  }).join('')

  const printContent = `
    <html>
      <head>
        <title>Mal Qəbulu Çeki</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; color: #000; padding: 10px; }
          .center { text-align: center; }
          .title { font-size: 18px; font-weight: bold; margin: 10px 0; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 5px 0; }
          .info { font-size: 12px; margin-bottom: 15px; text-align: left; }
          .summary { border-top: 1px solid #000; padding-top: 5px; margin-top: 10px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 13px; }
          .total { font-size: 18px; font-weight: bold; margin-top: 5px; border-top: 1px dashed #000; padding-top: 5px; }
          .footer { margin-top: 20px; font-size: 10px; opacity: 0.7; }
        </style>
      </head>
      <body>
        <div class="center">
          <div style="margin-bottom: 10px;">
            ${clientData.logoSvg}
          </div>
          <div style="font-size: 11px; margin-bottom: 2px;">${clientData.name}</div>
          <div style="font-size: 10px; margin-bottom: 8px; opacity: 0.7;">${clientData.address}</div>
          <div class="title">MAL QƏBULU</div>
          
          <div class="info">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px;">TƏDARÜKÇÜ: ${supplierName}</div>
            <div>Çek No: ${receiptNo}</div>
            <div>Tarix: ${date}</div>
          </div>
        </div>

        <div class="items">
          ${itemsHtml}
        </div>

        <div class="summary">
          <div class="row">
            <span>Cəmi Məbləğ:</span>
            <span>${totalAmount.toFixed(2)} ₼</span>
          </div>
          <div class="row">
            <span>Ödəniş Üsulu:</span>
            <span>${paymentMethod}</span>
          </div>
          <div class="row" style="font-weight: bold;">
            <span>Ödənilən:</span>
            <span>${paidAmount.toFixed(2)} ₼</span>
          </div>
          ${balanceDue > 0 ? `
            <div class="row" style="color: red; font-weight: bold;">
              <span>Qalıq Borc:</span>
              <span>${balanceDue.toFixed(2)} ₼</span>
            </div>
          ` : ''}
          
          <div class="total row">
            <span>YEKUN:</span>
            <span>${totalAmount.toFixed(2)} ₼</span>
          </div>
        </div>

        ${notes ? `<div style="margin-top: 10px; font-size: 11px; font-style: italic; border: 1px solid #eee; padding: 5px;">Qeyd: ${notes}</div>` : ''}

        <div class="center footer">
          ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" /> <br/>` : ''}
          ${new Date().toLocaleString()}
        </div>
      </body>
    </html>
  `

  const printWin = window.open('', '', 'width=400,height=600')
  if (printWin) {
    printWin.document.write(printContent)
    printWin.document.close()
    setTimeout(() => {
      printWin.print()
      printWin.close()
    }, 400)
  }
}
