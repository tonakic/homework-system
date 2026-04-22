#!/usr/bin/env node
const XLSX = require('xlsx');
const path = require('path');

const templatePath = path.join(__dirname, 'src/templates/题库导入模板.xlsx');
const workbook = XLSX.readFile(templatePath);

// 检查是否已有判断题工作表
if (workbook.SheetNames.includes('判断题')) {
  console.log('判断题工作表已存在');
  process.exit(0);
}

// 创建判断题工作表
const judgmentData = [
  ['判断题导入模板'],
  ['说明：'],
  ['1. 第一行为标题行，请勿修改'],
  ['2. 第二行为示例数据，导入时会被跳过'],
  ['3. 请从第六行开始填写题目数据'],
  ['4. 正确答案填写：正确 或 错误（也可填写 A 或 B）'],
  [],
  ['科目*', '年级', '章节', '分值', '难度', '题干*', '正确答案*', '解析'],
  ['英语', '三年级', '第一章 语法', '1', '简单', 'The sun rises in the east. (太阳从东方升起。)', '正确', '这是正确的陈述'],
  ['英语', '三年级', '第一章 语法', '1', '中等', 'Cats can fly. (猫会飞。)', '错误', '猫不会飞，这是错误的陈述'],
  ['英语', '三年级', '第一章 语法', '1', '困难', 'Water boils at 100 degrees Celsius at sea level. (水在海平面100摄氏度沸腾。)', '正确', '这是正确的科学常识'],
  [],
  ['注意事项：'],
  ['1. 带*号的为必填项'],
  ['2. 难度可选：简单、中等、困难'],
  ['3. 正确答案格式：正确/错误 或 A/B'],
  ['4. 建议每次导入不超过500道题目']
];

const judgmentSheet = XLSX.utils.aoa_to_sheet(judgmentData);

// 设置列宽
judgmentSheet['!cols'] = [
  { wch: 10 },  // 科目
  { wch: 10 },  // 年级
  { wch: 20 },  // 章节
  { wch: 8 },   // 分值
  { wch: 8 },   // 难度
  { wch: 50 },  // 题干
  { wch: 12 },  // 正确答案
  { wch: 30 }   // 解析
];

// 添加判断题工作表到工作簿（在填空题之后、主观题之前）
const sheetNames = workbook.SheetNames;
const newOrder = [];
for (const name of sheetNames) {
  newOrder.push(name);
  if (name === '填空题') {
    newOrder.push('判断题');
  }
}
// 如果填空题不存在，添加到正确位置
if (!newOrder.includes('判断题')) {
  newOrder.splice(3, 0, '判断题');
}

workbook.SheetNames = newOrder;
workbook.Sheets['判断题'] = judgmentSheet;

// 保存文件
XLSX.writeFile(workbook, templatePath);
console.log('判断题工作表已添加到模板');
console.log('当前工作表顺序:', workbook.SheetNames);
