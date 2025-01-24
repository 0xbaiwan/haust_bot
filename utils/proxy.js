import http from 'http';
import https from 'https';

export default class IPRoyalProxy {
  constructor(username, password, country = 'br', session = 'sgn34f3e', lifetime = '10m') {
    this.username = username;
    this.password = `${password}_country-${country}_session-${session}_lifetime-${lifetime}`;
    this.proxyHost = 'geo.iproyal.com';
    this.proxyPort = 12321;
  }

  getProxyOptions(targetUrl) {
    const targetUrlObj = new URL(targetUrl);
    const auth = 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64');

    return {
      host: this.proxyHost,
      port: this.proxyPort,
      headers: {
        'Host': targetUrlObj.host,
        'Proxy-Authorization': auth
      }
    };
  }

  request(method, url, options = {}) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const proxyOptions = this.getProxyOptions(url);
      
      const reqOptions = {
        ...proxyOptions,
        method: method.toUpperCase(),
        path: url,
        ...options
      };

      const req = protocol.request(reqOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        }));
      });

      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  get(url, options = {}) {
    return this.request('GET', url, options);
  }

  post(url, body, options = {}) {
    return this.request('POST', url, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      body
    });
  }
}
