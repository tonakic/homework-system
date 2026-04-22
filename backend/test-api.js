// 测试API返回的数据
const http = require('http');

// 创建一个简单的JWT token (仅供测试)
const jwt = require('jsonwebtoken');
const testToken = jwt.sign({ id: 6, userType: 'student' }, 'your-super-secret-key-change-in-production', { expiresIn: '1h' });

console.log('测试Token:', testToken);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/student/exams/records/1',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${testToken}`
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nAPI响应:');
    const json = JSON.parse(data);
    console.log('code:', json.code);
    console.log('totalScore:', json.data?.totalScore);
    console.log('examTotalScore:', json.data?.examTotalScore);
  });
});

req.on('error', (e) => {
  console.error('请求错误:', e.message);
});

req.end();
