# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: specs/student.spec.ts >> 学生端功能测试 >> 导航栏功能测试
- Location: specs/student.spec.ts:74:7

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e5]:
    - generic [ref=e7]:
      - generic [ref=e8]: 钱
      - generic [ref=e9]:
        - heading "钱七同学" [level=2] [ref=e10]
        - paragraph [ref=e11]: 今天也要加油哦！
    - generic [ref=e12]:
      - generic [ref=e13] [cursor=pointer]:
        - img [ref=e15]
        - generic [ref=e18]:
          - heading "待答题" [level=3] [ref=e19]
          - paragraph [ref=e20]: 0 项作业等待完成
        - generic [ref=e21]: 
      - generic [ref=e22]:
        - generic [ref=e23]:
          - generic [ref=e24]: "0"
          - generic [ref=e25]: 已完成
        - generic [ref=e26]:
          - generic [ref=e27]: "0"
          - generic [ref=e28]: 平均分
        - generic [ref=e29]:
          - generic [ref=e30]: 0%
          - generic [ref=e31]: 正确率
      - generic [ref=e32]:
        - generic [ref=e33]:
          - heading "最近作业" [level=3] [ref=e34]
          - generic [ref=e35] [cursor=pointer]: 查看全部
        - paragraph [ref=e38]: 暂无作业记录
  - tablist [ref=e40]:
    - tab " 首页" [selected] [ref=e41] [cursor=pointer]:
      - generic [ref=e43]: 
      - generic [ref=e44]: 首页
    - tab " 待答" [ref=e45] [cursor=pointer]:
      - generic [ref=e47]: 
      - generic [ref=e48]: 待答
    - tab " 记录" [ref=e49] [cursor=pointer]:
      - generic [ref=e51]: 
      - generic [ref=e52]: 记录
    - tab " 错题" [ref=e53] [cursor=pointer]:
      - generic [ref=e55]: 
      - generic [ref=e56]: 错题
    - tab " 排行" [ref=e57] [cursor=pointer]:
      - generic [ref=e59]: 
      - generic [ref=e60]: 排行
    - tab " 我的" [ref=e61] [cursor=pointer]:
      - generic [ref=e63]: 
      - generic [ref=e64]: 我的
```