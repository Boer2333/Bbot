import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';


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

class XAuth {
    static TWITTER_AUTHORITY = 'twitter.com';
    static TWITTER_ORIGIN = 'https://twitter.com';
    static TWITTER_API_BASE = 'https://twitter.com/i/api/2';
    static USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';
    static AUTHORIZATION = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
    static MAX_RETRIES = 3;
    static RETRY_INTERVAL = 1000; // 毫秒

    static ACCOUNT_STATE = {
        32: 'Token无效',
        64: '账号已停用',
        141: '账号已停用',
        326: '账号已锁定'
    };

    constructor(authToken, proxy = null) {
        if (!authToken) {
            throw new Error('authToken不能为空');
        }
        
        this.authToken = authToken;
        this.proxy = proxy;
        if (proxy) {
            this.http = createProxyAxios(proxy);
            console.log(`🌐`);//XAuth初始化: 使用代理
        } else {
            this.http = axios;
            console.log(`⛔`);//XAuth初始化: 不使用代理
        }
        this.csrfToken = null; // 添加一个实例变量存储CSRF token
        this.client = this._createAxiosInstance(true);
        this.client2 = this._createAxiosInstance(false);
    }

    _createAxiosInstance(includeTwitterHeaders = true) {
        const headers = {
            'user-agent': XAuth.USER_AGENT,
            'Cookie': `auth_token=${this.authToken}`
        };

        // 如果有CSRF token，添加到headers
        if (this.csrfToken) {
            headers['x-csrf-token'] = this.csrfToken;
            headers['Cookie'] += `; ct0=${this.csrfToken}`;
        }

        if (includeTwitterHeaders) {
            Object.assign(headers, {
                'authority': XAuth.TWITTER_AUTHORITY,
                'origin': XAuth.TWITTER_ORIGIN,
                'x-twitter-auth-type': 'OAuth2Session',
                'x-twitter-active-user': 'yes',
                'authorization': XAuth.AUTHORIZATION
            });
        }

        const config = {
            headers,
            timeout: 10000,
            validateStatus: null
        };

        // 如果有代理，使用代理
        return this.http.create ? this.http.create(config) : axios.create(config);
    }

    _updateCsrfToken(csrfToken) {
        if (!csrfToken) return;
        
        this.csrfToken = csrfToken;
        console.log(`更新CSRF Token: ${csrfToken.substring(0, 10)}...`);
        
        // 重新创建客户端以使用新的token
        this.client = this._createAxiosInstance(true);
        this.client2 = this._createAxiosInstance(false);
    }

    async _handleResponse(response, retryFunc) {
        // 检查是否有新的CSRF token在响应头中
        const ct0Cookie = response.headers['set-cookie']?.find(cookie => cookie.startsWith('ct0='));
        if (ct0Cookie) {
            const newCt0 = ct0Cookie.split(';')[0].split('=')[1];
            if (newCt0 !== this.csrfToken) {
                this._updateCsrfToken(newCt0);
            }
        }

        if (response.status === 429) {
            console.log(`遇到请求频率限制(429)，等待${XAuth.RETRY_INTERVAL/1000}秒后重试...`);
            await new Promise(resolve => setTimeout(resolve, XAuth.RETRY_INTERVAL));
            if (retryFunc) {
                return await retryFunc();
            }
            throw new Error('请求频率限制，重试失败');
        }
    }

    async getTwitterToken(oauthToken) {
        if (!oauthToken) {
            throw new Error('oauth_token不能为空');
        }

        console.log(`获取Twitter认证Token: ${oauthToken.substring(0, 10)}...`);
        const response = await this.client2.get('https://api.x.com/oauth/authenticate', {
            params: { oauth_token: oauthToken }
        });

        await this._handleResponse(response);
        const content = response.data;

        if (!content.includes('authenticity_token')) {
            if (content.includes('The request token for this page is invalid')) {
                throw new Error('请求oauth_token无效');
            }
            throw new Error('响应中未找到authenticity_token');
        }

        let token = null;
        const tokenMarkers = [
            'name="authenticity_token" value="',
            'name="authenticity_token" type="hidden" value="'
        ];

        for (const marker of tokenMarkers) {
            if (content.includes(marker)) {
                token = content.split(marker)[1].split('"')[0];
                break;
            }
        }

        if (!token) {
            throw new Error('获取到的authenticity_token为空');
        }

        console.log(`获取到认证Token: ${token.substring(0, 10)}...`);
        return token;
    }

    async oauth1(oauthToken) {
        console.log(`开始OAuth1流程: ${oauthToken.substring(0, 10)}...`);
        const authenticityToken = await this.getTwitterToken(oauthToken);

        const data = new URLSearchParams({
            authenticity_token: authenticityToken,
            oauth_token: oauthToken
        });

        console.log(`发送OAuth1授权请求...`);
        const response = await this.client2.post('https://x.com/oauth/authorize', data);
        await this._handleResponse(response);

        const content = response.data;

        if (!content.includes('oauth_verifier')) {
            if (content.includes('This account is suspended.')) {
                throw new Error('该账户已被封禁');
            }
            throw new Error('未找到oauth_verifier');
        }

        const verifier = content.split('oauth_verifier=')[1].split('"')[0];
        if (!verifier) {
            throw new Error('获取到的oauth_verifier为空');
        }

        console.log(`OAuth1流程完成，获取验证码: ${verifier.substring(0, 10)}...`);
        return verifier;
    }

    async getAuthCode(params) {
        if (!params || Object.keys(params).length === 0) {
            throw new Error('参数不能为空');
        }
        
        const response = await this.client.get(`${XAuth.TWITTER_API_BASE}/oauth2/authorize`, {
            params,
            headers: this.client.defaults.headers
        });

        await this._handleResponse(response);

        if (!response.data || typeof response.data !== 'object') {
            throw new Error('响应格式错误');
        }

        const data = response.data;

        // 处理CSRF token
        if (data.code === 353) {
            console.log(`需要更新CSRF`);
            const ct0Cookie = response.headers['set-cookie']?.find(cookie => cookie.startsWith('ct0='));
            if (ct0Cookie) {
                const ct0 = ct0Cookie.split(';')[0].split('=')[1];
                console.log(`获取ct0`);
                
                // 更新CSRF token并重新创建客户端
                this._updateCsrfToken(ct0);
                
                return await this.getAuthCode(params);
            }
            throw new Error('未找到ct0 cookie');
        }

        // 检查错误
        if (data.errors && data.errors.length > 0) {
            const errorCode = data.errors[0].code;
            if (XAuth.ACCOUNT_STATE[errorCode]) {
                throw new Error(`账号状态错误: ${XAuth.ACCOUNT_STATE[errorCode]}`);
            }
        }

        if (!data.auth_code) {
            throw new Error('响应中未找到auth_code');
        }
        return data.auth_code;
    }

    async oauth2(params) {
        const authCode = await this.getAuthCode(params);
    
        const data = new URLSearchParams({
            approval: 'true',
            code: authCode
        });
    
        console.log(`发送OAuth2授权请求...`);
        try {
            const response = await this.client.post(
                `${XAuth.TWITTER_API_BASE}/oauth2/authorize`,
                data,
                {
                    headers: {
                        ...this.client.defaults.headers,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json, text/plain, */*'
                    },
                    timeout: 30000,
                    responseType: 'text',
                    maxRedirects: 0, // 设置为0以捕获重定向而不是自动跟随
                    validateStatus: status => status >= 200 && status < 400 || status === 302
                }
            );
    
            await this._handleResponse(response);
            
            // 尝试获取重定向URL
            let redirectUrl = null;
            
            // 从重定向头获取URL
            if (response.status === 302 && response.headers.location) {
                redirectUrl = response.headers.location;
                console.log(`从重定向头获取URL: ${redirectUrl.substring(0, 30)}...`);
            } else {
                // 尝试从响应中提取重定向URL
                try {
                    // 尝试解析JSON响应
                    const jsonResponse = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                    if (jsonResponse.redirect_uri) {
                        redirectUrl = jsonResponse.redirect_uri;
                    }
                } catch (e) {
                    // 如果JSON解析失败，尝试从文本中提取
                    const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                    
                    const patterns = [
                        /redirect_uri":"([^"]+)"/,
                        /redirect_uri=([^&"]+)/,
                        /window\.location\.replace\(['"]([^'"]+)['"]\)/
                    ];
                    
                    for (const pattern of patterns) {
                        const match = responseText.match(pattern);
                        if (match) {
                            redirectUrl = match[1];
                            console.log(`使用模式提取到重定向URL: ${redirectUrl.substring(0, 30)}...`);
                            break;
                        }
                    }
                }
            }
            
            // 如果找到了重定向URL，跟随它
            if (redirectUrl) {
                console.log(`跟随重定向`);
                
                // 访问重定向URL
                const redirectResponse = await this.client.get(redirectUrl, {
                    maxRedirects: 0, // 允许多次重定向
                    validateStatus: status => status >= 200 && status < 400 || status === 302,
                    timeout: 30000
                });
                
                console.log(`重定向完成`);
                
                // 如果重定向URL还有下一步重定向，继续跟随
                if (redirectResponse.status === 302 && redirectResponse.headers.location) {
                    const finalRedirectUrl = redirectResponse.headers.location;
                    console.log(`最终重定向`);
                    
                    try {
                        const finalResponse = await this.client.get(finalRedirectUrl, {
                            maxRedirects: 5,
                            timeout: 30000
                        });
                        
                        console.log(`最终重定向URL访问完成`);
                    } catch (redirectError) {
                        console.warn(`最终重定向访问出错: ${redirectError.message}`);
                    }
                }
            }
            
            return { 
                authCode, 
                redirectUrl,
                completed: true,
                status: 'success'
            };
        } catch (error) {
            console.error(`OAuth2授权请求失败: ${error.message}`);
            
            // 检查是否是重定向错误，如果是，尝试跟随重定向
            if (error.response && error.response.status === 302 && error.response.headers.location) {
                const redirectUrl = error.response.headers.location;
                console.log(`从错误响应中获取重定向URL: ${redirectUrl.substring(0, 30)}...`);
            }
            
            return { 
                authCode,
                completed: false,
                error: error.message,
                status: 'error'
            };
        }
    }
}

export default XAuth;

//使用示例
// async processTwitterAuth(authUrl, twitterAuth) {
//     try {
//     // 解析授权URL
//     const url = new URL(authUrl);
//     const params = Object.fromEntries(url.searchParams.entries());
    
//     console.log(`🔄 开始处理Twitter授权`);
    
//     // 使用XAuth执行完整的OAuth2授权流程，包括重定向
//     const authResult = await twitterAuth.oauth2(params);
    
//     if (!authResult) {
//         console.error('❌ Twitter授权失败，未收到响应');
//         return null;
//     }
    
//     const { authCode, redirectUrl, completed, status, error } = authResult;
    
//     if (error) {
//         console.warn(`⚠️ 授权过程中遇到警告: ${error}`);
//     }
    
//     console.log(`🔄 Twitter授权状态: ${status}, 完成: ${completed ? '是' : '否'}`);
    
//     return authCode;
//     } catch (error) {
//     console.error('❌ 处理Twitter授权时出错:', error.message);
//     return null;
//     }
// }
