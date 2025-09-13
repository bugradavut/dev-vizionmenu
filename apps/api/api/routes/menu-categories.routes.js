// =====================================================
// MENU CATEGORIES ROUTES
// Menu categories route definitions
// =====================================================

const express = require('express');
const menuCategoriesController = require('../controllers/menu-categories.controller');
const { requireAuthWithBranch } = require('../middleware/auth.middleware');

const router = express.Router();

// List all categories for branch with optional items
router.get('/', requireAuthWithBranch, menuCategoriesController.getCategories);

// Get detailed category information
router.get('/:id', requireAuthWithBranch, menuCategoriesController.getCategoryById);

// Create new category
router.post('/', requireAuthWithBranch, menuCategoriesController.createCategory);

// Update existing category  
router.patch('/:id', requireAuthWithBranch, menuCategoriesController.updateCategory);

// Delete category (moves items to uncategorized)
router.delete('/:id', requireAuthWithBranch, menuCategoriesController.deleteCategory);

// Toggle category availability instantly
router.patch('/:id/toggle', requireAuthWithBranch, menuCategoriesController.toggleCategoryAvailability);

// Reorder categories (drag & drop support)
router.put('/reorder', requireAuthWithBranch, menuCategoriesController.reorderCategories);

module.exports = router;