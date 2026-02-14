<template>
  <div class="stats-page">
    <van-nav-bar title="统计" />
    
    <!-- Loading状态 -->
    <div v-if="initialLoading" class="loading-container">
      <van-loading size="24px">加载中...</van-loading>
    </div>
    
    <template v-else>
    
    <!-- 时间维度选择器 -->
    <div class="dimension-tabs">
      <van-tabs v-model:active="activeDimension" @change="onDimensionChange">
        <van-tab title="日" name="day" />
        <van-tab title="周" name="week" />
        <van-tab title="月" name="month" />
        <van-tab title="年" name="year" />
      </van-tabs>
    </div>

    <!-- 日期导航 -->
    <div class="date-nav">
      <van-icon name="arrow-left" @click="navigateDate(-1)" />
      <span @click="showDatePicker = true">{{ dateDisplay }}</span>
      <van-icon name="arrow-right" @click="navigateDate(1)" />
    </div>

    <!-- 总览卡片 -->
    <div class="overview-cards">
      <div class="card income">
        <div class="label">总收入</div>
        <div class="value">¥{{ stats.income.toFixed(2) }}</div>
      </div>
      <div class="card expense">
        <div class="label">总支出</div>
        <div class="value">¥{{ stats.expense.toFixed(2) }}</div>
      </div>
      <div class="card balance" :class="{ positive: stats.balance >= 0 }">
        <div class="label">结余</div>
        <div class="value">¥{{ stats.balance.toFixed(2) }}</div>
      </div>
    </div>

    <!-- 标签筛选 -->
    <div class="tag-filter">
      <div class="filter-header" @click="showTagFilter = !showTagFilter">
        <span>标签筛选</span>
        <van-icon :name="showTagFilter ? 'arrow-up' : 'arrow-down'" />
      </div>
      <div v-show="showTagFilter" class="filter-content">
        <van-tag
          v-for="tag in allTags"
          :key="tag.id"
          :type="selectedTagIds.includes(tag.id) ? 'primary' : 'default'"
          :color="selectedTagIds.includes(tag.id) ? tag.color : ''"
          size="medium"
          class="filter-tag"
          @click="toggleTagFilter(tag.id)"
        >
          {{ tag.name }}
        </van-tag>
        <van-tag 
          v-if="selectedTagIds.length > 0" 
          type="warning" 
          size="medium"
          class="filter-tag"
          @click="clearTagFilter"
        >
          清除筛选
        </van-tag>
      </div>
    </div>

    <!-- 趋势图 -->
    <div class="chart-section">
      <div class="section-title">收支趋势</div>
      <div ref="trendChartRef" class="chart-container" v-show="hasTrendData"></div>
      <div v-if="!hasTrendData" class="empty-chart">暂无趋势数据</div>
    </div>

    <!-- 分类占比图 -->
    <div class="chart-section">
      <div class="section-title">支出分类</div>
      <div ref="pieChartRef" class="chart-container"></div>
      <div v-if="categoryData.length === 0" class="empty-chart">
        暂无支出数据
      </div>
    </div>

    <!-- 收入分类图 -->
    <div class="chart-section" v-if="incomeCategoryData.length > 0">
      <div class="section-title">收入分类</div>
      <div ref="incomePieChartRef" class="chart-container"></div>
    </div>

    <!-- 可收起的记账列表 -->
    <div class="records-section">
      <div class="section-header" @click="showRecordsList = !showRecordsList">
        <span class="section-title">记账明细 ({{ filteredRecords.length }}笔)</span>
        <van-icon :name="showRecordsList ? 'arrow-up' : 'arrow-down'" />
      </div>
      
      <div v-show="showRecordsList" class="records-list">
        <van-cell-group inset>
          <van-cell 
            v-for="record in filteredRecords.slice(0, 10)" 
            :key="record.id"
            :title="getRecordTitle(record)"
            :value="(record.type === 'expense' ? '-' : '+') + '¥' + record.amount.toFixed(2)"
            :label="record.date + (record.note ? ' ' + record.note : '')"
          >
            <template #icon>
              <div class="record-icon" :style="{ background: getTagColor(record) }">
                {{ getTagIcon(record) }}
              </div>
            </template>
          </van-cell>
        </van-cell-group>
        <div v-if="filteredRecords.length > 10" class="more-hint">
          仅显示前10条，共 {{ filteredRecords.length }} 条记录
        </div>
        <van-empty v-if="filteredRecords.length === 0" description="暂无记账数据" />
      </div>
    </div>

    <!-- 日期选择器 -->
    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-date-picker
        v-model="pickerDate"
        title="选择日期"
        :columns-type="pickerColumns"
        :min-date="minDate"
        :max-date="maxDate"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false"
      />
    </van-popup>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRecordsStore } from '@/stores/records'
import { useTagsStore } from '@/stores/tags'
import * as echarts from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isoWeek from 'dayjs/plugin/isoWeek'

// 注册ECharts组件
echarts.use([
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer
])

dayjs.extend(weekOfYear)
dayjs.extend(isoWeek)

const recordsStore = useRecordsStore()
const tagsStore = useTagsStore()

// 图表引用
const trendChartRef = ref(null)
const pieChartRef = ref(null)
const incomePieChartRef = ref(null)
let trendChart = null
let pieChart = null
let incomePieChart = null

// 状态
const activeDimension = ref('month')
const currentDate = ref(dayjs())
const showDatePicker = ref(false)
const showTagFilter = ref(false)
const showRecordsList = ref(true)
const selectedTagIds = ref([])
const pickerDate = ref(['2024', '01'])
const initialLoading = ref(true)

// 日期限制
const minDate = new Date(2020, 0, 1)
const maxDate = new Date(2030, 11, 31)

// 计算属性
const allTags = computed(() => tagsStore.tags)

const pickerColumns = computed(() => {
  switch (activeDimension.value) {
    case 'day':
      return ['year', 'month', 'day']
    case 'week':
      return ['year', 'month']
    case 'month':
      return ['year', 'month']
    case 'year':
      return ['year']
    default:
      return ['year', 'month']
  }
})

const dateDisplay = computed(() => {
  const d = currentDate.value
  switch (activeDimension.value) {
    case 'day':
      return d.format('YYYY年MM月DD日')
    case 'week':
      return `${d.year()}年 第${d.isoWeek()}周`
    case 'month':
      return d.format('YYYY年MM月')
    case 'year':
      return d.format('YYYY年')
    default:
      return d.format('YYYY年MM月')
  }
})

// 根据时间维度筛选记录
const filteredRecords = computed(() => {
  let records = recordsStore.records
  const d = currentDate.value

  // 按时间维度筛选
  switch (activeDimension.value) {
    case 'day':
      records = records.filter(r => dayjs(r.date).isSame(d, 'day'))
      break
    case 'week':
      records = records.filter(r => dayjs(r.date).isoWeek() === d.isoWeek() && dayjs(r.date).year() === d.year())
      break
    case 'month':
      records = records.filter(r => dayjs(r.date).isSame(d, 'month'))
      break
    case 'year':
      records = records.filter(r => dayjs(r.date).isSame(d, 'year'))
      break
  }

  // 按标签筛选
  if (selectedTagIds.value.length > 0) {
    records = records.filter(r => 
      r.tagIds && r.tagIds.some(tid => selectedTagIds.value.includes(tid))
    )
  }

  return records
})

const stats = computed(() => recordsStore.getStatistics(filteredRecords.value))

// 检查趋势数据是否为空
const hasTrendData = computed(() => {
  return trendData.value.some(d => d.income > 0 || d.expense > 0)
})

// 分类数据（支出）
const categoryData = computed(() => {
  const expenseRecords = filteredRecords.value.filter(r => r.type === 'expense')
  const categoryMap = new Map()

  expenseRecords.forEach(record => {
    const tagIds = record.tagIds || []
    if (tagIds.length === 0) {
      const current = categoryMap.get('未分类') || 0
      categoryMap.set('未分类', current + record.amount)
    } else {
      tagIds.forEach(tagId => {
        const tag = tagsStore.getTag(tagId)
        const tagName = tag ? tag.name : '未知'
        const tagColor = tag ? tag.color : '#969799'
        const current = categoryMap.get(tagName) || { value: 0, color: tagColor }
        categoryMap.set(tagName, { 
          value: current.value + record.amount, 
          color: tagColor 
        })
      })
    }
  })

  return Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      value: typeof data === 'number' ? data : data.value,
      color: typeof data === 'object' ? data.color : '#969799'
    }))
    .sort((a, b) => b.value - a.value)
})

// 分类数据（收入）
const incomeCategoryData = computed(() => {
  const incomeRecords = filteredRecords.value.filter(r => r.type === 'income')
  const categoryMap = new Map()

  incomeRecords.forEach(record => {
    const tagIds = record.tagIds || []
    if (tagIds.length === 0) {
      const current = categoryMap.get('未分类') || 0
      categoryMap.set('未分类', current + record.amount)
    } else {
      tagIds.forEach(tagId => {
        const tag = tagsStore.getTag(tagId)
        const tagName = tag ? tag.name : '未知'
        const tagColor = tag ? tag.color : '#969799'
        const current = categoryMap.get(tagName) || { value: 0, color: tagColor }
        categoryMap.set(tagName, { 
          value: current.value + record.amount, 
          color: tagColor 
        })
      })
    }
  })

  return Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      value: typeof data === 'number' ? data : data.value,
      color: typeof data === 'object' ? data.color : '#969799'
    }))
    .sort((a, b) => b.value - a.value)
})

// 趋势图数据
const trendData = computed(() => {
  const d = currentDate.value
  const data = []

  switch (activeDimension.value) {
    case 'day': {
      // 显示当天前7天到后7天的数据
      for (let i = -7; i <= 7; i++) {
        const date = d.add(i, 'day')
        const dayRecords = recordsStore.records.filter(r => 
          dayjs(r.date).isSame(date, 'day')
        )
        data.push({
          label: date.format('MM/DD'),
          income: dayRecords.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0),
          expense: dayRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
        })
      }
      break
    }
    case 'week': {
      // 显示当前周前4周到后4周的数据
      for (let i = -4; i <= 4; i++) {
        const weekDate = d.add(i, 'week')
        const weekRecords = recordsStore.records.filter(r => {
          const rd = dayjs(r.date)
          return rd.isoWeek() === weekDate.isoWeek() && rd.year() === weekDate.year()
        })
        data.push({
          label: `第${weekDate.isoWeek()}周`,
          income: weekRecords.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0),
          expense: weekRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
        })
      }
      break
    }
    case 'month': {
      // 显示当前月前后各6个月的数据
      for (let i = -6; i <= 6; i++) {
        const monthDate = d.add(i, 'month')
        const monthRecords = recordsStore.records.filter(r => 
          dayjs(r.date).isSame(monthDate, 'month')
        )
        data.push({
          label: monthDate.format('MM月'),
          income: monthRecords.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0),
          expense: monthRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
        })
      }
      break
    }
    case 'year': {
      // 显示前后各3年的数据
      for (let i = -3; i <= 3; i++) {
        const yearDate = d.add(i, 'year')
        const yearRecords = recordsStore.records.filter(r => 
          dayjs(r.date).isSame(yearDate, 'year')
        )
        data.push({
          label: yearDate.format('YYYY年'),
          income: yearRecords.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0),
          expense: yearRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
        })
      }
      break
    }
  }

  return data
})

// 方法
const navigateDate = (direction) => {
  switch (activeDimension.value) {
    case 'day':
      currentDate.value = currentDate.value.add(direction, 'day')
      break
    case 'week':
      currentDate.value = currentDate.value.add(direction, 'week')
      break
    case 'month':
      currentDate.value = currentDate.value.add(direction, 'month')
      break
    case 'year':
      currentDate.value = currentDate.value.add(direction, 'year')
      break
  }
}

const onDimensionChange = () => {
  updatePickerDate()
}

const updatePickerDate = () => {
  const d = currentDate.value
  switch (activeDimension.value) {
    case 'day':
      pickerDate.value = [String(d.year()), String(d.month() + 1).padStart(2, '0'), String(d.date()).padStart(2, '0')]
      break
    case 'week':
    case 'month':
      pickerDate.value = [String(d.year()), String(d.month() + 1).padStart(2, '0')]
      break
    case 'year':
      pickerDate.value = [String(d.year())]
      break
  }
}

const onDateConfirm = ({ selectedValues }) => {
  const year = parseInt(selectedValues[0])
  const month = selectedValues.length > 1 ? parseInt(selectedValues[1]) - 1 : 0
  const day = selectedValues.length > 2 ? parseInt(selectedValues[2]) : 1
  
  currentDate.value = dayjs().year(year).month(month).date(day)
  showDatePicker.value = false
}

const toggleTagFilter = (tagId) => {
  const index = selectedTagIds.value.indexOf(tagId)
  if (index > -1) {
    selectedTagIds.value.splice(index, 1)
  } else {
    selectedTagIds.value.push(tagId)
  }
}

const clearTagFilter = () => {
  selectedTagIds.value = []
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

// 初始化趋势图
const initTrendChart = () => {
  if (!trendChartRef.value) return
  
  if (trendChart) {
    trendChart.dispose()
  }
  
  trendChart = echarts.init(trendChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params) => {
        let result = params[0].axisValue + '<br/>'
        params.forEach(item => {
          result += `${item.marker} ${item.seriesName}: ¥${item.value.toFixed(2)}<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['收入', '支出'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: trendData.value.map(d => d.label),
      axisLabel: {
        fontSize: 10,
        rotate: activeDimension.value === 'month' ? 45 : 0
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value) => {
          if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'k'
          }
          return value
        }
      }
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        data: trendData.value.map(d => d.income),
        itemStyle: { color: '#07c160' }
      },
      {
        name: '支出',
        type: 'bar',
        data: trendData.value.map(d => d.expense),
        itemStyle: { color: '#ee0a24' }
      }
    ]
  }
  
  trendChart.setOption(option)
}

// 初始化饼图
const initPieChart = () => {
  if (!pieChartRef.value) return
  
  if (pieChart) {
    pieChart.dispose()
  }
  
  pieChart = echarts.init(pieChartRef.value)
  
  const total = categoryData.value.reduce((sum, d) => sum + d.value, 0)
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        return `${params.name}<br/>¥${params.value.toFixed(2)} (${params.percent}%)`
      }
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      formatter: (name) => {
        const item = categoryData.value.find(d => d.name === name)
        if (item) {
          const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
          return `${name} ${percent}%`
        }
        return name
      }
    },
    series: [
      {
        name: '支出分类',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: categoryData.value.map(d => ({
          value: d.value,
          name: d.name,
          itemStyle: { color: d.color }
        }))
      }
    ]
  }
  
  pieChart.setOption(option)
}

// 初始化收入饼图
const initIncomePieChart = () => {
  if (!incomePieChartRef.value || incomeCategoryData.value.length === 0) return
  
  if (incomePieChart) {
    incomePieChart.dispose()
  }
  
  incomePieChart = echarts.init(incomePieChartRef.value)
  
  const total = incomeCategoryData.value.reduce((sum, d) => sum + d.value, 0)
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        return `${params.name}<br/>¥${params.value.toFixed(2)} (${params.percent}%)`
      }
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      formatter: (name) => {
        const item = incomeCategoryData.value.find(d => d.name === name)
        if (item) {
          const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
          return `${name} ${percent}%`
        }
        return name
      }
    },
    series: [
      {
        name: '收入分类',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: incomeCategoryData.value.map(d => ({
          value: d.value,
          name: d.name,
          itemStyle: { color: d.color }
        }))
      }
    ]
  }
  
  incomePieChart.setOption(option)
}

// 更新所有图表
const updateCharts = () => {
  nextTick(() => {
    initTrendChart()
    initPieChart()
    initIncomePieChart()
  })
}

// 监听数据变化
watch([filteredRecords, trendData, categoryData, incomeCategoryData], () => {
  updateCharts()
}, { deep: true })

// 监听日期变化
watch(currentDate, () => {
  updatePickerDate()
})

// 窗口大小变化时重绘图表
const handleResize = () => {
  trendChart?.resize()
  pieChart?.resize()
  incomePieChart?.resize()
}

// 初始化
onMounted(async () => {
  initialLoading.value = true
  await Promise.all([
    recordsStore.init(),
    tagsStore.init()
  ])
  
  updatePickerDate()
  updateCharts()
  initialLoading.value = false
  
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  trendChart?.dispose()
  pieChart?.dispose()
  incomePieChart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.stats-page {
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

.dimension-tabs {
  background: white;
}

.dimension-tabs :deep(.van-tabs__nav) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.dimension-tabs :deep(.van-tab) {
  color: rgba(255, 255, 255, 0.7);
}

.dimension-tabs :deep(.van-tab--active) {
  color: white;
  font-weight: bold;
}

.dimension-tabs :deep(.van-tabs__line) {
  background: white;
}

.date-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #ebedf0;
}

.date-nav span {
  font-size: 16px;
  font-weight: 500;
  color: #323233;
}

.date-nav .van-icon {
  font-size: 20px;
  color: #969799;
  cursor: pointer;
}

.overview-cards {
  display: flex;
  padding: 16px;
  gap: 12px;
}

.card {
  flex: 1;
  background: white;
  border-radius: 12px;
  padding: 16px 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card .label {
  font-size: 12px;
  color: #969799;
  margin-bottom: 8px;
}

.card .value {
  font-size: 16px;
  font-weight: bold;
}

.card.income .value {
  color: #07c160;
}

.card.expense .value {
  color: #ee0a24;
}

.card.balance .value {
  color: #ee0a24;
}

.card.balance.positive .value {
  color: #07c160;
}

.tag-filter {
  background: white;
  margin: 0 16px 16px;
  border-radius: 12px;
  overflow: hidden;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
}

.filter-header span {
  font-size: 14px;
  font-weight: 500;
  color: #323233;
}

.filter-content {
  padding: 12px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border-top: 1px solid #ebedf0;
}

.filter-tag {
  cursor: pointer;
}

.chart-section {
  background: white;
  margin: 0 16px 16px;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: #323233;
  margin-bottom: 12px;
}

.chart-container {
  width: 100%;
  height: 250px;
}

.empty-chart {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #969799;
  font-size: 14px;
}

.records-section {
  background: white;
  margin: 0 16px;
  border-radius: 12px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  cursor: pointer;
}

.section-header .section-title {
  margin-bottom: 0;
}

.records-list {
  padding: 0 0 16px;
}

.record-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 14px;
  margin-right: 12px;
  flex-shrink: 0;
}

.more-hint {
  text-align: center;
  padding: 12px;
  font-size: 12px;
  color: #969799;
}

:deep(.van-cell__value) {
  color: #323233;
}
</style>
