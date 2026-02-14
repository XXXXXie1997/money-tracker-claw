<template>
  <div class="tags-page">
    <!-- 顶部导航 -->
    <van-nav-bar title="标签管理">
      <template #right>
        <van-icon name="plus" size="20" @click="showAddSheet = true" />
      </template>
    </van-nav-bar>

    <!-- Loading状态 -->
    <div v-if="initialLoading" class="loading-container">
      <van-loading size="24px">加载中...</van-loading>
    </div>

    <!-- 标签列表 -->
    <template v-else>
    <van-cell-group inset title="支出标签">
      <van-swipe-cell v-for="tag in expenseTagsWithUsage" :key="tag.id">
        <van-cell :title="tag.name" is-link @click="editTag(tag)">
          <template #icon>
            <div class="tag-color" :style="{ background: tag.color }"></div>
          </template>
          <template #value>
            <span class="usage-count">{{ tag.usageCount }} 次使用</span>
          </template>
        </van-cell>
        <template #right>
          <van-button square type="primary" text="编辑" @click="editTag(tag)" />
          <van-button square type="danger" text="删除" @click="confirmDelete(tag)" />
        </template>
      </van-swipe-cell>
    </van-cell-group>

    <van-cell-group inset title="收入标签">
      <van-swipe-cell v-for="tag in incomeTagsWithUsage" :key="tag.id">
        <van-cell :title="tag.name" is-link @click="editTag(tag)">
          <template #icon>
            <div class="tag-color" :style="{ background: tag.color }"></div>
          </template>
          <template #value>
            <span class="usage-count">{{ tag.usageCount }} 次使用</span>
          </template>
        </van-cell>
        <template #right>
          <van-button square type="primary" text="编辑" @click="editTag(tag)" />
          <van-button square type="danger" text="删除" @click="confirmDelete(tag)" />
        </template>
      </van-swipe-cell>
    </van-cell-group>

    <van-cell-group inset title="通用标签">
      <van-swipe-cell v-for="tag in commonTagsWithUsage" :key="tag.id">
        <van-cell :title="tag.name" is-link @click="editTag(tag)">
          <template #icon>
            <div class="tag-color" :style="{ background: tag.color }"></div>
          </template>
          <template #value>
            <span class="usage-count">{{ tag.usageCount }} 次使用</span>
          </template>
        </van-cell>
        <template #right>
          <van-button square type="primary" text="编辑" @click="editTag(tag)" />
          <van-button square type="danger" text="删除" @click="confirmDelete(tag)" />
        </template>
      </van-swipe-cell>
    </van-cell-group>
    </template>

    <!-- 添加/编辑标签面板 -->
    <van-action-sheet v-model:show="showAddSheet" :title="editingTag ? '编辑标签' : '添加标签'">
      <div class="tag-form">
        <van-cell-group inset>
          <!-- 标签名称 -->
          <van-field
            v-model="formData.name"
            label="标签名称"
            placeholder="请输入标签名称"
            :rules="[{ required: true, message: '请输入标签名称' }]"
          />

          <!-- 标签类型 -->
          <van-field label="标签类型">
            <template #input>
              <van-radio-group v-model="formData.type" direction="horizontal">
                <van-radio name="expense">支出</van-radio>
                <van-radio name="income">收入</van-radio>
                <van-radio name="both">通用</van-radio>
              </van-radio-group>
            </template>
          </van-field>

          <!-- 颜色选择 -->
          <van-field label="标签颜色">
            <template #input>
              <div class="color-picker">
                <div
                  v-for="color in presetColors"
                  :key="color"
                  class="color-item"
                  :class="{ active: formData.color === color }"
                  :style="{ background: color }"
                  @click="formData.color = color"
                >
                  <van-icon v-if="formData.color === color" name="success" color="white" />
                </div>
              </div>
            </template>
          </van-field>
        </van-cell-group>

        <div class="form-actions">
          <van-button block type="primary" :loading="saving" @click="saveTag">
            {{ editingTag ? '保存修改' : '添加标签' }}
          </van-button>
          <van-button v-if="editingTag" block type="danger" @click="confirmDelete(editingTag)">
            删除标签
          </van-button>
        </div>
      </div>
    </van-action-sheet>

    <!-- 删除确认 -->
    <van-dialog v-model:show="showDeleteDialog" title="确认删除" show-cancel-button @confirm="doDelete">
      <p style="text-align: center; padding: 20px;">
        确定要删除标签"{{ deletingTag?.name }}"吗？<br>
        <span style="color: #969799; font-size: 12px;">（不会删除已记账的记录）</span>
      </p>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTagsStore } from '@/stores/tags'
import { useRecordsStore } from '@/stores/records'
import { showToast, showSuccessToast } from 'vant'

const tagsStore = useTagsStore()
const recordsStore = useRecordsStore()

// 状态
const showAddSheet = ref(false)
const showDeleteDialog = ref(false)
const editingTag = ref(null)
const deletingTag = ref(null)
const saving = ref(false)
const initialLoading = ref(true)

// 表单数据
const formData = ref({
  name: '',
  type: 'expense',
  color: '#1989fa'
})

// 预设颜色
const presetColors = tagsStore.presetColors

// 计算属性：带使用次数的标签列表
const expenseTagsWithUsage = computed(() => {
  return tagsStore.getTagsWithUsage(recordsStore)
    .filter(t => t.type === 'expense')
})

const incomeTagsWithUsage = computed(() => {
  return tagsStore.getTagsWithUsage(recordsStore)
    .filter(t => t.type === 'income')
})

const commonTagsWithUsage = computed(() => {
  return tagsStore.getTagsWithUsage(recordsStore)
    .filter(t => t.type === 'both')
})

// 方法
const editTag = (tag) => {
  editingTag.value = tag
  formData.value = {
    name: tag.name,
    type: tag.type,
    color: tag.color
  }
  showAddSheet.value = true
}

const saveTag = async () => {
  if (!formData.value.name.trim()) {
    showToast('请输入标签名称')
    return
  }

  saving.value = true
  try {
    const data = {
      name: formData.value.name.trim(),
      type: formData.value.type,
      color: formData.value.color
    }

    if (editingTag.value) {
      await tagsStore.updateTag(editingTag.value.id, data)
      showSuccessToast('更新成功')
    } else {
      await tagsStore.addTag(data)
      showSuccessToast('添加成功')
    }

    closeForm()
  } catch (e) {
    showToast('保存失败')
  } finally {
    saving.value = false
  }
}

const confirmDelete = (tag) => {
  deletingTag.value = tag
  showDeleteDialog.value = true
}

const doDelete = async () => {
  if (deletingTag.value) {
    await tagsStore.deleteTag(deletingTag.value.id)
    showSuccessToast('删除成功')
    closeForm()
    deletingTag.value = null
  }
}

const closeForm = () => {
  showAddSheet.value = false
  editingTag.value = null
  formData.value = {
    name: '',
    type: 'expense',
    color: '#1989fa'
  }
}

// 初始化
onMounted(async () => {
  initialLoading.value = true
  await Promise.all([
    tagsStore.init(),
    recordsStore.init()
  ])
  initialLoading.value = false
})
</script>

<style scoped>
.tags-page {
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

.tag-color {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  margin-right: 12px;
  flex-shrink: 0;
}

.usage-count {
  color: #969799;
  font-size: 12px;
}

.tag-form {
  padding: 16px;
  padding-bottom: 32px;
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.color-item {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.color-item.active {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.form-actions {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
