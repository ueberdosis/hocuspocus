import type {
  Extension,
  onConnectPayload,
  onDisconnectPayload,
  onLoadDocumentPayload,
  onConfigurePayload,
} from '@hocuspocus/server';
import { v4 as uuid } from 'uuid';
import type { Node } from './ConsistentHash.ts';
import { RouteManager, type RouteManagerOptions } from './RouteManager.ts';

export interface SmartRouteConfiguration extends Partial<RouteManagerOptions> {
  /** Unique identifier for current node */
  nodeId?: string;
  /** Current node address */
  nodeAddress?: string;
  /** Current node port */
  nodePort?: number;
  /** Node weight */
  nodeWeight?: number;
  /** Enable automatic cluster node discovery */
  autoDiscovery?: boolean;
  /** Cluster node list (if not using auto discovery) */
  clusterNodes?: Array<Omit<Node, 'isHealthy' | 'lastHealthCheck'>>;
  /** Enable strict routing checks (reject requests for documents not belonging to current node) */
  enforceRouting?: boolean;
  /** Redirect behavior on routing errors */
  redirectOnMisroute?: boolean;
  /** Custom routing decision function */
  customRoutingFunction?: (documentId: string, availableNodes: Node[]) => Node | null;
}

/**
 * Smart routing extension
 * Shard-based routing using consistent hashing, ensuring documents always route to the same node
 * Avoids distributed lock competition and provides highly available document routing strategy
 */
export class SmartRoute implements Extension {
  priority = 2000; // High priority, execute before other extensions

  configuration: SmartRouteConfiguration;

  private routeManager!: RouteManager;
  private currentNode: Node;
  private isInitialized = false;

  constructor(configuration: SmartRouteConfiguration = {}) {
    this.configuration = {
      nodeId: configuration.nodeId || `node-${uuid()}`,
      nodeAddress: configuration.nodeAddress || '127.0.0.1',
      nodePort: configuration.nodePort || 80,
      nodeWeight: configuration.nodeWeight || 1,
      autoDiscovery: configuration.autoDiscovery ?? true,
      enforceRouting: configuration.enforceRouting ?? true,
      redirectOnMisroute: configuration.redirectOnMisroute ?? false,
      redisPrefix: configuration.redisPrefix || 'hocuspocus:smartroute',
      syncInterval: configuration.syncInterval || 30000,
      migrationTimeout: configuration.migrationTimeout || 60000,
      ...configuration,
    } as SmartRouteConfiguration;

    this.currentNode = {
      id: this.configuration.nodeId || `node-${Date.now()}`,
      address: this.configuration.nodeAddress || '127.0.0.1',
      port: this.configuration.nodePort || 80,
      weight: this.configuration.nodeWeight || 1,
      isHealthy: true,
      lastHealthCheck: Date.now(),
    };
  }

  /**
   * Extension configuration hook
   */
  async onConfigure(_payload: onConfigurePayload): Promise<void> {
    if (this.isInitialized) return;

    // Initialize route manager
    this.routeManager = new RouteManager({
      ...this.configuration,
      currentNode: this.currentNode,
    });

    // Add cluster nodes
    if (this.configuration.clusterNodes) {
      for (const nodeConfig of this.configuration.clusterNodes) {
        const node: Node = {
          ...nodeConfig,
          isHealthy: true,
          lastHealthCheck: Date.now(),
        };
        await this.routeManager.addNode(node);
      }
    }

    // Set up event listeners
    this.setupEventListeners();

    // Start synchronization
    if (this.configuration.redis) {
      this.routeManager.startSync();
    }

    this.isInitialized = true;
  }

  /**
   * Connection establishment hook - routing check
   */
  async onConnect({ documentName }: onConnectPayload): Promise<void> {
    if (!this.configuration.enforceRouting) {
      return; // If routing not enforced, allow all connections
    }

    const shouldHandle = this.routeManager.shouldHandleDocument(documentName);
    
    if (!shouldHandle) {
      const targetNode = this.routeManager.getDocumentNode(documentName);
      
      if (this.configuration.redirectOnMisroute && targetNode) {
        // Send redirect information to client
        // Send redirect information (if client supports it)
        // Note: In actual implementation, redirect info needs to be sent via WebSocket message
        throw new Error(`Redirect to ${targetNode.address}:${targetNode.port}`);
      }
      // Reject connection
      throw new Error(`Document ${documentName} should be handled by node ${targetNode?.id}`);
    }

    // Record document access
    this.routeManager.setDocumentRoute(documentName, this.currentNode.id);
  }

  /**
   * Document load hook - routing verification and migration check
   */
  async onLoadDocument({ documentName }: onLoadDocumentPayload): Promise<void> {
    // Check if document should be on current node
    const shouldHandle = this.routeManager.shouldHandleDocument(documentName);
    
    if (!shouldHandle && this.configuration.enforceRouting) {
      const targetNode = this.routeManager.getDocumentNode(documentName);
      throw new Error(`Document ${documentName} should be handled by node ${targetNode?.id}`);
    }

    // If using custom routing function, perform additional checks
    if (this.configuration.customRoutingFunction) {
      const availableNodes = this.routeManager.getHealthyNodes();
      const customTargetNode = this.configuration.customRoutingFunction(documentName, availableNodes);
      
      if (customTargetNode && customTargetNode.id !== this.currentNode.id && this.configuration.enforceRouting) {
        throw new Error(`Document ${documentName} should be handled by custom node ${customTargetNode.id}`);
      }
    }
  }

  /**
   * Disconnect hook
   */
  async onDisconnect(_payload: onDisconnectPayload): Promise<void> {
    // Can add document access statistics cleanup logic here
    // Or trigger lazy loading cleanup for documents
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen to node failure events
    this.routeManager.on('nodeFailed', ({ node, affectedDocuments }) => {
      console.warn(`Node ${node.id} failed, affecting ${affectedDocuments.length} documents`);
      
      // Trigger document migration event (can notify application layer through other means)
      // affectedDocuments can be used for migration notifications
    });

    // Listen to node recovery events
    this.routeManager.on('nodeRecovered', (node: Node) => {
      console.log(`Node ${node.id} recovered`);
    });

    // Listen to migration completion events
    this.routeManager.on('migrationCompleted', ({ documentId, success }) => {
      console.log(`Document ${documentId} migration ${success ? 'completed' : 'failed'}`);
    });

    // Listen to sync errors
    this.routeManager.on('error', (error: Error) => {
      console.error('RouteManager error:', error);
    });
  }

  /**
   * Manually add cluster node
   */
  async addClusterNode(nodeConfig: Omit<Node, 'isHealthy' | 'lastHealthCheck'>): Promise<void> {
    const node: Node = {
      ...nodeConfig,
      isHealthy: true,
      lastHealthCheck: Date.now(),
    };

    await this.routeManager.addNode(node);
  }

  /**
   * Remove cluster node
   */
  async removeClusterNode(nodeId: string): Promise<void> {
    await this.routeManager.removeNode(nodeId);
  }

  /**
   * Get target node for document
   */
  getDocumentTargetNode(documentId: string): Node | null {
    return this.routeManager.getDocumentNode(documentId);
  }

  /**
   * Check if document should be handled by current node
   */
  shouldHandleDocument(documentId: string): boolean {
    return this.routeManager.shouldHandleDocument(documentId);
  }

  /**
   * Force migrate document to specified node
   */
  async migrateDocument(documentId: string, targetNodeId: string): Promise<void> {
    const currentRoute = this.routeManager.getDocumentNode(documentId);
    const currentNodeId = currentRoute?.id || this.currentNode.id;
    
    if (currentNodeId !== targetNodeId) {
      await this.routeManager.startDocumentMigration(documentId, currentNodeId, targetNodeId);
      
      // In actual implementation, need to handle document state transfer
      // This is just the routing layer logic
      
      await this.routeManager.completeDocumentMigration(documentId, true);
    }
  }

  /**
   * Get routing statistics
   */
  getRouteStats() {
    return this.routeManager.getStats();
  }

  /**
   * Get document routes
   */
  getDocumentRoutes(): Array<{ documentId: string; nodeId: string; lastAccessed: number }> {
    // Simplified implementation - would need access to RouteManager's private documentRoutes
    return [];
  }

  /**
   * Get all healthy nodes
   */
  getHealthyNodes(): Node[] {
    return this.routeManager.getHealthyNodes();
  }

  /**
   * Graceful shutdown
   */
  async onDestroy(): Promise<void> {
    if (this.routeManager) {
      this.routeManager.shutdown();
    }
  }
}