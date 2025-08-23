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
  addressInfo: FrontendAddressInfo;
  orderType: 'dine_in' | 'takeaway';
  paymentMethod: 'cash' | 'online';
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
  orderType: 'dine_in' | 'takeaway';
  source: 'qr' | 'web';
  paymentMethod: 'cash' | 'online';
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
  const { customerInfo, addressInfo, items, orderType, paymentMethod, subtotal, tax, total, tip, notes } = frontendData;

  // Format full address for notes
  const fullAddress = [
    addressInfo.streetAddress,
    addressInfo.unitNumber && `Unit ${addressInfo.unitNumber}`,
    addressInfo.city,
    addressInfo.province,
    addressInfo.postalCode
  ].filter(Boolean).join(', ');

  // Combine all notes
  const combinedNotes = [
    `Payment: ${paymentMethod === 'cash' ? 'Pay at Counter' : 'Online Payment'}`,
    orderType === 'takeaway' && `Delivery Address: ${fullAddress}`,
    addressInfo.addressType !== 'home' && `Address Type: ${addressInfo.addressType}`,
    addressInfo.buzzerCode && `Buzzer: ${addressInfo.buzzerCode}`,
    addressInfo.deliveryInstructions && `Instructions: ${addressInfo.deliveryInstructions}`,
    tip && tip > 0 && `Tip: $${tip.toFixed(2)}`,
    notes && notes.trim()
  ].filter(Boolean).join(' | ');

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
    source: tableNumber ? 'qr' : 'web',
    paymentMethod,
    customerInfo: {
      name: customerInfo.name.trim(),
      phone: customerInfo.phone.trim(),
      email: customerInfo.email?.trim() || `${customerInfo.phone}@customer.local`
    },
    tableNumber,
    zone,
    subtotal: subtotal + (tip || 0), // Include tip in subtotal for now
    tax,
    total: total + (tip || 0), // Include tip in total
    notes: combinedNotes
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

  // Phone format validation (basic)
  const phoneRegex = /^[\+]?[1-9]?[\d\s\-\(\)]{10,}$/;
  if (data.customerInfo.phone && !phoneRegex.test(data.customerInfo.phone)) {
    errors.push('Please enter a valid phone number');
  }

  // Address validation for takeaway orders
  if (data.orderType === 'takeaway') {
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