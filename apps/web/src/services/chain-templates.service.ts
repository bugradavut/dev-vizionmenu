// =====================================================
// CHAIN TEMPLATES SERVICE
// Frontend service for chain menu templates
// =====================================================

import { apiClient } from './api-client'

export interface ChainTemplate {
  id: string
  name: string
  description?: string
  icon?: string
  template_type: 'category' | 'item'
  items_count: number
  created_at: string
  updated_at: string
  version: number
}

export interface ChainTemplatesResponse {
  data: {
    categories: ChainTemplate[]
    items: ChainTemplate[]
  }
  meta: {
    total: number
    categories: number
    items: number
  }
}

export interface CreateTemplateRequest {
  name: string
  description?: string
  icon?: string
  template_type: 'category' | 'item'
  category_id?: string
  price?: number
  image_url?: string
  ingredients?: string[]
  allergens?: string[]
  nutritional_info?: object
  items?: Array<{
    name: string
    description?: string
    price: number
    allergens?: string[]
    dietary_info?: string[]
    preparation_time?: number
  }>
}

export interface CreateFromCategoryRequest {
  category_id: string
  name?: string
  description?: string
}

export interface ImportTemplateRequest {
  branch_id: string
}

export interface ImportResult {
  success: boolean
  template_name: string
  categories_created: number
  items_created: number
  errors: string[]
  message: string
}

class ChainTemplatesService {

  /**
   * Get all templates for a chain
   */
  async getChainTemplates(chainId: string, templateType?: 'category' | 'item'): Promise<ChainTemplatesResponse> {
    const params: Record<string, unknown> = {}
    if (templateType) {
      params.template_type = templateType
    }

    const result = await apiClient.get<ChainTemplatesResponse>(`/api/v1/chains/${chainId}/templates`, params)
    return result.data
  }

  /**
   * Create a new custom template
   */
  async createTemplate(chainId: string, templateData: CreateTemplateRequest): Promise<ChainTemplate> {
    const result = await apiClient.post<ChainTemplate>(`/api/v1/chains/${chainId}/templates`, templateData)
    return result.data
  }

  /**
   * Create template from existing category
   */
  async createTemplateFromCategory(chainId: string, data: CreateFromCategoryRequest): Promise<ChainTemplate> {
    const result = await apiClient.post<ChainTemplate>(`/api/v1/chains/${chainId}/templates/from-category`, data)
    return result.data
  }

  /**
   * Update existing template
   */
  async updateTemplate(chainId: string, templateId: string, updateData: Partial<CreateTemplateRequest>): Promise<ChainTemplate> {
    const result = await apiClient.put<ChainTemplate>(`/api/v1/chains/${chainId}/templates/${templateId}`, updateData)
    return result.data
  }

  /**
   * Delete template
   */
  async deleteTemplate(chainId: string, templateId: string): Promise<void> {
    await apiClient.delete(`/api/v1/chains/${chainId}/templates/${templateId}`)
  }

  /**
   * Import template to branch
   */
  async importTemplateToBranch(chainId: string, templateId: string, branchId: string): Promise<ImportResult> {
    const result = await apiClient.post<ImportResult>(`/api/v1/chains/${chainId}/templates/${templateId}/import`, { branch_id: branchId })
    return result.data
  }

  /**
   * Import multiple templates to branch
   */
  async importMultipleTemplates(chainId: string, templateIds: string[], branchId: string): Promise<ImportResult[]> {
    const results: ImportResult[] = []

    // Import templates one by one
    for (const templateId of templateIds) {
      try {
        const result = await this.importTemplateToBranch(chainId, templateId, branchId)
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          template_name: `Template ${templateId}`,
          categories_created: 0,
          items_created: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          message: 'Import failed'
        })
      }
    }

    return results
  }
}

// Export singleton instance
export const chainTemplatesService = new ChainTemplatesService()
export default chainTemplatesService