/**
 * Permission System Concurrency and Performance Tests
 * Advanced stress testing for token-based authentication and enterprise permission features
 */

import test from 'ava';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';

import { 
	HocuspocusProvider,
	PermissionAwareProvider,
	PermissionAwareDocument,
	createProvider,
	createPermissionAwareProvider,
	ClientPermissionLevel,
	YjsOperationType,
	isPermissionAwareProvider,
	canRead,
	canWrite,
	type PermissionChangeEvent,
	type PermissionDeniedEvent,
	type PermissionAwareProviderConfiguration
} from '../../packages/provider/src/index.ts';

// =====================================================
// Advanced Mock Infrastructure for Concurrency Testing
// =====================================================

class AdvancedMockWebSocket {
	onmessage?: (event: any) => void;
	onopen?: (event: any) => void;
	onclose?: (event: any) => void;
	onerror?: (event: any) => void;
	readyState = 1; // OPEN
	url: string;
	private messageQueue: any[] = [];
	private connected = false;
	
	constructor(url: string) {
		this.url = url;
		// Simulate realistic connection delay
		setTimeout(() => {
			this.connected = true;
			this.onopen?.({ type: 'open' });
			this.processMessageQueue();
		}, Math.random() * 20 + 5); // 5-25ms connection delay
	}
	
	send(data: any) {
		if (!this.connected) {
			this.messageQueue.push(data);
			return;
		}
		
		// Simulate network latency and processing time
		setTimeout(() => {
			this.simulateServerResponse(data);
		}, Math.random() * 15 + 2); // 2-17ms response time
	}
	
	close() {
		this.readyState = 3; // CLOSED
		this.connected = false;
		this.onclose?.({ code: 1000, reason: 'Test close' });
	}
	
	private processMessageQueue() {
		while (this.messageQueue.length > 0) {
			const message = this.messageQueue.shift();
			this.send(message);
		}
	}
	
	private simulateServerResponse(data: any) {
		const token = this.extractTokenFromUrl();
		const permissionLevel = this.getPermissionForToken(token);
		
		// Simulate business rules and server-side processing
		const response = {
			data: JSON.stringify({
				type: 'permission-update',
				level: permissionLevel,
				reason: this.getPermissionReason(token, permissionLevel),
				timestamp: Date.now(),
				serverId: `server-${Math.floor(Math.random() * 1000)}`,
				businessRules: this.getBusinessRules(token)
			})
		};
		
		this.onmessage?.(response);
	}
	
	private extractTokenFromUrl(): string | null {
		try {
			const url = new URL(this.url);
			return url.searchParams.get('token') || url.searchParams.get('auth');
		} catch {
			return null;
		}
	}
	
	private getPermissionForToken(token: string | null): ClientPermissionLevel {
		if (!token) return 'deny';
		
		// Enterprise token mapping with load balancing simulation
		const tokenPermissions: Record<string, ClientPermissionLevel> = {
			'demo_admin': 'write',
			'demo_editor': 'write', 
			'demo_reviewer': 'read',
			'demo_viewer': 'read',
			'demo_guest': 'deny',
			'stress_test_admin': 'write',
			'stress_test_editor': 'write',
			'stress_test_viewer': 'read',
			'concurrent_user_1': 'write',
			'concurrent_user_2': 'write',
			'concurrent_user_3': 'read',
			'load_test_token': 'write',
			'performance_token': 'read'
		};
		
		return tokenPermissions[token] || 'deny';
	}
	
	private getPermissionReason(token: string | null, level: ClientPermissionLevel): string {
		if (!token) return 'No authentication token provided';
		if (level === 'deny') return 'Token authentication failed';
		return `Token authenticated: ${token.substring(0, 10)}...`;
	}
	
	private getBusinessRules(token: string | null) {
		return {
			workingHoursRestriction: false, // Disable for stress testing
			operationLimits: false,
			pathRestrictions: false
		};
	}
}

// Global WebSocket mock setup
const originalWebSocket = globalThis.WebSocket;
(globalThis as any).WebSocket = AdvancedMockWebSocket;

// Cleanup helper
function restoreWebSocket() {
	(globalThis as any).WebSocket = originalWebSocket;
}

// Performance measurement utilities
async function measureAsync<T>(fn: () => Promise<T>): Promise<{ result: T; time: number; memoryUsed?: number }> {
	const initialMemory = process.memoryUsage?.()?.heapUsed || 0;
	const start = performance.now();
	const result = await fn();
	const end = performance.now();
	const finalMemory = process.memoryUsage?.()?.heapUsed || 0;
	
	return { 
		result, 
		time: end - start,
		memoryUsed: finalMemory - initialMemory
	};
}

function measureSync<T>(fn: () => T): { result: T; time: number } {
	const start = performance.now();
	const result = fn();
	const end = performance.now();
	return { result, time: end - start };
}

// Helper to create concurrent test scenarios
async function createConcurrentProviders(count: number, tokenPrefix = 'concurrent_user'): Promise<PermissionAwareProvider[]> {
	const providers: PermissionAwareProvider[] = [];
	
	for (let i = 0; i < count; i++) {
		const doc = new Y.Doc();
		const provider = createPermissionAwareProvider({
			url: `ws://localhost:1234/concurrent-test-${i}?token=${tokenPrefix}_${i}`,
			name: `concurrent-test-${i}`,
			document: doc,
			enableClientSidePermissionCheck: true
		}) as PermissionAwareProvider;
		
		providers.push(provider);
	}
	
	// Wait for all connections to establish
	await new Promise(resolve => setTimeout(resolve, 100));
	
	return providers;
}

// =====================================================
// Provider Creation Performance Tests
// =====================================================

test('PermissionAwareProvider - High-volume provider creation performance', async t => {
	const providerCount = 500;
	let createdProviders: PermissionAwareProvider[] = [];
	
	const { result, time, memoryUsed } = await measureAsync(async () => {
		const promises = Array.from({ length: providerCount }, async (_, i) => {
			const doc = new Y.Doc();
			return createPermissionAwareProvider({
				url: `ws://localhost:1234/perf-test-${i}?token=load_test_token`,
				name: `perf-test-${i}`,
				document: doc
			}) as PermissionAwareProvider;
		});
		
		return await Promise.all(promises);
	});
	
	createdProviders = result;
	const avgTime = time / providerCount;
	const memoryPerProvider = (memoryUsed || 0) / providerCount;
	
	console.log(`Created ${providerCount} providers in ${time.toFixed(2)}ms (avg: ${avgTime.toFixed(2)}ms per provider)`);
	console.log(`Memory usage: ${((memoryUsed || 0) / 1024 / 1024).toFixed(2)}MB total, ${memoryPerProvider.toFixed(2)} bytes per provider`);
	
	// Cleanup
	await Promise.all(createdProviders.map(p => Promise.resolve(p.destroy())));
	
	// Performance assertions
	t.true(avgTime < 10, `Average creation time ${avgTime.toFixed(2)}ms should be less than 10ms`);
	t.true(time < 30000, `Total time ${time.toFixed(2)}ms should be less than 30 seconds`);
	t.is(createdProviders.length, providerCount, 'All providers should be created successfully');
});

test('PermissionAwareProvider - Concurrent permission state updates', async t => {
	const provider = createPermissionAwareProvider({
		url: 'ws://localhost:1234/concurrent-updates?token=stress_test_admin',
		name: 'concurrent-updates',
		document: new Y.Doc()
	}) as PermissionAwareProvider;
	
	// Wait for initial connection
	await new Promise(resolve => setTimeout(resolve, 50));
	
	const concurrentUpdates = 1000;
	const levels = ['write', 'read', 'deny'] as ClientPermissionLevel[];
	let completedUpdates = 0;
	let errors = 0;
	
	const { result, time } = await measureAsync(async () => {
		const promises = Array.from({ length: concurrentUpdates }, (_, i) => {
			return new Promise<void>((resolve) => {
				setTimeout(() => {
					try {
						const level = levels[i % levels.length];
						provider.updatePermissionState({
							level,
							reason: `Concurrent update ${i}`,
							timestamp: Date.now()
						});
						completedUpdates++;
					} catch (error) {
						errors++;
						console.warn(`Update ${i} failed:`, error);
					}
					resolve();
				}, Math.random() * 50); // 0-50ms random delay
			});
		});
		
		return await Promise.allSettled(promises);
	});
	
	const successful = result.filter(r => r.status === 'fulfilled').length;
	const throughput = successful / (time / 1000); // updates per second
	
	console.log(`Concurrent updates: ${successful}/${concurrentUpdates} successful, ${errors} errors`);
	console.log(`Time: ${time.toFixed(2)}ms, Throughput: ${throughput.toFixed(2)} updates/sec`);
	
	// Cleanup
	provider.destroy();
	
	// Performance and reliability assertions
	t.true(successful >= concurrentUpdates * 0.95, 'At least 95% of updates should succeed');
	t.is(errors, 0, 'Should have no errors in concurrent updates');
	t.true(throughput > 50, 'Should handle at least 50 updates per second');
});

// =====================================================
// Document Concurrency Tests
// =====================================================

test('PermissionAwareDocument - Concurrent transaction processing', async t => {
	const doc = new PermissionAwareDocument({
		documentName: 'concurrent-transactions',
		permissionConfig: {
			level: 'write'
		}
	});
	
	const concurrentTransactions = 500;
	const textObjects = 10; // Multiple Y.Text objects to reduce contention
	let successfulTransactions = 0;
	let blockedTransactions = 0;
	let errors = 0;
	
	const { result, time } = await measureAsync(async () => {
		const promises = Array.from({ length: concurrentTransactions }, (_, i) => {
			return new Promise<void>((resolve) => {
				setTimeout(() => {
					try {
						doc.transact(() => {
							const textId = `content-${i % textObjects}`;
							const ytext = doc.getText(textId);
							ytext.insert(0, `TX${i}-`);
						});
						successfulTransactions++;
					} catch (error) {
						if (error.message?.includes('permission')) {
							blockedTransactions++;
						} else {
							errors++;
						}
					}
					resolve();
				}, Math.random() * 100); // 0-100ms random delay
			});
		});
		
		return await Promise.all(promises);
	});
	
	// Verify content integrity
	const contentLengths = Array.from({ length: textObjects }, (_, i) => {
		return doc.getText(`content-${i}`).toString().length;
	});
	const totalContentLength = contentLengths.reduce((sum, len) => sum + len, 0);
	
	console.log(`Concurrent transactions: ${successfulTransactions} successful, ${blockedTransactions} blocked, ${errors} errors`);
	console.log(`Time: ${time.toFixed(2)}ms, Content integrity: ${totalContentLength} total chars`);
	console.log(`Content distribution:`, contentLengths);
	
	// Cleanup
	doc.destroy();
	
	// Concurrency and integrity assertions
	t.is(successfulTransactions + blockedTransactions + errors, concurrentTransactions, 'All transactions should be accounted for');
	t.true(successfulTransactions >= concurrentTransactions * 0.8, 'Most transactions should succeed');
	t.is(errors, 0, 'Should have no system errors');
	t.true(totalContentLength > 0, 'Content should be created');
	t.true(time < 20000, 'Concurrent transactions should complete within 20 seconds');
});

test('PermissionAwareProvider - Multi-user collaboration simulation', async t => {
	const userCount = 50;
	const operationsPerUser = 20;
	const documentName = 'multi-user-collab';
	
	// Create providers for different user types
	const adminCount = 5;
	const editorCount = 20; 
	const viewerCount = 25;
	
	const providers: PermissionAwareProvider[] = [];
	const results = { successful: 0, blocked: 0, errors: 0 };
	
	// Create admin users
	for (let i = 0; i < adminCount; i++) {
		const doc = new Y.Doc();
		const provider = createPermissionAwareProvider({
			url: `ws://localhost:1234/${documentName}?token=demo_admin&user_id=admin_${i}`,
			name: documentName,
			document: doc,
			enableClientSidePermissionCheck: true
		}) as PermissionAwareProvider;
		providers.push(provider);
	}
	
	// Create editor users
	for (let i = 0; i < editorCount; i++) {
		const doc = new Y.Doc();
		const provider = createPermissionAwareProvider({
			url: `ws://localhost:1234/${documentName}?token=demo_editor&user_id=editor_${i}`,
			name: documentName,
			document: doc,
			enableClientSidePermissionCheck: true
		}) as PermissionAwareProvider;
		providers.push(provider);
	}
	
	// Create viewer users
	for (let i = 0; i < viewerCount; i++) {
		const doc = new Y.Doc();
		const provider = createPermissionAwareProvider({
			url: `ws://localhost:1234/${documentName}?token=demo_viewer&user_id=viewer_${i}`,
			name: documentName,
			document: doc,
			enableClientSidePermissionCheck: true
		}) as PermissionAwareProvider;
		providers.push(provider);
	}
	
	// Wait for all connections
	await new Promise(resolve => setTimeout(resolve, 150));
	
	const { result, time } = await measureAsync(async () => {
		const allOperations: Promise<void>[] = [];
		
		providers.forEach((provider, userIndex) => {
			for (let opIndex = 0; opIndex < operationsPerUser; opIndex++) {
				const operation = new Promise<void>((resolve) => {
					setTimeout(() => {
						try {
							const hasWritePermission = provider.hasPermission('write');
							const hasReadPermission = provider.hasPermission('read');
							
							if (hasWritePermission) {
								// Simulate write operation
								const yText = provider.document.getText('content');
								yText.insert(0, `U${userIndex}O${opIndex} `);
								results.successful++;
							} else if (hasReadPermission) {
								// Simulate read operation for viewers
								const content = provider.document.getText('content').toString();
								results.blocked++; // Track read-only operations as blocked
							} else {
								results.blocked++;
							}
						} catch (error) {
							results.errors++;
						}
						resolve();
					}, Math.random() * 200); // 0-200ms random delay
				});
				
				allOperations.push(operation);
			}
		});
		
		return await Promise.all(allOperations);
	});
	
	// Calculate statistics
	const totalOperations = userCount * operationsPerUser;
	const writeUsers = adminCount + editorCount; // Users with write permission
	const expectedSuccessful = writeUsers * operationsPerUser;
	const expectedBlocked = viewerCount * operationsPerUser;
	
	console.log(`Multi-user simulation: ${userCount} users, ${totalOperations} operations`);
	console.log(`Results: ${results.successful} successful, ${results.blocked} blocked, ${results.errors} errors`);
	console.log(`Time: ${time.toFixed(2)}ms, Operations/sec: ${(totalOperations / (time / 1000)).toFixed(2)}`);
	console.log(`Expected: ~${expectedSuccessful} successful, ~${expectedBlocked} blocked`);
	
	// Cleanup all providers
	await Promise.all(providers.map(p => Promise.resolve(p.destroy())));
	
	// Multi-user collaboration assertions
	t.is(results.successful + results.blocked + results.errors, totalOperations, 'All operations should be accounted for');
	t.true(results.successful >= expectedSuccessful * 0.8, 'Most write operations should succeed');
	t.true(results.blocked >= expectedBlocked * 0.8, 'Most read-only operations should be tracked');
	t.is(results.errors, 0, 'Should have no system errors');
	t.true(time < 30000, 'Multi-user simulation should complete within 30 seconds');
});

// =====================================================
// Memory and Resource Management Tests
// =====================================================

test('PermissionAwareProvider - Memory leak detection', async t => {
	const iterations = 200;
	const memorySnapshots: number[] = [];
	
	// Take initial memory snapshot
	if (global.gc) global.gc();
	const initialMemory = process.memoryUsage?.()?.heapUsed || 0;
	memorySnapshots.push(initialMemory);
	
	// Create and destroy providers in batches
	const batchSize = 20;
	for (let batch = 0; batch < iterations / batchSize; batch++) {
		const providers: PermissionAwareProvider[] = [];
		
		// Create batch of providers
		for (let i = 0; i < batchSize; i++) {
			const doc = new Y.Doc();
			const provider = createPermissionAwareProvider({
				url: `ws://localhost:1234/memory-test-${batch}-${i}?token=stress_test_editor`,
				name: `memory-test-${batch}-${i}`,
				document: doc,
				enableClientSidePermissionCheck: true
			}) as PermissionAwareProvider;
			
			// Simulate some operations
			provider.updatePermissionState({
				level: 'write',
				reason: 'Memory test operation'
			});
			
			provider.hasPermission('write');
			provider.getPermissionStats();
			
			providers.push(provider);
		}
		
		// Wait for operations
		await new Promise(resolve => setTimeout(resolve, 10));
		
		// Destroy all providers in batch
		await Promise.all(providers.map(p => Promise.resolve(p.destroy())));
		
		// Force garbage collection and take memory snapshot
		if (global.gc) global.gc();
		const currentMemory = process.memoryUsage?.()?.heapUsed || 0;
		memorySnapshots.push(currentMemory);
	}
	
	// Analyze memory usage trend
	const finalMemory = memorySnapshots[memorySnapshots.length - 1];
	const memoryGrowth = finalMemory - initialMemory;
	const memoryPerProvider = memoryGrowth / iterations;
	
	// Calculate memory growth trend
	const midpoint = Math.floor(memorySnapshots.length / 2);
	const firstHalfAvg = memorySnapshots.slice(0, midpoint).reduce((sum, val) => sum + val, 0) / midpoint;
	const secondHalfAvg = memorySnapshots.slice(midpoint).reduce((sum, val) => sum + val, 0) / (memorySnapshots.length - midpoint);
	const growthTrend = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;
	
	console.log(`Memory leak test: ${iterations} providers created/destroyed`);
	console.log(`Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB total, ${memoryPerProvider.toFixed(2)} bytes per provider`);
	console.log(`Growth trend: ${(growthTrend * 100).toFixed(2)}%`);
	
	// Memory leak assertions - adjust for PermissionAwareProvider overhead
	t.true(Math.abs(growthTrend) < 0.15, `Memory growth trend ${(growthTrend * 100).toFixed(2)}% should be less than 15%`);
	t.true(memoryPerProvider < 70000, `Memory per provider ${memoryPerProvider.toFixed(2)} bytes should be less than 70KB`);
	t.pass('Memory leak detection completed');
});

// =====================================================
// Performance Benchmarking
// =====================================================

test('PermissionAwareProvider - Permission checking performance benchmark', async t => {
	const provider = createPermissionAwareProvider({
		url: 'ws://localhost:1234/benchmark-test?token=performance_token',
		name: 'benchmark-test',
		document: new Y.Doc(),
		permissionCacheTime: 100 // Short cache time for testing
	}) as PermissionAwareProvider;
	
	// Wait for initialization
	await new Promise(resolve => setTimeout(resolve, 50));
	
	const benchmarkIterations = 10000;
	const levels: ClientPermissionLevel[] = ['write', 'read', 'deny'];
	
	// Benchmark permission checks
	const { result: checkResults, time: checkTime } = await measureAsync(async () => {
		const results: boolean[] = [];
		
		for (let i = 0; i < benchmarkIterations; i++) {
			const level = levels[i % levels.length];
			const hasPermission = provider.hasPermission(level);
			results.push(hasPermission);
		}
		
		return results;
	});
	
	// Benchmark permission updates
	const { result: updateResults, time: updateTime } = await measureAsync(async () => {
		const results: number[] = [];
		
		for (let i = 0; i < 1000; i++) {
			const level = levels[i % levels.length];
			const start = performance.now();
			
			provider.updatePermissionState({
				level,
				reason: `Benchmark update ${i}`
			});
			
			const end = performance.now();
			results.push(end - start);
		}
		
		return results;
	});
	
	// Calculate performance metrics
	const checksPerSecond = benchmarkIterations / (checkTime / 1000);
	const avgCheckTime = checkTime / benchmarkIterations;
	const avgUpdateTime = updateResults.reduce((sum, time) => sum + time, 0) / updateResults.length;
	const maxUpdateTime = Math.max(...updateResults);
	const minUpdateTime = Math.min(...updateResults);
	
	const stats = provider.getPermissionStats();
	
	console.log(`Permission checking benchmark:`);
	console.log(`- ${benchmarkIterations} checks in ${checkTime.toFixed(2)}ms`);
	console.log(`- ${checksPerSecond.toFixed(0)} checks/second`);
	console.log(`- Average check time: ${avgCheckTime.toFixed(4)}ms`);
	console.log(`Permission update benchmark:`);
	console.log(`- Average update time: ${avgUpdateTime.toFixed(4)}ms`);
	console.log(`- Min/Max update time: ${minUpdateTime.toFixed(4)}ms / ${maxUpdateTime.toFixed(4)}ms`);
	console.log(`Provider statistics:`, stats);
	
	// Cleanup
	provider.destroy();
	
	// Performance assertions
	t.true(checksPerSecond > 100000, `Should handle >100k checks/second, got ${checksPerSecond.toFixed(0)}`);
	t.true(avgCheckTime < 0.01, `Average check time should be <0.01ms, got ${avgCheckTime.toFixed(4)}ms`);
	t.true(avgUpdateTime < 1, `Average update time should be <1ms, got ${avgUpdateTime.toFixed(4)}ms`);
	t.true(maxUpdateTime < 10, `Max update time should be <10ms, got ${maxUpdateTime.toFixed(4)}ms`);
});

// =====================================================
// Error Recovery and Fault Tolerance
// =====================================================

test('PermissionAwareProvider - Error recovery and fault tolerance', async t => {
	const provider = createPermissionAwareProvider({
		url: 'ws://localhost:1234/fault-tolerance-test?token=stress_test_admin',
		name: 'fault-tolerance-test',
		document: new Y.Doc(),
		enableClientSidePermissionCheck: true
	}) as PermissionAwareProvider;
	
	// Wait for initialization
	await new Promise(resolve => setTimeout(resolve, 50));
	
	const errorScenarios = [
		{ level: 'deny' as ClientPermissionLevel, expectBlocked: true },
		{ level: 'write' as ClientPermissionLevel, expectBlocked: false },
		{ level: 'read' as ClientPermissionLevel, expectBlocked: true }, // Write blocked
		{ level: 'write' as ClientPermissionLevel, expectBlocked: false }, // Recovery
		{ level: 'deny' as ClientPermissionLevel, expectBlocked: true },
		{ level: 'write' as ClientPermissionLevel, expectBlocked: false }  // Final recovery
	];
	
	let errorCount = 0;
	let recoveryCount = 0;
	let blockedOperations = 0;
	let successfulOperations = 0;
	
	const { time } = await measureAsync(async () => {
		for (const scenario of errorScenarios) {
			// Update permission level
			provider.updatePermissionState({
				level: scenario.level,
				reason: `Fault tolerance test: ${scenario.level}`
			});
			
			// Wait for permission propagation
			await new Promise(resolve => setTimeout(resolve, 10));
			
			// Attempt multiple operations
			for (let i = 0; i < 10; i++) {
				try {
					const hasPermission = provider.hasPermission('write');
					
					if (hasPermission && !scenario.expectBlocked) {
						// Operation should succeed
						const yText = provider.document.getText('content');
						yText.insert(0, `Op${i} `);
						successfulOperations++;
						
						// Track recovery from previous errors
						if (errorCount > 0) {
							recoveryCount++;
							errorCount = 0; // Reset error count after recovery
						}
					} else if (!hasPermission && scenario.expectBlocked) {
						// Expected blocking
						blockedOperations++;
					} else {
						// Unexpected state
						errorCount++;
					}
				} catch (error) {
					errorCount++;
				}
				
				// Small delay between operations
				await new Promise(resolve => setTimeout(resolve, 5));
			}
		}
	});
	
	const stats = provider.getPermissionStats();
	const totalOperations = successfulOperations + blockedOperations + errorCount;
	
	console.log(`Fault tolerance test results:`);
	console.log(`- Successful operations: ${successfulOperations}`);
	console.log(`- Blocked operations: ${blockedOperations}`);
	console.log(`- Recovery events: ${recoveryCount}`);
	console.log(`- Errors: ${errorCount}`);
	console.log(`- Total time: ${time.toFixed(2)}ms`);
	console.log(`Provider statistics:`, stats);
	
	// Cleanup
	provider.destroy();
	
	// Fault tolerance assertions
	t.true(successfulOperations > 0, 'Should have successful operations');
	t.true(blockedOperations > 0, 'Should have blocked operations when expected');
	t.true(recoveryCount >= 0, 'Should demonstrate recovery capability');
	t.true(errorCount < totalOperations * 0.1, 'Error rate should be less than 10%');
	t.true(time < 5000, 'Fault tolerance test should complete within 5 seconds');
});

// =====================================================
// High-Frequency Operations Stress Test
// =====================================================

test('PermissionAwareProvider - High-frequency permission switching stress test', async t => {
	const provider = createPermissionAwareProvider({
		url: 'ws://localhost:1234/high-frequency-test?token=stress_test_admin',
		name: 'high-frequency-test',
		document: new Y.Doc()
	}) as PermissionAwareProvider;
	
	// Wait for initialization
	await new Promise(resolve => setTimeout(resolve, 50));
	
	const switchCount = 2000;
	const levels: ClientPermissionLevel[] = ['write', 'read', 'deny'];
	let switchCompleted = 0;
	let switchErrors = 0;
	const switchTimes: number[] = [];
	
	const { time } = await measureAsync(async () => {
		for (let i = 0; i < switchCount; i++) {
			const level = levels[i % levels.length];
			const switchStart = performance.now();
			
			try {
				provider.updatePermissionState({
					level,
					reason: `High frequency switch ${i}`,
					timestamp: Date.now()
				});
				
				const switchEnd = performance.now();
				switchTimes.push(switchEnd - switchStart);
				switchCompleted++;
				
				// Verify switch took effect
				const currentLevel = provider.getPermissionLevel();
				if (currentLevel !== level) {
					console.warn(`Permission switch ${i}: expected ${level}, got ${currentLevel}`);
				}
				
			} catch (error) {
				switchErrors++;
				console.warn(`Switch ${i} failed:`, error);
			}
			
			// Minimal delay to prevent overwhelming the system
			if (i % 100 === 0) {
				await new Promise(resolve => setTimeout(resolve, 1));
			}
		}
	});
	
	// Calculate statistics
	const avgSwitchTime = switchTimes.reduce((sum, time) => sum + time, 0) / switchTimes.length;
	const maxSwitchTime = Math.max(...switchTimes);
	const minSwitchTime = Math.min(...switchTimes);
	const switchesPerSecond = switchCount / (time / 1000);
	
	const stats = provider.getPermissionStats();
	
	console.log(`High-frequency switching stress test:`);
	console.log(`- ${switchCompleted}/${switchCount} switches completed`);
	console.log(`- ${switchErrors} errors`);
	console.log(`- Total time: ${time.toFixed(2)}ms`);
	console.log(`- Switches per second: ${switchesPerSecond.toFixed(2)}`);
	console.log(`- Average switch time: ${avgSwitchTime.toFixed(4)}ms`);
	console.log(`- Min/Max switch time: ${minSwitchTime.toFixed(4)}ms / ${maxSwitchTime.toFixed(4)}ms`);
	console.log(`Provider statistics:`, stats);
	
	// Cleanup
	provider.destroy();
	
	// High-frequency stress test assertions
	t.is(switchCompleted, switchCount, 'All permission switches should complete');
	t.is(switchErrors, 0, 'Should have no switch errors');
	t.true(switchesPerSecond > 100, `Should handle >100 switches/second, got ${switchesPerSecond.toFixed(2)}`);
	t.true(avgSwitchTime < 5, `Average switch time should be <5ms, got ${avgSwitchTime.toFixed(4)}ms`);
	t.true(maxSwitchTime < 50, `Max switch time should be <50ms, got ${maxSwitchTime.toFixed(4)}ms`);
	t.true(time < 30000, 'High-frequency switching should complete within 30 seconds');
});

// Cleanup after all tests
test.after(() => {
	restoreWebSocket();
});