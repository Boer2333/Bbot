import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

// 创建统一的请求配置
class RequestManager {
  constructor(proxy = null, userAgent = null) {
    this.proxy = proxy;
    this.maxRetries = 3; 
    if (userAgent) {
      const chromeVersion = userAgent.match(/Chrome\/(\d+)/)[1];
      this.baseHeaders = {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Sec-Ch-Ua': `"Google Chrome";v="${chromeVersion}", "Not=A?Brand";v="8", "Chromium";v="${chromeVersion}"`,
        'Sec-Ch-Ua-Mobile': '?0',
        'User-Agent': userAgent,
        'Accept-Language': getRandomAcceptLanguage(),
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
      };
    } else {
      // 如果没传入，使用随机生成的 headers
      this.baseHeaders = generateRandomHeaders();
    }
    this.axiosInstance = this.createAxiosInstance();
  }
  createAxiosInstance() {
    let httpsAgent = null;
    let httpAgent = null;
    
    if (this.proxy) {
      try {
        // 检查是否是 socks 代理
        if (this.proxy.startsWith('socks')) {
          httpsAgent = new SocksProxyAgent(this.proxy);
          httpAgent = new SocksProxyAgent(this.proxy);
        } else {
          httpsAgent = new HttpsProxyAgent(this.proxy);
          httpAgent = new HttpsProxyAgent(this.proxy);
        }
      } catch (error) {
        throw error;
      }
    }
    
    return axios.create({
      httpAgent: httpAgent,
      httpsAgent: httpsAgent,
      headers: this.baseHeaders,
      timeout: 60000,
      proxy: false,
      maxRedirects: 5
    });
  }

  async request(config) {
    let retries = this.maxRetries;
    let lastError;

    while (retries > 0) {
        try {
            const mergedConfig = {
              ...config,
              headers: {
                  ...this.baseHeaders,
                  ...config.headers
              }
            };
            const response = await this.axiosInstance(mergedConfig);
            return response.data;
        } catch (error) {
            lastError = error;
            retries--;
            
            if (retries > 0) {
                console.log(`请求失败，剩余重试次数: ${retries}`);
                // 重试延迟 1-2 秒
                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
                continue;
            }

            throw error;  
        }
    }
  }
  async simpleRequest(config) {
    try {
      const mergedConfig = {
        ...config,
        headers: {
          ...this.baseHeaders,
          ...config.headers
        }
      };
      const response = await this.axiosInstance(mergedConfig);
      return response.data;
    } catch (error) {
      if (error.response) {
        error.statusCode = error.response.status;
        error.responseData = error.response.data;
      } else if (error.request) {
        error.isNetworkError = true;
      }
      // 直接抛出错误
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
              httpsAgent = new HttpsProxyAgent(proxy);
              httpAgent = new HttpsProxyAgent(proxy);
          }
      } catch (error) {
          console.error('❌ 代理配置失败:', error);
          throw error;
      }
  }
  
  // 创建全局 axios 实例
  const axiosInstance = axios.create({
      timeout: 30000,
      httpAgent: httpAgent,      // HTTP 代理
      httpsAgent: httpsAgent,    // HTTPS 代理
      proxy: false,              // 禁用默认代理配置
      maxRedirects: 5      // 最大重定向次数
  });

  return axiosInstance;
}

function getRandomChromeVersion() {
  return Math.floor(Math.random() * (135 - 132 + 1) + 132).toString();
}

function getRandomValue(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomUserAgent(chromeVersion = null) {
  const systems = [
      'Windows NT 10.0; Win64; x64',
      'Windows NT 11.0; Win64; x64',
      'Macintosh; Apple M1 Mac OS X 14_0',
      'Macintosh; Apple M1 Mac OS X 14_1',
      'Macintosh; Apple M2 Mac OS X 14_2',
      'Macintosh; Apple M2 Mac OS X 14_3',
      'Macintosh; Apple M3 Mac OS X 14_4'
  ];
  const system = getRandomValue(systems);
  // 如果没有传入chromeVersion，再生成一个
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
  
  // 从User-Agent中提取系统信息
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
  getRandomUserAgent,
  getRandomChromeVersion,
  getRandomAcceptLanguage
};
