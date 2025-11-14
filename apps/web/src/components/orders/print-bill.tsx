"use client"

import React, { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Printer } from 'lucide-react'
import type { Order } from '@/services/orders.service'
import { getTimezoneOffset } from '@/lib/timezone'
import { useLanguage } from '@/contexts/language-context'

interface PrintBillProps {
  order: Order
  branchName?: string
}

export const PrintBill: React.FC<PrintBillProps> = ({ order, branchName }) => {
  const printRef = useRef<HTMLDivElement>(null)
  const { language } = useLanguage()
  const [isOpen, setIsOpen] = React.useState(false)

  // Get timezone offset for FO-129 compliance
  const branchTimezone = order.branch_timezone || 'America/Toronto'
  const timezoneOffset = getTimezoneOffset(branchTimezone)

  // Check if timezone differs from WEB-SRM default (UTC-5:00 / America/Toronto)
  const showTimezoneNotation = branchTimezone !== 'America/Toronto'

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
            {/* Bill Header */}
            <div className="bill-header">
              <h1>{branchName || 'Vision Menu'}</h1>
              <p>{language === 'fr' ? 'Facture de commande' : 'Order Bill'}</p>
            </div>

            {/* Bill Info */}
            <div className="bill-info">
              <div className="bill-info-row">
                <span>{language === 'fr' ? 'N° de commande' : 'Order Number'}:</span>
                <strong>{order.orderNumber}</strong>
              </div>
              <div className="bill-info-row">
                <span>{language === 'fr' ? 'Date' : 'Date'}:</span>
                <span>
                  {new Date(order.created_at).toLocaleDateString('en-CA', {
                    timeZone: branchTimezone,
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="bill-info-row">
                <span>{language === 'fr' ? 'Heure' : 'Time'}:</span>
                <span>
                  {new Date(order.created_at).toLocaleTimeString('en-CA', {
                    timeZone: branchTimezone,
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
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
                    <span>{item.quantity}x {item.name}</span>
                    <span>${((item.price || 0) * item.quantity).toFixed(2)}</span>
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

            {/* Bill Totals */}
            <div className="bill-totals">
              <div className="bill-total-row">
                <span>{language === 'fr' ? 'Sous-total' : 'Subtotal'}:</span>
                <span>${(order.pricing.subtotal || 0).toFixed(2)}</span>
              </div>

              {order.pricing.discountAmount && order.pricing.discountAmount > 0 && (
                <div className="bill-total-row">
                  <span>{language === 'fr' ? 'Rabais' : 'Discount'}:</span>
                  <span>-${order.pricing.discountAmount.toFixed(2)}</span>
                </div>
              )}

              {order.pricing.delivery_fee && order.pricing.delivery_fee > 0 && (
                <div className="bill-total-row">
                  <span>{language === 'fr' ? 'Frais de livraison' : 'Delivery Fee'}:</span>
                  <span>${order.pricing.delivery_fee.toFixed(2)}</span>
                </div>
              )}

              {order.pricing.tipAmount && order.pricing.tipAmount > 0 && (
                <div className="bill-total-row">
                  <span>{language === 'fr' ? 'Pourboire' : 'Tip'}:</span>
                  <span>${order.pricing.tipAmount.toFixed(2)}</span>
                </div>
              )}

              {order.pricing.gst && order.pricing.gst > 0 && (
                <div className="bill-total-row">
                  <span>{language === 'fr' ? 'TPS' : 'GST'} (5%):</span>
                  <span>${order.pricing.gst.toFixed(2)}</span>
                </div>
              )}

              {order.pricing.qst && order.pricing.qst > 0 && (
                <div className="bill-total-row">
                  <span>{language === 'fr' ? 'TVQ' : 'QST'} (9.975%):</span>
                  <span>${order.pricing.qst.toFixed(2)}</span>
                </div>
              )}

              <div className="bill-total-row grand-total">
                <span>{language === 'fr' ? 'TOTAL' : 'TOTAL'}:</span>
                <span>${(order.pricing.total || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Bill Footer */}
            <div className="bill-footer">
              <p>{language === 'fr' ? 'Merci de votre commande!' : 'Thank you for your order!'}</p>
              <p style={{ marginTop: '5px', fontSize: '9px', color: '#999' }}>
                {language === 'fr'
                  ? 'Propulsé par Vision Menu'
                  : 'Powered by Vision Menu'}
              </p>
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
