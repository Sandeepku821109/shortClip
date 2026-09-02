export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, meta?: any) {
    console.log(JSON.stringify({
      level: 'info',
      context: this.context,
      message,
      meta,
      timestamp: new Date().toISOString(),
    }));
  }

  error(message: string, error?: any) {
    console.error(JSON.stringify({
      level: 'error',
      context: this.context,
      message,
      error: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    }));
  }

  warn(message: string, meta?: any) {
    console.warn(JSON.stringify({
      level: 'warn',
      context: this.context,
      message,
      meta,
      timestamp: new Date().toISOString(),
    }));
  }

  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify({
        level: 'debug',
        context: this.context,
        message,
        meta,
        timestamp: new Date().toISOString(),
      }));
    }
  }
}