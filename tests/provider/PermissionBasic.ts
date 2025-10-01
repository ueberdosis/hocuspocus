/**
 * Basic Permission System Tests  
 * Comprehensive tests for core permission functionality with token-based authentication
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
	getPermissionDisplayName,
	type PermissionChangeEvent,
	type PermissionDeniedEvent,
	type PermissionAwareProviderConfiguration
} from '../../packages/provider/src/index.ts';

// =====================================================
// Mock Infrastructure for Token Authentication
// =====================================================

class MockWebSocket {
	onmessage?: (event: any) => void;
	onopen?: (event: any) => void;
	onclose?: (event: any) => void;
	onerror?: (event: any) => void;
	readyState = 1; // OPEN
	url: string;
	
	constructor(url: string) {
		this.url = url;
		// Simulate connection establishment
		setTimeout(() => {
			this.onopen?.({ type: 'open' });
		}, 10);
	}
	
	send(data: any) {
		// Mock server response with permission data
		setTimeout(() => {
			this.simulateServerResponse(data);
		}, 5);
	}
	
	close() {
		this.readyState = 3; // CLOSED
		this.onclose?.({ code: 1000, reason: 'Test close' });
	}
	
	private simulateServerResponse(data: any) {
		// Extract token from URL for permission simulation
		const token = this.extractTokenFromUrl();
		const permissionLevel = this.getPermissionForToken(token);
		
		// Mock permission response
		const response = {
			data: JSON.stringify({
				type: 'permission-update',
				level: permissionLevel,
				reason: token ? 'Token authenticated' : 'No authentication provided',
				timestamp: Date.now()
			})
		};
		
		this.onmessage?.(response);
	}
	
	private extractTokenFromUrl(): string | null {
		try {
			const url = new URL(this.url);
			return url.searchParams.get('token');
		} catch {
			return null;
		}
	}
	
	private getPermissionForToken(token: string | null): ClientPermissionLevel {
		if (!token) return 'deny';
		
		// Demo token mapping for basic tests
		const tokenPermissions: Record<string, ClientPermissionLevel> = {
			'demo_admin': 'write',
			'demo_editor': 'write', 
			'demo_reviewer': 'read',
			'demo_viewer': 'read',
			'demo_guest': 'deny',
			'basic_test_token': 'write'
		};
		
		return tokenPermissions[token] || 'deny';
	}
}

// Setup mock WebSocket globally
const originalWebSocket = globalThis.WebSocket;
(globalThis as any).WebSocket = MockWebSocket;

// Cleanup helper
function restoreWebSocket() {
	(globalThis as any).WebSocket = originalWebSocket;
}

// =====================================================
// Factory Function Basic Tests
// =====================================================

test('createProvider - basic functionality with token authentication', async t => {
	const doc1 = new Y.Doc();
	const doc2 = new Y.Doc();
	
	// Standard provider (no token)
	const standardProvider = createProvider({
		name: 'test-doc',
		url: 'ws://localhost:1234/test-doc',
		document: doc1
	});
	
	// Permission-aware provider with token
	const permissionProvider = createPermissionAwareProvider({
		name: 'test-doc',
		url: 'ws://localhost:1234/test-doc?token=basic_test_token',
		document: doc2
	});
	
	t.truthy(standardProvider);
	t.truthy(permissionProvider);
	t.false(isPermissionAwareProvider(standardProvider));
	t.true(isPermissionAwareProvider(permissionProvider));
	
	// Wait for connection and permission setup
	await new Promise(resolve => setTimeout(resolve, 50));
	
	// Cleanup
	standardProvider.destroy();
	permissionProvider.destroy();
});

test('isPermissionAwareProvider - type detection and capabilities', async t => {
	const doc1 = new Y.Doc();
	const doc2 = new Y.Doc();
	
	const standardProvider = createProvider({
		name: 'type-test-standard',
		url: 'ws://localhost:1234/type-test',
		document: doc1
	});
	
	const permissionProvider = createPermissionAwareProvider({
		name: 'type-test-permission',
		url: 'ws://localhost:1234/type-test?token=demo_admin',
		document: doc2
	});
	
	// Type detection accuracy
	t.false(isPermissionAwareProvider(standardProvider));
	t.true(isPermissionAwareProvider(permissionProvider));
	
	// Type guard functionality - check permission-aware methods exist
	if (isPermissionAwareProvider(permissionProvider)) {
		t.is(typeof permissionProvider.hasPermission, 'function');
		t.is(typeof permissionProvider.getPermissionStats, 'function');
		t.is(typeof permissionProvider.getPermissionLevel, 'function');
	} else {
		t.fail('Permission provider should be permission-aware');
	}
	
	// Cleanup
	standardProvider.destroy();
	permissionProvider.destroy();
});

test('createPermissionAwareProvider - enterprise authentication methods', async t => {
	const doc1 = new Y.Doc();
	const doc2 = new Y.Doc();
	const doc3 = new Y.Doc();
	
	// Method 1: URL parameter authentication (most common)
	const provider1 = createPermissionAwareProvider({
		url: 'ws://localhost:1234/auth-test?token=demo_admin',
		name: 'auth-test-url',
		document: doc1
	});
	
	// Method 2: Basic authentication via token in config
	const provider2 = createPermissionAwareProvider({
		url: 'ws://localhost:1234/auth-test',
		name: 'auth-test-config', 
		document: doc2,
		token: 'demo_editor' // Simulated token parameter
	});
	
	// Method 3: No authentication (should get deny level)
	const provider3 = createPermissionAwareProvider({
		url: 'ws://localhost:1234/auth-test',
		name: 'auth-test-none',
		document: doc3
	});
	
	t.true(isPermissionAwareProvider(provider1));
	t.true(isPermissionAwareProvider(provider2));
	t.true(isPermissionAwareProvider(provider3));
	
	// Wait for authentication and permission setup
	await new Promise(resolve => setTimeout(resolve, 50));
	
	// Cleanup
	provider1.destroy();
	provider2.destroy();
	provider3.destroy();
});

// =====================================================
// Permission Level Utility Tests
// =====================================================

test('Permission level utilities - canRead and canWrite', t => {
	// Write permission allows both read and write
	t.true(canRead('write'));
	t.true(canWrite('write'));
	
	// Read permission allows read but not write
	t.true(canRead('read'));
	t.false(canWrite('read'));
	
	// Deny permission allows nothing
	t.false(canRead('deny'));
	t.false(canWrite('deny'));
});

test('Permission level utilities - getPermissionDisplayName', t => {
	t.is(getPermissionDisplayName('write'), 'Full Access');
	t.is(getPermissionDisplayName('read'), 'Read Only');
	t.is(getPermissionDisplayName('deny'), 'No Access');
});

test('Permission level hierarchy and logic', t => {
	const levels: ClientPermissionLevel[] = ['write', 'read', 'deny'];
	
	// Test permission hierarchy
	for (const level of levels) {
		if (level === 'write') {
			t.true(canRead(level));
			t.true(canWrite(level));
		} else if (level === 'read') {
			t.true(canRead(level));
			t.false(canWrite(level));
		} else if (level === 'deny') {
			t.false(canRead(level));
			t.false(canWrite(level));
		}
	}
});

// =====================================================
// PermissionAwareDocument Basic Tests
// =====================================================

test('PermissionAwareDocument - creation with different permission levels', async t => {
	// Write access document
	const writeDoc = new PermissionAwareDocument({
		documentName: 'write-doc',
		permissionConfig: {
			level: 'write'
		}
	});
	
	t.is(writeDoc.getDocumentName(), 'write-doc');
	t.is(writeDoc.getPermissionLevel(), 'write');
	t.false(writeDoc.isReadOnly());
	t.true(canWrite(writeDoc.getPermissionLevel()));
	t.true(canRead(writeDoc.getPermissionLevel()));
	
	// Read-only document
	const readDoc = new PermissionAwareDocument({
		documentName: 'read-doc',
		permissionConfig: {
			level: 'read'
		}
	});
	
	t.true(readDoc.isReadOnly());
	t.false(canWrite(readDoc.getPermissionLevel()));
	t.true(canRead(readDoc.getPermissionLevel()));
	
	// Denied access document
	const denyDoc = new PermissionAwareDocument({
		documentName: 'deny-doc',
		permissionConfig: {
			level: 'deny'
		}
	});
	
	t.false(canWrite(denyDoc.getPermissionLevel()));
	t.false(canRead(denyDoc.getPermissionLevel()));
});

test('PermissionAwareDocument - default configuration', async t => {
	const doc = new PermissionAwareDocument();
	
	// Check defaults
	t.is(doc.getDocumentName(), 'unnamed');
	t.is(doc.getPermissionLevel(), 'write'); // Default to write
	t.false(doc.isReadOnly());
	t.true(canWrite(doc.getPermissionLevel()));
});

test('PermissionAwareDocument - permission updates and events', async t => {
	let permissionChangeEvents: PermissionChangeEvent[] = [];
	
	const doc = new PermissionAwareDocument({
		documentName: 'update-test',
		permissionConfig: {
			level: 'write'
		},
		onPermissionChange: (event: PermissionChangeEvent) => {
			permissionChangeEvents.push(event);
		}
	});
	
	// Initial state
	t.is(doc.getPermissionLevel(), 'write');
	t.false(doc.isReadOnly());
	
	// Update permission to read-only
	doc.updatePermission({
		level: 'read',
		reason: 'Test permission downgrade'
	});
	
	t.is(doc.getPermissionLevel(), 'read');
	t.true(doc.isReadOnly());
	
	// Check permission change event
	await new Promise(resolve => setTimeout(resolve, 10));
	t.is(permissionChangeEvents.length, 1);
	t.is(permissionChangeEvents[0].level, 'read');
	t.is(permissionChangeEvents[0].previousLevel, 'write');
	t.is(permissionChangeEvents[0].reason, 'Test permission downgrade');
});

// =====================================================
// Permission Statistics and Monitoring
// =====================================================

test('PermissionAwareProvider - statistics functionality', async t => {
	const doc = new Y.Doc();
	
	const provider = createPermissionAwareProvider({
		url: 'ws://localhost:1234/stats-test?token=demo_editor',
		name: 'stats-test',
		document: doc
	}) as PermissionAwareProvider;
	
	// Get initial statistics
	const initialStats = provider.getPermissionStats();
	t.is(typeof initialStats.permissionChecks, 'number');
	t.is(typeof initialStats.permissionDenials, 'number');
	t.is(typeof initialStats.cacheHits, 'number');
	t.is(typeof initialStats.cacheMisses, 'number');
	
	// Execute permission checks to generate statistics
	provider.hasPermission('write');
	provider.hasPermission('read');
	provider.hasPermission('deny');
	
	const updatedStats = provider.getPermissionStats();
	t.true(updatedStats.permissionChecks >= initialStats.permissionChecks);
	
	// Reset statistics
	provider.resetPermissionStats();
	const resetStats = provider.getPermissionStats();
	t.is(resetStats.permissionChecks, 0);
	t.is(resetStats.permissionDenials, 0);
	t.is(resetStats.cacheHits, 0);
	t.is(resetStats.cacheMisses, 0);
	
	provider.destroy();
});

test('PermissionAwareDocument - statistics and performance monitoring', async t => {
	const doc = new PermissionAwareDocument({
		documentName: 'stats-doc',
		permissionConfig: {
			level: 'write'
		}
	});
	
	const initialStats = doc.getPermissionStats();
	
	// Perform operations to generate statistics
	doc.hasPermission('write');
	doc.hasPermission('read');
	doc.isReadOnly();
	doc.getPermissionLevel();
	
	const updatedStats = doc.getPermissionStats();
	t.true(updatedStats.permissionChecks > initialStats.permissionChecks);
	
	// Test statistics reset
	doc.resetPermissionStats();
	const resetStats = doc.getPermissionStats();
	t.is(resetStats.permissionChecks, 0);
	t.is(resetStats.permissionDenials, 0);
});

// =====================================================
// Y.js Integration Tests (Basic)
// =====================================================

test('PermissionAwareDocument - Y.js operations with write permission', async t => {
	const doc = new PermissionAwareDocument({
		documentName: 'yjs-write-test',
		permissionConfig: {
			level: 'write'
		}
	});
	
	// Get Y.js structures
	const yText = doc.getText('content');
	const yMap = doc.getMap('data');
	const yArray = doc.getArray('items');
	
	t.truthy(yText);
	t.truthy(yMap);
	t.truthy(yArray);
	
	// Perform Y.js operations
	t.notThrows(() => {
		yText.insert(0, 'Hello World');
		yMap.set('title', 'Test Document');
		yArray.push(['item1', 'item2']);
	});
	
	// Verify operations succeeded
	t.is(yText.toString(), 'Hello World');
	t.is(yMap.get('title'), 'Test Document');
	t.is(yArray.get(0), 'item1');
	t.is(yArray.get(1), 'item2');
});

test('PermissionAwareDocument - Y.js operations with read-only permission', async t => {
	let permissionDeniedEvents = 0;
	
	const doc = new PermissionAwareDocument({
		documentName: 'yjs-readonly-test',
		permissionConfig: {
			level: 'read'
		},
		enableClientSidePermissionCheck: true,
		onPermissionDenied: () => {
			permissionDeniedEvents++;
		}
	});
	
	const yText = doc.getText('content');
	
	// Read operations should work
	t.notThrows(() => {
		const content = yText.toString();
		t.is(typeof content, 'string');
	});
	
	// Write operations should be blocked (if client-side validation is enabled)
	if (doc.enableClientSidePermissionCheck) {
		t.throws(() => {
			doc.transact(() => {
				yText.insert(0, 'Should be blocked');
			});
		}, { message: /permission|write|denied/i });
	}
});

// =====================================================
// Provider-Document Integration
// =====================================================

test('PermissionAwareProvider and Document integration', async t => {
	const doc = new Y.Doc();
	let permissionChangeEvents = 0;
	
	const provider = createPermissionAwareProvider({
		url: 'ws://localhost:1234/integration-test?token=demo_editor',
		name: 'integration-test',
		document: doc,
		enableClientSidePermissionCheck: true,
		onPermissionChange: (event) => {
			permissionChangeEvents++;
		}
	}) as PermissionAwareProvider;
	
	// Wait for connection and permission setup
	await new Promise(resolve => setTimeout(resolve, 50));
	
	// Test provider-document synchronization
	t.true(isPermissionAwareProvider(provider));
	t.true(provider.hasPermission('write'));
	
	// Test document operations through provider
	const yText = doc.getText('content');
	t.notThrows(() => {
		yText.insert(0, 'Provider integration test');
	});
	
	t.is(yText.toString(), 'Provider integration test');
	
	provider.destroy();
});

// =====================================================
// Error Handling and Edge Cases
// =====================================================

test('Permission system error handling', async t => {
	const doc = new Y.Doc();
	
	// Test with invalid token
	const provider = createPermissionAwareProvider({
		url: 'ws://localhost:1234/error-test?token=invalid_token',
		name: 'error-test',
		document: doc
	});
	
	// Should create provider successfully even with invalid token
	t.truthy(provider);
	t.true(isPermissionAwareProvider(provider));
	
	// Wait for connection attempt
	await new Promise(resolve => setTimeout(resolve, 50));
	
	provider.destroy();
});

test('Permission system with connection failures', async t => {
	const doc = new Y.Doc();
	let connectionErrorCount = 0;
	
	const provider = createPermissionAwareProvider({
		url: 'ws://invalid-host:9999/connection-test?token=demo_admin',
		name: 'connection-test',
		document: doc,
		onPermissionDenied: () => {
			connectionErrorCount++;
		}
	});
	
	t.truthy(provider);
	
	// Even with connection errors, provider should be functional
	t.true(isPermissionAwareProvider(provider));
	
	provider.destroy();
});

// =====================================================
// Resource Cleanup Tests
// =====================================================

test('Resource cleanup - Provider lifecycle management', async t => {
	const doc = new Y.Doc();
	
	const provider = createPermissionAwareProvider({
		url: 'ws://localhost:1234/cleanup-test?token=demo_admin',
		name: 'cleanup-test',
		document: doc
	});
	
	// Wait for initialization
	await new Promise(resolve => setTimeout(resolve, 30));
	
	// Verify provider is working
	t.truthy(provider);
	t.true(isPermissionAwareProvider(provider));
	
	// Test proper cleanup
	t.notThrows(() => {
		provider.destroy();
	});
});

test('Resource cleanup - Document lifecycle management', async t => {
	const doc = new PermissionAwareDocument({
		documentName: 'cleanup-doc-test',
		permissionConfig: {
			level: 'write'
		}
	});
	
	// Execute some operations to initialize internal state
	doc.getText('test');
	doc.getPermissionStats();
	doc.hasPermission('write');
	
	// Test proper cleanup
	t.notThrows(() => {
		doc.destroy();
	});
});

// =====================================================
// Performance and Optimization Tests
// =====================================================

test('Permission checking performance', async t => {
	const doc = new PermissionAwareDocument({
		permissionConfig: {
			level: 'write'
		}
	});
	
	// Execute many permission checks to test performance
	const startTime = Date.now();
	const iterations = 1000;
	
	for (let i = 0; i < iterations; i++) {
		doc.hasPermission('write');
		doc.hasPermission('read');
		doc.isReadOnly();
	}
	
	const duration = Date.now() - startTime;
	
	// Should complete quickly (allow generous time for CI environments)
	t.true(duration < 100, `Permission checks took too long: ${duration}ms`);
	
	// Verify statistics were updated
	const stats = doc.getPermissionStats();
	t.true(stats.permissionChecks >= iterations * 3);
});

// Cleanup after all tests
test.after(() => {
	restoreWebSocket();
});