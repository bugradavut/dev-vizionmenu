# Supabase - Simplified Flow Database Updates

**Date:** January 5, 2025  
**Purpose:** Add Simplified Flow support to existing Vision Menu database  
**Status:** ✅ Applied Successfully

## 🎯 What This Does:

### Database Changes Applied:
1. **Cleanup unused tables** (restaurant_users, restaurants)
2. **Fix menu_categories dual column** (remove restaurant_id)  
3. **Add default branch settings** for orderFlow support

### Branch Settings Structure:
```json
{
  "orderFlow": "standard",
  "timingSettings": {
    "baseDelay": 20,
    "temporaryBaseDelay": 0,
    "deliveryDelay": 15,
    "temporaryDeliveryDelay": 0,
    "manualReadyOption": true
  }
}
```

## 📜 SQL Code (Already Applied):

```sql
-- SIMPLIFIED FLOW UPDATE - 2025-01-05
-- SAFE: No data will be lost

-- Clean up old unused tables
DROP TABLE IF EXISTS restaurant_users CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;

-- Fix menu_categories dual column issue  
ALTER TABLE menu_categories DROP COLUMN IF EXISTS restaurant_id;

-- Add default orderFlow settings to existing branches
UPDATE branches 
SET settings = COALESCE(settings, '{}') || '{
  "orderFlow": "standard",
  "timingSettings": {
    "baseDelay": 20,
    "temporaryBaseDelay": 0,
    "deliveryDelay": 15,
    "temporaryDeliveryDelay": 0,
    "manualReadyOption": true
  }
}'::jsonb
WHERE settings->'orderFlow' IS NULL;

-- Verify it worked
SELECT name, settings->'orderFlow' as flow FROM branches;
```

## ✅ Results:
- **Downtown Branch** → standard
- **Mall Branch** → standard  
- **Airport Branch** → standard

## 🚀 Next Steps:
1. Backend API endpoints for branch settings
2. Frontend conditional rendering
3. Auto-accept mechanism
4. Timer service implementation

---
**Note:** This was applied via Supabase SQL Editor on January 5, 2025. Original database schema remains in `Supabase.md`.