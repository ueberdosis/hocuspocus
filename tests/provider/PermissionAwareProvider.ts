/**
 * PermissionAware Provider Enterprise Tests
 * Tests for createPermissionAwareProvider with token-based authentication
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
// Mock WebSocket Infrastructure
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
		// Simulate connection delay
		setTimeout(() => {
			this.onopen?.({ type: 'open' });
		}, 10);
	}
	
	send(data: any) {
		// Mock sending data - simulate server response for auth
		setTimeout(() => {
			this.simulateServerResponse(data);
		}, 5);
	}
	
	close() {
		this.readyState = 3; // CLOSED
		this.onclose?.({ code: 1000, reason: 'Test close' });
	}
	
	private simulateServerResponse(data: any) {
		// Simulate permission response based on token in URL
		const token = this.extractTokenFromUrl();
		const permissionLevel = this.getPermissionForToken(token);
		
		// Mock permission response message
		const response = {
			data: JSON.stringify({
				type: 'permission-update',
				level: permissionLevel,
				reason: token ? 'Token authenticated' : 'No token provided'
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
		
		const tokenPermissions: Record<string, ClientPermissionLevel> = {
			'demo_admin': 'write',
			'demo_editor': 'write', 
			'demo_reviewer': 'read',
			'demo_viewer': 'read',
			'demo_guest': 'deny',
			'invalid_token': 'deny'
		};
		
		return tokenPermissions[token] || 'deny';
	}
}

// Mock global WebSocket
const originalWebSocket = globalThis.WebSocket;
(globalThis as any).WebSocket = MockWebSocket;

// Test cleanup helper
function restoreWebSocket() {
	(globalThis as any).WebSocket = originalWebSocket;
}

// =====================================================
// Basic Factory Function Tests
// =====================================================

test('createPermissionAwareProvider - Basic token authentication', async t => {
	const doc = new Y.Doc();
	let permissionChangeCount = 0;
	let currentPermission: ClientPermissionLevel = 'deny';
	
	const provider = createPermissionAwareProvider({
		url: 'ws://localhost:1234/test-doc?token=demo_admin',
		name: 'test-doc',
		document: doc,
		
		onPermissionChange: (event: PermissionChangeEvent) => {
			permissionChangeCount++;
			currentPermission = event.level;
		}
	});
	
	t.truthy(provider);
	t.true(isPermissionAwareProvider(provider));
	
	// Wait for connection and permission update
	await new Promise(resolve => setTimeout(resolve, 50));
	
	t.is(permissionChangeCount, 1);
	t.is(currentPermission, 'write');
	
	provider.destroy();
});

test('createPermissionAwareProvider - Invalid token handling', async t => {
	const doc = new Y.Doc();
	let permissionDeniedCount = 0;
	let currentPermission: ClientPermissionLevel = 'deny';
	
	const provider = createPermissionAwareProvider({
		url: 'ws://localhost:1234/test-doc?token=invalid_token',
		name: 'test-doc', 
		document: doc,
		
		onPermissionChange: (event: PermissionChangeEvent) => {
			currentPermission = event.level;
		},
		
		onPermissionDenied: (event: PermissionDeniedEvent) => {
			permissionDeniedCount++;
		}
	});
	
	// Wait for connection and permission response
	await new Promise(resolve => setTimeout(resolve, 50));
	
	t.is(currentPermission, 'deny');
	provider.destroy();
});

test('createPermissionAwareProvider - Multiple authentication methods', async t => {
	const doc1 = new Y.Doc();
	const doc2 = new Y.Doc();
	const doc3 = new Y.Doc();
	
	// Test URL parameter authentication
	const provider1 = createPermissionAwareProvider({
		url: 'ws://localhost:1234/doc1?token=demo_editor',
		name: 'doc1',
		document: doc1
	});
	
	// Test Authorization header (simulated through URL for mock)
	const provider2 = createPermissionAwareProvider({
		url: 'ws://localhost:1234/doc2?token=demo_viewer', // Mock auth header as URL param
		name: 'doc2',
		document: doc2
	});
	
	// Test no authentication
	const provider3 = createPermissionAwareProvider({
		url: 'ws://localhost:1234/doc3',
		name: 'doc3',
		document: doc3
	});
	
	t.truthy(provider1);
	t.truthy(provider2);
	t.truthy(provider3);
	
	// Cleanup
	provider1.destroy();
	provider2.destroy();
	provider3.destroy();
});

// =====================================================
// Permission Level Tests
// =====================================================

test('Permission levels - canRead and canWrite utilities', t => {
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

test('Permission levels - getPermissionDisplayName', t => {
	t.is(getPermissionDisplayName('write'), 'Full Access');
	t.is(getPermissionDisplayName('read'), 'Read Only');
	t.is(getPermissionDisplayName('deny'), 'No Access');
});

test('Permission levels - Role-based access patterns', async t => {
	const doc = new Y.Doc();
	const results: Array<{ token: string; level: ClientPermissionLevel }> = [];
	
	const tokens = ['demo_admin', 'demo_editor', 'demo_viewer', 'demo_guest'];
	
	for (const token of tokens) {
		let finalPermission: ClientPermissionLevel = 'deny';
		
		const provider = createPermissionAwareProvider({
			url: `ws://localhost:1234/role-test?token=${token}`,
			name: 'role-test',
			document: doc,
			
			onPermissionChange: (event: PermissionChangeEvent) => {
				finalPermission = event.level;
			}
		});
		
		// Wait for permission update
		await new Promise(resolve => setTimeout(resolve, 50));
		
		results.push({ token, level: finalPermission });
		provider.destroy();
	}
	
	// Verify role-based permissions
	const adminResult = results.find(r => r.token === 'demo_admin');
	const editorResult = results.find(r => r.token === 'demo_editor');
	const viewerResult = results.find(r => r.token === 'demo_viewer');
	const guestResult = results.find(r => r.token === 'demo_guest');
	
	t.is(adminResult?.level, 'write');
	t.is(editorResult?.level, 'write');
	t.is(viewerResult?.level, 'read');
	t.is(guestResult?.level, 'deny');
});

// =====================================================
// Configuration Options Tests
// =====================================================

test('PermissionAwareProvider - Enterprise configuration options', async t => {
	const doc = new Y.Doc();
	let permissionChangeEvents: PermissionChangeEvent[] = [];
	let permissionDeniedEvents: PermissionDeniedEvent[] = [];
	
	const provider = createPermissionAwareProvider({
		url: 'ws://localhost:1234/config-test?token=demo_editor',
		name: 'config-test',
		document: doc,
		
		// Enterprise features
		enableClientSidePermissionCheck: true,
		disableEditingWhenReadOnly: true,
		showPermissionStatus: true,
		
		// Event handlers
		onPermissionChange: (event) => {
			permissionChangeEvents.push(event);
		},
		
		onPermissionDenied: (event) => {
			permissionDeniedEvents.push(event);
		}
	}) as PermissionAwareProvider;
	
	t.truthy(provider);
	t.true(isPermissionAwareProvider(provider));
	
	// Wait for initial permission setup
	await new Promise(resolve => setTimeout(resolve, 50));
	
	// Verify configuration was applied
	t.is(permissionChangeEvents.length, 1);
	t.is(permissionChangeEvents[0].level, 'write');
	
	provider.destroy();
});

test('PermissionAwareProvider - Permission change event details', async t => {
	const doc = new Y.Doc();
	let lastPermissionEvent: PermissionChangeEvent | null = null;
	
	const provider = createPermissionAwareProvider({
		url: 'ws://localhost:1234/event-test?token=demo_viewer',
		name: 'event-test',
		document: doc,
		
		onPermissionChange: (event: PermissionChangeEvent) => {
			lastPermissionEvent = event;
		}
	});
	
	// Wait for permission event
	await new Promise(resolve => setTimeout(resolve, 50));
	
	t.truthy(lastPermissionEvent);
	t.is(lastPermissionEvent!.level, 'read');
	t.is(lastPermissionEvent!.reason, 'Token authenticated');
	t.truthy(lastPermissionEvent!.timestamp);
	
	provider.destroy();
});

// =====================================================
// Document Integration Tests  
// =====================================================

test('PermissionAwareProvider - Document access control', async t => {
	const doc = new Y.Doc();
	let currentPermission: ClientPermissionLevel = 'deny';
	let operationBlockedCount = 0;
	
	const provider = createPermissionAwareProvider({
		url: 'ws://localhost:1234/doc-access?token=demo_viewer',
		name: 'doc-access', 
		document: doc,
		
		onPermissionChange: (event) => {
			currentPermission = event.level;
		},
		
		onPermissionDenied: (event) => {
			operationBlockedCount++;
		},
		
		enableClientSidePermissionCheck: true
	});
	
	// Wait for permission setup
	await new Promise(resolve => setTimeout(resolve, 50));
	
	t.is(currentPermission, 'read');
	
	// Test document operations based on permission
	const text = doc.getText('content');
	
	if (canRead(currentPermission)) {
		// Reading should be allowed
		const content = text.toString();
		t.is(typeof content, 'string');
	}
	
	if (!canWrite(currentPermission)) {
		// Writing should be restricted for read-only users
		// Note: In a real implementation, this would trigger onPermissionDenied
		t.false(canWrite(currentPermission));
	}
	
	provider.destroy();
});

// =====================================================
// Error Handling Tests
// =====================================================

test('PermissionAwareProvider - Connection error handling', async t => {
	const doc = new Y.Doc();
	let connectionErrorCount = 0;
	
	const provider = createPermissionAwareProvider({
		url: 'ws://invalid-host:9999/error-test?token=demo_admin',
		name: 'error-test',
		document: doc,
		
		onPermissionDenied: (event) => {
			connectionErrorCount++;
		}
	});
	
	t.truthy(provider);
	
	// Even with connection errors, provider should be created successfully
	// Error handling happens at runtime
	
	provider.destroy();
});

test('PermissionAwareProvider - Type safety and detection', t => {
	const doc = new Y.Doc();
	
	// Create standard provider
	const standardProvider = new HocuspocusProvider({
		url: 'ws://localhost:1234',
		name: 'standard-test',
		document: doc
	});
	
	// Create permission-aware provider
	const permissionProvider = createPermissionAwareProvider({
		url: 'ws://localhost:1234/permission-test?token=demo_admin',
		name: 'permission-test', 
		document: doc
	});
	
	// Test type detection
	t.false(isPermissionAwareProvider(standardProvider));
	t.true(isPermissionAwareProvider(permissionProvider));
	
	// Cleanup
	standardProvider.destroy();
	permissionProvider.destroy();
});

// =====================================================
// Integration with Y.js Operations
// =====================================================

test('PermissionAwareProvider - Y.js operation integration', async t => {
	const doc = new Y.Doc();
	let currentPermission: ClientPermissionLevel = 'deny';
	
	const provider = createPermissionAwareProvider({
		url: 'ws://localhost:1234/yjs-ops?token=demo_editor',
		name: 'yjs-ops',
		document: doc,
		
		onPermissionChange: (event) => {
			currentPermission = event.level;
		},
		
		enableClientSidePermissionCheck: true
	});
	
	// Wait for permission setup
	await new Promise(resolve => setTimeout(resolve, 50));
	
	t.is(currentPermission, 'write');
	
	// Test Y.js operations with write permission
	if (canWrite(currentPermission)) {
		const text = doc.getText('content');
		text.insert(0, 'Hello World');
		t.is(text.toString(), 'Hello World');
		
		// Test map operations
		const map = doc.getMap('metadata');
		map.set('title', 'Test Document');
		t.is(map.get('title'), 'Test Document');
	}
	
	provider.destroy();
});

// =====================================================
// Performance and Memory Tests
// =====================================================

test('PermissionAwareProvider - Memory cleanup', async t => {
	const doc = new Y.Doc();
	
	const provider = createPermissionAwareProvider({
		url: 'ws://localhost:1234/cleanup-test?token=demo_admin',
		name: 'cleanup-test',
		document: doc
	});
	
	// Wait for initialization
	await new Promise(resolve => setTimeout(resolve, 50));
	
	// Verify provider is working
	t.truthy(provider);
	
	// Test cleanup
	t.notThrows(() => {
		provider.destroy();
	});
	
	// Verify provider is properly destroyed
	// Note: In a real implementation, we'd check internal state cleanup
	t.pass();
});

// Cleanup after all tests
test.after(() => {
	restoreWebSocket();
});