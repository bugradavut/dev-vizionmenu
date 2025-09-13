// =====================================================
// MENU ITEMS ROUTES
// Menu items route definitions with photo upload support
// =====================================================

const express = require('express');
// const multer = require('multer'); // TEMPORARILY DISABLED - MULTER NOT INSTALLED
const menuItemsController = require('../controllers/menu-items.controller');
const { requireAuthWithBranch } = require('../middleware/auth.middleware');

const router = express.Router();

// Configure multer for photo uploads (memory storage for Supabase)
// TEMPORARILY DISABLED - MULTER NOT INSTALLED
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB limit
//   },
//   fileFilter: (req, file, cb) => {
//     // Allow only image files
//     if (file.mimetype.startsWith('image/')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Only image files are allowed'), false);
//     }
//   }
// });

// List all menu items with advanced filtering
router.get('/', requireAuthWithBranch, menuItemsController.getMenuItems);

// Get detailed menu item information
router.get('/:id', requireAuthWithBranch, menuItemsController.getMenuItemById);

// Create new menu item with optional photo upload
router.post('/', requireAuthWithBranch, /* upload.single('photo'), */ menuItemsController.createMenuItem);

// Update existing menu item with optional photo upload
router.put('/:id', requireAuthWithBranch, /* upload.single('photo'), */ menuItemsController.updateMenuItem);
router.patch('/:id', requireAuthWithBranch, /* upload.single('photo'), */ menuItemsController.updateMenuItem);

// Delete menu item with photo cleanup
router.delete('/:id', requireAuthWithBranch, menuItemsController.deleteMenuItem);

// Toggle menu item availability instantly
router.patch('/:id/toggle', requireAuthWithBranch, menuItemsController.toggleMenuItemAvailability);

// Duplicate menu item with optional modifications
router.post('/:id/duplicate', requireAuthWithBranch, menuItemsController.duplicateMenuItem);

// Reorder menu items (drag & drop support)
router.put('/reorder', requireAuthWithBranch, menuItemsController.reorderMenuItems);

// Bulk operations on menu items
router.post('/bulk', requireAuthWithBranch, menuItemsController.bulkUpdateMenuItems);

module.exports = router;