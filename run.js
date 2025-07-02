import { loadAccounts } from './acc.js';
import readline from 'readline';
import log from './logger.js';

async function runTasks({
  filePath = '../wallet.csv',
  concurrency,
  processAccount,
  accountsArray = null,
  interactive = false
}) {
  let accountFilter = null;
  if (interactive) {
    log.system('进入账户选择模式', log.COLORS.CYAN);
    accountFilter = await selectAccountsInteractive();
  }

  const accounts = accountsArray || loadAccounts(filePath, accountFilter);
  if (!accounts || accounts.length === 0) {
    log.system('未找到任何账户，任务终止。', log.COLORS.RED);
    return;
  }

  log.system(`将处理 ${accounts.length} 个账户}`, log.COLORS.CYAN);

  const queue = shuffleArray([...accounts]);
  const results = []; 
  let taskIndex = 0; 
  
  const pendingTasks = new Set();

  const executeTask = async (account) => {
    const currentTaskIndex = ++taskIndex; 
    try {
      log.system(`开始处理账户 ${currentTaskIndex}/${accounts.length}: ${account.num}`, log.COLORS.BLUE);
      const result = await processAccount(account);
      results.push({ account: account.num, result, status: '成功' });
      log.system(`账户 ${currentTaskIndex}/${accounts.length} 账户${account.num} 处理成功`, log.COLORS.GREEN);
      return result;
    } catch (error) {
      results.push({ account: account.num, error: error.message || '未知错误', status: '失败' });
      log.system(`账户 ${currentTaskIndex}/${accounts.length} 账户${account.num} 处理失败: ${error.message || '未知错误'}`, log.COLORS.RED);
      return { error: true, message: error.message || '未知错误' };
    }
  };

  async function processQueue() {
    const initialBatchSize = Math.min(concurrency, queue.length);
    
    for (let i = 0; i < initialBatchSize; i++) {
      const account = queue.shift();
      const delay = 1000 + Math.random() * 4000;
      
      const taskPromise = (async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, delay));
          log.system(`启动初始任务 ${i + 1}/${initialBatchSize}，延迟 ${delay.toFixed(0)}ms`, log.COLORS.GRAY);
          return await executeTask(account);
        } catch (error) {
          log.system(`任务执行过程中出现未捕获错误: ${error.message || '未知错误'}`, log.COLORS.RED);
          return { error: true, message: error.message || '未知错误' };
        }
      })();
      
      const wrappedTask = taskPromise.then(
        result => {
          pendingTasks.delete(wrappedTask);
          return result;
        },
        error => {
          pendingTasks.delete(wrappedTask);
          log.system(`任务包装器中捕获错误: ${error.message || '未知错误'}`, log.COLORS.RED);
          return { error: true, message: error.message || '未知错误' };
        }
      );
      
      pendingTasks.add(wrappedTask);
    }
    
    while (queue.length > 0) {
      if (pendingTasks.size >= concurrency) {
        try {
          await Promise.race(Array.from(pendingTasks).map(p => 
            p.catch(e => {
              log.system(`Promise.race 捕获错误: ${e.message || '未知错误'}`, log.COLORS.RED);
              return { error: true, message: e.message || '未知错误' };
            })
          ));
        } catch (error) {
          log.system(`等待任务完成时出错: ${error.message || '未知错误'}`, log.COLORS.RED);
          continue;
        }
      }

      const account = queue.shift();
      
      const taskPromise = executeTask(account);
      
      const wrappedTask = taskPromise.then(
        result => {
          pendingTasks.delete(wrappedTask);
          return result;
        },
        error => {
          pendingTasks.delete(wrappedTask);
          log.system(`任务包装器中捕获错误: ${error.message || '未知错误'}`, log.COLORS.RED);
          return { error: true, message: error.message || '未知错误' };
        }
      );
      
      pendingTasks.add(wrappedTask);
    }
    
    if (pendingTasks.size > 0) {
      try {
        await Promise.allSettled(pendingTasks);
      } catch (error) {
        log.system(`等待所有任务完成时出错: ${error.message || '未知错误'}`, log.COLORS.RED);
      }
    }
  }

  try {
    await processQueue();
  } catch (error) {
    log.system(`整体任务队列处理出错: ${error.message || '未知错误'}`, log.COLORS.RED);
  }

  log.system('所有任务执行完毕', log.COLORS.GREEN);
  
  // 添加失败账户统计功能
  try {
    // 提取失败账户
    const failedAccounts = results
      .filter(r => {
        // 检查顶层状态
        if (r.status === '失败') return true;
        
        // 检查result对象中的状态（适配不同业务脚本的结果格式）
        if (r.result) {
          if (typeof r.result === 'object') {
            // 对象格式，检查常见的状态字段
            if (r.result.status === "失败" || r.result.status === "failed" || 
                r.result.success === false || r.result.error) {
              return true;
            }
          }
        }
        
        return false;
      })
      .map(r => r.account);
    
    // 获取成功账户
    const successAccounts = results
      .filter(r => !failedAccounts.includes(r.account))
      .map(r => r.account);
    
    // 输出统计信息
    const totalAccounts = accounts.length;
    const successCount = successAccounts.length;
    const failedCount = failedAccounts.length;
    
    log.system('=== 任务执行统计 ===', log.COLORS.CYAN);
    log.system(`总账户数: ${totalAccounts}`, log.COLORS.BLUE);
    log.system(`成功数量: ${successCount} (${Math.round(successCount/totalAccounts*100)}%)`, log.COLORS.GREEN);
    log.system(`失败数量: ${failedCount} (${Math.round(failedCount/totalAccounts*100)}%)`, 
      failedCount > 0 ? log.COLORS.RED : log.COLORS.GREEN);
    
    if (failedCount > 0) {
      const formattedFailed = formatFailedAccounts(failedAccounts);
      log.system(`失败账户编号: ${formattedFailed}`, log.COLORS.RED);
    }
    
    log.system('===================', log.COLORS.CYAN);
  } catch (error) {
    log.system(`生成结果统计时出错: ${error.message}`, log.COLORS.RED);
  }
  
  return results;
}

function selectAccountsInteractive() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(`${log.SYMBOLS.SYSTEM} ${log.colorText('选择账户编号 (例如: 1,3,5-8) : ', log.COLORS.WHITE)}`, (input) => {
      rl.close();
      resolve(input.trim() || null);
    });
  });
}

function hasSelectModeFlag() {
  const args = process.argv.slice(2);
  return args.includes('-s') || args.includes('--select');
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function formatFailedAccounts(failedAccounts) {
  if (!failedAccounts || failedAccounts.length === 0) {
    return "无";
  }
  
  const sortedAccounts = [...failedAccounts].sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    return numA - numB;
  });
  
  const ranges = [];
  let rangeStart = sortedAccounts[0];
  let prev = sortedAccounts[0];
  
  for (let i = 1; i < sortedAccounts.length; i++) {
    const current = sortedAccounts[i];
    if (parseInt(current) - parseInt(prev) === 1) {
      prev = current;
    } else {
      if (rangeStart === prev) {
        ranges.push(rangeStart);
      } else {
        ranges.push(`${rangeStart}-${prev}`);
      }
      rangeStart = current;
      prev = current;
    }
  }
  
  if (rangeStart === prev) {
    ranges.push(rangeStart);
  } else {
    ranges.push(`${rangeStart}-${prev}`);
  }
  
  return ranges.join(', ');
}

export { runTasks, hasSelectModeFlag, formatFailedAccounts };
