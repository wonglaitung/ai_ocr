# AI OCR PDF Viewer

这是一个基于Vue 3的PDF查看器应用程序，具有OCR（光学字符识别）功能。该应用程序允许用户上传PDF文件，浏览PDF内容，并对PDF页面执行OCR识别以提取文本内容。

## 功能特性

- PDF文件上传和管理
- PDF文档浏览（支持翻页）
- 全文搜索功能，支持高亮显示匹配项
- OCR文本识别功能（模拟实现）
- 识别结果展示和复制
- 可隐藏的文件清单侧边栏
- 页面跳转功能

## 技术栈

- **前端框架**: Vue 3 (Composition API)
- **UI组件库**: Element Plus
- **PDF处理**: pdfjs-dist
- **构建工具**: Vite
- **开发语言**: JavaScript

## 项目结构

```
ai_ocr/
├── public/              # 静态资源目录
│   └── pdf.worker.js    # PDF.js worker文件
├── src/
│   ├── App.vue          # 主应用程序组件
│   └── main.js          # 应用入口文件
├── index.html           # HTML模板
├── package.json         # 项目配置和依赖
├── vite.config.js       # Vite构建配置
└── README.md            # 项目说明文档
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

启动后，应用将在 http://localhost:3000 上运行

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 使用说明

1. **上传PDF文件**：点击左侧区域的上传框或拖拽PDF文件到指定区域
2. **浏览PDF**：使用中间区域的上一页/下一页按钮或页码跳转功能浏览PDF
3. **搜索文本**：在右侧OCR区域输入搜索关键词，点击搜索按钮查找PDF中的文本
4. **查看搜索结果**：搜索结果会显示匹配项数量和分布页码，点击页码可跳转到对应页面
5. **OCR识别**：点击"执行OCR识别"按钮模拟OCR识别过程
6. **复制文本**：点击"复制文本"按钮将OCR结果复制到剪贴板
7. **隐藏侧边栏**：点击左侧区域的隐藏按钮可隐藏文件清单，获得更多浏览空间

## 注意事项

- PDF.js worker文件已放置在public目录下，以支持内网部署
- 搜索功能仅适用于包含文本层的PDF文件，纯图片PDF需要集成OCR服务才能搜索
- OCR功能为模拟实现，实际项目中可集成Tesseract.js或其他OCR服务

## 扩展建议

1. 集成Tesseract.js实现真实的OCR识别
2. 添加PDF页面缩放功能
3. 支持PDF文本选择和复制
4. 添加书签和注释功能
5. 支持OCR语言配置
6. 添加OCR结果导出功能