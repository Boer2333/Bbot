import { createProxyAxios,generateRandomHeaders } from "./http.js";

class DCAuth {
  constructor(options = {}) {
    this.proxy = options.proxy || null;
    this.headers = generateRandomHeaders();
    this.logPrefix = '🔑 [Auth]'; 

  }
  /**
   * 获取Discord授权码
   * @param {string} version - API版本，如 'v9'
   * @param {URLSearchParams|Object} params - URL查询参数
   * @param {Object|null} requestBody - 请求体（可选）
   * @param {string} discordToken - Discord令牌
   * @param {string} walletAddress - 钱包地址（用于日志，可选）
   * @returns {Promise<string|null>} 授权码或null
   */
  async Oauth(version,params,requestBody=null,discordToken,walletAddress = '') {
    
    const authheaders = {
      "authorization": discordToken,
      "origin":"https://discord.com",
      "referer": `https://discord.com/oauth2/authorize?${queryString}`
    };
    
    log(`开始获取Discord授权码...`);
    try {
    const axiosInstance = createProxyAxios(this.proxy);
    
    // 构建URL
    const queryString = params.toString();
    const url = `https://discord.com/api/${version}/oauth2/authorize?${queryString}`;
    
    // 构建请求头
    const headers = {
        ...this.headers,
        ...authheaders
    };
    
    log(`发送授权请求...`);
    
    // 发送POST请求
    const response = await axiosInstance.post(url, requestBody, { 
        headers: headers,
        maxRedirects: 0, // 不自动重定向
        validateStatus: function (status) {
        return status >= 200 && status < 400; // 接受200-399的状态码
        }
    });
    
    log(`响应状态: ${response?.status}`);
    
    // 检查响应
    if (response && response.data) {
        // 记录响应数据（截断以避免日志过长）
        const responsePreview = JSON.stringify(response.data).substring(0, 200);
        log(`响应数据: ${responsePreview}${responsePreview.length < JSON.stringify(response.data).length ? '...' : ''}`, "info", shortWalletAddress);
        
        // 检查location字段
        if (response.data.location) {
        log(`从响应数据中找到location: ${response.data.location}`);
        
        // 提取授权码
        if (response.data.location.includes('code=')) {
            const code = response.data.location.split('code=')[1].split('&')[0];
            log(`成功从响应数据提取授权码: ${code}`);
            return code;
        }
        }
    }
    
    log(`无法从响应中提取授权码`);
    return null; // 使用固定授权码作为备用
    } catch (error) {
    // 处理请求错误
    const errorMessage = error.message || "未知错误";
    
    log(`授权请求出错: ${errorMessage}`);
    
    // 详细记录错误信息，帮助调试
    if (error.response) {
        log(`错误状态: ${error.response.status}`);
        log(`错误数据: ${JSON.stringify(error.response.data || {}).substring(0, 200)}`);
    }
    }
    return null;
  }
}

export default DCAuth;