import axios from 'axios';
import { getRandomUserAgent } from './http.js';



const apiKey = ''; //2captcha key   链接：https://2captcha.com/enterpage
const clientKey = ''; //YesCaptcha key    注册邀请链接：https://yescaptcha.com/i/tMUjif

async function solveWithYesCaptcha(proxy, pageUrl, options = {}) {
    const {
        type = 'CloudFlareTaskS2', // 默认使用原来的 CloudFlare 类型
        siteKey = '',
        action = '',
        minScore = 0.3,
        userAgent = getRandomUserAgent(),
        rqdata = ''
    } = options;

    console.log('开始创建YesCaptcha任务...');

    // 定义不同类型验证码的任务配置
    const taskConfigs = {
        // 原有的 CloudFlare 配置
        'CloudFlareTaskS2': {
            type: "CloudFlareTaskS2",
            websiteURL: pageUrl,
            proxy: proxy,
            requiredCookies: ["cf_clearance"],
            userAgent: userAgent
        },
        // Turnstile 配置
        'TurnstileTask': {
            type: "TurnstileTask",
            websiteURL: pageUrl,
            websiteKey: siteKey,
            proxy: proxy,
            userAgent: userAgent
        },
        // ReCaptcha V2 配置
        'RecaptchaV2Task': {
            type: "RecaptchaV2Task",
            websiteURL: pageUrl,
            websiteKey: siteKey,
            proxy: proxy,
            userAgent: userAgent
        },
        // ReCaptcha V3 配置
        'RecaptchaV3Task': {
            type: "RecaptchaV3Task",
            websiteURL: pageUrl,
            websiteKey: siteKey,
            pageAction: action,
            minScore: minScore,
            proxy: proxy,
            userAgent: userAgent
        },
        // ReCaptcha V3 Enterprise 配置
        'RecaptchaV3EnterpriseTask': {
            type: "RecaptchaV3EnterpriseTask",
            websiteURL: pageUrl,
            websiteKey: siteKey,
            pageAction: action,
            minScore: minScore,
            proxy: proxy,
            userAgent: userAgent
        },
        // hCaptcha 配置
        'HCaptchaTask': {
            type: "HCaptchaTaskProxyless",
            websiteURL: pageUrl,
            websiteKey: siteKey,
            userAgent: userAgent,
            ...(rqdata ? { enterprisePayload: { rqdata } } : {}) 
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
                // 根据不同类型返回对应的结果
                if (type === 'CloudFlareTaskS2') {
                    // 原有的 CloudFlare 结果处理
                    if (!resultResponse.data.solution?.cookies?.cf_clearance) {
                        throw new Error('无解码cookie');
                    }
                    return resultResponse;
                } else {
                    // 其他类型验证码返回 token
                    console.log(`[验证] ${type} 成功获取token`);
                    return resultResponse;
                }
            }

            attempts++;
            console.log(`⏳ 等待响应 (${attempts}/${maxAttempts})`);
        }

        throw new Error('YesCaptcha获取结果超时');
    } catch (error) {
        console.error('YesCaptcha解码失败:', error);
        throw error;
    }
}

async function solve2CaptchaV2({
  type, // 必填: 验证码类型
  siteKey, // 必填: 网站密钥
  pageUrl, // 必填: 页面URL
  action = '', // 可选: recaptcha v3 action
  minScore = 0.3, // 可选: recaptcha v3 最低分数
  proxy = '', // 可选: 代理
  userAgent = '', // 可选: UA
  enterprisePayload = {}, // 可选: Enterprise额外参数
  maxRetries = 5,
  retryDelay = 3000
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
          websiteKey: siteKey,
          ...(action && { action }),  // 如果有action参数就添加
          ...enterprisePayload  // 添加其他任何额外参数
      },
      
      // ReCaptcha V3配置
      'recaptcha3': {
          type: 'RecaptchaV3TaskProxyless',
          websiteURL: pageUrl,
          websiteKey: siteKey,
          minScore: minScore
      },
      
      // ReCaptcha V3 Enterprise配置
      'recaptcha3_enterprise': {
          type: 'RecaptchaV3EnterpriseTaskProxyless',
          websiteURL: pageUrl,
          websiteKey: siteKey,
          minScore: minScore,
          enterprisePayload: {
              action: action,
              ...enterprisePayload
          }
      }
  };

  const taskConfig = taskConfigs[type];
  if (!taskConfig) {
      throw new Error(`不支持的验证码类型: ${type}`);
  }

  // 如果提供了代理，添加代理配置
  if (proxy) {
      const [proxyIp, proxyPort, proxyUsername, proxyPassword] = proxy.split(':');
      taskConfig.proxy = {
          type: 'http',
          uri: `${proxyUsername}:${proxyPassword}@${proxyIp}:${proxyPort}`
      };
      // 修改任务类型为带代理版本
      taskConfig.type = taskConfig.type.replace('Proxyless', '');
  }

  // 如果提供了UA，添加UA配置
  if (userAgent) {
      taskConfig.userAgent = userAgent;
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

          console.log("[验证] 创建任务响应:", createTaskResponse.data);

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
                  console.log("[验证] 成功获取token");
                  return resultResponse.data.solution.token;
              }

              if (resultResponse.data.status === 'processing') {
                  console.log(`[验证] 任务处理中... (${resultAttempt + 1}/${maxResultAttempts})`);
                  resultAttempt++;
              } else {
                  throw new Error(`意外状态: ${resultResponse.data.status}`);
              }
          }
          throw new Error('获取验证码结果超时');

      } catch (error) {
          console.error(`验证码解码错误 (尝试 ${attempt}/${maxRetries}):`, error.message);
          if (attempt === maxRetries) {
              throw error;
          }
          await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
  }
}

// 保持原有方法的兼容性
async function solveTurnstile(siteKey, pageUrl, maxRetries = 5, retryDelay = 3000) {
  try {
      return await solve2CaptchaV2({
          type: 'turnstile',
          siteKey,
          pageUrl,
          maxRetries,
          retryDelay
      });
  } catch (error) {
      console.error('Turnstile解码失败:', error);
      throw error;
  }
}

// 新增Enterprise方法
async function solveRecaptchaEnterprise(siteKey, pageUrl, action = 'waiting_contact_email', maxRetries = 5, retryDelay = 3000) {
  try {
      return await solve2CaptchaV2({
          type: 'recaptcha3_enterprise',
          siteKey,
          pageUrl,
          action,
          maxRetries,
          retryDelay
      });
  } catch (error) {
      console.error('Enterprise解码失败:', error);
      throw error;
  }
}

export {
  solveWithYesCaptcha,
  solveTurnstile,
  solveRecaptchaEnterprise,
  solve2CaptchaV2 
};

export default solveTurnstile;


