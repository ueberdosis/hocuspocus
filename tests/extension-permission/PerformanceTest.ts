/**
 * Permission extension performance and concurrency tests
 * Performance and Concurrency Tests for Permission Extension
 */

import test from 'ava';
import { Permission, PermissionLevel, PermissionError, type User, type PermissionResult } from '../../packages/extension-permission/src/index.ts';

// =====================================================
// Performance test helper functions
// =====================================================

interface MockConnection {
  request?: {
    url?: string;
    headers?: Record<string, string>;
  };
}

// Mock tokens for performance testing
const mockTokens: Record<string, string> = {
  'fast_token': 'fast_user',
  'slow_token': 'slow_user',
  'admin_token': 'admin_user',
  'editor_token': 'editor_user'
};

// Populate performance test tokens
for (let i = 0; i < 20000; i++) {
  mockTokens[`perf_token_${i}`] = `perf_user_${i}`;
  mockTokens[`fast_token_${i}`] = `fast_user_${i}`;
  mockTokens[`slow_token_${i}`] = `slow_user_${i}`;
  mockTokens[`concurrent_token_${i}`] = `concurrent_user_${i}`;
  mockTokens[`memory_test_token_${i}`] = `memory_user_${i}`;
  mockTokens[`timeout_token_${i}`] = `timeout_user_${i}`;
  mockTokens[`normal_token_${i}`] = `normal_user_${i}`;
  mockTokens[`readonly_token_${i}`] = `readonly_user_${i}`;
  mockTokens[`private_token_${i}`] = `private_user_${i}`;
}

// Mock users database for performance testing
const mockUsers: Record<string, User> = {
  'fast_user': { id: 'fast_user', role: 'editor' },
  'slow_user': { id: 'slow_user', role: 'editor' },
  'admin_user': { id: 'admin_user', role: 'admin' },
  'editor_user': { id: 'editor_user', role: 'editor' }
};

// Populate performance test users
for (let i = 0; i < 20000; i++) {
  mockUsers[`perf_user_${i}`] = { id: `perf_user_${i}`, role: 'editor' };
  mockUsers[`fast_user_${i}`] = { id: `fast_user_${i}`, role: 'editor' };
  mockUsers[`slow_user_${i}`] = { id: `slow_user_${i}`, role: 'editor' };
  mockUsers[`concurrent_user_${i}`] = { id: `concurrent_user_${i}`, role: 'editor' };
  mockUsers[`memory_user_${i}`] = { id: `memory_user_${i}`, role: 'editor' };
  mockUsers[`timeout_user_${i}`] = { id: `timeout_user_${i}`, role: 'editor' };
  mockUsers[`normal_user_${i}`] = { id: `normal_user_${i}`, role: 'user' };
  mockUsers[`readonly_user_${i}`] = { id: `readonly_user_${i}`, role: 'guest' };
  mockUsers[`private_user_${i}`] = { id: `private_user_${i}`, role: 'user' };
}

function createConnection(token?: string, headers: Record<string, string> = {}): MockConnection {
  const requestHeaders = { ...headers };
  if (token) {
    requestHeaders['authorization'] = `Bearer ${token}`;
  }
  
  return {
    request: {
      url: '/doc',
      headers: requestHeaders,
    },
  };
}

// Fast user resolver - token-based authentication
function getFastUser(connection: any): User | null {
  try {
    const authHeader = connection.request?.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7);
    const userId = mockTokens[token];
    
    if (!userId) {
      return null;
    }
    
    return mockUsers[userId] || null;
  } catch {
    return null;
  }
}

// Slow user resolver (simulates database query) - token-based authentication
async function getSlowUser(connection: any): Promise<User | null> {
  // Simulate database latency
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50)); // 50-150ms
  
  try {
    const authHeader = connection.request?.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7);
    const userId = mockTokens[token];
    
    if (!userId) {
      return null;
    }
    
    return mockUsers[userId] || null;
  } catch {
    return null;
  }
}

// Fast permission check
function getFastPermission(user: User, documentName: string): PermissionResult {
  return { level: PermissionLevel.WRITE };
}

// Slow permission check (simulates database query)
async function getSlowPermission(user: User, documentName: string): Promise<PermissionResult> {
  await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100)); // 100-300ms
  return { level: PermissionLevel.WRITE };
}

// Create large connection data with proper token authentication
function createMassConnections(count: number, tokenPrefix: string = 'perf_token'): MockConnection[] {
  return Array.from({ length: count }, (_, i) => createConnection(`${tokenPrefix}_${i}`));
}

// Performance measurement helper function
function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
  return new Promise(async (resolve, reject) => {
    const start = Date.now();
    try {
      const result = await fn();
      const time = Date.now() - start;
      resolve({ result, time });
    } catch (error) {
      reject(error);
    }
  });
}

// =====================================================
// Basic performance tests
// =====================================================

test('Permission - Fast permission check performance baseline', async t => {
  const permission = new Permission({
    getUser: getFastUser,
    getPermission: getFastPermission
  });

  const connection = createConnection('fast_token');
  const connectData = { context: connection, documentName: 'perf-doc' } as any;

  // Warm up
  await permission.onConnect(connectData);

  // Performance test
  const iterations = 1000;
  const { time } = await measureTime(async () => {
    for (let i = 0; i < iterations; i++) {
      const testConnection = createConnection(`perf_token_${i}`);
      const testData = { context: testConnection, documentName: `doc_${i}` } as any;
      await permission.onConnect(testData);
    }
  });

  const avgTime = time / iterations;
  console.log(`Fast permission check average time: ${avgTime.toFixed(2)}ms`);
  
  // Fast permission check should be within 1ms
  t.true(avgTime < 1, `Average time ${avgTime}ms should be less than 1ms`);
  t.true(time < 5000, `Total time ${time}ms should be less than 5 seconds`);
});

test('Permission - Slow permission check performance test', async t => {
  const permission = new Permission({
    getUser: getSlowUser,
    getPermission: getSlowPermission,
    timeout: 10000 // 10 second timeout
  });

  const iterations = 50; // Fewer iterations because each is slow
  const connections = createMassConnections(iterations, 'slow_token');
  
  const { time } = await measureTime(async () => {
    // Sequential processing to test impact of single slow queries
    for (const connection of connections) {
      const connectData = { context: connection, documentName: `slow-doc-${connection.id}` } as any;
      await permission.onConnect(connectData);
    }
  });

  const avgTime = time / iterations;
  console.log(`Slow permission check average time: ${avgTime.toFixed(2)}ms`);
  
  // Slow permission check should be within 500ms (including network and database simulation delay)
  t.true(avgTime < 500, `Average time ${avgTime}ms should be less than 500ms`);
  t.true(avgTime > 100, `Average time ${avgTime}ms should be greater than 100ms`); // Ensure there is actual delay
});

// =====================================================
// Concurrency tests
// =====================================================

test('Permission - High concurrency permission checks', async t => {
  const permission = new Permission({
    getUser: getFastUser,
    getPermission: getFastPermission
  });

  const concurrency = 1000;
  const connections = createMassConnections(concurrency, 'concurrent_token');

  const { result: results, time } = await measureTime(async () => {
    // Execute all permission checks concurrently
    const promises = connections.map(connection => {
      const connectData = { context: connection, documentName: `concurrent-doc-${connection.id}` } as any;
      return permission.onConnect(connectData);
    });

    return await Promise.allSettled(promises);
  });

  // Analyze results
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  const avgTimePerCheck = time / concurrency;

  console.log(`Concurrency test results: Success ${successful}, Failed ${failed}, Total time ${time}ms, Average ${avgTimePerCheck.toFixed(2)}ms`);

  // Verify results
  t.is(successful, concurrency, 'All permission checks should succeed');
  t.is(failed, 0, 'No permission checks should fail');
  t.true(time < 10000, `Total time ${time}ms should be less than 10 seconds`);
  t.true(avgTimePerCheck < 10, `Average time per check ${avgTimePerCheck}ms should be less than 10ms`);
});

test('Permission - Mixed slow/fast permission check concurrency', async t => {
  // Half fast, half slow
  const fastPermission = new Permission({
    getUser: getFastUser,
    getPermission: getFastPermission
  });

  const slowPermission = new Permission({
    getUser: getSlowUser,
    getPermission: getSlowPermission,
    timeout: 5000
  });

  const totalCount = 100;
  const fastCount = totalCount / 2;
  const slowCount = totalCount / 2;

  const { result: results, time } = await measureTime(async () => {
    const fastPromises = Array.from({ length: fastCount }, (_, i) => {
      const connection = createConnection(`fast_token_${i}`);
      const connectData = { context: connection, documentName: `fast-doc-${i}` } as any;
      return fastPermission.onConnect(connectData);
    });

    const slowPromises = Array.from({ length: slowCount }, (_, i) => {
      const connection = createConnection(`slow_token_${i}`);
      const connectData = { context: connection, documentName: `slow-doc-${i}` } as any;
      return slowPermission.onConnect(connectData);
    });

    return await Promise.allSettled([...fastPromises, ...slowPromises]);
  });

  // Analyze results
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`Mixed concurrency test: Success ${successful}, Failed ${failed}, Total time ${time}ms`);

  // Fast checks should complete, slow checks should also complete within reasonable time
  t.true(successful >= fastCount, 'At least all fast checks should succeed');
  t.true(time < 10000, 'Mixed concurrent checks should complete within 10 seconds');
});

// =====================================================
// Memory and resource tests
// =====================================================

test('Permission - Memory usage and garbage collection', async t => {
  const permission = new Permission({
    getUser: getFastUser,
    getPermission: getFastPermission
  });

  // Get initial memory usage (if available)
  const initialMemory = process.memoryUsage?.() || { heapUsed: 0, heapTotal: 0 };

  // Mass connection test
  const iterations = 10000;
  for (let i = 0; i < iterations; i++) {
    const connection = createConnection(`memory_test_token_${i}`);
    const connectData = { context: connection, documentName: `memory-doc-${i}` } as any;
    
    try {
      await permission.onConnect(connectData);
    } catch (error) {
      // Ignore connection errors, focus on memory usage
    }

    // Force garbage collection every 1000 iterations (if available)
    if (i % 1000 === 0 && global.gc) {
      global.gc();
    }
  }

  // Final garbage collection
  if (global.gc) {
    global.gc();
  }

  // Get final memory usage
  const finalMemory = process.memoryUsage?.() || { heapUsed: 0, heapTotal: 0 };
  const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
  const memoryIncreasePerConnection = memoryIncrease / iterations;

  console.log(`Memory test results: Growth ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB, Average per connection ${memoryIncreasePerConnection.toFixed(2)} bytes`);

  // Memory growth should be reasonable (no more than 1.5KB persistent memory per connection for permission system)
  if (memoryIncrease > 0) {
    t.true(memoryIncreasePerConnection < 1536, `Memory per connection ${memoryIncreasePerConnection} bytes should be less than 1.5KB`);
  }

  // Test passing indicates no obvious memory leaks
  t.pass('Memory usage test completed');
});

// =====================================================
// Timeout and error handling tests
// =====================================================

test('Permission - Timeout handling under high load', async t => {
  // Create permission checker that will timeout
  const timeoutPermission = new Permission({
    getUser: getFastUser,
    getPermission: async (user, documentName) => {
      // Intentionally delay beyond timeout limit
      await new Promise(resolve => setTimeout(resolve, 200));
      return { level: PermissionLevel.WRITE };
    },
    timeout: 100 // 100ms timeout
  });

  const connections = createMassConnections(50, 'timeout_token');
  const { result: results, time } = await measureTime(async () => {
    const promises = connections.map((connection, index) => {
      const connectData = { context: connection, documentName: `timeout-doc-${index}` } as any;
      return timeoutPermission.onConnect(connectData).catch(error => ({ error }));
    });

    return await Promise.all(promises);
  });

  // Analyze timeout results
  const timeouts = results.filter(r => r && r.error && r.error.message?.includes('timeout')).length;
  const successful = results.filter(r => !r || !r.error).length;

  console.log(`Timeout test results: Timeouts ${timeouts}, Success ${successful}, Total time ${time}ms`);

  // Verify timeout mechanism works properly
  t.true(timeouts > 0, 'Should have some timeouts');
  t.true(time < 5000, 'Timeout test should complete quickly due to timeout mechanism');
  t.true(time > 100, 'Should take at least timeout duration');
});

// =====================================================
// Real load simulation tests
// =====================================================

test('Permission - Real load simulation', async t => {
  const permission = new Permission({
    getUser: async (connection) => {
      // Simulate real user query delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10)); // 10-60ms
      
      try {
        const authHeader = connection.request?.headers?.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return null;
        }
        
        const token = authHeader.substring(7);
        const userId = mockTokens[token];
        
        if (!userId) {
          return null;
        }
        
        return mockUsers[userId] || null;
      } catch {
        return null;
      }
    },
    getPermission: async (user, documentName) => {
      // Simulate real permission query delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 20)); // 20-120ms
      
      // Simulate different permission results
      if (documentName.includes('readonly')) {
        return { level: PermissionLevel.READ };
      } else if (documentName.includes('private') && !user.id.includes('admin')) {
        return { level: PermissionLevel.DENY };
      } else {
        return { level: PermissionLevel.WRITE };
      }
    },
    timeout: 5000
  });

  // Simulate real user connection patterns
  const scenarios = [
    { prefix: 'normal', count: 70 },      // 70% normal documents
    { prefix: 'readonly', count: 20 },    // 20% readonly documents
    { prefix: 'private', count: 10 }      // 10% private documents
  ];

  const { result: allResults, time: totalTime } = await measureTime(async () => {
    const allPromises: Promise<any>[] = [];

    for (const scenario of scenarios) {
      for (let i = 0; i < scenario.count; i++) {
        const connection = createConnection(`${scenario.prefix}_token_${i}`);
        const connectData = { 
          context: connection, 
          documentName: `${scenario.prefix}-doc-${i}` 
        } as any;

        allPromises.push(
          permission.onConnect(connectData)
            .then(() => ({ scenario: scenario.prefix, success: true }))
            .catch(error => ({ scenario: scenario.prefix, success: false, error }))
        );
      }
    }

    // Simulate batch connections instead of all simultaneous connections
    const batchSize = 20;
    const results: any[] = [];
    
    for (let i = 0; i < allPromises.length; i += batchSize) {
      const batch = allPromises.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
      
      // Brief interval between batches
      if (i + batchSize < allPromises.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return results;
  });

  // Analyze results
  const summary = allResults.reduce((acc, result) => {
    acc[result.scenario] = acc[result.scenario] || { success: 0, failure: 0 };
    if (result.success) {
      acc[result.scenario].success++;
    } else {
      acc[result.scenario].failure++;
    }
    return acc;
  }, {} as any);

  console.log('Real load simulation results:');
  Object.entries(summary).forEach(([scenario, stats]: [string, any]) => {
    console.log(`  ${scenario}: Success ${stats.success}, Failed ${stats.failure}`);
  });
  console.log(`Total time: ${totalTime}ms`);

  // Verify load test results
  t.true(summary.normal?.success >= 60, 'Most normal documents should be accessible');
  t.true(summary.readonly?.success >= 15, 'Most readonly documents should be accessible');
  t.true(summary.private?.failure >= 5, 'Some private documents should be denied');
  t.true(totalTime < 30000, 'Load test should complete within 30 seconds');
});

// =====================================================
// Statistics and monitoring tests
// =====================================================

test('Permission - Statistics accuracy', async t => {
  const permission = new Permission({
    getUser: getFastUser,
    getPermission: (user, documentName) => {
      // Return different permissions based on document name for statistics testing
      if (documentName.includes('deny')) {
        return { level: PermissionLevel.DENY };
      } else if (documentName.includes('read')) {
        return { level: PermissionLevel.READ };
      } else {
        return { level: PermissionLevel.WRITE };
      }
    }
  });

  // Reset statistics
  const initialStats = permission.getStats();
  
  const testCases = [
    { name: 'allow-doc-1', token: 'fast_token', expectedSuccess: true },
    { name: 'allow-doc-2', token: 'slow_token', expectedSuccess: true },
    { name: 'read-doc-1', token: 'editor_token', expectedSuccess: true },
    { name: 'deny-doc-1', token: 'admin_token', expectedSuccess: false },
    { name: 'deny-doc-2', token: 'admin_token', expectedSuccess: false }
  ];

  let actualSuccesses = 0;
  let actualFailures = 0;

  for (const testCase of testCases) {
    const connection = createConnection(testCase.token);
    const connectData = { context: connection, documentName: testCase.name } as any;

    try {
      await permission.onConnect(connectData);
      actualSuccesses++;
    } catch (error) {
      actualFailures++;
    }
  }

  const finalStats = permission.getStats();
  const statsIncrease = {
    checks: finalStats.permissionChecks - initialStats.permissionChecks,
    denials: finalStats.permissionDenials - initialStats.permissionDenials
  };

  console.log(`Statistics test: Expected success ${testCases.filter(t => t.expectedSuccess).length}, Actual success ${actualSuccesses}`);
  console.log(`Statistics increase: Checks ${statsIncrease.checks}, Denials ${statsIncrease.denials}`);

  // Verify statistics accuracy
  t.is(actualSuccesses, 3, 'Should have 3 successful connections');
  t.is(actualFailures, 2, 'Should have 2 failed connections');
  t.is(statsIncrease.checks, 5, 'Should track 5 permission checks');
  t.is(statsIncrease.denials, 2, 'Should track 2 permission denials');
});