---
name: pc-adaptation
description: 作业管理系统PC端适配设计 — 全部三端28页面适配PC，Layout分包+组件内条件渲染，Vant+Element Plus双组件
type: project
---

# 创新小学作业管理系统 - PC端适配设计

## 背景

当前系统为纯手机端设计，使用 Vue 3 + Vant 4，三个门户（学生/教师/管理员）共28个页面。需要识别手机与PC，手机端保留现有界面，PC端新增独立界面。

## 核心决策

| 决策项 | 选择 | 说明 |
|--------|------|------|
| 适配范围 | 全部适配 | 三端28页面都做PC适配 |
| 导航布局 | 左侧侧边栏 | PC端三端统一使用左侧侧边栏导航 |
| UI组件方案 | 条件渲染双组件 | 手机端Vant，PC端Element Plus，设备检测切换 |
| 架构方案 | Layout分包+组件内条件渲染 | Layout完全独立，页面内容组件内条件渲染 |

## 1. 设备检测与全局状态

### useDevice Composable

- 检测方式：`navigator.userAgent` + `window.innerWidth` 双重判断
- 断点：`width >= 768` 为 PC，否则为手机
- 响应式：监听 `resize` 事件，窗口大小变化时自动切换
- 存储于 Pinia store `useDeviceStore`，全局共享

```javascript
// src/composables/useDevice.js
export function useDevice() {
  const isPC = ref(false)

  const checkDevice = () => {
    const ua = navigator.userAgent.toLowerCase()
    const isMobileUA = /mobile|android|iphone/.test(ua)
    const width = window.innerWidth
    isPC.value = !isMobileUA && width >= 768
  }

  onMounted(() => {
    checkDevice()
    window.addEventListener('resize', checkDevice)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', checkDevice)
  })

  return { isPC }
}
```

### 路由层面

- 手机端路由使用 MobileLayout（现有 Tabbar）
- PC端路由使用 PcLayout（左侧侧边栏）
- 通过路由守卫 `beforeEach` 根据 `isPC` 切换 Layout meta

```javascript
router.beforeEach((to, from, next) => {
  const deviceStore = useDeviceStore()
  to.meta.layout = deviceStore.isPC ? 'pc' : 'mobile'
  next()
})
```

## 2. Layout 架构

### MobileLayout（手机端，保留现有代码）

- `src/layouts/MobileLayout.vue` — 迁移现有 student/Layout.vue 的 Tabbar 逻辑
- 学生端：底部 Tabbar（6个Tab：首页/待做/记录/错题/排行/我的）
- 教师/管理员端：NavBar + router-view
- 最大宽度不限制，全屏适配

### PcLayout（PC端，全新开发）

- `src/layouts/PcLayout.vue` — 通用 PC 布局框架
- 结构：顶部 Header + 左侧 Menu 侧边栏 + 右侧内容区
- Header：左侧 Logo + 系统名称，右侧用户信息 + 退出按钮
- 侧边栏：Element Plus `el-menu`，可折叠，带图标
- 内容区：`router-view`，`max-width: 1400px` 居中
- 三个门户各自配置侧边栏菜单项（通过 props 或配置文件）

### 目录结构

```
src/
  layouts/
    PcLayout.vue          # PC端通用布局
    MobileLayout.vue      # 手机端通用布局
  composables/
    useDevice.js          # 设备检测
  store/
    device.js             # 设备状态 Pinia store
  components/
    ui/
      MyButton.vue        # 条件组件：van-button / el-button
      MyDialog.vue        # 条件组件：van-popup / el-dialog
      MyTable.vue         # 手机 card 列表，PC 表格
  views/
    student/
      Layout.vue          # 保留（内部改用MobileLayout/PcLayout）
      Home.vue            # 内部 v-if 切换
      ...
    teacher/
      Layout.vue          # 保留
      Home.vue            # 内部 v-if 切换
      ...
    admin/
      Layout.vue          # 保留
      Home.vue            # 内部 v-if 切换
      ...
```

## 3. 组件实现策略

### 业务页面组件（内部条件渲染）

每个页面 .vue 文件内部结构：

```vue
<template>
  <div v-if="isPC" class="pc-page">
    <el-breadcrumb>...</el-breadcrumb>
    <el-form>...</el-form>
    <el-table :data="list">...</el-table>
  </div>
  <div v-else class="mobile-page">
    <van-cell-group>...</van-cell-group>
    <van-pull-refresh>...</van-pull-refresh>
  </div>
</template>

<script setup>
import { useDeviceStore } from '@/store/device'
const { isPC } = storeToRefs(useDeviceStore())
// 共享的业务逻辑：API调用、数据处理等
</script>
```

### 复杂页面拆分策略

对于大页面（ExamStart 1084行、Questions 1472行、Exams 1279行、Grading 924行）：

- 提取共享逻辑到 `useXxxComposable.js`
- PC 端组件抽离为 `XxxContentPC.vue`
- 手机端组件抽离为 `XxxContentMobile.vue`
- 父组件做条件渲染引用

### 公共 UI 组件

| 组件 | 手机端 | PC端 |
|------|--------|------|
| MyButton | van-button | el-button |
| MyDialog | van-popup position=bottom | el-dialog |
| MyTable | van-cell 卡片列表 | el-table |
| MyForm | van-form | el-form |
| MySelect | van-picker | el-select |
| MyDatePicker | van-date-picker | el-date-picker |
| MyToast | showToast | ElMessage |
| MyConfirm | showConfirmDialog | ElMessageBox |

## 4. Element Plus 集成

### 按需加载配置

```javascript
// vite.config.js
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    AutoImport({ resolvers: [ElementPlusResolver()] }),
    Components({
      resolvers: [
        VantResolver(),           // 手机端
        ElementPlusResolver()     // PC端
      ]
    })
  ]
})
```

### 主题定制

- Element Plus 主色覆盖为 `#ff9800`，与现有 Vant 主题一致
- 复用现有 CSS 变量（`--primary-color` 等）

## 5. 样式策略

- PC 端内容区：`max-width: 1400px; margin: 0 auto;`
- 表格/表单使用 Element Plus 默认样式，主色调整为 `#ff9800`
- PC 端字号适当放大：基础 14px，标题 16-20px
- 侧边栏宽度：展开 220px，折叠 64px

## 6. 实施阶段

### 第一阶段：基础设施

1. 安装 Element Plus + 配置按需加载（unplugin-auto-import, unplugin-vue-components）
2. 创建 `useDevice` composable + Pinia store (`store/device.js`)
3. 创建 `PcLayout.vue` 通用布局（Header + el-menu侧边栏 + 内容区）
4. 创建 `MobileLayout.vue` 迁移现有布局逻辑
5. 修改路由配置支持动态 Layout
6. 创建公共 UI 组件（MyButton, MyDialog, MyTable 等）

### 第二阶段：学生端适配（11个页面）

- Login / Home / Pending / ExamDetail / ExamStart
- Records / RecordDetail / Mistakes / Ranking / Profile
- 重点：ExamStart 考试界面 PC 端需要全新设计（分屏显示题目）

### 第三阶段：教师端适配（9个页面）

- Login / Home / Students / Questions / Exams
- Grading / Statistics / RankingDetail / Profile
- 重点：Questions（1472行）、Exams（1279行）、Grading（924行）

### 第四阶段：管理员端适配（8个页面）

- Login / Home / Teachers / Students / Classes
- GradingConfig / Settings / Logs
- 重点：数据管理表格、权限配置

## 7. 注意事项

- 手机端现有代码不做任何修改，只在外层包裹条件
- PC 端新增代码与手机端代码通过 `v-if/v-else` 完全隔离
- 共享逻辑（API 调用、数据处理）提取到 composable 避免重复
- Element Plus 仅在 PC 端按需加载，不影响手机端包体积
