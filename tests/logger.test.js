import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger, Logger, LogLevel } from '../src/utils/logger.js';

describe('Logger', () => {
  let consoleLogSpy, consoleWarnSpy, consoleErrorSpy;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Reset to default level for each test
    Logger.setLevel(LogLevel.WARN);
  });

  it('should respect log levels', () => {
    Logger.setLevel(LogLevel.ERROR);
    
    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');
    
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith('[QuoteApp] ERROR:', 'error message');
  });

  it('should log warn and error at WARN level', () => {
    Logger.setLevel(LogLevel.WARN);
    
    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');
    
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith('[QuoteApp] WARN:', 'warn message');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[QuoteApp] ERROR:', 'error message');
  });

  it('should log all messages at DEBUG level', () => {
    Logger.setLevel(LogLevel.DEBUG);
    
    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');
    
    expect(consoleLogSpy).toHaveBeenCalledWith('[QuoteApp] DEBUG:', 'debug message');
    expect(consoleLogSpy).toHaveBeenCalledWith('[QuoteApp] INFO:', 'info message');
    expect(consoleWarnSpy).toHaveBeenCalledWith('[QuoteApp] WARN:', 'warn message');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[QuoteApp] ERROR:', 'error message');
  });

  it('should not log anything at NONE level', () => {
    Logger.setLevel(LogLevel.NONE);
    
    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');
    
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should allow creating named loggers', () => {
    const testLogger = new Logger('TestModule');
    Logger.setLevel(LogLevel.DEBUG);
    
    testLogger.info('test message');
    
    expect(consoleLogSpy).toHaveBeenCalledWith('[TestModule] INFO:', 'test message');
  });
});