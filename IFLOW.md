# AI OCR PDF Viewer 项目文档

## 项目概述

这是一个基于Vue 3的PDF查看器应用程序，具有OCR（光学字符识别）功能。该应用程序允许用户上传PDF文件，浏览PDF内容，并对PDF页面执行OCR识别以提取文本内容。

### 核心功能
- PDF文件上传和管理
- PDF文档浏览（支持翻页）
- OCR文本识别功能
- 识别结果展示和复制

### 技术栈
- **前端框架**: Vue 3 (Composition API)
- **UI组件库**: Element Plus
- **PDF处理**: pdfjs-dist
- **构建工具**: Vite
- **开发语言**: JavaScript

## 项目结构

```
ai_ocr/
├── src/
│   ├── App.vue          # 主应用程序组件
│   └── main.js          # 应用入口文件
├── index.html           # HTML模板
├── package.json         # 项目配置和依赖
└── vite.config.js       # Vite构建配置
```

## 开发环境设置

### 前置要求
- Node.js (推荐版本 14+)
- npm 或 yarn 包管理器

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```
启动后，应用将在 http://0.0.0.0:3000 上运行

### 构建生产版本
```bash
npm run build
```

### 预览生产构建
```bash
npm run preview
```

## 核心组件说明

### App.vue
这是应用的主要组件，包含三个主要区域：
1. **左侧PDF文件清单**：显示已上传的PDF文件列表，支持文件上传
2. **中间PDF预览区域**：显示PDF内容，支持翻页功能
3. **右侧OCR识别内容**：显示OCR识别结果，提供执行OCR和复制文本功能

### 功能实现细节

#### PDF处理
- 使用pdfjs-dist库处理PDF文件
- 支持PDF页面渲染和翻页功能
- 使用Canvas渲染PDF内容
- 通过CDN加载PDF.js worker文件

#### OCR功能
- 当前实现为模拟OCR识别功能
- 实际项目中可集成Tesseract.js或其他OCR服务
- 识别结果可复制到剪贴板

#### 文件上传
- 支持拖拽上传和点击上传
- 自动将上传的文件添加到文件列表
- 支持多文件管理
- 显示文件名和大小信息

## 开发规范

### 代码风格
- 使用Vue 3 Composition API
- 遵循Element Plus组件使用规范
- CSS样式采用scoped和全局样式结合的方式

### 项目配置
- Vite作为构建工具，提供快速的开发体验
- 配置了路径别名`@`指向src目录
- 外部化了pdf.worker.js以优化构建

### 依赖管理
- vue: Vue 3核心框架
- pdfjs-dist: PDF处理库
- element-plus: UI组件库
- @vitejs/plugin-vue: Vite的Vue插件

## 扩展建议

### OCR功能增强
1. 集成Tesseract.js实现真实的OCR识别
2. 添加OCR语言支持配置
3. 支持批量OCR处理

### PDF功能增强
1. 添加PDF页面缩放功能
2. 支持PDF文本选择和复制
3. 添加书签和注释功能

### 用户体验优化
1. 添加文件上传进度显示
2. 支持PDF页面缩略图导航
3. 添加OCR结果导出功能（TXT/PDF格式）

## 常见问题

### PDF渲染问题
如果遇到PDF渲染问题，检查：
1. 确保网络可以访问PDF.js的worker文件
2. 检查PDF文件是否损坏
3. 确认浏览器控制台是否有相关错误信息

### OCR识别准确性
当前为模拟实现，实际使用时：
1. 需要集成专业的OCR服务
2. 考虑图像预处理以提高识别准确率
3. 根据文档类型调整OCR参数