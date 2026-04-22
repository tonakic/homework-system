#!/bin/bash
# tests/security/run-tests.sh

# 安全测试运行脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTS_DIR="$(dirname "$SCRIPT_DIR")"

echo "========================================"
echo "  作业系统安全测试套件"
echo "========================================"
echo ""

# 检查依赖
if [ ! -d "$TESTS_DIR/node_modules" ]; then
    echo "安装依赖..."
    cd "$TESTS_DIR" && npm install
fi

# 创建报告目录
mkdir -p "$TESTS_DIR/reports/security/html"
mkdir -p "$TESTS_DIR/test-results/security"

# 运行特定测试套件
run_test() {
    local test_name=$1
    echo ""
    echo "运行测试: $test_name"
    echo "----------------------------------------"

    cd "$SCRIPT_DIR"
    npx playwright test --config=playwright.security.config.ts --project="$test_name"

    if [ $? -eq 0 ]; then
        echo "✓ $test_name 测试通过"
    else
        echo "✗ $test_name 测试失败"
    fi
}

# 如果提供了参数，只运行指定的测试
if [ -n "$1" ]; then
    run_test "$1"
else
    # 运行所有安全测试
    echo "运行所有安全测试..."
    echo ""

    run_test "cross-permission"
    run_test "auth-vulnerability"
    run_test "injection"
    run_test "business-logic"
fi

echo ""
echo "========================================"
echo "  测试完成"
echo "========================================"
echo ""
echo "报告位置: $TESTS_DIR/reports/security/html/index.html"
echo ""
