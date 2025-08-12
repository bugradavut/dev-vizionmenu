# Vision Menu - Order Flow System Documentation

**Comprehensive guide to the order management system and auto-ready timer functionality**

---

## 📋 Overview

Vision Menu implements a **unified order management system** with a simple **Auto-Ready toggle** that allows restaurants to choose between manual control and automated processing. The system features a single, streamlined workflow with optional automation features that can be enabled or disabled per branch preference.

## 🔄 Order Flow System

### Single Unified Flow
```
Pending → Preparing → Completed
```

**Modern Simplified Architecture:**
- **Single flow type**: No more complex flow selection - one simple workflow
- **Auto-Ready Toggle**: Simple on/off switch for automation features
- **Manual override always available**: Staff can manually complete orders anytime
- **Flexible automation**: Auto-Ready can be toggled per branch/restaurant preference

### Auto-Ready Toggle Behavior

**When Auto-Ready is ENABLED:**
- ✅ Progress bars visible across all pages
- ✅ Real-time timer countdown and progress tracking  
- ✅ Automatic completion for internal orders (QR Code, Web)
- ✅ Manual completion required for third-party orders (Uber Eats, DoorDash, Phone)
- ✅ Background timer service actively monitoring orders

**When Auto-Ready is DISABLED:**
- ❌ No progress bars or timers shown
- ❌ No automatic status transitions
- ✅ Pure manual workflow - staff controls all status changes
- ✅ Standard restaurant operation mode

---

## ⚙️ Auto-Ready Timer System

### Configuration Structure
```typescript
interface TimingSettings {
  autoReady: boolean;              // Enable/disable auto-ready functionality
  baseDelay: number;               // Base preparation time (default: 20 min)
  temporaryBaseDelay: number;      // Temporary adjustment +/- (rush hours, etc.)
  deliveryDelay: number;           // Delivery time (default: 15 min) 
  temporaryDeliveryDelay: number;  // Temporary delivery adjustment
  manualReadyOption: boolean;      // Allow manual "Ready" before timer
}

// Total Kitchen Prep Time = baseDelay + temporaryBaseDelay
// Total Customer Time = baseDelay + temporaryBaseDelay + deliveryDelay + temporaryDeliveryDelay
```

### Timer Calculation Logic

**Kitchen Display (Preparation Focus):**
- Uses: `baseDelay + temporaryBaseDelay`
- Purpose: Shows kitchen staff when food should be ready
- No delivery time included (kitchen doesn't handle delivery)

**Order Detail/Live Orders (Customer Focus):**
- Uses: `baseDelay + temporaryBaseDelay + deliveryDelay + temporaryDeliveryDelay`
- Purpose: Shows when order will be completed and ready for pickup/delivery
- Includes full customer experience timeline

### Third-Party Order Rules

**Auto-Completion Restrictions:**
- **Uber Eats**: Manual completion required
- **DoorDash**: Manual completion required  
- **Phone Orders**: Manual completion required
- **QR Code/Web**: Can use full automation

**Logic:**
```typescript
const isThirdParty = order.source && ['uber_eats', 'doordash', 'phone'].includes(order.source)
const canAutoComplete = !isThirdParty && timerExpired
```

---

## 🖥️ User Interface Implementation

### 1. Live Orders Page (`/orders/live`)

**Features:**
- **Progress Bars**: Small progress bars under order numbers
- **Real-time Updates**: Every second timer updates + smart polling after completion
- **Layout**: Compact design (width: `w-12`, height: `h-1.5`)
- **Countdown**: Shows remaining minutes next to progress bar
- **Auto-Ready Badge**: Blue badge when auto-ready is active

**Progress Bar Design:**
```tsx
<div className="flex items-center gap-2">
  <div className="w-12">
    <Progress value={progressPercent} className="h-1.5 bg-gray-300" />
  </div>
  <div className="text-xs text-orange-600 font-mono">
    {isComplete ? '0m' : `${remainingMinutes}m`}
  </div>
</div>
```

### 2. Order Detail Page (`/orders/[orderId]`)

**Features:**
- **Full Timer Display**: Complete preparation timer with progress bar
- **Smart Polling**: Detects backend auto-completion every 5 seconds after timer expires
- **Real-time Status Updates**: Frontend updates immediately when backend completes order
- **Third-party Notices**: Warns when manual completion required

**Timer Component:**
```tsx
<div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Timer className="h-4 w-4 text-orange-600" />
      <span className="text-sm font-medium text-orange-900">Preparation Timer</span>
    </div>
    <div className="text-sm font-mono font-bold text-orange-700">
      {isComplete ? '00:00' : `${minutes}:${seconds}`}
    </div>
  </div>
  <Progress value={progressPercent} className="h-2 bg-gray-300" />
</div>
```

### 3. Kitchen Display (`/orders/kitchen`)

**Features:**
- **Dual Progress Bars**: Main progress in "In Progress" column + compact in "Pre-Orders"
- **Auto-Completion Detection**: Smart polling when timers expire
- **Third-party Warnings**: Visual notices for manual completion requirements
- **Kitchen-Focused Timing**: Uses only preparation time (no delivery delay)

**Layout:**
- **In Progress Column**: Full progress bar with elapsed/total time display
- **Pre-Orders Column**: Compact progress bar with countdown timer
- **Manual Override**: "Mark as Completed" button available when timer expires

### 4. Order History (`/orders/history`)

**Features:**
- **No Timer Logic**: Historical orders don't need active timing
- **Search Functionality**: Name, phone, order number search
- **Status Filters**: All, Completed, Cancelled, Rejected
- **Date Range Filtering**: Advanced date filtering with quick presets

---

## 🔄 Real-time Update Strategy

### Frontend Polling System

**Smart Polling Logic:**
```typescript
// Only poll when timer is complete and order can auto-complete
useEffect(() => {
  if (timerExpired && canAutoComplete) {
    const pollInterval = setInterval(async () => {
      await refetch() // Check for backend status changes
      if (order.status === 'completed') {
        clearInterval(pollInterval) // Stop polling when completed
      }
    }, 5000) // 5 second intervals for responsive updates
  }
}, [timerExpired, canAutoComplete])
```

### Backend Timer Service

**Auto-completion Process:**
1. **Timer Service**: Background service checks for expired timers every minute
2. **Third-party Check**: Verifies order source before auto-completion
3. **Status Update**: Moves qualifying orders from "preparing" to "completed"
4. **Database Update**: Updates `updated_at` timestamp for frontend detection
5. **Frontend Polling**: Frontend detects change and updates UI

---

## 📊 Progress Bar Specifications

### Visual Design Standards

**Colors:**
- **Background**: `bg-gray-300` (consistent across all pages)
- **Fill - Active**: `bg-orange-500` (preparation in progress)
- **Fill - Complete**: `bg-green-500 animate-pulse` (ready for completion)

**Dimensions:**
- **Live Orders**: `h-1.5` (thin, compact)
- **Order Detail**: `h-2` (slightly thicker for visibility)
- **Kitchen Display**: `h-2` (matches detail page)

**Layout:**
```scss
// Standard progress bar structure
.progress-container {
  background: bg-gray-300; // Consistent background
  height: h-1.5 | h-2;     // Page-specific height
  
  .progress-fill {
    background: bg-orange-500;        // Active state
    background: bg-green-500;         // Complete state
    animation: animate-pulse;         // When complete
    transition: all duration-500;     // Smooth updates
  }
}
```

---

## 🎯 Business Rules Summary

### Order Status Transitions

**Single Unified Flow (Preparing → Completed):**
- **Manual Mode (Auto-Ready OFF)**: Staff manually progresses orders from preparing to completed
- **Automated Mode (Auto-Ready ON)**: 
  - Timer-based completion for internal orders (QR Code, Web)
  - Manual completion required for third-party orders (Uber Eats, DoorDash, Phone)
  - Manual override always available - staff can complete orders before timer expires

### Auto-Ready Toggle Behavior

**When Auto-Ready Toggle is ENABLED:**
- ✅ Progress bars visible on all pages (Live Orders, Order Detail, Kitchen Display)
- ✅ Real-time countdown timers with progress tracking
- ✅ Smart backend polling after timer expiration
- ✅ Third-party manual completion warnings
- ✅ Automatic completion for QR Code and Web orders
- ✅ Auto-Ready badge visible in headers

**When Auto-Ready Toggle is DISABLED:**
- ❌ No progress bars or timers shown anywhere
- ❌ No automatic status changes
- ✅ Pure manual workflow - staff controls all transitions
- ✅ Standard restaurant operation mode

### Platform-Specific Rules

**Internal Orders (QR Code, Web):**
- Full auto-ready automation supported
- Can complete automatically when timer expires
- Real-time progress tracking enabled

**Third-Party Orders (Uber Eats, DoorDash, Phone):**
- Manual completion always required
- Progress tracking shows but doesn't auto-complete
- Visual warnings displayed to staff
- "Manual completion required" notices shown

---

## 🛠️ Technical Implementation Notes

### Key Components

**Timer Service Hook (`useOrderTimer`):**
- Manages backend timer service lifecycle
- Handles start/stop operations
- Provides manual check functionality

**Order Hooks (`useOrders`, `useOrderDetail`):**
- Integrated polling for real-time updates
- Smart refresh logic based on timer states
- Optimized API calls with tab-awareness

**Progress Components:**
- ShadCN Progress component with custom styling
- Conditional rendering based on auto-ready settings
- Responsive design across all screen sizes

### Performance Optimizations

**Efficient Updates:**
- Visual timers update every 1 second locally
- API polling only when necessary (after timer expiration)
- Smart polling stops when order completes
- Tab-awareness prevents unnecessary background requests

**Memory Management:**
- Proper cleanup of intervals and timeouts
- useCallback optimization for expensive calculations
- Conditional rendering to avoid unnecessary components

---

## 📈 Future Enhancement Opportunities

### Potential Improvements

**Real-time WebSocket Integration:**
- Replace polling with WebSocket connections
- Instant status updates without API polling
- Reduced server load and faster responses

**Advanced Timer Features:**
- Kitchen rush hour automatic adjustments
- Machine learning preparation time optimization
- Integration with POS systems for better estimates

**Enhanced Analytics:**
- Timer accuracy tracking
- Completion time analytics
- Performance metrics for different order types

---

## 🔍 Troubleshooting Guide

### Common Issues

**Progress Bars Not Showing:**
- Check if auto-ready is enabled in branch settings
- Verify timing settings are properly configured
- Ensure order status is "preparing"

**Auto-completion Not Working:**
- Confirm backend timer service is running
- Check third-party order restrictions
- Verify polling logic is active after timer expiration

**Timer Calculations Incorrect:**
- Review timing settings configuration
- Check timezone consistency (America/Toronto)
- Verify order updated_at timestamps

### Debug Information

**Useful Console Logs:**
```typescript
// Check timer calculation
const timerInfo = getTimerInfo(order)
console.log('Timer Info:', timerInfo)

// Monitor polling activity
console.log('Polling active for orders:', ordersWithCompletedTimers.length)

// Verify auto-ready settings
console.log('Auto-ready enabled:', settings.timingSettings?.autoReady)
```

---

This documentation provides a comprehensive understanding of Vision Menu's order flow system, ensuring consistent implementation and maintenance across all development sessions.