import { loadAccounts } from './acc.js';

async function runTasks({
  filePath = './wallet.csv',
  concurrency,
  processAccount,
  accountsArray = null
}) {
  // 1. 加载账户数据
  const accounts = accountsArray || loadAccounts(filePath);
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
      results.push({ account: account.num, error: error.message || '未知错误', status: '失败' });
      console.error(`\n❌ 账户 ${currentTaskIndex}/${accounts.length} 账户${account.num} 处理失败: ${error.message || '未知错误'}`);
      // 即使失败也不抛出异常，而是返回错误对象
      return { error: true, message: error.message || '未知错误' };
    }
  };

  async function processQueue() {
    // 首批任务启动，添加随机延迟
    const initialBatchSize = Math.min(concurrency, queue.length);
    
    for (let i = 0; i < initialBatchSize; i++) {
      const account = queue.shift();
      // 为每个初始任务添加1-3秒的随机延迟
      const delay = 1000 + Math.random() * 2000;
      
      const taskPromise = (async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, delay));
          console.log(`\n⏱️ 启动初始任务 ${i + 1}/${initialBatchSize}，延迟 ${delay.toFixed(0)}ms`);
          return await executeTask(account);
        } catch (error) {
          console.error(`任务执行过程中出现未捕获错误: ${error.message || '未知错误'}`);
          return { error: true, message: error.message || '未知错误' };
        }
      })();
      
      // 使用包装器函数来确保任务完成后从pendingTasks中移除
      const wrappedTask = taskPromise.then(
        result => {
          pendingTasks.delete(wrappedTask);
          return result;
        },
        error => {
          pendingTasks.delete(wrappedTask);
          console.error(`任务包装器中捕获错误: ${error.message || '未知错误'}`);
          return { error: true, message: error.message || '未知错误' };
        }
      );
      
      pendingTasks.add(wrappedTask);
    }
    
    // 后续任务处理
    while (queue.length > 0) {
      // 确保并发数量不超过限制
      if (pendingTasks.size >= concurrency) {
        try {
          // 等待至少一个任务完成，使用Promise.race的更安全方法
          await Promise.race(Array.from(pendingTasks).map(p => 
            p.catch(e => {
              console.error(`Promise.race 捕获错误: ${e.message || '未知错误'}`);
              return { error: true, message: e.message || '未知错误' };
            })
          ));
        } catch (error) {
          console.error(`等待任务完成时出错: ${error.message || '未知错误'}`);
          // 继续下一次循环
          continue;
        }
      }
      
      // 取出一个账户
      const account = queue.shift();
      
      // 创建并执行任务
      const taskPromise = executeTask(account);
      
      // 使用包装器函数来确保任务完成后从pendingTasks中移除
      const wrappedTask = taskPromise.then(
        result => {
          pendingTasks.delete(wrappedTask);
          return result;
        },
        error => {
          pendingTasks.delete(wrappedTask);
          console.error(`任务包装器中捕获错误: ${error.message || '未知错误'}`);
          return { error: true, message: error.message || '未知错误' };
        }
      );
      
      pendingTasks.add(wrappedTask);
    }
    
    // 等待所有剩余的任务完成
    if (pendingTasks.size > 0) {
      try {
        // 使用Promise.allSettled确保所有任务都完成，无论成功或失败
        await Promise.allSettled(pendingTasks);
      } catch (error) {
        console.error(`等待所有任务完成时出错: ${error.message || '未知错误'}`);
      }
    }
  }

  try {
    await processQueue();
  } catch (error) {
    console.error(`整体任务队列处理出错: ${error.message || '未知错误'}`);
  }

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
