import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { tagsStore } from '@/utils/storage'

export const useTagsStore = defineStore('tags', () => {
  // 状态
  const tags = ref([])
  const loading = ref(false)

  // 预设颜色
  const presetColors = [
    '#1989fa', '#07c160', '#ff976a', '#ff5b5b',
    '#9a66e4', '#5c7dfa', '#ee0a24', '#ffcd42',
    '#01d0c4', '#7232dd', '#e8b878', '#6d8a9c'
  ]

  // 预设标签
  const defaultTags = [
    { name: '餐饮', color: '#ff976a', type: 'expense' },
    { name: '交通', color: '#1989fa', type: 'expense' },
    { name: '购物', color: '#ff5b5b', type: 'expense' },
    { name: '娱乐', color: '#9a66e4', type: 'expense' },
    { name: '医疗', color: '#01d0c4', type: 'expense' },
    { name: '工资', color: '#07c160', type: 'income' },
    { name: '理财', color: '#5c7dfa', type: 'income' },
    { name: '其他', color: '#6d8a9c', type: 'both' }
  ]

  // 初始化
  const init = async () => {
    // 防止重复初始化：已在加载中或已有数据
    if (loading.value || tags.value.length > 0) return
    loading.value = true
    try {
      const data = await tagsStore.getItem('tags')
      if (data && Array.isArray(data) && data.length > 0) {
        tags.value = data
        return // 有数据就直接用，不生成默认标签
      }
      // 只有第一次没有任何数据时才生成默认标签
      for (const tag of defaultTags) {
        tags.value.push({
          id: generateId(),
          ...tag,
          createTime: new Date().toISOString()
        })
      }
      await saveToStorage()
    } catch (e) {
      console.error('加载标签数据失败:', e)
    } finally {
      loading.value = false
    }
  }

  // 保存到本地存储
  const saveToStorage = async () => {
    try {
      await tagsStore.setItem('tags', tags.value)
    } catch (e) {
      console.error('保存标签数据失败:', e)
    }
  }

  // 生成唯一ID
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  // 添加标签
  const addTag = async (tag) => {
    // 检查是否已存在同名标签
    const exists = tags.value.some(t => t.name === tag.name.trim())
    if (exists) {
      throw new Error('标签已存在')
    }

    const newTag = {
      id: generateId(),
      name: tag.name.trim(),
      color: tag.color || presetColors[0],
      type: tag.type || 'both', // 'expense' | 'income' | 'both'
      createTime: new Date().toISOString()
    }

    tags.value.push(newTag)
    await saveToStorage()
    return newTag
  }

  // 更新标签
  const updateTag = async (id, updates) => {
    const index = tags.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tags.value[index] = {
        ...tags.value[index],
        ...updates,
        updateTime: new Date().toISOString()
      }
      await saveToStorage()
      return tags.value[index]
    }
    return null
  }

  // 删除标签
  const deleteTag = async (id) => {
    const index = tags.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tags.value.splice(index, 1)
      await saveToStorage()
      return true
    }
    return false
  }

  // 获取单个标签
  const getTag = (id) => {
    return tags.value.find(t => t.id === id)
  }

  // 根据ID列表获取标签
  const getTagsByIds = (ids) => {
    if (!ids || !Array.isArray(ids)) return []
    return tags.value.filter(t => ids.includes(t.id))
  }

  // 按类型筛选标签
  const getTagsByType = (type) => {
    if (!type || type === 'both') return tags.value
    return tags.value.filter(t => t.type === type || t.type === 'both')
  }

  // 获取支出标签
  const expenseTags = computed(() => 
    tags.value.filter(t => t.type === 'expense' || t.type === 'both')
  )

  // 获取收入标签
  const incomeTags = computed(() => 
    tags.value.filter(t => t.type === 'income' || t.type === 'both')
  )

  // 根据使用次数排序（需要传入recordsStore）
  const getTagsWithUsage = (recordsStore) => {
    return tags.value.map(tag => {
      const usageCount = recordsStore.records.filter(r => 
        r.tagIds && r.tagIds.includes(tag.id)
      ).length
      return { ...tag, usageCount }
    }).sort((a, b) => b.usageCount - a.usageCount)
  }

  // 清空所有标签
  const clearAll = async () => {
    tags.value = []
    await saveToStorage()
  }

  // 导入数据
  const importData = async (data) => {
    if (data && Array.isArray(data)) {
      tags.value = data
      await saveToStorage()
    }
  }

  // 导出数据
  const exportData = () => {
    return tags.value
  }

  return {
    tags,
    loading,
    presetColors,
    init,
    addTag,
    updateTag,
    deleteTag,
    getTag,
    getTagsByIds,
    getTagsByType,
    expenseTags,
    incomeTags,
    getTagsWithUsage,
    saveToStorage,
    clearAll,
    importData,
    exportData
  }
})
