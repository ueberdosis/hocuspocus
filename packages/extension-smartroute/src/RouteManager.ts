import { EventEmitter } from 'node:events';
import type { RedisInstance } from '@hocuspocus/extension-redis';
import type { Node } from './ConsistentHash.ts';
import { ConsistentHash } from './ConsistentHash.ts';
import { HealthChecker, type HealthCheckOptions, type HealthCheckResult } from './HealthChecker.ts';

export interface RouteManagerOptions {
  /** Redis instance for cluster state synchronization */
  redis?: RedisInstance;
  /** Redis key prefix */
  redisPrefix?: string;
  /** Current node information */
  currentNode: Node;
  /** Health check options */
  healthCheck?: HealthCheckOptions;
  /** Route table sync interval (ms) */
  syncInterval?: number;
  /** Document migration timeout (ms) */
  migrationTimeout?: number;
}

export interface DocumentRoute {
  nodeId: string;
  documentId: string;
  lastAccessed: number;
  migrating?: {
    fromNodeId: string;
    toNodeId: string;
    startTime: number;
    timeout: number;
  };
}

/**
 * Smart route manager
 * Handles document routing decisions, node health monitoring, dynamic migration, etc.
 */
export class RouteManager extends EventEmitter {
  private consistentHash: ConsistentHash;
  private healthChecker: HealthChecker;
  private documentRoutes = new Map<string, DocumentRoute>();
  private syncTimer?: NodeJS.Timeout;
  private options: Required<RouteManagerOptions>;

  constructor(options: RouteManagerOptions) {
    super();
    
    this.options = {
      redisPrefix: 'hocuspocus:smartroute',
      syncInterval: 30000, // 30 seconds
      migrationTimeout: 60000, // 60 seconds
      ...options,
    } as Required<RouteManagerOptions>;

    this.consistentHash = new ConsistentHash();
    this.healthChecker = new HealthChecker(this.options.healthCheck);
    
    // Add current node to hash ring
    this.consistentHash.addNode(this.options.currentNode);
    
    this.setupEventListeners();
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen to health check results
    this.healthChecker.on('healthCheck', (result: HealthCheckResult) => {
      this.handleHealthCheckResult(result);
    });

    // Listen to node failures
    this.healthChecker.on('nodeFailed', (node: Node) => {
      this.handleNodeFailure(node);
    });

    // Listen to node recovery
    this.healthChecker.on('nodeRecovered', (node: Node) => {
      this.handleNodeRecovery(node);
    });
  }

  /**
   * Add node
   */
  async addNode(node: Node): Promise<void> {
    this.consistentHash.addNode(node);
    this.healthChecker.startMonitoring(node);

    // Sync to Redis
    if (this.options.redis) {
      await this.syncNodeToRedis(node);
    }

    this.emit('nodeAdded', node);
  }

  /**
   * Remove node
   */
  async removeNode(nodeId: string): Promise<void> {
    const node = this.consistentHash.getNodeInfo(nodeId);
    if (!node) return;

    this.consistentHash.removeNode(nodeId);
    this.healthChecker.stopMonitoring(nodeId);

    // Handle affected documents
    await this.handleNodeRemoval(nodeId);

    // Remove from Redis
    if (this.options.redis) {
      await this.removeNodeFromRedis(nodeId);
    }

    this.emit('nodeRemoved', { nodeId, node });
  }

  /**
   * Get node that document should route to
   */
  getDocumentNode(documentId: string): Node | null {
    // First check if there's an explicit route record
    const route = this.documentRoutes.get(documentId);
    if (route && !route.migrating) {
      const node = this.consistentHash.getNodeInfo(route.nodeId);
      if (node?.isHealthy) {
        // Update access time
        route.lastAccessed = Date.now();
        return node;
      }
      // If specified node is unhealthy, remove route record
      this.documentRoutes.delete(documentId);
    }

    // Use consistent hash to calculate route
    const node = this.consistentHash.getNode(documentId);
    if (node) {
      // Record route
      this.setDocumentRoute(documentId, node.id);
    }

    return node;
  }

  /**
   * Set document route
   */
  setDocumentRoute(documentId: string, nodeId: string): void {
    this.documentRoutes.set(documentId, {
      documentId,
      nodeId,
      lastAccessed: Date.now(),
    });
  }

  /**
   * Check if document should be handled by current node
   */
  shouldHandleDocument(documentId: string): boolean {
    const targetNode = this.getDocumentNode(documentId);
    return targetNode?.id === this.options.currentNode.id;
  }

  /**
   * Start document migration
   */
  async startDocumentMigration(
    documentId: string, 
    fromNodeId: string, 
    toNodeId: string
  ): Promise<void> {
    const route = this.documentRoutes.get(documentId);
    if (!route) {
      this.setDocumentRoute(documentId, fromNodeId);
    }

    // Set migration lock
    this.documentRoutes.set(documentId, {
      documentId,
      nodeId: fromNodeId,
      lastAccessed: Date.now(),
      migrating: {
        fromNodeId,
        toNodeId,
        startTime: Date.now(),
        timeout: this.options.migrationTimeout,
      },
    });

    // Sync to Redis
    if (this.options.redis) {
      await this.syncDocumentRouteToRedis(documentId);
    }

    this.emit('migrationStarted', { documentId, fromNodeId, toNodeId });
  }

  /**
   * Complete document migration
   */
  async completeDocumentMigration(documentId: string, success: boolean): Promise<void> {
    const route = this.documentRoutes.get(documentId);
    if (route?.migrating) {
      if (success) {
        // Remove migration lock, update route
        const newRoute = {
          documentId,
          nodeId: route.migrating.toNodeId,
          lastAccessed: Date.now(),
        };
        this.documentRoutes.set(documentId, newRoute);
        
        // Sync to Redis
        if (this.options.redis) {
          await this.syncDocumentRouteToRedis(documentId);
        }
      } else {
        // Migration failed, rollback
        this.documentRoutes.delete(documentId);
      }
    }

    this.emit('migrationCompleted', { documentId, success });
  }

  /**
   * Handle health check result
   */
  private handleHealthCheckResult(result: HealthCheckResult): void {
    if (result.isHealthy) {
      this.consistentHash.markNodeHealthy(result.nodeId);
    } else {
      this.consistentHash.markNodeUnhealthy(result.nodeId);
    }

    this.emit('healthCheckResult', result);
  }

  /**
   * Handle node failure
   */
  private handleNodeFailure(node: Node): void {
    this.consistentHash.markNodeUnhealthy(node.id);

    // Find documents that need migration
    const affectedDocuments: string[] = [];
    for (const [documentId, route] of this.documentRoutes) {
      if (route.nodeId === node.id && !route.migrating) {
        affectedDocuments.push(documentId);
      }
    }

    // Start migration process
    for (const documentId of affectedDocuments) {
      const newNode = this.consistentHash.getNode(documentId);
      if (newNode && newNode.id !== node.id) {
        this.startDocumentMigration(documentId, node.id, newNode.id).catch(error => {
          this.emit('error', error);
        });
      }
    }

    this.emit('nodeFailed', { node, affectedDocuments });
  }

  /**
   * Handle node recovery
   */
  private handleNodeRecovery(node: Node): void {
    this.consistentHash.markNodeHealthy(node.id);
    this.emit('nodeRecovered', node);
  }

  /**
   * Handle node removal
   */
  private async handleNodeRemoval(nodeId: string): Promise<void> {
    // Find documents that need redistribution
    const affectedDocuments: string[] = [];
    
    for (const [documentId, route] of this.documentRoutes) {
      if (route.nodeId === nodeId) {
        affectedDocuments.push(documentId);
      }
    }

    // Redistribute documents
    for (const documentId of affectedDocuments) {
      const newNode = this.consistentHash.getNode(documentId);
      if (newNode) {
        await this.startDocumentMigration(documentId, nodeId, newNode.id);
      } else {
        // No available nodes, remove route
        this.documentRoutes.delete(documentId);
      }
    }
  }

  /**
   * Start route synchronization
   */
  startSync(): void {
    if (!this.options.redis || this.syncTimer) return;

    // Initial sync
    this.syncFromRedis().catch(error => {
      this.emit('error', error);
    });

    // Set up periodic sync and cleanup
    this.syncTimer = setInterval(() => {
      this.syncFromRedis().catch(error => {
        this.emit('error', error);
      });
      
      // Clean up expired migrations
      this.cleanupExpiredMigrations();
    }, this.options.syncInterval);
  }

  /**
   * Stop route synchronization
   */
  stopSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  /**
   * Sync node information to Redis
   */
  private async syncNodeToRedis(node: Node): Promise<void> {
    if (!this.options.redis) return;
    
    const key = `${this.options.redisPrefix}:nodes:${node.id}`;
    await this.options.redis.setex(key, 300, JSON.stringify(node));
  }

  /**
   * Remove node from Redis
   */
  private async removeNodeFromRedis(nodeId: string): Promise<void> {
    if (!this.options.redis) return;
    
    const key = `${this.options.redisPrefix}:nodes:${nodeId}`;
    await this.options.redis.del(key);
  }

  /**
   * Sync document route to Redis
   */
  private async syncDocumentRouteToRedis(documentId: string): Promise<void> {
    if (!this.options.redis) return;
    
    const route = this.documentRoutes.get(documentId);
    if (!route) return;
    
    const key = `${this.options.redisPrefix}:routes:${documentId}`;
    await this.options.redis.setex(key, 300, JSON.stringify(route)); // 5 minute expiry
  }

  /**
   * Sync routing information from Redis
   */
  private async syncFromRedis(): Promise<void> {
    if (!this.options.redis) return;

    // Sync node information
    const nodeKeys = await this.options.redis.keys(`${this.options.redisPrefix}:nodes:*`);
    for (const key of nodeKeys) {
      try {
        const nodeData = await this.options.redis.get(key);
        if (nodeData) {
          const node: Node = JSON.parse(nodeData);
          if (!this.consistentHash.getNodeInfo(node.id)) {
            this.consistentHash.addNode(node);
          }
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }
  }

  /**
   * Clean up expired migration locks
   */
  private cleanupExpiredMigrations(): void {
    const now = Date.now();
    const expiredMigrations: string[] = [];

    for (const [documentId, route] of this.documentRoutes) {
      if (route.migrating) {
        const elapsed = now - route.migrating.startTime;
        if (elapsed > route.migrating.timeout) {
          expiredMigrations.push(documentId);
        }
      }
    }

    for (const documentId of expiredMigrations) {
      const route = this.documentRoutes.get(documentId);
      if (route?.migrating) {
        // Migration timeout, rollback to original node or choose new node
        const originalNode = this.consistentHash.getNodeInfo(route.migrating.fromNodeId);
        if (originalNode?.isHealthy) {
          // Rollback to original node
          this.documentRoutes.set(documentId, {
            documentId,
            nodeId: route.migrating.fromNodeId,
            lastAccessed: Date.now(),
          });
        } else {
          // Choose new node
          const newNode = this.consistentHash.getNode(documentId);
          if (newNode) {
            this.setDocumentRoute(documentId, newNode.id);
          } else {
            this.documentRoutes.delete(documentId);
          }
        }
      }
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    const allNodes = this.consistentHash.getAllNodes();
    const healthyNodes = this.consistentHash.getHealthyNodes();
    
    return {
      totalNodes: allNodes.length,
      healthyNodes: healthyNodes.length,
      unhealthyNodes: allNodes.length - healthyNodes.length,
      totalDocuments: this.documentRoutes.size,
      migrating: Array.from(this.documentRoutes.values()).filter(r => r.migrating).length,
      nodes: allNodes.map(node => ({
        id: node.id,
        address: node.address,
        port: node.port,
        isHealthy: node.isHealthy,
        weight: node.weight,
        lastHealthCheck: node.lastHealthCheck,
      })),
    };
  }

  /**
   * Get healthy nodes
   */
  getHealthyNodes(): Node[] {
    return this.consistentHash.getHealthyNodes();
  }

  /**
   * Graceful shutdown
   */
  shutdown(): void {
    this.stopSync();
    this.healthChecker.shutdown();
    this.removeAllListeners();
  }
}