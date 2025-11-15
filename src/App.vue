<template>
  <div class="pdf-ocr-container">
    <el-container class="main-container">
      <!-- 左侧PDF文件清单 -->
      <el-aside width="250px" class="sidebar">
        <h3>PDF文件清单</h3>
        <el-upload
          class="upload-container"
          drag
          :auto-upload="false"
          :show-file-list="false"
          accept=".pdf"
          :on-change="handleFileUpload"
        >
          <el-icon class="upload-icon"><Plus /></el-icon>
          <div class="el-upload__text">拖拽文件到此处或<em>点击上传</em></div>
        </el-upload>
        <div class="file-list">
          <el-table :data="pdfFiles" style="width: 100%" @row-click="selectPdfFile">
            <el-table-column prop="name" label="文件名" width="180"></el-table-column>
            <el-table-column prop="size" label="大小" width="70" :formatter="formatFileSize"></el-table-column>
          </el-table>
        </div>
      </el-aside>

      <!-- 中间PDF预览区域 -->
      <el-main class="pdf-preview">
        <div class="upload-area" v-if="!currentPdfUrl">
          <el-upload
            class="preview-upload"
            drag
            :auto-upload="false"
            :show-file-list="false"
            accept=".pdf"
            :on-change="handleFileUpload"
          >
            <el-icon class="upload-icon"><Picture /></el-icon>
            <div class="el-upload__text">拖拽PDF文件到此处或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">支持PDF格式文件</div>
            </template>
          </el-upload>
        </div>
        <div v-else class="pdf-container">
          <div class="pdf-controls">
            <el-button @click="prevPage" :disabled="pageNum <= 1">上一页</el-button>
            <span>第 {{ pageNum }} 页，共 {{ pdfTotalPages }} 页</span>
            <el-button @click="nextPage" :disabled="pageNum >= pdfTotalPages">下一页</el-button>
          </div>
          <div class="pdf-viewer">
            <canvas ref="pdfCanvas" class="pdf-canvas"></canvas>
          </div>
        </div>
      </el-main>

      <!-- 右侧OCR识别内容 -->
      <el-aside width="350px" class="ocr-content">
        <h3>OCR识别结果</h3>
        <div class="search-controls">
          <el-input 
            v-model="searchText" 
            placeholder="搜索PDF内容" 
            @keyup.enter="performSearch"
            style="margin-bottom: 10px;"
          >
            <template #append>
              <el-button @click="performSearch">搜索</el-button>
            </template>
          </el-input>
          <div v-if="searchResults.length > 0" class="search-info">
            找到 {{ searchResults.length }} 个匹配项
          </div>
        </div>
        <div class="ocr-controls">
          <el-button @click="performOCR" type="primary" :loading="ocrLoading">执行OCR识别</el-button>
          <el-button @click="copyText">复制文本</el-button>
        </div>
        <div class="ocr-result" v-if="ocrResult">
          <pre>{{ ocrResult }}</pre>
        </div>
        <div v-else class="ocr-placeholder">
          <p>识别结果将显示在这里</p>
          <p>点击"执行OCR识别"按钮开始识别</p>
        </div>
      </el-aside>
    </el-container>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import { Plus, Picture } from '@element-plus/icons-vue'

// 设置PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.js'

export default {
  name: 'App',
  components: {
    Plus,
    Picture
  },
  setup() {
    const pdfFiles = ref([])
    const currentPdfUrl = ref('')
    const pageNum = ref(1)
    const pdfTotalPages = ref(0)
    const pdfCanvas = ref(null)
    const ocrResult = ref('')
    const ocrLoading = ref(false)
    const searchText = ref('')
    const searchResults = ref([])
    const currentSearchIndex = ref(-1)
    
    // 处理文件上传
    const handleFileUpload = (file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const newFile = {
          name: file.name,
          size: file.size,
          url: URL.createObjectURL(file.raw)
        }
        
        // 添加到文件列表
        pdfFiles.value.push(newFile)
        
        // 选择刚上传的文件
        selectPdfFile(newFile)
      }
      reader.readAsDataURL(file.raw)
    }
    
    // 选择PDF文件
    const selectPdfFile = (file) => {
      currentPdfUrl.value = file.url
      pageNum.value = 1
      ocrResult.value = '' // 清空之前的OCR结果
      nextTick(() => {
        renderPdf()
      })
    }
    
    // 渲染PDF
    const renderPdf = async () => {
      if (!currentPdfUrl.value) return
      
      try {
        const loadingTask = pdfjsLib.getDocument(currentPdfUrl.value)
        const pdf = await loadingTask.promise
        pdfTotalPages.value = pdf.numPages
        
        await renderPdfPage(pdf, pageNum.value)
      } catch (error) {
        console.error('PDF渲染失败:', error)
      }
    }
    
    // 渲染PDF页面
    const renderPdfPage = async (pdf, pageNumber) => {
      // 如果当前有搜索结果，则使用高亮渲染
      if (searchResults.value && searchResults.value.length > 0) {
        // 获取当前页面的匹配项
        const currentPageMatches = searchResults.value.filter(match => match.page === pageNumber)
        await renderPdfPageWithHighlights(pdf, pageNumber, currentPageMatches)
      } else {
        const page = await pdf.getPage(pageNumber)
        const scale = 1.5
        const viewport = page.getViewport({ scale })
        
        const canvas = pdfCanvas.value
        const context = canvas.getContext('2d')
        canvas.height = viewport.height
        canvas.width = viewport.width
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        }
        await page.render(renderContext).promise
      }
    }
    
    // 上一页
    const prevPage = async () => {
      if (pageNum.value > 1) {
        pageNum.value--
        console.log(`切换到第 ${pageNum.value} 页`)
        // 重新渲染PDF页面
        if (currentPdfUrl.value) {
          try {
            const loadingTask = pdfjsLib.getDocument(currentPdfUrl.value)
            const pdf = await loadingTask.promise
            await renderPdfPage(pdf, pageNum.value)
          } catch (error) {
            console.error('PDF渲染失败:', error)
          }
        }
      }
    }
    
    // 下一页
    const nextPage = async () => {
      if (pageNum.value < pdfTotalPages.value) {
        pageNum.value++
        console.log(`切换到第 ${pageNum.value} 页`)
        // 重新渲染PDF页面
        if (currentPdfUrl.value) {
          try {
            const loadingTask = pdfjsLib.getDocument(currentPdfUrl.value)
            const pdf = await loadingTask.promise
            await renderPdfPage(pdf, pageNum.value)
          } catch (error) {
            console.error('PDF渲染失败:', error)
          }
        }
      }
    }
    
    // 执行OCR识别
    const performOCR = async () => {
      ocrLoading.value = true
      // 模拟OCR识别过程
      setTimeout(() => {
        ocrResult.value = `模拟OCR识别结果：\n\n这是从PDF第${pageNum.value}页识别出的文本内容。\n\nAI OCR技术能够识别PDF文档中的文字信息，并将其转换为可编辑的文本格式。`
        ocrLoading.value = false
      }, 2000)
    }
    
    // 复制文本
    const copyText = () => {
      if (ocrResult.value) {
        navigator.clipboard.writeText(ocrResult.value)
          .then(() => {
            alert('文本已复制到剪贴板')
          })
          .catch(err => {
            console.error('复制失败:', err)
          })
      }
    }
    
    // 执行搜索
    const performSearch = async () => {
      if (!searchText.value || !currentPdfUrl.value) return
      
      try {
        const loadingTask = pdfjsLib.getDocument(currentPdfUrl.value)
        const pdf = await loadingTask.promise
        const totalPages = pdf.numPages
        
        // 存储所有页面的搜索结果
        const allMatches = []
        
        // 遍历所有页面进行搜索
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdf.getPage(pageNum)
          
          // 获取页面文本内容
          const textContent = await page.getTextContent()
          const textItems = textContent.items
          const textStrings = textItems.map(item => item.str)
          const fullText = textStrings.join('')
          
          // 搜索文本
          const matches = []
          let searchStart = 0
          let searchIndex
          
          while ((searchIndex = fullText.toLowerCase().indexOf(searchText.value.toLowerCase(), searchStart)) !== -1) {
            matches.push({
              text: searchText.value,
              startIndex: searchIndex,
              endIndex: searchIndex + searchText.value.length,
              page: pageNum
            })
            searchStart = searchIndex + 1
          }
          
          // 将当前页面的匹配项添加到总结果中
          allMatches.push(...matches)
          
          // 在控制台打印每页的搜索结果
          if (matches.length > 0) {
            console.log(`在第 ${pageNum} 页找到了 ${matches.length} 个匹配项`)
          }
        }
        
        searchResults.value = allMatches
        currentSearchIndex.value = allMatches.length > 0 ? 0 : -1
        
        // 在控制台打印总览
        if (allMatches.length > 0) {
          console.log(`在整个文档中找到了 ${allMatches.length} 个匹配项，分布在 ${totalPages} 页中`)
        } else {
          console.log(`在整个文档中没有找到 "${searchText.value}"`)
        }
        
        // 如果当前页面有匹配项，则高亮显示
        const currentPageMatches = allMatches.filter(match => match.page === pageNum.value)
        if (currentPageMatches.length > 0) {
          // 重新渲染当前页面并高亮匹配项
          await renderPdfPageWithHighlights(pdf, pageNum.value, currentPageMatches)
        } else {
          // 重新渲染当前页面（无高亮）
          await renderPdf(pdf)
        }
      } catch (error) {
        console.error('搜索失败:', error)
      }
    }
    
    // 渲染带高亮的PDF页面
    const renderPdfPageWithHighlights = async (pdf, pageNumber, currentPageMatches) => {
      const page = await pdf.getPage(pageNumber)
      const scale = 1.5
      const viewport = page.getViewport({ scale })
      
      const canvas = pdfCanvas.value
      const context = canvas.getContext('2d')
      canvas.height = viewport.height
      canvas.width = viewport.width
      
      // 渲染PDF页面
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }
      await page.render(renderContext).promise
      
      // 高亮当前页面的匹配项
      if (currentPageMatches && currentPageMatches.length > 0) {
        // 设置高亮样式
        context.fillStyle = 'rgba(255, 255, 0, 0.4)' // 黄色半透明
        context.strokeStyle = 'red'
        context.lineWidth = 1.5
        
        // 获取当前页面的文本内容
        const textContent = await page.getTextContent()
        const items = textContent.items
        
        // 遍历文本项，高亮匹配的内容
        let textStartIndex = 0
        for (const item of items) {
          const itemStartIndex = textStartIndex
          const itemEndIndex = textStartIndex + item.str.length
          
          // 检查当前文本项是否包含搜索词
          if (item.str.toLowerCase().includes(searchText.value.toLowerCase())) {
            // 获取文本项的变换矩阵
            const transform = item.transform
            // 计算位置
            const x = transform[4] * scale
            const y = canvas.height - (transform[5] * scale + 10)
            // 计算大致的宽度和高度
            const width = item.width * scale
            const height = 15
            
            // 绘制高亮矩形
            context.fillRect(x, y - height, width, height)
            context.strokeRect(x, y - height, width, height)
          }
          
          textStartIndex = itemEndIndex
        }
      }
    }
    
    // 格式化文件大小
    const formatFileSize = (row, column, cellValue) => {
      if (cellValue < 1024) {
        return cellValue + ' B'
      } else if (cellValue < 1024 * 1024) {
        return (cellValue / 1024).toFixed(1) + ' KB'
      } else {
        return (cellValue / (1024 * 1024)).toFixed(1) + ' MB'
      }
    }
    
    onMounted(() => {
      // 初始化PDF.js
    })
    
    return {
      pdfFiles,
      currentPdfUrl,
      pageNum,
      pdfTotalPages,
      pdfCanvas,
      ocrResult,
      ocrLoading,
      searchText,
      searchResults,
      currentSearchIndex,
      handleFileUpload,
      selectPdfFile,
      renderPdf,
      prevPage,
      nextPage,
      performOCR,
      copyText,
      performSearch,
      formatFileSize
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.pdf-ocr-container {
  height: 100vh;
  width: 100%;
}

.main-container {
  height: 100vh;
}

.sidebar {
  background-color: #f5f5f5;
  padding: 15px;
  border-right: 1px solid #dcdfe6;
  display: flex;
  flex-direction: column;
}

.sidebar h3 {
  margin-bottom: 15px;
}

.upload-container {
  margin-bottom: 20px;
}

.file-list {
  flex: 1;
  overflow-y: auto;
}

.pdf-preview {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f9f9f9;
}

.pdf-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.pdf-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pdf-viewer {
  width: 100%;
  overflow: auto;
  display: flex;
  justify-content: center;
}

.pdf-canvas {
  border: 1px solid #dcdfe6;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  max-width: 100%;
}

.upload-area {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-upload {
  width: 100%;
  text-align: center;
}

.ocr-content {
  background-color: #f5f5f5;
  padding: 15px;
  border-left: 1px solid #dcdfe6;
  display: flex;
  flex-direction: column;
}

.ocr-content h3 {
  margin-bottom: 15px;
}

.search-controls {
  margin-bottom: 15px;
}

.search-info {
  font-size: 12px;
  color: #606266;
  margin-bottom: 10px;
}

.ocr-controls {
  margin-bottom: 15px;
}

.ocr-result {
  flex: 1;
  overflow-y: auto;
  background: white;
  border: 1px solid #dcdfe6;
  padding: 15px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.ocr-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #909399;
  text-align: center;
  padding: 20px;
}

.el-table {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: auto;
}
</style>