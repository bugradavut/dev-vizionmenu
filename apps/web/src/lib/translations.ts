// Centralized translations for Vision Menu
// Canadian French (fr-CA) vs European French (fr) considerations

export const translations = {
  en: {
    // Common terms
    common: {
      loading: "Loading...",
      search: "Search",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      create: "Create",
      update: "Update",
      close: "Close",
      yes: "Yes",
      no: "No",
      confirm: "Confirm"
    },
    
    // Navigation
    navigation: {
      dashboard: "Dashboard",
      orders: "Orders",
      liveOrders: "Live Orders",
      orderHistory: "Order History",
      kitchenDisplay: "Kitchen Display",
      menuManagement: "Menu Management",
      campaigns: "Campaigns",
      settings: "Settings",
      generalSettings: "General Settings",
      branchSettings: "Branch Settings",
      userManagement: "User Management",
      paymentSettings: "Payment Settings",
      paymentMethods: "Payment Methods",
      deliverySettings: "Delivery Settings",
      notifications: "Notifications",
      integrations: "Integrations",
      taxRegistration: "Tax Registration",
      websrmCertificate: "WEB-SRM Certificate",
      branch: "Branch",
      adminSettings: "Admin Settings",
      restaurantChains: "Restaurant Chains",
      branchManagement: "Branch Management",
      platformAdmins: "Platform Administrators",
      reports: "Reports",
      activityLogs: "Activity Logs",
      dailyClosing: "Daily Closing",
      offlineSessions: "Offline Sessions",
      dataExport: "Data Export",

      // Sub-navigation items
      overview: "Overview",
      analytics: "Analytics",
      categories: "Categories",
      items: "Items",
      pricing: "Pricing",
      menu: "Menu",
      createCampaign: "Create Campaign"
    },
    
    // Dashboard
    dashboard: {
      title: "Dashboard Overview",
      subtitle: "Welcome back! Here's what's happening with your restaurant today."
    },
    
    // Live Orders
    liveOrders: {
      pageTitle: "Live Orders",
      pageSubtitle: "Monitor and manage active orders in real-time",
      viewLabel: "View:",
      searchPlaceholder: "Search orders, customer, phone",
      statusPreparing: "Preparing",
      statusCompleted: "Completed",
      statusRejected: "Rejected",
      statusCancelled: "Cancelled",
      tableHeaderChannel: "Channel",
      tableHeaderOrder: "Order",
      tableHeaderCustomer: "Customer", 
      tableHeaderStatus: "Status",
      tableHeaderTotal: "Total",
      tableHeaderTime: "Time",
      tableHeaderAction: "Action"
    },
    
    // Order History
    orderHistory: {
      pageTitle: "Order History",
      pageSubtitle: "View completed and cancelled orders",
      viewLabel: "View:",
      searchPlaceholder: "Search orders, customer, phone",
      dateRange: "Date Range",
      sortNewest: "Newest First",
      sortOldest: "Oldest First",
      filterAll: "All",
      filterCompleted: "Completed",
      filterCancelled: "Cancelled",
      filterRejected: "Rejected",
      statusCompleted: "Completed",
      statusCancelled: "Cancelled",
      statusRejected: "Rejected",
      tableHeaderChannel: "Channel",
      tableHeaderOrder: "Order",
      tableHeaderCustomer: "Customer",
      tableHeaderStatus: "Status",
      tableHeaderTotal: "Total",
      tableHeaderDate: "Date",
      tableHeaderAction: "Action",
      viewDetails: "View Details",
      noOrdersFound: "No orders found",
      loading: "Loading orders..."
    },
    
    // Order Detail
    orderDetail: {
      // Loading and Error States
      loading: "Loading order details...",
      failedToLoad: "Failed to load order",
      orderNotFound: "Order not found",
      orderNotFoundDesc: "The order you're looking for doesn't exist.",
      backToOrders: "Back to Orders",
      retry: "Retry",
      dismiss: "Dismiss",
      
      // Header Actions
      backToLive: "Back to Live Orders",
      backToHistory: "Back to Order History",
      
      // Order Info
      table: "Table",
      
      // Accordion Sections
      orderProgress: "Order Progress",
      percentComplete: "% Complete",
      orderItems: "Order Items",
      customerInformation: "Customer Information",
      
      // Order Progress Steps
      orderPreparing: "Order is being prepared",
      kitchenPreparing: "Kitchen is preparing your order", 
      orderCompleted: "Order has been completed",
      
      // Refund Section
      selectItemsRefund: "Select items below to refund",
      selectAll: "Select All",
      itemsSelected: "item(s) selected",
      unitsSelected: "{count} unit(s)",
      noItemsEligible: "All items that can be refunded have already been processed.",
      refund: "Refund",
      confirmPartialRefund: "Confirm Partial Refund",
      refundDescription: "You are about to refund",
      refundDescriptionItems: "item(s) for a total amount of",
      refundCannotUndo: "This action cannot be undone.",
      itemsToRefund: "Items to be refunded:",
      cancel: "Cancel",
      confirmRefund: "Confirm Refund",
      refundSuccess: "Refund processed successfully! Funds will be returned within 3-5 business days.",
      each: "each",
      quantityToRefund: "Quantity to refund",
      maxRefundable: "Max {max}",
      decreaseQuantity: "Decrease quantity",
      increaseQuantity: "Increase quantity",
      refundRemainingInfo: "Already refunded {refunded} of {total}. {remaining} remaining.",
      refundedBadge: "Refunded",
      
      // Order Notes
      orderNotes: "Order Notes & Instructions",
      notes: "Notes",
      specialInstructions: "Special Instructions",
      
      // Customer Information Fields
      customerName: "Customer Name",
      contact: "Contact",
      emailAddress: "Email Address",
      orderType: "Order Type",
      deliveryAddress: "Delivery Address",
      walkInCustomer: "Walk-in Customer",
      notProvided: "Not provided",
      
      // Order Types
      dineIn: "Dine In",
      takeaway: "Takeaway",
      delivery: "Delivery",
      pickup: "Pickup",
      unknown: "Unknown",
      
      // Payment Methods
      creditCard: "Credit Card",
      debitCard: "Debit Card",
      cash: "Cash",
      paypal: "PayPal",
      applePay: "Apple Pay",
      googlePay: "Google Pay",
      notSpecified: "Not specified",
      
      // Payment Summary
      paymentSummary: "Payment Summary",
      subtotal: "Subtotal",
      tax: "Tax (GST + QST)",
      serviceFee: "Service Fee",
      deliveryFee: "Delivery Fee",
      total: "Total",
      payment: "Payment",
      orderDate: "Order Date", 
      orderTime: "Order Time",
      estTime: "Est. Time",
      invalidTime: "Invalid time",
      
      // Quick Actions
      quickActions: "Quick Actions",
      acceptOrder: "Accept Order",
      accepting: "Accepting...",
      markReady: "Mark Ready",
      markingReady: "Marking Ready...",
      rejectOrder: "Reject Order",
      rejecting: "Rejecting...",
      yesRejectOrder: "Yes, Reject Order",
      rejectConfirm: "Are you sure you want to reject this order? This action cannot be undone.",
      kitchenPreparing2: "Kitchen is preparing this order",
      waitingKitchen: "Waiting for kitchen to complete the order...",
      cancelOrder: "Cancel Order", 
      cancelling: "Cancelling...",
      markCompleted: "Mark as Completed",
      completing: "Completing...",
      orderCompleted2: "Order Completed",
      orderCancelled: "Order Cancelled",
      orderRejected: "Order Rejected",
      orderRejectedDesc: "This order was rejected and cannot be processed",
      
      // Status Labels
      preparing: "Preparing",
      completed: "Completed",
      cancelled: "Cancelled",
      rejected: "Rejected",

      // Payment Method Change (Case FO-116 Step 1)
      changePaymentMethod: "Change Payment Method",
      currentPayment: "Current Payment",
      newPayment: "New Payment",
      cashLabel: "Cash",
      cardLabel: "Card",
      onlineLabel: "Online",
      selectPaymentMethod: "Select a payment method",
      confirmChange: "Confirm Change",
      back: "Back",
      orderAmount: "Order Amount",
      currentMethod: "Current Method",
      newMethod: "New Method",
      cannotUndo: "This action cannot be undone",
      processing: "Processing...",
      paymentMethodChanged: "Payment Method Changed!",
      changeSuccessDesc: "The payment method has been successfully changed.",
      websrmQueued: "WEB-SRM transactions queued for processing",
      update: "Update"
    },

    // WebSRM (Quebec SRS Compliance - SW-78 FO-107)
    webSrm: {
      buttonTitle: "Quebec Tax Receipt",
      dialogTitle: "WebSRM Fiscal Transaction",
      dialogDescription: "Quebec Sales Recording System (SRS) compliance transaction details",
      status: "Status",
      completed: "Completed",
      pending: "Pending",
      processing: "Processing",
      failed: "Failed",
      transactionId: "Transaction ID",
      environment: "Environment",
      device: "Device",
      environmentEssai: "ESSAI (Test)",
      errorDetails: "Error Details (SW-78 FO-107)",
      errorMessage: "Error Message",
      returnCode: "Return Code",
      retryAttempts: "Retry Attempts",
      created: "Created",
      completedTime: "Completed",
      lastError: "Last Error",
      refreshStatus: "Refresh Status",
      loading: "Loading transaction details...",
      notFound: "No WebSRM transaction found for this order.",
      notFoundDesc: "This order may not require Quebec SRS compliance.",
      notAuthenticated: "Not authenticated"
    },

    // Kitchen Display
    kitchenDisplay: {
      // Page Title and Description
      pageTitle: "Kitchen Display",
      pageSubtitle: "Monitor and manage orders for kitchen preparation",
      
      // View Options
      viewLabel: "View:",
      simplifiedModeActive: "Simplified Mode: Active",
      
      // Search and Controls
      searchPlaceholder: "Search orders, customer",
      refresh: "Refresh",
      dismiss: "Dismiss",
      
      // Status Overview Cards
      inProgress: "In Progress",
      preOrders: "Pre-Orders",
      
      // Kanban Column Headers
      inProgressColumn: "IN PROGRESS",
      preOrdersColumn: "PRE-ORDERS",
      
      // Order Status and Actions
      startPrep: "Start Prep",
      scheduled: "Scheduled",
      
      // Timer and Progress
      minutesLeft: "m left",
      hoursLeft: "h",
      readyToStart: "Ready to start",
      
      // Item Management
      showLess: "Show Less",
      more: "More",
      items: "items",
      completed: "completed",
      orderItems: "Order Items",
      of: "of",
      
      // Special Instructions
      specialInstructionsSummary: "Special Instructions Summary",
      
      // Table Headers
      status: "Status",
      order: "Order",
      customer: "Customer",
      time: "Time",
      total: "Total",
      action: "Action",
      
      // Empty States
      noOrdersInProgress: "No orders in progress",
      noPreOrders: "No pre-orders",
      noActiveOrders: "No Active Orders",
      kitchenCaughtUp: "Kitchen is all caught up! 🎉",
      
      // Loading States
      loadingKitchenOrders: "Loading kitchen orders...",
      
      // Status Messages
      activeOrder: "active order",
      activeOrders: "active orders",
      
      // Pre-order specific
      preOrder: "PRE-ORDER"
    },
    
    // Settings General
    settingsGeneral: {
      // Page Title and Description
      pageTitle: "General Settings",
      pageSubtitle: "Manage your application preferences and account settings.",
      
      // Appearance Section
      appearance: "Appearance",
      theme: "Theme",
      currentlyUsingTheme: "Currently using theme:",
      language: "Language", 
      currentlySelectedLanguage: "Currently selected language:",
      
      // Theme Labels
      light: "Light",
      dark: "Dark",
      system: "System"
    },
    
    // Settings Users
    settingsUsers: {
      // Page Title and Description
      pageTitle: "User Management",
      pageSubtitle: "Manage restaurant staff, roles, and permissions.",
      
      // Statistics Cards
      totalUsers: "Total Users",
      activeUsers: "Active Users",
      administrators: "Administrators",
      
      // User Management Components
      userTable: {
        // Table Headers and Actions
        userManagement: "User Management",
        searchPlaceholder: "Search users by name or email...",
        addUser: "Add User",
        filters: "Filters",
        
        // Table Headers
        name: "Name",
        email: "Email",
        role: "Role",
        status: "Status",
        actions: "Actions",
        
        // Role Labels
        chainOwner: "Chain Owner",
        branchManager: "Branch Manager",
        staff: "Staff",
        cashier: "Cashier",
        
        // Status Labels
        active: "Active",
        inactive: "Inactive",
        
        // Filter Options
        filterAll: "All",
        filterByRole: "Filter by Role",
        filterByStatus: "Filter by Status",
        
        // Actions
        editUser: "Edit User",
        deleteUser: "Delete User",
        toggleStatus: "Toggle Status",
        
        // Confirmation Messages
        deleteConfirm: "Are you sure you want to permanently delete {name}? This action cannot be undone.",
        
        // Empty States
        noUsers: "No users found",
        noUsersDesc: "No users match your current filters",
        
        // Loading States
        loading: "Loading users..."
      },
      
      createUserModal: {
        title: "Create New User",
        subtitle: "Add a new team member to your branch",
        
        // Form Fields
        fullName: "Full Name",
        fullNamePlaceholder: "Enter user's full name",
        email: "Email Address",
        emailPlaceholder: "Enter user's email",
        phone: "Phone",
        phonePlaceholder: "+1 (555) 123-4567",
        tempPassword: "Temporary Password",
        passwordPlaceholder: "Minimum 8 characters",
        passwordHint: "User will be prompted to change this on first login",
        role: "Role",
        selectRole: "Select a role",
        
        // Actions
        cancel: "Cancel",
        createUser: "Create User",
        creating: "Creating...",
        
        // Validation
        nameRequired: "Full name is required",
        emailRequired: "Email is required",
        emailInvalid: "Please enter a valid email",
        phoneInvalid: "Invalid phone format",
        passwordRequired: "Password is required",
        passwordMinLength: "Password must be at least 8 characters",
        roleRequired: "Please select a role",
        createFailed: "Failed to create user"
      },
      
      editUserModal: {
        title: "Edit User",
        subtitle: "Update user information and settings for {name}",
        
        // Form Fields
        fullName: "Full Name",
        fullNamePlaceholder: "Enter user's full name",
        email: "Email Address",
        emailPlaceholder: "Enter user's email",
        phone: "Phone",
        phonePlaceholder: "+1 (555) 123-4567",
        role: "Role",
        status: "Status",
        selectRole: "Select a role",
        
        // Actions
        cancel: "Cancel",
        saveChanges: "Save Changes",
        saving: "Saving...",
        
        // Validation
        nameRequired: "Full name is required",
        emailRequired: "Email is required",
        emailInvalid: "Please enter a valid email",
        phoneInvalid: "Invalid phone format",
        roleRequired: "Please select a role",
        updateFailed: "Failed to update user"
      }
    },
    
    // Settings Branch
    settingsBranch: {
      // Page Title and Description
      pageTitle: "Branch Settings",
      pageSubtitle: "Configure how your restaurant handles orders and workflows.",
      
      // Loading States
      loadingSettings: "Loading branch settings...",
      
      // Error States
      failedToLoad: "Failed to load settings",
      retry: "Retry",
      dismiss: "Dismiss",
      
      // Order Flow Management
      orderFlow: {
        title: "Order Management Flow",
        subtitle: "Choose how your restaurant handles order progression",
        currentlyUsing: "Currently using:",
        unsavedChanges: "(unsaved changes)"
      },
      
      // Timing Settings
      timingSettings: {
        title: "Preparation & Delivery Timing",
        subtitleEnabled: "Configure general preparation times and delivery delays",
        subtitleDisabled: "Available only with Simplified Flow",
        
        // Base Preparation Delay
        basePreparationDelay: "Base Preparation Delay",
        initialMinutes: "Initial (Minutes)",
        temporary: "Temporary (+/-)",
        total: "Total:",
        
        // Delivery Delay
        deliveryDelay: "Delivery Delay",
        
        // Expected Total Time
        expectedTotalTime: "Expected Total Time",
        min: "MIN"
      },
      
      // Actions
      saveChanges: "Save Changes",
      saving: "Saving...",
      
      // Success Messages
      settingsSaved: "Settings saved successfully!",
      settingsSavedDesc: "Your order flow preferences have been updated.",
      
      // Minimum Order Amount
      minimumOrderTitle: "Minimum Order Amount",
      minimumOrderDesc: "Set minimum order value required for checkout",
      noMinimumSet: "No minimum order amount set",
      minimumOrderWarning: "Orders below {amount} will be blocked",

      // Tax Information (Quebec SRS - SW-78 FO-108)
      taxInformationTitle: "Tax Registration",
      taxInformationDesc: "Quebec GST/QST registration numbers",
      gstCardTitle: "GST Registration",
      gstCardDesc: "Federal tax number",
      gstLabel: "GST Number",
      gstPlaceholder: "123456789RT0001",
      gstFormat: "Format: 9 digits + RT + 4 digits",
      qstCardTitle: "QST Registration",
      qstCardDesc: "Quebec provincial tax",
      qstLabel: "QST Number",
      qstPlaceholder: "1234567890TQ0001",
      qstFormat: "Format: 10 digits + TQ + 4 digits",
      invalidFormat: "Invalid format",
      validFormat: "Valid format",
      requiredForQuebec: "Required for Quebec SRS (Sales Recording System) compliance",

      // Delivery Settings
      deliveryFeeTitle: "Delivery Settings",
      deliveryFeeDesc: "Set delivery fee for delivery orders",
      standardDeliveryFee: "Standard Delivery Fee",
      noDeliveryFee: "No delivery fee set (free delivery)",
      deliveryFeeApplied: "{amount} will be added to delivery orders",

      // Free Delivery Threshold
      freeDeliveryThreshold: "Free Delivery Threshold",
      freeDeliveryThresholdDesc: "Orders above this amount qualify for free delivery",
      noFreeDelivery: "Free delivery is disabled",
      freeDeliveryEnabled: "Orders over {amount} qualify for free delivery",

      // Delivery Zones
      deliveryZones: "Delivery Zones",
      deliveryZonesDesc: "Define available delivery zones",
      zonesEnabled: "Zones enabled",
      zonesDisabled: "Zones disabled",
      configureZones: "Configure",
      clickToDrawZones: "Click 'Configure' to draw zones.",

      // Uber Direct
      uberDirect: "Uber Direct",
      uberDirectDesc: "Third-party delivery integration",
      uberDirectEnabled: "Uber Direct enabled",
      uberDirectDisabled: "Uber Direct disabled",
      uberDirectEnabledDesc: "Orders can be delivered via Uber Direct delivery service.",
      uberDirectDisabledDesc: "Enable to use Uber Direct for delivery. Requires configuration in settings.",
      configureCredentials: "Configure Credentials",
      
      // Customer-facing free delivery messages
      freeDeliveryPromo: "Add {amount} more for FREE delivery!",
      freeDeliveryApplied: "You saved {amount} on delivery!",
      freeDeliveryBadge: "FREE!",

      // Restaurant Hours
      restaurantHours: {
        title: "Restaurant Hours",
        subtitle: "Configure when customers can order",
        statusClosed: "Closed",
        statusOpen: "Open",
        closedToggleAria: "Toggle restaurant availability",
        closedNotice: "The branch is marked as closed. Customers will not be able to place orders.",
        workingDaysLabel: "Working Days",
        defaultHoursLabel: "Default Hours",
        openLabel: "Open",
        closeLabel: "Close",
        helperText: "Use this placeholder to plan hours. Detailed per-day schedules will come with the API integration.",
        dayLabels: {
          mon: "Monday",
          tue: "Tuesday",
          wed: "Wednesday",
          thu: "Thursday",
          fri: "Friday",
          sat: "Saturday",
          sun: "Sunday"
        },
        dayInitials: {
          mon: "M",
          tue: "T",
          wed: "W",
          thu: "T",
          fri: "F",
          sat: "S",
          sun: "S"
        }
      },

      // Delivery Hours
      deliveryHours: {
        title: "Delivery Hours",
        subtitle: "Configure when delivery is available",
        statusClosed: "Closed",
        statusOpen: "Available",
        closedToggleAria: "Toggle delivery availability",
        closedNotice: "Delivery is marked as closed. Customers will not be able to place delivery orders.",
        workingDaysLabel: "Delivery Days",
        defaultHoursLabel: "Default Hours",
        openLabel: "Open",
        closeLabel: "Close",
        dayLabels: {
          mon: "Monday",
          tue: "Tuesday",
          wed: "Wednesday",
          thu: "Thursday",
          fri: "Friday",
          sat: "Saturday",
          sun: "Sunday"
        },
        dayInitials: {
          mon: "M",
          tue: "T",
          wed: "W",
          thu: "T",
          fri: "F",
          sat: "S",
          sun: "S"
        }
      },

      // Pickup Hours
      pickupHours: {
        title: "Pickup Hours",
        subtitle: "Configure when pickup is available",
        statusClosed: "Closed",
        statusOpen: "Available",
        closedToggleAria: "Toggle pickup availability",
        closedNotice: "Pickup is marked as closed. Customers will not be able to place pickup orders.",
        workingDaysLabel: "Pickup Days",
        defaultHoursLabel: "Default Hours",
        openLabel: "Open",
        closeLabel: "Close",
        dayLabels: {
          mon: "Monday",
          tue: "Tuesday",
          wed: "Wednesday",
          thu: "Thursday",
          fri: "Friday",
          sat: "Saturday",
          sun: "Sunday"
        },
        dayInitials: {
          mon: "M",
          tue: "T",
          wed: "W",
          thu: "T",
          fri: "F",
          sat: "S",
          sun: "S"
        }
      },

      // Notification Sounds
      notificationSounds: {
        title: "Notification Sounds",
        subtitle: "Customize alert sounds for different notification types",
        orderNotifications: "Order Notifications",
        orderNotificationsDesc: "Sound played when a new order is received",
        waiterCallNotifications: "Waiter Call Notifications",
        waiterCallNotificationsDesc: "Sound played when a waiter is called to a table",
        selectSound: "Select Sound",
        testSound: "Test Sound",
        currentSound: "Current:",
        soundEnabled: "Sounds enabled",
        soundDisabled: "Sounds disabled",
        enabledDesc: "Notification sounds are active for this branch",
        disabledDesc: "All notification sounds are muted for this branch",
        saved: "Notification sounds updated successfully"
      },

      // Payment Methods - SW-78 FO-116
      paymentMethods: {
        title: "Payment Methods",
        subtitle: "Configure payment options for your branch",
        onlinePayment: "Pay Online",
        onlinePaymentDesc: "Credit card payments",
        cashPayment: "Pay Cash",
        cashPaymentDesc: "Cash at counter",
        cardPayment: "Pay with Card",
        cardPaymentDesc: "Card at counter",
        saved: "Payment settings updated successfully"
      },

      // Timezone Settings - FO-129
      timezone: {
        title: "Time Zone",
        subtitle: "Set your branch's local time zone",
        currentTimezone: "Current time zone:",
        selectTimezone: "Select time zone",
        description: "This affects order timestamps and receipts. If different from WEB-SRM (UTC-5:00), the UTC offset will be shown on documents.",
        utcNotation: "UTC notation will be displayed on printed bills"
      }
    },
    
    // Order Notifications
    orderNotifications: {
      // Toast Header
      newOrderReceived: "New Order Received",
      
      // Toast Message - will be rendered with bold formatting in React
      orderMessage: "A new order #{orderNumber} has been placed by {customerName} with a total amount of ${total}. Please review and process the order.",
      
      // Action Button
      viewOrder: "View Order",
      
      // Success Messages
      notificationHistoryCleared: "Cleared notification history"
    },
    
    // Menu Management
    menuManagement: {
      // Page Header
      pageTitle: "Menu Management",
      pageSubtitle: "Manage your menu categories, items, and pricing in real-time",
      
      // Quick Actions
      presets: "Presets",
      newItem: "New Item",
      newCategory: "New Category",
      
      
      // Stats Cards
      activeCategories: "active categories",
      available: "available",
      revenue: "Revenue",
      thisMonth: "this month",
      avgTime: "Avg. Time",
      preparation: "preparation",
      
      // Search
      searchPlaceholder: "Search categories or items...",
      
      // Categories Tab
      categoriesTab: {
        title: "Menu Categories",
        subtitle: "Organize your menu items into categories",
        noCategories: "No Categories",
        noCategoriesDesc: "Get started by creating your first menu category",
        createCategory: "Create Category",
        editCategory: "Edit Category",
        deleteCategory: "Delete Category",
        duplicateCategory: "Duplicate Category",
        toggleAvailability: "Toggle Availability",
        hide: "Hide",
        show: "Show",
        moveUp: "Move up",
        moveDown: "Move down",
        confirmDelete: "Are you sure you want to delete category \"{name}\"?",
        failedToToggle: "Failed to toggle availability",
        retryAction: "Try Again",
        
        // Smart Delete Dialog (when category has items)
        cannotDeleteTitle: "Category Contains Menu Items",
        cannotDeleteMessage: "This category contains {count} menu item(s). What would you like to do?",
        moveAndDeleteOption: "Move items to 'Uncategorized' and delete category",
        cancelDeletion: "Cancel deletion",
        moveAndDelete: "Move & Delete",
        
        // Card actions
        active: "Active",
        inactive: "Inactive",
        edit: "Edit",
        delete: "Delete",
        activate: "Active",
        deactivate: "Inactive"
      },
      
      // Items Tab  
      itemsTab: {
        title: "Menu Items",
        subtitle: "Manage individual items, pricing, and availability",
        noItems: "No Items",
        noItemsDesc: "Get started by creating your first menu item",
        createItem: "Create Item",
        editItem: "Edit",
        deleteItem: "Delete", 
        duplicateItem: "Duplicate",
        hideItem: "Hide",
        showItem: "Show",
        updating: "Updating...",
        confirmDelete: "Are you sure you want to delete item \"{name}\"?",
        failedToToggleItem: "Failed to toggle item availability",
        order: "Order:",
        variants: "Variants:",
        more: "more",
        
        // Filters
        filters: "Filters",
        allCategories: "All",
        uncategorized: "Uncategorized",
        allStatus: "All",
        availableOnly: "Available",
        unavailableOnly: "Unavailable",
        noItemsFound: "No items found",
        noItemsCreated: "No items created yet",
        
        // Card actions
        available: "Available",
        unavailable: "Unavailable",
        variantsCount: "variants"
      },
      
      // Presets Tab
      presetsTab: {
        title: "Menu Presets",
        subtitle: "Create menu configurations for different time periods",
        newPreset: "New Preset",
        noPresets: "No Presets",
        noPresetsDesc: "Create your first menu preset for different time periods",
        createPreset: "Create Preset",
        currentMenu: "Current Menu",
        saveCurrentConfig: "Save current menu configuration",
        categories: "Categories:",
        items: "Items:",
        available: "Available:",
        saveAsPreset: "Save as Preset",
        active: "Active",
        inactive: "Inactive",
        created: "Created:",
        currentPreset: "Current Preset",
        applyPreset: "Apply Preset"
      },
      
      // Category Create Modal
      categoryModal: {
        createTitle: "New Category",
        editTitle: "Edit Category",
        createSubtitle: "Add a new category to organize your menu items",
        editSubtitle: "Edit category information and settings",
        categoryName: "Category Name",
        categoryNamePlaceholder: "e.g: Appetizers, Main Courses",
        description: "Description",
        descriptionPlaceholder: "Optional description for this category...",
        displayOrder: "Display Order",
        displayOrderDesc: "Controls the order this category appears in menus",
        cancel: "Cancel",
        createCategory: "Create Category",
        updateCategory: "Update Category",
        creating: "Creating...",
        updating: "Updating...",
        nameRequired: "Category name is required",
        nameMaxLength: "Name must be 100 characters or less",
        descriptionMaxLength: "Description must be 500 characters or less",
        displayOrderMin: "Display order must be 0 or greater",
        createFailed: "Failed to create category",
        updateFailed: "Failed to update category"
      },
      
      // Item Create Modal
      itemModal: {
        createTitle: "New Menu Item",
        editTitle: "Edit Menu Item", 
        createSubtitle: "Add a new item to your menu with photo, pricing, and variants",
        editSubtitle: "Edit the details of this menu item",
        
        // Photo Section
        itemPhoto: "Item Photo",
        clickToAddPhoto: "Click to add photo",
        maxSize: "Max 5MB - JPG, PNG",
        changePhoto: "Change Photo",
        addPhoto: "Add Photo",
        
        // Basic Info
        itemName: "Item Name",
        itemNamePlaceholder: "e.g: Margherita Pizza",
        price: "Price",
        description: "Description",
        descriptionPlaceholder: "Detailed item description...",
        descriptionHelper: "Description that will appear on the menu (max 1000 characters)",
        
        // Category & Timing
        category: "Category",
        selectCategory: "Select category",
        noCategory: "No category",
        prepTime: "Prep Time",
        order: "Order",
        min: "min",
        
        // Allergens
        allergens: "Allergens",
        customAllergen: "Custom allergen...",
        
        // Dietary Info
        dietaryInfo: "Dietary Information",
        customDietaryInfo: "Custom dietary info...",
        
        // Variants
        variants: "Variants",
        addVariant: "Add Variant",
        variantName: "Name",
        variantNamePlaceholder: "e.g: Large",
        priceModifier: "Price Modifier",
        default: "Default",
        
        // Availability (edit mode)
        itemAvailable: "Item Available",
        availabilityHelper: "Unavailable items are hidden from customers",
        
        // Actions
        cancel: "Cancel",
        createItem: "Create Item",
        updateItem: "Update Item",
        saving: "Saving...",
        
        // Validation
        nameRequired: "Item name is required",
        nameMaxLength: "Name must be 150 characters or less",
        descriptionMaxLength: "Description must be 1000 characters or less", 
        priceRequired: "Price must be greater than 0",
        priceMax: "Price must be less than 1000",
        prepTimeMin: "Preparation time must be at least 1 minute",
        prepTimeMax: "Preparation time must be less than 1000 minutes",
        orderMin: "Display order must be a positive number",
        orderMax: "Display order must be less than 1000",
        variantNameRequired: "Variant name is required",
        fileSizeError: "File size cannot exceed 5MB",
        fileTypeError: "Please select a valid image file"
      }
    },

    // Order Tracking
    orderTracking: {
      title: "Track Your Order",
      back: "Back",
      errorTitle: "Unable to Load Order",
      backToOrder: "Back to Order",
      orderPlaced: "Order Placed",
      preparing: "Preparing",
      estimatedTime: "Estimated time",
      completionTime: "Completion Time",
      ready: "Ready for Pickup/Delivery",
      contactTitle: "Need Help?",
      callRestaurant: "Call Restaurant",
      callForUpdates: "For order updates and questions",
      refresh: "Refresh Status",
      branchName: "Restaurant",
      branchAddress: "Address"
    },
    
    // Customer Order Page
    orderPage: {
      // Header
      branding: "Vizion Menu",
      searchPlaceholder: "Search menu items...",
      tableInfo: "Table {number}",
      tableInfoWithZone: "Table {number} - {zone}",
      
      // Language Selection
      language: "Language",
      english: "English",
      french: "Français",
      
      // Categories
      allMenu: "All Menu",
      setMenu: "Set Menu",
      noSetMenu: "No Set Menu Available",
      noSetMenuDesc: "There are no active menu presets at this time.",
      
      // Search Results
      searchResults: "Search Results for \"{query}\"",
      noItemsFound: "No Items Found",
      noItemsFoundDesc: "No items found matching \"{query}\"",
      noItemsAvailable: "No menu items are currently available.",
      noItemsInCategory: "No menu items available in this category.",
      itemsAvailable: "{count} items available",
      
      // Menu Items
      item: "item",
      items: "items",
      available: "available",
      unavailable: "Unavailable",
      noImage: "No Image",
      each: "each",
      
      // Cart
      orderSummary: "Order Summary",
      yourCart: "Your Cart",
      cartEmpty: "Your cart is empty",
      cartEmptyDesc: "Add items from the menu to get started",
      
      // Order Ready Time
      orderReadyFor: "ORDER READY FOR",
      orderReadyIn: "in {minutes} minutes",
      
      // Order Types
      dineIn: "Dine In",
      takeout: "Takeout",
      
      // Order Type Info
      dineInService: "Dine In Service",
      dineInQRDesc: "Your order will be served to Table {number}{zone}",
      dineInWebDesc: "Please let staff know your table number when ordering",
      takeoutOrder: "Takeout Order",
      takeoutDesc: "Your order will be prepared for pickup/delivery",
      
      // Customer Information
      customerInformation: "Customer Information",
      deliveryInformation: "Delivery Information",
      fullName: "Full Name",
      yourName: "Your Name",
      phoneNumber: "Phone Number",
      deliveryAddress: "Delivery Address",
      email: "Email (optional)",
      
      // QR Dine-in Info
      tableServiceInfo: "Table Service Information",
      tableNumber: "Table Number",
      zone: "Zone",
      orderSource: "Order Source",
      qrCode: "QR Code",
      qrDineInDesc: "Your order will be delivered directly to your table. No additional information required.",
      
      // Payment Methods
      selectPaymentMethod: "Select Payment Method",
      paymentQuestion: "How would you like to pay for your order?",
      payAtCounter: "Pay at Counter",
      payWhenLeaving: "Pay when leaving",
      payWhenPickingUp: "Pay when picking up",
      payOnline: "Pay Online",
      payOnlineDesc: "Credit card or digital payment",

      // SW-78 FO-116: Quebec WEB-SRM Payment Methods
      paymentMethods: {
        title: "Select payment method",
        online: "Online",
        cash: "Cash",
        card: "Card",
        offlineWarning: "Online payment is unavailable in offline mode. Cash payment has been selected."
      },
      
      
      // Item Modal
      addToCart: "Add to Cart",
      quantity: "Quantity",
      notes: "Notes",
      specialInstructions: "Special instructions (optional)",
      
      // Validation Messages
      nameRequired: "Please enter your full name",
      phoneRequired: "Please enter your phone number",
      addressRequired: "Please enter your delivery address",
      nameRequiredDineIn: "Please enter your name for dine-in service",
      phoneRequiredDineIn: "Please enter your phone number for dine-in service",
      addItemsToCart: "Please add items to your cart",
      
      // Error Messages
      failedToLoadMenu: "Unable to Load Menu",
      tryAgain: "Try Again",
      
      // Misc
      total: "Total",
      subtotal: "Subtotal",
      tax: "Tax (GST + QST)",
      dailySpecial: "Daily Special",
      limitedTime: "Limited Time",
      
      // Validation Messages
      validation: {
        cartEmpty: "Please add items to your cart",
        nameRequired: "Please enter your full name",
        phoneRequired: "Please enter your phone number", 
        addressRequired: "Please enter your delivery address",
        dineInNameRequired: "Please enter your name for dine-in service",
        dineInPhoneRequired: "Please enter your phone number for dine-in service"
      },
      
      // Order Success
      orderSuccess: {
        title: "Order Placed!",
        message: "Your order has been received and is being prepared.",
        placeAnother: "Place Another Order"
      },
      
      // Cart Section
      cart: {
        orderSummary: "Order Summary",
        item: "item",
        items: "items",
        empty: "Your cart is empty",
        emptyMessage: "Add items from the menu to get started",
        each: "each",
        note: "Note",
        viewCart: "View Cart"
      },

      // Order Type Modal Section
      orderTypeModal: {
        unavailableScheduled: "Not available at selected time",
        unavailableImmediate: "Currently unavailable"
      },
      
      // Pricing Section
      pricing: {
        subtotal: "Subtotal",
        tax: "Tax (GST + QST)",
        total: "Total",
        orderTotal: "Order Total"
      },
      
      // Customer Info Section
      customerInfo: {
        deliveryInfo: "Delivery Information",
        customerInfo: "Customer Information",
        fullName: "Full Name",
        yourName: "Your Name",
        phoneNumber: "Phone Number",
        deliveryAddress: "Delivery Address",
        email: "Email (optional)"
      },
      
      // Order Type Section
      orderType: {
        dineIn: "Dine In",
        takeout: "Takeout",
        dineInService: "Dine In Service",
        tableService: "Your order will be served to Table {number}",
        tableServiceWithZone: "Your order will be served to Table {number} in {zone}",
        tableNumberInfo: "Please let staff know your table number when ordering",
        takeoutOrder: "Takeout Order",
        takeoutInfo: "Your order will be prepared for pickup/delivery"
      },
      
      // QR Dine-in Section
      qrDineIn: {
        tableServiceInfo: "Table Service Information",
        tableNumber: "Table Number",
        zone: "Zone",
        orderSource: "Order Source",
        qrCode: "QR Code",
        deliveryInfo: "Your order will be delivered directly to your table. No additional information required."
      },
      
      // Checkout Section
      checkout: {
        checkout: "Checkout",
        reviewOrder: "Review Order",
        placingOrder: "Placing Order...",
        confirmOrder: "Confirm Order",
        backToCart: "Back to Cart"
      },

      // Review Section
      review: {
        title: "Review Your Order",
        subtitle: "Please review your order details before confirming",
        orderSummary: "Order Summary",
        otherInformation: "Other information",
        optional: "Optional",
        noteForOrder: "Note for the order",
        notePlaceholder: "Ex: Put the sauce separately",
        validationError: "Please fill in all required fields"
      },
      
      // Payment Section
      payment: {
        selectPaymentMethod: "Select Payment Method",
        howToPay: "How would you like to pay for your order?",
        payAtCounter: "Pay at Counter",
        payWhenLeaving: "Pay when leaving",
        payWhenPickup: "Pay when picking up",
        payOnline: "Pay Online",
        creditCardInfo: "Credit card or digital payment"
      },
      
      // Menu Section
      menu: {
        noSetMenu: "No Set Menu Available",
        noActivePresets: "There are no active menu presets at this time.",
        noItemsFound: "No Items Found",
        noSearchResults: "No items found matching \"{query}\"",
        noMenuItems: "No menu items are currently available.",
        noCategoryItems: "No menu items available in this category.",
        searchResults: "Search Results for \"{query}\"",
        allMenu: "All Menu",
        setMenu: "Set Menu",
        itemsAvailable: "items available",
        dailySpecial: "Daily Special",
        limitedTime: "Limited Time",
        item: "item",
        items: "items",
        available: "available",
        noImage: "No Image",
        unavailable: "Unavailable"
      },
      
      // Sidebar Section
      sidebar: {
        categories: "Categories",
        item: "Item",
        items: "Items"
      },
      
      // Item Modal Section
      itemModal: {
        allergens: "Allergens",
        prepTime: "Prep time",
        minutes: "minutes",
        unavailable: "Unavailable",
        addMore: "Add {quantity} More ({current} in cart)",
        addToCart: "Add {quantity} to Cart"
      }
    },
    
    // Campaigns
    campaigns: {
      // Page Header
      createPageTitle: "Create Campaign",
      createPageSubtitle: "Set up promotional codes and discounts for your customers",
      
      // Form Labels
      campaignCode: "Campaign Code",
      campaignCodePlaceholder: "e.g., SAVE20, PIZZA15",
      campaignType: "Discount Type",
      discountValue: "Discount Value",
      validFrom: "Valid From",
      validUntil: "Valid Until",
      applicableCategories: "Applicable Categories",
      allCategories: "All menu categories",
      selectCategories: "Select specific categories",
      
      // Campaign Types
      percentage: "Percentage Discount",
      fixedAmount: "Fixed Amount Discount",
      
      // Buttons
      createCampaign: "Create Campaign",
      cancel: "Cancel",
      
      // Success Messages
      campaignCreated: "Campaign created successfully!",
      campaignCreatedDesc: "Your promotional campaign is now active and ready to use.",
      
      // Validation Messages
      codeRequired: "Campaign code is required",
      codeMinLength: "Code must be at least 3 characters",
      codeMaxLength: "Code must be 20 characters or less",
      typeRequired: "Please select a discount type",
      valueRequired: "Discount value is required",
      valueMin: "Value must be greater than 0",
      percentageMax: "Percentage cannot exceed 100%",
      validUntilRequired: "Valid until date is required",
      validUntilFuture: "Valid until date must be in the future",
      createFailed: "Failed to create campaign"
    },
    
    // Payment Settings
    paymentSettings: {
      // Page Header
      pageTitle: "Payment Settings",
      pageSubtitle: "Connect your Stripe account to enable automatic commission processing and payouts.",
      
      // Loading States
      loading: "Loading payment settings...",
      connecting: "Connecting...",
      redirectingToStripe: "Redirecting to Stripe...",
      
      // Error States  
      failedToLoadSettings: "Failed to load payment settings",
      failedToConnectAccount: "Failed to connect Stripe account",
      
      // Connection Setup
      connectStripeAccount: "Connect Stripe Account",
      continueSetup: "Continue Setup",
      completeVerification: "Complete Verification", 
      connectDescription: "Enable secure payment processing and automatic commission management for your restaurant chain.",
      continueDescription: "Your Stripe account setup is in progress. Continue where you left off.",
      verificationDescription: "Your account is pending verification. Complete the remaining steps.",
      setupTime: "Takes 5-10 minutes",
      secureSetup: "Secure setup powered by",
      
      // Account Status
      accountStatus: "Stripe Account Status", 
      accountId: "Account ID",
      capabilities: "Capabilities",
      payments: "Payments",
      transfers: "Transfers",
      active: "Active",
      pending: "Pending",
      incomplete: "Incomplete",
      verified: "Verified",
      rejected: "Rejected",
      
      // Account Setup States
      incompleteSetup: "Incomplete Setup",
      pendingVerification: "Pending Verification",
      setupIncomplete: "Your Stripe account setup is incomplete. Please complete the verification process.",
      requiredInformation: "Required information:",
      completeSetup: "Complete Setup",
      
      // Payment Processing
      paymentProcessing: "Payment Processing",
      commissionPayoutConfig: "Commission and payout configuration",
      commissionProcessing: "Commission Processing",
      payoutSchedule: "Payout Schedule",
      currency: "Currency",
      daily: "Daily",
      active2: "Active",
      paymentConfigured: "Your payment processing is fully configured! Customer payments will automatically have commission deducted and net amounts transferred to your bank account.",
      
      // Support Section
      needHelp: "Need Help?",
      supportDescription: "Setting up Stripe Connect for the first time? Our support team can help guide you through the process.",
      contactSupport: "Contact Support",
      
      // Success State
      accountConnectedSuccessfully: "Account Connected Successfully",
      accountFullyConfigured: "Your Stripe account is fully configured and ready to process payments with automatic commission handling.",
      connectedAndVerified: "Connected and verified",
      
      // Copy Toast
      accountIdCopied: "Account ID Copied",
      accountIdCopiedDescription: "The account ID has been copied to your clipboard.",
      copyFailed: "Copy Failed",
      copyFailedDescription: "Failed to copy account ID to clipboard."
    },

    // Activity Logs
    activityLogs: {
      // Page Header
      pageTitle: "Activity Logs",
      pageSubtitle: "Track user changes and system activities across your restaurant chain",

      // Loading States
      loading: "Loading activity logs...",
      loadingStats: "Loading statistics...",
      loadingFilters: "Loading filters...",

      // Error States
      failedToLoad: "Failed to load activity logs",
      failedToLoadStats: "Failed to load statistics",
      failedToLoadFilters: "Failed to load filter options",
      retry: "Retry",
      dismiss: "Dismiss",

      // Search and Filters
      searchPlaceholder: "Search logs by user, action, or entity...",
      filterByAction: "Filter by Action",
      filterByEntity: "Filter by Entity",
      filterByUser: "Filter by User",
      filterByDate: "Filter by Date",
      clearFilters: "Clear Filters",
      allActions: "All Actions",
      allEntities: "All Entities",
      allUsers: "All Users",

      // Action Types
      actionCreate: "Create",
      actionUpdate: "Update",
      actionDelete: "Delete",

      // Entity Types
      entityMenuCategory: "Menu Category",
      entityMenuItem: "Menu Item",
      entityUser: "User",
      entityOrder: "Order",
      entityCampaign: "Campaign",
      entityBranchSettings: "Branch Settings",

      // Table Headers
      tableHeaderUser: "User",
      tableHeaderAction: "Action",
      tableHeaderEntity: "Entity",
      tableHeaderChanges: "Changes",
      tableHeaderDate: "Date",
      tableHeaderTime: "Time",

      // Table Content
      noLogsFound: "No activity logs found",
      noLogsFoundDesc: "No logs match your current filters or there are no activities yet",

      // Stats Cards
      totalLogs: "Total Logs",
      logsToday: "Logs Today",
      mostActiveUser: "Most Active User",
      topAction: "Top Action",

      // Pagination
      page: "Page",
      of: "of",
      showing: "Showing",
      to: "to",
      entries: "entries",
      previous: "Previous",
      next: "Next",

      // Export
      export: "Export",
      exportCSV: "Export CSV",
      exportPDF: "Export PDF",
      exporting: "Exporting...",
      exportSuccess: "Export completed successfully",
      exportFailed: "Export failed",

      // Changes Detail
      viewChanges: "View Changes",
      changes: "Changes",
      before: "Before",
      after: "After",
      noChanges: "No changes recorded",

      // User Info
      unknownUser: "Unknown User",
      systemUser: "System",

      // Date/Time
      justNow: "Just now",
      minuteAgo: "1 minute ago",
      minutesAgo: "{minutes} minutes ago",
      hourAgo: "1 hour ago",
      hoursAgo: "{hours} hours ago",
      dayAgo: "1 day ago",
      daysAgo: "{days} days ago",

      // Empty States
      noActivity: "No Activity",
      noActivityDesc: "No activities have been logged for this chain yet. User actions will appear here as they occur.",
      startActivity: "Activity will appear here as users interact with the system",

      // Filter Summary
      filterSummary: "Showing {count} logs",
      filterSummaryFiltered: "Showing {count} of {total} logs (filtered)"
    }
  },
  
  fr: {
    // Common terms - Canadian French  
    common: {
      loading: "Chargement...",
      search: "Rechercher",
      save: "Sauvegarder",
      cancel: "Annuler",
      delete: "Supprimer",
      edit: "Modifier",
      create: "Créer",
      update: "Mettre à jour",
      close: "Fermer",
      yes: "Oui",
      no: "Non", 
      confirm: "Confirmer"
    },
    
    // Navigation - Canadian French
    navigation: {
      dashboard: "Tableau de bord",
      orders: "Commandes",
      liveOrders: "Commandes en cours",
      orderHistory: "Historique des commandes",
      kitchenDisplay: "Affichage cuisine",
      menuManagement: "Gestion du menu",
      campaigns: "Campagnes",
      settings: "Paramètres",
      generalSettings: "Paramètres généraux",
      branchSettings: "Paramètres de succursale",
      userManagement: "Gestion des utilisateurs",
      paymentSettings: "Paramètres de paiement",
      paymentMethods: "Modes de Paiement",
      deliverySettings: "Paramètres de Livraison",
      notifications: "Notifications",
      integrations: "Intégrations",
      taxRegistration: "Enregistrement Fiscal",
      websrmCertificate: "Certificat WEB-SRM",
      branch: "Succursale",
      adminSettings: "Paramètres administrateur",
      restaurantChains: "Chaînes de restaurants",
      branchManagement: "Gestion des succursales",
      platformAdmins: "Administrateurs Plateforme",
      reports: "Rapports",
      activityLogs: "Journaux d'activité",
      dailyClosing: "Clôture Journalière",
      offlineSessions: "Sessions Hors Ligne",
      dataExport: "Exportation de Données",

      // Sub-navigation items
      overview: "Aperçu",
      analytics: "Analyses",
      categories: "Catégories",
      items: "Articles",
      pricing: "Tarification",
      menu: "Menu",
      createCampaign: "Créer une campagne"
    },
    
    // Dashboard - Canadian French
    dashboard: {
      title: "Aperçu du tableau de bord",
      subtitle: "Bienvenue! Voici ce qui se passe dans votre restaurant aujourd'hui."
    },
    
    // Live Orders - Canadian French with restaurant industry terms
    liveOrders: {
      pageTitle: "Commandes en cours",
      pageSubtitle: "Surveillez et gérez les commandes actives en temps réel",
      viewLabel: "Affichage :",
      searchPlaceholder: "Rechercher commandes, client, téléphone",
      statusPreparing: "En préparation", 
      statusCompleted: "Terminée",
      statusRejected: "Rejetée",
      statusCancelled: "Annulée",
      tableHeaderChannel: "Canal",
      tableHeaderOrder: "Commande",
      tableHeaderCustomer: "Client",
      tableHeaderStatus: "Statut",
      tableHeaderTotal: "Total",
      tableHeaderTime: "Heure",
      tableHeaderAction: "Action"
    },
    
    // Order History - Canadian French
    orderHistory: {
      pageTitle: "Historique des commandes",
      pageSubtitle: "Voir les commandes terminées et annulées", 
      viewLabel: "Affichage :",
      searchPlaceholder: "Rechercher commandes, client, téléphone",
      dateRange: "Plage de dates",
      sortNewest: "Plus récentes d'abord",
      sortOldest: "Plus anciennes d'abord", 
      filterAll: "Toutes",
      filterCompleted: "Terminées",
      filterCancelled: "Annulées",
      filterRejected: "Rejetées",
      statusCompleted: "Terminée",
      statusCancelled: "Annulée",
      statusRejected: "Rejetée",
      tableHeaderChannel: "Canal",
      tableHeaderOrder: "Commande", 
      tableHeaderCustomer: "Client",
      tableHeaderStatus: "Statut",
      tableHeaderTotal: "Total",
      tableHeaderDate: "Date",
      tableHeaderAction: "Action",
      viewDetails: "Voir les détails",
      noOrdersFound: "Aucune commande trouvée",
      loading: "Chargement des commandes..."
    },
    
    // Order Detail - Canadian French
    orderDetail: {
      // Loading and Error States
      loading: "Chargement des détails de la commande...",
      failedToLoad: "Échec du chargement de la commande",
      orderNotFound: "Commande introuvable",
      orderNotFoundDesc: "La commande que vous cherchez n'existe pas.",
      backToOrders: "Retour aux commandes",
      retry: "Réessayer",
      dismiss: "Fermer",
      
      // Header Actions
      backToLive: "Retour aux commandes en cours",
      backToHistory: "Retour à l'historique des commandes",
      
      // Order Info
      table: "Table",
      
      // Accordion Sections
      orderProgress: "Progrès de la commande",
      percentComplete: "% terminé",
      orderItems: "Articles de la commande",
      customerInformation: "Informations du client",
      
      // Order Progress Steps
      orderPreparing: "Commande en cours de préparation",
      kitchenPreparing: "La cuisine prépare votre commande", 
      orderCompleted: "Commande terminée",
      
      // Refund Section
      selectItemsRefund: "Sélectionnez les articles ci-dessous pour remboursement",
      selectAll: "Tout sélectionner",
      itemsSelected: "article(s) sélectionné(s)",
      unitsSelected: "{count} unite(s)",
      noItemsEligible: "Tous les articles remboursables ont deja ete traites.",
      refund: "Rembourser",
      confirmPartialRefund: "Confirmer le remboursement partiel",
      refundDescription: "Vous êtes sur le point de rembourser",
      refundDescriptionItems: "article(s) pour un montant total de",
      refundCannotUndo: "Cette action ne peut pas être annulée.",
      itemsToRefund: "Articles à rembourser :",
      cancel: "Annuler",
      confirmRefund: "Confirmer le remboursement",
      refundSuccess: "Remboursement traité avec succès! Les fonds seront retournés sous 3-5 jours ouvrables.",
      each: "chacun",
      quantityToRefund: "Quantite a rembourser",
      maxRefundable: "Maximum {max}",
      decreaseQuantity: "Diminuer la quantite",
      increaseQuantity: "Augmenter la quantite",
      refundRemainingInfo: "Deja rembourse {refunded} sur {total}. {remaining} restant.",
      refundedBadge: "Rembourse",
      
      // Order Notes
      orderNotes: "Notes et instructions de commande",
      notes: "Notes",
      specialInstructions: "Instructions spéciales",
      
      // Customer Information Fields
      customerName: "Nom du client",
      contact: "Contact",
      emailAddress: "Adresse courriel",
      orderType: "Type de commande",
      deliveryAddress: "Adresse de livraison",
      walkInCustomer: "Client sur place",
      notProvided: "Non fourni",
      
      // Order Types
      dineIn: "Sur place",
      takeaway: "À emporter",
      delivery: "Livraison",
      pickup: "Ramassage",
      unknown: "Inconnu",
      
      // Payment Methods
      creditCard: "Carte de crédit",
      debitCard: "Carte de débit",
      cash: "Comptant",
      paypal: "PayPal",
      applePay: "Apple Pay",
      googlePay: "Google Pay",
      notSpecified: "Non spécifié",
      
      // Payment Summary
      paymentSummary: "Résumé du paiement",
      subtotal: "Sous-total",
      tax: "Taxe (TPS + TVQ)",
      serviceFee: "Frais de service",
      deliveryFee: "Frais de livraison",
      total: "Total",
      payment: "Paiement",
      orderDate: "Date de commande", 
      orderTime: "Heure de commande",
      estTime: "Heure estimée",
      invalidTime: "Heure invalide",
      
      // Quick Actions
      quickActions: "Actions rapides",
      acceptOrder: "Accepter la commande",
      accepting: "Acceptation...",
      markReady: "Marquer comme prête",
      markingReady: "Marquage en cours...",
      rejectOrder: "Rejeter la commande",
      rejecting: "Rejet...",
      yesRejectOrder: "Oui, rejeter la commande",
      rejectConfirm: "Êtes-vous sûr de vouloir rejeter cette commande? Cette action ne peut pas être annulée.",
      kitchenPreparing2: "La cuisine prépare cette commande",
      waitingKitchen: "En attente que la cuisine termine la commande...",
      cancelOrder: "Annuler la commande", 
      cancelling: "Annulation...",
      markCompleted: "Marquer comme terminée",
      completing: "Finalisation...",
      orderCompleted2: "Commande terminée",
      orderCancelled: "Commande annulée",
      orderRejected: "Commande rejetée",
      orderRejectedDesc: "Cette commande a été rejetée et ne peut pas être traitée",
      
      // Status Labels
      preparing: "En préparation",
      completed: "Terminée",
      cancelled: "Annulée",
      rejected: "Rejetée",

      // Payment Method Change (Case FO-116 Step 1) - Canadian French
      changePaymentMethod: "Changer le mode de paiement",
      currentPayment: "Paiement actuel",
      newPayment: "Nouveau paiement",
      cashLabel: "Comptant",
      cardLabel: "Carte",
      onlineLabel: "En ligne",
      selectPaymentMethod: "Sélectionner un mode de paiement",
      confirmChange: "Confirmer le changement",
      back: "Retour",
      orderAmount: "Montant de la commande",
      currentMethod: "Méthode actuelle",
      newMethod: "Nouvelle méthode",
      cannotUndo: "Cette action ne peut pas être annulée",
      processing: "Traitement...",
      paymentMethodChanged: "Mode de paiement modifié!",
      changeSuccessDesc: "Le mode de paiement a été modifié avec succès.",
      websrmQueued: "Transactions WEB-SRM en file d'attente",
      update: "Mettre à jour"
    },

    // WebSRM (Conformité SRS du Québec - SW-78 FO-107)
    webSrm: {
      buttonTitle: "Reçu Fiscal Québec",
      dialogTitle: "Transaction Fiscale WebSRM",
      dialogDescription: "Détails de conformité du système d'enregistrement des ventes (SRS) du Québec",
      status: "Statut",
      completed: "Complété",
      pending: "En attente",
      processing: "En traitement",
      failed: "Échoué",
      transactionId: "ID de Transaction",
      environment: "Environnement",
      device: "Appareil",
      environmentEssai: "ESSAI (Test)",
      errorDetails: "Détails de l'erreur (SW-78 FO-107)",
      errorMessage: "Message d'erreur",
      returnCode: "Code de retour",
      retryAttempts: "Tentatives de relance",
      created: "Créé",
      completedTime: "Complété",
      lastError: "Dernière erreur",
      refreshStatus: "Actualiser le statut",
      loading: "Chargement des détails de transaction...",
      notFound: "Aucune transaction WebSRM trouvée pour cette commande.",
      notFoundDesc: "Cette commande peut ne pas nécessiter la conformité SRS du Québec.",
      notAuthenticated: "Non authentifié"
    },

    // Kitchen Display - Canadian French
    kitchenDisplay: {
      // Page Title and Description
      pageTitle: "Affichage cuisine",
      pageSubtitle: "Surveiller et gérer les commandes pour la préparation en cuisine",
      
      // View Options
      viewLabel: "Affichage :",
      simplifiedModeActive: "Mode simplifié : Actif",
      
      // Search and Controls
      searchPlaceholder: "Rechercher commandes, client",
      refresh: "Actualiser",
      dismiss: "Fermer",
      
      // Status Overview Cards
      inProgress: "En cours",
      preOrders: "Précommandes",
      
      // Kanban Column Headers
      inProgressColumn: "EN COURS",
      preOrdersColumn: "PRÉCOMMANDES",
      
      // Order Status and Actions
      startPrep: "Commencer la préparation",
      scheduled: "Planifiée",
      
      // Timer and Progress
      minutesLeft: "min restantes",
      hoursLeft: "h",
      readyToStart: "Prête à commencer",
      
      // Item Management
      showLess: "Afficher moins",
      more: "Autres",
      items: "articles",
      completed: "terminés",
      orderItems: "Articles de la commande",
      of: "de",
      
      // Special Instructions
      specialInstructionsSummary: "Résumé des instructions spéciales",
      
      // Table Headers
      status: "Statut",
      order: "Commande",
      customer: "Client",
      time: "Heure",
      total: "Total",
      action: "Action",
      
      // Empty States
      noOrdersInProgress: "Aucune commande en cours",
      noPreOrders: "Aucune précommande",
      noActiveOrders: "Aucune commande active",
      kitchenCaughtUp: "La cuisine est à jour ! 🎉",
      
      // Loading States
      loadingKitchenOrders: "Chargement des commandes de cuisine...",
      
      // Status Messages
      activeOrder: "commande active",
      activeOrders: "commandes actives",
      
      // Pre-order specific
      preOrder: "PRÉCOMMANDE"
    },
    
    // Settings General - Canadian French
    settingsGeneral: {
      // Page Title and Description
      pageTitle: "Paramètres généraux",
      pageSubtitle: "Gérez vos préférences d'application et paramètres de compte.",
      
      // Appearance Section
      appearance: "Apparence",
      theme: "Thème",
      currentlyUsingTheme: "Thème actuellement utilisé :",
      language: "Langue",
      currentlySelectedLanguage: "Langue actuellement sélectionnée :",
      
      // Theme Labels
      light: "Clair",
      dark: "Sombre",
      system: "Système"
    },
    
    // Settings Users - Canadian French
    settingsUsers: {
      // Page Title and Description
      pageTitle: "Gestion des utilisateurs",
      pageSubtitle: "Gérez le personnel du restaurant, les rôles et les permissions.",
      
      // Statistics Cards
      totalUsers: "Total des utilisateurs",
      activeUsers: "Utilisateurs actifs",
      administrators: "Administrateurs",
      
      // User Management Components - Canadian French
      userTable: {
        // Table Headers and Actions
        userManagement: "Gestion des utilisateurs",
        searchPlaceholder: "Rechercher des utilisateurs par nom ou courriel...",
        addUser: "Ajouter un utilisateur",
        filters: "Filtres",
        
        // Table Headers
        name: "Nom",
        email: "Courriel",
        role: "Rôle",
        status: "Statut",
        actions: "Actions",
        
        // Role Labels
        chainOwner: "Propriétaire de chaîne",
        branchManager: "Gestionnaire de succursale",
        staff: "Personnel",
        cashier: "Caissier",
        
        // Status Labels
        active: "Actif",
        inactive: "Inactif",
        
        // Filter Options
        filterAll: "Tous",
        filterByRole: "Filtrer par rôle",
        filterByStatus: "Filtrer par statut",
        
        // Actions
        editUser: "Modifier l'utilisateur",
        deleteUser: "Supprimer l'utilisateur",
        toggleStatus: "Basculer le statut",
        
        // Confirmation Messages
        deleteConfirm: "Êtes-vous sûr de vouloir supprimer définitivement {name}? Cette action ne peut pas être annulée.",
        
        // Empty States
        noUsers: "Aucun utilisateur trouvé",
        noUsersDesc: "Aucun utilisateur ne correspond à vos filtres actuels",
        
        // Loading States
        loading: "Chargement des utilisateurs..."
      },
      
      createUserModal: {
        title: "Créer un nouvel utilisateur",
        subtitle: "Ajouter un nouveau membre à votre équipe de succursale",
        
        // Form Fields
        fullName: "Nom complet",
        fullNamePlaceholder: "Entrez le nom complet de l'utilisateur",
        email: "Adresse courriel",
        emailPlaceholder: "Entrez le courriel de l'utilisateur",
        phone: "Téléphone",
        phonePlaceholder: "+1 (555) 123-4567",
        tempPassword: "Mot de passe temporaire",
        passwordPlaceholder: "Minimum 8 caractères",
        passwordHint: "L'utilisateur sera invité à le changer lors de la première connexion",
        role: "Rôle",
        selectRole: "Sélectionnez un rôle",
        
        // Actions
        cancel: "Annuler",
        createUser: "Créer l'utilisateur",
        creating: "Création...",
        
        // Validation
        nameRequired: "Le nom complet est requis",
        emailRequired: "Le courriel est requis",
        emailInvalid: "Veuillez entrer un courriel valide",
        phoneInvalid: "Format de téléphone invalide",
        passwordRequired: "Le mot de passe est requis",
        passwordMinLength: "Le mot de passe doit contenir au moins 8 caractères",
        roleRequired: "Veuillez sélectionner un rôle",
        createFailed: "Échec de la création de l'utilisateur"
      },
      
      editUserModal: {
        title: "Modifier l'utilisateur",
        subtitle: "Mettre à jour les informations et paramètres de {name}",
        
        // Form Fields
        fullName: "Nom complet",
        fullNamePlaceholder: "Entrez le nom complet de l'utilisateur",
        email: "Adresse courriel",
        emailPlaceholder: "Entrez le courriel de l'utilisateur",
        phone: "Téléphone",
        phonePlaceholder: "+1 (555) 123-4567",
        role: "Rôle",
        status: "Statut",
        selectRole: "Sélectionnez un rôle",
        
        // Actions
        cancel: "Annuler",
        saveChanges: "Sauvegarder les modifications",
        saving: "Sauvegarde...",
        
        // Validation
        nameRequired: "Le nom complet est requis",
        emailRequired: "Le courriel est requis",
        emailInvalid: "Veuillez entrer un courriel valide",
        phoneInvalid: "Format de téléphone invalide",
        roleRequired: "Veuillez sélectionner un rôle",
        updateFailed: "Échec de la mise à jour de l'utilisateur"
      }
    },
    
    // Settings Branch - Canadian French
    settingsBranch: {
      // Page Title and Description
      pageTitle: "Paramètres de succursale",
      pageSubtitle: "Configurez comment votre restaurant gère les commandes et les flux de travail.",
      
      // Loading States
      loadingSettings: "Chargement des paramètres de succursale...",
      
      // Error States
      failedToLoad: "Échec du chargement des paramètres",
      retry: "Réessayer",
      dismiss: "Fermer",
      
      // Order Flow Management
      orderFlow: {
        title: "Flux de gestion des commandes",
        subtitle: "Choisissez comment votre restaurant gère la progression des commandes",
        currentlyUsing: "Actuellement utilisé :",
        unsavedChanges: "(modifications non sauvegardées)"
      },
      
      // Timing Settings
      timingSettings: {
        title: "Chronométrage de préparation et de livraison",
        subtitleEnabled: "Configurez les temps de préparation généraux et les délais de livraison",
        subtitleDisabled: "Disponible uniquement avec le flux simplifié",
        
        // Base Preparation Delay
        basePreparationDelay: "Délai de préparation de base",
        initialMinutes: "Initial (Minutes)",
        temporary: "Temporaire (+/-)",
        total: "Total :",
        
        // Delivery Delay
        deliveryDelay: "Délai de livraison",
        
        // Expected Total Time
        expectedTotalTime: "Temps total estimé",
        min: "MIN"
      },
      
      // Actions
      saveChanges: "Sauvegarder les modifications",
      saving: "Sauvegarde...",
      
      // Success Messages
      settingsSaved: "Paramètres sauvegardés avec succès !",
      settingsSavedDesc: "Vos préférences de flux de commandes ont été mises à jour.",
      
      // Minimum Order Amount - Canadian French
      minimumOrderTitle: "Montant minimum de commande",
      minimumOrderDesc: "Définir le montant minimum requis pour le processus de commande",
      noMinimumSet: "Aucun montant minimum défini",
      minimumOrderWarning: "Les commandes inférieures à {amount} seront bloquées",

      // Tax Information (Quebec SRS - SW-78 FO-108) - Canadian French
      taxInformationTitle: "Enregistrement fiscal",
      taxInformationDesc: "Numéros d'enregistrement TPS/TVQ du Québec",
      gstCardTitle: "Enregistrement TPS",
      gstCardDesc: "Numéro de taxe fédérale",
      gstLabel: "Numéro TPS",
      gstPlaceholder: "123456789RT0001",
      gstFormat: "Format : 9 chiffres + RT + 4 chiffres",
      qstCardTitle: "Enregistrement TVQ",
      qstCardDesc: "Taxe provinciale du Québec",
      qstLabel: "Numéro TVQ",
      qstPlaceholder: "1234567890TQ0001",
      qstFormat: "Format : 10 chiffres + TQ + 4 chiffres",
      invalidFormat: "Format invalide",
      validFormat: "Format valide",
      requiredForQuebec: "Requis pour la conformité au SRS (Système d'enregistrement des ventes) du Québec",

      // Delivery Settings - Canadian French
      deliveryFeeTitle: "Paramètres de livraison",
      deliveryFeeDesc: "Définir les frais de livraison pour les commandes à livrer",
      standardDeliveryFee: "Frais de livraison standard",
      noDeliveryFee: "Aucun frais de livraison défini (livraison gratuite)",
      deliveryFeeApplied: "{amount} sera ajouté aux commandes de livraison",

      // Free Delivery Threshold - Canadian French
      freeDeliveryThreshold: "Seuil de livraison gratuite",
      freeDeliveryThresholdDesc: "Les commandes supérieures à ce montant bénéficient de la livraison gratuite",
      noFreeDelivery: "La livraison gratuite est désactivée",
      freeDeliveryEnabled: "Les commandes de plus de {amount} bénéficient de la livraison gratuite",

      // Delivery Zones - Canadian French
      deliveryZones: "Zones de livraison",
      deliveryZonesDesc: "Définir les zones de livraison disponibles",
      zonesEnabled: "Zones activées",
      zonesDisabled: "Zones désactivées",
      configureZones: "Configurer",
      clickToDrawZones: "Cliquez sur 'Configurer' pour dessiner les zones.",

      // Uber Direct - Canadian French
      uberDirect: "Uber Direct",
      uberDirectDesc: "Intégration de livraison tierce",
      uberDirectEnabled: "Uber Direct activé",
      uberDirectDisabled: "Uber Direct désactivé",
      uberDirectEnabledDesc: "Les commandes peuvent être livrées via le service de livraison Uber Direct.",
      uberDirectDisabledDesc: "Activez pour utiliser Uber Direct pour la livraison. Nécessite une configuration dans les paramètres.",
      configureCredentials: "Configurer les identifiants",
      
      // Customer-facing free delivery messages - Canadian French
      freeDeliveryPromo: "Ajoutez {amount} de plus pour la livraison GRATUITE !",
      freeDeliveryApplied: "Vous économisez {amount} sur la livraison !",
      freeDeliveryBadge: "GRATUIT !",

      // Restaurant Hours - Canadian French
      restaurantHours: {
        title: "Heures du restaurant",
        subtitle: "Configurez quand les clients peuvent commander",
        statusClosed: "Fermé",
        statusOpen: "Ouvert",
        closedToggleAria: "Basculer la disponibilité du restaurant",
        closedNotice: "La succursale est indiquée comme fermée. Les clients ne pourront pas passer de commandes.",
        workingDaysLabel: "Jours actifs",
        defaultHoursLabel: "Heures par défaut",
        openLabel: "Ouverture",
        closeLabel: "Fermeture",
        helperText: "Utilisez cette maquette pour planifier les heures. Les horaires détaillés par jour arriveront avec l'intégration API.",
        dayLabels: {
          mon: "Lundi",
          tue: "Mardi",
          wed: "Mercredi",
          thu: "Jeudi",
          fri: "Vendredi",
          sat: "Samedi",
          sun: "Dimanche"
        },
        dayInitials: {
          mon: "L",
          tue: "M",
          wed: "M",
          thu: "J",
          fri: "V",
          sat: "S",
          sun: "D"
        }
      },

      // Delivery Hours - Canadian French
      deliveryHours: {
        title: "Heures de livraison",
        subtitle: "Configurez quand la livraison est disponible",
        statusClosed: "Fermé",
        statusOpen: "Disponible",
        closedToggleAria: "Basculer la disponibilité de livraison",
        closedNotice: "La livraison est indiquée comme fermée. Les clients ne pourront pas passer de commandes de livraison.",
        workingDaysLabel: "Jours de livraison",
        defaultHoursLabel: "Heures par défaut",
        openLabel: "Ouverture",
        closeLabel: "Fermeture",
        dayLabels: {
          mon: "Lundi",
          tue: "Mardi",
          wed: "Mercredi",
          thu: "Jeudi",
          fri: "Vendredi",
          sat: "Samedi",
          sun: "Dimanche"
        },
        dayInitials: {
          mon: "L",
          tue: "M",
          wed: "M",
          thu: "J",
          fri: "V",
          sat: "S",
          sun: "D"
        }
      },

      // Pickup Hours - Canadian French
      pickupHours: {
        title: "Heures de ramassage",
        subtitle: "Configurez quand le ramassage est disponible",
        statusClosed: "Fermé",
        statusOpen: "Disponible",
        closedToggleAria: "Basculer la disponibilité de ramassage",
        closedNotice: "Le ramassage est indiqué comme fermé. Les clients ne pourront pas passer de commandes de ramassage.",
        workingDaysLabel: "Jours de ramassage",
        defaultHoursLabel: "Heures par défaut",
        openLabel: "Ouverture",
        closeLabel: "Fermeture",
        dayLabels: {
          mon: "Lundi",
          tue: "Mardi",
          wed: "Mercredi",
          thu: "Jeudi",
          fri: "Vendredi",
          sat: "Samedi",
          sun: "Dimanche"
        },
        dayInitials: {
          mon: "L",
          tue: "M",
          wed: "M",
          thu: "J",
          fri: "V",
          sat: "S",
          sun: "D"
        }
      },

      // Notification Sounds - Canadian French
      notificationSounds: {
        title: "Sons de notification",
        subtitle: "Personnalisez les sons d'alerte pour différents types de notifications",
        orderNotifications: "Notifications de commande",
        orderNotificationsDesc: "Son joué lorsqu'une nouvelle commande est reçue",
        waiterCallNotifications: "Notifications d'appel de serveur",
        waiterCallNotificationsDesc: "Son joué lorsqu'un serveur est appelé à une table",
        selectSound: "Sélectionner le son",
        testSound: "Tester le son",
        currentSound: "Actuel:",
        soundEnabled: "Sons activés",
        soundDisabled: "Sons désactivés",
        enabledDesc: "Les sons de notification sont actifs pour cette succursale",
        disabledDesc: "Tous les sons de notification sont en sourdine pour cette succursale",
        saved: "Sons de notification mis à jour avec succès"
      },

      // Payment Methods - SW-78 FO-116 - Canadian French
      paymentMethods: {
        title: "Modes de paiement",
        subtitle: "Configurez les options de paiement pour votre succursale",
        onlinePayment: "Payer en ligne",
        onlinePaymentDesc: "Paiements par carte de crédit",
        cashPayment: "Payer comptant",
        cashPaymentDesc: "Argent au comptoir",
        cardPayment: "Payer par carte",
        cardPaymentDesc: "Carte au comptoir",
        saved: "Paramètres de paiement mis à jour avec succès"
      },

      // Timezone Settings - FO-129 - Canadian French
      timezone: {
        title: "Fuseau horaire",
        subtitle: "Définir le fuseau horaire local de votre succursale",
        currentTimezone: "Fuseau horaire actuel :",
        selectTimezone: "Sélectionner le fuseau horaire",
        description: "Cela affecte les horodatages des commandes et les reçus. Si différent de WEB-SRM (UTC-5:00), le décalage UTC sera affiché sur les documents.",
        utcNotation: "La notation UTC sera affichée sur les factures imprimées"
      }
    },
    
    // Order Notifications - Canadian French
    orderNotifications: {
      // Toast Header
      newOrderReceived: "Nouvelle commande reçue",
      
      // Toast Message
      orderMessage: "Une nouvelle commande #{orderNumber} a été placée par {customerName} pour un montant total de {total} $. Veuillez examiner et traiter la commande.",
      
      // Action Button
      viewOrder: "Voir la commande",
      
      // Success Messages
      notificationHistoryCleared: "Historique des notifications effacé"
    },
    
    // Menu Management - Canadian French
    menuManagement: {
      // Page Header
      pageTitle: "Gestion du menu",
      pageSubtitle: "Gérez les catégories, articles et prix de votre menu en temps réel",
      
      // Quick Actions
      presets: "Préréglages",
      newItem: "Nouvel article",
      newCategory: "Nouvelle catégorie",
      
      
      // Stats Cards
      activeCategories: "catégories actives",
      available: "disponibles",
      revenue: "Revenus",
      thisMonth: "ce mois-ci",
      avgTime: "Temps moyen",
      preparation: "préparation",
      
      // Search
      searchPlaceholder: "Rechercher des catégories ou articles...",
      
      // Categories Tab
      categoriesTab: {
        title: "Catégories du menu",
        subtitle: "Organisez vos articles en catégories",
        noCategories: "Aucune catégorie",
        noCategoriesDesc: "Commencez par créer votre première catégorie de menu",
        createCategory: "Créer une catégorie",
        editCategory: "Modifier la catégorie",
        deleteCategory: "Supprimer la catégorie",
        duplicateCategory: "Dupliquer la catégorie",
        toggleAvailability: "Basculer la disponibilité",
        hide: "Masquer",
        show: "Afficher",
        moveUp: "Monter",
        moveDown: "Descendre",
        confirmDelete: "Êtes-vous sûr de vouloir supprimer la catégorie \"{name}\" ?",
        failedToToggle: "Erreur lors de la modification de la disponibilité",
        retryAction: "Réessayer",
        
        // Smart Delete Dialog (when category has items)
        cannotDeleteTitle: "La catégorie contient des articles",
        cannotDeleteMessage: "Cette catégorie contient {count} article(s) de menu. Que souhaitez-vous faire ?",
        moveAndDeleteOption: "Déplacer les articles vers 'Non catégorisé' et supprimer la catégorie",
        cancelDeletion: "Annuler la suppression",
        moveAndDelete: "Déplacer et supprimer",
        
        // Card actions
        active: "Active",
        inactive: "Inactif",
        edit: "Modifier",
        delete: "Supprimer",
        activate: "Activer",
        deactivate: "Désactiver"
      },
      
      // Items Tab  
      itemsTab: {
        title: "Articles du menu",
        subtitle: "Gérez vos articles individuels, prix et disponibilité",
        noItems: "Aucun article",
        noItemsDesc: "Commencez par créer votre premier article de menu",
        createItem: "Créer un article",
        editItem: "Modifier",
        deleteItem: "Supprimer",
        duplicateItem: "Dupliquer", 
        hideItem: "Masquer",
        showItem: "Afficher",
        updating: "Mise à jour...",
        confirmDelete: "Êtes-vous sûr de vouloir supprimer l'article \"{name}\" ?",
        failedToToggleItem: "Erreur lors de la modification de la disponibilité de l'article",
        order: "Ordre :",
        variants: "Variantes :",
        more: "plus",
        
        // Filters
        filters: "Filtres",
        allCategories: "Toutes",
        uncategorized: "Sans catégorie",
        allStatus: "Tous",
        availableOnly: "Disponible",
        unavailableOnly: "Indisponible",
        noItemsFound: "Aucun article trouvé",
        noItemsCreated: "Aucun article créé",
        
        // Card actions
        available: "Disponible",
        unavailable: "Indisponible", 
        variantsCount: "variantes"
      },
      
      // Presets Tab
      presetsTab: {
        title: "Préréglages du menu",
        subtitle: "Créez des configurations pour différentes périodes",
        newPreset: "Nouveau préréglage",
        noPresets: "Aucun préréglage",
        noPresetsDesc: "Créez votre premier préréglage de menu pour différentes périodes",
        createPreset: "Créer un préréglage",
        currentMenu: "Menu actuel",
        saveCurrentConfig: "Sauvegardez la configuration actuelle",
        categories: "Catégories :",
        items: "Articles :",
        available: "Disponibles :",
        saveAsPreset: "Sauvegarder comme préréglage",
        active: "Actif",
        inactive: "Inactif",
        created: "Créé :",
        currentPreset: "Préréglage actuel",
        applyPreset: "Appliquer le préréglage"
      },
      
      // Category Create Modal
      categoryModal: {
        createTitle: "Nouvelle catégorie",
        editTitle: "Modifier la catégorie",
        createSubtitle: "Ajoutez une nouvelle catégorie pour organiser vos articles de menu",
        editSubtitle: "Modifiez les informations et paramètres de la catégorie",
        categoryName: "Nom de la catégorie",
        categoryNamePlaceholder: "ex : Entrées, Plats principaux",
        description: "Description",
        descriptionPlaceholder: "Description optionnelle pour cette catégorie...",
        displayOrder: "Ordre d'affichage",
        displayOrderDesc: "Contrôle l'ordre d'apparition de cette catégorie dans les menus",
        cancel: "Annuler",
        createCategory: "Créer la catégorie",
        updateCategory: "Mettre à jour la catégorie",
        creating: "Création...",
        updating: "Mise à jour...",
        nameRequired: "Le nom de la catégorie est requis",
        nameMaxLength: "Le nom doit contenir au maximum 100 caractères",
        descriptionMaxLength: "La description doit contenir au maximum 500 caractères",
        displayOrderMin: "L'ordre d'affichage doit être 0 ou plus",
        createFailed: "Échec de la création de la catégorie",
        updateFailed: "Échec de la mise à jour de la catégorie"
      },
      
      // Item Create Modal
      itemModal: {
        createTitle: "Nouvel article",
        editTitle: "Modifier l'article", 
        createSubtitle: "Ajoutez un nouvel article à votre menu avec photo, prix et variantes",
        editSubtitle: "Modifiez les détails de cet article de menu",
        
        // Photo Section
        itemPhoto: "Photo de l'article",
        clickToAddPhoto: "Cliquez pour ajouter une photo",
        maxSize: "Max 5MB - JPG, PNG",
        changePhoto: "Changer la photo",
        addPhoto: "Ajouter une photo",
        
        // Basic Info
        itemName: "Nom de l'article",
        itemNamePlaceholder: "ex : Pizza Margherita",
        price: "Prix",
        description: "Description",
        descriptionPlaceholder: "Description détaillée de l'article...",
        descriptionHelper: "Description qui apparaîtra sur le menu (max 1000 caractères)",
        
        // Category & Timing
        category: "Catégorie",
        selectCategory: "Choisir une catégorie",
        noCategory: "Aucune catégorie",
        prepTime: "Temps de préparation",
        order: "Ordre",
        min: "min",
        
        // Allergens
        allergens: "Allergènes",
        customAllergen: "Allergène personnalisé...",
        
        // Dietary Info
        dietaryInfo: "Informations diététiques",
        customDietaryInfo: "Info diététique personnalisée...",
        
        // Variants
        variants: "Variantes",
        addVariant: "Ajouter une variante",
        variantName: "Nom",
        variantNamePlaceholder: "ex : Grande",
        priceModifier: "Ajustement prix",
        default: "Par défaut",
        
        // Availability (edit mode)
        itemAvailable: "Article disponible",
        availabilityHelper: "Les articles indisponibles sont masqués des clients",
        
        // Actions
        cancel: "Annuler",
        createItem: "Créer l'article",
        updateItem: "Mettre à jour l'article",
        saving: "Enregistrement...",
        
        // Validation
        nameRequired: "Le nom de l'article est requis",
        nameMaxLength: "Le nom doit contenir au maximum 150 caractères",
        descriptionMaxLength: "La description doit contenir au maximum 1000 caractères", 
        priceRequired: "Le prix doit être supérieur à 0",
        priceMax: "Le prix doit être inférieur à 1000",
        prepTimeMin: "Le temps de préparation doit être d'au moins 1 minute",
        prepTimeMax: "Le temps de préparation doit être inférieur à 1000 minutes",
        orderMin: "L'ordre d'affichage doit être un nombre positif",
        orderMax: "L'ordre d'affichage doit être inférieur à 1000",
        variantNameRequired: "Le nom de la variante est requis",
        fileSizeError: "La taille du fichier ne peut pas dépasser 5 MB",
        fileTypeError: "Veuillez sélectionner un fichier image valide"
      }
    },

    // Order Tracking - Canadian French
    orderTracking: {
      title: "Suivre votre commande",
      back: "Retour",
      errorTitle: "Impossible de charger la commande",
      backToOrder: "Retour à la commande",
      orderPlaced: "Commande passée",
      preparing: "Préparation",
      estimatedTime: "Temps estimé",
      completionTime: "Heure d'achèvement",
      ready: "Prêt pour ramassage/livraison",
      contactTitle: "Besoin d'aide?",
      callRestaurant: "Appeler le restaurant",
      callForUpdates: "Pour les mises à jour et questions",
      refresh: "Actualiser le statut",
      branchName: "Restaurant",
      branchAddress: "Adresse"
    },
    
    // Customer Order Page - Canadian French
    orderPage: {
      // Header
      branding: "Vizion Menu",
      searchPlaceholder: "Rechercher des articles du menu...",
      tableInfo: "Table {number}",
      tableInfoWithZone: "Table {number} - {zone}",
      
      // Language Selection
      language: "Langue",
      english: "English",
      french: "Français",
      
      // Categories
      allMenu: "Tout le menu",
      setMenu: "Menu prédéfini",
      noSetMenu: "Aucun menu prédéfini disponible",
      noSetMenuDesc: "Il n'y a aucun préréglage de menu actif en ce moment.",
      
      // Search Results
      searchResults: "Résultats de recherche pour « {query} »",
      noItemsFound: "Aucun article trouvé",
      noItemsFoundDesc: "Aucun article trouvé correspondant à « {query} »",
      noItemsAvailable: "Aucun article du menu n'est disponible actuellement.",
      noItemsInCategory: "Aucun article du menu disponible dans cette catégorie.",
      itemsAvailable: "{count} articles disponibles",
      
      // Menu Items
      item: "article",
      items: "articles",
      available: "disponibles",
      unavailable: "Indisponible",
      noImage: "Aucune image",
      each: "chacun",
      
      // Cart
      orderSummary: "Résumé de la commande",
      yourCart: "Votre panier",
      cartEmpty: "Votre panier est vide",
      cartEmptyDesc: "Ajoutez des articles du menu pour commencer",
      
      // Order Ready Time - Canadian French
      orderReadyFor: "COMMANDE PRÊTE POUR",
      orderReadyIn: "dans {minutes} minutes",
      
      // Order Types - Canadian French restaurant terms
      dineIn: "Sur place",          // NOT "Salle à manger"
      takeout: "À emporter",        // NOT "À l'emporter"
      
      // Order Type Info
      dineInService: "Service sur place",
      dineInQRDesc: "Votre commande sera servie à la Table {number}{zone}",
      dineInWebDesc: "Veuillez indiquer votre numéro de table au personnel lors de la commande",
      takeoutOrder: "Commande à emporter",
      takeoutDesc: "Votre commande sera préparée pour ramassage/livraison",
      
      // Customer Information
      customerInformation: "Informations du client",
      deliveryInformation: "Informations de livraison",
      fullName: "Nom complet",
      yourName: "Votre nom",
      phoneNumber: "Numéro de téléphone",
      deliveryAddress: "Adresse de livraison",
      email: "Courriel (optionnel)",        // Canadian French: "Courriel" NOT "Email"
      
      // QR Dine-in Info
      tableServiceInfo: "Informations du service de table",
      tableNumber: "Numéro de table",
      zone: "Zone",
      orderSource: "Source de la commande",
      qrCode: "Code QR",
      qrDineInDesc: "Votre commande sera livrée directement à votre table. Aucune information supplémentaire requise.",
      
      // Payment Methods
      selectPaymentMethod: "Sélectionner le mode de paiement",
      paymentQuestion: "Comment souhaitez-vous payer votre commande ?",
      payAtCounter: "Payer au comptoir",
      payWhenLeaving: "Payer en partant",
      payWhenPickingUp: "Payer lors du ramassage",
      payOnline: "Payer en ligne",
      payOnlineDesc: "Carte de crédit ou paiement numérique",

      // SW-78 FO-116: Quebec WEB-SRM Payment Methods
      paymentMethods: {
        title: "Sélectionnez le mode de paiement",
        online: "En ligne",
        cash: "Comptant",
        card: "Carte",
        offlineWarning: "Le paiement en ligne n'est pas disponible en mode hors ligne. Le paiement comptant a été sélectionné."
      },
      
      
      // Item Modal
      addToCart: "Ajouter au panier",
      quantity: "Quantité",
      notes: "Notes",
      specialInstructions: "Instructions spéciales (optionnel)",
      
      // Validation Messages
      nameRequired: "Veuillez entrer votre nom complet",
      phoneRequired: "Veuillez entrer votre numéro de téléphone",
      addressRequired: "Veuillez entrer votre adresse de livraison",
      nameRequiredDineIn: "Veuillez entrer votre nom pour le service sur place",
      phoneRequiredDineIn: "Veuillez entrer votre numéro de téléphone pour le service sur place",
      addItemsToCart: "Veuillez ajouter des articles à votre panier",
      
      // Error Messages
      failedToLoadMenu: "Impossible de charger le menu",
      tryAgain: "Réessayer",
      
      // Misc - Canadian French formatting
      total: "Total",
      subtotal: "Sous-total",
      tax: "Taxe (TPS + TVQ)",        // Quebec: TPS (GST) 5% + TVQ (QST) 9.975%
      dailySpecial: "Spécial du jour",
      limitedTime: "Temps limité",
      
      // Validation Messages - Canadian French
      validation: {
        cartEmpty: "Veuillez ajouter des articles à votre panier",
        nameRequired: "Veuillez entrer votre nom complet",
        phoneRequired: "Veuillez entrer votre numéro de téléphone", 
        addressRequired: "Veuillez entrer votre adresse de livraison",
        dineInNameRequired: "Veuillez entrer votre nom pour le service sur place",
        dineInPhoneRequired: "Veuillez entrer votre numéro de téléphone pour le service sur place"
      },
      
      // Order Success - Canadian French
      orderSuccess: {
        title: "Commande passée !",
        message: "Votre commande a été reçue et est en cours de préparation.",
        placeAnother: "Passer une autre commande"
      },
      
      // Cart Section - Canadian French
      cart: {
        orderSummary: "Résumé de la commande",
        item: "article",
        items: "articles",
        empty: "Votre panier est vide",
        emptyMessage: "Ajoutez des articles du menu pour commencer",
        each: "chacun",
        note: "Note",
        viewCart: "Voir le panier"
      },

      // Order Type Modal Section - Canadian French
      orderTypeModal: {
        unavailableScheduled: "Indisponible à l'heure sélectionnée",
        unavailableImmediate: "Actuellement indisponible"
      },
      
      // Pricing Section - Canadian French with proper currency format
      pricing: {
        subtotal: "Sous-total",
        tax: "Taxe (TPS + TVQ)",  // Quebec: TPS (GST) 5% + TVQ (QST) 9.975%
        total: "Total",
        orderTotal: "Total de la commande"
      },
      
      // Customer Info Section - Canadian French
      customerInfo: {
        deliveryInfo: "Informations de livraison",
        customerInfo: "Informations du client",
        fullName: "Nom complet",
        yourName: "Votre nom",
        phoneNumber: "Numéro de téléphone",
        deliveryAddress: "Adresse de livraison",
        email: "Courriel (optionnel)"  // Canadian French: "Courriel" NOT "Email"
      },
      
      // Order Type Section - Canadian French restaurant terms
      orderType: {
        dineIn: "Sur place",          // NOT "Salle à manger"
        takeout: "À emporter",        // NOT "À l'emporter"
        dineInService: "Service sur place",
        tableService: "Votre commande sera servie à la Table {number}",
        tableServiceWithZone: "Votre commande sera servie à la Table {number} dans {zone}",
        tableNumberInfo: "Veuillez indiquer votre numéro de table au personnel lors de la commande",
        takeoutOrder: "Commande à emporter",
        takeoutInfo: "Votre commande sera préparée pour ramassage/livraison"
      },
      
      // QR Dine-in Section - Canadian French
      qrDineIn: {
        tableServiceInfo: "Informations du service de table",
        tableNumber: "Numéro de table",
        zone: "Zone",
        orderSource: "Source de la commande",
        qrCode: "Code QR",
        deliveryInfo: "Votre commande sera livrée directement à votre table. Aucune information supplémentaire requise."
      },
      
      // Checkout Section - Canadian French
      checkout: {
        checkout: "Finaliser",
        reviewOrder: "Réviser la commande",
        placingOrder: "Passage de la commande...",
        confirmOrder: "Confirmer la commande",
        backToCart: "Retour au panier"
      },

      // Review Section - Canadian French
      review: {
        title: "Réviser votre commande",
        subtitle: "Veuillez réviser les détails de votre commande avant de confirmer",
        orderSummary: "Résumé de la commande",
        otherInformation: "Autres informations",
        optional: "Optionnel",
        noteForOrder: "Note pour la commande",
        notePlaceholder: "Ex: Mettre la sauce séparément",
        validationError: "Veuillez remplir tous les champs obligatoires"
      },
      
      // Payment Section - Canadian French
      payment: {
        selectPaymentMethod: "Sélectionner la méthode de paiement",
        howToPay: "Comment souhaitez-vous payer votre commande ?",
        payAtCounter: "Payer au comptoir",
        payWhenLeaving: "Payer en partant",
        payWhenPickup: "Payer lors du ramassage",
        payOnline: "Payer en ligne",
        creditCardInfo: "Carte de crédit ou paiement numérique"
      },
      
      // Menu Section - Canadian French
      menu: {
        noSetMenu: "Aucun menu prédéfini disponible",
        noActivePresets: "Il n'y a aucun préréglage de menu actif en ce moment.",
        noItemsFound: "Aucun article trouvé",
        noSearchResults: "Aucun article trouvé correspondant à « {query} »",
        noMenuItems: "Aucun article du menu n'est disponible actuellement.",
        noCategoryItems: "Aucun article du menu disponible dans cette catégorie.",
        searchResults: "Résultats de recherche pour « {query} »",
        allMenu: "Tout le menu",
        setMenu: "Menu prédéfini",
        itemsAvailable: "articles disponibles",
        dailySpecial: "Spécial du jour",
        limitedTime: "Temps limité",
        item: "article",
        items: "articles",
        available: "disponibles",
        noImage: "Aucune image",
        unavailable: "Indisponible"
      },
      
      // Sidebar Section - Canadian French
      sidebar: {
        categories: "Catégories",
        item: "Article",
        items: "Articles"
      },
      
      // Item Modal Section - Canadian French
      itemModal: {
        allergens: "Allergènes",
        prepTime: "Temps de préparation",
        minutes: "minutes",
        unavailable: "Indisponible",
        addMore: "Ajouter {quantity} de plus ({current} dans le panier)",
        addToCart: "Ajouter {quantity} au panier"
      }
    },
    
    // Campaigns - Canadian French
    campaigns: {
      // Page Header
      createPageTitle: "Créer une campagne",
      createPageSubtitle: "Configurez des codes promotionnels et des remises pour vos clients",
      
      // Form Labels
      campaignCode: "Code de campagne",
      campaignCodePlaceholder: "ex: ECONOMIE20, PIZZA15",
      campaignType: "Type de remise",
      discountValue: "Valeur de la remise",
      validFrom: "Valide à partir de",
      validUntil: "Valide jusqu'à",
      applicableCategories: "Catégories applicables",
      allCategories: "Toutes les catégories du menu",
      selectCategories: "Sélectionner des catégories spécifiques",
      
      // Campaign Types
      percentage: "Remise en pourcentage",
      fixedAmount: "Remise de montant fixe",
      
      // Buttons
      createCampaign: "Créer la campagne",
      cancel: "Annuler",
      
      // Success Messages
      campaignCreated: "Campagne créée avec succès !",
      campaignCreatedDesc: "Votre campagne promotionnelle est maintenant active et prête à utiliser.",
      
      // Validation Messages
      codeRequired: "Le code de campagne est requis",
      codeMinLength: "Le code doit contenir au moins 3 caractères",
      codeMaxLength: "Le code doit contenir au maximum 20 caractères",
      typeRequired: "Veuillez sélectionner un type de remise",
      valueRequired: "La valeur de la remise est requise",
      valueMin: "La valeur doit être supérieure à 0",
      percentageMax: "Le pourcentage ne peut pas dépasser 100%",
      validUntilRequired: "La date de fin de validité est requise",
      validUntilFuture: "La date de fin doit être dans le futur",
      createFailed: "Échec de la création de la campagne"
    },
    
    // Payment Settings - Canadian French
    paymentSettings: {
      // Page Header
      pageTitle: "Paramètres de paiement",
      pageSubtitle: "Connectez votre compte Stripe pour activer le traitement automatique des commissions et les versements.",
      
      // Loading States
      loading: "Chargement des paramètres de paiement...",
      connecting: "Connexion en cours...",
      redirectingToStripe: "Redirection vers Stripe...",
      
      // Error States  
      failedToLoadSettings: "Échec du chargement des paramètres de paiement",
      failedToConnectAccount: "Échec de la connexion du compte Stripe",
      
      // Connection Setup
      connectStripeAccount: "Connecter le compte Stripe",
      continueSetup: "Continuer la configuration",
      completeVerification: "Terminer la vérification",
      connectDescription: "Activez le traitement sécurisé des paiements et la gestion automatique des commissions pour votre chaîne de restaurants.",
      continueDescription: "La configuration de votre compte Stripe est en cours. Continuez là où vous vous êtes arrêté.",
      verificationDescription: "Votre compte est en attente de vérification. Terminez les étapes restantes.",
      setupTime: "Prend 5-10 minutes",
      secureSetup: "Configuration sécurisée alimentée par",
      
      // Account Status
      accountStatus: "Statut du compte Stripe", 
      accountId: "ID du compte",
      capabilities: "Capacités",
      payments: "Paiements",
      transfers: "Virements",
      active: "Actif",
      pending: "En attente",
      incomplete: "Incomplet",
      verified: "Vérifié",
      rejected: "Rejeté",
      
      // Account Setup States
      incompleteSetup: "Configuration incomplète",
      pendingVerification: "Vérification en attente",
      setupIncomplete: "La configuration de votre compte Stripe est incomplète. Veuillez terminer le processus de vérification.",
      requiredInformation: "Informations requises :",
      completeSetup: "Terminer la configuration",
      
      // Payment Processing
      paymentProcessing: "Traitement des paiements",
      commissionPayoutConfig: "Configuration des commissions et versements",
      commissionProcessing: "Traitement des commissions",
      payoutSchedule: "Horaire des versements",
      currency: "Devise",
      daily: "Quotidien",
      active2: "Actif",
      paymentConfigured: "Votre traitement des paiements est entièrement configuré ! Les paiements des clients auront automatiquement les commissions déduites et les montants nets transférés à votre compte bancaire.",
      
      // Support Section
      needHelp: "Besoin d'aide ?",
      supportDescription: "Vous configurez Stripe Connect pour la première fois ? Notre équipe de support peut vous guider dans le processus.",
      contactSupport: "Contacter le support",
      
      // Success State
      accountConnectedSuccessfully: "Compte connecté avec succès",
      accountFullyConfigured: "Votre compte Stripe est entièrement configuré et prêt à traiter les paiements avec gestion automatique des commissions.",
      connectedAndVerified: "Connecté et vérifié",
      
      // Copy Toast
      accountIdCopied: "ID de compte copié",
      accountIdCopiedDescription: "L'ID du compte a été copié dans votre presse-papiers.",
      copyFailed: "Échec de la copie",
      copyFailedDescription: "Échec de la copie de l'ID du compte dans le presse-papiers."
    },

    // Activity Logs - Canadian French
    activityLogs: {
      // Page Header
      pageTitle: "Journaux d'activité",
      pageSubtitle: "Suivez les modifications des utilisateurs et les activités système de votre chaîne de restaurants",

      // Loading States
      loading: "Chargement des journaux d'activité...",
      loadingStats: "Chargement des statistiques...",
      loadingFilters: "Chargement des filtres...",

      // Error States
      failedToLoad: "Échec du chargement des journaux d'activité",
      failedToLoadStats: "Échec du chargement des statistiques",
      failedToLoadFilters: "Échec du chargement des options de filtre",
      retry: "Réessayer",
      dismiss: "Fermer",

      // Search and Filters
      searchPlaceholder: "Rechercher les journaux par utilisateur, action ou entité...",
      filterByAction: "Filtrer par action",
      filterByEntity: "Filtrer par entité",
      filterByUser: "Filtrer par utilisateur",
      filterByDate: "Filtrer par date",
      clearFilters: "Effacer les filtres",
      allActions: "Toutes les actions",
      allEntities: "Toutes les entités",
      allUsers: "Tous les utilisateurs",

      // Action Types
      actionCreate: "Créer",
      actionUpdate: "Mettre à jour",
      actionDelete: "Supprimer",

      // Entity Types
      entityMenuCategory: "Catégorie de menu",
      entityMenuItem: "Article de menu",
      entityUser: "Utilisateur",
      entityOrder: "Commande",
      entityCampaign: "Campagne",
      entityBranchSettings: "Paramètres de succursale",

      // Table Headers
      tableHeaderUser: "Utilisateur",
      tableHeaderAction: "Action",
      tableHeaderEntity: "Entité",
      tableHeaderChanges: "Modifications",
      tableHeaderDate: "Date",
      tableHeaderTime: "Heure",

      // Table Content
      noLogsFound: "Aucun journal d'activité trouvé",
      noLogsFoundDesc: "Aucun journal ne correspond à vos filtres actuels ou il n'y a pas encore d'activités",

      // Stats Cards
      totalLogs: "Total des journaux",
      logsToday: "Journaux aujourd'hui",
      mostActiveUser: "Utilisateur le plus actif",
      topAction: "Action principale",

      // Pagination
      page: "Page",
      of: "de",
      showing: "Affichage",
      to: "à",
      entries: "entrées",
      previous: "Précédent",
      next: "Suivant",

      // Export
      export: "Exporter",
      exportCSV: "Exporter CSV",
      exportPDF: "Exporter PDF",
      exporting: "Exportation...",
      exportSuccess: "Exportation terminée avec succès",
      exportFailed: "Échec de l'exportation",

      // Changes Detail
      viewChanges: "Voir les modifications",
      changes: "Modifications",
      before: "Avant",
      after: "Après",
      noChanges: "Aucune modification enregistrée",

      // User Info
      unknownUser: "Utilisateur inconnu",
      systemUser: "Système",

      // Date/Time
      justNow: "À l'instant",
      minuteAgo: "Il y a 1 minute",
      minutesAgo: "Il y a {minutes} minutes",
      hourAgo: "Il y a 1 heure",
      hoursAgo: "Il y a {hours} heures",
      dayAgo: "Il y a 1 jour",
      daysAgo: "Il y a {days} jours",

      // Empty States
      noActivity: "Aucune activité",
      noActivityDesc: "Aucune activité n'a été enregistrée pour cette chaîne. Les actions des utilisateurs apparaîtront ici au fur et à mesure.",
      startActivity: "L'activité apparaîtra ici lorsque les utilisateurs interagiront avec le système",

      // Filter Summary
      filterSummary: "Affichage de {count} journaux",
      filterSummaryFiltered: "Affichage de {count} sur {total} journaux (filtrés)"
    }
  }
} as const

export type Language = keyof typeof translations
export type TranslationKeys = typeof translations.en
