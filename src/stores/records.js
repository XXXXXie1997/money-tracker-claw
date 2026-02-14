import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { recordsStore } from '@/utils/storage'
import dayjs from 'dayjs'

export const useRecordsStore = defineStore('records', () => {
  // 状态
  const records = ref([])
  const loading = ref(false)

  // 初始化 - 从本地存储加载数据
  const init = async () => {
    loading.value = true
    try {
      const data = await recordsStore.getItem('records')
      if (data && Array.isArray(data)) {
        records.value = data.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      }
    } catch (e) {
      console.error('加载记账数据失败:', e)
    } finally {
      loading.value = false
    }
  }

  // 保存到本地存储
  const saveToStorage = async () => {
    try {
      await recordsStore.setItem('records', records.value)
    } catch (e) {
      console.error('保存记账数据失败:', e)
    }
  }

  // 生成唯一ID
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  // 添加记账
  const addRecord = async (record) => {
    const newRecord = {
      id: generateId(),
      amount: Number(record.amount),
      type: record.type, // 'expense' | 'income'
      date: record.date || dayjs().format('YYYY-MM-DD'),
      tagIds: record.tagIds || [],
      note: record.note || '',
      createTime: new Date().toISOString()
    }
    
    records.value.unshift(newRecord)
    records.value.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    
    await saveToStorage()
    return newRecord
  }

  // 更新记账
  const updateRecord = async (id, updates) => {
    const index = records.value.findIndex(r => r.id === id)
    if (index !== -1) {
      records.value[index] = {
        ...records.value[index],
        ...updates,
        updateTime: new Date().toISOString()
      }
      // 重新排序
      records.value.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      await saveToStorage()
      return records.value[index]
    }
    return null
  }

  // 删除记账
  const deleteRecord = async (id) => {
    const index = records.value.findIndex(r => r.id === id)
    if (index !== -1) {
      records.value.splice(index, 1)
      await saveToStorage()
      return true
    }
    return false
  }

  // 获取单个记账
  const getRecord = (id) => {
    return records.value.find(r => r.id === id)
  }

  // 按月份筛选
  const getRecordsByMonth = (year, month) => {
    return records.value.filter(r => {
      const d = dayjs(r.date)
      return d.year() === year && d.month() + 1 === month
    })
  }

  // 按日期范围筛选
  const getRecordsByDateRange = (startDate, endDate) => {
    return records.value.filter(r => {
      const d = dayjs(r.date)
      return d.isAfter(dayjs(startDate).subtract(1, 'day')) && 
             d.isBefore(dayjs(endDate).add(1, 'day'))
    })
  }

  // 获取可用月份列表
  const availableMonths = computed(() => {
    const months = new Set()
    records.value.forEach(r => {
      const d = dayjs(r.date)
      months.add(`${d.year()}-${String(d.month() + 1).padStart(2, '0')}`)
    })
    return Array.from(months).sort().reverse()
  })

  // 统计
  const getStatistics = (recordList = records.value) => {
    const expense = recordList
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0)
    
    const income = recordList
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0)
    
    return {
      expense,
      income,
      balance: income - expense,
      count: recordList.length
    }
  }

  // 清空所有数据
  const clearAll = async () => {
    records.value = []
    await saveToStorage()
  }

  // 导入数据
  const importData = async (data) => {
    if (data && Array.isArray(data)) {
      records.value = data.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      await saveToStorage()
    }
  }

  // 导出数据
  const exportData = () => {
    return records.value
  }

  return {
    records,
    loading,
    init,
    addRecord,
    updateRecord,
    deleteRecord,
    getRecord,
    getRecordsByMonth,
    getRecordsByDateRange,
    availableMonths,
    getStatistics,
    saveToStorage,
    clearAll,
    importData,
    exportData
  }
})
