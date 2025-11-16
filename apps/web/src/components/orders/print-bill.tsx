"use client"

import React, { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {language === 'fr' ? 'Aperçu de la facture' : 'Bill Preview'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="rounded-lg border bg-white shadow-sm">
            <div ref={printRef} className="p-6 font-mono text-sm">
            {/* SW-76: Merchant Copy Warning (Section 4.4.2) */}
            {isMerchantCopy && (
              <div className="bg-red-50 border-2 border-red-500 rounded-md p-4 mb-6 text-center">
                <p className="font-bold text-red-900 text-sm">
                  *** COPIE DU COMMERÇANT ***
                </p>
                <p className="text-red-700 text-xs mt-1">
                  NE PAS REMETTRE AU CLIENT
                </p>
              </div>
            )}

            {/* Bill Header - SW-76 Section 4.4.1 Prescribed Information #1 */}
            <div className="text-center pb-4 mb-4 border-b-2 border-dashed border-gray-300">
              <h1 className="text-xl font-bold mb-2">{branchData?.name || branchName || 'Vision Menu'}</h1>
              <p className="text-xs text-gray-600 mb-1">{language === 'fr' ? 'Facture de commande' : 'Order Bill'}</p>
              {/* SW-76: Contact information (address + phone) */}
              {branchData?.address && <p className="text-xs text-gray-600">{branchData.address}</p>}
              {branchData?.phone && <p className="text-xs text-gray-600">{branchData.phone}</p>}
            </div>

            {/* Bill Info */}
            <div className="mb-4 pb-4 border-b border-dashed border-gray-300 space-y-2">
              {/* SW-76: Transaction date/time when user sent info (#2) */}
              <div className="text-xs text-gray-700">
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
              </div>
              {/* SW-76: Transaction number (#3) */}
              <div className="font-bold text-sm">
                TRANSACTION #{order.orderNumber}
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">{language === 'fr' ? 'Client' : 'Customer'}:</span>
                <span className="font-medium">{order.customer?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">{language === 'fr' ? 'Type' : 'Type'}:</span>
                <span className="font-medium">
                  {order.order_type === 'delivery'
                    ? language === 'fr' ? 'Livraison' : 'Delivery'
                    : order.order_type === 'takeaway'
                    ? language === 'fr' ? 'À emporter' : 'Takeaway'
                    : language === 'fr' ? 'Sur place' : 'Dine-in'}
                </span>
              </div>

              {/* FO-129: Timezone Notation */}
              {showTimezoneNotation && (
                <div className="bg-gray-50 border border-gray-200 rounded p-2 mt-3">
                  <div className="text-xs">
                    <strong className="text-gray-700">{language === 'fr' ? 'Fuseau horaire' : 'Timezone'}:</strong>
                    <span className="ml-1">{timezoneOffset}</span>
                  </div>
                  <p className="text-[9px] text-gray-500 mt-1">
                    {language === 'fr'
                      ? 'Les heures affichées sont dans ce fuseau horaire'
                      : 'Times shown are in this timezone'}
                  </p>
                </div>
              )}
            </div>

            {/* Bill Items */}
            <div className="mb-4 pb-4 border-b-2 border-dashed border-gray-300 space-y-3">
              {order.items?.map((item, index) => (
                <div key={item.id || index} className="space-y-1">
                  <div className="flex justify-between items-start text-sm">
                    {/* SW-76: Item description (#4) with tax indicators (#5) */}
                    <span className="font-medium flex-1">
                      <span className="inline-block w-6">{item.quantity}</span>
                      {item.name}
                    </span>
                    <span className="font-bold ml-2">
                      ${((item.price || 0) * item.quantity).toFixed(2)} <span className="text-xs text-gray-500">FP</span>
                    </span>
                  </div>
                  {item.variants && item.variants.length > 0 && (
                    <div className="ml-6 space-y-0.5">
                      {item.variants.map((variant, i) => (
                        <div key={i} className="text-xs text-gray-600">
                          + {variant.name} {variant.price > 0 && `($${variant.price.toFixed(2)})`}
                        </div>
                      ))}
                    </div>
                  )}
                  {item.special_instructions && (
                    <div className="ml-6 text-xs text-gray-600 italic">
                      {language === 'fr' ? 'Notes' : 'Notes'}: {item.special_instructions}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bill Totals - SW-76 Compliant */}
            <div className="mb-4 pb-4 border-b-2 border-dashed border-gray-300 space-y-2">
              {/* SW-76: Subtotal (#6) */}
              <div className="flex justify-between text-sm">
                <span className="font-medium">SOUS-TOTAL</span>
                <span className="font-medium">${calculatedSubtotal.toFixed(2)}</span>
              </div>

              {/* SW-76: Equal divider (#11) */}
              <Separator className="my-3" />

              {/* SW-76: GST Registration + Amount (#7, #12) */}
              <div className="text-xs text-gray-600">
                TPS {branchData?.gst_number || '000000000RT0001'}
              </div>
              <div className="flex justify-between text-sm">
                <span>TPS :</span>
                <span className="font-medium">${(order.pricing.gst || 0).toFixed(2)}</span>
              </div>

              {/* SW-76: QST Registration + Amount (#8, #13) */}
              <div className="text-xs text-gray-600 mt-2">
                TVQ {branchData?.qst_number || '0000000000TQ0001'}
              </div>
              <div className="flex justify-between text-sm">
                <span>TVQ :</span>
                <span className="font-medium">${(order.pricing.qst || 0).toFixed(2)}</span>
              </div>

              {/* SW-76: Total (#14) */}
              <Separator className="my-3" />
              <div className="flex justify-between text-lg font-bold pt-2">
                <span>TOTAL :</span>
                <span>${(order.pricing.total || 0).toFixed(2)}</span>
              </div>

              {/* SW-76: Payment method (#9) - only for closing receipts */}
              {order.payment_method && (
                <div className="text-center text-xs text-gray-600 mt-3">
                  {order.payment_method === 'cash' ? 'ARGENT COMPTANT' :
                   order.payment_method === 'card' ? 'CARTE' :
                   order.payment_method === 'counter' ? 'PAIEMENT AU COMPTOIR' :
                   'PAIEMENT EN LIGNE'}
                </div>
              )}

              {/* SW-76: Payment status note (#15) */}
              <div className="text-center font-bold text-base border border-gray-900 rounded p-3 mt-3">
                PAIEMENT REÇU
              </div>
            </div>

            {/* SW-76: QR Code Section (#16) */}
            {qrCodeDataUrl && receiptData?.qr_data && (
              <div className="text-center mb-4 pb-4 border-b border-dashed border-gray-300">
                <img
                  src={qrCodeDataUrl}
                  alt="Transaction QR Code"
                  className="w-40 h-40 mx-auto rounded border border-gray-200"
                />
                {receiptData.print_mode === 'ELECTRONIC' && (
                  <a
                    href={receiptData.qr_data}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline italic mt-2 block"
                  >
                    Consulter la transaction en ligne
                  </a>
                )}
              </div>
            )}

            {/* SW-76: WEB-SRM Transaction Data (#17, #18, #19) */}
            {receiptData && (
              <>
                <Separator className="my-4" />
                <div className="text-center text-xs text-gray-600 space-y-1 mb-4 pb-4 border-b border-dashed border-gray-300">
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
                    <div className="font-mono">{receiptData.websrm_transaction_id}</div>
                  )}
                  {/* #19: Device unique identifier */}
                  {branchData?.device_id && (
                    <div className="font-mono">{branchData.device_id}</div>
                  )}
                </div>
              </>
            )}

            {/* SW-76: Final divider */}
            <Separator className="my-4" />

            {/* Thank you message (optional - can be added per SW-76 note) */}
            <div className="text-center pt-2">
              <p className="text-sm font-medium">{language === 'fr' ? 'Merci de votre commande!' : 'Thank you for your order!'}</p>
              <p className="text-xs text-gray-500 mt-1">Vision Menu</p>
            </div>
            </div>
          </div>
        </ScrollArea>

        <Separator className="my-4" />

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            {language === 'fr' ? 'Imprimer' : 'Print'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
