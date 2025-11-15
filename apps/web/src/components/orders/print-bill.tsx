"use client"

import React, { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Printer } from 'lucide-react'
import type { Order } from '@/services/orders.service'
import { getTimezoneOffset } from '@/lib/timezone'
import { useLanguage } from '@/contexts/language-context'
import QRCode from 'qrcode'

// SW-76: Receipt data from WEB-SRM
interface ReceiptData {
  websrm_transaction_id?: string;  // WEB-SRM assigned transaction ID
  transaction_timestamp?: string;  // Time WEB-SRM processed the transaction
  qr_data?: string;                // QR code URL
  format?: 'CUSTOMER' | 'MERCHANT' | 'INTERNAL';
  print_mode?: 'PAPER' | 'ELECTRONIC';
}

// SW-76: Branch tax registration data
interface BranchData {
  name: string;
  address?: string;
  phone?: string;
  gst_number?: string;  // Format: XXXXXXXXXRTXXXX
  qst_number?: string;  // Format: XXXXXXXXXXTYXXXX
  device_id?: string;   // Unique device identifier
}

interface PrintBillProps {
  order: Order
  branchName?: string
  branchData?: BranchData     // SW-76: Branch info for compliance
  receiptData?: ReceiptData   // SW-76: WEB-SRM transaction data
  isMerchantCopy?: boolean    // SW-76: Flag for merchant copy marking
}

export const PrintBill: React.FC<PrintBillProps> = ({
  order,
  branchName,
  branchData,
  receiptData,
  isMerchantCopy = false
}) => {
  const printRef = useRef<HTMLDivElement>(null)
  const { language } = useLanguage()
  const [isOpen, setIsOpen] = React.useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState<string>('')

  // Get timezone offset for FO-129 compliance
  const branchTimezone = order.branch_timezone || 'America/Toronto'
  const timezoneOffset = getTimezoneOffset(branchTimezone)

  // Check if timezone differs from WEB-SRM default (UTC-5:00 / America/Toronto)
  const showTimezoneNotation = branchTimezone !== 'America/Toronto'

  // SW-76: Calculate subtotal if not present (fallback)
  const calculatedSubtotal = React.useMemo(() => {
    if (order.pricing.subtotal && order.pricing.subtotal > 0) {
      return order.pricing.subtotal
    }
    // Fallback: Calculate from items
    return order.items?.reduce((sum, item) => {
      return sum + ((item.price || 0) * item.quantity)
    }, 0) || 0
  }, [order.items, order.pricing.subtotal])

  // SW-76: Generate QR code from receipt data
  React.useEffect(() => {
    if (receiptData?.qr_data) {
      QRCode.toDataURL(receiptData.qr_data, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 200
      })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error('Error generating QR code:', err))
    }
  }, [receiptData?.qr_data])

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML
      const printWindow = window.open('', '_blank')

      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Bill - ${order.orderNumber}</title>
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                body {
                  font-family: 'Courier New', monospace;
                  font-size: 12px;
                  line-height: 1.4;
                  max-width: 300px;
                  margin: 20px auto;
                  padding: 10px;
                }
                .bill-header {
                  text-align: center;
                  margin-bottom: 15px;
                  border-bottom: 2px dashed #000;
                  padding-bottom: 10px;
                }
                .bill-header h1 {
                  font-size: 18px;
                  font-weight: bold;
                  margin-bottom: 5px;
                }
                .bill-header p {
                  font-size: 11px;
                  margin: 2px 0;
                }
                .bill-info {
                  margin-bottom: 15px;
                  border-bottom: 1px dashed #000;
                  padding-bottom: 10px;
                }
                .bill-info-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 3px 0;
                  font-size: 11px;
                }
                .bill-info-row strong {
                  font-weight: bold;
                }
                .timezone-notation {
                  background: #f3f4f6;
                  border: 1px solid #d1d5db;
                  padding: 5px;
                  margin: 8px 0;
                  text-align: center;
                  font-size: 10px;
                  border-radius: 3px;
                }
                .bill-items {
                  margin-bottom: 15px;
                  border-bottom: 2px dashed #000;
                  padding-bottom: 10px;
                }
                .bill-item {
                  margin: 8px 0;
                }
                .bill-item-header {
                  display: flex;
                  justify-content: space-between;
                  font-weight: bold;
                  margin-bottom: 3px;
                }
                .bill-item-details {
                  font-size: 10px;
                  color: #666;
                  margin-left: 10px;
                }
                .bill-totals {
                  margin-bottom: 15px;
                  border-bottom: 2px dashed #000;
                  padding-bottom: 10px;
                }
                .bill-total-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 5px 0;
                }
                .bill-total-row.grand-total {
                  font-size: 14px;
                  font-weight: bold;
                  margin-top: 8px;
                  padding-top: 8px;
                  border-top: 1px solid #000;
                }
                .bill-footer {
                  text-align: center;
                  font-size: 10px;
                  margin-top: 15px;
                }
                /* SW-76: Merchant copy warning */
                .merchant-copy-warning {
                  background: #fee;
                  border: 2px solid #f00;
                  padding: 10px;
                  text-align: center;
                  font-weight: bold;
                  font-size: 12px;
                  margin: 15px 0;
                }
                /* SW-76: Equal signs divider */
                .equal-divider {
                  border-top: 1px solid #000;
                  margin: 10px 0;
                  padding-top: 10px;
                }
                /* SW-76: QR code section */
                .qr-section {
                  text-align: center;
                  margin: 15px 0;
                  padding: 10px 0;
                }
                .qr-section img {
                  width: 150px;
                  height: 150px;
                  margin: 10px auto;
                }
                .qr-link {
                  font-size: 10px;
                  margin-top: 5px;
                  font-style: italic;
                }
                /* SW-76: WEB-SRM transaction info */
                .websrm-info {
                  font-size: 10px;
                  text-align: center;
                  margin: 10px 0;
                  padding: 5px 0;
                  border-top: 1px solid #000;
                }
                /* SW-76: Tax registration */
                .tax-registration {
                  font-size: 10px;
                  margin: 5px 0;
                }
                /* SW-76: Payment status note */
                .payment-note {
                  text-align: center;
                  font-weight: bold;
                  font-size: 14px;
                  margin: 15px 0;
                  padding: 10px;
                  border: 1px solid #000;
                }
                @media print {
                  body {
                    margin: 0;
                    padding: 10px;
                  }
                }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.focus()

        // Small delay to ensure content is loaded before printing
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 250)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Printer className="h-4 w-4 mr-2" />
          {language === 'fr' ? 'Imprimer la facture' : 'Print Bill'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === 'fr' ? 'Aperçu de la facture' : 'Bill Preview'}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[600px] overflow-y-auto border rounded-lg p-4 bg-white">
          <div ref={printRef} className="font-mono text-sm">
            {/* SW-76: Merchant Copy Warning (Section 4.4.2) */}
            {isMerchantCopy && (
              <div className="merchant-copy-warning">
                *** COPIE DU COMMERÇANT ***
                <br />
                NE PAS REMETTRE AU CLIENT
              </div>
            )}

            {/* Bill Header - SW-76 Section 4.4.1 Prescribed Information #1 */}
            <div className="bill-header">
              <h1>{branchData?.name || branchName || 'Vision Menu'}</h1>
              <p>{language === 'fr' ? 'Facture de commande' : 'Order Bill'}</p>
              {/* SW-76: Contact information (address + phone) */}
              {branchData?.address && <p>{branchData.address}</p>}
              {branchData?.phone && <p>{branchData.phone}</p>}
            </div>

            {/* Bill Info */}
            <div className="bill-info">
              {/* SW-76: Transaction date/time when user sent info (#2) */}
              <div className="bill-info-row">
                <span>
                  {new Date(order.created_at).toLocaleDateString('en-CA', {
                    timeZone: branchTimezone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  })}{' '}
                  {new Date(order.created_at).toLocaleTimeString('en-CA', {
                    timeZone: branchTimezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                  })}
                </span>
              </div>
              {/* SW-76: Transaction number (#3) */}
              <div className="bill-info-row">
                <strong>TRANSACTION #{order.orderNumber}</strong>
              </div>
              <div className="bill-info-row">
                <span>{language === 'fr' ? 'Client' : 'Customer'}:</span>
                <span>{order.customer?.name || 'N/A'}</span>
              </div>
              <div className="bill-info-row">
                <span>{language === 'fr' ? 'Type' : 'Type'}:</span>
                <span>
                  {order.order_type === 'delivery'
                    ? language === 'fr' ? 'Livraison' : 'Delivery'
                    : order.order_type === 'takeaway'
                    ? language === 'fr' ? 'À emporter' : 'Takeaway'
                    : language === 'fr' ? 'Sur place' : 'Dine-in'}
                </span>
              </div>

              {/* FO-129: Timezone Notation */}
              {showTimezoneNotation && (
                <div className="timezone-notation">
                  <strong>{language === 'fr' ? 'Fuseau horaire' : 'Timezone'}:</strong> {timezoneOffset}
                  <br />
                  <span style={{ fontSize: '9px', color: '#666' }}>
                    {language === 'fr'
                      ? 'Les heures affichées sont dans ce fuseau horaire'
                      : 'Times shown are in this timezone'}
                  </span>
                </div>
              )}
            </div>

            {/* Bill Items */}
            <div className="bill-items">
              {order.items?.map((item, index) => (
                <div key={item.id || index} className="bill-item">
                  <div className="bill-item-header">
                    {/* SW-76: Item description (#4) with tax indicators (#5) */}
                    <span>{item.quantity} {item.name}</span>
                    <span>${((item.price || 0) * item.quantity).toFixed(2)} FP</span>
                  </div>
                  {item.variants && item.variants.length > 0 && (
                    <div className="bill-item-details">
                      {item.variants.map((variant, i) => (
                        <div key={i}>
                          + {variant.name} {variant.price > 0 && `($${variant.price.toFixed(2)})`}
                        </div>
                      ))}
                    </div>
                  )}
                  {item.special_instructions && (
                    <div className="bill-item-details">
                      {language === 'fr' ? 'Notes' : 'Notes'}: {item.special_instructions}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bill Totals - SW-76 Compliant */}
            <div className="bill-totals">
              {/* SW-76: Subtotal (#6) */}
              <div className="bill-total-row">
                <span>SOUS-TOTAL</span>
                <span>${calculatedSubtotal.toFixed(2)}</span>
              </div>

              {/* SW-76: Equal divider (#11) */}
              <div className="equal-divider"></div>

              {/* SW-76: GST Registration + Amount (#7, #12) */}
              <div className="tax-registration">
                TPS {branchData?.gst_number || '000000000RT0001'}
              </div>
              <div className="bill-total-row">
                <span>TPS :</span>
                <span>${(order.pricing.gst || 0).toFixed(2)}</span>
              </div>

              {/* SW-76: QST Registration + Amount (#8, #13) */}
              <div className="tax-registration">
                TVQ {branchData?.qst_number || '0000000000TQ0001'}
              </div>
              <div className="bill-total-row">
                <span>TVQ :</span>
                <span>${(order.pricing.qst || 0).toFixed(2)}</span>
              </div>

              {/* SW-76: Total (#14) */}
              <div className="bill-total-row grand-total">
                <span>TOTAL :</span>
                <span>${(order.pricing.total || 0).toFixed(2)}</span>
              </div>

              {/* SW-76: Payment method (#9) - only for closing receipts */}
              {order.payment_method && (
                <div className="bill-total-row" style={{ marginTop: '10px', fontSize: '11px' }}>
                  <span>
                    {order.payment_method === 'cash' ? 'ARGENT COMPTANT' :
                     order.payment_method === 'card' ? 'CARTE' :
                     order.payment_method === 'counter' ? 'PAIEMENT AU COMPTOIR' :
                     'PAIEMENT EN LIGNE'}
                  </span>
                </div>
              )}

              {/* SW-76: Payment status note (#15) */}
              <div className="payment-note">
                PAIEMENT REÇU
              </div>
            </div>

            {/* SW-76: QR Code Section (#16) */}
            {qrCodeDataUrl && receiptData?.qr_data && (
              <div className="qr-section">
                <img src={qrCodeDataUrl} alt="Transaction QR Code" />
                {receiptData.print_mode === 'ELECTRONIC' && (
                  <div className="qr-link">
                    <a href={receiptData.qr_data} target="_blank" rel="noopener noreferrer">
                      Consulter la transaction en ligne
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* SW-76: Equal divider before WEB-SRM data */}
            <div className="equal-divider"></div>

            {/* SW-76: WEB-SRM Transaction Data (#17, #18, #19) */}
            {receiptData && (
              <div className="websrm-info">
                {/* #17: WEB-SRM processed time */}
                {receiptData.transaction_timestamp && (
                  <div>
                    {new Date(receiptData.transaction_timestamp).toLocaleDateString('en-CA', {
                      timeZone: branchTimezone,
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    })}{' '}
                    {new Date(receiptData.transaction_timestamp).toLocaleTimeString('en-CA', {
                      timeZone: branchTimezone,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    })}
                  </div>
                )}
                {/* #18: WEB-SRM transaction number */}
                {receiptData.websrm_transaction_id && (
                  <div>{receiptData.websrm_transaction_id}</div>
                )}
                {/* #19: Device unique identifier */}
                {branchData?.device_id && (
                  <div>{branchData.device_id}</div>
                )}
              </div>
            )}

            {/* SW-76: Final equal divider (#20) */}
            <div className="equal-divider"></div>

            {/* Thank you message (optional - can be added per SW-76 note) */}
            <div className="bill-footer">
              <p>{language === 'fr' ? 'Merci de votre commande!' : 'Thank you for your order!'}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            {language === 'fr' ? 'Imprimer' : 'Print'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
