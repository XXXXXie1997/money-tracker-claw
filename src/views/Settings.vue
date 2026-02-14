<template>
  <div class="settings-page">
    <!-- 顶部导航 -->
    <van-nav-bar title="设置" />

    <!-- 数据管理 -->
    <van-cell-group inset title="数据管理">
      <!-- 数据导出 -->
      <van-cell title="导出数据" is-link @click="exportData">
        <template #icon>
          <van-icon name="down" class="cell-icon" />
        </template>
        <template #label>
          <span class="cell-label">导出JSON格式文件，可用于备份</span>
        </template>
      </van-cell>

      <!-- 数据导入 -->
      <van-cell title="导入数据" is-link @click="triggerImport">
        <template #icon>
          <van-icon name="upgrade" class="cell-icon" />
        </template>
        <template #label>
          <span class="cell-label">从JSON文件恢复数据</span>
        </template>
      </van-cell>
      <input
        ref="fileInput"
        type="file"
        accept=".json"
        style="display: none"
        @change="handleFileSelect"
      />

      <!-- 清空数据 -->
      <van-cell title="清空所有数据" is-link @click="showClearConfirm = true">
        <template #icon>
          <van-icon name="delete-o" class="cell-icon danger" />
        </template>
        <template #label>
          <span class="cell-label danger">删除所有记账和标签数据</span>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 显示设置 -->
    <van-cell-group inset title="显示设置">
      <van-cell title="暗色模式">
        <template #icon>
          <van-icon name="eye-o" class="cell-icon" />
        </template>
        <template #right-icon>
          <van-switch v-model="darkMode" size="24" @change="toggleDarkMode" />
        </template>
      </van-cell>

      <van-cell title="累计数据统计">
        <template #icon>
          <van-icon name="chart-trending-o" class="cell-icon" />
        </template>
        <template #right-icon>
          <van-switch v-model="showCumulative" size="24" />
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 数据统计 -->
    <van-cell-group inset title="数据统计">
      <van-cell title="总记账数" :value="totalRecords + ' 笔'" />
      <van-cell title="总支出" :value="'¥' + totalExpense.toFixed(2)" />
      <van-cell title="总收入" :value="'¥' + totalIncome.toFixed(2)" />
      <van-cell title="标签数量" :value="totalTags + ' 个'" />
      <van-cell title="数据存储位置" value="浏览器本地" />
    </van-cell-group>

    <!-- 关于 -->
    <van-cell-group inset title="关于">
      <van-cell title="应用名称" value="Money Tracker" />
      <van-cell title="版本号" value="1.0.0" />
      <van-cell title="作者" value="Tianyu Xie" />
      <van-cell title="技术栈" value="Vue 3 + Vant + Pinia" />
      <van-cell title="项目地址" is-link url="https://github.com" />
    </van-cell-group>

    <!-- 底部信息 -->
    <div class="footer">
      <p>Money Tracker v1.0.0</p>
      <p class="copyright">© 2026 Tianyu Xie. All rights reserved.</p>
    </div>

    <!-- 清空数据确认 -->
    <van-dialog
      v-model:show="showClearConfirm"
      title="确认清空"
      show-cancel-button
      :before-close="beforeClearClose"
    >
      <div class="confirm-content">
        <p>确定要清空所有数据吗？</p>
        <p class="warning">此操作不可恢复！</p>
        <p class="hint">建议先导出数据备份</p>
      </div>
    </van-dialog>

    <!-- 导入确认 -->
    <van-dialog
      v-model:show="showImportConfirm"
      title="确认导入"
      show-cancel-button
      :before-close="beforeImportClose"
    >
      <div class="confirm-content">
        <p>确定要导入数据吗？</p>
        <p class="warning">当前数据将被覆盖！</p>
        <p class="hint">建议先导出当前数据备份</p>
      </div>
    </van-dialog>

    <!-- Loading 遮罩 -->
    <van-overlay :show="loading" class="loading-overlay">
      <van-loading type="spinner" color="#1989fa" />
    </van-overlay>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRecordsStore } from '@/stores/records'
import { useTagsStore } from '@/stores/tags'
import { showSuccessToast, showFailToast, showToast } from 'vant'

const recordsStore = useRecordsStore()
const tagsStore = useTagsStore()

// 状态
const fileInput = ref(null)
const loading = ref(false)
const showClearConfirm = ref(false)
const showImportConfirm = ref(false)
const importData = ref(null)
const darkMode = ref(false)
const showCumulative = ref(true)

// 计算属性
const totalRecords = computed(() => recordsStore.records.length)
const totalTags = computed(() => tagsStore.tags.length)
const totalExpense = computed(() => {
  return recordsStore.records
    .filter(r => r.type === 'expense')
    .reduce((sum, r) => sum + r.amount, 0)
})
const totalIncome = computed(() => {
  return recordsStore.records
    .filter(r => r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0)
})

// 导出数据
const exportData = () => {
  loading.value = true
  
  try {
    const data = {
      version: '1.0.0',
      exportTime: new Date().toISOString(),
      records: recordsStore.records,
      tags: tagsStore.tags
    }
    
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `money-tracker-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    showSuccessToast('导出成功')
  } catch (e) {
    console.error('导出失败:', e)
    showFailToast('导出失败')
  } finally {
    loading.value = false
  }
}

// 触发文件选择
const triggerImport = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      
      // 验证数据格式
      if (!data.records || !Array.isArray(data.records)) {
        showFailToast('无效的数据文件')
        return
      }
      
      importData.value = data
      showImportConfirm.value = true
    } catch (err) {
      console.error('解析文件失败:', err)
      showFailToast('解析文件失败')
    }
  }
  reader.readAsText(file)
  
  // 清空input以便重复选择同一文件
  event.target.value = ''
}

// 导入确认回调
const beforeImportClose = async (action) => {
  if (action !== 'confirm') {
    importData.value = null
    return true
  }
  
  if (!importData.value) return true
  
  loading.value = true
  
  try {
    // 导入标签
    if (importData.value.tags && Array.isArray(importData.value.tags)) {
      await tagsStore.importData(importData.value.tags)
    }
    
    // 导入记账
    if (importData.value.records && Array.isArray(importData.value.records)) {
      await recordsStore.importData(importData.value.records)
    }
    
    showSuccessToast('导入成功')
    importData.value = null
    return true
  } catch (e) {
    console.error('导入失败:', e)
    showFailToast('导入失败')
    return false
  } finally {
    loading.value = false
  }
}

// 清空确认回调
const beforeClearClose = async (action) => {
  if (action !== 'confirm') return true
  
  loading.value = true
  
  try {
    // 清空记账数据
    await recordsStore.clearAll()
    
    // 清空标签数据
    await tagsStore.clearAll()
    
    showSuccessToast('数据已清空')
    return true
  } catch (e) {
    console.error('清空失败:', e)
    showFailToast('清空失败')
    return false
  } finally {
    loading.value = false
  }
}

// 切换暗色模式
const toggleDarkMode = (value) => {
  if (value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem('darkMode', value)
}

// 初始化
onMounted(async () => {
  await Promise.all([
    recordsStore.init(),
    tagsStore.init()
  ])
  
  // 恢复暗色模式设置
  const savedDarkMode = localStorage.getItem('darkMode') === 'true'
  darkMode.value = savedDarkMode
  if (savedDarkMode) {
    document.documentElement.classList.add('dark')
  }
})
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 80px;
}

.cell-icon {
  font-size: 20px;
  margin-right: 12px;
  color: #1989fa;
}

.cell-icon.danger {
  color: #ee0a24;
}

.cell-label {
  font-size: 12px;
  color: #969799;
}

.cell-label.danger {
  color: #ee0a24;
}

.confirm-content {
  padding: 20px;
  text-align: center;
}

.confirm-content p {
  margin-bottom: 8px;
}

.confirm-content .warning {
  color: #ee0a24;
  font-weight: 500;
}

.confirm-content .hint {
  color: #969799;
  font-size: 12px;
}

.loading-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer {
  text-align: center;
  padding: 32px 16px;
  color: #969799;
  font-size: 12px;
}

.footer .copyright {
  margin-top: 8px;
}

/* 暗色模式样式 */
:global(.dark) .settings-page {
  background-color: #1a1a1a;
}

:global(.dark) .van-cell {
  background-color: #2a2a2a;
  color: #e5e5e5;
}

:global(.dark) .van-cell-group {
  background-color: transparent;
}

:global(.dark) .van-cell__label {
  color: #888;
}

:global(.dark) .van-nav-bar {
  background-color: #2a2a2a;
}

:global(.dark) .van-nav-bar__title {
  color: #e5e5e5;
}
</style>
