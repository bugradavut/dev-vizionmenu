// =====================================================
// NOTIFICATION SERVICE
// Handles all email notifications via Resend
// =====================================================

const { Resend } = require('resend');
const OrderEmail = require('../../emails/templates/OrderEmail');

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Map order data from database to email template props
 * @param {Object} order - Order object from database
 * @param {Object} options - Additional options
 * @returns {Object} Email template props
 */
function mapOrderToEmailProps(order, options = {}) {
  const {
    emailType = 'order_received', // 'order_received', 'order_ready', 'order_delivered'
  } = options;

  // Base props
  const baseProps = {
    // Customer Info
    customerName: order.customer_name || 'Valued Customer',
    customerEmail: order.customer_email || '',
    customerPhone: order.customer_phone || '',

    // Order Info
    orderNumber: order.order_number || order.id?.substring(0, 8)?.toUpperCase(),
    orderDate: order.created_at
      ? new Date(order.created_at).toLocaleDateString('en-CA', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : new Date().toLocaleDateString('en-CA', { day: 'numeric', month: 'long', year: 'numeric' }),
    orderType: order.order_type || 'takeaway',
    tableNumber: order.table_number || null,
    zone: order.zone || null,
    orderNotes: order.notes || '',

    // Timing
    estimatedTime: formatEstimatedReadyTime(order.estimated_ready_time, order.created_at),
    isPreOrder: order.is_pre_order || false,
    scheduledDateTime: order.scheduled_datetime
      ? formatScheduledDateTime(order.scheduled_date, order.scheduled_time)
      : null,

    // Items
    items: (order.items || []).map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),

    // Pricing
    itemsTotal: calculateItemsTotal(order.items || []),
    campaignDiscount: order.campaign_discount ? {
      code: order.campaign_discount.code,
      discountAmount: order.campaign_discount.discount_amount,
      campaignType: order.campaign_discount.campaign_type,
      campaignValue: order.campaign_discount.campaign_value,
    } : null,
    tipDetails: order.tip_details ? {
      amount: order.tip_details.amount,
      type: order.tip_details.type,
      value: order.tip_details.value,
    } : null,
    deliveryFee: order.delivery_fee || 0,
    deliveryInfo: order.delivery_info ? {
      isFree: order.delivery_info.is_free,
      baseFee: order.delivery_info.base_fee,
      appliedFee: order.delivery_info.applied_fee,
      threshold: order.delivery_info.threshold,
      savings: order.delivery_info.savings,
    } : null,
    gst: order.gst || 0,
    qst: order.qst || 0,
    totalAmount: order.total_amount || 0,

    // Branch Info
    branchName: order.branch?.name || 'VizionMenu Restaurant',
    branchPhone: order.branch?.phone || '',
    branchAddress: order.branch?.address || '',

    // Delivery Address
    deliveryAddress: order.delivery_address ? {
      streetAddress: order.delivery_address.street || order.delivery_address.streetAddress,
      unitNumber: order.delivery_address.unitNumber,
      city: order.delivery_address.city,
      province: order.delivery_address.province,
      postalCode: order.delivery_address.postalCode,
      buzzerCode: order.delivery_address.buzzerCode,
      deliveryInstructions: order.delivery_address.deliveryInstructions,
    } : null,

    // Uber Direct Tracking
    uberTrackingUrl: order.uber_tracking_url || null,
  };

  // Email type specific messages
  const emailMessages = {
    order_received: {
      title: order.is_pre_order ? "Order Scheduled!" : "We're preparing your order.",
      message: order.is_pre_order
        ? `Your order is scheduled for ${baseProps.scheduledDateTime}. We'll notify you when we start preparing your order.`
        : "We've received your order and our kitchen is getting started.",
      nextStepsMessage: order.order_type === 'delivery'
        ? "You'll receive a notification when your order is out for delivery."
        : "You'll receive a notification when your order is ready for pickup.",
    },
    order_preparing: {
      title: "We're starting to prepare your order!",
      message: `Your scheduled order is now being prepared by our kitchen. It will be ready for ${order.order_type === 'delivery' ? 'delivery' : 'pickup'} at your scheduled time.`,
      nextStepsMessage: order.order_type === 'delivery'
        ? "You'll receive a notification when your order is out for delivery."
        : "You'll receive a notification when your order is ready for pickup.",
    },
    order_ready: {
      title: "Your order is ready!",
      message: order.order_type === 'delivery'
        ? "Your order has been handed to the courier and is on its way to you."
        : "Your order is ready for pickup. Please come to our restaurant to collect it.",
      nextStepsMessage: order.order_type === 'delivery'
        ? "Track your delivery in real-time using the button above."
        : `Please bring your order number: ${baseProps.orderNumber}`,
    },
    order_delivered: {
      title: "Your order has been completed!",
      message: "Thank you for ordering with us. We hope you enjoy your meal!",
      nextStepsMessage: "We'd love to hear your feedback. Please rate your experience.",
    },
  };

  return {
    ...baseProps,
    ...emailMessages[emailType],
  };
}

/**
 * Calculate items total from items array
 */
function calculateItemsTotal(items) {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
}

/**
 * Format scheduled date and time for display
 */
function formatScheduledDateTime(date, time) {
  if (!date || !time) return null;

  try {
    // Parse ISO date string (e.g., "2025-09-29")
    const dateParts = date.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
    const day = parseInt(dateParts[2]);

    // Parse 24-hour time string (e.g., "17:30:00")
    const timeParts = time.split(':');
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);

    // Create date object
    const displayDate = new Date(year, month, day, hours, minutes);

    // Format for display
    const timeString = displayDate.toLocaleTimeString('en-CA', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const dateString = displayDate.toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric'
    });

    return `${dateString} at ${timeString}`;
  } catch (error) {
    console.error('Error formatting scheduled date/time:', error);
    return null;
  }
}

/**
 * Calculate and format estimated ready time
 */
function formatEstimatedReadyTime(estimatedTimeString, createdAt) {
  if (!estimatedTimeString && !createdAt) {
    return '20-30 minutes'; // Fallback
  }

  try {
    // Default to 30 minutes if no estimated time provided
    let minutes = 30;

    if (estimatedTimeString) {
      // Extract minutes from estimated time string (e.g., "20 minutes" -> 20)
      const minutesMatch = estimatedTimeString.match(/(\d+)\s*minutes?/i);
      if (minutesMatch) {
        minutes = parseInt(minutesMatch[1], 10);
      }
    }

    if (!createdAt) {
      return `${minutes} minutes`;
    }

    // Calculate completion time
    const orderTime = new Date(createdAt);
    const completionTime = new Date(orderTime.getTime() + minutes * 60 * 1000);

    // Format completion time
    const timeString = completionTime.toLocaleTimeString('en-CA', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Toronto'
    });

    return `${timeString} (${minutes} Minutes)`;
  } catch (error) {
    console.error('Error formatting estimated ready time:', error);
    return '20-30 minutes';
  }
}

/**
 * Send Order Received Email
 * @param {Object} order - Order object from database
 * @returns {Promise<Object>} { success: boolean, data?: object, error?: string }
 */
async function sendOrderReceivedEmail(order) {
  try {
    // Validate required fields
    if (!order.customer_email) {
      return {
        success: false,
        error: 'Customer email not provided'
      };
    }

    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        error: 'RESEND_API_KEY not configured'
      };
    }

    // Map order data to email props
    const emailProps = mapOrderToEmailProps(order, { emailType: 'order_received' });

    // Generate email HTML
    const emailHtml = OrderEmail(emailProps);

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: order.customer_email,
      subject: `Order Received - ${emailProps.orderNumber}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend API error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }

    console.log(`✅ Order received email sent: ${data.id} → ${order.customer_email}`);

    return {
      success: true,
      data: {
        messageId: data.id,
        to: order.customer_email,
      }
    };

  } catch (error) {
    console.error('Error sending order received email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send Order Ready Email
 * @param {Object} order - Order object from database
 * @returns {Promise<Object>} { success: boolean, data?: object, error?: string }
 */
async function sendOrderReadyEmail(order) {
  try {
    if (!order.customer_email) {
      return { success: false, error: 'Customer email not provided' };
    }

    const emailProps = mapOrderToEmailProps(order, { emailType: 'order_ready' });
    const emailHtml = OrderEmail(emailProps);

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: order.customer_email,
      subject: `Order Ready - ${emailProps.orderNumber}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend API error:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    console.log(`✅ Order ready email sent: ${data.id} → ${order.customer_email}`);

    return {
      success: true,
      data: { messageId: data.id, to: order.customer_email }
    };

  } catch (error) {
    console.error('Error sending order ready email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send Order Preparing Email (for pre-orders)
 * @param {Object} order - Order object from database
 * @returns {Promise<Object>} { success: boolean, data?: object, error?: string }
 */
async function sendOrderPreparingEmail(order) {
  try {
    if (!order.customer_email) {
      return { success: false, error: 'Customer email not provided' };
    }

    const emailProps = mapOrderToEmailProps(order, { emailType: 'order_preparing' });
    const emailHtml = OrderEmail(emailProps);

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: order.customer_email,
      subject: `We're Preparing Your Order - ${emailProps.orderNumber}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend API error:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    console.log(`✅ Order preparing email sent: ${data.id} → ${order.customer_email}`);

    return {
      success: true,
      data: { messageId: data.id, to: order.customer_email }
    };

  } catch (error) {
    console.error('Error sending order preparing email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send Order Delivered Email
 * @param {Object} order - Order object from database
 * @returns {Promise<Object>} { success: boolean, data?: object, error?: string }
 */
async function sendOrderDeliveredEmail(order) {
  try {
    if (!order.customer_email) {
      return { success: false, error: 'Customer email not provided' };
    }

    const emailProps = mapOrderToEmailProps(order, { emailType: 'order_delivered' });
    const emailHtml = OrderEmail(emailProps);

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: order.customer_email,
      subject: `Order Completed - ${emailProps.orderNumber}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend API error:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    console.log(`✅ Order delivered email sent: ${data.id} → ${order.customer_email}`);

    return {
      success: true,
      data: { messageId: data.id, to: order.customer_email }
    };

  } catch (error) {
    console.error('Error sending order delivered email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendOrderReceivedEmail,
  sendOrderPreparingEmail,
  sendOrderReadyEmail,
  sendOrderDeliveredEmail,
};
