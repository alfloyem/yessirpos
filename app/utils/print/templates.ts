import type { ClientData } from '~/utils/clientData'
import type { ReceiptData, IntakeReceiptData, DebtPaymentReceiptData } from '../receiptPrinter'
import type { BarcodeData } from '../receiptPrinter'

export const buildReceiptHtml = (data: ReceiptData, clientData: ClientData, barcodeDataUrl: string, showFooterMessage: boolean = true, showReturnPolicy: boolean = true) => {
  const itemsHtml = data.items.map(item => {
    let attrStr = ''
    if (item.attribute) {
      if (Array.isArray(item.attribute)) {
        attrStr = item.attribute.map((a: string) => a.split(':').pop()?.trim()).filter(Boolean).join(', ')
      } else if (typeof item.attribute === 'string' && item.attribute.trim()) {
        attrStr = item.attribute.split(':').pop()?.trim() || ''
      }
    }
    const hasDiscount = item.discount > 0
    const originalLineTotal = item.price * item.qty
    const finalLineTotal = item.total

    return `
      <div style="margin-bottom: 8px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>${item.productName}</span>
          ${hasDiscount ? `
            <div style="text-align: right;">
              <span style="text-decoration: line-through; font-size: 11px; opacity: 0.5; margin-right: 5px;">${originalLineTotal.toFixed(2)}</span>
              <span>${finalLineTotal.toFixed(2)}</span>
            </div>
          ` : `<span>${finalLineTotal.toFixed(2)}</span>`}
        </div>
        <div style="font-size: 11px; opacity: 0.7; margin-top: 2px;">
          ${item.qty} x ${item.price.toFixed(2)}${attrStr ? ' | ' + attrStr : ''}
        </div>
        ${hasDiscount ? `
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #333; font-weight: 500; margin-top: 1px;">
            <span>└ Endirim (${item.discountType === 'percent' ? item.discountValue + '%' : item.discountValue.toFixed(2) + ' ₼'}):</span>
            <span>-${(originalLineTotal - finalLineTotal).toFixed(2)} ₼</span>
          </div>
        ` : ''}
      </div>`
  }).join('')

  const customerInfoHtml = data.customer ? `
    <div style="font-size: 11px; margin-bottom: 8px; border-top: 1px dashed #000; padding-top: 4px;">
      MÜŞTƏRİ: ${data.customer.name}
    </div>` : ''

  const grossTotal = data.items.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const totalItemDiscounts = data.items.reduce((sum, item) => sum + ((item.price - item.finalPrice) * item.qty), 0)
  const finalDiscount = data.discountTotal || 0

  const summaryHtml = `
    <div style="font-size: 12px; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px;">
      <div style="display: flex; justify-content: space-between;">
        <span>CƏMİ:</span>
        <span>${grossTotal.toFixed(2)} ₼</span>
      </div>

      ${totalItemDiscounts > 0.005 ? `
        <div style="display: flex; justify-content: space-between; color: #333;">
          <span>MƏHSUL ENDİRİMİ:</span>
          <span>-${totalItemDiscounts.toFixed(2)} ₼</span>
        </div>
      ` : ''}

      ${(data.discountVal || 0) > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-top: 2px;">
          <span>ƏLAVƏ ENDİRİM ${data.discountType === 'percent' ? `(${data.discountVal}%)` : `(${(data.discountVal || 0).toFixed(2)} ₼)`}:</span>
          <span>-${finalDiscount.toFixed(2)} ₼</span>
        </div>
      ` : ''}
      
      ${(totalItemDiscounts > 0.005 && finalDiscount > 0.005) ? `
        <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px dotted #ccc; margin-top: 2px; padding-top: 2px;">
          <span>CƏM ENDİRİM:</span>
          <span>-${(totalItemDiscounts + finalDiscount).toFixed(2)} ₼</span>
        </div>
      ` : ''}
    </div>`

  const translateMethod = (m: string) => {
    const map: Record<string, string> = { 
      'Cash': 'Nəğd', 
      'Card': 'Kart', 
      'Bonus': 'Bonus', 
      'Gift Card': 'Hədiyyə Kartı',
      'Debt': 'Borc'
    }
    return map[m] || m
  }

  // Payment logic
  let paymentsHtml = ''
  if (data.paymentDetails.isMulti && data.paymentDetails.payments) {
    paymentsHtml = Object.entries(data.paymentDetails.payments)
      .filter(([_, amt]) => (amt as number) > 0.01)
      .map(([method, amt]) => `
        <div style="display: flex; justify-content: space-between;">
          <span>${translateMethod(method).toUpperCase()}:</span>
          <span>${(amt as number).toFixed(2)} ₼</span>
        </div>
      `).join('')
  } else {
    const method = data.paymentDetails.method || 'Cash'
    const totalPaid = data.paymentDetails.received !== undefined ? Number(data.paymentDetails.received) : data.finalTotal
    const diff = totalPaid - data.finalTotal

    paymentsHtml = `
      <div style="display: flex; justify-content: space-between;">
        <span>ÖDƏNİŞ ÜSULU (${translateMethod(method).toUpperCase()}):</span>
        <span>${totalPaid.toFixed(2)} ₼</span>
      </div>
    `
    
    if (diff < -0.01) {
      paymentsHtml += `
        <div style="display: flex; justify-content: space-between; color: #c00; font-weight: bold; margin-top: 2px; border-top: 1px dashed #c00; padding-top: 2px;">
          <span>QALIQ BORC:</span>
          <span>${Math.abs(diff).toFixed(2)} ₼</span>
        </div>
      `
    }
  }

  const receivedHtml = (data.paymentDetails.received !== undefined && Number(data.paymentDetails.received) >= 0) ? `
    <div style="display: flex; justify-content: space-between; margin-top: 2px; border-top: 1px dotted #ccc; padding-top: 2px;">
    </div>` : ''

  const changeHtml = (data.paymentDetails.change && data.paymentDetails.change > 0.01) ? `
    <div style="display: flex; justify-content: space-between; font-weight: bold;">
      <span>QAYTARILAN:</span>
      <span>${data.paymentDetails.change.toFixed(2)} ₼</span>
    </div>` : ''

  const loyaltyHtml = (data.customer && !data.isArchive) ? `
    <div style="margin-top: 10px; padding: 5px; border: 1px dashed #000; font-size: 11px;">
      <div style="display: flex; justify-content: space-between;">
        <span>QAZANILAN BONUS:</span>
        <span>+${(data.customer.earned || 0).toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>YENİ BALANS:</span>
        <span>${(data.customer.newBalance || 0).toFixed(2)}</span>
      </div>
    </div>` : ''

  return `
    <html>
      <head>
        <title>Receipt</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          * { box-sizing: border-box; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 80mm; margin: 0; color: #000; padding: 5mm;
            line-height: 1.2;
          }
          .center { text-align: center; }
          .logo { margin-bottom: 10px; }
          .logo svg { max-width: 40mm; height: auto; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .title { font-size: 14px; font-weight: bold; margin: 10px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 0; }
          .info { font-size: 11px; margin-bottom: 10px; }
          .yekun { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="center">
          ${clientData.logoSvg ? `<div class="logo">${clientData.logoSvg}</div>` : ''}
          ${clientData.name && clientData.name !== '***' ? `<div style="font-weight: bold; font-size: 13px;">TS adı: ${clientData.name}</div>` : ''}
          ${clientData.address && clientData.address !== '***' ? `<div style="font-size: 11px;">TS ünvanı: ${clientData.address}</div>` : ''}
          ${clientData.phone ? `<div style="font-size: 11px;">Əlaqə nömrəsi: ${clientData.phone}</div>` : ''}
          <div class="title">SATIŞ ÇEKİ</div>
          <div class="info">
            TARİX: ${data.currentDate} <br/>
            ${data.cashierName && data.cashierName !== '***' ? `KASSİR: ${data.cashierName.toUpperCase()}` : ''}
          </div>
        </div>
        
        <div class="divider"></div>
        ${customerInfoHtml}
        <div class="items">${itemsHtml}</div>
        
        ${summaryHtml}
        <div class="yekun">
          <span>YEKUN:</span>
          <span>${data.finalTotal.toFixed(2)} ₼</span>
        </div>

        <div class="divider"></div>
        <div style="font-size: 11px;">
          ${paymentsHtml}
          ${receivedHtml}
          ${changeHtml}
        </div>

        ${loyaltyHtml}

        <div class="center" style="margin-top: 15px;">
          ${showReturnPolicy ? '<div style="font-size: 10px; font-weight: bold;">MƏHSUL 14 GÜN ƏRZİNDƏ QAYTARILA BİLƏR</div>' : ''}
          ${data.isArchive ? '<div style="font-size: 10px; margin-top: 2px;">*** ARXİV SURƏTİ ***</div>' : ''}
          <div style="margin-top: 10px;">
            ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" style="max-width: 75%; height: auto;" />` : ''}
            <div style="font-size: 10px; margin-top: 3px; font-family: 'Courier New', monospace;">${data.receiptNo}</div>
          </div>
          ${showFooterMessage ? '<div style="margin-top: 10px; font-size: 11px; font-weight: bold;">TƏŞƏKKÜR EDİRİK!</div>' : ''}
        </div>
      </body>
    </html>
  `
}

export const buildIntakeReceiptHtml = (data: IntakeReceiptData, clientData: ClientData, barcodeDataUrl: string) => {
  const itemsHtml = data.items.map(item => {
    let attrStr = ''
    if (item.attribute) {
      if (Array.isArray(item.attribute)) attrStr = item.attribute.join(', ')
      else if (typeof item.attribute === 'string' && item.attribute.startsWith('[')) {
        try {
          const parsed = JSON.parse(item.attribute)
          attrStr = Array.isArray(parsed) ? parsed.join(', ') : item.attribute
        } catch { attrStr = item.attribute }
      } else attrStr = item.attribute
    }

    return `
      <div style="margin-bottom: 5px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="font-weight: bold;">${item.productName}</span>
          <span>${item.total.toFixed(2)}</span>
        </div>
        <div style="font-size: 10px; opacity: 0.8;">
          ${item.qty} x ${item.costPrice.toFixed(2)}${attrStr ? ' | ' + attrStr : ''}
        </div>
      </div>`
  }).join('')

  return `
    <html>
      <head>
        <title>Mal Qəbulu</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          * { box-sizing: border-box; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 80mm; margin: 0; color: #000; padding: 5mm;
            line-height: 1.2;
          }
          .center { text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .title { font-size: 14px; font-weight: bold; margin: 10px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 0; }
          .info { font-size: 11px; margin-bottom: 10px; }
          .yekun { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="title">MAL QƏBULU ÇEKİ</div>
          <div class="info">
            NO: ${data.receiptNo} <br/>
            TARİX: ${data.date} <br/>
            TƏDARÜKÇÜ: ${data.supplierName.toUpperCase()}
          </div>
        </div>
        
        <div class="divider"></div>
        <div class="items">${itemsHtml}</div>
        
        <div style="font-size: 12px; margin-top: 5px;">
          <div style="display: flex; justify-content: space-between;">
            <span>CƏMİ MƏBLƏĞ:</span>
            <span>${data.totalAmount.toFixed(2)} ₼</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>ÖDƏNİLƏN:</span>
            <span>${data.paidAmount.toFixed(2)} ₼</span>
          </div>
          ${data.balanceDue > 1 ? `
            <div style="display: flex; justify-content: space-between; font-weight: bold; color: #000;">
              <span>QALIQ BORC:</span>
              <span>${data.balanceDue.toFixed(2)} ₼</span>
            </div>
          ` : ''}
        </div>

        <div class="yekun">
          <span>YEKUN:</span>
          <span>${data.totalAmount.toFixed(2)} ₼</span>
        </div>

        <div class="divider"></div>
        <div style="font-size: 11px;">
          <span>ÖDƏNİŞ ÜSULU:</span>
          <span style="font-weight: bold;">${data.paymentMethod?.toUpperCase() || 'NƏĞD'}</span>
        </div>

        ${data.notes ? `
          <div style="margin-top: 10px; font-size: 10px; font-style: italic; border: 1px solid #eee; padding: 4px;">
            Qeyd: ${data.notes}
          </div>
        ` : ''}

        <div class="center" style="margin-top: 15px;">
          <div style="margin-top: 5px;">
            ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" style="max-width: 60%; height: auto;" />` : ''}
          </div>
          <div style="margin-top: 10px; font-size: 10px; opacity: 0.6;">Daxili qaimə sənədi</div>
        </div>
      </body>
    </html>
  `
}

export const buildBarcodeHtml = (data: BarcodeData, clientData: ClientData, barcodeDataUrl: string) => {
  let attrStr = ''
  if (data.attribute) {
    if (Array.isArray(data.attribute)) attrStr = data.attribute.join(', ')
    else {
      try {
        const parsed = JSON.parse(data.attribute)
        attrStr = Array.isArray(parsed) ? parsed.join(', ') : data.attribute
      } catch { attrStr = data.attribute }
    }
  }

  const showBarcodeString = data.showBarcodeString === true
  const hasStoreName = clientData.name && clientData.name.trim() !== ''
  const hasProductName = data.productName && data.productName.trim() !== ''
  const hasAttribute = attrStr && attrStr.trim() !== ''
  const hasPrice = data.price !== undefined && data.price !== null

  return `
    <html>
      <head>
        <style>
          @page { margin: 0; size: 50mm 30mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            margin: 0; 
            padding: 1.5mm; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: space-evenly; 
            width: 50mm; 
            height: 30mm; 
            font-family: Arial, sans-serif; 
            text-align: center;
            overflow: hidden;
          }
          .store-name { 
            font-size: 6.5px; 
            text-transform: uppercase; 
            font-weight: 700;
            line-height: 1.1;
            letter-spacing: 0.3px;
          }
          .product-name { 
            font-size: 9px; 
            font-weight: 700; 
            width: 100%; 
            white-space: nowrap; 
            overflow: hidden; 
            text-overflow: ellipsis;
            line-height: 1.1;
          }
          .attribute { 
            font-size: 7px; 
            opacity: 0.75;
            line-height: 1.1;
          }
          .barcode-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            width: 100%;
          }
          .barcode-img { 
            width: 100%; 
            height: auto; 
            max-width: 46mm; 
            max-height: 13mm;
            object-fit: contain;
          }
          .barcode-text { 
            font-size: 8px; 
            font-family: 'Courier New', monospace; 
            font-weight: 700;
            line-height: 1.1;
            margin-top: 0.5mm;
          }
          .price { 
            font-size: 13px; 
            font-weight: 700;
            line-height: 1.1;
          }
        </style>
      </head>
      <body>
        ${hasStoreName ? `<div class="store-name">${clientData.name}</div>` : ''}
        ${hasProductName ? `<div class="product-name">${data.productName}</div>` : ''}
        ${hasAttribute ? `<div class="attribute">${attrStr}</div>` : ''}
        <div class="barcode-container">
          ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" class="barcode-img" />` : ''}
          ${showBarcodeString && data.barcode ? `<div class="barcode-text">${data.barcode}</div>` : ''}
        </div>
        ${hasPrice ? `<div class="price">${Number(data.price).toFixed(2)} ₼</div>` : ''}
      </body>
    </html>
  `
}

export const buildDebtPaymentHtml = (data: DebtPaymentReceiptData, clientData: ClientData, barcodeDataUrl: string) => {
  const label = data.isCustomer ? 'MÜŞTƏRİ' : 'TƏDARÜKÇÜ'
  return `
    <html>
      <head>
        <title>Borc Ödənişi</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          * { box-sizing: border-box; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 80mm; margin: 0; color: #000; padding: 5mm;
            line-height: 1.2;
          }
          .center { text-align: center; }
          .logo { margin-bottom: 10px; }
          .logo svg { max-width: 40mm; height: auto; }
          .title { font-size: 14px; font-weight: bold; margin: 10px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 0; }
          .info { font-size: 11px; margin-bottom: 10px; }
          .yekun { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="center">
          ${clientData.logoSvg ? `<div class="logo">${clientData.logoSvg}</div>` : ''}
          ${clientData.name && clientData.name !== '***' ? `<div style="font-weight: bold; font-size: 13px;">${clientData.name}</div>` : ''}
          ${clientData.address && clientData.address !== '***' ? `<div style="font-size: 11px;">${clientData.address}</div>` : ''}
          <div class="title">BORC ÖDƏNİŞ ÇEKİ</div>
          <div class="info">
            ÇEK NO: ${data.receiptNo} <br/>
            TARİX: ${data.date} <br/>
            ${label}: ${data.counterpartyName.toUpperCase()} <br/>
            ${data.paidBy ? `KASSİR: ${data.paidBy.toUpperCase()}` : ''}
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="yekun">
          <span>ÖDƏNİLDİ:</span>
          <span>${data.amount.toFixed(2)} ₼</span>
        </div>

        <div style="font-size: 12px; margin-top: 5px;">
          <div style="display: flex; justify-content: space-between;">
            <span>ÖDƏNİŞ ÜSULU:</span>
            <span>${data.paymentMethod.toUpperCase()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 5px; border-top: 1px dashed #000; padding-top: 5px;">
            <span>QALIQ BORC:</span>
            <span>${data.remainingBalance.toFixed(2)} ₼</span>
          </div>
        </div>

        ${data.notes ? `
          <div style="margin-top: 10px; font-size: 10px; font-style: italic; border: 1px solid #eee; padding: 4px;">
            Qeyd: ${data.notes}
          </div>
        ` : ''}

        <div class="center" style="margin-top: 15px;">
          ${barcodeDataUrl ? `
            <div style="margin-top: 10px;">
              <img src="${barcodeDataUrl}" style="max-width: 70%; height: auto;" />
              <div style="font-size: 10px; margin-top: 3px; font-family: 'Courier New', monospace;">${data.receiptNo}</div>
            </div>
          ` : ''}
          <div style="margin-top: 10px; font-size: 11px; font-weight: bold;">TƏŞƏKKÜR EDİRİK!</div>
        </div>
      </body>
    </html>
  `
}
