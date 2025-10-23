// =====================================================
// ORDER EMAIL TEMPLATE - UNIVERSAL
// Flexible template for all order notification types
// =====================================================

/**
 * Generate Order Email HTML (Universal - for all order statuses)
 * @param {Object} props
 * @returns {string} HTML email content
 */
function OrderEmail(props) {
  const {
    // Email Type (different messages)
    title = "We're preparing your order.",
    message = "We've received your order and our kitchen is getting started.",
    nextStepsMessage = "You'll receive a notification when your order is ready.",

    // Customer Info
    customerName = 'Valued Customer',
    customerEmail = '',
    customerPhone = '',

    // Order Info
    orderNumber = 'ORDER-XXXXX',
    orderDate = new Date().toLocaleDateString('en-CA', { day: 'numeric', month: 'long', year: 'numeric' }),
    orderType = 'pickup', // 'dine_in', 'takeaway', 'delivery'
    tableNumber = null,
    zone = null,
    orderNotes = '',

    // Timing
    estimatedTime = '20-30 minutes',
    isPreOrder = false,
    scheduledDateTime = null,

    // Items
    items = [],

    // Pricing (Detailed like confirmation page)
    itemsTotal = 0,
    campaignDiscount = null, // { code: 'SAVE10', discountAmount: 5.00, campaignType: 'percentage', campaignValue: 10 }
    tipDetails = null, // { amount: 3.50, type: 'percentage', value: 15 }
    deliveryFee = 0,
    deliveryInfo = null, // { isFree: true, baseFee: 5.00, appliedFee: 0, threshold: 30, savings: 5 }
    gst = 0,
    qst = 0,
    totalAmount = 0,

    // Branch Info
    branchName = 'VizionMenu Restaurant',
    branchPhone = '(555) 123-4567',
    branchAddress = '',

    // Delivery Address (if delivery)
    deliveryAddress = null, // { streetAddress, unitNumber, city, province, postalCode, buzzerCode, deliveryInstructions }

    // Uber Direct Tracking
    uberTrackingUrl = null,
  } = props;

  // Calculate subtotals
  const discountAmount = campaignDiscount?.discountAmount || 0;
  const subtotalAfterDiscount = itemsTotal - discountAmount;
  const tipAmount = tipDetails?.amount || 0;
  const subtotalWithDelivery = subtotalAfterDiscount + deliveryFee;
  const subtotalWithDeliveryAndTip = subtotalWithDelivery + tipAmount;
  const totalTax = gst + qst;

  // Generate items HTML
  const itemsHtml = items.map((item, index) => `
    <tr>
      <td style="padding: 16px 0; font-size: 15px; color: #2d2d2d; ${index < items.length - 1 ? 'border-bottom: 1px solid #e8e4df;' : ''}">
        <table style="width: 100%;">
          <tr>
            <td style="width: 70%;">${item.quantity}× ${item.name}</td>
            <td style="width: 30%; text-align: right; color: #6b6b6b;">$${(item.price * item.quantity).toFixed(2)}</td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf8f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;">

  <!-- Main Container -->
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Main Card -->
    <div style="background-color: #ffffff; border: 1px solid #e8e4df; border-radius: 16px; padding: 48px 40px; margin-bottom: 20px;">

      <!-- Title -->
      <h2 style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0 0 16px 0; line-height: 1.3;">
        ${title}
      </h2>

      <!-- Message -->
      <p style="font-size: 16px; color: #6b6b6b; line-height: 1.6; margin: 0 0 24px 0;">
        Hi ${customerName}, ${message}
      </p>

      <!-- Uber Tracking Button (if available) - Above order details -->
      ${uberTrackingUrl ? `
      <div style="text-align: center; margin-bottom: 40px;">
        <a href="${uberTrackingUrl}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px;">
          Track Your Delivery →
        </a>
      </div>
      ` : ''}

      <!-- Order Details Table -->
      <div style="margin-bottom: 40px;">
        <table style="width: 100%; border-collapse: collapse;">
          <!-- Date -->
          <tr style="border-bottom: 1px solid #e8e4df;">
            <td style="padding: 16px 0; font-size: 14px; color: #6b6b6b; font-weight: 500;">Date</td>
            <td style="padding: 16px 0; font-size: 14px; color: #1a1a1a; text-align: right; font-weight: 600;">${orderDate}</td>
          </tr>

          <!-- Order Number -->
          <tr style="border-bottom: 1px solid #e8e4df;">
            <td style="padding: 16px 0; font-size: 14px; color: #6b6b6b; font-weight: 500;">Order Number</td>
            <td style="padding: 16px 0; font-size: 14px; color: #1a1a1a; text-align: right; font-weight: 600;">${orderNumber}</td>
          </tr>

          <!-- Order Type -->
          <tr style="border-bottom: 1px solid #e8e4df;">
            <td style="padding: 16px 0; font-size: 14px; color: #6b6b6b; font-weight: 500;">Order Type</td>
            <td style="padding: 16px 0; font-size: 14px; color: #1a1a1a; text-align: right; font-weight: 600;">
              ${orderType === 'dine_in' ? 'Dine In' : orderType === 'takeaway' ? 'Takeaway' : 'Delivery'}
              ${tableNumber ? ` (${zone === 'Screen' ? 'Screen' : `Table ${tableNumber}`})` : ''}
            </td>
          </tr>

          <!-- Branch Name -->
          ${branchName ? `
          <tr style="border-bottom: 1px solid #e8e4df;">
            <td style="padding: 16px 0; font-size: 14px; color: #6b6b6b; font-weight: 500;">Restaurant</td>
            <td style="padding: 16px 0; font-size: 14px; color: #1a1a1a; text-align: right; font-weight: 600;">${branchName}</td>
          </tr>
          ` : ''}

          <!-- Branch Address (important for pickup) -->
          ${branchAddress && orderType !== 'delivery' ? `
          <tr style="border-bottom: 1px solid #e8e4df;">
            <td style="padding: 16px 0; font-size: 14px; color: #6b6b6b; font-weight: 500;">Pickup Address</td>
            <td style="padding: 16px 0; font-size: 12px; color: #1a1a1a; text-align: right; font-weight: 600; line-height: 1.5;">${branchAddress}</td>
          </tr>
          ` : ''}

          <!-- Scheduled Time (for pre-orders) -->
          ${isPreOrder && scheduledDateTime ? `
          <tr style="border-bottom: 1px solid #e8e4df;">
            <td style="padding: 16px 0; font-size: 14px; color: #6b6b6b; font-weight: 500;">Scheduled For</td>
            <td style="padding: 16px 0; font-size: 14px; color: #f97316; text-align: right; font-weight: 600;">${scheduledDateTime}</td>
          </tr>
          ` : ''}

          <!-- Estimated Time (for immediate orders) -->
          ${!isPreOrder && estimatedTime ? `
          <tr>
            <td style="padding: 16px 0; font-size: 14px; color: #6b6b6b; font-weight: 500;">Ready By</td>
            <td style="padding: 16px 0; font-size: 14px; color: #f97316; text-align: right; font-weight: 600;">${estimatedTime}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Delivery Address (if delivery) -->
      ${deliveryAddress && orderType === 'delivery' ? `
      <div style="margin-bottom: 40px; padding: 20px; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e8e4df;">
        <h3 style="font-size: 14px; font-weight: 600; color: #1a1a1a; margin: 0 0 12px 0;">Delivery Address</h3>
        <p style="font-size: 14px; color: #2d2d2d; line-height: 1.6; margin: 0;">
          ${deliveryAddress.streetAddress}${deliveryAddress.unitNumber ? `, Unit ${deliveryAddress.unitNumber}` : ''}<br>
          ${deliveryAddress.city}, ${deliveryAddress.province} ${deliveryAddress.postalCode}
          ${deliveryAddress.buzzerCode ? `<br><span style="font-size: 12px; color: #6b6b6b;">Buzzer: ${deliveryAddress.buzzerCode}</span>` : ''}
          ${deliveryAddress.deliveryInstructions ? `<br><span style="font-size: 12px; color: #6b6b6b; font-style: italic;">${deliveryAddress.deliveryInstructions}</span>` : ''}
        </p>
      </div>
      ` : ''}

      <!-- Order Notes -->
      ${orderNotes ? `
      <div style="margin-bottom: 40px; padding: 20px; background-color: #fffbeb; border-radius: 12px; border: 1px solid #fde68a;">
        <h3 style="font-size: 14px; font-weight: 600; color: #92400e; margin: 0 0 8px 0;">Order Notes</h3>
        <p style="font-size: 14px; color: #78350f; margin: 0;">${orderNotes}</p>
      </div>
      ` : ''}

      <!-- Items Section -->
      ${items.length > 0 ? `
      <div style="margin-bottom: 32px; padding-top: 24px; border-top: 1px solid #e8e4df;">
        <h3 style="font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0 0 16px 0;">Your Items</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${itemsHtml}
        </table>
      </div>
      ` : ''}

      <!-- Detailed Pricing (like confirmation page) -->
      <div style="padding: 24px 0; border-top: 2px solid #e8e4df;">
        <table style="width: 100%; border-collapse: collapse;">
          <!-- Items Total -->
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #6b6b6b;">Items</td>
            <td style="padding: 8px 0; font-size: 14px; color: #2d2d2d; text-align: right; font-weight: 500;">$${itemsTotal.toFixed(2)}</td>
          </tr>

          <!-- Campaign Discount -->
          ${campaignDiscount && discountAmount > 0 ? `
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #16a34a;">
              <span style="display: inline-flex; align-items: center; gap: 6px;">
                <span style="font-size: 16px;">🏷️</span> ${campaignDiscount.code}
              </span>
            </td>
            <td style="padding: 8px 0; font-size: 14px; color: #16a34a; text-align: right; font-weight: 500;">-$${discountAmount.toFixed(2)}</td>
          </tr>
          ` : ''}

          <!-- Tip Amount (before delivery fee, after items) -->
          ${tipDetails && tipAmount > 0 ? `
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #6b6b6b;">
              Tip ${tipDetails.type === 'percentage' ? `(${tipDetails.value}%)` : '(Custom)'}
            </td>
            <td style="padding: 8px 0; font-size: 14px; color: #2d2d2d; text-align: right; font-weight: 500;">$${tipAmount.toFixed(2)}</td>
          </tr>
          ` : ''}

          <!-- Delivery Fee -->
          ${deliveryFee > 0 || (deliveryInfo && deliveryInfo.isFree) ? `
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #6b6b6b;">
              Delivery fee
              ${deliveryInfo && deliveryInfo.isFree ? `<span style="margin-left: 8px; background-color: #dcfce7; color: #16a34a; font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600;">FREE!</span>` : ''}
            </td>
            <td style="padding: 8px 0; font-size: 14px; text-align: right; font-weight: 500;">
              ${deliveryInfo && deliveryInfo.isFree && deliveryInfo.baseFee > 0 ? `<span style="color: #9ca3af; text-decoration: line-through; margin-right: 8px;">$${deliveryInfo.baseFee.toFixed(2)}</span>` : ''}
              <span style="color: ${deliveryInfo && deliveryInfo.isFree ? '#16a34a' : '#2d2d2d'};">$${deliveryFee.toFixed(2)}</span>
            </td>
          </tr>
          ` : ''}

          <!-- Subtotal -->
          <tr style="border-top: 1px solid #e8e4df;">
            <td style="padding: 12px 0 8px 0; font-size: 14px; color: #6b6b6b;">Subtotal</td>
            <td style="padding: 12px 0 8px 0; font-size: 14px; color: #2d2d2d; text-align: right; font-weight: 500;">$${subtotalWithDeliveryAndTip.toFixed(2)}</td>
          </tr>

          <!-- GST -->
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #6b6b6b;">GST</td>
            <td style="padding: 8px 0; font-size: 14px; color: #2d2d2d; text-align: right; font-weight: 500;">$${gst.toFixed(2)}</td>
          </tr>

          <!-- QST -->
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #6b6b6b;">QST</td>
            <td style="padding: 8px 0; font-size: 14px; color: #2d2d2d; text-align: right; font-weight: 500;">$${qst.toFixed(2)}</td>
          </tr>

          <!-- Total -->
          <tr style="border-top: 2px solid #2d2d2d;">
            <td style="padding: 16px 0 0 0; font-size: 16px; color: #2d2d2d; font-weight: 600;">Total</td>
            <td style="padding: 16px 0 0 0; font-size: 20px; color: #1a1a1a; text-align: right; font-weight: 700;">$${totalAmount.toFixed(2)}</td>
          </tr>
        </table>

        <!-- Savings Message -->
        ${campaignDiscount && discountAmount > 0 ? `
        <p style="font-size: 13px; color: #16a34a; text-align: right; margin: 8px 0 0 0;">
          You saved $${discountAmount.toFixed(2)}!
        </p>
        ` : ''}
      </div>

      <!-- Next Steps Message -->
      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e8e4df;">
        <p style="font-size: 15px; color: #6b6b6b; line-height: 1.6; margin: 0; text-align: center;">
          ${nextStepsMessage}
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 24px;">
      <p style="font-size: 13px; color: #9b9b9b; margin: 0 0 8px 0;">
        VizionMenu - Restaurant Management Platform
      </p>
      <p style="font-size: 12px; color: #c4c4c4; margin: 0;">
        This is an automated message. Please do not reply.
      </p>
    </div>

  </div>

</body>
</html>
  `.trim();
}

module.exports = OrderEmail;
