import axios from 'axios';
import { getRandomUserAgent } from './http.js';
import log from './logger.js';

const apiKey = ''; //2captcha key   注册链接：https://2captcha.com/enterpage
const clientKey = ''; //YesCaptcha key    注册链接：https://yescaptcha.com/i/tMUjif
const noCaptchaKey = ''; // NoCaptcha key，  注册链接：https://www.nocaptcha.io/register?c=b34WtG
const moonKey = '';  //1Captcha key    注册链接：https://1captcha.vip/user/register?cps=NFSNS7hl

async function solveWith1Captcha(proxy, pageUrl, options = {}) {
    const {
        type = 'CloudFlareTask', // 默认使用原来的 CloudFlare 类型
        siteKey = '',
        action = ''
    } = options;

    if (!moonKey) {
        throw new Error('moonKey 未定义，请提供有效的API密钥');
    }

    log.system('开始创建1Captcha任务...', log.COLORS.BLUE);

    const taskConfigs = {
        // CloudFlare 配置
        'CloudFlareTask': {
            type: "CloudFlareTaskS3",
            websiteURL: pageUrl,
            proxy: proxy,
            requiredCookies: ["cf_clearance"]
        },
        // Turnstile 配置
        'TurnstileTask': {
            type: "TurnstileTaskProxyless",
            websiteURL: pageUrl,
            websiteKey: siteKey
        },
        // ReCaptcha V2 配置
        'Recaptchav2': {
            type: "RecaptchaV2TaskProxyless",
            websiteURL: pageUrl,
            websiteKey: siteKey
        },
        // ReCaptcha V3 配置
        'Recaptchav3': {
            type: "RecaptchaV3TaskProxyless",
            websiteURL: pageUrl,
            websiteKey: siteKey,
            pageAction:action
        },
        // ReCaptcha V3 Enterprise 配置
        'Recaptchav3M1': {
            type: "RecaptchaV3TaskProxylessM1",
            websiteURL: pageUrl,
            websiteKey: siteKey,
            pageAction: action
        },
        // ReCaptcha V3 Enterprise 配置
        'RecaptchaV3K1': {
            type: "RecaptchaV3TaskProxyLessK1",
            websiteURL: pageUrl,
            websiteKey: siteKey,
            pageAction: action
        },
        // hCaptcha 配置
        'HCaptchaTask': {
            type: "HCaptchaTaskProxyless",
            websiteURL: pageUrl,
            websiteKey: siteKey
        }
    };

    const taskConfig = taskConfigs[type];
    if (!taskConfig) {
        throw new Error(`不支持的验证码类型: ${type}`);
    }

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    try {
        const createTaskResponse = await axios.post('https://api.1captcha.vip/createTask', {
            clientKey: moonKey,
            task: taskConfig
        }, { headers });

        if (!createTaskResponse.data.taskId) {
            throw new Error(`1Captcha错误: ${JSON.stringify(createTaskResponse.data)}`);
        }

        const taskId = createTaskResponse.data.taskId;
        let attempts = 0;
        const maxAttempts = 40;

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000));

            const resultResponse = await axios.post('https://api.1captcha.vip/getTaskResult', {
                clientKey: moonKey,
                taskId: taskId
            }, { headers });

            if (resultResponse.data.status === 'ready') {
                // 根据不同类型返回对应的结果,调用处获取验证码应为response.solution.gRecaptchaResponse
                if (type === 'CloudFlareTask') {
                    if (!resultResponse.data.solution?.cookies?.cf_clearance) {
                        throw new Error('无解码cookie');
                    }
                    return resultResponse;
                } else {
                    // 其他类型验证码返回 token
                    log.system(`${type} 成功获取token`, log.COLORS.GREEN);
                    return resultResponse;
                }
            }

            attempts++;
            log.system(`等待解码 (${attempts}/${maxAttempts})`, log.COLORS.GRAY);
        }

        throw new Error('1Captcha获取结果超时');
    } catch (error) {
        log.system(`1Captcha解码失败: ${error}`, log.COLORS.RED);
        throw error;
    }
}

async function solveWithNoCaptcha(options = {}) {
    const {
        type = 'enterprise', // 默认使用通用版: 'universal', 'enterprise', 'steam'
        sitekey = '',       // reCAPTCHA的site key
        referer = '',       // 触发页面的完整URL
        size = 'invisible', // 验证类型: 'invisible'或'normal'
        title = '',         // 页面标题
        action = '',        // v3需要的action值
        proxy = '',         // 代理设置
    } = options;

    // 验证必须参数
    if (!sitekey) throw new Error('缺少必要参数: sitekey');
    if (!referer) throw new Error('缺少必要参数: referer');
    if (!size) throw new Error('缺少必要参数: size');
    if (!title) throw new Error('缺少必要参数: title');

    // 确定API类型对应的URL
    const apiUrls = {
        'universal': 'http://api.nocaptcha.io/api/wanda/recaptcha/universal',
        'enterprise': 'http://api.nocaptcha.io/api/wanda/recaptcha/enterprise',
        'steam': 'http://api.nocaptcha.io/api/wanda/recaptcha/steam'
    };

    if (!apiUrls[type]) {
        throw new Error(`未知的NoCaptcha API类型: ${type}`);
    }

    // 构建请求头
    const headers = {
        'User-Token': noCaptchaKey,
        'Content-Type': 'application/json'
    };

    // 构建请求体
    const requestData = {
        sitekey: sitekey,
        referer: referer,
        size: size,
        title: title
    };

    // 添加可选参数
    if (action) requestData.action = action;
    if (proxy) requestData.proxy = proxy;

    try {
        const response = await axios.post(apiUrls[type], requestData, { headers });
        
        if (response.data.status === 0) {
            throw new Error(`NoCaptcha错误: ${response.data.msg || JSON.stringify(response.data)}`);
        }
        
        if (!response.data.data || !response.data.data.token) {
            throw new Error('NoCaptcha未返回token值或token位置不正确');
        }
        
        return response.data.data.token;
    } catch (error) {
        log.system('验证码解析失败:', log.COLORS.RED);
        
        // 更详细的错误信息
        if (error.response) {
            log.system(`服务器响应: ${JSON.stringify(error.response.data, null, 2)}`, log.COLORS.RED);
        }
        
        throw error;
    }
}

async function solveWithYesCaptcha(proxy, pageUrl, options = {}) {
    const {
        type = 'CloudFlareTask', // 默认使用原来的 CloudFlare 类型
        siteKey = '',
        action = '',
        userAgent = getRandomUserAgent(),
        rqdata = ''
    } = options;

    log.system('开始创建YesCaptcha任务...', log.COLORS.BLUE);

    const taskConfigs = {
        // CloudFlare 配置
        'CloudFlareTask': {
            type: "CloudFlareTaskS3",
            websiteURL: pageUrl,
            proxy: proxy,
            requiredCookies: ["cf_clearance"]
        },
        // Turnstile 配置
        'TurnstileTask': {
            type: "TurnstileTaskProxyless",
            websiteURL: pageUrl,
            websiteKey: siteKey
        },
        // ReCaptcha V2 配置
        'Recaptchav2': {
            type: "RecaptchaV2TaskProxyless",
            websiteURL: pageUrl,
            websiteKey: siteKey
        },
        // ReCaptcha V3 配置
        'Recaptchav3': {
            type: "RecaptchaV3TaskProxyless",
            websiteURL: pageUrl,
            websiteKey: siteKey,
            pageAction:action
        },
        // ReCaptcha V3 Enterprise 配置
        'Recaptchav3M1': {
            type: "RecaptchaV3TaskProxylessM1",
            websiteURL: pageUrl,
            websiteKey: siteKey,
            pageAction: action
        },
        // ReCaptcha V3 Enterprise 配置
        'RecaptchaV3K1': {
            type: "RecaptchaV3TaskProxyLessK1",
            websiteURL: pageUrl,
            websiteKey: siteKey,
            pageAction: action
        },
        // hCaptcha 配置
        'HCaptchaTask': {
            type: "HCaptchaTaskProxyless",
            websiteURL: pageUrl,
            websiteKey: siteKey
        }
    };

    // 获取对应类型的任务配置
    const taskConfig = taskConfigs[type];
    if (!taskConfig) {
        throw new Error(`不支持的验证码类型: ${type}`);
    }

    try {
        // 创建任务
        const createTaskResponse = await axios.post('https://api.yescaptcha.com/createTask', {
            clientKey: clientKey,
            task: taskConfig
        });

        if (!createTaskResponse.data.taskId) {
            throw new Error(`YesCaptcha错误: ${JSON.stringify(createTaskResponse.data)}`);
        }

        const taskId = createTaskResponse.data.taskId;
        let attempts = 0;
        const maxAttempts = 15;

        // 轮询获取结果
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000));

            const resultResponse = await axios.post('https://api.yescaptcha.com/getTaskResult', {
                clientKey: clientKey,
                taskId: taskId
            });

            if (resultResponse.data.status === 'ready') {
                // 根据不同类型返回对应的结果,调用处获取验证码应为response.solution.gRecaptchaResponse
                if (type === 'CloudFlareTask') {
                    // 原有的 CloudFlare 结果处理
                    if (!resultResponse.data.solution?.cookies?.cf_clearance) {
                        throw new Error('无解码cookie');
                    }
                    return resultResponse;
                } else {
                    // 其他类型验证码返回 token
                    log.system(`${type} 成功获取token`, log.COLORS.GREEN);
                    return resultResponse;
                }
            }

            attempts++;
            log.system(`等待响应 (${attempts}/${maxAttempts})`, log.COLORS.GRAY);
        }

        throw new Error('YesCaptcha获取结果超时');
    } catch (error) {
        log.system(`YesCaptcha解码失败: ${error}`, log.COLORS.RED);
        throw error;
    }
}

async function solve2CaptchaV2({
  type, 
  siteKey, 
  pageUrl, 
  action = '', 
  minScore = 0.3, 
  maxRetries = 5,
  retryDelay = 3000,
  isInvisible = false,
  isEnterprise = false
}) {
  // 根据不同类型配置任务参数
  const taskConfigs = {
    // Turnstile配置
    'turnstile': {
        type: 'TurnstileTaskProxyless',
        websiteURL: pageUrl,
        websiteKey: siteKey
    },
    
    // ReCaptcha V2配置
    'recaptcha2': {
        type: 'RecaptchaV2TaskProxyless',
        websiteURL: pageUrl,
        websiteKey: siteKey
    },

    'recaptcha2_enterprise': {
        type: 'RecaptchaV2EnterpriseTaskProxyless',
        websiteURL: pageUrl,
        websiteKey: siteKey,
        isInvisible:isInvisible
    },
    
    // ReCaptcha V3配置
    'recaptcha3': {
        type: 'RecaptchaV3TaskProxyless',
        websiteURL: pageUrl,
        websiteKey: siteKey,
        minScore: minScore,
        pageAction: action,
        isEnterprise: isEnterprise

    }
  };

  const taskConfig = taskConfigs[type];
  if (!taskConfig) {
      throw new Error(`不支持的验证码类型: ${type}`);
  }


  for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
          // 创建任务
          const createTaskResponse = await axios.post('https://api.2captcha.com/createTask', {
              clientKey: apiKey,
              task: taskConfig
          }, {
              headers: { 'Content-Type': 'application/json' }
          });

          log.system("创建任务响应: " + JSON.stringify(createTaskResponse.data), log.COLORS.BLUE);

          if (createTaskResponse.data.errorId > 0) {
              throw new Error(`创建任务失败: ${createTaskResponse.data.errorDescription}`);
          }

          const taskId = createTaskResponse.data.taskId;
          let resultAttempt = 0;
          const maxResultAttempts = 15;

          while (resultAttempt < maxResultAttempts) {
              await new Promise(resolve => setTimeout(resolve, 5000));

              const resultResponse = await axios.post('https://api.2captcha.com/getTaskResult', {
                  clientKey: apiKey,
                  taskId: taskId
              });

              if (resultResponse.data.status === 'ready') {
                  log.system("成功获取token", log.COLORS.GREEN);
                  //直接返回了解码结果
                  return resultResponse.data.solution.gRecaptchaResponse;
              }

              if (resultResponse.data.status === 'processing') {
                  log.system(`任务处理中... (${resultAttempt + 1}/${maxResultAttempts})`, log.COLORS.GRAY);
                  resultAttempt++;
              } else {
                  throw new Error(`意外状态: ${resultResponse.data.status}`);
              }
          }
          throw new Error('获取验证码结果超时');

      } catch (error) {
          log.system(`验证码解码错误 (尝试 ${attempt}/${maxRetries}): ${error.message}`, log.COLORS.RED);
          if (attempt === maxRetries) {
              throw error;
          }
          await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
  }
}

export {
  solveWithYesCaptcha,
  solveWithNoCaptcha,
  solve2CaptchaV2,
  solveWith1Captcha
};

export default solveWithYesCaptcha;
