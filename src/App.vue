<template>
  <div class="pdf-ocr-container">
    <el-container class="main-container">
      <!-- 左侧文件清单 -->
      <el-aside v-if="showSidebar" width="250px" class="sidebar">
        <div class="sidebar-header">
          <h3>文件清单</h3>
          <el-button @click="toggleSidebar" :icon="Hide" size="small" class="toggle-sidebar-btn" title="隐藏"></el-button>
        </div>
        <el-upload
          class="upload-container"
          drag
          :auto-upload="false"
          :show-file-list="false"
          accept=".pdf,.docx"
          :on-change="handleFileUpload"
        >
          <el-icon class="upload-icon"><Plus /></el-icon>
          <div class="el-upload__text">拖拽文件到此处或<em>点击上传</em></div>
        </el-upload>
        <div class="file-list">
          <el-table :data="files" style="width: 100%" @row-click="selectFile">
            <el-table-column prop="name" label="文件名" width="180"></el-table-column>
            <el-table-column prop="size" label="大小" width="70" :formatter="formatFileSize"></el-table-column>
          </el-table>
        </div>
      </el-aside>

      <!-- 中间预览区域 -->
      <el-main class="preview-area">
        <div v-if="!showSidebar" class="show-sidebar-btn-container">
          <el-button @click="toggleSidebar" :icon="View" size="small" title="显示文件清单"></el-button>
        </div>
        <div class="upload-area" v-if="!currentFileUrl">
          <el-upload
            class="preview-upload"
            drag
            :auto-upload="false"
            :show-file-list="false"
            accept=".pdf,.docx"
            :on-change="handleFileUpload"
          >
            <el-icon class="upload-icon"><Picture /></el-icon>
            <div class="el-upload__text">拖拽PDF或DOCX文件到此处或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">支持PDF和DOCX格式文件</div>
            </template>
          </el-upload>
        </div>
        <div v-else class="preview-container">
          <!-- DOCX预览 -->
          <div v-if="currentFileType === 'docx'" class="docx-viewer">
            <vue-office-docx :src="currentFileUrl" style="height: 100%; width: 100%;" @rendered="docxRendered" />
          </div>
          
          <!-- PDF预览 -->
          <div v-else-if="currentFileType === 'pdf'" class="pdf-container">
            <div class="pdf-controls">
              <el-button @click="prevPage" :disabled="pageNum <= 1" :icon="ArrowLeft" size="small" circle></el-button>
              <span>第 {{ pageNum }} 页，共 {{ pdfTotalPages }} 页</span>
              <el-button @click="nextPage" :disabled="pageNum >= pdfTotalPages" :icon="ArrowRight" size="small" circle></el-button>
              <div class="page-navigation-inline">
                <el-input-number 
                  v-model="goToPageNumber" 
                  :min="1" 
                  :max="pdfTotalPages || 1" 
                  size="small"
                  style="width: 100px; margin: 0 10px;"
                />
                <el-button @click="goToPageByNumber" :icon="Right" size="small" circle title="跳转到指定页"></el-button>
              </div>
            </div>
            <div class="pdf-viewer">
              <canvas ref="pdfCanvas" class="pdf-canvas"></canvas>
            </div>
          </div>
        </div>
      </el-main>

      <!-- 右侧内容区域 -->
      <el-aside width="350px" class="content-area">
        <div class="content-header">
          <h3>{{ currentFileType === 'pdf' ? 'PDF OCR识别结果' : '文件内容' }}</h3>
          <el-button v-if="!showSidebar" @click="toggleSidebar" :icon="View" size="small" class="toggle-sidebar-btn" title="显示清单"></el-button>
        </div>
        <!-- 搜索控件 -->
        <div class="search-controls" v-if="currentFileType === 'pdf' || currentFileType === 'docx'">
          <el-input 
            v-model="searchText" 
            :placeholder="currentFileType === 'pdf' ? '搜索PDF内容' : '搜索文档内容'" 
            @keyup.enter="performSearch"
            style="margin-bottom: 10px;"
            size="small"
          >
            <template #append>
              <el-button @click="performSearch" :icon="Search" size="small"></el-button>
            </template>
          </el-input>
          <!-- PDF 搜索结果信息 -->
          <div v-if="currentFileType === 'pdf' && searchResults.length > 0" class="search-info">
            <div class="search-navigation">
              <el-button @click="goToPrevPdfSearchResult" size="small" :disabled="searchResults.length === 0">上一个</el-button>
              <span class="search-position">{{ (currentSearchIndex + 1) }} / {{ searchResults.length }}</span>
              <el-button @click="goToNextPdfSearchResult" size="small" :disabled="searchResults.length === 0">下一个</el-button>
            </div>
          </div>
          <!-- DOCX 搜索结果信息 -->
          <div v-if="currentFileType === 'docx' && docxSearchResults.length > 0" class="search-info">
            <div class="search-navigation">
              <el-button @click="goToPrevDocxSearchResult" size="small" :disabled="docxSearchResults.length === 0">上一个</el-button>
              <span class="search-position">{{ (currentDocxSearchIndex + 1) }} / {{ docxSearchResults.length }}</span>
              <el-button @click="goToNextDocxSearchResult" size="small" :disabled="docxSearchResults.length === 0">下一个</el-button>
            </div>
          </div>
        </div>
        <!-- PDF特有功能：OCR -->
        <div v-if="currentFileType === 'pdf'" class="ocr-controls">
          <el-button @click="performOCR" type="primary" :loading="ocrLoading" size="small">执行OCR识别</el-button>
          <el-button @click="copyText" size="small">复制文本</el-button>
        </div>
        <div class="content-result" v-if="contentResult">
          <pre>{{ contentResult }}</pre>
        </div>
        <div v-else class="content-placeholder">
          <p>内容将显示在这里</p>
          <p v-if="currentFileType === 'pdf'">点击"执行OCR识别"按钮开始识别</p>
          <p v-else-if="currentFileType === 'docx'">DOCX文件将在左侧预览区域显示</p>
        </div>
      </el-aside>
    </el-container>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import VueOfficeDocx from '@vue-office/docx'
import '@vue-office/docx/lib/index.css'
import { Plus, Picture, ArrowLeft, ArrowRight, Search, CopyDocument, Hide, View, Right } from '@element-plus/icons-vue'

// 设置PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js'

export default {
  name: 'App',
  components: {
    VueOfficeDocx,
    Plus,
    Picture,
    ArrowLeft,
    ArrowRight,
    Search,
    CopyDocument,
    Hide,
    View,
    Right
  },
  setup() {
    const files = ref([]) // 统一文件列表
    const currentFileUrl = ref('') // 当前文件URL
    const currentFileType = ref('') // 当前文件类型 (pdf 或 docx)
    const pageNum = ref(1)
    const pdfTotalPages = ref(0)
    const pdfCanvas = ref(null)
    const contentResult = ref('') // 统一内容结果
    const ocrLoading = ref(false)
    const searchText = ref('')
    const searchResults = ref([]) // PDF 搜索结果
    const currentSearchIndex = ref(-1)
    const goToPageNumber = ref(1)
    const showSidebar = ref(true)
    const docxSearchResults = ref([]) // DOCX 搜索结果
    const currentDocxSearchIndex = ref(-1) // 当前 DOCX 搜索结果索引
    
        // 处理文件上传
    const handleFileUpload = (file) => {
      const newFile = {
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file.raw),
        type: getFileType(file.name)
      }
      
      // 添加到文件列表
      files.value.push(newFile)
      
      // 选择刚上传的文件
      selectFile(newFile)
    }
    
    // 根据文件名获取文件类型
    const getFileType = (fileName) => {
      const extension = fileName.toLowerCase().split('.').pop()
      return extension
    }
    
    // 选择文件
    const selectFile = (file) => {
      currentFileUrl.value = file.url
      currentFileType.value = file.type
      pageNum.value = 1
      contentResult.value = '' // 清空之前的内容结果
      
      if (file.type === 'pdf') {
        nextTick(() => {
          renderPdf()
        })
      }
    }

    // 渲染PDF
    const renderPdf = async () => {
      if (!currentFileUrl.value || currentFileType.value !== 'pdf') return
      
      try {
        const loadingTask = pdfjsLib.getDocument(currentFileUrl.value)
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
    
    // DOCX渲染完成回调
    const docxRendered = () => {
      console.log('DOCX文件渲染完成')
      // 如果有搜索内容，则在渲染完成后执行搜索
      if (currentFileType.value === 'docx' && searchText.value) {
        nextTick(() => {
          performSearch()
        })
      }
    }
    
    // 针对 docx 文件执行搜索和高亮
    const performDocxSearch = () => {
      if (currentFileType.value !== 'docx' || !searchText.value) return
      
      // 清除之前的高亮
      clearDocxHighlights()
      
      // 获取 docx 预览容器
      const docxContainer = document.querySelector('.docx-viewer')
      if (!docxContainer) return
      
      // 获取所有文本节点
      const walker = document.createTreeWalker(
        docxContainer,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            return NodeFilter.FILTER_ACCEPT
          }
        }
      )
      
      const textNodes = []
      let node
      while (node = walker.nextNode()) {
        if (node.parentElement && node.parentElement.tagName !== 'SCRIPT' && node.parentElement.tagName !== 'STYLE') {
          if (node.textContent.trim() !== '') {
            textNodes.push(node)
          }
        }
      }
      
      // 存储匹配项的位置
      const matches = []
      
      // 在每个文本节点中搜索
      textNodes.forEach(textNode => {
        const text = textNode.textContent
        const regex = new RegExp(searchText.value, 'gi')
        let match
        while ((match = regex.exec(text)) !== null) {
          matches.push({
            node: textNode,
            index: match.index,
            length: match[0].length,
            text: match[0]
          })
        }
      })
      
      // 保存搜索结果
      docxSearchResults.value = matches
      currentDocxSearchIndex.value = matches.length > 0 ? 0 : -1
      
      // 高亮匹配项
      matches.forEach((match, index) => {
        const element = highlightDocxText(match.node, match.index, match.length)
        // 添加索引信息，用于导航
        if (element) {
          element.dataset.searchIndex = index
        }
      })
      
      console.log(`在DOCX文档中找到 ${matches.length} 个匹配项`)
    }
    
    // 高亮 docx 文本并返回高亮元素
    const highlightDocxText = (textNode, index, length) => {
      const parent = textNode.parentNode
      const beforeText = textNode.textContent.substring(0, index)
      const matchText = textNode.textContent.substring(index, index + length)
      const afterText = textNode.textContent.substring(index + length)
      
      const beforeNode = document.createTextNode(beforeText)
      const highlightNode = document.createElement('span')
      highlightNode.className = 'docx-search-highlight'
      highlightNode.textContent = matchText
      const afterNode = document.createTextNode(afterText)
      
      parent.replaceChild(beforeNode, textNode)
      parent.insertBefore(highlightNode, beforeNode.nextSibling)
      parent.insertBefore(afterNode, highlightNode.nextSibling)
      
      // 如果是当前搜索结果索引的项，则添加特殊样式
      if (docxSearchResults.value && currentDocxSearchIndex.value >= 0) {
        const matchIndex = docxSearchResults.value.findIndex(match => 
          match.node === textNode && match.index === index && match.length === length)
        if (matchIndex === currentDocxSearchIndex.value) {
          highlightNode.classList.add('docx-search-highlight-current')
        }
      }
      
      return highlightNode
    }
    
    // 清除 docx 高亮
    const clearDocxHighlights = () => {
      const highlights = document.querySelectorAll('.docx-search-highlight')
      highlights.forEach(highlight => {
        const parent = highlight.parentNode
        const textNode = document.createTextNode(highlight.textContent)
        parent.replaceChild(textNode, highlight)
        // 尝试合并相邻的文本节点
        parent.normalize()
      })
    }
    
    // 导航到下一个 DOCX 搜索结果
    const goToNextDocxSearchResult = () => {
      if (docxSearchResults.value.length === 0) return
      
      currentDocxSearchIndex.value = (currentDocxSearchIndex.value + 1) % docxSearchResults.value.length
      updateDocxHighlightSelection()
      scrollToCurrentDocxSearchResult()
    }
    
    // 导航到上一个 DOCX 搜索结果
    const goToPrevDocxSearchResult = () => {
      if (docxSearchResults.value.length === 0) return
      
      currentDocxSearchIndex.value = currentDocxSearchIndex.value <= 0 ? 
        docxSearchResults.value.length - 1 : currentDocxSearchIndex.value - 1
      updateDocxHighlightSelection()
      scrollToCurrentDocxSearchResult()
    }
    
    // 更新 DOCX 搜索结果高亮选择
    const updateDocxHighlightSelection = () => {
      // 移除之前的选择高亮
      document.querySelectorAll('.docx-search-highlight-current').forEach(el => {
        el.classList.remove('docx-search-highlight-current')
      })
      
      // 为当前索引的高亮项添加特殊样式
      const allHighlights = document.querySelectorAll('.docx-search-highlight')
      if (allHighlights[currentDocxSearchIndex.value]) {
        allHighlights[currentDocxSearchIndex.value].classList.add('docx-search-highlight-current')
      }
    }
    
    // 滚动到当前 DOCX 搜索结果
    const scrollToCurrentDocxSearchResult = () => {
      if (currentDocxSearchIndex.value < 0) return
      
      const allHighlights = document.querySelectorAll('.docx-search-highlight')
      const currentHighlight = allHighlights[currentDocxSearchIndex.value]
      
      if (currentHighlight) {
        currentHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // 添加一个临时的高亮效果
        currentHighlight.classList.add('docx-search-highlight-current')
      }
    }
    
    // 上一页
    const prevPage = async () => {
      if (currentFileType.value !== 'pdf' || pageNum.value <= 1) return
      
      pageNum.value--
      console.log(`切换到第 ${pageNum.value} 页`)
      // 重新渲染PDF页面
      if (currentFileUrl.value) {
        try {
          const loadingTask = pdfjsLib.getDocument(currentFileUrl.value)
          const pdf = await loadingTask.promise
          await renderPdfPage(pdf, pageNum.value)
        } catch (error) {
          console.error('PDF渲染失败:', error)
        }
      }
    }
    
    // 下一页
    const nextPage = async () => {
      if (currentFileType.value !== 'pdf' || pageNum.value >= pdfTotalPages.value) return
      
      pageNum.value++
      console.log(`切换到第 ${pageNum.value} 页`)
      // 重新渲染PDF页面
      if (currentFileUrl.value) {
        try {
          const loadingTask = pdfjsLib.getDocument(currentFileUrl.value)
          const pdf = await loadingTask.promise
          await renderPdfPage(pdf, pageNum.value)
        } catch (error) {
          console.error('PDF渲染失败:', error)
        }
      }
    }
    
    // 执行OCR识别
    const performOCR = async () => {
      if (currentFileType.value !== 'pdf') return
      
      ocrLoading.value = true
      // 模拟OCR识别过程
      setTimeout(() => {
        contentResult.value = `模拟OCR识别结果：

这是从PDF第${pageNum.value}页识别出的文本内容。

AI OCR技术能够识别PDF文档中的文字信息，并将其转换为可编辑的文本格式。`
        ocrLoading.value = false
      }, 2000)
    }
    
    // 复制文本
    const copyText = () => {
      if (contentResult.value) {
        navigator.clipboard.writeText(contentResult.value)
          .then(() => {
            alert('文本已复制到剪贴板')
          })
          .catch(err => {
            console.error('复制失败:', err)
          })
      }
    }
    
    // 获取唯一页面数组
    const getUniquePages = () => {
      if (!searchResults.value || searchResults.value.length === 0) return []
      const uniquePages = new Set(searchResults.value.map(result => result.page))
      return Array.from(uniquePages).sort((a, b) => a - b)
    }
    
    // 导航到下一个 PDF 搜索结果
    const goToNextPdfSearchResult = async () => {
      if (searchResults.value.length === 0) return
      
      // 更新当前搜索结果索引
      currentSearchIndex.value = (currentSearchIndex.value + 1) % searchResults.value.length
      
      // 获取当前搜索结果
      const currentResult = searchResults.value[currentSearchIndex.value]
      
      // 如果当前结果在不同页面，则跳转到该页面
      if (currentResult.page !== pageNum.value) {
        await goToPage(currentResult.page)
      } else {
        // 如果在同一页面，重新渲染以更新高亮
        if (currentFileUrl.value) {
          try {
            const loadingTask = pdfjsLib.getDocument(currentFileUrl.value)
            const pdf = await loadingTask.promise
            const currentPageMatches = searchResults.value.filter(match => match.page === pageNum.value)
            await renderPdfPageWithHighlights(pdf, pageNum.value, currentPageMatches)
          } catch (error) {
            console.error('PDF渲染失败:', error)
          }
        }
      }
    }
    
    // 导航到上一个 PDF 搜索结果
    const goToPrevPdfSearchResult = async () => {
      if (searchResults.value.length === 0) return
      
      // 更新当前搜索结果索引
      currentSearchIndex.value = currentSearchIndex.value <= 0 ? 
        searchResults.value.length - 1 : currentSearchIndex.value - 1
      
      // 获取当前搜索结果
      const currentResult = searchResults.value[currentSearchIndex.value]
      
      // 如果当前结果在不同页面，则跳转到该页面
      if (currentResult.page !== pageNum.value) {
        await goToPage(currentResult.page)
      } else {
        // 如果在同一页面，重新渲染以更新高亮
        if (currentFileUrl.value) {
          try {
            const loadingTask = pdfjsLib.getDocument(currentFileUrl.value)
            const pdf = await loadingTask.promise
            const currentPageMatches = searchResults.value.filter(match => match.page === pageNum.value)
            await renderPdfPageWithHighlights(pdf, pageNum.value, currentPageMatches)
          } catch (error) {
            console.error('PDF渲染失败:', error)
          }
        }
      }
    }
    
    // 跳转到指定页面
    const goToPage = async (page) => {
      if (currentFileType.value !== 'pdf' || page < 1 || page > pdfTotalPages.value) return
      
      pageNum.value = page
      console.log(`跳转到第 ${page} 页`)
      
      // 重新渲染PDF页面
      if (currentFileUrl.value) {
        try {
          const loadingTask = pdfjsLib.getDocument(currentFileUrl.value)
          const pdf = await loadingTask.promise
          await renderPdfPage(pdf, pageNum.value)
        } catch (error) {
          console.error('PDF渲染失败:', error)
        }
      }
    }
    
    // 通过页码输入跳转
    const goToPageByNumber = async () => {
      if (currentFileType.value !== 'pdf' || !goToPageNumber.value || goToPageNumber.value < 1) return
      // 确保页码不超过总页数
      const targetPage = Math.min(goToPageNumber.value, pdfTotalPages.value || 1)
      await goToPage(targetPage)
    }
    
    // 切换侧边栏显示
    const toggleSidebar = () => {
      showSidebar.value = !showSidebar.value
    }
    
    // 执行搜索
    const performSearch = async () => {
      if (!searchText.value || !currentFileUrl.value) return
      
      if (currentFileType.value === 'pdf') {
        // PDF 搜索逻辑
        try {
          const loadingTask = pdfjsLib.getDocument(currentFileUrl.value)
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
    } else if (currentFileType.value === 'docx') {
      // DOCX 搜索逻辑
      performDocxSearch()
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
        // 获取当前搜索结果（用于突出显示）
        const currentResult = searchResults.value[currentSearchIndex.value]
        
        // 设置高亮样式
        context.fillStyle = 'rgba(255, 255, 0, 0.5)' // 黄色半透明（普通高亮）
        context.strokeStyle = 'red'
        context.lineWidth = 1.5
        
        // 获取当前页面的文本内容
        const textContent = await page.getTextContent()
        const items = textContent.items
        
        // 遍历文本项，高亮包含搜索词的内容
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          // 检查当前文本项是否包含搜索词
          if (item.str.toLowerCase().includes(searchText.value.toLowerCase())) {
            // 使用PDF.js的变换矩阵来计算准确位置
            const transform = item.transform
            // 计算实际坐标 (PDF坐标系与Canvas坐标系不同，需要转换)
            const x = transform[4] * scale
            const y = canvas.height - (transform[5] * scale + (item.height || 12) * scale)
            // 计算宽度和高度
            const width = item.width ? item.width * scale : context.measureText(item.str).width
            const height = (item.height || 14) * scale * 1.2 // 增加高度以完全覆盖文字
            
            // 检查这是否是当前选中的搜索结果
            const isCurrentResult = currentResult && 
              currentResult.page === pageNumber && 
              Math.abs(currentResult.startIndex - item.str.toLowerCase().indexOf(searchText.value.toLowerCase())) < item.str.length
            
            // 绘制高亮矩形
            if (isCurrentResult) {
              // 当前选中的结果使用不同的颜色
              context.fillStyle = 'rgba(255, 165, 0, 0.8)' // 橙色半透明
              context.fillRect(x, y, width, height)
              context.fillStyle = 'rgba(255, 255, 0, 0.5)' // 恢复为黄色
            } else {
              // 普通高亮
              context.fillRect(x, y, width, height)
            }
            context.strokeRect(x, y, width, height)
          }
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
      files,
      currentFileUrl,
      currentFileType,
      pageNum,
      pdfTotalPages,
      pdfCanvas,
      contentResult,
      ocrLoading,
      searchText,
      searchResults,
      currentSearchIndex,
      goToPageNumber,
      showSidebar,
      docxSearchResults,
      currentDocxSearchIndex,
      // 图标组件
      Hide,
      View,
      ArrowLeft,
      ArrowRight,
      Search,
      CopyDocument,
      Right,
      handleFileUpload,
      selectFile,
      renderPdf,
      prevPage,
      nextPage,
      performOCR,
      copyText,
      performSearch,
      formatFileSize,
      getUniquePages,
      goToPage,
      goToPageByNumber,
      toggleSidebar,
      docxRendered,
      goToNextDocxSearchResult,
      goToPrevDocxSearchResult,
      goToNextPdfSearchResult,
      goToPrevPdfSearchResult
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

/* 统一字体大小和行高 */
body, .pdf-ocr-container, .main-container, .el-button, .el-input, .el-table {
  font-size: 14px;
  line-height: 1.5;
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

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.sidebar h3 {
  margin-bottom: 0;
  font-size: 16px;
  font-weight: 600;
}

.toggle-sidebar-btn {
  padding: 4px 8px;
}

.upload-container {
  margin-bottom: 20px;
}

.file-list {
  flex: 1;
  overflow-y: auto;
}

.preview-area {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f9f9f9;
}

.show-sidebar-btn-container {
  align-self: flex-start;
  margin-bottom: 10px;
}

.preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.docx-viewer {
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.pdf-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.page-navigation-inline {
  display: flex;
  align-items: center;
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

.content-area {
  background-color: #f5f5f5;
  padding: 15px;
  border-left: 1px solid #dcdfe6;
  display: flex;
  flex-direction: column;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.content-area h3 {
  margin-bottom: 0;
  font-size: 16px;
  font-weight: 600;
}

.search-controls {
  margin-bottom: 15px;
}

.search-info {
  font-size: 12px;
  color: #606266;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.match-count {
  margin-right: 10px;
}

.page-links-inline {
  display: inline-flex;
  flex-wrap: wrap;
}

.page-links {
  margin-top: 5px;
}

.page-link {
  display: inline-block;
  padding: 2px 8px;
  margin: 0 5px;
  background-color: #ecf5ff;
  color: #409eff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.page-link:hover {
  background-color: #409eff;
  color: white;
}

.ocr-controls {
  margin-bottom: 15px;
}

.content-result {
  flex: 1;
  overflow-y: auto;
  background: white;
  border: 1px solid #dcdfe6;
  padding: 15px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.content-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #909399;
  text-align: center;
  padding: 20px;
}

/* DOCX 搜索高亮样式 */
.docx-search-highlight {
  background-color: yellow;
  padding: 1px 2px;
  border-radius: 2px;
}

.docx-search-highlight-current {
  background-color: orange !important;
  color: white !important;
  padding: 1px 2px;
  border-radius: 2px;
  animation: highlight-pulse 1s infinite;
}

@keyframes highlight-pulse {
  0% { background-color: orange; }
  50% { background-color: orangered; }
  100% { background-color: orange; }
}

/* 搜索导航样式 */
.search-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.search-position {
  font-size: 12px;
  color: #606266;
  margin: 0 10px;
}

.el-table {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: auto;
}

/* Element Plus组件样式统一 */
.el-button {
  font-size: 14px;
  padding: 8px 16px;
}

.el-button--small {
  padding: 6px 12px;
}

.el-button.is-circle {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.el-input__inner {
  font-size: 14px;
  height: 32px;
}

.el-input-number {
  font-size: 14px;
}

.el-input-number .el-input__inner {
  height: 32px;
  padding: 0 10px;
}

.el-input-number__decrease,
.el-input-number__increase {
  width: 30px;
}
</style>