# Gimme Icon

**基于自然语言的图标搜索引擎。**

告别记忆图标名称！用 "一个代表用户设置的齿轮图标" 这样的自然语言描述，迅速找到你想要的图标。

[![Vercel](https://img.shields.io/badge/vercel-live-green?style=flat&logo=vercel)](https://gimme-icon-next.vercel.app) [![License](https://img.shields.io/github/license/lexmin0412/gimme-icon?color=blue)](LICENSE)

## ✨ 为什么需要 Gimme Icon？

现有的图标平台（如 Iconify、Heroicons）要求你**知道图标的确切名称或关键词**：

- 想找“搜索”图标？你得输入 `search`。
- 想找“用户头像”？你得知道它叫 `user` 或 `account`。

但现实中，你更可能这样想：
> “我需要一个**表示加载中的旋转动画图标**”  
> “有没有**绿色的对勾，代表成功**的图标？”

**Gimme Icon 让你像说话一样搜索图标**——无需记忆命名规范，语义理解直达结果。

## 功能特性

- ✅ **自然语言搜索**：输入描述性语句，AI 理解意图并匹配图标
- 🧩 **聚合多图标库**：默认支持 Heroicons、Lucide，可扩展至 Iconify 全量图标集（200+ 库）
- ⚡ **前端向量化**：使用 [Xenova/all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2) 在浏览器生成嵌入向量，**无需后端**
- 🛠 **按需加载**：首次仅索引常用库，用户可自定义启用更多图标集
- 💾 **离线可用**：向量化结果缓存至 IndexedDB，断网也能搜索
- 🚀 **高性能**: 基于 Next.js 16 和 React 19 构建，支持服务端渲染
- 🌐 **开源 & 免费**：MIT 许可，无 API 调用限制

## 🚀 快速体验

1. 访问在线 Demo 👉 [https://gimme-icon-next.vercel.app](https://gimme-icon-next.vercel.app)
2. 尝试搜索：
   - “一个蓝色的返回箭头”
   - “代表删除的垃圾桶图标”
   - “科技感的设置齿轮”

## 技术栈

- **前端框架**: Next.js 16（App Router） + React 19
- **向量模型**：`@xenova/transformers` + `all-MiniLM-L6-v2`
- **构建工具**: Turbopack
- **类型系统**: TypeScript 5
- **样式**: Tailwind CSS 4
- **包管理器**: pnpm 10.24.0

## 快速开始

### Clone 仓库

```bash
git clone https://github.com/lexmin0412/gimme-icon.git
cd gimme-icon
```

### 环境要求

- Node.js >= 20
- pnpm >= 10

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

应用将在 `http://localhost:3000` 启动。

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 项目结构

```
├── app/                  # Next.js App Router 应用目录
│   ├── api/              # API 路由
│   │   ├── chroma/       # ChromaDB 相关 API
│   │   └── update-tag/   # 标签更新 API
│   ├── components/       # React 组件
│   ├── layout.tsx        # 应用布局
│   └── page.tsx          # 首页
├── constants/            # 常量定义
├── context/              # React 上下文
├── data/                 # 数据文件
│   └── icons.json        # 图标数据
├── hooks/                # 自定义 Hooks
├── public/               # 静态资源
├── scripts/              # 脚本文件
│   └── extract-icons.ts  # 图标提取脚本
├── services/             # 服务层
│   ├── vector-stores/    # 向量存储实现
│   ├── chroma.ts         # ChromaDB 服务
│   └── embedding.ts      # 嵌入式模型服务
└── types/                # TypeScript 类型定义
```

## 核心功能说明

### 图标提取

使用 `scripts/extract-icons.ts` 脚本从Heroicons和Lucide图标库中提取图标数据：

```bash
pnpm run gen-icons
```

脚本会：
1. 解析图标库的React组件
2. 提取SVG路径和属性
3. 生成带标签和同义词的图标数据
4. 保存到 `data/icons.json` 文件

### 智能搜索

基于向量数据库实现的自然语言搜索功能：

1. 将图标描述和标签转换为向量嵌入
2. 使用ChromaDB进行相似性搜索
3. 支持语义理解和模糊匹配

### 用户标注

用户可以对图标进行标签标注，标注数据会：
1. 更新 `data/icons.json` 文件
2. 支持后续对接数据库
3. 提高搜索准确性

## 向量存储实现

项目支持多种向量存储实现，通过 `VectorStoreFactory` 工厂类进行切换：

- `MemoryVectorStore`: 内存存储（默认）
- `LocalChromaVectorStore`: 本地ChromaDB存储
- `CloudChromaVectorStore`: 云端ChromaDB存储

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

MIT License

## 未来计划

- [ ] 对接数据库存储
- [ ] 支持更多图标库
- [ ] 添加图标收藏功能
- [ ] 实现图标上传功能
- [ ] 支持多语言
- [ ] 优化搜索算法
- [ ] 支持自定义 Embedding 模型

## 联系方式

- 项目地址: https://github.com/lexmin0412/gimme-icon
