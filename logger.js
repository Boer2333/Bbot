// logger.js 日志工具，美化日志
class Logger {
  constructor() {
    this.COLORS = {
      RED: '\x1b[31m',
      GREEN: '\x1b[32m',
      YELLOW: '\x1b[33m',
      BLUE: '\x1b[34m',
      CYAN: '\x1b[36m',
      WHITE: '\x1b[37m',
      GRAY: '\x1b[90m',
      RESET: '\x1b[0m'
    };
    
    this.SYMBOLS = {
      SUCCESS: '✅',
      ERROR: '❌',
      WARNING: '⚠️',
      INFO: 'ℹ️',
      SEARCH: '🔍',
      TIMER: '⏱️',
      START: '▶️',
      DONE: '🎉',
      SYSTEM: '🤖'  //系统模块日志的符号
    };
    
    this.EMOJI = {
      ROCKET: '🚀',
      STAR: '⭐',
      CHECK: '✅',
      CROSS: '❌',
      WARNING: '⚠️',
      INFO: 'ℹ️',
      SEARCH: '🔍',
      CLOCK: '⏱️',
      MONEY: '💰',
      FIRE: '🔥',
      LIGHT: '💡',
      TOOLS: '🛠️',
      KEY: '🔑',
      WATER: '💧',
      MEMO: '📝'
    };
  }

  colorText(text, color) {
    return `${color}${text}${this.COLORS.RESET}`;
  }
  
  success(message) {
    console.log(`${this.SYMBOLS.SUCCESS} ${this.colorText(message, this.COLORS.GREEN)}`);
  }
  
  error(message) {
    console.error(`${this.SYMBOLS.ERROR} ${this.colorText(message, this.COLORS.RED)}`);
  }
  
  warn(message) {
    console.warn(`${this.SYMBOLS.WARNING} ${this.colorText(message, this.COLORS.YELLOW)}`);
  }
  
  info(message) {
    console.log(`${this.SYMBOLS.INFO} ${this.colorText(message, this.COLORS.CYAN)}`);
  }
  
  start(message) {
    console.log(`${this.SYMBOLS.START} ${this.colorText(message, this.COLORS.BLUE)}`);
  }
  
  done(message) {
    console.log(`${this.SYMBOLS.DONE} ${this.colorText(message, this.COLORS.GREEN)}`);
  }
  
  search(message) {
    console.log(`${this.SYMBOLS.SEARCH} ${this.colorText(message, this.COLORS.CYAN)}`);
  }
  
  timer(message) {
    console.log(`${this.SYMBOLS.TIMER} ${this.colorText(message, this.COLORS.GRAY)}`);
  }

  system(message, color = this.COLORS.CYAN) {
    console.log(`${this.SYMBOLS.SYSTEM} ${this.colorText(message, color)}`);
  }
  
  text(message, color = this.COLORS.WHITE) {
    console.log(this.colorText(message, color));
  }
  
  custom(symbol, message, color = this.COLORS.WHITE) {
    console.log(`${symbol} ${this.colorText(message, color)}`);
  }
  
  format(formatter, message, color = this.COLORS.WHITE) {
    console.log(formatter(message, color));
  }
}

const log = new Logger();

export default log;