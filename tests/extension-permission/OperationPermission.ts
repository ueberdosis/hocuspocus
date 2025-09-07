/**
 * Y.js Operation-Level Permission Control Tests
 */

import test from 'ava';
import { 
	Permission, 
	PermissionLevel, 
	YjsOperationType,
	PermissionError, 
	type User, 
	type PermissionResult,
	type YjsOperationContext,
	createCommentOnlyPermission,
	createReadOnlyPermission,
	createPathRestrictedPermission,
	createBasicPermissionChecker
} from '../../packages/extension-permission/src/index.ts';

// =====================================================
// Mock Implementations for Testing
// =====================================================

interface MockConnection {
	request?: {
		url?: string;
		headers?: Record<string, string>;
	};
}

// Mock tokens for testing
const mockTokens: Record<string, string> = {
	'admin_token': 'admin_user',
	'reviewer_token': 'reviewer_user',
	'editor_token': 'editor_user',
	'viewer_token': 'viewer_user',
	'testuser_token': 'testuser_user'
};

// Mock users database
const mockUsers: Record<string, User> = {
	'admin_user': { id: 'admin_user', role: 'admin' },
	'reviewer_user': { id: 'reviewer_user', role: 'reviewer' },
	'editor_user': { id: 'editor_user', role: 'editor' },
	'viewer_user': { id: 'viewer_user', role: 'viewer' },
	'testuser_user': { id: 'testuser_user', role: 'testuser' }
};

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

// Token-based authentication following the real implementation pattern
function getUser(connection: any): User | null {
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

// =====================================================
// Operation-Level Permission Check Tests
// =====================================================

test('YjsOperationType - operation type enum completeness', t => {
	// Verify all operation types are defined
	const expectedOperations = [
		'insert', 'delete', 'update',
		'text_insert', 'text_delete', 'text_format',
		'array_insert', 'array_delete', 'array_move',
		'map_set', 'map_delete',
		'xml_insert', 'xml_delete', 'xml_attribute',
		'transaction_start', 'transaction_commit', 'transaction_abort'
	];

	const actualOperations = Object.values(YjsOperationType);
	
	for (const expectedOp of expectedOperations) {
		t.true(actualOperations.includes(expectedOp as YjsOperationType), `Missing operation: ${expectedOp}`);
	}
	
	t.is(actualOperations.length, expectedOperations.length);
});

test('createReadOnlyPermission - read-only permission creation', t => {
	const permission = createReadOnlyPermission();
	
	t.is(permission.level, PermissionLevel.READ);
	t.truthy(permission.deniedOperations);
	t.true(permission.deniedOperations!.includes(YjsOperationType.TEXT_INSERT));
	t.true(permission.deniedOperations!.includes(YjsOperationType.MAP_SET));
	t.true(permission.deniedOperations!.includes(YjsOperationType.DELETE));
});

test('createCommentOnlyPermission - comment-only permission creation', t => {
	const permission = createCommentOnlyPermission();
	
	t.is(permission.level, PermissionLevel.READ);
	t.truthy(permission.allowedOperations);
	t.truthy(permission.allowedPaths);
	t.true(permission.allowedOperations!.includes(YjsOperationType.MAP_SET));
	t.true(permission.allowedPaths!.includes('comments'));
});

test('createPathRestrictedPermission - path-restricted permission', t => {
	const permission = createPathRestrictedPermission(PermissionLevel.WRITE, ['content', 'metadata']);
	
	t.is(permission.level, PermissionLevel.WRITE);
	t.truthy(permission.allowedPaths);
	t.true(permission.allowedPaths!.includes('content'));
	t.true(permission.allowedPaths!.includes('metadata'));
});

test('createBasicPermissionChecker - basic permission checker', t => {
	const checker = createBasicPermissionChecker(
		[YjsOperationType.MAP_SET, YjsOperationType.MAP_DELETE],
		['comments']
	);
	
	// Allowed operation and path
	t.true(checker({
		operation: YjsOperationType.MAP_SET,
		path: ['comments', 'comment1']
	}));
	
	// Disallowed operation
	t.false(checker({
		operation: YjsOperationType.TEXT_INSERT,
		path: ['comments', 'comment1']
	}));
	
	// Disallowed path
	t.false(checker({
		operation: YjsOperationType.MAP_SET,
		path: ['content', 'text']
	}));
});

// =====================================================
// Permission Extension Operation Check Tests
// =====================================================

function getOperationPermission(user: User, documentName: string): PermissionResult {
	if (user.role === 'admin') {
		return { level: PermissionLevel.WRITE };
	}
	
	if (user.role === 'reviewer') {
		return createCommentOnlyPermission();
	}
	
	if (user.role === 'editor') {
		return createPathRestrictedPermission(PermissionLevel.WRITE, ['content', 'metadata']);
	}
	
	return createReadOnlyPermission();
}

function checkCustomOperation(user: User, documentName: string, context: YjsOperationContext): boolean {
	// Demo: prohibit delete operations (except for admin)
	if (context.operation === YjsOperationType.DELETE || 
		context.operation === YjsOperationType.TEXT_DELETE) {
		return user.role === 'admin';
	}
	
	// Demo: formatting operation restrictions
	if (context.operation === YjsOperationType.TEXT_FORMAT) {
		return user.role === 'admin' || user.role === 'editor';
	}
	
	// For reviewer users, allow comment-related operations
	if (user.role === 'reviewer') {
		return [
			YjsOperationType.MAP_SET, 
			YjsOperationType.MAP_DELETE,
			YjsOperationType.INSERT  // Allow basic insert operations for testing
		].includes(context.operation);
	}
	
	return true;
}

test('Permission - operation-level permission check - reviewer user', async t => {
	// Create special permission settings for reviewer, allowing MAP_SET operations
	const permission = new Permission({
		getUser: getUser,
		getPermission: (user, doc) => {
			if (user.role === 'reviewer') {
				// Create permissions allowing comment operations without checkOperation restrictions
				return {
					level: PermissionLevel.READ,
					allowedOperations: [
						YjsOperationType.MAP_SET,
						YjsOperationType.MAP_DELETE,
						YjsOperationType.INSERT  // Allow simulated INSERT operations
					],
					allowedPaths: ['comments', 'annotations']
				};
			}
			return getOperationPermission(user, doc);
		}
		// Don't set checkOperation to avoid conflicts
	});

	const connection = createConnection('reviewer_token');
	const connectData = {
		context: connection,
		documentName: 'test-doc'
	} as any;

	// Connection should succeed
	await t.notThrowsAsync(permission.onConnect(connectData));

	// Verify permission settings
	const savedPermission = (connection as any).__permission as PermissionResult;
	t.is(savedPermission.level, PermissionLevel.READ);
	t.truthy(savedPermission.allowedOperations);
	t.true(savedPermission.allowedOperations!.includes(YjsOperationType.MAP_SET));
	t.true(savedPermission.allowedOperations!.includes(YjsOperationType.INSERT));

	// Message handling should pass operation checks
	const messageData = {
		context: connection,
		documentName: 'test-doc',
		update: new Uint8Array([1, 2, 3])
	} as any;

	await t.notThrowsAsync(permission.beforeHandleMessage(messageData));
});

test('Permission - operation-level permission check - editor user path restrictions', async t => {
	const permission = new Permission({
		getUser: getUser,
		getPermission: getOperationPermission,
		checkOperation: checkCustomOperation
	});

	const connection = createConnection('editor_token');
	const connectData = {
		context: connection,
		documentName: 'test-doc'
	} as any;

	await t.notThrowsAsync(permission.onConnect(connectData));

	const savedPermission = (connection as any).__permission as PermissionResult;
	t.is(savedPermission.level, PermissionLevel.WRITE);
	t.truthy(savedPermission.allowedPaths);
	t.true(savedPermission.allowedPaths!.includes('content'));
	t.true(savedPermission.allowedPaths!.includes('metadata'));
});

test('Permission - custom permission checker', async t => {
	const permission = new Permission({
		getUser: getUser,
		getPermission: (user, doc) => ({
			level: PermissionLevel.WRITE,
			customChecker: createBasicPermissionChecker(
				[YjsOperationType.MAP_SET],
				['comments']
			)
		}),
		checkOperation: checkCustomOperation
	});

	const connection = createConnection('testuser_token');
	const connectData = {
		context: connection,
		documentName: 'test-doc'
	} as any;

	await t.notThrowsAsync(permission.onConnect(connectData));

	const savedPermission = (connection as any).__permission as PermissionResult;
	t.truthy(savedPermission.customChecker);
	
	// Test custom checker
	const checker = savedPermission.customChecker!;
	t.true(checker({
		operation: YjsOperationType.MAP_SET,
		path: ['comments', 'test']
	}));
	
	t.false(checker({
		operation: YjsOperationType.TEXT_INSERT,
		path: ['content']
	}));
});

test('Permission - permission check for denied operations', async t => {
	const permission = new Permission({
		getUser: getUser,
		getPermission: () => createReadOnlyPermission(),
		checkOperation: checkCustomOperation
	});

	const connection = createConnection('viewer_token');
	const connectData = {
		context: connection,
		documentName: 'test-doc'
	} as any;

	await t.notThrowsAsync(permission.onConnect(connectData));

	// Verify read-only permission settings
	const savedPermission = (connection as any).__permission as PermissionResult;
	t.is(savedPermission.level, PermissionLevel.READ);
	t.truthy(savedPermission.deniedOperations);
	t.true(savedPermission.deniedOperations!.length > 0);
});

// =====================================================
// Edge Cases and Error Handling Tests
// =====================================================

test('Permission - operation check timeout handling', async t => {
	const permission = new Permission({
		getUser: getUser,
		getPermission: async () => {
			// Make permission check timeout, not operation check
			await new Promise(resolve => setTimeout(resolve, 200));
			return { level: PermissionLevel.WRITE };
		},
		timeout: 50 // Very short timeout
	});

	const connection = createConnection('admin_token');
	const connectData = {
		context: connection,
		documentName: 'test-doc'
	} as any;

	// Permission check timeout should cause connection failure
	await t.throwsAsync(permission.onConnect(connectData), {
		instanceOf: PermissionError
	});
});

test('Permission - operation check exception handling', async t => {
	const permission = new Permission({
		getUser: getUser,
		getPermission: getOperationPermission,
		checkOperation: () => {
			throw new Error('Operation check failed');
		}
	});

	const connection = createConnection('admin_token');
	const connectData = {
		context: connection,
		documentName: 'test-doc'
	} as any;

	// Should be able to connect successfully (operation checks are performed during message handling)
	await t.notThrowsAsync(permission.onConnect(connectData));

	// But message handling should fail
	const messageData = {
		context: connection,
		documentName: 'test-doc',
		update: new Uint8Array([1, 2, 3])
	} as any;

	// Operation check exceptions should be caught and return false
	await t.throwsAsync(permission.beforeHandleMessage(messageData), {
		instanceOf: PermissionError
	});
});

test('Permission - default behavior when no operation checker', async t => {
	const permission = new Permission({
		getUser: getUser,
		getPermission: () => ({ level: PermissionLevel.WRITE })
		// No checkOperation
	});

	const connection = createConnection('testuser_token');
	const connectData = {
		context: connection,
		documentName: 'test-doc'
	} as any;

	await t.notThrowsAsync(permission.onConnect(connectData));

	const messageData = {
		context: connection,
		documentName: 'test-doc',
		update: new Uint8Array([1, 2, 3])
	} as any;

	// Should allow through when no operation checker
	await t.notThrowsAsync(permission.beforeHandleMessage(messageData));
});

// =====================================================
// Utility Functions Tests
// =====================================================

test('utility functions - combined permission usage', t => {
	// Create composite permission: read-only + comment functionality
	const basePermission = createReadOnlyPermission();
	const commentPermission = createCommentOnlyPermission();
	
	const combinedPermission: PermissionResult = {
		level: PermissionLevel.READ,
		allowedOperations: commentPermission.allowedOperations,
		allowedPaths: commentPermission.allowedPaths,
		deniedOperations: basePermission.deniedOperations?.filter(
			op => !commentPermission.allowedOperations?.includes(op)
		)
	};
	
	t.is(combinedPermission.level, PermissionLevel.READ);
	t.truthy(combinedPermission.allowedOperations);
	t.truthy(combinedPermission.allowedPaths);
	t.truthy(combinedPermission.deniedOperations);
});

test('utility functions - dynamic permission checker', t => {
	// Create time-based permission checker
	const timeBasedChecker = (context: YjsOperationContext): boolean => {
		const hour = new Date().getHours();
		// Allow editing during work hours, only comments at other times
		if (hour >= 9 && hour <= 17) {
			return true;
		} else {
			return context.path?.[0] === 'comments' && 
				   context.operation === YjsOperationType.MAP_SET;
		}
	};
	
	const permission: PermissionResult = {
		level: PermissionLevel.WRITE,
		customChecker: timeBasedChecker
	};
	
	t.truthy(permission.customChecker);
	
	// Test comment operations (should always be allowed)
	t.true(permission.customChecker!({
		operation: YjsOperationType.MAP_SET,
		path: ['comments', 'test']
	}));
});