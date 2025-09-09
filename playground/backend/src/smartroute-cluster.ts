import { Server } from '@hocuspocus/server';
import { Logger } from '@hocuspocus/extension-logger';
import { Redis } from '@hocuspocus/extension-redis';
import { SmartRoute } from '@hocuspocus/extension-smartroute';

/**
 * Cluster SmartRoute example
 * Demonstrates consistent routing configuration in multi-node environment
 */

// Get node configuration from environment variables
const NODE_ID = process.env.NODE_ID || 'node-1';
const NODE_PORT = Number.parseInt(process.env.PORT || '8000');
const NODE_ADDRESS = process.env.NODE_ADDRESS || '127.0.0.1';

// Cluster nodes configuration
const CLUSTER_NODES = [
  { id: 'node-1', address: '127.0.0.1', port: 8000, weight: 1 },
  { id: 'node-2', address: '127.0.0.1', port: 8001, weight: 1 },
  { id: 'node-3', address: '127.0.0.1', port: 8002, weight: 2 }, // Higher weight
];

const server = new Server({
  port: NODE_PORT,
  
  extensions: [
    // Logger extension
    new Logger(),
    
    // SmartRoute extension
    new SmartRoute({
      // Current node configuration
      nodeId: NODE_ID,
      nodeAddress: NODE_ADDRESS,
      nodePort: NODE_PORT,
      nodeWeight: CLUSTER_NODES.find(n => n.id === NODE_ID)?.weight || 1,
      
      // Cluster configuration
      clusterNodes: CLUSTER_NODES.filter(n => n.id !== NODE_ID),
      autoDiscovery: true,
      
      // Routing strategy
      enforceRouting: true,      // Enforce routing check
      redirectOnMisroute: true,  // Redirect on misroute
      
      // Health check configuration
      healthCheck: {
        interval: 5000,          // 5 second check interval
        timeout: 3000,           // 3 second timeout
        retries: 3,              // 3 retries
        backoffMultiplier: 2,    // Backoff multiplier
        maxBackoff: 30000,       // Maximum backoff 30 seconds
      },
      
      // Redis configuration (for cluster state synchronization)
      
      syncInterval: 30000,       // 30 second sync interval
      migrationTimeout: 60000,   // 60 second migration timeout
    }),
    
    // Redis extension
    new Redis({
      port: Number.parseInt(process.env.REDIS_PORT || '6379'),
      host: process.env.REDIS_HOST || '127.0.0.1',
    }),
  ],

  async onConnect(data) {
    console.log(`✅ [${NODE_ID}] Client connected to document: ${data.documentName}`);
    return {};
  },

  async onDisconnect(data) {
    console.log(`❌ [${NODE_ID}] Client disconnected from document: ${data.documentName}`);
  },

  async onLoadDocument(data) {
    console.log(`📄 [${NODE_ID}] Loading document: ${data.documentName}`);
    return data.document;
  },
});

// Add custom route event listeners
const smartRouteExtension = server.configuration.extensions?.find(
  ext => ext instanceof SmartRoute
) as SmartRoute;

if (smartRouteExtension) {
  // Monitor route statistics
  setInterval(() => {
    const stats = smartRouteExtension.getRouteStats();
    console.log(`📊 [${NODE_ID}] Route Stats:`, {
      totalNodes: stats.totalNodes,
      healthyNodes: stats.healthyNodes,
      totalDocuments: stats.totalDocuments,
      migrating: stats.migrating,
    });
  }, 60000); // Print statistics every minute
}

server.listen(NODE_PORT, () => {
  console.log(`🚀 [${NODE_ID}] Hocuspocus cluster node started`);
  console.log(`📍 Available at: http://${NODE_ADDRESS}:${NODE_PORT}`);
  console.log(`🔗 Cluster nodes: ${CLUSTER_NODES.map(n => `${n.id}:${n.port}`).join(', ')}`);
});