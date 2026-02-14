<template>
  <div class="app-container">
    <router-view />
    
    <!-- 底部导航 -->
    <van-tabbar v-model="active" active-color="#1989fa" route>
      <van-tabbar-item to="/records" icon="orders-o">
        记账
      </van-tabbar-item>
      <van-tabbar-item to="/stats" icon="bar-chart-o">
        统计
      </van-tabbar-item>
      <van-tabbar-item to="/tags" icon="label-o">
        标签
      </van-tabbar-item>
      <van-tabbar-item to="/settings" icon="setting-o">
        设置
      </van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const active = ref(0)

// 监听路由变化更新active
watch(
  () => route.path,
  (path) => {
    if (path === '/records') active.value = 0
    else if (path === '/stats') active.value = 1
    else if (path === '/tags') active.value = 2
    else if (path === '/settings') active.value = 3
  },
  { immediate: true }
)
</script>

<style>
.app-container {
  min-height: 100vh;
  background-color: #f7f8fa;
  position: relative;
}

#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 确保页面内容不被底部导航遮挡 */
.van-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

/* 平板和桌面响应式布局 */
@media screen and (min-width: 768px) {
  .app-container {
    max-width: 600px;
    margin: 0 auto;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.08);
    min-height: 100vh;
  }
  
  .van-tabbar {
    max-width: 600px;
    left: 50%;
    transform: translateX(-50%);
    border-top: 1px solid #ebedf0;
    border-radius: 0 0 12px 12px;
  }
}

@media screen and (min-width: 1024px) {
  .app-container {
    max-width: 700px;
    margin: 24px auto;
    border-radius: 16px;
    min-height: calc(100vh - 48px);
    overflow: hidden;
  }
  
  .van-nav-bar {
    border-radius: 16px 16px 0 0;
  }
}

/* 暗色模式支持 */
:global(.dark) .app-container {
  background-color: #121212;
}

:global(.dark) .van-tabbar {
  border-top-color: #333;
  background-color: #1e1e1e;
}
</style>
