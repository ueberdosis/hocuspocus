/**
 * Enterprise Permission Extension Tests
 * Tests token-based authentication and service-oriented architecture
 */

import test from 'ava';
import { Permission, PermissionLevel, PermissionError, type User, type PermissionResult, YjsOperationType } from '../../packages/extension-permission/src/index.ts';

// =====================================================
// Mock Service Architecture
// =====================================================

// Enhanced user interface matching our implementation
interface AuthenticatedUser extends User {
	username: string;
	email: string;
	name: string;
	department: string;
	permissions: string[];
	createdAt: string;
	lastLogin: string;
}

// Mock connection object
interface MockConnection {
	request?: {
		url?: string;
		headers?: Record<string, string>;
	};
}

function createConnection(options: {
	url?: string;
	headers?: Record<string, string>;
} = {}): MockConnection {
	return {
		request: {
			url: options.url,
			headers: options.headers || {}
		}
	};
}

// Mock users database (matching our UserService)
const mockUsers: Record<string, AuthenticatedUser> = {
	'usr_admin_001': {
		id: 'usr_admin_001',
		username: 'admin',
		email: 'admin@company.com',
		role: 'admin',
		name: 'System Administrator',
		department: 'IT',
		permissions: ['*'],
		createdAt: '2024-01-01T00:00:00Z',
		lastLogin: new Date().toISOString()
	},
	'usr_editor_002': {
		id: 'usr_editor_002',
		username: 'john.editor',
		email: 'john@company.com',
		role: 'editor',
		name: 'John Editor',
		department: 'Content',
		permissions: ['documents:write', 'comments:write'],
		createdAt: '2024-01-15T00:00:00Z',
		lastLogin: new Date().toISOString()
	},
	'usr_viewer_004': {
		id: 'usr_viewer_004',
		username: 'mike.viewer',
		email: 'mike@company.com',
		role: 'viewer',
		name: 'Mike Viewer',
		department: 'Sales',
		permissions: ['documents:read'],
		createdAt: '2024-02-15T00:00:00Z',
		lastLogin: new Date().toISOString()
	}
};

// Mock tokens (matching our UserService)
const mockTokens: Record<string, string> = {
	'demo_admin': 'usr_admin_001',
	'demo_editor': 'usr_editor_002',
	'demo_viewer': 'usr_viewer_004',
	'invalid_token': '', // Invalid mapping
};

// Mock UserService implementation
class MockUserService {
	static extractTokenFromConnection(connection: any): string | null {
		const request = connection.request;
		if (!request) return null;
		
		// Method 1: Authorization header (Bearer token)
		const authHeader = request.headers?.authorization;
		if (authHeader && authHeader.startsWith('Bearer ')) {
			return authHeader.substring(7);
		}
		
		// Method 2: URL query parameter
		const url = request.url;
		if (url) {
			try {
				const urlParams = new URL(url, 'http://localhost').searchParams;
				const token = urlParams.get('token');
				if (token) return token;
			} catch (error) {
				// Invalid URL
			}
		}
		
		// Method 3: Cookie
		const cookies = request.headers?.cookie;
		if (cookies) {
			const match = cookies.match(/(?:^|;\s*)token=([^;]+)/);
			if (match) return match[1];
		}
		
		return null;
	}

	static async authenticateByToken(token: string): Promise<AuthenticatedUser | null> {
		// Simulate network delay
		await new Promise(resolve => setTimeout(resolve, 10));
		
		// Validate token format (simple validation)
		if (!token || token.length < 5) {
			return null;
		}
		
		// Look up user by token
		const userId = mockTokens[token];
		if (!userId) {
			return null;
		}
		
		// Get user data
		const userData = mockUsers[userId];
		if (!userData) {
			return null;
		}
		
		// Update last login
		return {
			...userData,
			lastLogin: new Date().toISOString()
		};
	}
}

// Mock PermissionService implementation
class MockPermissionService {
	static async getDocumentPermission(user: AuthenticatedUser, documentName: string): Promise<PermissionResult> {
		// Simulate network delay
		await new Promise(resolve => setTimeout(resolve, 5));
		
		// Admin gets full access
		if (user.role === 'admin') {
			return { level: PermissionLevel.WRITE };
		}
		
		// Document-type based permissions
		if (documentName.startsWith('admin-') && user.role !== 'admin') {
			return { level: PermissionLevel.DENY };
		}
		
		if (documentName.startsWith('public-')) {
			return { level: user.role === 'editor' ? PermissionLevel.WRITE : PermissionLevel.READ };
		}
		
		// Role-based default permissions
		switch (user.role) {
			case 'editor':
				return { level: PermissionLevel.WRITE };
			case 'viewer':
				return { level: PermissionLevel.READ };
			default:
				return { level: PermissionLevel.DENY };
		}
	}

	static async checkOperationPermission(user: AuthenticatedUser, documentName: string, context: any): Promise<boolean> {
		// Admin can do anything
		if (user.role === 'admin') {
			return true;
		}
		
		// Viewers can only do cursor operations
		if (user.role === 'viewer') {
			return context.operation === YjsOperationType.CURSOR_UPDATE;
		}
		
		// Business rule: No delete operations during business hours for non-admins
		const hour = new Date().getUTCHours();
		if (hour >= 9 && hour <= 17 && user.role !== 'admin') {
			if (context.operation === YjsOperationType.DELETE) {
				return false;
			}
		}
		
		return true;
	}
}

// Service-based user authentication
async function getTokenUser(connection: any): Promise<AuthenticatedUser | null> {
	try {
		const token = MockUserService.extractTokenFromConnection(connection);
		if (!token) {
			return null;
		}
		
		return await MockUserService.authenticateByToken(token);
	} catch (error) {
		console.error('Authentication error:', error);
		return null;
	}
}

// Service-based permission checking
async function getServicePermission(user: AuthenticatedUser, documentName: string): Promise<PermissionResult> {
	try {
		if (!user) {
			return { level: PermissionLevel.DENY };
		}
		
		return await MockPermissionService.getDocumentPermission(user, documentName);
	} catch (error) {
		console.error('Permission check error:', error);
		return { level: PermissionLevel.DENY };
	}
}

// Service-based operation checking
async function checkServiceOperation(user: AuthenticatedUser, documentName: string, context: any): Promise<boolean> {
	try {
		return await MockPermissionService.checkOperationPermission(user, documentName, context);
	} catch (error) {
		console.error('Operation check error:', error);
		return false;
	}
}

// =====================================================
// Enterprise Permission System Tests
// =====================================================

test('Permission - Enterprise configuration with services', t => {
	const permission = new Permission({
		getUser: getTokenUser,
		getPermission: getServicePermission,
		checkOperation: checkServiceOperation,
		timeout: 5000,
		enableLogging: true
	});

	t.truthy(permission);
});

test('Permission - Required parameters validation', t => {
	t.throws(() => {
		new Permission({} as any);
	}, { message: /getUser.*required/ });

	t.throws(() => {
		new Permission({
			getUser: getTokenUser
		} as any);
	}, { message: /getPermission.*required/ });
});

// =====================================================
// Token Authentication Tests
// =====================================================

test('Token Authentication - URL parameter extraction', async t => {
	const connection = createConnection({
		url: '/document?token=demo_admin'
	});

	const user = await getTokenUser(connection);
	
	t.truthy(user);
	t.is(user!.username, 'admin');
	t.is(user!.role, 'admin');
	t.is(user!.department, 'IT');
});

test('Token Authentication - Authorization header extraction', async t => {
	const connection = createConnection({
		url: '/document',
		headers: {
			authorization: 'Bearer demo_editor'
		}
	});

	const user = await getTokenUser(connection);
	
	t.truthy(user);
	t.is(user!.username, 'john.editor');
	t.is(user!.role, 'editor');
	t.is(user!.department, 'Content');
});

test('Token Authentication - Cookie extraction', async t => {
	const connection = createConnection({
		url: '/document',
		headers: {
			cookie: 'session=abc123; token=demo_viewer; other=value'
		}
	});

	const user = await getTokenUser(connection);
	
	t.truthy(user);
	t.is(user!.username, 'mike.viewer');
	t.is(user!.role, 'viewer');
	t.is(user!.department, 'Sales');
});

test('Token Authentication - Invalid token handling', async t => {
	// Invalid token
	const connection1 = createConnection({
		url: '/doc?token=invalid_token'
	});
	const user1 = await getTokenUser(connection1);
	t.is(user1, null);

	// Token too short
	const connection2 = createConnection({
		url: '/doc?token=abc'
	});
	const user2 = await getTokenUser(connection2);
	t.is(user2, null);

	// No token provided
	const connection3 = createConnection({
		url: '/doc'
	});
	const user3 = await getTokenUser(connection3);
	t.is(user3, null);
});

// =====================================================
// Service-Based Permission Tests
// =====================================================

test('Permission Service - Admin access to all documents', async t => {
	const adminUser = mockUsers['usr_admin_001'];
	
	// Admin can access normal documents
	const normalPerm = await getServicePermission(adminUser, 'normal-doc');
	t.is(normalPerm.level, PermissionLevel.WRITE);
	
	// Admin can access admin documents
	const adminPerm = await getServicePermission(adminUser, 'admin-dashboard');
	t.is(adminPerm.level, PermissionLevel.WRITE);
	
	// Admin can access public documents
	const publicPerm = await getServicePermission(adminUser, 'public-announcement');
	t.is(publicPerm.level, PermissionLevel.WRITE);
});

test('Permission Service - Editor document restrictions', async t => {
	const editorUser = mockUsers['usr_editor_002'];
	
	// Editor can access normal documents
	const normalPerm = await getServicePermission(editorUser, 'normal-doc');
	t.is(normalPerm.level, PermissionLevel.WRITE);
	
	// Editor cannot access admin documents
	const adminPerm = await getServicePermission(editorUser, 'admin-dashboard');
	t.is(adminPerm.level, PermissionLevel.DENY);
	
	// Editor can write to public documents
	const publicPerm = await getServicePermission(editorUser, 'public-announcement');
	t.is(publicPerm.level, PermissionLevel.WRITE);
});

test('Permission Service - Viewer read-only access', async t => {
	const viewerUser = mockUsers['usr_viewer_004'];
	
	// Viewer gets read access to normal documents
	const normalPerm = await getServicePermission(viewerUser, 'normal-doc');
	t.is(normalPerm.level, PermissionLevel.READ);
	
	// Viewer denied access to admin documents
	const adminPerm = await getServicePermission(viewerUser, 'admin-dashboard');
	t.is(adminPerm.level, PermissionLevel.DENY);
	
	// Viewer gets read access to public documents
	const publicPerm = await getServicePermission(viewerUser, 'public-announcement');
	t.is(publicPerm.level, PermissionLevel.READ);
});

// =====================================================
// Operation-Level Permission Tests
// =====================================================

test('Operation Service - Admin bypass all restrictions', async t => {
	const adminUser = mockUsers['usr_admin_001'];
	
	// Admin can delete anytime
	const deleteAllowed = await checkServiceOperation(adminUser, 'normal-doc', {
		operation: YjsOperationType.DELETE
	});
	t.true(deleteAllowed);
	
	// Admin can perform any operation
	const insertAllowed = await checkServiceOperation(adminUser, 'normal-doc', {
		operation: YjsOperationType.INSERT
	});
	t.true(insertAllowed);
});

test('Operation Service - Viewer limited to cursor operations', async t => {
	const viewerUser = mockUsers['usr_viewer_004'];
	
	// Viewer can update cursor
	const cursorAllowed = await checkServiceOperation(viewerUser, 'normal-doc', {
		operation: YjsOperationType.CURSOR_UPDATE
	});
	t.true(cursorAllowed);
	
	// Viewer cannot insert
	const insertDenied = await checkServiceOperation(viewerUser, 'normal-doc', {
		operation: YjsOperationType.INSERT
	});
	t.false(insertDenied);
	
	// Viewer cannot delete
	const deleteDenied = await checkServiceOperation(viewerUser, 'normal-doc', {
		operation: YjsOperationType.DELETE
	});
	t.false(deleteDenied);
});

test('Operation Service - Business hours restrictions', async t => {
	const editorUser = mockUsers['usr_editor_002'];
	
	// Mock business hours (9 AM - 5 PM UTC)
	const originalDate = Date;
	const mockDate = new Date('2024-01-15T14:00:00Z'); // 2 PM UTC (business hours)
	
	// @ts-ignore
	Date = class extends originalDate {
		constructor() {
			super();
			return mockDate;
		}
		static now() {
			return mockDate.getTime();
		}
	};
	
	// During business hours, editor cannot delete
	const deleteRestricted = await checkServiceOperation(editorUser, 'normal-doc', {
		operation: YjsOperationType.DELETE
	});
	t.false(deleteRestricted);
	
	// But editor can insert during business hours
	const insertAllowed = await checkServiceOperation(editorUser, 'normal-doc', {
		operation: YjsOperationType.INSERT
	});
	t.true(insertAllowed);
	
	// Restore original Date
	// @ts-ignore
	Date = originalDate;
});

// =====================================================
// Integration Tests
// =====================================================

test('Permission Extension - Successful enterprise connection flow', async t => {
	const permission = new Permission({
		getUser: getTokenUser,
		getPermission: getServicePermission,
		checkOperation: checkServiceOperation,
		timeout: 5000,
		enableLogging: true
	});

	const connection = createConnection({
		url: '/admin-dashboard?token=demo_admin'
	});

	const connectData = {
		context: connection,
		documentName: 'admin-dashboard'
	} as any;

	// Connection should succeed for admin
	await t.notThrowsAsync(permission.onConnect(connectData));

	// Verify connection context is set with enterprise user data
	t.truthy((connection as any).__user);
	t.truthy((connection as any).__permission);
	t.is((connection as any).__user.username, 'admin');
	t.is((connection as any).__user.department, 'IT');
	t.is((connection as any).__permission.level, PermissionLevel.WRITE);
});

test('Permission Extension - Token authentication failure', async t => {
	const permission = new Permission({
		getUser: getTokenUser,
		getPermission: getServicePermission
	});

	const connection = createConnection({
		url: '/doc?token=invalid_token_123'
	});

	const connectData = {
		context: connection,
		documentName: 'test-doc'
	} as any;

	// Should throw permission error for invalid token
	const error = await t.throwsAsync(permission.onConnect(connectData), {
		instanceOf: PermissionError
	});

	t.is(error?.message, 'Unable to identify user');
	t.is((error as any)?.documentName, 'test-doc');
	t.falsy((error as any)?.user);
});

test('Permission Extension - Document access denied', async t => {
	const permission = new Permission({
		getUser: getTokenUser,
		getPermission: getServicePermission
	});

	// Editor trying to access admin document
	const connection = createConnection({
		url: '/admin-dashboard?token=demo_editor'
	});

	const connectData = {
		context: connection,
		documentName: 'admin-dashboard'
	} as any;

	// Should be denied access
	const error = await t.throwsAsync(permission.onConnect(connectData), {
		instanceOf: PermissionError
	});

	t.is(error?.message, 'Access denied');
	t.is((error as any)?.user?.username, 'john.editor');
	t.is((error as any)?.documentName, 'admin-dashboard');
});

test('Permission Extension - Message processing with operation validation', async t => {
	const permission = new Permission({
		getUser: getTokenUser,
		getPermission: getServicePermission,
		checkOperation: undefined // Remove operation checking for this test
	});

	// Set up connected viewer (read-only)
	const connection = createConnection() as any;
	connection.__user = mockUsers['usr_viewer_004'];
	connection.__permission = { level: PermissionLevel.READ };

	const messageData = {
		context: connection,
		documentName: 'test-doc',
		update: new Uint8Array([1, 2, 3])
	} as any;

	// READ permission should allow messages for viewing when no operation check
	await t.notThrowsAsync(permission.beforeHandleMessage(messageData));

	// But DENY permission should block all messages
	connection.__permission = { level: PermissionLevel.DENY };
	await t.throwsAsync(permission.beforeHandleMessage(messageData), {
		instanceOf: PermissionError
	});
});

// =====================================================
// Error Handling and Edge Cases
// =====================================================

test('Permission Extension - Service timeout handling', async t => {
	// Create a permission checker with very short timeout
	const permission = new Permission({
		getUser: getTokenUser,
		getPermission: async (user, documentName) => {
			// Simulate slow permission service
			await new Promise(resolve => setTimeout(resolve, 200));
			return await getServicePermission(user, documentName);
		},
		timeout: 50 // Very short timeout
	});

	// Use Bearer token format instead of URL parameter
	const connection = createConnection({
		url: '/doc',
		headers: {
			authorization: 'Bearer demo_admin'
		}
	});

	const connectData = {
		context: connection,
		documentName: 'test-doc'
	} as any;

	// Should fail due to timeout in permission check
	await t.throwsAsync(permission.onConnect(connectData), {
		instanceOf: PermissionError
	});
});

test('Permission Extension - Service exception handling', async t => {
	// Create permission checker that throws errors
	const permission = new Permission({
		getUser: getTokenUser,
		getPermission: async (user, documentName) => {
			throw new Error('Permission service unavailable');
		}
	});

	const connection = createConnection({
		url: '/doc?token=demo_admin'
	});

	const connectData = {
		context: connection,
		documentName: 'test-doc'
	} as any;

	// Should catch exception and convert to PermissionError
	const error = await t.throwsAsync(permission.onConnect(connectData), {
		instanceOf: PermissionError
	});

	t.true(error?.message.includes('Permission check failed'));
});

test('PermissionError - Enhanced error properties', t => {
	const user: AuthenticatedUser = mockUsers['usr_editor_002'];
	const error = new PermissionError('Test error', user, 'admin-dashboard');

	t.is(error?.name, 'PermissionError');
	t.is(error?.message, 'Test error');
	t.is((error as any)?.user?.username, 'john.editor');
	t.is((error as any)?.documentName, 'admin-dashboard');
	t.true(error instanceof Error);
});

test('Permission Extension - Default enterprise configuration', t => {
	const permission = new Permission({
		getUser: getTokenUser,
		getPermission: getServicePermission,
		checkOperation: checkServiceOperation
	});

	// Verify enterprise defaults
	t.is((permission as any).config.timeout, 5000);
	t.is((permission as any).config.enableLogging, true);
});
