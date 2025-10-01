/**
 * Mock Permission Service 
 * Simulates a real permission/authorization service with document-level and operation-level access control
 */

import {
	PermissionLevel,
	YjsOperationType,
	type PermissionResult,
	type YjsOperationContext,
	createCommentOnlyPermission,
	createReadOnlyPermission,
	createPathRestrictedPermission
} from "../../../../packages/extension-permission/dist/hocuspocus-extension-permission.esm.js";

import type { AuthenticatedUser, UserRole } from './UserService.js';

// Document access control list (ACL)
interface DocumentAcl {
	documentId: string;
	documentType: 'public' | 'private' | 'restricted' | 'confidential';
	owner?: string;
	collaborators: {
		userId: string;
		role: 'owner' | 'editor' | 'reviewer' | 'viewer';
		permissions?: string[];
	}[];
	publicAccess: boolean;
	createdAt: string;
	updatedAt: string;
}

// Mock document permissions database
const mockDocumentPermissions: Record<string, DocumentAcl> = {
	// Admin documents - only admins can access
	'admin-dashboard': {
		documentId: 'admin-dashboard',
		documentType: 'confidential',
		collaborators: [
			{ userId: 'usr_admin_001', role: 'owner' }
		],
		publicAccess: false,
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	},
	'admin-settings': {
		documentId: 'admin-settings', 
		documentType: 'confidential',
		collaborators: [
			{ userId: 'usr_admin_001', role: 'owner' }
		],
		publicAccess: false,
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	},
	
	// Public collaborative documents
	'public-announcement': {
		documentId: 'public-announcement',
		documentType: 'public',
		owner: 'usr_admin_001',
		collaborators: [
			{ userId: 'usr_admin_001', role: 'owner' },
			{ userId: 'usr_editor_002', role: 'editor' },
			{ userId: 'usr_reviewer_003', role: 'reviewer' }
		],
		publicAccess: true,
		createdAt: '2024-01-15T00:00:00Z',
		updatedAt: '2024-02-01T00:00:00Z'
	},
	'public-policy': {
		documentId: 'public-policy',
		documentType: 'public',
		owner: 'usr_admin_001',
		collaborators: [
			{ userId: 'usr_admin_001', role: 'owner' },
			{ userId: 'usr_editor_002', role: 'editor' },
			{ userId: 'usr_reviewer_003', role: 'reviewer' }
		],
		publicAccess: true,
		createdAt: '2024-01-20T00:00:00Z',
		updatedAt: '2024-02-10T00:00:00Z'
	},
	
	// Comment-only documents (for review workflows)
	'comment-review-draft': {
		documentId: 'comment-review-draft',
		documentType: 'restricted',
		owner: 'usr_editor_002',
		collaborators: [
			{ userId: 'usr_editor_002', role: 'owner' },
			{ userId: 'usr_reviewer_003', role: 'reviewer' },
			{ userId: 'usr_viewer_004', role: 'reviewer' } // Can only comment
		],
		publicAccess: false,
		createdAt: '2024-02-01T00:00:00Z',
		updatedAt: '2024-02-15T00:00:00Z'
	},
	
	// Collaborative documents with section-level permissions
	'collab-project-spec': {
		documentId: 'collab-project-spec',
		documentType: 'private',
		owner: 'usr_admin_001',
		collaborators: [
			{ userId: 'usr_admin_001', role: 'owner' },
			{ userId: 'usr_editor_002', role: 'editor', permissions: ['sections.content', 'sections.appendix'] },
			{ userId: 'usr_reviewer_003', role: 'reviewer', permissions: ['sections.reviews', 'comments'] }
		],
		publicAccess: false,
		createdAt: '2024-01-10T00:00:00Z',
		updatedAt: '2024-02-20T00:00:00Z'
	},
	
	// Protected documents (delete operations blocked)
	'protected-legal-doc': {
		documentId: 'protected-legal-doc',
		documentType: 'confidential',
		owner: 'usr_admin_001',
		collaborators: [
			{ userId: 'usr_admin_001', role: 'owner' },
			{ userId: 'usr_editor_002', role: 'editor' }
		],
		publicAccess: false,
		createdAt: '2024-01-05T00:00:00Z',
		updatedAt: '2024-01-30T00:00:00Z'
	}
};

// Business rules configuration
const businessRules = {
	// Working hours enforcement
	workingHours: {
		enabled: true,
		start: 9,  // 9 AM
		end: 17,   // 5 PM
		timezone: 'UTC',
		restrictedRoles: ['editor', 'reviewer'] // admins can work anytime
	},
	
	// Operation size limits
	operationLimits: {
		enabled: true,
		maxOperationSize: 10000, // bytes
		restrictedRoles: ['viewer', 'guest']
	},
	
	// Path-based restrictions
	pathRestrictions: {
		enabled: true,
		globallyDeniedPaths: [
			'system.*',
			'internal.*',
			'*.password',
			'*.secret',
			'admin.config.*'
		],
		adminOnlyPaths: [
			'metadata.permissions',
			'document.settings',
			'audit.*'
		]
	}
};

export class PermissionService {
	/**
	 * Get document permissions for a user
	 */
	static async getDocumentPermission(user: AuthenticatedUser, documentName: string): Promise<PermissionResult> {
		// Simulate database lookup delay
		await new Promise(resolve => setTimeout(resolve, Math.random() * 30 + 5));
		
		console.log(`[PermissionService] Checking access: ${user.username} (${user.role}) → ${documentName}`);
		
		// Check document-specific permissions first
		const docAcl = this.getDocumentAcl(documentName);
		if (docAcl) {
			const userCollaboration = docAcl.collaborators.find(collab => collab.userId === user.id);
			
			if (userCollaboration) {
				return this.getPermissionByCollaborationRole(
					userCollaboration.role,
					user.role,
					documentName,
					userCollaboration.permissions
				);
			} else if (!docAcl.publicAccess) {
				console.log(`[PermissionService] Access denied - not a collaborator on private document`);
				return { level: PermissionLevel.DENY };
			}
		}
		
		// Fall back to document type-based permissions
		return this.getPermissionByDocumentType(user, documentName);
	}
	
	/**
	 * Check operation-level permissions
	 */
	static async checkOperationPermission(
		user: AuthenticatedUser,
		documentName: string,
		context: YjsOperationContext
	): Promise<boolean> {
		console.log(`[PermissionService] Operation check: ${user.username} → ${context.operation} on ${context.path?.join('.')}`);
		
		// Apply business rules
		if (!this.checkBusinessRules(user, documentName, context)) {
			return false;
		}
		
		// Check document-specific operation rules
		return this.checkDocumentOperationRules(user, documentName, context);
	}
	
	/**
	 * Get document ACL
	 */
	private static getDocumentAcl(documentName: string): DocumentAcl | null {
		return mockDocumentPermissions[documentName] || null;
	}
	
	/**
	 * Get permission based on collaboration role
	 */
	private static getPermissionByCollaborationRole(
		collaborationRole: string,
		userRole: UserRole,
		documentName: string,
		allowedPaths?: string[]
	): PermissionResult {
		console.log(`[PermissionService] Collaboration role: ${collaborationRole}, User role: ${userRole}`);
		
		switch (collaborationRole) {
			case 'owner':
				return { 
					level: PermissionLevel.WRITE,
					allowedPaths: ['*'] // Owners can access everything
				};
				
			case 'editor':
				if (allowedPaths && allowedPaths.length > 0) {
					return createPathRestrictedPermission(PermissionLevel.WRITE, allowedPaths);
				}
				return { level: PermissionLevel.WRITE };
				
			case 'reviewer':
				if (documentName.startsWith('comment-') || allowedPaths?.includes('comments')) {
					return createCommentOnlyPermission();
				}
				return {
					level: PermissionLevel.READ,
					allowedOperations: [
						YjsOperationType.MAP_SET,
						YjsOperationType.MAP_DELETE
					],
					allowedPaths: allowedPaths || ['comments', 'reviews', 'suggestions']
				};
				
			case 'viewer':
			default:
				return createReadOnlyPermission();
		}
	}
	
	/**
	 * Get permission based on document type and user role
	 */
	private static getPermissionByDocumentType(user: AuthenticatedUser, documentName: string): PermissionResult {
		// Admin documents - only admins can access
		if (documentName.startsWith('admin-')) {
			if (user.role === 'admin') {
				console.log(`[PermissionService] Admin document - full access`);
				return { level: PermissionLevel.WRITE };
			} else {
				console.log(`[PermissionService] Admin document - access denied`);
				return { level: PermissionLevel.DENY };
			}
		}
		
		// Comment documents - comment-only access
		if (documentName.startsWith('comment-')) {
			console.log(`[PermissionService] Comment document - comment-only access`);
			return createCommentOnlyPermission();
		}
		
		// Public documents with fine-grained access
		if (documentName.startsWith('public-')) {
			return this.getPublicDocumentPermission(user);
		}
		
		// Collaborative documents with path restrictions
		if (documentName.startsWith('collab-')) {
			return this.getCollaborativeDocumentPermission(user);
		}
		
		// Protected documents (no deletes allowed except for admins)
		if (documentName.startsWith('protected-')) {
			return this.getProtectedDocumentPermission(user);
		}
		
		// Default role-based permissions
		return this.getDefaultRolePermission(user);
	}
	
	/**
	 * Get permissions for public documents
	 */
	private static getPublicDocumentPermission(user: AuthenticatedUser): PermissionResult {
		console.log(`[PermissionService] Public document - role-based access`);
		
		switch (user.role) {
			case 'admin':
				return { 
					level: PermissionLevel.WRITE,
					allowedPaths: ['*']
				};
			case 'editor':
				return createPathRestrictedPermission(PermissionLevel.WRITE, [
					'content',
					'metadata.title',
					'metadata.description'
				]);
			case 'reviewer':
				return {
					level: PermissionLevel.READ,
					allowedOperations: [YjsOperationType.MAP_SET, YjsOperationType.MAP_DELETE],
					allowedPaths: ['comments', 'suggestions', 'reviews']
				};
			default:
				return createReadOnlyPermission();
		}
	}
	
	/**
	 * Get permissions for collaborative documents
	 */
	private static getCollaborativeDocumentPermission(user: AuthenticatedUser): PermissionResult {
		console.log(`[PermissionService] Collaborative document - section-based access`);
		
		switch (user.role) {
			case 'admin':
				return { level: PermissionLevel.WRITE };
			case 'editor':
				return createPathRestrictedPermission(PermissionLevel.WRITE, [
					'sections.content',
					'sections.appendix',
					'sections.draft'
				]);
			case 'reviewer':
				return createPathRestrictedPermission(PermissionLevel.READ, [
					'sections.reviews',
					'comments'
				]);
			default:
				return createReadOnlyPermission();
		}
	}
	
	/**
	 * Get permissions for protected documents
	 */
	private static getProtectedDocumentPermission(user: AuthenticatedUser): PermissionResult {
		const basePermission = this.getDefaultRolePermission(user);
		
		// Add delete operation restrictions for non-admins
		if (user.role !== 'admin' && basePermission.level === PermissionLevel.WRITE) {
			return {
				...basePermission,
				deniedOperations: [
					YjsOperationType.DELETE,
					YjsOperationType.TEXT_DELETE,
					YjsOperationType.ARRAY_DELETE
				]
			};
		}
		
		return basePermission;
	}
	
	/**
	 * Get default role-based permission
	 */
	private static getDefaultRolePermission(user: AuthenticatedUser): PermissionResult {
		switch (user.role) {
			case 'admin':
				console.log(`[PermissionService] Admin - full access`);
				return { level: PermissionLevel.WRITE };
			case 'editor':
				console.log(`[PermissionService] Editor - write access`);
				return { level: PermissionLevel.WRITE };
			case 'reviewer':
				console.log(`[PermissionService] Reviewer - comment access`);
				return createCommentOnlyPermission();
			case 'viewer':
				console.log(`[PermissionService] Viewer - read access`);
				return createReadOnlyPermission();
			case 'guest':
			default:
				console.log(`[PermissionService] Guest - limited read access`);
				return createReadOnlyPermission();
		}
	}
	
	/**
	 * Check business rules
	 */
	private static checkBusinessRules(
		user: AuthenticatedUser,
		documentName: string,
		context: YjsOperationContext
	): boolean {
		// Working hours check
		if (businessRules.workingHours.enabled) {
			const hour = new Date().getHours();
			const isOffHours = hour < businessRules.workingHours.start || hour > businessRules.workingHours.end;
			
			if (isOffHours && businessRules.workingHours.restrictedRoles.includes(user.role)) {
				if ([YjsOperationType.INSERT, YjsOperationType.TEXT_INSERT, YjsOperationType.UPDATE].includes(context.operation)) {
					console.log(`[PermissionService] Operation blocked - outside working hours for ${user.role}`);
					return false;
				}
			}
		}
		
		// Operation size limits
		if (businessRules.operationLimits.enabled) {
			if (context.length && context.length > businessRules.operationLimits.maxOperationSize) {
				if (businessRules.operationLimits.restrictedRoles.includes(user.role)) {
					console.log(`[PermissionService] Operation blocked - size limit exceeded for ${user.role}`);
					return false;
				}
			}
		}
		
		// Global path restrictions
		if (businessRules.pathRestrictions.enabled) {
			const pathStr = context.path?.join('.') || '';
			
			// Check globally denied paths
			for (const deniedPath of businessRules.pathRestrictions.globallyDeniedPaths) {
				if (this.matchesPath(pathStr, deniedPath)) {
					console.log(`[PermissionService] Operation blocked - globally denied path: ${pathStr}`);
					return false;
				}
			}
			
			// Check admin-only paths
			if (user.role !== 'admin') {
				for (const adminPath of businessRules.pathRestrictions.adminOnlyPaths) {
					if (this.matchesPath(pathStr, adminPath)) {
						console.log(`[PermissionService] Operation blocked - admin-only path: ${pathStr}`);
						return false;
					}
				}
			}
		}
		
		return true;
	}
	
	/**
	 * Check document-specific operation rules
	 */
	private static checkDocumentOperationRules(
		user: AuthenticatedUser,
		documentName: string,
		context: YjsOperationContext
	): boolean {
		// Protected document rules
		if (documentName.startsWith('protected-')) {
			if (user.role !== 'admin' && [
				YjsOperationType.DELETE,
				YjsOperationType.TEXT_DELETE,
				YjsOperationType.ARRAY_DELETE
			].includes(context.operation)) {
				console.log(`[PermissionService] Delete operation blocked in protected document`);
				return false;
			}
		}
		
		// Formatting restrictions for non-editors
		if (context.operation === YjsOperationType.TEXT_FORMAT) {
			if (!['admin', 'editor'].includes(user.role)) {
				console.log(`[PermissionService] Text formatting blocked for ${user.role}`);
				return false;
			}
		}
		
		return true;
	}
	
	/**
	 * Match path with wildcard support
	 */
	private static matchesPath(path: string, pattern: string): boolean {
		if (pattern === '*') return true;
		if (pattern.endsWith('.*')) {
			const prefix = pattern.slice(0, -2);
			return path === prefix || path.startsWith(prefix + '.');
		}
		if (pattern.startsWith('*.')) {
			const suffix = pattern.slice(1);
			return path.endsWith(suffix);
		}
		return path === pattern;
	}
	
	/**
	 * Get document access statistics (for monitoring)
	 */
	static getDocumentStats(documentName: string) {
		const acl = this.getDocumentAcl(documentName);
		if (!acl) return null;
		
		return {
			documentId: acl.documentId,
			documentType: acl.documentType,
			collaboratorCount: acl.collaborators.length,
			publicAccess: acl.publicAccess,
			lastUpdated: acl.updatedAt
		};
	}
	
	/**
	 * List available documents for a user (for development/testing)
	 */
	static getAvailableDocuments(user: AuthenticatedUser) {
		const documents = Object.entries(mockDocumentPermissions)
			.filter(([_, acl]) => {
				// Check if user has access
				const isCollaborator = acl.collaborators.some(collab => collab.userId === user.id);
				return isCollaborator || acl.publicAccess || user.role === 'admin';
			})
			.map(([docName, acl]) => ({
				name: docName,
				type: acl.documentType,
				role: acl.collaborators.find(collab => collab.userId === user.id)?.role || 'viewer',
				publicAccess: acl.publicAccess
			}));
		
		return documents;
	}
}