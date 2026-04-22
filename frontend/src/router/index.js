import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '@/store/user';

// 路由配置
const routes = [
  // 学生端路由
  {
    path: '/student',
    component: () => import('@/views/student/Layout.vue'),
    meta: { userType: 'student' },
    children: [
      {
        path: '',
        redirect: '/student/home'
      },
      {
        path: 'login',
        name: 'StudentLogin',
        component: () => import('@/views/student/Login.vue'),
        meta: { guest: true }
      },
      {
        path: 'home',
        name: 'StudentHome',
        component: () => import('@/views/student/Home.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'pending',
        name: 'StudentPending',
        component: () => import('@/views/student/Pending.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'exam/:id',
        name: 'StudentExamDetail',
        component: () => import('@/views/student/ExamDetail.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'exam/:id/start',
        name: 'StudentExamStart',
        component: () => import('@/views/student/ExamStart.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'records',
        name: 'StudentRecords',
        component: () => import('@/views/student/Records.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'records/:id',
        name: 'StudentRecordDetail',
        component: () => import('@/views/student/RecordDetail.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'mistakes',
        name: 'StudentMistakes',
        component: () => import('@/views/student/Mistakes.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'ranking',
        name: 'StudentRanking',
        component: () => import('@/views/student/Ranking.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'profile',
        name: 'StudentProfile',
        component: () => import('@/views/student/Profile.vue'),
        meta: { requiresAuth: true }
      }
    ]
  },

  // 教师端路由
  {
    path: '/teacher',
    component: () => import('@/views/teacher/Layout.vue'),
    meta: { userType: 'teacher' },
    children: [
      {
        path: '',
        redirect: '/teacher/home'
      },
      {
        path: 'login',
        name: 'TeacherLogin',
        component: () => import('@/views/teacher/Login.vue'),
        meta: { guest: true }
      },
      {
        path: 'home',
        name: 'TeacherHome',
        component: () => import('@/views/teacher/Home.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'students',
        name: 'TeacherStudents',
        component: () => import('@/views/teacher/Students.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'questions',
        name: 'TeacherQuestions',
        component: () => import('@/views/teacher/Questions.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'exams',
        name: 'TeacherExams',
        component: () => import('@/views/teacher/Exams.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'grading',
        name: 'TeacherGrading',
        component: () => import('@/views/teacher/Grading.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'statistics',
        name: 'TeacherStatistics',
        component: () => import('@/views/teacher/Statistics.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'ranking/detail',
        name: 'TeacherRankingDetail',
        component: () => import('@/views/teacher/RankingDetail.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'profile',
        name: 'TeacherProfile',
        component: () => import('@/views/teacher/Profile.vue'),
        meta: { requiresAuth: true }
      }
    ]
  },

  // 管理员端路由
  {
    path: '/admin',
    component: () => import('@/views/admin/Layout.vue'),
    meta: { userType: 'admin' },
    children: [
      {
        path: '',
        redirect: '/admin/home'
      },
      {
        path: 'login',
        name: 'AdminLogin',
        component: () => import('@/views/admin/Login.vue'),
        meta: { guest: true }
      },
      {
        path: 'home',
        name: 'AdminHome',
        component: () => import('@/views/admin/Home.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'teachers',
        name: 'AdminTeachers',
        component: () => import('@/views/admin/Teachers.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'students',
        name: 'AdminStudents',
        component: () => import('@/views/admin/Students.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'classes',
        name: 'AdminClasses',
        component: () => import('@/views/admin/Classes.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'questions',
        name: 'AdminQuestions',
        component: () => import('@/views/teacher/Questions.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'exams',
        name: 'AdminExams',
        component: () => import('@/views/teacher/Exams.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'grading-config',
        name: 'AdminGradingConfig',
        component: () => import('@/views/admin/GradingConfig.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'settings',
        name: 'AdminSettings',
        component: () => import('@/views/admin/Settings.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'logs',
        name: 'AdminLogs',
        component: () => import('@/views/admin/Logs.vue'),
        meta: { requiresAuth: true }
      }
    ]
  },

  // 关于系统
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/About.vue')
  },

  // 根路由重定向
  {
    path: '/',
    redirect: '/student/login'
  },

  // 404
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 首次登录强制修改密码的路由
const firstLoginRoutes = {
  student: '/student/profile?action=changePassword',
  teacher: '/teacher/profile?action=changePassword',
  admin: '/admin/settings?action=changePassword'
};

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore();

  // 如果是访客页面，直接放行
  if (to.meta.guest) {
    next();
    return;
  }

  // 如果需要认证
  if (to.meta.requiresAuth) {
    if (!userStore.isLoggedIn) {
      // 未登录，跳转到对应登录页
      const userType = to.meta.userType || 'student';
      next(`/${userType}/login`);
      return;
    }

    // 检查用户类型是否匹配
    if (to.meta.userType && userStore.userType !== to.meta.userType) {
      // 用户类型不匹配，重定向到正确的首页
      // 确保 userType 有效，避免重定向到无效路径
      const validTypes = ['student', 'teacher', 'admin'];
      const redirectType = validTypes.includes(userStore.userType) ? userStore.userType : 'student';
      next(`/${redirectType}/home`);
      return;
    }

    // 检查是否首次登录，强制跳转到修改密码页面
    if (userStore.isFirstLogin()) {
      const firstLoginRoute = firstLoginRoutes[userStore.userType];
      const firstLoginPath = firstLoginRoute.split('?')[0];
      // 如果当前已经在修改密码页面，则放行
      if (to.path === firstLoginPath) {
        next();
        return;
      }
      // 否则强制跳转到修改密码页面
      next(firstLoginRoute);
      return;
    }
  }

  next();
});

export default router;
