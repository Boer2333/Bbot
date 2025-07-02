import { createProxyAxios, generateRandomHeaders } from "./http.js";
import log from './logger.js';

class DCAuth {
  constructor(options = {}) {
    this.proxy = options.proxy || null;
    this.headers = generateRandomHeaders();
  }
  /**
   * 获取Discord授权码
   * @param {string} version - API版本，如 'v9'
   * @param {URLSearchParams|Object} params - URL查询参数
   * @param {Object|null} requestBody - 请求体（可选）
   * @param {string} discordToken - Discord令牌
   * @returns {Promise<string|null>} 授权码或null
   */
  async Oauth(version, params, requestBody=null, discordToken, shortWalletAddress = '') {
    log.system(`开始获取Discord授权码...`, log.COLORS.BLUE);

    const queryString = params.toString();
    const authheaders = {
      "authorization": discordToken,
      "origin":"https://discord.com",
      "referer": `https://discord.com/oauth2/authorize?${queryString}`
    };
    
    try {
      const axiosInstance = createProxyAxios(this.proxy);
      
      const url = `https://discord.com/api/${version}/oauth2/authorize?${queryString}`;
      
      const headers = {
          ...this.headers,
          ...authheaders
      };
      
      log.system(`发送授权请求...`, log.COLORS.BLUE);
      
      const response = await axiosInstance.post(url, requestBody, { 
          headers: headers,
          maxRedirects: 0, // 不自动重定向
          validateStatus: function (status) {
            return status >= 200 && status < 400; 
          }
      });
      
      log.system(`响应状态: ${response?.status}`, log.COLORS.CYAN);
      
      if (response && response.data) {
          const responsePreview = JSON.stringify(response.data).substring(0, 200);
          log.system(`响应数据: ${responsePreview}${responsePreview.length < JSON.stringify(response.data).length ? '...' : ''}`, log.COLORS.CYAN);
          
          if (response.data.location) {
            log.system(`从响应数据中找到location: ${response.data.location}`, log.COLORS.GREEN);
            
            if (response.data.location.includes('code=')) {
                const code = response.data.location.split('code=')[1].split('&')[0];
                log.system(`成功从响应数据提取授权码: ${code}`, log.COLORS.GREEN);
                return code;
            }
          }
      }
      
      log.system(`无法从响应中提取授权码`, log.COLORS.YELLOW);
      return null; 
    } catch (error) {
      const errorMessage = error.message || "未知错误";
      
      log.system(`授权请求出错: ${errorMessage}`, log.COLORS.RED);
      
      if (error.response) {
          log.system(`错误状态: ${error.response.status}`, log.COLORS.RED);
          log.system(`错误数据: ${JSON.stringify(error.response.data || {}).substring(0, 200)}`, log.COLORS.RED);
      }
    }
    return null;
  }
}

export default DCAuth;
