/**
 * Mock User Service
 * Simulates a real user authentication service with JWT-like token validation
 */

import type { User } from "../../../../packages/extension-permission/dist/hocuspocus-extension-permission.esm.js";

// Mock user database
const mockUsers = {
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
	'usr_reviewer_003': {
		id: 'usr_reviewer_003',
		username: 'sarah.reviewer',
		email: 'sarah@company.com',
		role: 'reviewer',
		name: 'Sarah Reviewer',
		department: 'QA',
		permissions: ['documents:read', 'comments:write', 'reviews:write'],
		createdAt: '2024-02-01T00:00:00Z',
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
	},
	'usr_guest_005': {
		id: 'usr_guest_005',
		username: 'guest',
		email: 'guest@company.com',
		role: 'guest',
		name: 'Guest User',
		department: 'External',
		permissions: ['documents:read'],
		createdAt: new Date().toISOString(),
		lastLogin: new Date().toISOString()
	}
} as const;

// Mock token storage (in real app this would be in Redis/Database)
const mockTokens = {
	// Admin tokens
	'tok_admin_secure_2024': 'usr_admin_001',
	'admin_jwt_token_v1': 'usr_admin_001',
	
	// Editor tokens
	'tok_editor_john_2024': 'usr_editor_002',
	'editor_session_token': 'usr_editor_002',
	
	// Reviewer tokens
	'tok_reviewer_sarah_2024': 'usr_reviewer_003',
	'reviewer_access_token': 'usr_reviewer_003',
	
	// Viewer tokens
	'tok_viewer_mike_2024': 'usr_viewer_004',
	'viewer_readonly_token': 'usr_viewer_004',
	
	// Guest tokens
	'tok_guest_temp_2024': 'usr_guest_005',
	'guest_limited_access': 'usr_guest_005',
	
	// Demo tokens for easy testing
	'demo_admin': 'usr_admin_001',
	'demo_editor': 'usr_editor_002',
	'demo_reviewer': 'usr_reviewer_003',
	'demo_viewer': 'usr_viewer_004',
	'demo_guest': 'usr_guest_005'
} as const;

// Token validation patterns (simulating different token formats)
const tokenPatterns = [
	/^tok_[a-z]+_[a-z0-9]+_\d{4}$/, // Format: tok_role_name_year
	/^[a-z]+_[a-z_]+_token$/,        // Format: role_type_token
	/^demo_[a-z]+$/                  // Format: demo_role (for easy testing)
];

export interface AuthenticatedUser extends User {
	username: string;
	email: string;
	name: string;
	department: string;
	permissions: string[];
	createdAt: string;
	lastLogin: string;
}

export class UserService {
	/**
	 * Authenticate user by token
	 */
	static async authenticateByToken(token: string): Promise<AuthenticatedUser | null> {
		// Simulate network delay
		await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
		
		// Log authentication attempt
		console.log(`[UserService] Authenticating token: ${token.substring(0, 8)}...`);
		
		// Validate token format
		if (!this.isValidTokenFormat(token)) {
			console.log(`[UserService] Invalid token format: ${token}`);
			return null;
		}
		
		// Look up user by token
		const userId = mockTokens[token as keyof typeof mockTokens];
		if (!userId) {
			console.log(`[UserService] Token not found: ${token}`);
			return null;
		}
		
		// Get user data
		const userData = mockUsers[userId as keyof typeof mockUsers];
		if (!userData) {
			console.log(`[UserService] User not found for ID: ${userId}`);
			return null;
		}
		
		// Update last login
		const user = {
			...userData,
			lastLogin: new Date().toISOString()
		};
		
		console.log(`[UserService] Authenticated: ${user.username} (${user.role})`);
		return user;
	}
	
	/**
	 * Get user by ID (for internal service calls)
	 */
	static async getUserById(userId: string): Promise<AuthenticatedUser | null> {
		const userData = mockUsers[userId as keyof typeof mockUsers];
		return userData ? { ...userData } : null;
	}
	
	/**
	 * Validate token format
	 */
	private static isValidTokenFormat(token: string): boolean {
		if (!token || token.length < 8 || token.length > 64) {
			return false;
		}
		
		return tokenPatterns.some(pattern => pattern.test(token));
	}
	
	/**
	 * Generate demo token for user (for testing purposes)
	 */
	static generateDemoToken(role: 'admin' | 'editor' | 'reviewer' | 'viewer' | 'guest'): string {
		return `demo_${role}`;
	}
	
	/**
	 * List all available demo tokens (for development)
	 */
	static getAvailableDemoTokens() {
		return {
			admin: 'demo_admin',
			editor: 'demo_editor', 
			reviewer: 'demo_reviewer',
			viewer: 'demo_viewer',
			guest: 'demo_guest',
			// Alternative tokens for testing
			adminSecure: 'tok_admin_secure_2024',
			editorSession: 'editor_session_token',
			reviewerAccess: 'reviewer_access_token',
			viewerReadonly: 'viewer_readonly_token',
			guestLimited: 'guest_limited_access'
		};
	}
	
	/**
	 * Extract token from WebSocket connection
	 */
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
				console.log('[UserService] Error parsing URL:', error);
			}
		}
		
		// Method 3: Cookie
		const cookies = request.headers?.cookie;
		if (cookies) {
			const match = cookies.match(/(?:^|;\s*)token=([^;]+)/);
			if (match) return match[1];
		}
		
		console.log('[UserService] No token found in connection');
		return null;
	}
	
	/**
	 * Log authentication attempt for monitoring
	 */
	static logAuthAttempt(token: string | null, success: boolean, user?: AuthenticatedUser) {
		const timestamp = new Date().toISOString();
		const tokenPrefix = token ? token.substring(0, 8) + '...' : 'null';
		
		if (success && user) {
			console.log(`[Auth] ${timestamp} SUCCESS - Token: ${tokenPrefix} → User: ${user.username} (${user.role})`);
		} else {
			console.log(`[Auth] ${timestamp} FAILURE - Token: ${tokenPrefix}`);
		}
	}
}

// Export types for use in other services
export type UserRole = 'admin' | 'editor' | 'reviewer' | 'viewer' | 'guest';
export type UserPermission = string;