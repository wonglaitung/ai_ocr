# AI OCR PDF Viewer 项目文档

## 项目概述

这是一个基于Vue 2的PDF和DOCX查看器应用程序，具有OCR（光学字符识别）功能。该应用程序允许用户上传PDF和DOCX文件，浏览文档内容，并对PDF页面执行OCR识别以提取文本内容。应用还提供了强大的全文搜索功能，支持在文档内容和OCR结果中进行高亮显示匹配项。

### 核心功能
- PDF和DOCX文件上传和管理
- 文档浏览（支持翻页和DOCX预览）
- 全文搜索功能（支持PDF和DOCX）
- OCR文本识别功能（集成Tesseract.js）
- 识别结果展示、高亮和复制
- 可切换的侧边栏界面

### 技术栈
- **前端框架**: Vue 2.7
- **UI组件库**: Element UI
- **PDF处理**: pdfjs-dist
- **OCR引擎**: Tesseract.js
- **文档预览**: @vue-office/docx
- **构建工具**: Webpack
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
├── webpack.config.js    # Webpack构建配置
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

## 核心组件说明

### App.vue
这是应用的主要组件，包含三个主要区域：
1. **左侧文件清单**：显示已上传的PDF和DOCX文件列表，支持拖拽和点击上传
2. **中间预览区域**：显示PDF内容或DOCX文档，支持翻页功能
3. **右侧内容区域**：显示OCR识别结果或文档内容，提供搜索、OCR执行和复制文本功能

### 功能实现细节

#### PDF处理
- 使用pdfjs-dist库处理PDF文件
- 支持PDF页面渲染和翻页功能
- 使用Canvas渲染PDF内容
- 通过本地pdf.worker.js文件进行PDF解析

#### DOCX处理
- 使用@vue-office/docx库处理DOCX文件
- 提供文档内容预览功能
- 支持文档内容搜索和高亮

#### OCR功能
- 集成Tesseract.js实现真实的OCR识别
- 支持中文和英文识别（chi_sim+eng）
- 从PDF页面中提取图像并进行文字识别
- 识别结果可复制到剪贴板

#### 搜索功能
- 支持PDF和DOCX文档内容全文搜索
- 搜索结果高亮显示
- 提供搜索结果导航（上一个/下一个）

#### 文件上传
- 支持拖拽上传和点击上传
- 自动将上传的文件添加到文件列表
- 支持PDF和DOCX文件格式
- 显示文件名和大小信息

## 开发规范

### 代码风格
- 使用Vue 2 Options API
- 遵循Element UI组件使用规范
- CSS样式采用全局样式结合Element UI组件

### 项目配置
- Webpack作为构建工具，提供开发和生产构建
- 配置了Vue Loader、Babel等必要的加载器
- 静态资源通过public目录提供

### 依赖管理
- vue: Vue 2.7核心框架
- element-ui: UI组件库
- pdfjs-dist: PDF处理库
- tesseract.js: OCR引擎
- @vue-office/docx: DOCX预览库
- webpack: 构建工具

## 扩展建议

### OCR功能增强
1. 添加OCR语言支持配置界面
2. 支持批量OCR处理功能
3. 优化图像预处理以提高识别准确率

### PDF功能增强
1. 添加PDF页面缩放功能
2. 支持PDF文本选择和复制
3. 添加书签和注释功能

### 用户体验优化
1. 添加文件上传进度显示
2. 支持PDF页面缩略图导航
3. 添加OCR结果导出功能（TXT/PDF格式）
4. 优化搜索性能，支持更复杂的搜索选项

## 常见问题

### PDF渲染问题
如果遇到PDF渲染问题，检查：
1. 确保pdf.worker.js文件在public目录中
2. 检查PDF文件是否损坏
3. 确认浏览器控制台是否有相关错误信息

### OCR识别准确性
当前使用Tesseract.js进行OCR识别：
1. 识别准确性依赖于图像质量
2. 可通过图像预处理提高识别率
3. 支持中文和英文混合识别

### 搜索功能问题
如果搜索功能无法正常工作：
1. 确认文档包含可搜索的文本层
2. 对于纯图像PDF，需要先进行OCR识别
3. 检查搜索词是否包含特殊字符