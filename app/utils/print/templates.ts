import type { ClientData } from '~/utils/clientData'
import type { ReceiptData, IntakeReceiptData, DebtPaymentReceiptData } from '../receiptPrinter'
import type { BarcodeData } from '../receiptPrinter'

export const buildReceiptHtml = (data: ReceiptData, clientData: ClientData, barcodeDataUrl: string) => {
  const itemsHtml = data.items.map(item => {
    let attrStr = ''
    if (item.attribute) {
      if (Array.isArray(item.attribute)) attrStr = item.attribute.map((a: string) => a.split(':').pop()?.trim()).join(', ')
      else attrStr = item.attribute.split(':').pop()?.trim() || item.attribute
    }
    const hasDiscount = item.discount > 0

    return `
      <div style="margin-bottom: 5px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="font-weight: bold;">${item.productName}</span>
          <span>${(item.price * item.qty).toFixed(2)}</span>
        </div>
        <div style="font-size: 10px; opacity: 0.8;">
          ${item.qty} x ${item.price.toFixed(2)}${attrStr ? ' | ' + attrStr : ''}
        </div>
        ${hasDiscount ? `
          <div style="display: flex; justify-content: space-between; font-size: 10px; font-style: italic;">
            <span>Endirim (${item.discountType === 'percent' ? item.discountValue + '%' : item.discountValue.toFixed(2) + ' ₼'}):</span>
            <span>-${(item.discount * item.qty).toFixed(2)}</span>
          </div>
        ` : ''}
      </div>`
  }).join('')

  const customerInfoHtml = data.customer ? `
    <div style="font-size: 11px; margin-bottom: 8px; border-top: 1px dashed #000; padding-top: 4px;">
      MÜŞTƏRİ: ${data.customer.name}
    </div>` : ''

  const summaryHtml = `
    <div style="font-size: 12px; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px;">
      <div style="display: flex; justify-content: space-between;">
        <span>ARA CƏMİ:</span>
        <span>${data.subtotal.toFixed(2)} ₼</span>
      </div>
      ${(data.discountVal || 0) > 0 ? `
        <div style="display: flex; justify-content: space-between;">
          <span>ÜMUMİ ENDİRİM:</span>
          <span>-${data.discountTotal.toFixed(2)} ₼</span>
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
          <div class="title">SATIŞ ÇEKİ</div>
          <div class="info">
            TARİX: ${data.currentDate} <br/>
            KASSİR: ${data.cashierName.toUpperCase()}
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
          <div style="font-size: 10px; font-weight: bold;">MƏHSUL 14 GÜN ƏRZİNDƏ QAYTARILA BİLƏR</div>
          ${data.isArchive ? '<div style="font-size: 10px; margin-top: 2px;">*** ARXİV SURƏTİ ***</div>' : ''}
          <div style="margin-top: 10px;">
            ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" style="max-width: 75%; height: auto;" />` : ''}
          </div>
          <div style="margin-top: 10px; font-size: 11px; font-weight: bold;">TƏŞƏKKÜR EDİRİK!</div>
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

  const showBarcodeString = data.showBarcodeString !== false

  return `
    <html>
      <head>
        <style>
          @page { margin: 0; size: 50mm 30mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            margin: 0; 
            padding: 2mm; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            width: 50mm; 
            height: 30mm; 
            font-family: Arial, sans-serif; 
            text-align: center;
            overflow: hidden;
          }
          .store-name { 
            font-size: 7px; 
            text-transform: uppercase; 
            margin-bottom: 1mm;
            font-weight: 600;
          }
          .product-name { 
            font-size: 8px; 
            font-weight: bold; 
            width: 100%; 
            white-space: nowrap; 
            overflow: hidden; 
            text-overflow: ellipsis;
            margin-bottom: 0.5mm;
          }
          .attribute { 
            font-size: 6px; 
            opacity: 0.8;
            margin-bottom: 1mm;
          }
          .barcode-img { 
            width: 100%; 
            height: auto; 
            max-width: 46mm; 
            max-height: 12mm;
            margin: 1mm 0;
          }
          .barcode-text { 
            font-size: 7px; 
            font-family: 'Courier New', monospace; 
            font-weight: bold;
            margin-top: 0.5mm;
          }
          .price { 
            font-size: 12px; 
            font-weight: bold; 
            margin-top: 1mm;
          }
        </style>
      </head>
      <body>
        ${clientData.name ? `<div class="store-name">${clientData.name}</div>` : ''}
        ${data.productName ? `<div class="product-name">${data.productName}</div>` : ''}
        ${attrStr ? `<div class="attribute">${attrStr}</div>` : ''}
        ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" class="barcode-img" />` : ''}
        ${showBarcodeString && data.barcode ? `<div class="barcode-text">${data.barcode}</div>` : ''}
        ${data.price ? `<div class="price">${Number(data.price).toFixed(2)} ₼</div>` : ''}
      </body>
    </html>
  `
}

export const buildDebtPaymentHtml = (data: DebtPaymentReceiptData, clientData: ClientData, barcodeDataUrl: string) => {
  return `
    <html>
      <head>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0; padding: 5mm; color: #000; }
          .center { text-align: center; }
          .title { font-size: 14px; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; margin: 10px 0; padding: 3px 0; }
          .yekun { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 5px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="title">BORC ÖDƏNİŞİ</div>
          <div style="font-size: 11px; margin-bottom: 10px;">
            TARİX: ${data.date} <br/>
            TƏDARÜKÇÜ: ${data.supplierName}
          </div>
        </div>
        <div class="yekun">
          <span>ÖDƏNİLDİ:</span>
          <span>${data.amount.toFixed(2)} ₼</span>
        </div>
        ${data.remainingBalance > 0 ? `<div style="text-align: right; font-size: 11px; margin-top: 5px;">Qalıq Borc: ${data.remainingBalance.toFixed(2)} ₼</div>` : ''}
      </body>
    </html>
  `
}
