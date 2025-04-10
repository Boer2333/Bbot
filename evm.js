import { ethers } from 'ethers';
import { createObjectCsvWriter } from 'csv-writer';

const generateWallets = async (count) => {
    const wallets = [];
    for (let i = 0; i < count; i++) {
        // 生成随机钱包
        const wallet = ethers.Wallet.createRandom();
        // 获取助记词
        const mnemonic = wallet.mnemonic.phrase;
        wallets.push({
            address: wallet.address,
            privateKey: wallet.privateKey,
            mnemonic: mnemonic,
        });
    }
    return wallets;
};

const saveToCSV = async (wallets) => {
    const csvWriter = createObjectCsvWriter({
        path: 'evm.csv',
        header: [
            { id: 'address', title: '地址' },
            { id: 'privateKey', title: '私钥' },
            { id: 'mnemonic', title: '助记词' }
        ]
    });

    await csvWriter.writeRecords(wallets);
    console.log('成功写入csv文件');
};

const main = async () => {
    try {
        const walletCount = 10; // 更改这个数字以生成不同数量的钱包
        const wallets = await generateWallets(walletCount);
        await saveToCSV(wallets);

        // 输出生成的地址和助记词到控制台
        wallets.forEach((wallet, index) => {
            console.log(`钱包 ${index + 1}:`);
            console.log(`  地址: ${wallet.address}`);
            console.log(`  助记词: ${wallet.mnemonic}`);
            console.log('---');
        });
    } catch (error) {
        console.error('An error occurred:', error);
    }
};

main();
