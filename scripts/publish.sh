#!/bin/bash

# 前端日志SDK发布脚本

set -e

echo "🚀 开始发布前端日志SDK..."

# 检查是否在主分支
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ] && [ "$current_branch" != "master" ]; then
  echo "❌ 请在main或master分支上发布"
  exit 1
fi

# 检查工作目录是否干净
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ 工作目录不干净，请先提交所有更改"
  exit 1
fi

# 运行测试
echo "🧪 运行测试..."
npm test

# 运行代码检查
echo "🔍 运行代码检查..."
npm run lint

# 构建项目
echo "🔨 构建项目..."
npm run build

# 检查构建产物
if [ ! -d "dist" ]; then
  echo "❌ 构建失败，dist目录不存在"
  exit 1
fi

echo "✅ 构建完成，检查dist目录结构："
ls -la dist/

# 询问版本类型
echo "📦 请选择版本更新类型："
echo "1) patch (修复bug)"
echo "2) minor (新功能)"
echo "3) major (破坏性更改)"
read -p "请输入选择 (1-3): " version_choice

case $version_choice in
  1) version_type="patch";;
  2) version_type="minor";;
  3) version_type="major";;
  *) echo "❌ 无效选择"; exit 1;;
esac

# 更新版本号
echo "📈 更新版本号 ($version_type)..."
npm version $version_type

# 获取新版本号
new_version=$(node -p "require('./package.json').version")
echo "🎯 新版本: $new_version"

# 推送到Git
echo "📤 推送到Git..."
git push origin $current_branch --tags

# 发布到npm
echo "📦 发布到npm..."
npm publish

echo "🎉 发布成功！版本 $new_version 已发布到npm"
echo "📖 查看发布: https://www.npmjs.com/package/@bruceloong/frontend-logger-sdk" 