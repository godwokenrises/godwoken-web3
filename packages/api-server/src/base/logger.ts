function defaultLogger(level: string, ...messages: any[]) {
  console.log(`[${level}] `, ...messages);
}

export const logger = {
  debug: (...args: any[]) => defaultLogger("debug", ...args),
  info: (...args: any[]) => defaultLogger("info", ...args),
  warn: (...args: any[]) => defaultLogger("warn", ...args),
  error: (...args: any[]) => defaultLogger("error", ...args),
};
