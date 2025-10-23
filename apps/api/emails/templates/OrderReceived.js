// =====================================================
// ORDER RECEIVED EMAIL TEMPLATE - MINIMAL DESIGN
// Modern, clean email inspired by Sundays style
// =====================================================

/**
 * Generate Order Received Email HTML (Minimal Design)
 * @param {Object} props
 * @returns {string} HTML email content
 */
function OrderReceived(props) {
  const {
    customerName = 'Valued Customer',
    orderNumber = 'ORDER-XXXXX',
    totalAmount = 0,
    items = [],
    orderType = 'pickup',
    estimatedTime = '20-30 minutes',
    isPreOrder = false,
    scheduledDateTime = null,
    branchName = 'VizionMenu Restaurant',
    branchPhone = '(555) 123-4567',
  } = props;

  // Generate items HTML (minimal, compact)
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

  const mainMessage = isPreOrder
    ? `Your order is scheduled for ${scheduledDateTime}. We'll start preparing it 15 minutes before.`
    : "We've received your order and our kitchen is getting started.";

  const nextStepsMessage = orderType === 'delivery'
    ? "You'll receive a notification when your order is out for delivery."
    : "You'll receive a notification when your order is ready for pickup.";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf8f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;">

  <!-- Main Container -->
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Main Card -->
    <div style="background-color: #ffffff; border: 1px solid #e8e4df; border-radius: 16px; padding: 48px 40px; margin-bottom: 20px;">

      <!-- Title -->
      <h2 style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0 0 16px 0; line-height: 1.3;">
        We're preparing your order.
      </h2>

      <!-- Subtitle -->
      <p style="font-size: 16px; color: #6b6b6b; line-height: 1.6; margin: 0 0 40px 0;">
        Hi ${customerName}, ${mainMessage}
      </p>

      <!-- Order Details Table -->
      <div style="margin-bottom: 40px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e8e4df;">
            <td style="padding: 16px 0; font-size: 14px; color: #6b6b6b; font-weight: 500;">Order Number</td>
            <td style="padding: 16px 0; font-size: 14px; color: #1a1a1a; text-align: right; font-weight: 600;">${orderNumber}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e8e4df;">
            <td style="padding: 16px 0; font-size: 14px; color: #6b6b6b; font-weight: 500;">Order Type</td>
            <td style="padding: 16px 0; font-size: 14px; color: #1a1a1a; text-align: right; font-weight: 600;">${orderType.charAt(0).toUpperCase() + orderType.slice(1)}</td>
          </tr>
          <tr>
            <td style="padding: 16px 0; font-size: 14px; color: #6b6b6b; font-weight: 500;">${isPreOrder ? 'Scheduled For' : 'Estimated Time'}</td>
            <td style="padding: 16px 0; font-size: 14px; color: #1a1a1a; text-align: right; font-weight: 600;">${isPreOrder ? scheduledDateTime : estimatedTime}</td>
          </tr>
        </table>
      </div>

      <!-- Items Section -->
      ${items.length > 0 ? `
      <div style="margin-bottom: 32px; padding-top: 24px; border-top: 1px solid #e8e4df;">
        <table style="width: 100%; border-collapse: collapse;">
          ${itemsHtml}
        </table>
      </div>
      ` : ''}

      <!-- Total -->
      <div style="padding: 24px 0; border-top: 2px solid #2d2d2d;">
        <table style="width: 100%;">
          <tr>
            <td style="font-size: 16px; color: #2d2d2d; font-weight: 600;">Total</td>
            <td style="font-size: 20px; color: #1a1a1a; text-align: right; font-weight: 700;">$${totalAmount.toFixed(2)}</td>
          </tr>
        </table>
      </div>

    </div>

    <!-- Info Box -->
    <div style="background-color: #ffffff; border: 1px solid #e8e4df; border-radius: 16px; padding: 32px; margin-bottom: 20px;">
      <h3 style="font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0 0 12px 0;">
        What happens next?
      </h3>
      <p style="font-size: 15px; color: #6b6b6b; line-height: 1.6; margin: 0;">
        ${nextStepsMessage}
      </p>
    </div>

    <!-- Contact Info -->
    <div style="background-color: #ffffff; border: 1px solid #e8e4df; border-radius: 16px; padding: 32px; margin-bottom: 40px;">
      <h3 style="font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0 0 12px 0;">
        Questions?
      </h3>
      <p style="font-size: 15px; color: #6b6b6b; line-height: 1.6; margin: 0;">
        Contact ${branchName} at <a href="tel:${branchPhone}" style="color: #1a1a1a; text-decoration: none; font-weight: 600;">${branchPhone}</a>
      </p>
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

module.exports = OrderReceived;
