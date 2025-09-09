import test from 'ava';
import { SmartRoute } from '../../packages/extension-smartroute/src/SmartRoute.ts';
import { RouteManager } from '../../packages/extension-smartroute/src/RouteManager.ts';
import { ConsistentHash, type Node } from '../../packages/extension-smartroute/src/ConsistentHash.ts';
import { HealthChecker } from '../../packages/extension-smartroute/src/HealthChecker.ts';

// Create test node
function createTestNode(id: string, port = 8000, weight = 1): Node {
  return {
    id,
    address: '127.0.0.1',
    port,
    weight,
    isHealthy: true,
    lastHealthCheck: Date.now()
  };
}

// Performance benchmarking helper
function measurePerformance<T>(operation: () => T): { result: T; duration: number } {
  const startTime = process.hrtime.bigint();
  const result = operation();
  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
  return { result, duration };
}

// Performance tests for ConsistentHash
test('ConsistentHash should handle large-scale document routing efficiently', t => {
  const hash = new ConsistentHash();
  
  // Add many nodes
  for (let i = 0; i < 100; i++) {
    hash.addNode(createTestNode(`node-${i}`, 8000 + i));
  }
  
  const documentCount = 100000;
  const documents = Array.from({ length: documentCount }, (_, i) => `document-${i}`);
  
  // Measure routing performance
  const { duration } = measurePerformance(() => {
    for (const doc of documents) {
      hash.getNode(doc);
    }
  });
  
  // Should complete 100k routings in reasonable time (< 1000ms)
  t.true(duration < 1000, `Routing took ${duration}ms, expected < 1000ms`);
  
  // Verify distribution quality
  const distribution = new Map<string, number>();
  for (const doc of documents.slice(0, 10000)) { // Sample first 10k for distribution check
    const node = hash.getNode(doc);
    if (node) {
      distribution.set(node.id, (distribution.get(node.id) || 0) + 1);
    }
  }
  
  // Should distribute across most nodes
  t.true(distribution.size > 80); // At least 80% of nodes should get documents
});

test('ConsistentHash should maintain consistency under rapid topology changes', t => {
  const hash = new ConsistentHash();
  
  // Initial nodes
  for (let i = 0; i < 50; i++) {
    hash.addNode(createTestNode(`initial-node-${i}`, 8000 + i));
  }
  
  const testDocuments = Array.from({ length: 1000 }, (_, i) => `test-doc-${i}`);
  
  // Record initial routing
  const initialRouting = new Map<string, string>();
  for (const doc of testDocuments) {
    const node = hash.getNode(doc);
    if (node) {
      initialRouting.set(doc, node.id);
    }
  }
  
  // Rapid topology changes
  const { duration } = measurePerformance(() => {
    for (let cycle = 0; cycle < 10; cycle++) {
      // Add 10 nodes
      for (let i = 0; i < 10; i++) {
        hash.addNode(createTestNode(`temp-${cycle}-${i}`, 9000 + cycle * 100 + i));
      }
      
      // Remove 5 nodes
      for (let i = 0; i < 5; i++) {
        hash.removeNode(`temp-${cycle}-${i}`);
      }
      
      // Mark some nodes unhealthy and healthy
      for (let i = 0; i < 5; i++) {
        hash.markNodeUnhealthy(`initial-node-${i}`);
        hash.markNodeHealthy(`initial-node-${i + 10}`);
      }
    }
  });
  
  // Should complete topology changes quickly
  t.true(duration < 500, `Topology changes took ${duration}ms, expected < 500ms`);
  
  // Routing should still be functional
  for (const doc of testDocuments.slice(0, 100)) {
    const node = hash.getNode(doc);
    t.truthy(node);
  }
});

test('ConsistentHash memory usage should be reasonable with many virtual nodes', t => {
  const hash = new ConsistentHash(1000); // High virtual node count
  
  // Measure memory usage while adding nodes
  const initialMemory = process.memoryUsage().heapUsed;
  
  for (let i = 0; i < 1000; i++) {
    hash.addNode(createTestNode(`memory-test-node-${i}`, 8000 + i));
  }
  
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
  
  // Memory increase should be reasonable (< 100MB for 1000 nodes)
  t.true(memoryIncrease < 100, `Memory increased by ${memoryIncrease}MB, expected < 100MB`);
  
  // Should still route efficiently
  const { duration } = measurePerformance(() => {
    for (let i = 0; i < 10000; i++) {
      hash.getNode(`performance-test-${i}`);
    }
  });
  
  t.true(duration < 200);
});

// Performance tests for RouteManager
test('RouteManager should handle high-throughput routing requests', async t => {
  const manager = new RouteManager({
    currentNode: createTestNode('perf-test-node'),
    syncInterval: 60000, // Long interval to avoid interference
  });
  
  // Add many nodes
  for (let i = 1; i <= 50; i++) {
    await manager.addNode(createTestNode(`perf-node-${i}`, 8000 + i));
  }
  
  const requestCount = 50000;
  const documents = Array.from({ length: requestCount }, (_, i) => `perf-doc-${i}`);
  
  // Measure routing throughput
  const { duration } = measurePerformance(() => {
    for (const doc of documents) {
      manager.getDocumentNode(doc);
      manager.shouldHandleDocument(doc);
    }
  });
  
  const throughput = (requestCount * 2) / (duration / 1000); // requests per second
  
  // Should handle at least 100k requests per second
  t.true(throughput > 100000, `Throughput: ${throughput} req/s, expected > 100k req/s`);
  
  manager.shutdown();
});

test('RouteManager should handle concurrent operations under load', async t => {
  const manager = new RouteManager({
    currentNode: createTestNode('concurrent-perf-node'),
    syncInterval: 60000,
  });
  
  // Concurrent operations
  const operations = [];
  
  // Add nodes concurrently
  for (let i = 0; i < 20; i++) {
    operations.push(manager.addNode(createTestNode(`concurrent-node-${i}`, 8000 + i)));
  }
  
  // Route documents concurrently
  for (let i = 0; i < 100; i++) {
    operations.push(Promise.resolve(manager.getDocumentNode(`concurrent-doc-${i}`)));
  }
  
  // Start migrations concurrently
  for (let i = 0; i < 10; i++) {
    operations.push(manager.startDocumentMigration(`migration-doc-${i}`, 'concurrent-node-0', 'concurrent-node-1'));
  }
  
  const startTime = Date.now();
  await Promise.all(operations);
  const duration = Date.now() - startTime;
  
  // Should complete all operations in reasonable time
  t.true(duration < 2000, `Concurrent operations took ${duration}ms, expected < 2000ms`);
  
  const stats = manager.getStats();
  t.true(stats.totalNodes >= 20);
  t.true(stats.migrating >= 0);
  
  manager.shutdown();
});

test('RouteManager should maintain performance during continuous sync operations', async t => {
  const mockRedis = {
    hset: async () => 1,
    hget: async () => null,
    hgetall: async () => ({}),
    hdel: async () => 1,
    del: async () => 1
  };
  
  const manager = new RouteManager({
    currentNode: createTestNode('sync-perf-node'),
    syncInterval: 100, // Frequent sync for stress testing
    redis: mockRedis as any
  });
  
  // Add nodes
  for (let i = 1; i <= 20; i++) {
    await manager.addNode(createTestNode(`sync-node-${i}`, 8000 + i));
  }
  
  // Start continuous sync
  manager.startSync();
  
  const routingOperations = 10000;
  const startTime = Date.now();
  
  // Perform routing while sync is running
  for (let i = 0; i < routingOperations; i++) {
    manager.getDocumentNode(`sync-test-doc-${i}`);
    
    // Occasionally add/remove nodes to stress the system
    if (i % 1000 === 0) {
      await manager.addNode(createTestNode(`dynamic-node-${i}`, 9000 + i));
    }
  }
  
  const duration = Date.now() - startTime;
  const throughput = routingOperations / (duration / 1000);
  
  // Should maintain good performance even with continuous sync
  t.true(throughput > 50000, `Throughput during sync: ${throughput} req/s, expected > 50k req/s`);
  
  manager.shutdown();
});

// Performance tests for HealthChecker
test('HealthChecker should efficiently handle large-scale health monitoring', async t => {
  const checker = new HealthChecker({
    interval: 10000, // Long interval to avoid auto-trigger
    timeout: 100,
    retries: 1
  });
  
  const nodeCount = 500;
  const nodes = Array.from({ length: nodeCount }, (_, i) => 
    createTestNode(`health-perf-node-${i}`, 9000 + i)
  );
  
  // Measure health check performance
  const startTime = Date.now();
  await checker.checkAllNodes(nodes);
  const duration = Date.now() - startTime;
  
  // Should complete health checks for 500 nodes in reasonable time
  t.true(duration < 5000, `Health checks took ${duration}ms, expected < 5000ms`);
  
  checker.shutdown();
});

test('HealthChecker should handle rapid monitoring state changes', t => {
  const checker = new HealthChecker({
    interval: 100
  });
  
  const nodes = Array.from({ length: 100 }, (_, i) => 
    createTestNode(`rapid-change-node-${i}`, 8000 + i)
  );
  
  // Rapid monitoring state changes
  const { duration } = measurePerformance(() => {
    for (let cycle = 0; cycle < 10; cycle++) {
      // Start monitoring all nodes
      for (const node of nodes) {
        checker.startMonitoring(node);
      }
      
      // Stop monitoring all nodes
      for (const node of nodes) {
        checker.stopMonitoring(node.id);
      }
    }
  });
  
  // Should handle rapid state changes efficiently
  t.true(duration < 1000, `Rapid changes took ${duration}ms, expected < 1000ms`);
  
  checker.shutdown();
});

// Integration performance tests
test('SmartRoute should maintain performance under realistic workload', async t => {
  const smartRoute = new SmartRoute({
    nodeId: 'perf-test-main-node',
    nodePort: 8000,
    clusterNodes: Array.from({ length: 20 }, (_, i) => ({
      id: `perf-cluster-node-${i}`,
      address: '127.0.0.1',
      port: 8001 + i,
      weight: Math.floor(Math.random() * 5) + 1 // Random weights 1-5
    })),
    // Note: healthCheck disabled by default for performance testing
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  const operationCount = 25000;
  
  // Mixed workload simulation
  const { duration } = measurePerformance(() => {
    for (let i = 0; i < operationCount; i++) {
      const docId = `workload-doc-${i}`;
      
      // Route document
      smartRoute.getDocumentTargetNode(docId);
      
      // Check if should handle
      smartRoute.shouldHandleDocument(docId);
      
      // Get statistics (every 100 operations)
      if (i % 100 === 0) {
        smartRoute.getRouteStats();
        smartRoute.getHealthyNodes();
      }
    }
  });
  
  const throughput = (operationCount * 2) / (duration / 1000); // 2 operations per iteration
  
  // Should maintain high throughput
  t.true(throughput > 200000, `SmartRoute throughput: ${throughput} ops/s, expected > 200k ops/s`);
  
  await smartRoute.onDestroy();
});

test('SmartRoute should handle burst traffic patterns', async t => {
  const smartRoute = new SmartRoute({
    nodeId: 'burst-test-node',
    clusterNodes: Array.from({ length: 10 }, (_, i) => ({
      id: `burst-node-${i}`,
      address: '127.0.0.1',
      port: 8000 + i,
      weight: 1
    }))
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  // Simulate burst traffic pattern
  const burstSize = 10000;
  const burstCount = 5;
  const maxBurstDuration = 500; // ms
  
  for (let burst = 0; burst < burstCount; burst++) {
    const { duration } = measurePerformance(() => {
      for (let i = 0; i < burstSize; i++) {
        smartRoute.getDocumentTargetNode(`burst-${burst}-doc-${i}`);
      }
    });
    
    // Each burst should complete quickly
    t.true(duration < maxBurstDuration, 
      `Burst ${burst} took ${duration}ms, expected < ${maxBurstDuration}ms`);
    
    // Small delay between bursts
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  await smartRoute.onDestroy();
});

test('Memory usage should remain stable under sustained load', async t => {
  const smartRoute = new SmartRoute({
    nodeId: 'memory-test-node',
    clusterNodes: Array.from({ length: 50 }, (_, i) => ({
      id: `memory-node-${i}`,
      address: '127.0.0.1',
      port: 8000 + i,
      weight: 1
    }))
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  const initialMemory = process.memoryUsage().heapUsed;
  
  // Sustained load test
  const totalOperations = 500000;
  const batchSize = 10000;
  
  for (let batch = 0; batch < totalOperations / batchSize; batch++) {
    // Process batch
    for (let i = 0; i < batchSize; i++) {
      const docId = `memory-test-${batch}-${i}`;
      smartRoute.getDocumentTargetNode(docId);
      smartRoute.shouldHandleDocument(docId);
    }
    
    // Periodic memory check
    if (batch % 10 === 0) {
      const currentMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (currentMemory - initialMemory) / 1024 / 1024; // MB
      
      // Memory should not grow excessively
      t.true(memoryIncrease < 200, 
        `Memory increased by ${memoryIncrease}MB after ${(batch + 1) * batchSize} operations`);
    }
  }
  
  const finalMemory = process.memoryUsage().heapUsed;
  const totalMemoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
  
  t.true(totalMemoryIncrease < 300, 
    `Total memory increase: ${totalMemoryIncrease}MB, expected < 300MB`);
  
  await smartRoute.onDestroy();
});

// Stress tests for edge cases
test('System should remain stable under extreme load', async t => {
  const smartRoute = new SmartRoute({
    nodeId: 'stress-test-node',
    clusterNodes: Array.from({ length: 100 }, (_, i) => ({
      id: `stress-node-${i}`,
      address: '127.0.0.1',
      port: 8000 + i,
      weight: Math.ceil(Math.random() * 10) // Random weights
    }))
  });
  
  await smartRoute.onConfigure({ 
    instance: {} as any,
    configuration: {} as any,
    version: '1.0.0'
  });
  
  const extremeOperationCount = 1000000; // 1 million operations
  
  const startTime = Date.now();
  let errorCount = 0;
  
  try {
    // Extreme load test
    for (let i = 0; i < extremeOperationCount; i++) {
      smartRoute.getDocumentTargetNode(`extreme-doc-${i}`);
      
      // Occasional topology changes during load
      if (i % 50000 === 0) {
        const newNode = {
          id: `dynamic-extreme-node-${i}`,
          address: '127.0.0.1',
          port: 9000 + i,
          weight: 1
        };
        await smartRoute.addClusterNode(newNode);
        
        if (i > 100000) {
          await smartRoute.removeClusterNode(`dynamic-extreme-node-${i - 100000}`);
        }
      }
    }
  } catch (error) {
    errorCount++;
  }
  
  const duration = Date.now() - startTime;
  const throughput = extremeOperationCount / (duration / 1000);
  
  // Should complete without errors and maintain reasonable throughput
  t.is(errorCount, 0, 'Should complete extreme load without errors');
  t.true(throughput > 50000, `Extreme load throughput: ${throughput} ops/s`);
  
  // System should still be responsive
  const stats = smartRoute.getRouteStats();
  t.truthy(stats);
  t.true(stats.totalNodes > 100);
  
  await smartRoute.onDestroy();
});