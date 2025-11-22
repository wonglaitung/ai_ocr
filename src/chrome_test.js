const puppeteer = require('puppeteer');

class ChromeController {
  constructor() {
    this.browser = null;
    this.page = null;
    this.consoleMessages = [];
  }

  async launch() {
    this.browser = await puppeteer.launch({ 
      headless: false, // 设为false以便查看浏览器操作
      devtools: true   // 打开开发者工具
    });
    this.page = await this.browser.newPage();
    
    // 设置控制台消息监听器
    this.page.on('console', (msg) => {
      const values = [];
      for (let i = 0; i < msg.args().length; ++i) {
        values.push(msg.args()[i]);
      }
      const consoleMessage = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString()
      };
      this.consoleMessages.push(consoleMessage);
      console.log(`Console ${msg.type()}: ${msg.text()}`);
    });

    // 监听错误
    this.page.on('pageerror', (error) => {
      console.log('Page error:', error.message);
      this.consoleMessages.push({
        type: 'error',
        text: error.message,
        timestamp: new Date().toISOString()
      });
    });

    // 监听请求错误
    this.page.on('requestfailed', (request) => {
      console.log('Request failed:', request.url(), request.failure().errorText);
      this.consoleMessages.push({
        type: 'requestfailed',
        text: `${request.url()} - ${request.failure().errorText}`,
        timestamp: new Date().toISOString()
      });
    });
  }

  async navigateTo(url) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    await this.page.goto(url, { waitUntil: 'networkidle2' });
  }

  async waitForSelector(selector, options = {}) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.page.waitForSelector(selector, options);
  }

  async click(selector) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    await this.page.click(selector);
  }

  async type(selector, text) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    await this.page.type(selector, text);
  }

  async evaluate(pageFunction) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.page.evaluate(pageFunction);
  }

  getConsoleMessages() {
    return [...this.consoleMessages]; // 返回副本以避免外部修改
  }

  clearConsoleMessages() {
    this.consoleMessages = [];
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

// 导出模块以供其他文件使用
module.exports = ChromeController;