/**
 * 批量创建小学一年级英语题目
 * 单选题100道、多选题100道、填空题100道
 */

const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 3000;
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.error('请提供token: node create-questions.js <token>');
  process.exit(1);
}

// 发送API请求
function apiRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : '';
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// 创建题目
async function createQuestion(questionData) {
  try {
    const result = await apiRequest('POST', '/api/questions', questionData);
    return result;
  } catch (err) {
    return { code: -1, message: err.message };
  }
}

// 打乱数组
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 生成单选题数据
function generateChoiceQuestions() {
  const questions = [];

  // 1. 字母大小写匹配 (20题)
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  for (let i = 0; i < 20; i++) {
    const upper = letters[i];
    const lower = upper.toLowerCase();
    const wrongOptions = shuffle(letters.filter(l => l !== upper)).slice(0, 3).map(l => l.toLowerCase());
    const options = shuffle([lower, ...wrongOptions]);
    const correctIndex = options.indexOf(lower);
    const answer = String.fromCharCode(65 + correctIndex);

    questions.push({
      question_type: 'choice',
      subject: '英语',
      grade: '一年级',
      chapter: '字母认知',
      content: `大写字母 "${upper}" 的小写形式是？`,
      options: options,
      answer: answer,
      analysis: `大写字母${upper}对应的小写字母是${lower}。`,
      difficulty: ['easy', 'medium', 'hard'][i % 3],
      score: 2
    });
  }

  // 2. 颜色单词 (20题)
  const colors = [
    { en: 'red', cn: '红色' }, { en: 'blue', cn: '蓝色' }, { en: 'green', cn: '绿色' },
    { en: 'yellow', cn: '黄色' }, { en: 'black', cn: '黑色' }, { en: 'white', cn: '白色' },
    { en: 'pink', cn: '粉色' }, { en: 'orange', cn: '橙色' }, { en: 'purple', cn: '紫色' },
    { en: 'brown', cn: '棕色' }
  ];

  for (let i = 0; i < 20; i++) {
    const color = colors[i % colors.length];
    const wrongColors = shuffle(colors.filter(c => c.en !== color.en));
    const options = shuffle([
      color.cn,
      wrongColors[0].cn,
      wrongColors[1].cn,
      wrongColors[2].cn
    ]);
    const correctIndex = options.indexOf(color.cn);
    const answer = String.fromCharCode(65 + correctIndex);

    questions.push({
      question_type: 'choice',
      subject: '英语',
      grade: '一年级',
      chapter: '颜色',
      content: `单词 "${color.en}" 的中文意思是？`,
      options: options,
      answer: answer,
      analysis: `${color.en}意思是${color.cn}。`,
      difficulty: ['easy', 'medium'][i % 2],
      score: 2
    });
  }

  // 3. 数字单词 (20题)
  const numbers = [
    { en: 'one', num: 1 }, { en: 'two', num: 2 }, { en: 'three', num: 3 },
    { en: 'four', num: 4 }, { en: 'five', num: 5 }, { en: 'six', num: 6 },
    { en: 'seven', num: 7 }, { en: 'eight', num: 8 }, { en: 'nine', num: 9 },
    { en: 'ten', num: 10 }
  ];

  for (let i = 0; i < 20; i++) {
    const num = numbers[i % numbers.length];
    const wrongNums = shuffle(numbers.filter(n => n.num !== num.num));
    const options = shuffle([
      String(num.num),
      String(wrongNums[0].num),
      String(wrongNums[1].num),
      String(wrongNums[2].num)
    ]);
    const correctIndex = options.indexOf(String(num.num));
    const answer = String.fromCharCode(65 + correctIndex);

    questions.push({
      question_type: 'choice',
      subject: '英语',
      grade: '一年级',
      chapter: '数字',
      content: `单词 "${num.en}" 表示的数字是？`,
      options: options,
      answer: answer,
      analysis: `${num.en}表示数字${num.num}。`,
      difficulty: 'easy',
      score: 2
    });
  }

  // 4. 动物单词 (20题)
  const animals = [
    { en: 'cat', cn: '猫' }, { en: 'dog', cn: '狗' }, { en: 'bird', cn: '鸟' },
    { en: 'fish', cn: '鱼' }, { en: 'pig', cn: '猪' }, { en: 'duck', cn: '鸭' },
    { en: 'chicken', cn: '鸡' }, { en: 'rabbit', cn: '兔子' }, { en: 'monkey', cn: '猴子' },
    { en: 'tiger', cn: '老虎' }
  ];

  for (let i = 0; i < 20; i++) {
    const animal = animals[i % animals.length];
    const wrongAnimals = shuffle(animals.filter(a => a.en !== animal.en));
    const options = shuffle([
      animal.cn,
      wrongAnimals[0].cn,
      wrongAnimals[1].cn,
      wrongAnimals[2].cn
    ]);
    const correctIndex = options.indexOf(animal.cn);
    const answer = String.fromCharCode(65 + correctIndex);

    questions.push({
      question_type: 'choice',
      subject: '英语',
      grade: '一年级',
      chapter: '动物',
      content: `单词 "${animal.en}" 的中文意思是？`,
      options: options,
      answer: answer,
      analysis: `${animal.en}意思是${animal.cn}。`,
      difficulty: ['easy', 'medium'][i % 2],
      score: 2
    });
  }

  // 5. 水果单词 (20题)
  const fruits = [
    { en: 'apple', cn: '苹果' }, { en: 'banana', cn: '香蕉' }, { en: 'orange', cn: '橙子' },
    { en: 'pear', cn: '梨' }, { en: 'grape', cn: '葡萄' }, { en: 'watermelon', cn: '西瓜' },
    { en: 'strawberry', cn: '草莓' }, { en: 'peach', cn: '桃子' }, { en: 'mango', cn: '芒果' },
    { en: 'lemon', cn: '柠檬' }
  ];

  for (let i = 0; i < 20; i++) {
    const fruit = fruits[i % fruits.length];
    const wrongFruits = shuffle(fruits.filter(f => f.en !== fruit.en));
    const options = shuffle([
      fruit.cn,
      wrongFruits[0].cn,
      wrongFruits[1].cn,
      wrongFruits[2].cn
    ]);
    const correctIndex = options.indexOf(fruit.cn);
    const answer = String.fromCharCode(65 + correctIndex);

    questions.push({
      question_type: 'choice',
      subject: '英语',
      grade: '一年级',
      chapter: '水果',
      content: `单词 "${fruit.en}" 的中文意思是？`,
      options: options,
      answer: answer,
      analysis: `${fruit.en}意思是${fruit.cn}。`,
      difficulty: ['easy', 'medium'][i % 2],
      score: 2
    });
  }

  return questions;
}

// 生成多选题数据
function generateMultipleQuestions() {
  const questions = [];

  // 1. 选择正确的颜色 (25题)
  const colors = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'pink', 'orange'];
  const colorCns = ['红色', '蓝色', '绿色', '黄色', '黑色', '白色', '粉色', '橙色'];

  for (let i = 0; i < 25; i++) {
    const numAnswers = 2 + (i % 2); // 2或3个答案
    const selectedIndices = shuffle([...Array(colors.length).keys()]).slice(0, numAnswers);
    const selectedColors = selectedIndices.map(idx => colorCns[idx]);

    const options = shuffle([...colorCns]);
    const answer = selectedColors.map(c => String.fromCharCode(65 + options.indexOf(c))).sort().join('');

    questions.push({
      question_type: 'multiple',
      subject: '英语',
      grade: '一年级',
      chapter: '颜色',
      content: `以下哪些是颜色的英文单词对应的中文？(选择${numAnswers}个)`,
      options: options,
      answer: answer,
      analysis: `正确答案包括：${selectedColors.join('、')}。`,
      difficulty: ['easy', 'medium', 'hard'][i % 3],
      score: 3
    });
  }

  // 2. 选择正确的动物 (25题)
  const animals = ['cat', 'dog', 'bird', 'fish', 'pig', 'duck', 'chicken', 'rabbit'];
  const animalCns = ['猫', '狗', '鸟', '鱼', '猪', '鸭', '鸡', '兔子'];

  for (let i = 0; i < 25; i++) {
    const numAnswers = 2 + (i % 2);
    const selectedIndices = shuffle([...Array(animals.length).keys()]).slice(0, numAnswers);
    const selectedAnimals = selectedIndices.map(idx => animalCns[idx]);

    const options = shuffle([...animalCns]);
    const answer = selectedAnimals.map(a => String.fromCharCode(65 + options.indexOf(a))).sort().join('');

    questions.push({
      question_type: 'multiple',
      subject: '英语',
      grade: '一年级',
      chapter: '动物',
      content: `以下哪些是动物的英文单词对应的中文？(选择${numAnswers}个)`,
      options: options,
      answer: answer,
      analysis: `正确答案包括：${selectedAnimals.join('、')}。`,
      difficulty: ['easy', 'medium', 'hard'][i % 3],
      score: 3
    });
  }

  // 3. 选择正确的水果 (25题)
  const fruits = ['apple', 'banana', 'orange', 'pear', 'grape', 'watermelon', 'strawberry', 'peach'];
  const fruitCns = ['苹果', '香蕉', '橙子', '梨', '葡萄', '西瓜', '草莓', '桃子'];

  for (let i = 0; i < 25; i++) {
    const numAnswers = 2 + (i % 2);
    const selectedIndices = shuffle([...Array(fruits.length).keys()]).slice(0, numAnswers);
    const selectedFruits = selectedIndices.map(idx => fruitCns[idx]);

    const options = shuffle([...fruitCns]);
    const answer = selectedFruits.map(f => String.fromCharCode(65 + options.indexOf(f))).sort().join('');

    questions.push({
      question_type: 'multiple',
      subject: '英语',
      grade: '一年级',
      chapter: '水果',
      content: `以下哪些是水果的英文单词对应的中文？(选择${numAnswers}个)`,
      options: options,
      answer: answer,
      analysis: `正确答案包括：${selectedFruits.join('、')}。`,
      difficulty: ['easy', 'medium', 'hard'][i % 3],
      score: 3
    });
  }

  // 4. 选择正确的数字 (25题)
  const numbers = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
  const numberCns = ['一', '二', '三', '四', '五', '六', '七', '八'];

  for (let i = 0; i < 25; i++) {
    const numAnswers = 2 + (i % 2);
    const selectedIndices = shuffle([...Array(numbers.length).keys()]).slice(0, numAnswers);
    const selectedNumbers = selectedIndices.map(idx => numberCns[idx]);

    const options = shuffle([...numberCns]);
    const answer = selectedNumbers.map(n => String.fromCharCode(65 + options.indexOf(n))).sort().join('');

    questions.push({
      question_type: 'multiple',
      subject: '英语',
      grade: '一年级',
      chapter: '数字',
      content: `以下哪些是数字的英文单词对应的中文？(选择${numAnswers}个)`,
      options: options,
      answer: answer,
      analysis: `正确答案包括：${selectedNumbers.join('、')}。`,
      difficulty: ['easy', 'medium', 'hard'][i % 3],
      score: 3
    });
  }

  return questions;
}

// 生成填空题数据
function generateFillQuestions() {
  const questions = [];

  // 1. 字母填空 (30题)
  for (let i = 0; i < 30; i++) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letter = letters[i % 26];
    const lower = letter.toLowerCase();

    questions.push({
      question_type: 'fill',
      subject: '英语',
      grade: '一年级',
      chapter: '字母认知',
      content: `大写字母 "${letter}" 对应的小写字母是____。`,
      answer: JSON.stringify([lower]),
      analysis: `大写字母${letter}对应的小写字母是${lower}。`,
      difficulty: 'easy',
      score: 2
    });
  }

  // 2. 颜色单词填空 (20题)
  const colors = [
    { en: 'red', cn: '红色' }, { en: 'blue', cn: '蓝色' }, { en: 'green', cn: '绿色' },
    { en: 'yellow', cn: '黄色' }, { en: 'black', cn: '黑色' }, { en: 'white', cn: '白色' },
    { en: 'pink', cn: '粉色' }, { en: 'orange', cn: '橙色' }, { en: 'purple', cn: '紫色' },
    { en: 'brown', cn: '棕色' }
  ];

  for (let i = 0; i < 20; i++) {
    const color = colors[i % colors.length];

    questions.push({
      question_type: 'fill',
      subject: '英语',
      grade: '一年级',
      chapter: '颜色',
      content: `"${color.cn}"的英文单词是____。`,
      answer: JSON.stringify([color.en]),
      analysis: `${color.cn}的英文是${color.en}。`,
      difficulty: ['easy', 'medium'][i % 2],
      score: 2
    });
  }

  // 3. 数字单词填空 (20题)
  const numbers = [
    { en: 'one', num: 1 }, { en: 'two', num: 2 }, { en: 'three', num: 3 },
    { en: 'four', num: 4 }, { en: 'five', num: 5 }, { en: 'six', num: 6 },
    { en: 'seven', num: 7 }, { en: 'eight', num: 8 }, { en: 'nine', num: 9 },
    { en: 'ten', num: 10 }
  ];

  for (let i = 0; i < 20; i++) {
    const num = numbers[i % numbers.length];

    questions.push({
      question_type: 'fill',
      subject: '英语',
      grade: '一年级',
      chapter: '数字',
      content: `数字"${num.num}"的英文单词是____。`,
      answer: JSON.stringify([num.en]),
      analysis: `数字${num.num}的英文是${num.en}。`,
      difficulty: 'easy',
      score: 2
    });
  }

  // 4. 动物单词填空 (15题)
  const animals = [
    { en: 'cat', cn: '猫' }, { en: 'dog', cn: '狗' }, { en: 'bird', cn: '鸟' },
    { en: 'fish', cn: '鱼' }, { en: 'pig', cn: '猪' }, { en: 'duck', cn: '鸭' },
    { en: 'chicken', cn: '鸡' }, { en: 'rabbit', cn: '兔子' }, { en: 'monkey', cn: '猴子' },
    { en: 'tiger', cn: '老虎' }, { en: 'lion', cn: '狮子' }, { en: 'elephant', cn: '大象' },
    { en: 'bear', cn: '熊' }, { en: 'wolf', cn: '狼' }, { en: 'fox', cn: '狐狸' }
  ];

  for (let i = 0; i < 15; i++) {
    const animal = animals[i];

    questions.push({
      question_type: 'fill',
      subject: '英语',
      grade: '一年级',
      chapter: '动物',
      content: `"${animal.cn}"的英文单词是____。`,
      answer: JSON.stringify([animal.en]),
      analysis: `${animal.cn}的英文是${animal.en}。`,
      difficulty: ['easy', 'medium'][i % 2],
      score: 2
    });
  }

  // 5. 水果单词填空 (15题)
  const fruits = [
    { en: 'apple', cn: '苹果' }, { en: 'banana', cn: '香蕉' }, { en: 'orange', cn: '橙子' },
    { en: 'pear', cn: '梨' }, { en: 'grape', cn: '葡萄' }, { en: 'watermelon', cn: '西瓜' },
    { en: 'strawberry', cn: '草莓' }, { en: 'peach', cn: '桃子' }, { en: 'mango', cn: '芒果' },
    { en: 'lemon', cn: '柠檬' }, { en: 'cherry', cn: '樱桃' }, { en: 'pineapple', cn: '菠萝' },
    { en: 'coconut', cn: '椰子' }, { en: 'kiwi', cn: '猕猴桃' }, { en: 'papaya', cn: '木瓜' }
  ];

  for (let i = 0; i < 15; i++) {
    const fruit = fruits[i];

    questions.push({
      question_type: 'fill',
      subject: '英语',
      grade: '一年级',
      chapter: '水果',
      content: `"${fruit.cn}"的英文单词是____。`,
      answer: JSON.stringify([fruit.en]),
      analysis: `${fruit.cn}的英文是${fruit.en}。`,
      difficulty: ['easy', 'medium'][i % 2],
      score: 2
    });
  }

  return questions;
}

// 主函数
async function main() {
  console.log('开始批量创建题目...\n');

  const choiceQuestions = generateChoiceQuestions();
  const multipleQuestions = generateMultipleQuestions();
  const fillQuestions = generateFillQuestions();

  console.log(`单选题: ${choiceQuestions.length} 道`);
  console.log(`多选题: ${multipleQuestions.length} 道`);
  console.log(`填空题: ${fillQuestions.length} 道`);
  console.log(`总计: ${choiceQuestions.length + multipleQuestions.length + fillQuestions.length} 道\n`);

  let successCount = 0;
  let failCount = 0;

  // 创建单选题
  console.log('正在创建单选题...');
  for (let i = 0; i < choiceQuestions.length; i++) {
    const result = await createQuestion(choiceQuestions[i]);
    if (result.code === 0) {
      successCount++;
    } else {
      failCount++;
      console.log(`  单选题 ${i + 1} 失败: ${result.message}`);
    }
    if ((i + 1) % 20 === 0) {
      console.log(`  已创建 ${i + 1}/${choiceQuestions.length} 道`);
    }
  }

  // 创建多选题
  console.log('正在创建多选题...');
  for (let i = 0; i < multipleQuestions.length; i++) {
    const result = await createQuestion(multipleQuestions[i]);
    if (result.code === 0) {
      successCount++;
    } else {
      failCount++;
      console.log(`  多选题 ${i + 1} 失败: ${result.message}`);
    }
    if ((i + 1) % 20 === 0) {
      console.log(`  已创建 ${i + 1}/${multipleQuestions.length} 道`);
    }
  }

  // 创建填空题
  console.log('正在创建填空题...');
  for (let i = 0; i < fillQuestions.length; i++) {
    const result = await createQuestion(fillQuestions[i]);
    if (result.code === 0) {
      successCount++;
    } else {
      failCount++;
      console.log(`  填空题 ${i + 1} 失败: ${result.message}`);
    }
    if ((i + 1) % 20 === 0) {
      console.log(`  已创建 ${i + 1}/${fillQuestions.length} 道`);
    }
  }

  console.log('\n========================================');
  console.log(`创建完成！`);
  console.log(`成功: ${successCount} 道`);
  console.log(`失败: ${failCount} 道`);
  console.log('========================================');
}

main().catch(err => {
  console.error('执行失败:', err);
  process.exit(1);
});
