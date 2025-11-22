<template>
  <div class="pdf-ocr-container">
    <el-container class="main-container">
      <!-- 左侧文件清单 -->
      <el-aside v-if="showSidebar" width="250px" class="sidebar">
        <div class="sidebar-header">
          <h3>文件清单</h3>
          <el-button @click="toggleSidebar" icon="el-icon-d-arrow-right" size="small" class="toggle-sidebar-btn" title="隐藏"></el-button>
        </div>
        <el-upload
          class="upload-container"
          drag
          :auto-upload="false"
          :show-file-list="false"
          accept=".pdf,.docx"
          :on-change="handleFileUpload"
          action="#"
        >
          <i class="el-icon-upload"></i>
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
          <el-button @click="toggleSidebar" icon="el-icon-d-arrow-left" size="small" title="显示文件清单"></el-button>
        </div>
        <div class="upload-area" v-if="!currentFileUrl">
          <el-upload
            class="preview-upload"
            drag
            :auto-upload="false"
            :show-file-list="false"
            accept=".pdf,.docx"
            :on-change="handleFileUpload"
            action="#"
          >
            <i class="el-icon-picture"></i>
            <div class="el-upload__text">拖拽PDF或DOCX文件到此处或<em>点击上传</em></div>
            <div class="el-upload__tip" slot="tip">支持PDF和DOCX格式文件</div>
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
              <el-button @click="prevPage" :disabled="pageNum <= 1" icon="el-icon-arrow-left" size="small" circle></el-button>
              <span>第 {{ pageNum }} 页，共 {{ pdfTotalPages }} 页</span>
              <el-button @click="nextPage" :disabled="pageNum >= pdfTotalPages" icon="el-icon-arrow-right" size="small" circle></el-button>
              <div class="page-navigation-inline">
                <el-input-number 
                  v-model="goToPageNumber" 
                  :min="1" 
                  :max="pdfTotalPages || 1" 
                  size="small"
                  style="width: 100px; margin: 0 10px;"
                />
                <el-button @click="goToPageByNumber" icon="el-icon-arrow-right" size="small" circle title="跳转到指定页"></el-button>
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
          <el-button v-if="!showSidebar" @click="toggleSidebar" icon="el-icon-d-arrow-left" size="small" class="toggle-sidebar-btn" title="显示清单"></el-button>
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
              <el-button @click="performSearch" icon="el-icon-search" size="small"></el-button>
            </template>
          </el-input>
          <!-- 调试按钮 -->
          <el-button @click="toggleDebugMode" size="small" :type="debugMode ? 'primary' : 'default'">
            {{ debugMode ? '调试模式: 开' : '调试模式: 关' }}
          </el-button>
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
import * as pdfjsLib from 'pdfjs-dist'
import VueOfficeDocx from '@vue-office/docx'
import '@vue-office/docx/lib/index.css'
import Tesseract from 'tesseract.js'

// 设置PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.js'

export default {
  name: 'App',
  components: {
    VueOfficeDocx
  },
  data() {
    return {
      files: [], // 统一文件列表
      currentFileUrl: '', // 当前文件URL
      currentFileType: '', // 当前文件类型 (pdf 或 docx)
      pageNum: 1,
      pdfTotalPages: 0,
      contentResult: '', // 统一内容结果
      ocrLoading: false,
      searchText: '',
      searchResults: [], // PDF 搜索结果
      currentSearchIndex: -1,
      goToPageNumber: 1,
      showSidebar: true,
      docxSearchResults: [], // DOCX 搜索结果
      currentDocxSearchIndex: -1, // 当前 DOCX 搜索结果索引
      pdfImages: [], // 存储PDF页面中的图像
      ocrResults: {}, // 存储OCR结果，按页码索引
      debugMode: false // 调试模式，用于可视化文本项边界
    }
  },
  mounted() {
    // 初始化PDF.js
  },
  methods: {
    
        // 处理文件上传
    handleFileUpload(file) {
      const newFile = {
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file.raw),
        type: this.getFileType(file.name)
      }
      
      // 添加到文件列表
      this.files.push(newFile)
      
      // 选择刚上传的文件
      this.selectFile(newFile)
    },
    
    // 根据文件名获取文件类型
    getFileType(fileName) {
      const extension = fileName.toLowerCase().split('.').pop()
      return extension
    },
    
    // 选择文件
    selectFile(file) {
      this.currentFileUrl = file.url
      this.currentFileType = file.type
      this.pageNum = 1
      this.contentResult = '' // 清空之前的内容结果
      
      if (file.type === 'pdf') {
        this.$nextTick(() => {
          this.renderPdf()
        })
      }
    },

    // 渲染PDF
    async renderPdf() {
      if (!this.currentFileUrl || this.currentFileType !== 'pdf') return
      
      try {
        const loadingTask = pdfjsLib.getDocument(this.currentFileUrl)
        const pdf = await loadingTask.promise
        this.pdfTotalPages = pdf.numPages
        
        await this.renderPdfPage(pdf, this.pageNum)
      } catch (error) {
        console.error('PDF渲染失败:', error)
      }
    },
    
    // 渲染PDF页面
    async renderPdfPage(pdf, pageNumber) {
      // 如果当前有搜索结果，则使用高亮渲染
      if (this.searchResults && this.searchResults.length > 0) {
        // 获取当前页面的匹配项
        const currentPageMatches = this.searchResults.filter(match => match.page === pageNumber)
        await this.renderPdfPageWithHighlights(pdf, pageNumber, currentPageMatches)
      } else {
        const { context } = await this.renderBasePdfPage(pdf, pageNumber)
      }
    },
    
    // 基础PDF渲染功能
    async renderBasePdfPage(pdf, pageNumber) {
      const page = await pdf.getPage(pageNumber)
      const scale = 1.5
      const viewport = page.getViewport({ scale })

      const canvas = this.$refs.pdfCanvas
      const context = canvas.getContext('2d')
      canvas.height = viewport.height
      canvas.width = viewport.width

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }
      await page.render(renderContext).promise

      return { page, context, scale, canvas }
    },
    
    // 提取PDF页面中的图像
    async extractImagesFromPage(pdf, pageNumber) {
      const page = await pdf.getPage(pageNumber)
      const ops = await page.getOperatorList()
      
      // 查找图像操作
      const images = []
      for (let i = 0; i < ops.fnArray.length; i++) {
        if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
          const imageId = ops.argsArray[i][0]
          try {
            const img = await page.objs.get(imageId)
            if (img) {
              images.push({
                id: imageId,
                data: img
              })
            }
          } catch (e) {
            console.warn('无法获取图像对象:', imageId, e)
          }
        }
      }
      
      return images
    },
    
    // DOCX渲染完成回调
    docxRendered() {
      console.log('DOCX文件渲染完成')
      // 如果有搜索内容，则在渲染完成后执行搜索
      if (this.currentFileType === 'docx' && this.searchText) {
        this.$nextTick(() => {
          this.performSearch()
        })
      }
    },
    
    // 针对 docx 文件执行搜索和高亮
    performDocxSearch() {
      if (this.currentFileType !== 'docx' || !this.searchText) return
      
      // 清除之前的高亮
      this.clearDocxHighlights()
      
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
        const regex = new RegExp(this.searchText, 'gi')
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
      this.docxSearchResults = matches
      this.currentDocxSearchIndex = matches.length > 0 ? 0 : -1
      
      // 高亮匹配项
      matches.forEach((match, index) => {
        const element = this.highlightDocxText(match.node, match.index, match.length)
        // 添加索引信息，用于导航
        if (element) {
          element.dataset.searchIndex = index
        }
      })
      
      console.log(`在DOCX文档中找到 ${matches.length} 个匹配项`)
    },
    
    // 高亮 docx 文本并返回高亮元素
    highlightDocxText(textNode, index, length) {
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
      if (this.docxSearchResults && this.currentDocxSearchIndex >= 0) {
        const matchIndex = this.docxSearchResults.findIndex(match => 
          match.node === textNode && match.index === index && match.length === length)
        if (matchIndex === this.currentDocxSearchIndex) {
          highlightNode.classList.add('docx-search-highlight-current')
        }
      }
      
      return highlightNode
    },
    
    // 清除 docx 高亮
    clearDocxHighlights() {
      const highlights = document.querySelectorAll('.docx-search-highlight')
      highlights.forEach(highlight => {
        const parent = highlight.parentNode
        const textNode = document.createTextNode(highlight.textContent)
        parent.replaceChild(textNode, highlight)
        // 尝试合并相邻的文本节点
        parent.normalize()
      })
    },
    
    // 导航到下一个 DOCX 搜索结果
    goToNextDocxSearchResult() {
      if (this.docxSearchResults.length === 0) return
      
      this.currentDocxSearchIndex = (this.currentDocxSearchIndex + 1) % this.docxSearchResults.length
      this.updateDocxHighlightSelection()
      this.scrollToCurrentDocxSearchResult()
    },
    
    // 导航到上一个 DOCX 搜索结果
    goToPrevDocxSearchResult() {
      if (this.docxSearchResults.length === 0) return
      
      this.currentDocxSearchIndex = this.currentDocxSearchIndex <= 0 ? 
        this.docxSearchResults.length - 1 : this.currentDocxSearchIndex - 1
      this.updateDocxHighlightSelection()
      this.scrollToCurrentDocxSearchResult()
    },
    
    // 更新 DOCX 搜索结果高亮选择
    updateDocxHighlightSelection() {
      // 移除之前的选择高亮
      document.querySelectorAll('.docx-search-highlight-current').forEach(el => {
        el.classList.remove('docx-search-highlight-current')
      })
      
      // 为当前索引的高亮项添加特殊样式
      const allHighlights = document.querySelectorAll('.docx-search-highlight')
      if (allHighlights[this.currentDocxSearchIndex]) {
        allHighlights[this.currentDocxSearchIndex].classList.add('docx-search-highlight-current')
      }
    },
    
    // 滚动到当前 DOCX 搜索结果
    scrollToCurrentDocxSearchResult() {
      if (this.currentDocxSearchIndex < 0) return
      
      const allHighlights = document.querySelectorAll('.docx-search-highlight')
      const currentHighlight = allHighlights[this.currentDocxSearchIndex]
      
      if (currentHighlight) {
        currentHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // 添加一个临时的高亮效果
        currentHighlight.classList.add('docx-search-highlight-current')
      }
    },
    
    // 上一页
    async prevPage() {
      if (this.currentFileType !== 'pdf' || this.pageNum <= 1) return
      
      this.pageNum--
      console.log(`切换到第 ${this.pageNum} 页`)
      // 重新渲染PDF页面
      if (this.currentFileUrl) {
        try {
          const loadingTask = pdfjsLib.getDocument(this.currentFileUrl)
          const pdf = await loadingTask.promise
          await this.renderPdfPage(pdf, this.pageNum)
        } catch (error) {
          console.error('PDF渲染失败:', error)
        }
      }
    },
    
    // 下一页
    async nextPage() {
      if (this.currentFileType !== 'pdf' || this.pageNum >= this.pdfTotalPages) return
      
      this.pageNum++
      console.log(`切换到第 ${this.pageNum} 页`)
      // 重新渲染PDF页面
      if (this.currentFileUrl) {
        try {
          const loadingTask = pdfjsLib.getDocument(this.currentFileUrl)
          const pdf = await loadingTask.promise
          await this.renderPdfPage(pdf, this.pageNum)
        } catch (error) {
          console.error('PDF渲染失败:', error)
        }
      }
    },
    
    // 执行OCR识别
    async performOCR() {
      if (this.currentFileType !== 'pdf') return
      
      this.ocrLoading = true
      
      try {
        const loadingTask = pdfjsLib.getDocument(this.currentFileUrl)
        const pdf = await loadingTask.promise
        
        // 提取当前页面的图像
        const images = await this.extractImagesFromPage(pdf, this.pageNum)
        
        if (images.length > 0) {
          console.log(`在第${this.pageNum}页找到${images.length}个图像`)
          
          // 对每个图像执行OCR
          let ocrText = ''
          const ocrResults = []
          
          for (let i = 0; i < images.length; i++) {
            const img = images[i]
            
            // 检查图像数据是否有效，对于PDF.js提取的图像，可能有不同的格式
            if (!img.data) {
              console.warn(`图像${i+1}数据为空，跳过OCR处理`, img)
              continue
            }
            
            console.log(`图像${i+1}数据详情:`, img.data)
            
            // 检查图像是否为采样图像(Sampled Image)格式
            if (img.data.kind === 'RawImageData' || img.data.kind === 'PNG' || img.data.kind === 'JPEG') {
              // 处理编码后的图像数据
              // 如果数据是URL，直接使用
              if (img.data.url) {
                console.log(`检测到编码图像，使用URL: ${img.data.url}`)
                const result = await this.processImageForOCR(img.data.url, img.id, i)
                if (result) {
                  ocrText += `\n--- 图像 ${i + 1} 识别结果 ---\n`
                  ocrText += result.text
                  ocrResults.push(result)
                }
                continue // 继续下一个图像
              }
            }
            
            // 对于原始图像数据，检查是否包含必要的属性
            if (!img.data.width || !img.data.height) {
              console.warn(`图像${i+1}缺少尺寸信息，跳过OCR处理`, img)
              continue
            }
            
            // 检查是否有原始图像数据
            let imageDataArray = img.data.data
            if (!imageDataArray) {
              console.log(`图像${i+1}没有直接的data属性，尝试从对象中提取数据`)
              
              // 尝试其他可能的数据源
              if (img.data.image && img.data.image.data) {
                imageDataArray = img.data.image.data
              } else if (img.data.chunks && Array.isArray(img.data.chunks)) {
                // 如果图像数据在chunks中，需要特殊处理
                console.log(`图像${i+1}使用chunks格式，需要进一步处理`)
                // 这种情况下我们可能需要使用不同的方法来处理图像
                // 先跳过处理，添加更多调试信息
                continue
              } else if (img.data.bitmap) {
                // 图像数据在bitmap中，需要转换为canvas数据
                console.log(`图像${i+1}使用ImageBitmap格式，正在转换`)
                
                try {
                  // 创建一个临时canvas来处理ImageBitmap
                  const canvas = document.createElement('canvas')
                  const ctx = canvas.getContext('2d')
                  
                  // 设置canvas尺寸
                  canvas.width = img.data.width
                  canvas.height = img.data.height
                  
                  // 将ImageBitmap绘制到canvas上
                  ctx.drawImage(img.data.bitmap, 0, 0)
                  
                  // 从canvas获取图像数据
                  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                  imageDataArray = imageData.data
                  
                  console.log(`成功从ImageBitmap获取图像数据，长度: ${imageDataArray.length}`)
                } catch (bitmapError) {
                  console.error(`处理ImageBitmap时出错:`, bitmapError)
                  continue
                }
              } else {
                // 作为最后的尝试，检查是否可以使用canvas从页面中获取图像
                console.log(`无法找到图像${i+1}的数据，尝试使用页面渲染获取图像`)
                continue
              }
            }
            
            try {
              // 创建一个临时canvas来处理图像
              const canvas = document.createElement('canvas')
              const ctx = canvas.getContext('2d')
              
              // 设置canvas尺寸
              canvas.width = img.data.width
              canvas.height = img.data.height
              
              // 将图像数据绘制到canvas上
              const imageData = ctx.createImageData(img.data.width, img.data.height)
              imageData.data.set(new Uint8ClampedArray(imageDataArray))
              ctx.putImageData(imageData, 0, 0)
              
              // 将canvas转换为blob用于OCR
              const blob = await new Promise(resolve => canvas.toBlob(resolve))
              const url = URL.createObjectURL(blob)
              
              const result = await this.processImageForOCR(url, img.id, i)
              if (result) {
                ocrText += `\n--- 图像 ${i + 1} 识别结果 ---\n`
                ocrText += result.text
                ocrResults.push(result)
              }
              
              // 释放临时URL
              URL.revokeObjectURL(url)
            } catch (error) {
              console.error(`处理图像${i+1}时出错:`, error)
              ocrText += `\n--- 图像 ${i + 1} 处理失败 ---\n`
              ocrText += `错误: ${error.message}\n`
            }
          }
          
          // 更新OCR结果
          this.contentResult = ocrText
          
          // 存储OCR结果到缓存中，替换该页面的现有结果，避免重复
          if (!this.ocrResults[this.pageNum]) {
            this.ocrResults[this.pageNum] = []
          }
          // 替换该页面的OCR结果，而不是追加，以避免重复
          this.ocrResults[this.pageNum] = [{
            text: ocrText,
            imageResults: ocrResults
          }]
        } else {
          this.contentResult = `在第${this.pageNum}页未找到任何图像`
        }
      } catch (error) {
        console.error('OCR识别失败:', error)
        this.contentResult = `OCR识别失败: ${error.message}`
      } finally {
        this.ocrLoading = false
      }
    },
    
    // 处理图像进行OCR识别
    async processImageForOCR(imageData, imageId, i) {
      try {
        const result = await Tesseract.recognize(
          imageData,
          'chi_sim+eng', // 支持中文和英文
          {
            logger: m => console.log(m) // OCR进度日志
          }
        )
        
        // 保存OCR结果和图像位置信息
        return {
          text: result.data.text,
          imageId: imageId,
          pageIndex: this.pageNum - 1, // PDF.js使用0基索引
          boundingRect: null, // 暂时无法获取图像在页面上的确切位置
          ocrData: result.data // 保存完整的OCR数据，可能包含位置信息
        }
      } catch (error) {
        console.error(`处理图像${i+1}时出错:`, error)
        return null
      }
    },
    
    // 复制文本
    copyText() {
      if (this.contentResult) {
        navigator.clipboard.writeText(this.contentResult)
          .then(() => {
            alert('文本已复制到剪贴板')
          })
          .catch(err => {
            console.error('复制失败:', err)
          })
      }
    },
    
    // 获取唯一页面数组
    getUniquePages() {
      if (!this.searchResults || this.searchResults.length === 0) return []
      const uniquePages = new Set(this.searchResults.map(result => result.page))
      return Array.from(uniquePages).sort((a, b) => a - b)
    },
    
    // 导航到下一个 PDF 搜索结果
    async goToNextPdfSearchResult() {
      if (this.searchResults.length === 0) return
      
      // 更新当前搜索结果索引
      this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchResults.length
      
      // 获取当前搜索结果
      const currentResult = this.searchResults[this.currentSearchIndex]
      
      // 如果当前结果在不同页面，则跳转到该页面
      if (currentResult.page !== this.pageNum) {
        await this.goToPage(currentResult.page)
      } else {
        // 如果在同一页面，重新渲染以更新高亮
        if (this.currentFileUrl) {
          try {
            const loadingTask = pdfjsLib.getDocument(this.currentFileUrl)
            const pdf = await loadingTask.promise
            const currentPageMatches = this.searchResults.filter(match => match.page === this.pageNum)
            await this.renderPdfPageWithHighlights(pdf, this.pageNum, currentPageMatches)
          } catch (error) {
            console.error('PDF渲染失败:', error)
          }
        }
      }
    },
    
    // 导航到上一个 PDF 搜索结果
    async goToPrevPdfSearchResult() {
      if (this.searchResults.length === 0) return
      
      // 更新当前搜索结果索引
      this.currentSearchIndex = this.currentSearchIndex <= 0 ? 
        this.searchResults.length - 1 : this.currentSearchIndex - 1
      
      // 获取当前搜索结果
      const currentResult = this.searchResults[this.currentSearchIndex]
      
      // 如果当前结果在不同页面，则跳转到该页面
      if (currentResult.page !== this.pageNum) {
        await this.goToPage(currentResult.page)
      } else {
        // 如果在同一页面，重新渲染以更新高亮
        if (this.currentFileUrl) {
          try {
            const loadingTask = pdfjsLib.getDocument(this.currentFileUrl)
            const pdf = await loadingTask.promise
            const currentPageMatches = this.searchResults.filter(match => match.page === this.pageNum)
            await this.renderPdfPageWithHighlights(pdf, this.pageNum, currentPageMatches)
          } catch (error) {
            console.error('PDF渲染失败:', error)
          }
        }
      }
    },
    
    // 跳转到指定页面
    async goToPage(page) {
      if (this.currentFileType !== 'pdf' || page < 1 || page > this.pdfTotalPages) return
      
      this.pageNum = page
      console.log(`跳转到第 ${page} 页`)
      
      // 重新渲染PDF页面
      if (this.currentFileUrl) {
        try {
          const loadingTask = pdfjsLib.getDocument(this.currentFileUrl)
          const pdf = await loadingTask.promise
          await this.renderPdfPage(pdf, this.pageNum)
        } catch (error) {
          console.error('PDF渲染失败:', error)
        }
      }
    },
    
    // 通过页码输入跳转
    goToPageByNumber() {
      if (this.currentFileType !== 'pdf' || !this.goToPageNumber || this.goToPageNumber < 1) return
      // 确保页码不超过总页数
      const targetPage = Math.min(this.goToPageNumber, this.pdfTotalPages || 1)
      this.goToPage(targetPage)
    },
    
    // 切换侧边栏显示
    toggleSidebar() {
      this.showSidebar = !this.showSidebar
    },
    
    // 执行搜索
    async performSearch() {
      if (!this.searchText || !this.currentFileUrl) return
      
      if (this.currentFileType === 'pdf') {
        // PDF 搜索逻辑
        try {
          const loadingTask = pdfjsLib.getDocument(this.currentFileUrl)
          const pdf = await loadingTask.promise
          const totalPages = pdf.numPages
          
          console.log(`开始搜索 "${this.searchText}", 总页数: ${totalPages}`)
        
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
          
          // 搜索页面文本
          const pageMatches = this.searchTextInContent(fullText, pageNum)
          allMatches.push(...pageMatches)
          
          // 检查OCR结果中是否有匹配项
          console.log(`第${pageNum}页OCR结果数量:`, this.ocrResults[pageNum] ? this.ocrResults[pageNum].length : 0)
          if (this.ocrResults[pageNum]) {
            for (const ocrResult of this.ocrResults[pageNum]) {
              if (ocrResult.imageResults) {
                for (const imageResult of ocrResult.imageResults) {
                  const ocrText = imageResult.text
                  console.log(`检查OCR文本: "${ocrText.substring(0, 100)}..." (总长度: ${ocrText.length})`)
                  
                  // 搜索OCR文本
                  const ocrMatches = this.searchTextInOCR(ocrText, pageNum, imageResult)
                  allMatches.push(...ocrMatches)
                }
              }
            }
          }
          
          // 在控制台打印每页的搜索结果
          if (pageMatches.length > 0 || (this.ocrResults[pageNum] && this.ocrResults[pageNum].some(ocr => ocr.imageResults && ocr.imageResults.some(ir => ir.text.toLowerCase().includes(this.searchText.toLowerCase()))))) {
            console.log(`在第 ${pageNum} 页找到了 ${pageMatches.length} 个页面文本匹配项和OCR匹配项`)
          }
        }
        
        this.searchResults = allMatches
        this.currentSearchIndex = allMatches.length > 0 ? 0 : -1
        
        console.log(`搜索完成，总共找到 ${allMatches.length} 个匹配项`)
        
        // 在控制台打印总览
        if (allMatches.length > 0) {
          console.log(`在整个文档中找到了 ${allMatches.length} 个匹配项，分布在 ${totalPages} 页中`)
          console.log('匹配项详情:', allMatches)
        } else {
          console.log(`在整个文档中没有找到 "${this.searchText}"`)
        }
        
        // 如果当前页面有匹配项，则高亮显示
        const currentPageMatches = allMatches.filter(match => match.page === this.pageNum)
        console.log(`当前页面(${this.pageNum})匹配项数量:`, currentPageMatches.length)
        if (currentPageMatches.length > 0) {
          // 重新渲染当前页面并高亮匹配项
          await this.renderPdfPageWithHighlights(pdf, this.pageNum, currentPageMatches)
        } else {
          // 重新渲染当前页面（无高亮）
          await this.renderPdf(pdf)
        }
      } catch (error) {
        console.error('搜索失败:', error)
      }
    } else if (this.currentFileType === 'docx') {
      // DOCX 搜索逻辑
      this.performDocxSearch()
    }
  },
    
    // 在内容中搜索文本
    searchTextInContent(fullText, pageNum) {
      console.log(`Searching for: "${this.searchText}" in full text of length: ${fullText.length}`);
      const matches = [];
      let searchStart = 0;
      let searchIndex;
      
      // 使用更精确的匹配方法，处理中文字符
      const searchTextLower = this.searchText.toLowerCase();
      const fullTextLower = fullText.toLowerCase();
      
      console.log(`Searching for: "${searchTextLower}" in full text`);
      
      // 先尝试直接匹配（原始文本）
      while ((searchIndex = fullTextLower.indexOf(searchTextLower, searchStart)) !== -1) {
        console.log(`Found match at index: ${searchIndex}`);
        matches.push({
          text: this.searchText,
          startIndex: searchIndex,
          endIndex: searchIndex + this.searchText.length,
          page: pageNum,
          // 添加全文中的位置信息
          fullTextIndex: searchIndex
        });
        searchStart = searchIndex + 1;
      }
      
      console.log(`Direct matches found: ${matches.length}`);
      
      // 如果没有找到匹配项，尝试其他匹配策略
      if (matches.length === 0 && this.searchText && this.searchText.length > 1) {
        console.log("No direct matches found, trying fuzzy matching");
        // 尝试模糊匹配（处理可能的字符间距问题）
        const fuzzyPatterns = [
          this.searchText.replace(/(.)/g, '$1'),  // 原始模式
          this.searchText.replace(/\s+/g, '')      // 无空格模式
        ];
        
        for (const pattern of fuzzyPatterns) {
          if (pattern !== this.searchText) {
            console.log(`Trying fuzzy pattern: "${pattern}"`);
            const patternLower = pattern.toLowerCase();
            let fuzzySearchStart = 0;
            let fuzzySearchIndex;
            
            while ((fuzzySearchIndex = fullTextLower.indexOf(patternLower, fuzzySearchStart)) !== -1) {
              console.log(`Found fuzzy match at index: ${fuzzySearchIndex}`);
              matches.push({
                text: this.searchText,
                startIndex: fuzzySearchIndex,
                endIndex: fuzzySearchIndex + pattern.length,
                page: pageNum,
                matchType: 'fuzzy',
                fullTextIndex: fuzzySearchIndex
              });
              fuzzySearchStart = fuzzySearchIndex + 1;
            }
          }
        }
      }
      
      console.log(`Total matches found: ${matches.length}`, matches);
      return matches;
    },
    
    // 在OCR文本中搜索
    searchTextInOCR(ocrText, pageNum, imageResult) {
      const matches = []
      let ocrSearchStart = 0
      let ocrSearchIndex
      
      console.log(`OCR搜索调试 - 搜索词: "${this.searchText}", OCR文本: "${ocrText.substring(0, 100)}..."`, imageResult)
      
      // 如果有OCR数据包含位置信息，尝试利用这些信息
      if (imageResult && imageResult.ocrData && imageResult.ocrData.words) {
        console.log(`OCR数据中包含 ${imageResult.ocrData.words.length} 个文字对象`);
        // 遏找匹配的文字并获取其位置
        for (const word of imageResult.ocrData.words) {
          if (word.text && (word.text.includes(this.searchText) || this.searchText.includes(word.text))) {
            console.log(`在OCR数据中找到匹配文字: "${word.text}", 位置:`, word.bbox);
            matches.push({
              text: this.searchText, // 使用搜索词而不是完整文本
              startIndex: ocrText.toLowerCase().indexOf(this.searchText.toLowerCase()),
              endIndex: ocrText.toLowerCase().indexOf(this.searchText.toLowerCase()) + this.searchText.length,
              page: pageNum,
              isFromImage: true, // 标记这是来自图像OCR的结果
              imageResult: imageResult,
              boundingRect: word.bbox // 保存文字的边界框信息
            });
          }
        }
      }
      
      // 处理OCR文本中的空格问题
      // 先尝试直接匹配（原始文本）
      let directMatchCount = 0
      while ((ocrSearchIndex = ocrText.toLowerCase().indexOf(this.searchText.toLowerCase(), ocrSearchStart)) !== -1) {
        console.log(`在OCR文本中找到直接匹配: "${this.searchText}" at index ${ocrSearchIndex}`)
        // 检查是否已经添加了此匹配（避免重复）
        const alreadyExists = matches.some(m => m.startIndex === ocrSearchIndex);
        if (!alreadyExists) {
          matches.push({
            text: this.searchText,
            startIndex: ocrSearchIndex,
            endIndex: ocrSearchIndex + this.searchText.length,
            page: pageNum,
            isFromImage: true, // 标记这是来自图像OCR的结果
            imageResult: imageResult
          })
        }
        ocrSearchStart = ocrSearchIndex + 1
        directMatchCount++
      }
      
      // 如果没有找到直接匹配，尝试去除空格后匹配
      if (this.searchText && this.searchText.length > 1) { // 只对长度大于1的搜索词进行空格处理
        const searchWithoutSpaces = this.searchText.replace(/\s+/g, '')
        const cleanOcrText = ocrText.replace(/\s+/g, '')
        
        console.log(`OCR搜索调试 - 去空格搜索: "${searchWithoutSpaces}", OCR文本(去空格): "${cleanOcrText.substring(0, 100)}..."`)
        
        let spacedMatchCount = 0 // 将变量移到外层以确保作用域正确
        if (searchWithoutSpaces && searchWithoutSpaces !== this.searchText.replace(/\s+/g, '')) {
          let cleanSearchStart = 0
          let cleanSearchIndex
          
          while ((cleanSearchIndex = cleanOcrText.toLowerCase().indexOf(searchWithoutSpaces.toLowerCase(), cleanSearchStart)) !== -1) {
            console.log(`在OCR文本(去空格)中找到匹配: "${searchWithoutSpaces}" at index ${cleanSearchIndex}`)
            // 找到匹配位置后，需要重新计算在原始文本中的位置
            matches.push({
              text: this.searchText,
              startIndex: cleanSearchIndex, // 实际上这里需要更精确的位置计算
              endIndex: cleanSearchIndex + searchWithoutSpaces.length,
              page: pageNum,
              isFromImage: true, // 标记这是来自图像OCR的结果
              imageResult: imageResult,
              matchType: 'spaced-text' // 标记这是通过去除空格匹配的
            })
            cleanSearchStart = cleanSearchIndex + 1
            spacedMatchCount++
          }
          
          if (spacedMatchCount > 0) {
            console.log(`OCR搜索调试 - 找到${spacedMatchCount}个去空格匹配项`)
          }
          
          // 如果仍然没有找到匹配项，尝试更灵活的匹配方式
          if (spacedMatchCount === 0 && searchWithoutSpaces) {
            console.log(`OCR搜索调试 - 尝试灵活匹配: 搜索"${searchWithoutSpaces}"在OCR文本中`)
            
            // 尝试在OCR文本中按字符顺序查找（允许中间有其他字符）
            let pos = 0
            let found = true
            let lastFoundPos = 0
            
            for (let char of searchWithoutSpaces.toLowerCase()) {
              let foundPos = cleanOcrText.toLowerCase().indexOf(char, pos)
              if (foundPos === -1) {
                found = false
                break
              }
              pos = foundPos + 1
              lastFoundPos = foundPos
            }
            
            if (found) {
              console.log(`OCR搜索调试 - 灵活匹配成功: "${searchWithoutSpaces}"`)
              matches.push({
                text: this.searchText,
                startIndex: lastFoundPos - searchWithoutSpaces.length + 1,
                endIndex: lastFoundPos + 1,
                page: pageNum,
                isFromImage: true, // 标记这是来自图像OCR的结果
                imageResult: imageResult,
                matchType: 'flexible-text' // 标记这是通过灵活匹配的
              })
            }
          }
        } else {
          // 如果没有执行去空格匹配，也需要尝试灵活匹配
          if (searchWithoutSpaces) {
            console.log(`OCR搜索调试 - 尝试灵活匹配: 搜索"${searchWithoutSpaces}"在OCR文本中`)
            
            // 先清理OCR文本
            const cleanOcrText = ocrText.replace(/\s+/g, '')
            
            // 尝试在OCR文本中按字符顺序查找（允许中间有其他字符）
            let pos = 0
            let found = true
            let lastFoundPos = 0
            
            for (let char of searchWithoutSpaces.toLowerCase()) {
              let foundPos = cleanOcrText.toLowerCase().indexOf(char, pos)
              if (foundPos === -1) {
                found = false
                break
              }
              pos = foundPos + 1
              lastFoundPos = foundPos
            }
            
            if (found) {
              console.log(`OCR搜索调试 - 灵活匹配成功: "${searchWithoutSpaces}"`)
              matches.push({
                text: this.searchText,
                startIndex: lastFoundPos - searchWithoutSpaces.length + 1,
                endIndex: lastFoundPos + 1,
                page: pageNum,
                isFromImage: true, // 标记这是来自图像OCR的结果
                imageResult: imageResult,
                matchType: 'flexible-text' // 标记这是通过灵活匹配的
              })
            }
          }
        }
      }
      
      if (directMatchCount === 0 && (!this.searchText || this.searchText.length <= 1 || this.searchText.replace(/\s+/g, '') === this.searchText.replace(/\s+/g, ''))) {
        console.log(`OCR搜索调试 - 没有找到任何匹配项，OCR文本长度: ${ocrText.length}`)
      }
      
      return matches
    },
    
    // 渲染带高亮的PDF页面
    async renderPdfPageWithHighlights(pdf, pageNumber, currentPageMatches) {
      const { page, context, scale, canvas } = await this.renderBasePdfPage(pdf, pageNumber)
      
      console.log(`开始高亮第${pageNumber}页的${currentPageMatches.length}个匹配项`)
      
      // 高亮当前页面的匹配项
      if (currentPageMatches && currentPageMatches.length > 0) {
        // 获取当前搜索结果（用于突出显示）
        const currentResult = this.searchResults[this.currentSearchIndex]
        console.log(`当前选中的搜索结果:`, currentResult)
        
        // 设置高亮样式
        context.fillStyle = 'rgba(255, 255, 0, 0.5)' // 黄色半透明（普通高亮）
        context.strokeStyle = 'red'
        context.lineWidth = 1.5
        
        // 获取当前页面的文本内容
        const textContent = await page.getTextContent()
        const items = textContent.items
        
        console.log(`页面文本项数量: ${items.length}`)
        
        // 创建字符级映射以精确定位每个字符的位置
        let fullText = '';
        const charToItemMap = []; // 存储每个字符索引对应的文本项信息
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemStart = fullText.length;
          const itemEnd = itemStart + item.str.length;
          
          // 为该文本项的每个字符创建映射
          for (let j = itemStart; j < itemEnd; j++) {
            charToItemMap.push({
              itemIndex: i,
              item: item,
              charIndexInItem: j - itemStart, // 字符在文本项中的位置
              absCharIndex: j // 字符在全文中的绝对位置
            });
          }
          
          fullText += item.str;
        }
        console.log(`Reconstructed full text: "${fullText.substring(0, 100)}..." (length: ${fullText.length})`);
        console.log(`Character-to-item map size: ${charToItemMap.length}`);
        console.log(`Total matches to process: ${currentPageMatches.length}`);
        
        // 遍历当前页面的匹配项并高亮
        for (const match of currentPageMatches) {
          console.log(`Processing match: "${match.text}" at fullTextIndex: ${match.fullTextIndex}`);
          
          // 检查起始位置是否在映射范围内
          if (match.fullTextIndex >= 0 && match.fullTextIndex < charToItemMap.length) {
            const startCharInfo = charToItemMap[match.fullTextIndex];
            const endCharIndex = match.fullTextIndex + match.text.length - 1;
            
            if (endCharIndex < charToItemMap.length) {
              const endCharInfo = charToItemMap[endCharIndex];
              
              // 如果起始和结束字符在同一个文本项中
              if (startCharInfo.itemIndex === endCharInfo.itemIndex) {
                console.log(`Match found in single item ${startCharInfo.itemIndex}, text: "${startCharInfo.item.str}"`);
                const item = startCharInfo.item;
                
                // 使用专门的函数计算匹配文本的精确边界
                const bounds = this.calculateSubstringBounds(item, match.text, match.fullTextIndex, canvas, scale, items);
                const x = bounds.x;
                const y = bounds.y;
                const width = bounds.width;
                const height = bounds.height;
                
                console.log(`高亮匹配项: "${match.text}", 位置: (${x}, ${y}), 尺寸: ${width}x${height}`)
                
                // 检查这是否是当前选中的搜索结果
                const isCurrentResult = currentResult && 
                  currentResult.page === pageNumber && 
                  !currentResult.isFromImage && // 不是来自图像OCR的结果
                  currentResult.fullTextIndex === match.fullTextIndex // 匹配完整文本索引
                
                // 绘制高亮矩形
                if (isCurrentResult) {
                  // 当前选中的结果使用不同的颜色
                  context.fillStyle = 'rgba(255, 165, 0, 0.8)' // 橙色半透明
                  context.fillRect(x, y, width, height)
                  context.fillStyle = 'rgba(255, 255, 0, 0.5)' // 恢复为黄色
                  console.log(`高亮当前选中的页面文本: "${item.str}"`)
                } else {
                  // 普通高亮
                  context.fillRect(x, y, width, height)
                  console.log(`高亮普通页面文本: "${item.str}"`)
                }
                // 确保绘制边框，使其更明显
                context.lineWidth = 1.5;
                context.strokeStyle = 'red';
                context.strokeRect(x, y, width, height);
                // 恢复原始线宽
                context.lineWidth = 1.5;
                
                // 调试模式：如果启用，可视化文本项边界和匹配信息
                if (this.debugMode) {
                    // 绘制文本项边界框（用于调试，用蓝色）
                    const originalStrokeStyle = context.strokeStyle;
                    const originalLineWidth = context.lineWidth;
                    const originalFillStyle = context.fillStyle;
                    
                    // 使用专门的函数计算匹配文本的精确边界
                    const bounds = this.calculateSubstringBounds(item, match.text, match.fullTextIndex, canvas, scale, items);
                    
                    context.strokeStyle = '#0000FF'; // 蓝色边框 - 显示计算的文本边界
                    context.lineWidth = 1;
                    context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
                    
                    // 绘制高亮边界（用于调试，用绿色虚线）- 显示实际绘制的高亮区域
                    context.setLineDash([5, 3]); // 设置虚线样式
                    context.strokeStyle = '#00FF00'; // 绿色虚线
                    context.strokeRect(x, y, width, height);
                    context.setLineDash([]); // 重置为实线
                    
                    // 在文本框旁边显示文本内容和索引（用于调试，用红色小字）
                    context.fillStyle = '#FF0000'; // 红色文字
                    context.font = '10px sans-serif';
                    const textToShow = `"${item.str.substring(0, 10)}" [${startCharInfo.itemIndex}]`;
                    context.fillText(textToShow, bounds.x, bounds.y + bounds.height + 12);
                    
                    // 显示坐标信息（用于调试，用紫色小字）
                    context.fillStyle = '#800080'; // 紫色文字
                    context.fillText(`PDF(${item.transform[4]},${item.transform[5]}) → Canvas(${Math.round(bounds.x)},${Math.round(bounds.y)})`, bounds.x, bounds.y + bounds.height + 24);
                    
                    // 恢复原始样式
                    context.strokeStyle = originalStrokeStyle;
                    context.lineWidth = originalLineWidth;
                    context.fillStyle = originalFillStyle;
                }
              } else {
                // 如果匹配跨越多个文本项，需要特殊处理
                console.log(`Match spans multiple items from ${startCharInfo.itemIndex} to ${endCharInfo.itemIndex}`);
                // 在这种情况下，我们高亮起始文本项的相应部分
                const item = startCharInfo.item;
                
                // 使用起始文本项的边界进行高亮
                const bounds = this.calculateTextItemBounds(item, canvas, scale);
                const x = bounds.x;
                const y = bounds.y;
                const width = bounds.width;
                const height = bounds.height;
                
                console.log(`高亮跨越项匹配: "${match.text}", 位置: (${x}, ${y}), 尺寸: ${width}x${height}`)
                
                // 检查这是否是当前选中的搜索结果
                const isCurrentResult = currentResult && 
                  currentResult.page === pageNumber && 
                  !currentResult.isFromImage && // 不是来自图像OCR的结果
                  currentResult.fullTextIndex === match.fullTextIndex // 匹配完整文本索引
                
                // 绘制高亮矩形
                if (isCurrentResult) {
                  // 当前选中的结果使用不同的颜色
                  context.fillStyle = 'rgba(255, 165, 0, 0.8)' // 橙色半透明
                  context.fillRect(x, y, width, height)
                  context.fillStyle = 'rgba(255, 255, 0, 0.5)' // 恢复为黄色
                  console.log(`高亮跨越项的页面文本: "${item.str}"`)
                } else {
                  // 普通高亮
                  context.fillRect(x, y, width, height)
                  console.log(`高亮跨越项的页面文本: "${item.str}"`)
                }
                context.strokeRect(x, y, width, height)
              }
            } else {
              console.log(`End index ${endCharIndex} out of bounds for charToItemMap (length: ${charToItemMap.length})`);
            }
          } else {
            console.log(`Start index ${match.fullTextIndex} out of bounds for charToItemMap (length: ${charToItemMap.length})`);
          }
        }
        
        // 高亮来自图像OCR的结果
        const imageMatches = currentPageMatches.filter(match => match.isFromImage)
        console.log(`OCR图像匹配项数量: ${imageMatches.length}`)
        
        if (imageMatches.length > 0) {
          for (const match of imageMatches) {
            console.log(`处理OCR图像匹配项:`, match)
            
            // 尝试从OCR结果中获取更精确的文字位置信息
            if (match.boundingRect) {
              // 如果搜索匹配中直接包含了边界框信息（从OCR数据中获取的）
              const rect = match.boundingRect;
              const highlightX = rect.x * scale;
              const highlightY = canvas.height - (rect.y + rect.height) * scale; // Y坐标转换
              const highlightWidth = rect.width * scale;
              const highlightHeight = rect.height * scale;
              
              // 检查这是否是当前选中的搜索结果
              const isCurrentResult = currentResult && 
                currentResult.page === pageNumber && 
                currentResult.isFromImage &&
                currentResult.startIndex === match.startIndex &&
                currentResult.endIndex === match.endIndex
              
              // 绘制高亮矩形
              if (isCurrentResult) {
                // 当前选中的结果使用不同的颜色
                context.fillStyle = 'rgba(255, 165, 0, 0.8)' // 橙色半透明
                console.log(`高亮当前选中的OCR文本 (使用OCR边界框): "${match.text}"`)
              } else {
                // 普通高亮
                context.fillStyle = 'rgba(255, 255, 0, 0.5)' // 黄色半透明
                console.log(`高亮普通OCR文本 (使用OCR边界框): "${match.text}"`)
              }
              
              context.fillRect(highlightX, highlightY, highlightWidth, highlightHeight)
              // 确保OCR结果也有明显的边框
              context.lineWidth = 1.5;
              context.strokeStyle = 'red';
              context.strokeRect(highlightX, highlightY, highlightWidth, highlightHeight);
              // 恢复原始线宽
              context.lineWidth = 1.5;
              
              // 恢复填充样式
              context.fillStyle = 'rgba(255, 255, 0, 0.5)' // 黄色半透明
            } else if (match.imageResult && match.imageResult.boundingRect) {
              // 如果没有精确的OCR边界框信息，尝试通过页面操作查找图像位置
              const ops = await page.getOperatorList()
              let imagePosition = null
              
              // 尝试找到图像在页面上的位置
              for (let i = 0; i < ops.fnArray.length; i++) {
                if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
                  const imageId = ops.argsArray[i][0]
                  
                  // 获取图像的位置和尺寸
                  const transform = ops.argsArray[i] // 使用实际的变换矩阵
                  if (transform && Array.isArray(transform) && transform.length >= 6) {
                    // transform矩阵 [a, b, c, d, e, f] 其中e, f是平移量
                    const x = transform[4] * scale
                    const y = canvas.height - (transform[5] * scale) // 调整Y坐标系
                    const width = Math.abs(transform[0]) * scale || 200 // a是x方向缩放
                    const height = Math.abs(transform[3]) * scale || 200 // d是y方向缩放
                    
                    // 使用图像位置作为OCR文字的大致位置
                    // 这种方法不够精确，但比使用固定位置要好
                    let highlightX = x
                    let highlightY = y - 30 // 假设文字在图像上方或内部
                    let highlightWidth = width * 0.3 // 假设"资产总计"大约占图像宽度的30%
                    let highlightHeight = 20 // 假设文字高度为20px
                    
                    // 检查这是否是当前选中的搜索结果
                    const isCurrentResult = currentResult && 
                      currentResult.page === pageNumber && 
                      currentResult.isFromImage &&
                      currentResult.startIndex === match.startIndex &&
                      currentResult.endIndex === match.endIndex
                    
                    // 绘制高亮矩形
                    if (isCurrentResult) {
                      // 当前选中的结果使用不同的颜色
                      context.fillStyle = 'rgba(255, 165, 0, 0.8)' // 橙色半透明
                      console.log(`高亮当前选中的OCR文本 (使用图像位置): "${match.text}"`)
                    } else {
                      // 普通高亮
                      context.fillStyle = 'rgba(255, 255, 0, 0.5)' // 黄色半透明
                      console.log(`高亮普通OCR文本 (使用图像位置): "${match.text}"`)
                    }
                    
                    context.fillRect(highlightX, highlightY, highlightWidth, highlightHeight)
                    // 确保OCR结果也有明显的边框
                    context.lineWidth = 1.5;
                    context.strokeStyle = 'red';
                    context.strokeRect(highlightX, highlightY, highlightWidth, highlightHeight);
                    // 恢复原始线宽
                    context.lineWidth = 1.5;
                    
                    // 恢复填充样式
                    context.fillStyle = 'rgba(255, 255, 0, 0.5)' // 黄色半透明
                    break
                  }
                }
              }
              
              // 如果仍然无法确定位置，使用页面中央位置
              if (!imagePosition) {
                // 使用页面中央位置并根据匹配项索引偏移，避免重叠
                const offsetX = (imageMatches.indexOf(match) % 3 - 1) * 50 // -50, 0, 50
                const offsetY = Math.floor(imageMatches.indexOf(match) / 3) * 30
                
                const highlightX = canvas.width / 2 + offsetX
                const highlightY = canvas.height / 2 + offsetY
                const highlightWidth = canvas.width / 3
                const highlightHeight = 20
                
                // 检查这是否是当前选中的搜索结果
                const isCurrentResult = currentResult && 
                  currentResult.page === pageNumber && 
                  currentResult.isFromImage &&
                  currentResult.startIndex === match.startIndex &&
                  currentResult.endIndex === match.endIndex
                
                // 绘制高亮矩形
                if (isCurrentResult) {
                  // 当前选中的结果使用不同的颜色
                  context.fillStyle = 'rgba(255, 165, 0, 0.8)' // 橙色半透明
                  console.log(`高亮当前选中的OCR文本 (后备): "${match.text}"`)
                } else {
                  // 普通高亮
                  context.fillStyle = 'rgba(255, 255, 0, 0.5)' // 黄色半透明
                  console.log(`高亮普通OCR文本 (后备): "${match.text}"`)
                }
                
                context.fillRect(highlightX, highlightY, highlightWidth, highlightHeight)
                // 确保OCR结果也有明显的边框
                context.lineWidth = 1.5;
                context.strokeStyle = 'red';
                context.strokeRect(highlightX, highlightY, highlightWidth, highlightHeight);
                // 恢复原始线宽
                context.lineWidth = 1.5;
                
                // 恢复填充样式
                context.fillStyle = 'rgba(255, 255, 0, 0.5)' // 黄色半透明
              }
            }
          }
        } else {
          console.log(`第${pageNumber}页没有OCR图像匹配项`)
        }
      } else {
        console.log(`第${pageNumber}页没有匹配项`)
      }
    },
    
    // 专门用于计算文本项精确位置的辅助函数
    calculateTextItemBounds(item, canvas, scale) {
      const transform = item.transform;
      const ctx = canvas.getContext('2d');
      
      // 使用transform矩阵计算文本的精确位置
      // transform = [a, b, c, d, e, f] 表示仿射变换矩阵
      // [4] 和 [5] 分别是x和y方向的平移量
      const textX = transform[4] * scale;
      
      // 获取文本高度，优先使用item.height，否则估算
      let fontSize = 12; // 默认字体大小
      if (item.height) {
        fontSize = item.height;
      } else {
        // 从变换矩阵估算字体大小，考虑Y方向的缩放
        fontSize = Math.abs(transform[3]) || 12;
      }
      const textHeight = fontSize * scale * 1.2; // 添加一些额外空间确保完全覆盖
      
      // 关键：正确处理PDF坐标系到Canvas坐标系的转换
      // PDF坐标系原点在左下角，Canvas坐标系原点在左上角
      // transform[5] 是文本基线在PDF坐标系中的Y坐标（从页面底部算起）
      const baselineYInPdf = transform[5]; // PDF坐标系中的基线Y坐标
      const baselineYInCanvas = canvas.height - (baselineYInPdf * scale); // 转换到Canvas坐标系
      
      // 文本顶部Y坐标 = 基线Y坐标 - 文本高度
      // 但需要考虑字体的基线位置，通常基线在字符底部附近
      const textTopY = baselineYInCanvas - textHeight;
      
      // 计算文本宽度
      let width;
      if (item.width) {
        // 如果item提供了宽度信息，直接使用
        width = item.width * scale;
      } else {
        // 否则使用Canvas上下文测量文本宽度
        const originalFont = ctx.font;
        // 设置合适的字体大小进行测量
        ctx.font = `${fontSize * scale}px sans-serif`;
        width = ctx.measureText(item.str).width;
        ctx.font = originalFont; // 恢复原始字体
      }
      
      return {
        x: textX,
        y: textTopY,
        width: width,
        height: textHeight,
        baselineY: baselineYInCanvas // 基线Y坐标（用于某些特殊计算）
      };
    },

    // 基于PDF.js文本层的精确文本高亮方法
    calculateTextHighlightBounds(item, matchText, charIndexInItem, canvas, scale) {
      const ctx = canvas.getContext('2d');
      const originalFont = ctx.font;
      
      // 估算字体大小
      let fontSize = item.height || 12;
      ctx.font = `${fontSize * scale}px sans-serif`;
      
      // 计算匹配文本之前的文本宽度（前缀宽度）
      const prefixStr = item.str.substring(0, charIndexInItem);
      const prefixWidth = ctx.measureText(prefixStr).width || 0;
      
      // 计算匹配文本的宽度
      const matchWidth = ctx.measureText(matchText).width || (matchText.length * 8 * scale);
      
      // 获取文本项的基础边界
      const itemBounds = this.calculateTextItemBounds(item, canvas, scale);
      
      // 恢复原始字体
      ctx.font = originalFont;
      
      // 返回匹配文本的精确边界
      return {
        x: itemBounds.x + prefixWidth,  // 文本项x坐标 + 前缀文本宽度
        y: itemBounds.y,               // 使用文本项的y坐标
        width: matchWidth,             // 匹配文本的宽度
        height: itemBounds.height      // 使用文本项的高度
      };
    },

    // 调试版本：渲染PDF页面并可视化文本项位置
    async debugRenderPdfPageWithTextBounds(pdf, pageNumber) {
      const { page, context, scale, canvas } = await this.renderBasePdfPage(pdf, pageNumber)
      
      // 获取当前页面的文本内容
      const textContent = await page.getTextContent()
      const items = textContent.items
      
      // 保存原始样式
      const originalFillStyle = context.fillStyle;
      const originalStrokeStyle = context.strokeStyle;
      const originalLineWidth = context.lineWidth;
      
      // 绘制所有文本项的边界框
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const bounds = this.calculateTextItemBounds(item, canvas, scale);
        
        // 绘制文本项边界框（用蓝色）
        context.strokeStyle = '#0000FF'; // 蓝色边框
        context.lineWidth = 1;
        context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        
        // 在文本框旁边显示文本内容和索引（用红色小字）
        context.fillStyle = '#FF0000'; // 红色文字
        context.font = '10px sans-serif';
        context.fillText(`[${i}]${item.str.substring(0, 10)}`, bounds.x, bounds.y + bounds.height + 12);
      }
      
      // 恢复原始样式
      context.fillStyle = originalFillStyle;
      context.strokeStyle = originalStrokeStyle;
      context.lineWidth = originalLineWidth;
      
      return { page, context, scale, canvas, items };
    },

    // 计算文本项中特定子串的精确位置
    calculateSubstringBounds(item, matchText, fullTextIndex, canvas, scale, items) {
      // 重建全文以计算相对位置
      let reconstructedText = '';
      let targetItemStartIndex = -1;
      let targetItemEndIndex = -1;
      
      // 找到当前文本项在整个页面文本中的位置
      for (let i = 0; i < items.length; i++) {
        if (items[i] === item) {
          targetItemStartIndex = reconstructedText.length;
          targetItemEndIndex = targetItemStartIndex + item.str.length;
          break;
        }
        reconstructedText += items[i].str;
      }
      
      console.log(`calculateSubstringBounds: item="${item.str}", matchText="${matchText}", fullTextIndex=${fullTextIndex}, targetItemStartIndex=${targetItemStartIndex}`);
      
      if (targetItemStartIndex === -1) {
        // 如果找不到，使用近似方法
        console.log("Target item not found in items array, using text item bounds");
        return this.calculateTextItemBounds(item, canvas, scale);
      }
      
      const matchStartInItem = fullTextIndex - targetItemStartIndex;
      const matchEndInItem = matchStartInItem + matchText.length;
      
      console.log(`matchStartInItem: ${matchStartInItem}, matchEndInItem: ${matchEndInItem}, item.str.length: ${item.str.length}`);
      
      // 如果匹配项完全在当前文本项中
      if (matchStartInItem >= 0 && matchEndInItem <= item.str.length) {
        const matchStr = item.str.substring(matchStartInItem, matchEndInItem);
        console.log(`Match found within item: "${matchStr}" at position ${matchStartInItem} in "${item.str}"`);
        
        // 使用新的高亮边界计算方法
        const bounds = this.calculateTextHighlightBounds(item, matchStr, matchStartInItem, canvas, scale);
        console.log(`Calculated bounds: x=${bounds.x}, y=${bounds.y}, width=${bounds.width}, height=${bounds.height}`);
        return bounds;
      } else {
        // 如果匹配项跨越多个文本项或计算出错，返回整个文本项的边界
        console.log("Match spans multiple items or calculation error, using full text item bounds");
        console.log(`Item bounds:`, this.calculateTextItemBounds(item, canvas, scale));
        return this.calculateTextItemBounds(item, canvas, scale);
      }
    },

    // 切换调试模式
    toggleDebugMode() {
      this.debugMode = !this.debugMode;
      console.log(`调试模式已${this.debugMode ? '启用' : '关闭'}`);
      // 重新渲染当前PDF页面以应用/移除调试可视化
      if (this.currentFileType === 'pdf' && this.currentFileUrl) {
        this.renderPdf();
      }
    },

    // 格式化文件大小
    formatFileSize(row, column, cellValue) {
      if (cellValue < 1024) {
        return cellValue + ' B'
      } else if (cellValue < 1024 * 1024) {
        return (cellValue / 1024).toFixed(1) + ' KB'
      } else {
        return (cellValue / (1024 * 1024)).toFixed(1) + ' MB'
      }
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
  height: 120px;
}

.upload-container .el-upload {
  width: 100%;
  height: 100%;
}

.upload-container .el-upload-dragger {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
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