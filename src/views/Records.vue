<template>
  <div class="records-page">
    <!-- 顶部导航 -->
    <van-nav-bar title="记账">
      <template #right>
        <van-icon name="plus" size="20" @click="showAddDrawer = true" />
      </template>
    </van-nav-bar>

    <!-- 月份选择器 -->
    <div class="month-selector">
      <van-dropdown-menu>
        <van-dropdown-item v-model="selectedMonth" :options="monthOptions" />
      </van-dropdown-menu>
    </div>

    <!-- 月度统计 -->
    <div class="monthly-stats">
      <div class="stat-item">
        <span class="label">支出</span>
        <span class="value expense">¥{{ monthlyStats.expense.toFixed(2) }}</span>
      </div>
      <div class="stat-item">
        <span class="label">收入</span>
        <span class="value income">¥{{ monthlyStats.income.toFixed(2) }}</span>
      </div>
      <div class="stat-item">
        <span class="label">结余</span>
        <span class="value" :class="{ positive: monthlyStats.balance >= 0 }">
          ¥{{ monthlyStats.balance.toFixed(2) }}
        </span>
      </div>
    </div>

    <!-- 记账列表 -->
    <div v-if="initialLoading" class="loading-container">
      <van-loading size="24px">加载中...</van-loading>
    </div>
    
    <van-pull-refresh v-else v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <div v-for="group in groupedRecords" :key="group.date" class="record-group">
          <div class="group-header">
            <span class="date">{{ formatDate(group.date) }}</span>
            <span class="total">
              支: ¥{{ group.expense.toFixed(2) }} | 收: ¥{{ group.income.toFixed(2) }}
            </span>
          </div>
          
          <van-swipe-cell v-for="record in group.records" :key="record.id">
            <van-cell :title="getRecordTitle(record)" is-link @click="editRecord(record)">
              <template #icon>
                <div class="record-icon" :style="{ background: getTagColor(record) }">
                  {{ getTagIcon(record) }}
                </div>
              </template>
              <template #value>
                <span :class="['amount', record.type]">
                  {{ record.type === 'expense' ? '-' : '+' }}¥{{ record.amount.toFixed(2) }}
                </span>
              </template>
              <template #label>
                <span v-if="record.note">{{ record.note }}</span>
              </template>
            </van-cell>
            <template #right>
              <van-button square type="danger" text="删除" @click="confirmDelete(record)" />
            </template>
          </van-swipe-cell>
        </div>

        <van-empty v-if="!loading && records.length === 0" description="暂无记账数据" />
      </van-list>
    </van-pull-refresh>

    <!-- 添加/编辑记账抽屉 -->
    <van-popup
      v-model:show="showAddDrawer"
      position="bottom"
      :style="{ height: '80%' }"
      round
    >
      <div class="record-form">
        <van-nav-bar :title="editingRecord ? '编辑记账' : '添加记账'">
          <template #left>
            <van-icon name="cross" size="20" @click="closeDrawer" />
          </template>
          <template #right>
            <van-button type="primary" size="small" :loading="saving" @click="saveRecord">
              保存
            </van-button>
          </template>
        </van-nav-bar>

        <van-cell-group inset>
          <!-- 类型选择 -->
          <van-field label="类型">
            <template #input>
              <van-radio-group v-model="formData.type" direction="horizontal">
                <van-radio name="expense">支出</van-radio>
                <van-radio name="income">收入</van-radio>
              </van-radio-group>
            </template>
          </van-field>

          <!-- 金额 -->
          <van-field
            v-model="formData.amount"
            type="number"
            label="金额"
            placeholder="请输入金额"
            :rules="[{ required: true, message: '请输入金额' }]"
          >
            <template #button>
              <span>元</span>
            </template>
          </van-field>

          <!-- 日期 -->
          <van-field
            v-model="formData.date"
            is-link
            readonly
            label="日期"
            placeholder="选择日期"
            @click="showDatePicker = true"
          />

          <!-- 标签 -->
          <van-field label="标签">
            <template #input>
              <div class="tag-selector">
                <van-tag
                  v-for="tag in availableTags"
                  :key="tag.id"
                  :type="formData.tagIds.includes(tag.id) ? 'primary' : 'default'"
                  :color="formData.tagIds.includes(tag.id) ? tag.color : ''"
                  size="medium"
                  @click="toggleTag(tag.id)"
                >
                  {{ tag.name }}
                </van-tag>
              </div>
            </template>
          </van-field>

          <!-- 备注 -->
          <van-field
            v-model="formData.note"
            label="备注"
            placeholder="请输入备注（可选）"
            rows="2"
            autosize
            type="textarea"
          />
        </van-cell-group>
      </div>
    </van-popup>

    <!-- 日期选择器 -->
    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-date-picker
        v-model="currentDate"
        title="选择日期"
        :min-date="minDate"
        :max-date="maxDate"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false"
      />
    </van-popup>

    <!-- 删除确认 -->
    <van-dialog v-model:show="showDeleteDialog" title="确认删除" show-cancel-button @confirm="doDelete">
      <p style="text-align: center; padding: 20px;">确定要删除这条记账吗？</p>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRecordsStore } from '@/stores/records'
import { useTagsStore } from '@/stores/tags'
import { showToast, showSuccessToast } from 'vant'
import dayjs from 'dayjs'

const recordsStore = useRecordsStore()
const tagsStore = useTagsStore()

// 状态
const loading = ref(false)
const refreshing = ref(false)
const initialLoading = ref(true)
const finished = ref(true)
const saving = ref(false)
const showAddDrawer = ref(false)
const showDatePicker = ref(false)
const showDeleteDialog = ref(false)
const editingRecord = ref(null)
const deletingRecord = ref(null)

// 月份选择
const selectedMonth = ref(dayjs().format('YYYY-MM'))

// 表单数据
const formData = ref({
  type: 'expense',
  amount: '',
  date: dayjs().format('YYYY-MM-DD'),
  tagIds: [],
  note: ''
})

// 日期选择器
const currentDate = ref(['2024', '01', '01'])
const minDate = new Date(2020, 0, 1)
const maxDate = new Date(2030, 11, 31)

// 计算属性
const records = computed(() => {
  if (!selectedMonth.value) return recordsStore.records
  
  const [year, month] = selectedMonth.value.split('-').map(Number)
  return recordsStore.getRecordsByMonth(year, month)
})

const monthlyStats = computed(() => {
  if (!selectedMonth.value) {
    return recordsStore.getStatistics()
  }
  const [year, month] = selectedMonth.value.split('-').map(Number)
  const monthRecords = recordsStore.getRecordsByMonth(year, month)
  return recordsStore.getStatistics(monthRecords)
})

const monthOptions = computed(() => {
  const options = [{ text: '全部', value: '' }]
  
  // 添加最近12个月
  for (let i = 0; i < 12; i++) {
    const m = dayjs().subtract(i, 'month')
    options.push({
      text: m.format('YYYY年MM月'),
      value: m.format('YYYY-MM')
    })
  }
  
  // 添加有记录的月份
  recordsStore.availableMonths.forEach(m => {
    if (!options.find(o => o.value === m)) {
      options.push({
        text: dayjs(m).format('YYYY年MM月'),
        value: m
      })
    }
  })
  
  return options
})

const availableTags = computed(() => {
  if (formData.value.type === 'expense') {
    return tagsStore.expenseTags
  } else if (formData.value.type === 'income') {
    return tagsStore.incomeTags
  }
  return tagsStore.tags
})

// 按日期分组
const groupedRecords = computed(() => {
  const groups = {}
  records.value.forEach(record => {
    const date = record.date
    if (!groups[date]) {
      groups[date] = {
        date,
        records: [],
        expense: 0,
        income: 0
      }
    }
    groups[date].records.push(record)
    if (record.type === 'expense') {
      groups[date].expense += record.amount
    } else {
      groups[date].income += record.amount
    }
  })
  
  return Object.values(groups).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )
})

// 方法
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const formatDate = (date) => {
  const d = dayjs(date)
  const today = dayjs()
  
  if (d.isSame(today, 'day')) return '今天'
  if (d.isSame(today.subtract(1, 'day'), 'day')) return '昨天'
  
  return d.format('MM月DD日') + ' ' + weekdays[d.day()]
}

const getRecordTitle = (record) => {
  const tags = tagsStore.getTagsByIds(record.tagIds)
  return tags.length > 0 ? tags.map(t => t.name).join('、') : '未分类'
}

const getTagColor = (record) => {
  const tags = tagsStore.getTagsByIds(record.tagIds)
  return tags.length > 0 ? tags[0].color : '#969799'
}

const getTagIcon = (record) => {
  const tags = tagsStore.getTagsByIds(record.tagIds)
  return tags.length > 0 ? tags[0].name.charAt(0) : '?'
}

const toggleTag = (tagId) => {
  const index = formData.value.tagIds.indexOf(tagId)
  if (index > -1) {
    formData.value.tagIds.splice(index, 1)
  } else {
    formData.value.tagIds.push(tagId)
  }
}

const onRefresh = async () => {
  await recordsStore.init()
  refreshing.value = false
}

const onLoad = () => {
  // 已全部加载
  finished.value = true
}

const onDateConfirm = ({ selectedValues }) => {
  formData.value.date = selectedValues.join('-')
  showDatePicker.value = false
}

const editRecord = (record) => {
  editingRecord.value = record
  formData.value = {
    type: record.type,
    amount: String(record.amount),
    date: record.date,
    tagIds: [...(record.tagIds || [])],
    note: record.note || ''
  }
  currentDate.value = record.date.split('-')
  showAddDrawer.value = true
}

const closeDrawer = () => {
  showAddDrawer.value = false
  editingRecord.value = null
  formData.value = {
    type: 'expense',
    amount: '',
    date: dayjs().format('YYYY-MM-DD'),
    tagIds: [],
    note: ''
  }
}

const saveRecord = async () => {
  if (!formData.value.amount || Number(formData.value.amount) <= 0) {
    showToast('请输入有效金额')
    return
  }

  saving.value = true
  try {
    const data = {
      ...formData.value,
      amount: Number(formData.value.amount)
    }

    if (editingRecord.value) {
      await recordsStore.updateRecord(editingRecord.value.id, data)
      showSuccessToast('更新成功')
    } else {
      await recordsStore.addRecord(data)
      showSuccessToast('添加成功')
    }

    closeDrawer()
  } catch (e) {
    showToast('保存失败')
  } finally {
    saving.value = false
  }
}

const confirmDelete = (record) => {
  deletingRecord.value = record
  showDeleteDialog.value = true
}

const doDelete = async () => {
  if (deletingRecord.value) {
    await recordsStore.deleteRecord(deletingRecord.value.id)
    showSuccessToast('删除成功')
    deletingRecord.value = null
  }
}

// 监听类型变化，清除不匹配的标签
watch(() => formData.value.type, (newType) => {
  const validTags = availableTags.value.map(t => t.id)
  formData.value.tagIds = formData.value.tagIds.filter(id => validTags.includes(id))
})

// 初始化
onMounted(async () => {
  initialLoading.value = true
  await Promise.all([
    recordsStore.init(),
    tagsStore.init()
  ])
  initialLoading.value = false
})
</script>

<style scoped>
.records-page {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 60px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.month-selector {
  background: white;
}

.monthly-stats {
  display: flex;
  justify-content: space-around;
  padding: 16px;
  background: white;
  margin-bottom: 12px;
}

.stat-item {
  text-align: center;
}

.stat-item .label {
  display: block;
  font-size: 12px;
  color: #969799;
  margin-bottom: 4px;
}

.stat-item .value {
  font-size: 16px;
  font-weight: bold;
}

.stat-item .value.expense {
  color: #ee0a24;
}

.stat-item .value.income {
  color: #07c160;
}

.stat-item .value.positive {
  color: #07c160;
}

.record-group {
  margin-bottom: 12px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  font-size: 14px;
}

.group-header .date {
  font-weight: bold;
}

.group-header .total {
  color: #969799;
  font-size: 12px;
}

.record-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  margin-right: 12px;
  flex-shrink: 0;
}

.record-icon :deep(.van-cell__value) {
  display: flex;
  align-items: center;
}

.amount {
  font-weight: bold;
  font-size: 16px;
}

.amount.expense {
  color: #ee0a24;
}

.amount.income {
  color: #07c160;
}

.record-form {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tag-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
