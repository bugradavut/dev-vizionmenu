const orderSourceService = {
  // Detect order source from request
  detectOrderSource(req) {
    try {
      // Check headers and request parameters
      const userAgent = req.headers['user-agent'] || '';
      const referer = req.headers['referer'] || '';
      const orderData = req.body || {};
      
      // 1. QR Code Detection (highest priority)
      if (orderData.orderContext?.source === 'qr' || 
          orderData.orderContext?.isQROrder === true ||
          orderData.source === 'qr' ||
          orderData.tableNumber || // QR orders typically have table numbers
          referer.includes('/order?table=') ||
          referer.includes('qr=true')) {
        return 'qr';
      }
      
      // 2. Third-party platform detection
      if (orderData.orderContext?.third_party_platform) {
        const platform = orderData.orderContext.third_party_platform.toLowerCase();
        
        // Validate third-party platform
        const validPlatforms = ['uber_eats', 'doordash', 'skipthedishes'];
        if (validPlatforms.includes(platform)) {
          return platform;
        }
      }
      
      // 3. Mobile app detection (future implementation)
      if (orderData.source === 'mobile_app' || 
          orderData.orderContext?.source === 'mobile_app' ||
          userAgent.includes('VizionMenuApp')) {
        return 'mobile_app';
      }
      
      // 4. Delivery detection
      if (orderData.orderContext?.orderType === 'delivery' ||
          orderData.orderType === 'delivery') {
        return 'delivery';
      }
      
      // 5. Takeaway detection
      if (orderData.orderContext?.orderType === 'takeaway' ||
          orderData.orderType === 'takeaway' ||
          orderData.orderContext?.orderType === 'pickup') {
        return 'takeaway';
      }
      
      // 6. Website detection (default)
      if (referer.includes('vizionmenu.com') || 
          referer.includes('dev-vizionmenu.vercel.app') ||
          orderData.source === 'web' ||
          orderData.orderContext?.source === 'web') {
        return 'website';
      }
      
      // 7. Default fallback
      return 'website';
      
    } catch (error) {
      console.error('Error detecting order source:', error);
      return 'website'; // Safe fallback
    }
  },

  // Validate order source
  isValidSource(source) {
    const validSources = [
      'website', 
      'mobile_app', 
      'qr', 
      'uber_eats', 
      'doordash', 
      'skipthedishes', 
      'takeaway', 
      'delivery'
    ];
    return validSources.includes(source);
  },

  // Get all valid source types with descriptions
  getValidSources() {
    return [
      {
        type: 'website',
        label: 'Website Orders',
        description: 'Orders from restaurant website'
      },
      {
        type: 'mobile_app',
        label: 'Mobile App Orders',
        description: 'Orders from mobile application (future implementation)'
      },
      {
        type: 'qr',
        label: 'QR Code Orders',
        description: 'In-restaurant QR code orders'
      },
      {
        type: 'uber_eats',
        label: 'Uber Eats',
        description: 'Third-party delivery platform'
      },
      {
        type: 'doordash',
        label: 'DoorDash',
        description: 'Third-party delivery platform'
      },
      {
        type: 'skipthedishes',
        label: 'Skip The Dishes',
        description: 'Third-party delivery platform'
      },
      {
        type: 'takeaway',
        label: 'Takeaway/Pickup',
        description: 'Customer pickup orders'
      },
      {
        type: 'delivery',
        label: 'Direct Delivery',
        description: 'Restaurant direct delivery orders'
      }
    ];
  },

  // Enhanced source detection with debugging
  detectOrderSourceWithDebug(req) {
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || '';
    const orderData = req.body || {};
    
    const detectionResult = {
      source: this.detectOrderSource(req),
      debug: {
        userAgent,
        referer,
        orderContext: orderData.orderContext || null,
        orderType: orderData.orderType || null,
        tableNumber: orderData.tableNumber || null,
        source: orderData.source || null
      }
    };
    
    return detectionResult;
  },

  // Extract order context for commission calculation
  extractOrderContext(req) {
    const orderData = req.body || {};
    
    return {
      source: this.detectOrderSource(req),
      branchId: orderData.branchId || orderData.branch_id,
      orderType: orderData.orderType || orderData.orderContext?.orderType,
      tableNumber: orderData.tableNumber || orderData.orderContext?.tableNumber,
      zone: orderData.zone || orderData.orderContext?.zone,
      thirdPartyPlatform: orderData.orderContext?.third_party_platform,
      isQROrder: orderData.orderContext?.isQROrder || false,
      customerType: orderData.customerType || 'regular'
    };
  },

  // Validate order context for commission processing
  validateOrderContext(orderContext) {
    const errors = [];
    
    if (!orderContext.source) {
      errors.push('Order source is required');
    } else if (!this.isValidSource(orderContext.source)) {
      errors.push(`Invalid order source: ${orderContext.source}`);
    }
    
    if (!orderContext.branchId) {
      errors.push('Branch ID is required');
    }
    
    // QR orders must have table number
    if (orderContext.source === 'qr' && !orderContext.tableNumber) {
      errors.push('Table number is required for QR orders');
    }
    
    // Third-party orders must specify platform
    if (['uber_eats', 'doordash', 'skipthedishes'].includes(orderContext.source) &&
        !orderContext.thirdPartyPlatform) {
      errors.push('Third-party platform must be specified');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

module.exports = orderSourceService;