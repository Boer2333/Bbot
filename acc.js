import fs from 'fs';
import { parse } from 'csv-parse/sync';
import log from './logger.js';

const loadAccounts = (filePath, number = null) => {
    const accounts = [];
    
    try {
        if (!fs.existsSync(filePath)) {
            log.system(`未找到账户文件 ${filePath}`, log.COLORS.RED);
            return number ? [] : accounts;
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });

        for (const record of records) {
            if (record.add) {
                const convertedProxy = record.proxy ? convertProxyFormat(record.proxy) : null;

                accounts.push({
                    num: record.num,
                    add: record.add.toLowerCase(),
                    pk: record.pk || null,
                    proxy: convertedProxy,
                    email: record.email || null,
                    twtoken: record.twtoken || null,
                    dctoken: record.dctoken || null,
                    invitecode: record.invitecode || null,
                    remark: record.remark || null
                });
            }
        }
        
        log.system(`从CSV文件成功加载了 ${accounts.length} 个账户`, log.COLORS.GREEN);
        
        if (number !== null) {
            const accountMap = new Map();
            for (const account of accounts) {
                accountMap.set(account.num.toString(), account);
            }
            
            let targetNums = new Set();
            
            if (typeof number === 'number') {
                targetNums.add(number.toString());
            }
            else if (typeof number === 'string') {
                targetNums = parseNumberExpression(number);
            }
            else if (Array.isArray(number)) {
                for (const num of number) {
                    if (typeof num === 'number') {
                        targetNums.add(num.toString());
                    } else if (typeof num === 'string') {
                        const parsed = parseNumberExpression(num);
                        parsed.forEach(n => targetNums.add(n));
                    }
                }
            }
            
            const result = [];
            const notFoundNums = [];
            
            targetNums.forEach(num => {
                const account = accountMap.get(num);
                if (account) {
                    result.push(account);
                } else {
                    notFoundNums.push(num);
                }
            });
            
            if (notFoundNums.length > 0) {
                log.system(`账户编号 ${notFoundNums.join(', ')} 未找到，请核对账户编号`, log.COLORS.YELLOW);
            }
            
            if (result.length === 0 && targetNums.size > 0) {
                log.system(`没有找到任何指定的账户编号，请检查输入是否正确`, log.COLORS.RED);
            } else if (result.length > 0) {
                log.system(`已找到 ${result.length} 个指定账户: ${result.map(acc => acc.num).join(', ')}`, log.COLORS.GREEN);
            }
            
            return result;
        }
        
        return accounts;
    } catch (e) {
        log.system(`读取账户文件时出错: ${e.message}`, log.COLORS.RED);
        return number ? [] : accounts;
    }
};

const parseNumberExpression = (expression) => {
    if (!expression || typeof expression !== 'string') {
        return new Set();
    }

    const result = new Set();
    const parts = expression.split(',');

    for (let part of parts) {
        part = part.trim();
        
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = start; i <= end; i++) {
                    result.add(i.toString());
                }
            }
        } 
        else {
            const num = parseInt(part, 10);
            if (!isNaN(num)) {
                result.add(num.toString());
            }
        }
    }

    return result;
};

function convertProxyFormat(proxyString) {
    if (!proxyString) return null;

    if (proxyString.includes('://') && proxyString.includes('@')) {
        return proxyString; 
    }
    
    const parts = proxyString.split(':');
    
    if (parts.length >= 4) {
        const host = parts[0];
        const port = parts[1];
        const username = parts[2];
        const password = parts[3];
        
        let protocol = 'http';
        if (parts.length >= 5 && parts[4]) {
            const protocolInput = parts[4].toLowerCase();
            
            // 处理各种可能的协议输入
            if (protocolInput === 'socks' || protocolInput === 'socks5') {
                protocol = 'socks';
            } else if (protocolInput === 'http' || protocolInput === 'https') {
                protocol = 'http';
            } else {
                protocol = 'http';
            }
        }
        return `${protocol}://${username}:${password}@${host}:${port}`;
    }
    return proxyString;
}

export {
    loadAccounts
};
