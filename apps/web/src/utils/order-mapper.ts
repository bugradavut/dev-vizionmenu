/**
 * Order data mapping utilities
 * Maps frontend form data to backend API format
 */

export interface FrontendCustomerInfo {
  name: string;
  phone: string;
  email?: string;
}

export interface FrontendAddressInfo {
  addressType: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  unitNumber?: string;
  buzzerCode?: string;
  suiteNumber?: string;
  deliveryInstructions?: string;
}

export interface FrontendOrderData {
  customerInfo: FrontendCustomerInfo;
  addressInfo?: FrontendAddressInfo;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  paymentMethod: 'counter' | 'online';
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  tip?: number;
  notes?: string;
  deliveryAddress?: FrontendAddressInfo;
  // NEW: Pre-order fields
  preOrder?: {
    isPreOrder: boolean;
    scheduledDate?: string;
    scheduledTime?: string;
    scheduledDateTime?: Date;
  };
  // NEW: Comprehensive pricing breakdown (optional - for Phase 1 enhancement)
  pricing?: {
    itemsTotal: number;
    discountAmount: number;
    deliveryFee: number;
    gst: number;
    qst: number;
    tipAmount: number;
    finalTotal: number;
  };
  campaign?: {
    id?: string;
    code: string;
    discountAmount: number;
    campaignType: 'percentage' | 'fixed_amount';
    campaignValue: number;
  };
  tipDetails?: {
    amount: number;
    type: 'percentage' | 'fixed';
    value: number;
  };
  commission?: {
    orderSource: string;
    commissionRate: number;
    commissionAmount: number;
    netAmount: number;
  };
  paymentIntentId?: string; // Stripe Payment Intent ID for online payments
}

export interface BackendOrderData {
  branchId: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    notes: string;
  }>;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  source: 'qr' | 'web';
  paymentMethod: 'counter' | 'online';
  customerInfo: {
    name: string;
    phone: string;
    email: string;
  };
  tableNumber?: number;
  zone?: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  deliveryAddress?: FrontendAddressInfo;
  // Pre-order fields
  isPreOrder?: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
  scheduledDateTime?: string;
  // NEW: Comprehensive pricing breakdown (Phase 1)
  pricing?: {
    itemsTotal: number;
    discountAmount: number;
    deliveryFee: number;
    gst: number;
    qst: number;
    tipAmount: number;
    finalTotal: number;
  };
  campaign?: {
    id?: string;
    code: string;
    discountAmount: number;
    campaignType: 'percentage' | 'fixed_amount';
    campaignValue: number;
  };
  tip?: {
    amount: number;
    type: 'percentage' | 'fixed';
    value: number;
  };
  commission?: {
    orderSource: string;
    commissionRate: number;
    commissionAmount: number;
    netAmount: number;
  };
  paymentIntentId?: string; // Stripe Payment Intent ID for online payments
}

/**
 * Maps frontend order data to backend API format
 */
export function mapOrderDataForAPI(
  frontendData: FrontendOrderData,
  branchId: string,
  tableNumber?: number,
  zone?: string
): BackendOrderData {
  const { customerInfo, addressInfo, items, orderType, paymentMethod, subtotal, tax, total, tip, notes, preOrder, pricing, campaign, tipDetails, commission } = frontendData;

  // Combine order notes (NO delivery address in notes anymore!)
  const combinedNotes = [
    tip && tip > 0 && `Tip: $${tip.toFixed(2)}`,
    notes && notes.trim()
  ].filter(Boolean).join(' | ');

  // Handle delivery address separately
  const deliveryAddress = (orderType === 'delivery' && addressInfo) ? {
    addressType: addressInfo.addressType,
    streetAddress: addressInfo.streetAddress,
    city: addressInfo.city,
    province: addressInfo.province,
    postalCode: addressInfo.postalCode,
    unitNumber: addressInfo.unitNumber,
    buzzerCode: addressInfo.buzzerCode,
    suiteNumber: addressInfo.suiteNumber,
    deliveryInstructions: addressInfo.deliveryInstructions
  } : undefined;

  return {
    branchId,
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      notes: item.notes || ''
    })),
    orderType,
    source: (commission?.orderSource === 'qr' || commission?.orderSource === 'website') 
      ? (commission.orderSource === 'website' ? 'web' : 'qr')
      : (tableNumber ? 'qr' : 'web'),
    paymentMethod,
    customerInfo: {
      name: customerInfo.name.trim(),
      phone: customerInfo.phone.trim(),
      email: customerInfo.email?.trim() || '-'
    },
    tableNumber,
    zone,
    
    // Legacy fields (backward compatibility)
    subtotal: subtotal + (tip || 0), // Include tip in subtotal for now
    tax,
    total: total + (tip || 0), // Include tip in total
    
    notes: combinedNotes,
    deliveryAddress,
    
    // Pre-order mapping
    isPreOrder: preOrder?.isPreOrder || false,
    scheduledDate: preOrder?.scheduledDate,
    scheduledTime: preOrder?.scheduledTime,
    scheduledDateTime: preOrder?.scheduledDateTime?.toISOString(),
    
    // NEW: Comprehensive pricing breakdown (Phase 1)
    pricing: pricing ? {
      itemsTotal: pricing.itemsTotal,
      discountAmount: pricing.discountAmount,
      deliveryFee: pricing.deliveryFee,
      gst: pricing.gst,
      qst: pricing.qst,
      tipAmount: pricing.tipAmount,
      finalTotal: pricing.finalTotal
    } : undefined,
    
    // Campaign details
    campaign: campaign ? {
      id: campaign.id,
      code: campaign.code,
      discountAmount: campaign.discountAmount,
      campaignType: campaign.campaignType,
      campaignValue: campaign.campaignValue
    } : undefined,
    
    // Tip details
    tip: tipDetails ? {
      amount: tipDetails.amount,
      type: tipDetails.type,
      value: tipDetails.value
    } : undefined,
    
    // Commission data
    commission: commission ? {
      orderSource: commission.orderSource,
      commissionRate: commission.commissionRate,
      commissionAmount: commission.commissionAmount,
      netAmount: commission.netAmount
    } : undefined,
    
    // Stripe payment data
    paymentIntentId: frontendData.paymentIntentId
  };
}

/**
 * Validates frontend order data before submission
 */
export function validateOrderData(data: FrontendOrderData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Customer info validation
  if (!data.customerInfo.name?.trim()) {
    errors.push('Customer name is required');
  }

  if (!data.customerInfo.phone?.trim()) {
    errors.push('Phone number is required');
  }

  // Canadian phone validation - minimum 10 digits (like Turkish format)
  if (data.customerInfo.phone) {
    const phoneDigits = data.customerInfo.phone.replace(/\D/g, '');
    
    if (phoneDigits.length < 10) {
      errors.push('Phone number must have at least 10 digits');
    } else if (phoneDigits.length === 11 && !phoneDigits.startsWith('1')) {
      errors.push('11-digit phone numbers must start with 1');
    } else if (phoneDigits.length > 11) {
      errors.push('Phone number has too many digits');
    }
  }

  // Address validation for delivery orders only
  if (data.orderType === 'delivery' && data.addressInfo) {
    if (!data.addressInfo.streetAddress?.trim()) {
      errors.push('Street address is required for delivery');
    }

    if (!data.addressInfo.city?.trim()) {
      errors.push('City is required for delivery');
    }

    if (!data.addressInfo.province?.trim()) {
      errors.push('Province is required for delivery');
    }

    if (!data.addressInfo.postalCode?.trim()) {
      errors.push('Postal code is required for delivery');
    }

    // Canadian postal code validation
    const postalCodeRegex = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;
    if (data.addressInfo.postalCode && !postalCodeRegex.test(data.addressInfo.postalCode)) {
      errors.push('Please enter a valid Canadian postal code (H1A 1A1)');
    }
  }

  // Items validation
  if (!data.items || data.items.length === 0) {
    errors.push('At least one item is required');
  }

  data.items.forEach((item, index) => {
    if (!item.id || !item.name) {
      errors.push(`Item ${index + 1} is missing required information`);
    }
    
    if (item.quantity <= 0) {
      errors.push(`Item ${index + 1} quantity must be greater than 0`);
    }
    
    if (item.price <= 0) {
      errors.push(`Item ${index + 1} price must be greater than 0`);
    }
  });

  // Pricing validation
  if (data.total <= 0) {
    errors.push('Order total must be greater than 0');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}