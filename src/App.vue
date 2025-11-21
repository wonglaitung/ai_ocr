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
      ocrResults: {} // 存储OCR结果，按页码索引
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
      }
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
                try {
                  // 对图像执行OCR识别
                  const result = await Tesseract.recognize(
                    img.data.url,
                    'chi_sim+eng', // 支持中文和英文
                    {
                      logger: m => console.log(m) // OCR进度日志
                    }
                  )
                  
                  ocrText += `\n--- 图像 ${i + 1} 识别结果 ---\n`
                  ocrText += result.data.text
                  
                  // 保存OCR结果和图像位置信息
                  ocrResults.push({
                    text: result.data.text,
                    imageId: img.id,
                    pageIndex: this.pageNum - 1, // PDF.js使用0基索引
                    boundingRect: null // 暂时无法获取图像在页面上的确切位置
                  })
                  
                  console.log(`图像${i+1} OCR结果:`, result.data.text)
                } catch (error) {
                  console.error(`处理图像${i+1}时出错:`, error)
                  ocrText += `\n--- 图像 ${i + 1} 处理失败 ---\n`
                  ocrText += `错误: ${error.message}\n`
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
              
              // 对图像执行OCR识别
              const result = await Tesseract.recognize(
                url,
                'chi_sim+eng', // 支持中文和英文
                {
                  logger: m => console.log(m) // OCR进度日志
                }
              )
              
              ocrText += `\n--- 图像 ${i + 1} 识别结果 ---\n`
              ocrText += result.data.text
              
              // 保存OCR结果和图像位置信息
              ocrResults.push({
                text: result.data.text,
                imageId: img.id,
                pageIndex: this.pageNum - 1, // PDF.js使用0基索引
                boundingRect: null // 暂时无法获取图像在页面上的确切位置
              })
              
              console.log(`图像${i+1} OCR结果:`, result.data.text)
              
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
          
          // 存储OCR结果到缓存中
          if (!this.ocrResults[this.pageNum]) {
            this.ocrResults[this.pageNum] = []
          }
          this.ocrResults[this.pageNum].push({
            text: ocrText,
            imageResults: ocrResults
          })
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
          
          console.log(`开始搜索 "${this.searchText}"，总页数: ${totalPages}`)
        
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
          
          // 先尝试直接匹配（原始文本）
          while ((searchIndex = fullText.toLowerCase().indexOf(this.searchText.toLowerCase(), searchStart)) !== -1) {
            matches.push({
              text: this.searchText,
              startIndex: searchIndex,
              endIndex: searchIndex + this.searchText.length,
              page: pageNum
            })
            searchStart = searchIndex + 1
          }
          
          // 如果没有找到匹配项，尝试去除空格后匹配
          if (this.searchText && this.searchText.length > 1) { // 只对长度大于1的搜索词进行空格处理
            const searchWithoutSpaces = this.searchText.replace(/\s+/g, '')
            if (searchWithoutSpaces && searchWithoutSpaces !== this.searchText.replace(/\s+/g, '')) {
              let cleanFullText = fullText.replace(/\s+/g, '')
              let cleanSearchStart = 0
              let cleanSearchIndex
              
              while ((cleanSearchIndex = cleanFullText.toLowerCase().indexOf(searchWithoutSpaces.toLowerCase(), cleanSearchStart)) !== -1) {
                matches.push({
                  text: this.searchText,
                  startIndex: cleanSearchIndex,
                  endIndex: cleanSearchIndex + searchWithoutSpaces.length,
                  page: pageNum,
                  matchType: 'spaced-text' // 标记这是通过去除空格匹配的
                })
                cleanSearchStart = cleanSearchIndex + 1
              }
            }
          }
          
          // 将当前页面的匹配项添加到总结果中
          allMatches.push(...matches)
          
          // 检查OCR结果中是否有匹配项
          console.log(`第${pageNum}页OCR结果数量:`, this.ocrResults[pageNum] ? this.ocrResults[pageNum].length : 0)
          if (this.ocrResults[pageNum]) {
            for (const ocrResult of this.ocrResults[pageNum]) {
              if (ocrResult.imageResults) {
                for (const imageResult of ocrResult.imageResults) {
                  const ocrText = imageResult.text
                  console.log(`检查OCR文本: "${ocrText.substring(0, 100)}..." (总长度: ${ocrText.length})`)
                  let ocrSearchStart = 0
                  let ocrSearchIndex
                  
                  console.log(`OCR搜索调试 - 搜索词: "${this.searchText}", OCR文本: "${ocrText.substring(0, 100)}..."`)
                  
                  // 处理OCR文本中的空格问题
                  // 先尝试直接匹配（原始文本）
                  let directMatchCount = 0
                  while ((ocrSearchIndex = ocrText.toLowerCase().indexOf(this.searchText.toLowerCase(), ocrSearchStart)) !== -1) {
                    console.log(`在OCR文本中找到直接匹配: "${this.searchText}" at index ${ocrSearchIndex}`)
                    allMatches.push({
                      text: this.searchText,
                      startIndex: ocrSearchIndex,
                      endIndex: ocrSearchIndex + this.searchText.length,
                      page: pageNum,
                      isFromImage: true, // 标记这是来自图像OCR的结果
                      imageResult: imageResult
                    })
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
                        allMatches.push({
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
                          allMatches.push({
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
                          allMatches.push({
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
                }
              }
            }
          }
          
          // 在控制台打印每页的搜索结果
          if (matches.length > 0 || (this.ocrResults[pageNum] && this.ocrResults[pageNum].some(ocr => ocr.imageResults && ocr.imageResults.some(ir => ir.text.toLowerCase().includes(this.searchText.toLowerCase()))))) {
            console.log(`在第 ${pageNum} 页找到了 ${matches.length} 个页面文本匹配项和OCR匹配项`)
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
    
    // 渲染带高亮的PDF页面
    async renderPdfPageWithHighlights(pdf, pageNumber, currentPageMatches) {
      const page = await pdf.getPage(pageNumber)
      const scale = 1.5
      const viewport = page.getViewport({ scale })
      
      const canvas = this.$refs.pdfCanvas
      const context = canvas.getContext('2d')
      canvas.height = viewport.height
      canvas.width = viewport.width
      
      // 渲染PDF页面
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }
      await page.render(renderContext).promise
      
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
        
        // 遍历文本项，高亮包含搜索词的内容
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          // 检查当前文本项是否包含搜索词
          if (item.str.toLowerCase().includes(this.searchText.toLowerCase())) {
            // 使用PDF.js的变换矩阵来计算准确位置
            const transform = item.transform
            // 计算实际坐标 (PDF坐标系与Canvas坐标系不同，需要转换)
            const x = transform[4] * scale
            const y = canvas.height - (transform[5] * scale + (item.height || 12) * scale)
            // 计算宽度和高度
            const width = item.width ? item.width * scale : context.measureText(item.str).width
            const height = (item.height || 14) * scale * 1.2 // 增加高度以完全覆盖文字
            
            console.log(`发现页面文本匹配: "${item.str}", 位置: (${x}, ${y}), 尺寸: ${width}x${height}`)
            
            // 检查这是否是当前选中的搜索结果
            const isCurrentResult = currentResult && 
              currentResult.page === pageNumber && 
              !currentResult.isFromImage && // 不是来自图像OCR的结果
              Math.abs(currentResult.startIndex - item.str.toLowerCase().indexOf(this.searchText.toLowerCase())) < item.str.length
              
            // 添加调试日志
            if (item.str.toLowerCase().includes(this.searchText.toLowerCase())) {
              console.log(`页面文本匹配调试 - 搜索词: "${this.searchText}", 匹配文本: "${item.str}", 位置: ${item.transform[4]}, ${item.transform[5]}`)
            }
            
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
            context.strokeRect(x, y, width, height)
          }
        }
        
        // 高亮来自图像OCR的结果
        const imageMatches = currentPageMatches.filter(match => match.isFromImage)
        console.log(`OCR图像匹配项数量: ${imageMatches.length}`)
        
        if (imageMatches.length > 0) {
          for (const match of imageMatches) {
            console.log(`处理OCR图像匹配项:`, match)
            
            // 获取页面中的图像对象以确定位置
            const ops = await page.getOperatorList()
            let imagePosition = null
            
            // 尝试找到图像在页面上的位置
            for (let i = 0; i < ops.fnArray.length; i++) {
              if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
                const imageId = ops.argsArray[i][0]
                
                // 获取图像的位置和尺寸
                const transform = ops.transformMatrix || page.view
                if (transform) {
                  // 计算图像位置
                  const x = transform[4] * scale
                  const y = canvas.height - (transform[5] * scale) // 调整Y坐标系
                  const width = (transform[2] || 100) * scale
                  const height = (transform[3] || 100) * scale
                  
                  // 使用固定位置作为后备方案，但尝试获取更精确的位置
                  let highlightX = x
                  let highlightY = y
                  let highlightWidth = width
                  let highlightHeight = height > 20 ? height : 20 // 确保高度至少为20px
                  
                  // 如果无法获得准确位置，使用页面中央位置并避开其他元素
                  if (isNaN(x) || x === 0) {
                    highlightX = canvas.width / 4
                    highlightY = canvas.height / 2 + (imageMatches.indexOf(match) * 30)
                    highlightWidth = canvas.width / 2
                    highlightHeight = 20
                  }
                  
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
                    console.log(`高亮当前选中的OCR文本: "${match.text}"`)
                  } else {
                    // 普通高亮
                    context.fillStyle = 'rgba(255, 255, 0, 0.5)' // 黄色半透明
                    console.log(`高亮普通OCR文本: "${match.text}"`)
                  }
                  
                  context.fillRect(highlightX, highlightY, highlightWidth, highlightHeight)
                  context.strokeRect(highlightX, highlightY, highlightWidth, highlightHeight)
                  
                  // 恢复填充样式
                  context.fillStyle = 'rgba(255, 255, 0, 0.5)' // 黄色半透明
                  break
                }
              }
            }
            
            // 如果上面的方法没有成功，使用页面中央位置
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
              context.strokeRect(highlightX, highlightY, highlightWidth, highlightHeight)
              
              // 恢复填充样式
              context.fillStyle = 'rgba(255, 255, 0, 0.5)' // 黄色半透明
            }
          }
        } else {
          console.log(`第${pageNumber}页没有OCR图像匹配项`)
        }
      } else {
        console.log(`第${pageNumber}页没有匹配项`)
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