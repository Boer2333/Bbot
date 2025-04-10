import Imap from 'node-imap';
import { simpleParser } from 'mailparser';
import moment from 'moment';
import { HttpsProxyAgent } from 'https-proxy-agent';


class EmailReader {
    constructor(config) {
        this.config = {
            user: config.user,
            password: config.password,
            host: config.host,
            port: config.port || 993,
            tls: config.tls !== false,
            tlsOptions: { rejectUnauthorized: false }
        };
        this.timeConfig = {
            timeWindow: 20, // 10分钟时间窗口
            useUTC: true   // 使用UTC时间
        };
        this.spamFolderAliases = ['Spam'];
        
        this.imap = new Imap(this.config);
        this.codeConfig = {
            mode: config.mode || 'token',// 是否启用token模式
            
            // 邮件内容中的验证码格式
            tokenPatterns: [
                //提取token
                /confirmation_token=([^&\s]+)/i,
                /\/verify\/([a-zA-Z0-9\-_.]+)/i,
                /token=([^&\s]+)/i
            ],
            codePatterns: [
                /(\d{6})/,
                /验证码[：:]\s*(\d{6})/,
                /verification code[：:]\s*(\d{6})/i, // 英文格式
                /code[：:]\s*(\d{6})/i, // 简短英文格式
                /[\[\(（]\s*(\d{6})\s*[\]\)）]/, // 括号包围的6位数字
                /^[\s]*(\d{6})[\s]*$/m // 独立行的6位数字
            ],
            
            get codeLength() {
                return this.mode === 'token' ? 30 : 6
            },
            get codeFormat() {
                return this.mode === 'token' ? /^[A-Za-z0-9._-]+$/ : /^\d+$/
            }
        };
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.imap.once('ready', () => resolve());
            this.imap.once('error', (err) => {
                reject(new Error(`连接邮箱服务器失败: ${err.message}`));
            });
            this.imap.once('end', () => console.log('邮箱连接已断开'));
            this.imap.connect();
        });
    }

    disconnect() {
        return new Promise((resolve) => {
            this.imap.end();
            this.imap.once('end', () => resolve());
        });
    }
    openFolder(folder = 'INBOX') {
        return new Promise((resolve, reject) => {
            this.imap.openBox(folder, false, (err, box) => {
                if (err) {
                    console.error(`[文件夹错误] 无法打开 ${folder}:`, err.message);
                    reject(new Error(`打开文件夹失败: ${folder}`));
                } else {
                    console.log(`成功打开文件夹: ${folder}`);
                    resolve(box);
                }
            });
        });
    }
    async getRecentEmails(folder) {
        const tenMinutesAgo = new Date();
        tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - this.timeConfig.timeWindow);
      
        const formattedDate = moment(tenMinutesAgo).format('DD-MMM-YYYY');

        return new Promise((resolve, reject) => {
          this.imap.search(
            [['SINCE', formattedDate]], // 使用嵌套数组
            (err, results) => {
                if (err) {
                console.error('[搜索失败]', err.message);
                reject(err);
                return;
                }

                const limitedResults = results.slice(0, 10);
                console.log(`处理前10封邮件（共${results.length}封符合条件）`);
                this.fetchMessages(limitedResults).then(resolve).catch(reject);
            }
          );
        });
    }
    isEmailRecent(emailDate) {
        try {
            const emailTime = moment.utc(emailDate);
            const tenMinutesAgo = moment.utc().subtract(this.timeConfig.timeWindow, 'minutes');
            const isRecent = emailTime.isAfter(tenMinutesAgo);
            
            console.log(`[时间检查] 邮件时间: ${emailTime.format('YYYY-MM-DD HH:mm:ss')} UTC`);
            console.log(`[时间检查] 是否在${this.timeConfig.timeWindow}分钟内: ${isRecent}`);
            
            return isRecent;
        } catch (error) {
            console.log('[时间检查] 错误:', error.message);
            return false;
        }
    }
    

    fetchMessages(results) {
        return new Promise((resolve, reject) => {
            const messages = [];
            const fetch = this.imap.fetch(results, {
                bodies: '',
                struct: true
            });
    
            let msgCount = 0;
            fetch.on('message', (msg, seqno) => {
                console.log(`正在处理第 ${seqno} 封邮件`);
                
                msg.on('body', (stream) => {
                    simpleParser(stream)
                        .then((parsed) => {
                            messages.push(parsed);
                            console.log(`第 ${seqno} 封邮件解析成功`);
                            msgCount++;
                            // 所有消息都处理完成后才resolve
                            if (msgCount === results.length) {
                                console.log(`完成处理 ${messages.length} 封邮件`);
                                resolve(messages);
                            }
                        })
                        .catch(err => {
                            console.error(`解析第 ${seqno} 封邮件时出错:`, err);
                            reject(err);
                        });
                });
            });
    
            fetch.once('error', (err) => {
                console.error('获取邮件出错:', err);
                reject(err);
            });
    
            // 移除这里的end事件处理
            fetch.once('end', () => {
                console.log('邮件获取完成，等待解析...');
            });
        });
    }
    validateCode(code) {
        if (!code) return false;
        if (code.length < this.codeConfig.codeLength) return false;
        return this.codeConfig.codeFormat.test(code);
    }

    extractVerificationCode(message) {
    
        const patterns = this.codeConfig.mode === 'token' 
            ? this.codeConfig.tokenPatterns 
            : this.codeConfig.codePatterns;
    
        try {
            // 增强解码逻辑
            const decodeToken = (token) => {
                try {
                    // 双重解码应对编码嵌套
                    return decodeURIComponent(decodeURIComponent(token));
                } catch {
                    return token;
                }
            };
    
            // 新增：从所有链接中提取token
            const extractFromLinks = (html) => {
                const linkPattern = /<a\s+[^>]*?href=(["'])(.*?)\1/gi;
                const links = [];
                let match;
                
                while ((match = linkPattern.exec(html)) !== null) {
                    const url = match[2];
                    // console.log('[解析链接]', url); // 调试日志
                    
                    // 匹配含confirmation_token的URL
                    const tokenMatch = url.match(/(?:confirmation_token|token)=([^&]+)/i);
                    if (tokenMatch) {
                        return decodeToken(tokenMatch[1]);
                    }
                }
                return null;
            };
    
            // 优先从HTML链接提取
            if (message.html) {
                const linkToken = extractFromLinks(message.html);
                if (linkToken && this.validateCode(linkToken)) {
                    console.log('[从链接提取成功]', linkToken);
                    return linkToken;
                }
            }
    
            // 原有正则匹配逻辑
            const extractor = (text) => {
                for (const pattern of patterns) {
                    const match = text.match(pattern);
                    if (match && match[1]) {
                        console.log('[正则匹配] 模式:', pattern.toString(), '结果:', match[1]);
                        return decodeToken(match[1]);
                    }
                }
                return null;
            };
    
            // 检查HTML内容
            if (message.html) {
                const code = extractor(message.html);
                if (code && this.validateCode(code)) return code;
            }
    
            // 检查纯文本内容
            if (message.text) {
                const code = extractor(message.text);
                if (code && this.validateCode(code)) return code;
            }
    
            return null;
        } catch (error) {
            console.log('[Token提取] 错误:', error.message);
            return null;
        }
    }


    async getVerificationCodes() {
        try {
            await this.connect();
            const codes = [];

            // 第一步：检查收件箱
            try {
                await this.openFolder('INBOX');
                const inboxMessages = await this.getRecentEmails();
                codes.push(...this.processMessages(inboxMessages, 'INBOX'));
            } catch (inboxErr) {
                console.error('[收件箱检查失败]', inboxErr.message);
            }

            // 第二步：如果收件箱未找到，检查所有可能的垃圾箱
            if (codes.length === 0) {
                for (const folderName of this.spamFolderAliases) {
                    try {
                        await this.openFolder(folderName);
                        const spamMessages = await this.getRecentEmails();
                        const spamCodes = this.processMessages(spamMessages, folderName);
                        if (spamCodes.length > 0) {
                            console.warn(`[安全警告] 在垃圾箱 ${folderName} 中发现验证码`);
                            codes.push(...spamCodes);
                            break; // 找到后停止检查其他垃圾箱
                        }
                    } catch (spamErr) {
                        console.error(`[垃圾箱检查失败] ${folderName}:`, spamErr.message);
                    }
                }
            }

            await this.disconnect();
            
            // 结果处理（保持原有日志格式）
            if (codes.length > 0) {
                console.log('\n[验证码列表]');
                codes.forEach(vc => {
                    console.log(`验证码: ${vc.code}`);
                    console.log(`来源: ${vc.folder}`);
                    console.log(`发件人: ${vc.from}`);
                    console.log('-------------------');
                });
            } else {
                console.log('[结果] 未找到验证码');
            }

            return codes;
        } catch (error) {
            console.error('[全局错误]', error.message);
            try {
                await this.disconnect();
            } catch (e) {
                console.error('[断开连接异常]', e.message);
            }
            return [];
        }
    }
    processMessages(messages, folder) {
        const verificationCodes = [];
        for (const message of messages) {
            if (!this.isEmailRecent(message.date)) continue;
            const code = this.extractVerificationCode(message);
            if (code) {
                verificationCodes.push({
                    code: code,
                    subject: message.subject,
                    time: moment.utc(message.date).format('YYYY-MM-DD HH:mm:ss'),
                    from: message.from?.text,
                    folder: folder // 新增来源信息
                });
            }
        }
        return verificationCodes;
    }
}
function parseEmailCredentials(credential) {
    const [email, password] = credential.split(':');
    if (!email || !password) {
        throw new Error('凭证格式无效，应为 邮箱:密码');
    }
    
    // 从邮箱地址解析服务提供商
    const [, host] = email.split('@');
    if (!host) {
        throw new Error('Invalid email format');
    }
    
    // 根据域名确定服务提供商
    let service;
    switch (host.toLowerCase()) {
        case 'rambler.ru':
            service = 'rambler';
            break;
        case 'outlook.com':
            service = 'outlook';
            break;
        default:  // 所有其他域名视为First邮箱
            service = 'first';
    }
    
    return { email, password, service };
}
function getEmailConfig(service, username, password, proxy = null) {
    const configs = {
        rambler: {
            user: username,
            password: password,
            host: 'imap.rambler.ru',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }
        },
        outlook: {
            user: username,
            password: password,
            host: 'outlook.office365.com',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }
        },
        first: {                       
            user: username,
            password: password,
            host: 'imap.firstmail.ltd',     
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }
        }
    };

    const config = configs[service.toLowerCase()];
    if (!config) return null;

    // 添加代理配置
    if (proxy) {
        const proxyAgent = new HttpsProxyAgent(proxy);
        config.tlsOptions = {
            ...config.tlsOptions,
            host: config.host,
            servername: config.host,
            agent: proxyAgent
        };
    }

    return config;
}

async function getEmailCode(credential, proxy = null) {
    try {
        const { email, password, service } = parseEmailCredentials(credential);
        
        // 解析代理格式
        let proxyConfig = null;
        if (proxy) {
            // 支持 http://user:pass@host:port 或 host:port 格式
            const proxyUrl = new URL(proxy.includes('://') ? proxy : `http://${proxy}`);
            proxyConfig = {
                host: proxyUrl.hostname,
                port: parseInt(proxyUrl.port),
                auth: proxyUrl.username ? {
                    username: proxyUrl.username,
                    password: proxyUrl.password
                } : undefined
            };
        }

        const config = getEmailConfig(service, email, password, proxyConfig);
        if (!config) {
            throw new Error('Unsupported email service');
        }

        const emailReader = new EmailReader({
            ...config,
            mode: 'token' // 启用token模式
        });
        const codes = await emailReader.getVerificationCodes();
        
        if (codes.length > 0) {
            return codes[0].code;
        }
        
        return null;
    } catch (error) {
        console.error('[邮箱验证码获取失败]', error.message);
        return null;
    }
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getEmailCodeWithRetry(credential, proxy = null, options = {}) {
    const {
        retries = 3,
        retryDelay = 2000,
        timeout = 30000,
        randomDelay = true
    } = options;

    for (let i = 0; i < retries; i++) {
        try {
            // 添加随机延迟，避免请求过于集中
            if (randomDelay && i > 0) {
                const delay = Math.floor(Math.random() * retryDelay);
                await sleep(delay);
            }

            // 超时控制
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout')), timeout);
            });

            const codePromise = getEmailCode(credential, proxy);
            const code = await Promise.race([codePromise, timeoutPromise]);
            
            if (code) return code;
        } catch (error) {
            if (i === retries - 1) throw error;
            await sleep(retryDelay);
        }
    }
    return null;
}

export {
    getEmailCode,
    getEmailCodeWithRetry,
    parseEmailCredentials,
    EmailReader
};