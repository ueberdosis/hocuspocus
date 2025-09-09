import { EventEmitter } from 'node:events';
import { createConnection } from 'node:net';
import type { Node } from './ConsistentHash.ts';

export interface HealthCheckOptions {
  interval?: number; // Health check interval (ms)
  timeout?: number; // Health check timeout (ms)
  retries?: number; // Number of retries
  backoffMultiplier?: number; // Backoff multiplier
  maxBackoff?: number; // Maximum backoff time
}

export interface HealthCheckResult {
  nodeId: string;
  isHealthy: boolean;
  responseTime?: number;
  error?: string;
}

/**
 * Node health checker
 * Supports automatic failure detection, auto recovery, backoff retry strategies
 */
export class HealthChecker extends EventEmitter {
  private options: Required<HealthCheckOptions>;
  private timers = new Map<string, NodeJS.Timeout>();
  private backoffTimers = new Map<string, number>(); // Store current backoff time for each node
  private retryCounters = new Map<string, number>(); // Store retry count for each node

  constructor(options: HealthCheckOptions = {}) {
    super();
    this.options = {
      interval: 5000,
      timeout: 3000,
      retries: 3,
      backoffMultiplier: 2,
      maxBackoff: 30000,
      ...options,
    };
  }

  /**
   * Start monitoring node health
   */
  startMonitoring(node: Node): void {
    if (this.timers.has(node.id)) {
      this.stopMonitoring(node.id);
    }

    // Reset node state
    this.backoffTimers.delete(node.id);
    this.retryCounters.delete(node.id);

    // Execute health check immediately
    this.performHealthCheck(node);

    // Set up periodic checks
    const timer = setInterval(() => {
      this.performHealthCheck(node);
    }, this.options.interval);

    this.timers.set(node.id, timer);
  }

  /**
   * Stop monitoring node
   */
  stopMonitoring(nodeId: string): void {
    const timer = this.timers.get(nodeId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(nodeId);
    }

    this.backoffTimers.delete(nodeId);
    this.retryCounters.delete(nodeId);
  }

  /**
   * Perform single health check
   */
  private async performHealthCheck(node: Node): Promise<void> {
    const startTime = Date.now();
    
    try {
      const result = await Promise.race([
        this.performHealthCheckInternal(node),
        new Promise<boolean>((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), this.options.timeout);
        })
      ]);

      const responseTime = Date.now() - startTime;
      
      if (result) {
        this.handleHealthyNode(node, responseTime);
      } else {
        this.handleUnhealthyNode(node, 'Health check failed');
      }
    } catch (error) {
      this.handleUnhealthyNode(node, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Perform actual health check (can be overridden by subclasses)
   */
  protected async performHealthCheckInternal(node: Node): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Health check timeout'));
      }, this.options.timeout);

      this.pingNode(node).then(resolve).catch(reject).finally(() => {
        clearTimeout(timeout);
      });
    });
  }

  /**
   * Ping node (example implementation)
   */
  private async pingNode(node: Node): Promise<boolean> {
    // Can implement specific ping logic here
    // e.g., HTTP GET /health, WebSocket ping, TCP connection test, etc.
    
    try {
      // Simulate network request
      const isReachable = await this.tcpPing(node.address, node.port);
      return isReachable;
    } catch (error) {
      // If no HTTP health endpoint, try other methods
      return false;
    }
  }

  /**
   * TCP connection test
   */
  private tcpPing(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = createConnection({ host, port, timeout: this.options.timeout }, () => {
        socket.end();
        resolve(true);
      });

      socket.on('error', () => {
        resolve(false);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Handle healthy node
   */
  private handleHealthyNode(node: Node, responseTime: number): void {
    const wasUnhealthy = !node.isHealthy;
    
    // Reset retry-related state
    this.retryCounters.delete(node.id);
    this.backoffTimers.delete(node.id);

    const result: HealthCheckResult = {
      nodeId: node.id,
      isHealthy: true,
      responseTime,
    };

    this.emit('healthCheck', result);

    // If node recovered from unhealthy state, trigger recovery event
    if (wasUnhealthy) {
      this.emit('nodeRecovered', node);
    }
  }

  /**
   * Handle unhealthy node
   */
  private handleUnhealthyNode(node: Node, error: string): void {
    const result: HealthCheckResult = {
      nodeId: node.id,
      isHealthy: false,
      error,
    };

    this.emit('healthCheck', result);

    // Increment retry count
    const retryCount = (this.retryCounters.get(node.id) || 0) + 1;
    this.retryCounters.set(node.id, retryCount);

    // If exceeded retry count, mark as unhealthy
    if (retryCount >= this.options.retries) {
      if (node.isHealthy) {
        this.emit('nodeFailed', node);
      }

      // Apply backoff strategy
      const currentBackoff = this.backoffTimers.get(node.id) || this.options.interval;
      const newBackoff = Math.min(
        currentBackoff * this.options.backoffMultiplier,
        this.options.maxBackoff
      );
      this.backoffTimers.set(node.id, newBackoff);

      // Reschedule next check
      this.rescheduleHealthCheck(node, newBackoff);
    }
  }

  /**
   * Reschedule health check
   */
  private rescheduleHealthCheck(node: Node, delay: number): void {
    // Clear existing timer
    const existingTimer = this.timers.get(node.id);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    // Create new timer with backoff delay
    const timer = setTimeout(() => {
      // After backoff, resume normal interval
      const regularTimer = setInterval(() => {
        this.performHealthCheck(node);
      }, this.options.interval);
      this.timers.set(node.id, regularTimer);
      
      // Perform immediate check
      this.performHealthCheck(node);
    }, delay);

    // Store timeout temporarily for cleanup
    this.timers.set(node.id, timer);
  }

  /**
   * Check all nodes immediately
   */
  async checkAllNodes(nodes: Node[]): Promise<HealthCheckResult[]> {
    const promises = nodes.map(async (node) => {
      const startTime = Date.now();
      
      try {
        const result = await Promise.race([
          this.performHealthCheckInternal(node),
          new Promise<boolean>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), this.options.timeout);
          })
        ]);

        return {
          nodeId: node.id,
          isHealthy: result,
          responseTime: Date.now() - startTime,
        };
      } catch (error) {
        return {
          nodeId: node.id,
          isHealthy: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Graceful shutdown
   */
  shutdown(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
    this.backoffTimers.clear();
    this.retryCounters.clear();
    this.removeAllListeners();
  }
}