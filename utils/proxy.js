import { HttpsProxyAgent } from 'https-proxy-agent';
import config from '../config.js';
import fetch from 'node-fetch';

export default class IPRoyalProxy {
  constructor(proxyUrl = config.proxyUrl) {
    if (!proxyUrl) {
      throw new Error('未配置代理');
    }
    
    try {
      const url = new URL(proxyUrl);
      this.username = url.username;
      this.password = url.password;
      this.host = url.hostname;
      this.port = url.port;
      this.agent = new HttpsProxyAgent(proxyUrl);
    } catch (error) {
      throw new Error(`无效的代理URL: ${proxyUrl}`);
    }
  }

  async testConnection() {
    try {
      const response = await fetch('https://api.ipify.org?format=json', {
        agent: this.agent,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`代理测试失败: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`代理连接成功，当前IP: ${data.ip}`);
      return data.ip;
    } catch (error) {
      console.error('代理连接详细错误:', {
        message: error.message,
        stack: error.stack,
        proxyUrl: this.agent.proxy.href
      });
      throw new Error(`代理连接测试失败: ${error.message}`);
    }
  }

  static async createProxyPool() {
    if (!config.proxyUrl) {
      return [];
    }
    
    try {
      const proxy = new IPRoyalProxy();
      await proxy.testConnection();
      return [proxy];
    } catch (error) {
      console.error(`代理初始化失败: ${error.message}`);
      return [];
    }
  }
}
