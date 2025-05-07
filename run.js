import { loadAccounts } from './acc.js';

async function runTasks({
  filePath = './wallet.csv',
  concurrency,
  processAccount
}) {
  // 1. 加载账户数据
  const accounts = loadAccounts(filePath);
  if (!accounts || accounts.length === 0) {
    console.error('❌ 未找到任何账户，任务终止。');
    return;
  }

  // 2. 创建账户队列并打乱顺序
  const queue = shuffleArray([...accounts]);
  const results = []; // 存储任务结果
  let taskIndex = 0; // 任务索引，用于日志记录
  
  // 使用Promise控制并发
  const pendingTasks = new Set();

  const executeTask = async (account) => {
    const currentTaskIndex = ++taskIndex; // 记录当前任务序号
    try {
      console.log(`\n🚀 开始处理账户 ${currentTaskIndex}/${accounts.length}: ${account.num}`);
      const result = await processAccount(account);
      results.push({ account: account.num, result, status: '成功' });
      console.log(`\n✅ 账户 ${currentTaskIndex}/${accounts.length} 账户${account.num} 处理成功`);
      return result;
    } catch (error) {
      results.push({ account: account.num, error: error.message, status: '失败' });
      console.error(`\n❌ 账户 ${currentTaskIndex}/${accounts.length} 账户${account.num} 处理失败: ${error.message}`);
      throw error;
    }
  };

  async function processQueue() {
    // 首批任务启动，添加随机延迟
    const initialBatchSize = Math.min(concurrency, queue.length);
    const initialTasks = [];
    
    for (let i = 0; i < initialBatchSize; i++) {
      const account = queue.shift();
      // 为每个初始任务添加1-3秒的随机延迟
      const delay = 1000 + Math.random() * 2000;
      
      const task = (async () => {
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`\n⏱️ 启动初始任务 ${i + 1}/${initialBatchSize}，延迟 ${delay.toFixed(0)}ms`);
        return executeTask(account);
      })().finally(() => {
        pendingTasks.delete(task);
      });
      
      pendingTasks.add(task);
      initialTasks.push(task);
    }
    
    // 后续任务处理
    while (queue.length > 0) {
      // 确保并发数量不超过限制
      if (pendingTasks.size >= concurrency) {
        // 等待至少一个任务完成
        await Promise.race(pendingTasks);
      }
      
      // 取出一个账户
      const account = queue.shift();
      
      // 创建并执行任务
      const task = executeTask(account)
        .finally(() => {
          pendingTasks.delete(task);
        });
      
      pendingTasks.add(task);
    }
    
    // 等待所有剩余的任务完成
    if (pendingTasks.size > 0) {
      await Promise.all(pendingTasks);
    }
  }

  await processQueue();

  console.log('\n🎉 所有任务执行完毕');
  return results;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 导出模块
export { runTasks };