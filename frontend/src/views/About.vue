<template>
  <div class="about-page page">
    <van-nav-bar title="关于系统" left-arrow @click-left="$router.back()" />

    <div class="page-content">
      <div class="logo-section">
        <div class="logo">
          <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="38" fill="#ff9800"/>
            <path d="M20 32 L40 24 L60 32 L40 40 Z" fill="white"/>
            <rect x="38" y="24" width="4" height="12" fill="white"/>
            <path d="M40 36 L54 32 L54 34 L40 38 L26 34 L26 32 Z" fill="#fff3e0"/>
            <ellipse cx="38" cy="48" rx="8" ry="9" fill="white"/>
            <path d="M26 58 Q26 52 38 52 Q50 52 50 58 L50 68 L26 68 Z" fill="white"/>
            <path d="M54 32 L56 40 L54 42" stroke="#ffcc00" stroke-width="2" fill="none"/>
            <circle cx="56" cy="43" r="2" fill="#ffcc00"/>
          </svg>
        </div>
        <h1>创新小学作业系统</h1>
        <p class="version">版本 1.0.0</p>
      </div>

      <div class="info-card card">
        <h3>系统介绍</h3>
        <p>创新小学作业系统是一款专为小学生设计的在线作业管理平台，旨在帮助教师高效布置作业、批改作业，帮助学生便捷完成作业、查看错题，提升学习效率。</p>
      </div>

      <div class="info-card card">
        <h3>主要功能</h3>
        <ul>
          <li>在线答题，自动保存</li>
          <li>智能批改，即时反馈</li>
          <li>错题收集，针对性练习</li>
          <li>成绩统计，学习分析</li>
        </ul>
      </div>

      <div class="info-card card">
        <h3>技术支持</h3>
        <p>如有问题，请联系学校信息技术部门。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.about-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.logo-section {
  text-align: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, #ff9800 0%, #ffb74d 100%);
  color: white;
}

.logo {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
}

.logo svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
}

.logo-section h1 {
  font-size: 20px;
  margin-bottom: 8px;
}

.version {
  font-size: 14px;
  opacity: 0.9;
}

.info-card {
  margin: 16px;
  padding: 16px;
}

.info-card h3 {
  font-size: 16px;
  margin-bottom: 12px;
  color: #333;
}

.info-card p {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.info-card ul {
  padding-left: 20px;
  font-size: 14px;
  color: #666;
  line-height: 1.8;
}

.info-card li {
  margin-bottom: 4px;
}
</style>
