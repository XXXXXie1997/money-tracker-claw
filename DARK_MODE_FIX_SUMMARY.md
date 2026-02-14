# 暗色模式修复总结

## 问题诊断

用户反馈开启暗色模式后，页面背景仍然是白色的，暗色模式没有正常生效。

经过分析，发现以下问题：

1. **CSS 选择器写法问题**：在组件的 `<style scoped>` 中使用了 `:global(.dark)` 写法，这种写法在 scoped CSS 中可能无法正确匹配父级 class
2. **样式优先级不足**：部分样式没有使用 `!important`，被 Vant 默认样式覆盖
3. **全局样式缺失**：`html` 和 `body` 标签缺少暗色模式的背景色设置
4. **组件样式不完整**：部分 Vant 组件缺少暗色模式样式定义

## 修复方案

### 1. 分离样式定义
将每个组件的样式分为两部分：
- `<style scoped>`：组件内部样式，用于定义组件特定的布局和样式
- `<style>`（非 scoped）：暗色模式样式，使用全局选择器确保正确匹配

### 2. 修复的文件

#### src/views/Records.vue
- 移除 `:global(.dark)` 写法，改用独立的非 scoped style 标签
- 为所有相关组件添加 `!important` 确保样式优先级
- 补充缺失的暗色模式样式：
  - `.van-radio__label` - 单选按钮标签
  - `.van-swipe-cell__content` - 滑动单元格
  - `.van-field__control` - 输入框
  - `.van-dropdown-item__content` - 下拉菜单内容

#### src/views/Stats.vue
- 分离 scoped 和非 scoped 样式
- 修复所有背景色和文字颜色
- 添加缺失的组件样式：
  - `.van-tag--default` - 默认标签
  - `.van-cell__value` - 单元格值
  - `.filter-content` - 筛选内容边框

#### src/views/Tags.vue
- 重写暗色模式样式
- 确保所有 Vant 组件都有正确的暗色样式：
  - `.van-action-sheet__content` - 动作面板内容
  - `.van-swipe-cell__content` - 滑动单元格
  - `.van-button` - 按钮样式

#### src/views/Settings.vue
- 重写暗色模式样式
- 添加更完整的颜色定义：
  - `.van-cell-group__title` - 单元格组标题
  - `.van-cell__value` - 单元格值
  - 确认对话框内容样式

#### src/App.vue
- 移除不正确的 `:global(.dark)` 写法
- 添加更多全局 Vant 组件的暗色模式样式：
  - `.van-picker` 系列 - 选择器组件
  - `.van-picker-column__item` - 选择器列项
- 优化媒体查询中的暗色模式样式

#### src/assets/styles/main.css
- 添加 `html` 和 `body` 标签的暗色模式背景色设置
- 添加 `#app` 的暗色模式背景色设置

## 关键修复点

### CSS 选择器修复
**问题写法：**
```css
/* 在 <style scoped> 中 */
:global(.dark) .records-page {
  background-color: #121212;
}
```

**正确写法：**
```css
/* 在独立的 <style> 标签中 */
.dark .records-page {
  background-color: #121212 !important;
}
```

### 背景色优先级
使用 `!important` 确保自定义样式优先级高于 Vant 默认样式，避免被覆盖。

### 全局样式一致性
确保从最外层（html、body）到各个组件都正确应用暗色模式背景色。

## 测试验证

修复完成后，在浏览器中测试：

1. 打开应用（http://localhost:3000）
2. 进入"设置"页面
3. 开启"暗色模式"开关
4. 验证以下页面：
   - ✅ 记账页面 - 背景应为深色 (#121212)
   - ✅ 统计页面 - 背景应为深色 (#121212)
   - ✅ 标签页面 - 背景应为深色 (#121212)
   - ✅ 设置页面 - 背景应为深色 (#121212)
   - ✅ 所有 Vant 组件（导航栏、单元格、按钮等）应为深色主题

## 颜色方案

暗色模式使用的颜色：
- 主背景：`#121212`
- 次级背景：`#1e1e1e`
- 三级背景：`#2a2a2a`
- 主文字：`#e5e5e5`
- 次级文字：`#888`
- 边框色：`#333`
- 主题色：`#1989fa`（保持不变）

## 后续优化建议

1. 考虑使用 CSS 变量管理暗色模式颜色，便于主题定制
2. 添加过渡动画，使暗色模式切换更平滑
3. 考虑支持自定义主题色
4. 添加系统主题跟随选项（自动检测系统暗色模式）

## 修复完成时间

2026-02-14 23:22 GMT+8

## 修复人员

AI Subagent (Frontend Specialist)
