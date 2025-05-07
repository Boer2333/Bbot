import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 配置常量
const ACCOUNTS_FILE = path.join(__dirname, 'wallet.csv');

const loadAccounts = (customPath) => {
    const accounts = [];
    const filePath = customPath || ACCOUNTS_FILE;
    
    try {
        if (!fs.existsSync(filePath)) {
            console.error(`未找到账户文件 ${filePath}`);
            return accounts;
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });

        for (const record of records) {
            if (record.add) {
                accounts.push({
                    num: record.num,
                    add: record.add.toLowerCase(),
                    pk: record.pk || null,
                    proxy: record.proxy || null,
                    email: record.email || null,
                    twtoken: record.twtoken || null,
                    dctoken: record.dctoken || null,
                    invitecode: record.invitecode || null,
                    remark: record.remark || null
                });
            }
        }
        
        console.log(`从CSV文件成功加载了 ${accounts.length} 个账户`);
    } catch (e) {
        console.error(`读取账户文件时出错: ${e.message}`);
    }

    return accounts;
};

/**
 * 根据序号获取账户信息
 * @param {string|number} num 账户序号
 * @param {Array} accounts 账户数组
 * @returns {Object|null} 账户信息或null
 */
const getAccountByNum = (num, accounts) => {
    if (!num || !accounts || !accounts.length) return null;
    
    // 确保序号进行字符串比较
    const numStr = num.toString();
    return accounts.find(account => account.num.toString() === numStr) || null;
};

// 导出模块的函数
export {
    loadAccounts,
    getAccountByNum,
    ACCOUNTS_FILE
};