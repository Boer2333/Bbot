import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

class RequestManager {
  constructor(proxy = null) {
    this.proxy = proxy;
    this.axiosInstance = createProxyAxios(this.proxy);
  }

  async Request(config) {
    try {
      const mergedConfig = {
        ...config,
        headers: {
          ...config.headers
        }
      };
      const response = await this.axiosInstance(mergedConfig);
      return {
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      if (error.message) {
        if (error.message.includes('Proxy connection ended before receiving CONNECT response') || 
            error.message.includes('socket hang up') || 
            error.message.includes('ECONNRESET')) {
          
          error.originalMessage = error.message;
          
          error.message = '❌ 代理网络连接异常，请重试';
          error.isProxyError = true;
        }
      }
      if (error.response) {
        error.statusCode = error.response.status;
        error.responseData = error.response.data;
        error.responseHeaders = error.response.headers;
      } else if (error.request) {
        error.isNetworkError = true;
      }
      throw error;
    }
  }

  async simpleRequest(config) {
    try {
      const mergedConfig = {
        ...config,
        headers: {
          ...config.headers
        }
      };
      const response = await this.axiosInstance(mergedConfig);
      return response.data;
    } catch (error) {
      if (error.message) {
        if (error.message.includes('Proxy connection ended before receiving CONNECT response') || 
            error.message.includes('socket hang up') || 
            error.message.includes('ECONNRESET')) {
          
          error.originalMessage = error.message;
          
          error.message = '❌ 代理网络连接异常，请重试';
          error.isProxyError = true;
        }
      }
      if (error.response) {
        error.statusCode = error.response.status;
        error.responseData = error.response.data;
      } else if (error.request) {
        error.isNetworkError = true;
      }
      throw error;
    }
  }
}

function createProxyAxios(proxy = null) {
  let httpsAgent = null;
  let httpAgent = null;

  if (proxy) {
    try {
      if (proxy.startsWith('socks')) {
          const agent = new SocksProxyAgent(proxy);
          httpsAgent = agent;
          httpAgent = agent;
      } else {
          const agent = new HttpsProxyAgent(proxy);
          httpsAgent = agent;
          httpAgent = agent;
      }
    } catch (error) {
      throw error;
    }
  }
  
  const axiosInstance = axios.create({
    timeout: 60000,
    httpAgent: httpAgent,      
    httpsAgent: httpsAgent,  
    headers: generateRandomHeaders(), 
    proxy: false,            
    maxRedirects: 5  
  });

  return axiosInstance;
}

function getRandomChromeVersion() {
  return Math.floor(Math.random() * (138 - 136 + 1) + 136).toString();
}

function getRandomValue(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomUserAgent(chromeVersion = null) {
  const systems = [
    'Windows NT 10.0; Win64; x64',
    'Windows NT 11.0; Win64; x64',
    'Macintosh; Apple M4 Mac OS X 15_0',
    'Macintosh; Apple M4 Mac OS X 15_1',
    'Macintosh; Apple M4 Mac OS X 15_2'
];
  const system = getRandomValue(systems);
  if (!chromeVersion) {
    chromeVersion = getRandomChromeVersion();
  }
  
  if (system.includes('Windows')) {
      return `Mozilla/5.0 (${system}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
  } else {
      const subVersion = Math.floor(Math.random() * 100);
      return `Mozilla/5.0 (${system}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${subVersion}.0 Safari/537.36`;
  }
}

function getRandomAcceptLanguage() {
  const languages = [
    'en-US,en;q=0.9',
    'en-GB,en;q=0.8',
    'zh-CN,zh;q=0.9,en;q=0.8',
    'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6'
  ];
  return languages[Math.floor(Math.random() * languages.length)];
}

function generateRandomHeaders() {
  const chromeVersion = getRandomChromeVersion();
  const userAgent = getRandomUserAgent(chromeVersion);
  const acceptLanguage = getRandomAcceptLanguage();
  
  let platform = '"Windows"';
  if (userAgent.includes('Macintosh')) {
    platform = '"macOS"';
  }

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Sec-Ch-Ua': `"Google Chrome";v="${chromeVersion}", "Not=A?Brand";v="8", "Chromium";v="${chromeVersion}"`,
    'Sec-Ch-Ua-Mobile': '?0',
    'User-Agent': userAgent,
    'Accept-Language': acceptLanguage,
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Ch-Ua-Platform': platform
  };

  return headers;
}

export {
  RequestManager,
  createProxyAxios,
  generateRandomHeaders,
  getRandomUserAgent
};
