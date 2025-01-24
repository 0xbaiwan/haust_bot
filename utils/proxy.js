import { ProxyAgent } from 'undici';

export default class IPRoyalProxy {
  constructor(apiKey) {
    this.agent = new ProxyAgent(apiKey);
  }

  async request(method, url, options = {}) {
    try {
      const response = await fetch(url, {
        method,
        ...options,
        dispatcher: this.agent
      });
      
      return {
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text()
      };
    } catch (error) {
      throw error;
    }
  }

  async get(url, options = {}) {
    return this.request('GET', url, options);
  }

  async post(url, body, options = {}) {
    return this.request('POST', url, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  }
}
