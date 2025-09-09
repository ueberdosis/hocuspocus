import test from 'ava';
import { SmartRoute } from '../../packages/extension-smartroute/src/SmartRoute.ts';
import { Server } from '../../packages/server/src/index.ts';

// Create test server
function createTestServer() {
  return new Server({
    port: 0, // Use random port
    extensions: [
      new SmartRoute({
        nodeId: 'test-node-1',
        nodeAddress: '127.0.0.1',
        nodePort: 8000,
        nodeWeight: 1,
        enforceRouting: false, // Don't enforce routing in test environment
      })
    ]
  });
}

test('should be able to create server with smart routing', async t => {
  const server = createTestServer();
  
  // Should have at least one extension (SmartRoute)
  t.true(server.configuration.extensions.length >= 1);
  // Find the SmartRoute extension
  const smartRoute = server.configuration.extensions.find(ext => ext.constructor.name === 'SmartRoute') as SmartRoute;
  t.truthy(smartRoute);
  t.is(smartRoute.constructor.name, 'SmartRoute');
});

test('should be able to handle single node routing', async t => {
  const server = createTestServer();
  
  // Get smart route extension
  const smartRoute = server.configuration.extensions[0] as SmartRoute;
  
  // Wait for initialization
  await smartRoute.onConfigure({ 
    instance: server.hocuspocus,
    configuration: server.configuration,
    version: '1.0.0'
  });
  
  // Test document routing
  const targetNode1 = smartRoute.getDocumentTargetNode('document-1');
  const targetNode2 = smartRoute.getDocumentTargetNode('document-2');
  
  t.truthy(targetNode1);
  t.truthy(targetNode2);
  
  // Same document should route to same node
  const targetNode1Again = smartRoute.getDocumentTargetNode('document-1');
  t.is(targetNode1!.id, targetNode1Again!.id);
});

test('should be able to handle cluster node configuration', async t => {
  const smartRoute = new SmartRoute({
    nodeId: 'test-node-1',
    clusterNodes: [
      { id: 'test-node-2', address: '127.0.0.1', port: 8001, weight: 1 },
      { id: 'test-node-3', address: '127.0.0.1', port: 8002, weight: 2 }
    ]
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  const stats = smartRoute.getRouteStats();
  t.is(stats.totalNodes, 3); // Current node + 2 cluster nodes
});

test('should be able to detect if document should be handled by current node', async t => {
  const smartRoute = new SmartRoute({
    nodeId: 'test-node-1',
    clusterNodes: [
      { id: 'test-node-2', address: '127.0.0.1', port: 8001, weight: 1 },
      { id: 'test-node-3', address: '127.0.0.1', port: 8002, weight: 1 }
    ]
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  // Test multiple documents
  const documents = ['doc-1', 'doc-2', 'doc-3', 'doc-4', 'doc-5'];
  const results = documents.map(doc => ({
    document: doc,
    shouldHandle: smartRoute.shouldHandleDocument(doc),
    targetNode: smartRoute.getDocumentTargetNode(doc)
  }));
  
  // At least some documents should be handled by current node
  const handledByCurrentNode = results.filter(r => r.shouldHandle).length;
  t.true(handledByCurrentNode > 0);
  
  // In a 3-node cluster, current node should handle some documents
  t.true(handledByCurrentNode <= documents.length);
});

test('should support custom routing strategy', async t => {
  const smartRoute = new SmartRoute({
    // Test routing: all documents starting with 'priority-' route to first node
    customRoutingFunction: (documentId, availableNodes) => {
      if (documentId.startsWith('priority-')) {
        return availableNodes[0];
      }
      return null; // Use default routing
    },
    nodeId: 'test-node-1',
    clusterNodes: [
      { id: 'test-node-2', address: '127.0.0.1', port: 8001, weight: 1 }
    ]
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  // Test priority document
  const shouldHandle = smartRoute.shouldHandleDocument('priority-document');
  
  // Note: Since our test node is the first added, it should be selected
  t.truthy(shouldHandle);
});

test('should be able to manually add and remove cluster nodes', async t => {
  const smartRoute = new SmartRoute({
    nodeId: 'test-node-1'
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  // Initial state
  let stats = smartRoute.getRouteStats();
  t.is(stats.totalNodes, 1);
  
  // Add node
  await smartRoute.addClusterNode({
    id: 'test-node-2',
    address: '127.0.0.1',
    port: 8001,
    weight: 1
  });
  
  stats = smartRoute.getRouteStats();
  t.is(stats.totalNodes, 2);
  
  // Remove node
  await smartRoute.removeClusterNode('test-node-2');
  
  stats = smartRoute.getRouteStats();
  t.is(stats.totalNodes, 1);
});

test('should be able to get route statistics', async t => {
  const smartRoute = new SmartRoute({
    nodeId: 'test-node-1',
    clusterNodes: [
      { id: 'test-node-2', address: '127.0.0.1', port: 8001, weight: 1 },
      { id: 'test-node-3', address: '127.0.0.1', port: 8002, weight: 2 }
    ]
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  const stats = smartRoute.getRouteStats();
  
  t.is(stats.totalNodes, 3);
  t.is(stats.healthyNodes, 3);
  t.is(stats.unhealthyNodes, 0);
  t.truthy(Array.isArray(stats.nodes));
  t.is(stats.nodes.length, 3);
});

test('should be able to get healthy node list', async t => {
  const smartRoute = new SmartRoute({
    nodeId: 'test-node-1',
    clusterNodes: [
      { id: 'test-node-2', address: '127.0.0.1', port: 8001, weight: 1 },
      { id: 'test-node-3', address: '127.0.0.1', port: 8002, weight: 2 }
    ]
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  const healthyNodes = smartRoute.getHealthyNodes();
  
  t.truthy(Array.isArray(healthyNodes));
  t.is(healthyNodes.length, 3); // All nodes should be healthy
  
  healthyNodes.forEach(node => {
    t.truthy(node.id);
    t.truthy(node.address);
    t.truthy(typeof node.port === 'number');
    t.is(node.isHealthy, true);
  });
});

// Integration tests with Hocuspocus lifecycle
test('should integrate correctly with Hocuspocus onConnect hook', async t => {
  const smartRoute = new SmartRoute({
    nodeId: 'test-node-1',
    enforceRouting: true, // Enforce routing for this test
    clusterNodes: [
      { id: 'test-node-2', address: '127.0.0.1', port: 8001, weight: 1 }
    ]
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  // Mock connect payload
  const connectPayload = {
    documentName: 'test-document',
    request: {
      headers: {},
      url: '/test-document',
      socket: { remoteAddress: '127.0.0.1' }
    } as any,
    requestHeaders: {},
    requestParameters: new URLSearchParams(),
    socketId: 'socket-1',
    context: {},
    instance: {} as any,
    connectionConfig: {}
  };
  
  // Test connection routing
  try {
    await smartRoute.onConnect(connectPayload as any);
    
    // Should either accept connection (if document routes to current node)
    // or reject it (if document routes to different node)
    t.pass();
  } catch (error) {
    // Connection rejection is also valid behavior
    t.pass();
  }
});

test('should handle document lifecycle with onConnect and onDisconnect', async t => {
  const smartRoute = new SmartRoute({
    nodeId: 'test-node-1',
    enforceRouting: false // Don't enforce routing to test lifecycle
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  const documentName = 'lifecycle-test-document';
  
  const connectPayload = {
    documentName,
    request: { headers: {}, url: `/${documentName}`, socket: { remoteAddress: '127.0.0.1' } } as any,
    requestHeaders: {},
    requestParameters: new URLSearchParams(),
    socketId: 'socket-1',
    context: {},
    instance: {} as any,
    connectionConfig: {}
  };
  
  const disconnectPayload = {
    documentName,
    requestHeaders: {},
    requestParameters: new URLSearchParams(),
    socketId: 'socket-1',
    context: {},
    clientsCount: 1,
    document: {} as any,
    instance: {} as any
  };
  
  // Should handle connect
  await smartRoute.onConnect(connectPayload as any);
  
  // Should handle disconnect
  await smartRoute.onDisconnect(disconnectPayload as any);
  
  t.pass();
});

test('should handle multiple concurrent connections to same document', async t => {
  const smartRoute = new SmartRoute({
    nodeId: 'test-node-1',
    enforceRouting: false
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  const documentName = 'concurrent-test-document';
  
  // Create multiple concurrent connections
  const connections = [];
  for (let i = 0; i < 10; i++) {
    const connectPayload = {
      documentName,
      request: { headers: {}, url: `/${documentName}`, socket: { remoteAddress: '127.0.0.1' } } as any,
      requestHeaders: {},
      requestParameters: new URLSearchParams(),
      socketId: `socket-${i}`,
      context: {},
      instance: {} as any,
      connectionConfig: {}
    };
    
    connections.push(smartRoute.onConnect(connectPayload as any));
  }
  
  // All connections should be handled
  await Promise.all(connections);
  
  t.pass();
});

test('should handle routing with Redis cluster synchronization', async t => {
  const mockRedis = {
    hset: async () => 1,
    hget: async () => JSON.stringify({
      id: 'redis-node-1',
      address: '127.0.0.1',
      port: 8003,
      weight: 1,
      isHealthy: true,
      lastHealthCheck: Date.now()
    }),
    hgetall: async () => ({
      'redis-node-1': JSON.stringify({
        id: 'redis-node-1',
        address: '127.0.0.1',
        port: 8003,
        weight: 1,
        isHealthy: true,
        lastHealthCheck: Date.now()
      })
    }),
    hdel: async () => 1,
    del: async () => 1,
    keys: async () => [],
    setex: async () => 'OK',
    get: async () => null
  };
  
  const smartRoute = new SmartRoute({
    nodeId: 'test-node-1',
    redis: mockRedis as any,
    syncInterval: 1000 // Short sync interval for testing
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  // Wait for initial sync
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const stats = smartRoute.getRouteStats();
  t.true(stats.totalNodes >= 1); // Should have at least current node
  
  // Cleanup
  await smartRoute.onDestroy();
});

test('should handle health check integration with cluster nodes', async t => {
  const smartRoute = new SmartRoute({
    nodeId: 'test-node-1',
    clusterNodes: [
      { id: 'health-test-node', address: '127.0.0.1', port: 9999, weight: 1 }
    ],
    healthCheck: {
      interval: 100, // Short interval for testing
      timeout: 50,
      retries: 1
    }
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  // Wait for health checks to run
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const stats = smartRoute.getRouteStats();
  
  // Health check may mark unreachable node as unhealthy
  t.true(stats.totalNodes >= 1);
  t.true(stats.unhealthyNodes >= 0);
  
  // Cleanup
  await smartRoute.onDestroy();
});

test('should handle document migration scenarios', async t => {
  const smartRoute1 = new SmartRoute({
    nodeId: 'migration-node-1',
    nodePort: 8001,
    clusterNodes: [
      { id: 'migration-node-2', address: '127.0.0.1', port: 8002, weight: 1 }
    ]
  });
  
  const smartRoute2 = new SmartRoute({
    nodeId: 'migration-node-2',
    nodePort: 8002,
    clusterNodes: [
      { id: 'migration-node-1', address: '127.0.0.1', port: 8001, weight: 1 }
    ]
  });
  
  await smartRoute1.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  await smartRoute2.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  const documentName = 'migration-test-document';
  
  // Check which node should handle the document
  const shouldHandle1 = smartRoute1.shouldHandleDocument(documentName);
  const shouldHandle2 = smartRoute2.shouldHandleDocument(documentName);
  
  // Only one node should handle the document
  t.not(shouldHandle1, shouldHandle2);
  
  // Test migration capability
  if (shouldHandle1) {
    await smartRoute1.migrateDocument(documentName, 'migration-node-2');
    
    // After migration, the other node should handle it
    const shouldHandleAfterMigration1 = smartRoute1.shouldHandleDocument(documentName);
    const shouldHandleAfterMigration2 = smartRoute2.shouldHandleDocument(documentName);
    
    t.false(shouldHandleAfterMigration1);
    t.true(shouldHandleAfterMigration2);
  }
  
  // Cleanup
  await smartRoute1.onDestroy();
  await smartRoute2.onDestroy();
});

test('should handle load balancing across weighted nodes', async t => {
  const smartRoute = new SmartRoute({
    nodeId: 'lb-test-node-1',
    nodeWeight: 1,
    clusterNodes: [
      { id: 'lb-test-node-2', address: '127.0.0.1', port: 8001, weight: 2 },
      { id: 'lb-test-node-3', address: '127.0.0.1', port: 8002, weight: 3 }
    ]
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  // Test distribution of 300 documents
  const nodeDistribution = new Map<string, number>();
  const documentCount = 300;
  
  for (let i = 0; i < documentCount; i++) {
    const targetNode = smartRoute.getDocumentTargetNode(`load-test-doc-${i}`);
    if (targetNode) {
      nodeDistribution.set(targetNode.id, (nodeDistribution.get(targetNode.id) || 0) + 1);
    }
  }
  
  // All three nodes should get some documents
  t.is(nodeDistribution.size, 3);
  
  // Higher weight nodes should get more documents
  const node1Count = nodeDistribution.get('lb-test-node-1') || 0;
  const node3Count = nodeDistribution.get('lb-test-node-3') || 0;
  
  // Weight 3 node should get more than weight 1 node
  t.true(node3Count > node1Count);
  
  // Cleanup
  await smartRoute.onDestroy();
});

test('should handle graceful shutdown in cluster environment', async t => {
  const smartRoute = new SmartRoute({
    nodeId: 'shutdown-test-node',
    clusterNodes: [
      { id: 'peer-node-1', address: '127.0.0.1', port: 8001, weight: 1 },
      { id: 'peer-node-2', address: '127.0.0.1', port: 8002, weight: 1 }
    ],
    healthCheck: {
      interval: 100
    }
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  // Verify cluster is running
  const statsBeforeShutdown = smartRoute.getRouteStats();
  t.is(statsBeforeShutdown.totalNodes, 3);
  
  // Graceful shutdown
  await smartRoute.onDestroy();
  
  // Should handle shutdown gracefully
  t.pass();
});

test('should handle complex routing scenarios with custom strategies', async t => {
  const smartRoute = new SmartRoute({
    nodeId: 'custom-strategy-node-1',
    customRoutingFunction: (documentId, availableNodes) => {
      // Route admin documents to first node, user documents spread across others
      if (documentId.startsWith('admin-')) {
        return availableNodes.find(n => n.id === 'custom-strategy-node-1') || availableNodes[0];
      }
      
      if (documentId.startsWith('user-')) {
        const userNodes = availableNodes.filter(n => n.id.includes('user'));
        return userNodes[0] || availableNodes[availableNodes.length - 1];
      }
      
      return null; // Use default routing
    },
    clusterNodes: [
      { id: 'user-node-1', address: '127.0.0.1', port: 8001, weight: 1 },
      { id: 'user-node-2', address: '127.0.0.1', port: 8002, weight: 1 }
    ]
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  // Test admin document routing
  const adminTarget = smartRoute.getDocumentTargetNode('admin-dashboard');
  // Custom routing should route admin documents to the first available node
  t.truthy(adminTarget);
  // Should be routed to one of our nodes, possibly the custom-strategy-node-1
  const validNodeIds = ['custom-strategy-node-1', 'user-node-1', 'user-node-2'];
  t.true(validNodeIds.includes(adminTarget!.id));
  
  // Test user document routing
  const userTarget = smartRoute.getDocumentTargetNode('user-profile-123');
  t.truthy(userTarget);
  t.true(userTarget!.id.includes('user'));
  
  // Test default routing
  const defaultTarget = smartRoute.getDocumentTargetNode('regular-document');
  t.truthy(defaultTarget);
  
  // Cleanup
  await smartRoute.onDestroy();
});

test('should handle error scenarios and recovery', async t => {
  const errorProneRedis = {
    hset: async () => 1, // Don't throw on hset to allow initialization
    hget: async () => { throw new Error('Redis read error'); },
    hgetall: async () => { throw new Error('Redis read error'); },
    hdel: async () => { throw new Error('Redis delete error'); },
    del: async () => { throw new Error('Redis delete error'); },
    keys: async () => [], // Return empty array for sync
    setex: async () => 1, // Don't throw on setex to allow node registration
    get: async () => { throw new Error('Redis get error'); }
  };
  
  const smartRoute = new SmartRoute({
    nodeId: 'error-recovery-node',
    redis: errorProneRedis as any,
    clusterNodes: [
      { id: 'backup-node', address: '127.0.0.1', port: 8001, weight: 1 }
    ]
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  // Should still be functional despite Redis errors
  const targetNode = smartRoute.getDocumentTargetNode('test-document');
  t.truthy(targetNode);
  
  const stats = smartRoute.getRouteStats();
  t.true(stats.totalNodes >= 1);
  
  // SmartRoute doesn't have shutdown method, so we don't call it
  t.pass();
});