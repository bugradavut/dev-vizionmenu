// =====================================================
// CHAIN MENU TEMPLATES SERVICE
// Business logic for chain-level menu templates
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get all templates for a chain
 * @param {string} chainId - Chain ID
 * @param {Object} options - Query options
 * @returns {Object} Templates list
 */
async function getChainTemplates(chainId, options = {}) {
  const { template_type } = options;

  let query = supabase
    .from('chain_menu_templates')
    .select('*')
    .eq('chain_id', chainId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  // Filter by template type if specified
  if (template_type) {
    query = query.eq('template_type', template_type);
  }

  const { data: templates, error } = await query;

  if (error) {
    console.error('Templates fetch error:', error);
    throw new Error(`Failed to fetch templates: ${error.message}`);
  }

  // Group templates by type
  const groupedTemplates = {
    categories: [],
    items: []
  };

  // Group item templates by category_id for inclusion in categories
  const itemTemplatesByCategory = {};
  templates.forEach(template => {
    if (template.template_type === 'item' && template.template_data.category_id) {
      const categoryId = template.template_data.category_id;
      if (!itemTemplatesByCategory[categoryId]) {
        itemTemplatesByCategory[categoryId] = [];
      }
      itemTemplatesByCategory[categoryId].push({
        name: template.template_data.name,
        description: template.template_data.description,
        price: template.template_data.price,
        variants: template.template_data.variants || [],
        ingredients: template.template_data.ingredients || [],
        allergens: template.template_data.allergens || [],
        nutritional_info: template.template_data.nutritional_info || {},
        display_order: template.template_data.display_order || 0
      });
    }
  });

  (templates || []).forEach(template => {
    if (template.template_type === 'category') {
      // Include item templates that belong to this category
      const categoryItems = [
        ...(template.template_data.items || []), // Original items in template
        ...(itemTemplatesByCategory[template.id] || []) // Item templates for this category
      ];

      groupedTemplates.categories.push({
        id: template.id,
        name: template.template_data.name,
        description: template.template_data.description,
        icon: template.template_data.icon,
        display_order: template.template_data.display_order || 0,
        template_type: 'category',
        items_count: categoryItems.length,
        created_at: template.created_at,
        updated_at: template.updated_at,
        version: template.version,
        // Include items in template_data for import
        template_data: {
          ...template.template_data,
          items: categoryItems
        }
      });
    } else if (template.template_type === 'item') {
      groupedTemplates.items.push({
        id: template.id,
        name: template.template_data.name,
        description: template.template_data.description,
        price: template.template_data.price,
        category_id: template.template_data.category_id,
        category_name: template.template_data.category_name,
        template_type: 'item',
        items_count: 1,
        created_at: template.created_at,
        updated_at: template.updated_at,
        version: template.version
      });
    }
  });

  return {
    data: groupedTemplates,
    meta: {
      total: templates.length,
      categories: groupedTemplates.categories.length,
      items: groupedTemplates.items.length
    }
  };
}

/**
 * Create new template from existing menu category
 * @param {string} chainId - Chain ID
 * @param {string} categoryId - Source category ID
 * @param {Object} templateData - Template metadata
 * @returns {Object} Created template
 */
async function createTemplateFromCategory(chainId, categoryId, templateData = {}) {
  // Fetch the category with its items
  const { data: category, error: categoryError } = await supabase
    .from('menu_categories')
    .select(`
      id,
      name,
      description,
      display_order,
      icon,
      menu_items (
        id,
        name,
        description,
        price,
        image_url,
        allergens,
        dietary_info,
        preparation_time,
        display_order
      )
    `)
    .eq('id', categoryId)
    .single();

  if (categoryError || !category) {
    throw new Error('Category not found');
  }

  // Verify category belongs to the chain
  const { data: branch, error: branchError } = await supabase
    .from('branches')
    .select('chain_id')
    .eq('id', category.branch_id)
    .single();

  if (branchError || !branch || branch.chain_id !== chainId) {
    throw new Error('Category does not belong to this chain');
  }

  // Create template data
  const template_data = {
    name: category.name,
    description: category.description,
    icon: category.icon,
    display_order: category.display_order,
    items: (category.menu_items || []).map(item => ({
      name: item.name,
      description: item.description,
      price: item.price,
      image_url: item.image_url,
      allergens: item.allergens || [],
      dietary_info: item.dietary_info || [],
      preparation_time: item.preparation_time,
      display_order: item.display_order
    })),
    source_category_id: categoryId,
    ...templateData
  };

  // Insert template
  const { data: createdTemplate, error: createError } = await supabase
    .from('chain_menu_templates')
    .insert({
      chain_id: chainId,
      template_type: 'category',
      template_data: template_data,
      version: 1,
      is_active: true
    })
    .select()
    .single();

  if (createError) {
    console.error('Template creation error:', createError);
    throw new Error('Failed to create template');
  }

  return {
    id: createdTemplate.id,
    name: template_data.name,
    description: template_data.description,
    template_type: 'category',
    items_count: template_data.items.length,
    created_at: createdTemplate.created_at,
    version: createdTemplate.version
  };
}

/**
 * Create custom template (not from existing category)
 * @param {string} chainId - Chain ID
 * @param {Object} templateData - Template data
 * @returns {Object} Created template
 */
async function createCustomTemplate(chainId, templateData) {
  const {
    name,
    description,
    icon,
    template_type = 'category',
    items = [],
    category_id,
    price,
    variants = [],
    ingredients = [],
    allergens = [],
    nutritional_info = {}
  } = templateData;

  if (!name || name.trim().length === 0) {
    throw new Error('Template name is required');
  }

  if (template_type !== 'category' && template_type !== 'item') {
    throw new Error('Template type must be category or item');
  }

  // Prepare template data based on type
  let template_data;

  if (template_type === 'category') {
    template_data = {
      name: name.trim(),
      description: description ? description.trim() : null,
      icon: icon || null,
      display_order: 0,
      items: items
    };
  } else if (template_type === 'item') {
    // For item templates, we need category_id and price
    if (!category_id) {
      throw new Error('Category ID is required for item templates');
    }
    if (!price || price <= 0) {
      throw new Error('Valid price is required for item templates');
    }

    // Get category name for reference
    const { data: categoryTemplate, error: categoryError } = await supabase
      .from('chain_menu_templates')
      .select('template_data')
      .eq('id', category_id)
      .eq('template_type', 'category')
      .single();

    template_data = {
      name: name.trim(),
      description: description ? description.trim() : null,
      price: price,
      category_id: category_id,
      category_name: categoryTemplate?.template_data?.name || 'Unknown Category',
      variants: variants,
      ingredients: ingredients,
      allergens: allergens,
      nutritional_info: nutritional_info,
      display_order: 0
    };
  }

  // Insert template
  const { data: createdTemplate, error: createError } = await supabase
    .from('chain_menu_templates')
    .insert({
      chain_id: chainId,
      template_type: template_type,
      template_data: template_data,
      version: 1,
      is_active: true
    })
    .select()
    .single();

  if (createError) {
    console.error('Template creation error:', createError);
    throw new Error('Failed to create template');
  }

  return {
    id: createdTemplate.id,
    name: template_data.name,
    description: template_data.description,
    template_type: createdTemplate.template_type,
    items_count: template_type === 'category' ? template_data.items.length : 1,
    created_at: createdTemplate.created_at,
    version: createdTemplate.version
  };
}

/**
 * Update existing template
 * @param {string} templateId - Template ID
 * @param {string} chainId - Chain ID for security
 * @param {Object} updateData - Update data
 * @returns {Object} Updated template
 */
async function updateTemplate(templateId, chainId, updateData) {
  // Check if template exists and belongs to chain
  const { data: existingTemplate, error: fetchError } = await supabase
    .from('chain_menu_templates')
    .select('*')
    .eq('id', templateId)
    .eq('chain_id', chainId)
    .single();

  if (fetchError || !existingTemplate) {
    throw new Error('Template not found or access denied');
  }

  // Merge update data with existing template data
  const updatedTemplateData = {
    ...existingTemplate.template_data,
    ...updateData
  };

  // Update template
  const { data: updatedTemplate, error: updateError } = await supabase
    .from('chain_menu_templates')
    .update({
      template_data: updatedTemplateData,
      version: existingTemplate.version + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateId)
    .eq('chain_id', chainId)
    .select()
    .single();

  if (updateError) {
    console.error('Template update error:', updateError);
    throw new Error('Failed to update template');
  }

  return {
    id: updatedTemplate.id,
    name: updatedTemplateData.name,
    description: updatedTemplateData.description,
    template_type: updatedTemplate.template_type,
    version: updatedTemplate.version,
    updated_at: updatedTemplate.updated_at
  };
}

/**
 * Delete template
 * @param {string} templateId - Template ID
 * @param {string} chainId - Chain ID for security
 * @returns {Object} Delete result
 */
async function deleteTemplate(templateId, chainId) {
  // Check if template exists and belongs to chain
  const { data: existingTemplate, error: fetchError } = await supabase
    .from('chain_menu_templates')
    .select('id, template_data')
    .eq('id', templateId)
    .eq('chain_id', chainId)
    .single();

  if (fetchError || !existingTemplate) {
    throw new Error('Template not found or access denied');
  }

  // Soft delete - mark as inactive
  const { error: deleteError } = await supabase
    .from('chain_menu_templates')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateId)
    .eq('chain_id', chainId);

  if (deleteError) {
    console.error('Template delete error:', deleteError);
    throw new Error('Failed to delete template');
  }

  return {
    deleted: true,
    template_id: templateId,
    template_name: existingTemplate.template_data.name,
    message: 'Template deleted successfully'
  };
}

/**
 * Helper function to get chain ID from template ID
 * @param {string} templateId - Template ID
 * @returns {string|null} Chain ID
 */
async function getChainIdFromTemplate(templateId) {
  const { data: template, error } = await supabase
    .from('chain_menu_templates')
    .select('chain_id')
    .eq('id', templateId)
    .eq('is_active', true)
    .single();

  if (error || !template) {
    return null;
  }
  return template.chain_id;
}

/**
 * Import template to branch (create categories and items)
 * @param {string} templateId - Template ID
 * @param {string} branchId - Target branch ID
 * @returns {Object} Import result
 */
async function importTemplateToBranch(templateId, branchId) {
  // Get template with enhanced data (including related items)
  const chainId = await getChainIdFromTemplate(templateId);
  if (!chainId) {
    throw new Error('Template not found or inactive');
  }

  // Use our enhanced getChainTemplates to get template with items included
  const templatesData = await getChainTemplates(chainId);
  const template = templatesData.data.categories.find(t => t.id === templateId);

  if (!template) {
    throw new Error('Template not found');
  }

  // Verify branch belongs to same chain as template
  const { data: branch, error: branchError } = await supabase
    .from('branches')
    .select('chain_id')
    .eq('id', branchId)
    .single();

  if (branchError || !branch || branch.chain_id !== chainId) {
    throw new Error('Branch does not belong to template chain');
  }

  const importResult = {
    categories_created: 0,
    items_created: 0,
    errors: []
  };

  if (template.template_type === 'category') {
    try {
      // Create category
      const categoryData = {
        branch_id: branchId,
        name: template.template_data.name,
        description: template.template_data.description,
        icon: template.template_data.icon,
        display_order: template.template_data.display_order || 0,
        is_active: true,
        source_template_id: templateId,
        is_customized: false,
        last_import_at: new Date().toISOString()
      };

      const { data: createdCategory, error: categoryError } = await supabase
        .from('menu_categories')
        .insert(categoryData)
        .select()
        .single();

      if (categoryError) {
        throw new Error(`Failed to create category: ${categoryError.message}`);
      }

      importResult.categories_created = 1;

      // Create items for this category
      if (template.template_data.items && template.template_data.items.length > 0) {
        for (const itemData of template.template_data.items) {
          try {
            const { error: itemError } = await supabase
              .from('menu_items')
              .insert({
                branch_id: branchId,
                category_id: createdCategory.id,
                name: itemData.name,
                description: itemData.description,
                price: itemData.price,
                image_url: itemData.image_url,
                allergens: itemData.allergens || [],
                dietary_info: itemData.dietary_info || [],
                preparation_time: itemData.preparation_time,
                display_order: itemData.display_order || 0,
                is_available: true,
                source_template_id: templateId,
                is_customized: false,
                last_import_at: new Date().toISOString()
              });

            if (itemError) {
              importResult.errors.push(`Failed to create item "${itemData.name}": ${itemError.message}`);
            } else {
              importResult.items_created++;
            }
          } catch (error) {
            importResult.errors.push(`Failed to create item "${itemData.name}": ${error.message}`);
          }
        }
      }

    } catch (error) {
      importResult.errors.push(error.message);
    }
  }

  return {
    success: importResult.errors.length === 0,
    template_name: template.template_data.name,
    categories_created: importResult.categories_created,
    items_created: importResult.items_created,
    errors: importResult.errors,
    message: importResult.errors.length === 0 ?
      `Template imported successfully: ${importResult.categories_created} categories, ${importResult.items_created} items` :
      `Import completed with ${importResult.errors.length} errors`
  };
}

module.exports = {
  getChainTemplates,
  createTemplateFromCategory,
  createCustomTemplate,
  updateTemplate,
  deleteTemplate,
  importTemplateToBranch
};