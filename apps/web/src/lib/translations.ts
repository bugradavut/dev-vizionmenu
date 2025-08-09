// Centralized translations for Vision Menu
// Canadian French (fr-CA) vs European French (fr) considerations

export const translations = {
  en: {
    // Navigation
    navigation: {
      dashboard: "Dashboard",
      orders: "Orders", 
      liveOrders: "Live Orders",
      orderHistory: "Order History",
      kitchenDisplay: "Kitchen Display",
      menuManagement: "Menu Management",
      settings: "Settings",
      generalSettings: "General Settings",
      branchSettings: "Branch Settings", 
      userManagement: "User Management",
      branch: "Branch",
      
      // Sub-navigation items
      overview: "Overview",
      analytics: "Analytics",
      categories: "Categories",
      items: "Items",
      pricing: "Pricing"
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
      simplifiedModeActive: "Simplified Mode: Active",
      viewLabel: "View:",
      searchPlaceholder: "Search orders, customer, phone",
      filterAll: "All",
      filterNewOrders: "New Orders",
      filterPreparing: "Preparing",
      filterReady: "Ready",
      statusPending: "Pending",
      statusPreparing: "Preparing",
      statusReady: "Ready",
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
      orderReceived: "Order received and pending confirmation",
      kitchenPreparing: "Kitchen is preparing your order", 
      orderReady: "Order is ready for pickup/delivery",
      orderCompleted: "Order has been completed",
      
      // Refund Section
      selectItemsRefund: "Select items below to refund",
      selectAll: "Select All",
      itemsSelected: "item(s) selected",
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
      tax: "Tax (HST)",
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
      rejectOrder: "Reject Order",
      rejecting: "Rejecting...",
      yesRejectOrder: "Yes, Reject Order",
      rejectConfirm: "Are you sure you want to reject this order? This action cannot be undone.",
      kitchenPreparing2: "Kitchen is preparing this order",
      waitingKitchen: "Waiting for kitchen to mark as ready...",
      cancelOrder: "Cancel Order", 
      cancelling: "Cancelling...",
      markCompleted: "Mark as Completed",
      completing: "Completing...",
      orderCompleted2: "Order Completed",
      orderCancelled: "Order Cancelled",
      orderRejected: "Order Rejected",
      orderRejectedDesc: "This order was rejected and cannot be processed",
      
      // Status Labels
      pending: "Pending",
      preparing: "Preparing",
      ready: "Ready",
      completed: "Completed",
      cancelled: "Cancelled",
      rejected: "Rejected"
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
      ready: "Ready",
      preOrders: "Pre-Orders",
      
      // Kanban Column Headers
      inProgressColumn: "IN PROGRESS",
      readyColumn: "READY",
      preOrdersColumn: "PRE-ORDERS",
      
      // Order Status and Actions
      startPrep: "Start Prep",
      markReady: "Mark Ready",
      markReadyNow: "Mark Ready Now",
      markingReady: "Marking Ready...",
      scheduled: "Scheduled",
      
      // Timer and Progress
      readyForManualCheck: "Ready for manual check",
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
        unsavedChanges: "(unsaved changes)",
        
        // Standard Flow
        standardFlow: "Standard Flow",
        standardDesc: "Manually control each order status with full workflow flexibility",
        pending: "Pending",
        confirmed: "Confirmed", 
        preparing: "Preparing",
        ready: "Ready",
        
        // Simplified Flow
        simplifiedFlow: "Simplified Flow",
        simplifiedDesc: "Automatic order acceptance with smart timing based on menu prep times",
        autoAccept: "Auto-accept",
        autoReady: "Auto Ready",
        smartTiming: "Smart Timing",
        smartTimingDesc: "Uses prep times from menu items • Defaults to 25 minutes • Takes longest item time for orders"
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
      settingsSavedDesc: "Your order flow preferences have been updated."
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
    }
  },
  
  fr: {
    // Navigation - Canadian French
    navigation: {
      dashboard: "Tableau de bord",
      orders: "Commandes",
      liveOrders: "Commandes en cours",
      orderHistory: "Historique des commandes",
      kitchenDisplay: "Affichage cuisine",
      menuManagement: "Gestion du menu",
      settings: "Paramètres",
      generalSettings: "Paramètres généraux",
      branchSettings: "Paramètres de succursale", 
      userManagement: "Gestion des utilisateurs",
      branch: "Succursale",
      
      // Sub-navigation items
      overview: "Aperçu",
      analytics: "Analyses",
      categories: "Catégories", 
      items: "Articles",
      pricing: "Tarification"
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
      simplifiedModeActive: "Mode simplifié : Actif",
      viewLabel: "Affichage :",
      searchPlaceholder: "Rechercher commandes, client, téléphone",
      filterAll: "Toutes",
      filterNewOrders: "Nouvelles commandes",
      filterPreparing: "En préparation",
      filterReady: "Prêtes",
      statusPending: "En attente",
      statusPreparing: "En préparation", 
      statusReady: "Prête",
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
      orderReceived: "Commande reçue et en attente de confirmation",
      kitchenPreparing: "La cuisine prépare votre commande", 
      orderReady: "Commande prête pour la collecte/livraison",
      orderCompleted: "Commande terminée",
      
      // Refund Section
      selectItemsRefund: "Sélectionnez les articles ci-dessous pour remboursement",
      selectAll: "Tout sélectionner",
      itemsSelected: "article(s) sélectionné(s)",
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
      tax: "Taxe (TVH)",
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
      rejectOrder: "Rejeter la commande",
      rejecting: "Rejet...",
      yesRejectOrder: "Oui, rejeter la commande",
      rejectConfirm: "Êtes-vous sûr de vouloir rejeter cette commande? Cette action ne peut pas être annulée.",
      kitchenPreparing2: "La cuisine prépare cette commande",
      waitingKitchen: "En attente que la cuisine marque comme prête...",
      cancelOrder: "Annuler la commande", 
      cancelling: "Annulation...",
      markCompleted: "Marquer comme terminée",
      completing: "Finalisation...",
      orderCompleted2: "Commande terminée",
      orderCancelled: "Commande annulée",
      orderRejected: "Commande rejetée",
      orderRejectedDesc: "Cette commande a été rejetée et ne peut pas être traitée",
      
      // Status Labels
      pending: "En attente",
      preparing: "En préparation",
      ready: "Prête",
      completed: "Terminée",
      cancelled: "Annulée",
      rejected: "Rejetée"
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
      ready: "Prêtes",
      preOrders: "Précommandes",
      
      // Kanban Column Headers
      inProgressColumn: "EN COURS",
      readyColumn: "PRÊTES",
      preOrdersColumn: "PRÉCOMMANDES",
      
      // Order Status and Actions
      startPrep: "Commencer la préparation",
      markReady: "Marquer comme prête",
      markReadyNow: "Marquer comme prête maintenant",
      markingReady: "Marquage en cours...",
      scheduled: "Planifiée",
      
      // Timer and Progress
      readyForManualCheck: "Prête pour vérification manuelle",
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
        unsavedChanges: "(modifications non sauvegardées)",
        
        // Standard Flow
        standardFlow: "Flux standard",
        standardDesc: "Contrôlez manuellement chaque statut de commande avec une flexibilité complète du flux de travail",
        pending: "En attente",
        confirmed: "Confirmée", 
        preparing: "En préparation",
        ready: "Prête",
        
        // Simplified Flow
        simplifiedFlow: "Flux simplifié",
        simplifiedDesc: "Acceptation automatique des commandes avec chronométrage intelligent basé sur les temps de préparation du menu",
        autoAccept: "Acceptation automatique",
        autoReady: "Prête automatiquement",
        smartTiming: "Chronométrage intelligent",
        smartTimingDesc: "Utilise les temps de préparation des articles du menu • Par défaut 25 minutes • Prend le temps de l'article le plus long pour les commandes"
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
      settingsSavedDesc: "Vos préférences de flux de commandes ont été mises à jour."
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
    }
  }
} as const

export type Language = keyof typeof translations
export type TranslationKeys = typeof translations.en