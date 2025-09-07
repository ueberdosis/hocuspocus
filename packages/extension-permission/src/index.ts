/**
 * @hocuspocus/extension-permission
 * 
 * Enterprise-grade permission control extension for Hocuspocus
 * Provides callback-based permission validation with Y.js operation-level fine-grained control
 */

import type { 
	Extension,
	onConnectPayload, 
	beforeHandleMessagePayload,
	onConfigurePayload,
	onDestroyPayload
} from '@hocuspocus/server';
import * as Y from 'yjs';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';

/**
 * User identity information
 */
export interface User {
	id: string;
	[key: string]: unknown;
}

/**
 * Permission levels
 */
export enum PermissionLevel {
	DENY = 'DENY',
	READ = 'READ', 
	WRITE = 'WRITE'
}

/**
 * Y.js operation types
 */
export enum YjsOperationType {
	// Basic operations
	INSERT = 'insert',
	DELETE = 'delete',
	UPDATE = 'update',
	
	// Data type operations
	TEXT_INSERT = 'text_insert',
	TEXT_DELETE = 'text_delete',
	TEXT_FORMAT = 'text_format',
	
	ARRAY_INSERT = 'array_insert',
	ARRAY_DELETE = 'array_delete',
	ARRAY_MOVE = 'array_move',
	
	MAP_SET = 'map_set',
	MAP_DELETE = 'map_delete',
	
	XML_INSERT = 'xml_insert',
	XML_DELETE = 'xml_delete',
	XML_ATTRIBUTE = 'xml_attribute',
	
	// Transaction operations
	TRANSACTION_START = 'transaction_start',
	TRANSACTION_COMMIT = 'transaction_commit',
	TRANSACTION_ABORT = 'transaction_abort'
}

/**
 * Y.js operation context
 */
export interface YjsOperationContext {
	operation: YjsOperationType;
	path?: string[];  // Data path, e.g. ['content', 'title']
	position?: number;  // Operation position (for arrays and text)
	key?: string;  // Key for Map operations
	value?: unknown;  // Operation value
	length?: number;  // Operation length (delete, insert length)
	attributes?: Record<string, unknown>;  // Formatting attributes
	transactionId?: string;  // Transaction ID
	origin?: unknown;  // Operation origin
	metadata?: Record<string, unknown>;  // Metadata
}

/**
 * Permission check result
 */
export interface PermissionResult {
	level: PermissionLevel;
	// Operation-level permission control
	allowedOperations?: YjsOperationType[];
	deniedOperations?: YjsOperationType[];
	// Path-level permission control
	allowedPaths?: string[];
	deniedPaths?: string[];
	// Custom permission checker
	customChecker?: (context: YjsOperationContext) => boolean;
	[key: string]: unknown;
}

/**
 * Permission Extension Configuration
 */
export interface PermissionConfig {
	/**
	 * Extract user identity from WebSocket connection
	 * @param connection WebSocket connection object
	 * @returns User information, null indicates unable to identify user
	 */
	getUser: (connection: unknown) => Promise<User | null> | User | null;

	/**
	 * Check user permissions for document access
	 * @param user User information
	 * @param documentName Document name
	 * @returns Permission information
	 */
	getPermission: (user: User, documentName: string) => Promise<PermissionResult> | PermissionResult;

	/**
	 * Check operation-level permissions (optional, for fine-grained control)
	 * @param user User information
	 * @param documentName Document name
	 * @param context Operation context
	 * @returns Whether the operation is allowed
	 */
	checkOperation?: (user: User, documentName: string, context: YjsOperationContext) => Promise<boolean> | boolean;

	/**
	 * Permission check timeout in milliseconds (default: 5000)
	 */
	timeout?: number;

	/**
	 * Enable operation-level permission logging
	 */
	enableLogging?: boolean;

	/**
	 * Custom logging function
	 */
	log?: (message: string, level?: 'info' | 'warn' | 'error') => void;

	/**
	 * Hook called when permission is denied
	 */
	onPermissionDenied?: (context: PermissionDeniedContext) => void;

	/**
	 * Hook called when permission check succeeds
	 */
	onPermissionGranted?: (context: PermissionGrantedContext) => void;

	/**
	 * Hook called when operation is denied
	 */
	onOperationDenied?: (context: OperationDeniedContext) => void;
}

/**
 * Permission denied context for hooks
 */
export interface PermissionDeniedContext {
	user?: User;
	documentName: string;
	reason: string;
	timestamp: number;
	connection: unknown;
}

/**
 * Permission granted context for hooks
 */
export interface PermissionGrantedContext {
	user: User;
	documentName: string;
	permission: PermissionResult;
	timestamp: number;
	connection: unknown;
}

/**
 * Operation denied context for hooks
 */
export interface OperationDeniedContext {
	user: User;
	documentName: string;
	operation: YjsOperationContext;
	reason: string;
	timestamp: number;
}

/**
 * Permission Exception
 * Permission error with enhanced context
 */
export class PermissionError extends Error {
	constructor(message: string, public user?: User, public documentName?: string, public context?: unknown) {
		super(message);
		this.name = 'PermissionError';
	}
}

/**
 * Enterprise Permission Extension
 */
export class Permission implements Extension {
	private config: PermissionConfig;
	private isDestroyed = false;
	private stats = {
		permissionChecks: 0,
		permissionDenials: 0,
		operationChecks: 0,
		operationDenials: 0
	};

	constructor(config: PermissionConfig) {
		if (!config?.getUser || !config?.getPermission) {
			throw new Error('getUser and getPermission are required');
		}
		
		this.config = {
			timeout: 5000,
			enableLogging: true,
			log: console.log,
			...config
		};
	}

	/**
	 * onConfigure hook for extension initialization
	 */
	async onConfigure(data: onConfigurePayload): Promise<void> {
		if (this.config.enableLogging) {
			this.log('Permission extension configured', 'info');
		}
	}

	/**
	 * onConnect hook for permission validation
	 */
	async onConnect(data: onConnectPayload): Promise<void> {
		if (this.isDestroyed) return;
		
		this.stats.permissionChecks++;
		const timestamp = Date.now();

		// 1. Extract user identity
		const user = await this.resolveUser(data.context);
		if (!user) {
			this.stats.permissionDenials++;
			const context: PermissionDeniedContext = {
				documentName: data.documentName,
				reason: 'Unable to identify user',
				timestamp,
				connection: data.context
			};
			this.config.onPermissionDenied?.(context);
			throw new PermissionError('Unable to identify user', undefined, data.documentName, context);
		}

		// 2. Check permissions
		const permission = await this.checkPermission(user, data.documentName);
		if (permission.level === PermissionLevel.DENY) {
			this.stats.permissionDenials++;
			const context: PermissionDeniedContext = {
				user,
				documentName: data.documentName,
				reason: 'Access denied by permission level',
				timestamp,
				connection: data.context
			};
			this.config.onPermissionDenied?.(context);
			throw new PermissionError('Access denied', user, data.documentName, context);
		}

		// 3. Save to connection context
		(data.context as Record<string, unknown>).__user = user;
		(data.context as Record<string, unknown>).__permission = permission;
		
		// 4. Trigger permission granted hook
		const grantedContext: PermissionGrantedContext = {
			user,
			documentName: data.documentName,
			permission,
			timestamp,
			connection: data.context
		};
		this.config.onPermissionGranted?.(grantedContext);
		this.log(`Permission granted: ${user.id} -> ${data.documentName} [${permission.level}]`, 'info');
	}

	/**
	 * beforeHandleMessage hook for operation-level validation
	 */
	async beforeHandleMessage(data: beforeHandleMessagePayload): Promise<void> {
		if (this.isDestroyed) return;

		// Get saved permission information
		const permission = (data.context as Record<string, unknown>).__permission as PermissionResult;
		const user = (data.context as Record<string, unknown>).__user as User;
		
		if (!permission || permission.level === PermissionLevel.DENY) {
			throw new PermissionError('Message blocked by permission', user, data.documentName);
		}
		
		// If operation-level permission check is configured, perform fine-grained control
		if (this.config.checkOperation && data.update) {
			this.stats.operationChecks++;
			const allowed = await this.checkYjsOperations(user, data.documentName, data.update, permission);
			if (!allowed) {
				this.stats.operationDenials++;
				throw new PermissionError('Operation blocked by fine-grained permission', user, data.documentName);
			}
		}
	}

	/**
	 * onDestroy hook for cleanup
	 */
	async onDestroy(data: onDestroyPayload): Promise<void> {
		this.isDestroyed = true;
		if (this.config.enableLogging) {
			this.log(`Permission extension destroyed. Stats: ${JSON.stringify(this.stats)}`, 'info');
		}
	}

	/**
	 * Get extension statistics
	 */
	getStats() {
		return { ...this.stats };
	}

	/**
	 * Resolve user identity with error handling
	 */
	private async resolveUser(connection: unknown): Promise<User | null> {
		try {
			const result = this.config.getUser(connection);
			const user = result instanceof Promise ? await result : result;
			
			// Validate user object integrity
			if (user && !user.id) {
				this.log('Invalid user object: missing id field', 'warn');
				return null;
			}
			
			return user;
		} catch (error) {
			this.log(`User resolution failed: ${error}`, 'warn');
			return null;
		}
	}

	/**
	 * Check user permissions with timeout control
	 */
	private async checkPermission(user: User, documentName: string): Promise<PermissionResult> {
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error('Permission check timeout')), this.config.timeout || 5000);
		});

		try {
			const result = this.config.getPermission(user, documentName);
			const permissionPromise = result instanceof Promise ? result : Promise.resolve(result);
			
			const permission = await Promise.race([
				permissionPromise,
				timeoutPromise
			]);
			
			// Validate permission result integrity
			if (!permission || !permission.level) {
				throw new Error('Invalid permission result: missing level');
			}
			
			return permission;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			this.log(`Permission check failed: ${errorMessage}`, 'error');
			throw new PermissionError(`Permission check failed: ${errorMessage}`);
		}
	}

	/**
	 * Check Y.js operation permissions
	 */
	private async checkYjsOperations(
		user: User, 
		documentName: string, 
		update: Uint8Array,
		permission: PermissionResult
	): Promise<boolean> {
		try {
			// Parse Y.js update operations
			const operations = this.parseYjsUpdate(update);
			
			this.log(`Checking ${operations.length} Y.js operations for user ${user.id}`, 'info');
			
			// Check permissions for each operation
			for (const context of operations) {
				const allowed = await this.checkSingleOperation(user, documentName, context, permission);
				if (!allowed) {
					return false;
				}
			}
			
			return true;
		} catch (error) {
			this.log(`Error checking Y.js operations: ${error}`, 'error');
			return false;
		}
	}

	/**
	 * Parse Y.js update content to operation contexts (enhanced)
	 * 
	 * Provides reliable operation parsing with enhanced edge case handling
	 */
	private parseYjsUpdate(update: Uint8Array): YjsOperationContext[] {
		// Input validation
		if (!update || update.length === 0) {
			return [];
		}

		// Basic format validation - check if it looks like a valid Y.js update
		if (update.length < 3) {
			this.log(`Update too short (${update.length} bytes), treating as invalid`, 'warn');
			return [{
				operation: YjsOperationType.UPDATE,
				path: ['document'],
				transactionId: `invalid_${Date.now()}`,
				metadata: {
					error: 'Update too short',
					updateSize: update.length,
					reason: 'Invalid format'
				}
			}];
		}

		// Size limit check
		const MAX_UPDATE_SIZE = 50 * 1024 * 1024; // 50MB
		if (update.length > MAX_UPDATE_SIZE) {
			this.log(`Update size ${update.length} exceeds maximum allowed size`, 'warn');
			return [{
				operation: YjsOperationType.DELETE, // Mark as potentially dangerous operation
				path: ['document'],
				transactionId: `oversized_${Date.now()}`,
				metadata: {
					error: 'Update size exceeds limit',
					updateSize: update.length,
					maxSize: MAX_UPDATE_SIZE
				}
			}];
		}

		// Pre-validation using lib0 decoding to avoid Y.js crashes
		try {
			const decoder = decoding.createDecoder(update);
			// Try to read the first few bytes to validate format
			const firstByte = decoding.readUint8(decoder);
			// Reset decoder position by recreating it
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown decode error';
			this.log(`Pre-validation failed: ${errorMsg}, update size: ${update.length}`, 'warn');
			
			return [{
				operation: YjsOperationType.UPDATE,
				path: ['document'],
				transactionId: `prevalidation_error_${Date.now()}`,
				metadata: {
					error: errorMsg,
					updateSize: update.length,
					reason: 'Pre-validation failed',
					errorType: this.categorizeError(error)
				}
			}];
		}

		let tempDoc: Y.Doc | null = null;
		try {
			tempDoc = new Y.Doc();
			const operations: YjsOperationContext[] = [];
			const transactionId = `tx_${Date.now()}`;
			let transactionCount = 0;
			const MAX_TRANSACTIONS = 1000; // Prevent infinite loops

			// Listen for transaction changes to capture operations
			const transactionHandler = (tr: Y.Transaction) => {
				transactionCount++;
				if (transactionCount > MAX_TRANSACTIONS) {
					this.log(`Transaction count exceeds limit: ${transactionCount}`, 'warn');
					return; // Prevent too many transactions
				}

				try {
					// Parse type changes in transactions
					tr.changed.forEach((changes, ytype) => {
						const path = this.extractTypePathSafely(ytype);
						const operation = this.determineOperationTypeSafely(ytype, changes);
						
						operations.push({
							operation,
							path,
							transactionId,
							origin: this.sanitizeOrigin(tr.origin),
							metadata: { 
								changeCount: changes.size,
								transactionIndex: transactionCount
							}
						});
					});
				} catch (error) {
					this.log(`Error processing transaction: ${error}`, 'warn');
					// Add error operation record
					operations.push({
						operation: YjsOperationType.UPDATE,
						path: ['error'],
						transactionId,
						metadata: {
							error: error instanceof Error ? error.message : 'Transaction error',
							transactionIndex: transactionCount
						}
					});
				}
			};

			tempDoc.on('afterTransaction', transactionHandler);
			
			// Apply update with additional error protection
			Y.applyUpdate(tempDoc, update);
			
			// Result validation and default handling
			if (operations.length === 0) {
				// Create default operation, determine type based on update size
				const defaultOperation = update.length > 1024 
					? YjsOperationType.DELETE  // Large updates may contain delete operations
					: YjsOperationType.UPDATE; // Small updates are usually normal updates

				return [{
					operation: defaultOperation,
					path: ['document'],
					transactionId,
					metadata: { 
						updateSize: update.byteLength,
						reason: 'No operations detected',
						heuristic: true
					}
				}];
			}

			return operations;
			
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown parse error';
			this.log(`Y.js update parsing failed: ${errorMsg}, update size: ${update.length}`, 'error');
			
			// Enhanced error handling: make decisions based on error type and update size
			let operation = YjsOperationType.UPDATE;
			
			// Infer operation type based on error type and update characteristics
			if (errorMsg.includes('memory') || errorMsg.includes('size')) {
				operation = YjsOperationType.DELETE; // Memory/size errors usually involve bulk operations
			} else if (update.length > 10 * 1024) {
				operation = YjsOperationType.DELETE; // Handle large updates conservatively
			}
			
			return [{
				operation,
				path: ['document'],
				transactionId: `error_${Date.now()}`,
				metadata: {
					error: errorMsg,
					updateSize: update.length,
					parseFallback: true,
					errorType: this.categorizeError(error)
				}
			}];
		} finally {
			// Ensure cleanup even if error occurs
			if (tempDoc) {
				try {
					tempDoc.destroy();
				} catch (error) {
					this.log(`Error cleaning up temp document: ${error}`, 'warn');
				}
			}
		}
	}

	/**
	 * Safely extract Y.js type path
	 */
	private extractTypePathSafely(ytype: unknown): string[] {
		try {
			return this.extractTypePath(ytype);
		} catch (error) {
			this.log(`Error extracting type path: ${error}`, 'warn');
			return ['unknown'];
		}
	}

	/**
	 * Safely determine operation type
	 */
	private determineOperationTypeSafely(ytype: unknown, changes: Set<string | null>): YjsOperationType {
		try {
			return this.determineOperationType(ytype, changes);
		} catch (error) {
			this.log(`Error determining operation type: ${error}`, 'warn');
			return YjsOperationType.UPDATE;
		}
	}

	/**
	 * Clean up transaction origin information
	 */
	private sanitizeOrigin(origin: unknown): unknown {
		if (origin === null || origin === undefined) {
			return null;
		}
		
		// Prevent circular references and oversized objects
		try {
			if (typeof origin === 'object') {
				return { type: 'object', class: origin.constructor?.name };
			}
			return origin;
		} catch (error) {
			return { type: 'unknown', error: 'Failed to sanitize origin' };
		}
	}

	/**
	 * Classify error types
	 */
	private categorizeError(error: unknown): string {
		if (!error) return 'unknown';
		
		const message = error instanceof Error ? error.message : String(error);
		
		if (message.includes('memory') || message.includes('heap')) return 'memory';
		if (message.includes('size') || message.includes('limit')) return 'size';
		if (message.includes('decode') || message.includes('parse')) return 'parse';
		if (message.includes('timeout')) return 'timeout';
		
		return 'unknown';
	}

	/**
	 * Check permissions for single operation (simplified)
	 */
	private async checkSingleOperation(
		user: User,
		documentName: string,
		context: YjsOperationContext,
		permission: PermissionResult
	): Promise<boolean> {
		try {
			// 1. Prioritize custom checker (if available)
			if (permission.customChecker) {
				return this.validateWithCustomChecker(permission.customChecker, context, user, documentName, 'Custom checker denied');
			}

			// 2. Check configured operation checker
			if (this.config.checkOperation) {
				const result = this.config.checkOperation(user, documentName, context);
				const allowed = result instanceof Promise ? await result : result;
				return this.handleOperationResult(allowed, user, documentName, context, 'Custom operation check failed');
			}

			// 3. Use built-in permission rules
			return this.checkBuiltinPermissionRules(permission, context, user, documentName);
			
		} catch (error) {
			this.log(`Operation check error: ${error}`, 'error');
			this.triggerOperationDenied(user, documentName, context, `Check error: ${error}`);
			return false;
		}
	}

	/**
	 * Validate using custom checker
	 */
	private validateWithCustomChecker(
		checker: (context: YjsOperationContext) => boolean,
		context: YjsOperationContext,
		user: User,
		documentName: string,
		denyReason: string
	): boolean {
		const allowed = checker(context);
		return this.handleOperationResult(allowed, user, documentName, context, denyReason);
	}

	/**
	 * Handle operation check results
	 */
	private handleOperationResult(
		allowed: boolean,
		user: User,
		documentName: string,
		context: YjsOperationContext,
		denyReason: string
	): boolean {
		if (!allowed) {
			this.triggerOperationDenied(user, documentName, context, denyReason);
		}
		return allowed;
	}

	/**
	 * Check built-in permission rules
	 */
	private checkBuiltinPermissionRules(
		permission: PermissionResult,
		context: YjsOperationContext,
		user: User,
		documentName: string
	): boolean {
		// Check operation type permissions
		if (permission.deniedOperations?.includes(context.operation)) {
			return this.handleOperationResult(false, user, documentName, context, 'Operation type denied');
		}
		
		if (permission.allowedOperations && !permission.allowedOperations.includes(context.operation)) {
			return this.handleOperationResult(false, user, documentName, context, 'Operation type not allowed');
		}

		// Check path permissions
		if (!this.checkPathPermissions(permission, context)) {
			const pathStr = context.path?.join('.') || 'unknown';
			return this.handleOperationResult(false, user, documentName, context, `Path not allowed: ${pathStr}`);
		}

		// Default judgment based on permission level
		if (permission.level === PermissionLevel.WRITE) return true;
		if (permission.level === PermissionLevel.READ) return this.isReadOnlyOperation(context.operation);
		return false; // DENY level
	}

	/**
	 * Check path permissions
	 */
	private checkPathPermissions(permission: PermissionResult, context: YjsOperationContext): boolean {
		if (!context.path) return true; // Default allow when no path information
		
		const pathStr = context.path.join('.');
		
		// Check denied paths
		if (permission.deniedPaths?.some(denied => pathStr.startsWith(denied))) {
			return false;
		}
		
		// Check allowed paths
		if (permission.allowedPaths && permission.allowedPaths.length > 0) {
			return permission.allowedPaths.some(allowed => pathStr.startsWith(allowed));
		}
		
		return true; // Default allow
	}

	/**
	 * Trigger operation denied hook
	 */
	private triggerOperationDenied(user: User, documentName: string, operation: YjsOperationContext, reason: string): void {
		const context: OperationDeniedContext = {
			user,
			documentName,
			operation,
			reason,
			timestamp: Date.now()
		};
		this.config.onOperationDenied?.(context);
		this.log(`Operation denied: ${user.id} -> ${operation.operation} on ${operation.path?.join('.')} - ${reason}`, 'warn');
	}

	/**
	 * Unified logging method
	 */
	private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
		if (this.config.enableLogging && this.config.log) {
			this.config.log(`[Permission] ${message}`, level);
		}
	}

	/**
	 * Determine if operation is read-only
	 */
	private isReadOnlyOperation(operation: YjsOperationType): boolean {
		const readOnlyOps: YjsOperationType[] = [
			// Theoretically, only query-type operations are read-only
			// But in Y.js CRDT, all network transmitted operations are modifications
			// So return false here, only WRITE permission allows synchronization
		];
		return readOnlyOps.includes(operation);
	}

	/**
	 * Extract Y.js type path (simplified)
	 */
	private extractTypePath(ytype: unknown): string[] {
		const path: string[] = [];
		const current = ytype as Record<string, unknown>;
		
		// Traverse up to find path
		let currentItem = current;
		while ((currentItem as any)?._item?.parentSub) {
			path.unshift((currentItem as any)._item.parentSub);
			currentItem = (currentItem as any)._item.parent;
		}
		
		// Default path
		if (path.length === 0) {
			const typeName = ((ytype as Record<string, unknown>).constructor as any)?.name?.toLowerCase()?.replace('y', '') || 'content';
			path.push(typeName);
		}
		
		return path;
	}

	/**
	 * Determine operation type based on Y.js type and changes
	 */
	private determineOperationType(ytype: unknown, changes: Set<string | null>): YjsOperationType {
		if (ytype instanceof Y.Text) {
			return YjsOperationType.TEXT_INSERT;
		}
		if (ytype instanceof Y.Array) {
			return YjsOperationType.ARRAY_INSERT;
		}
		if (ytype instanceof Y.Map) {
			return YjsOperationType.MAP_SET;
		}
		if (((ytype as Record<string, unknown>).constructor as any)?.name?.startsWith('YXml')) {
			return YjsOperationType.XML_INSERT;
		}
		return YjsOperationType.UPDATE;
	}

}

/**
 * Utility function: Create basic permission checker
 */
export function createBasicPermissionChecker(
	allowedOperations: YjsOperationType[] = [],
	allowedPaths: string[] = []
) {
	return (context: YjsOperationContext): boolean => {
		if (allowedOperations.length > 0 && !allowedOperations.includes(context.operation)) {
			return false;
		}
		
		if (allowedPaths.length > 0 && context.path) {
			const pathStr = context.path.join('.');
			return allowedPaths.some(allowed => pathStr.startsWith(allowed));
		}
		
		return true;
	};
}

/**
 * Utility function: Create read-only permission (only allow read and cursor operations)
 */
export function createReadOnlyPermission(): PermissionResult {
	return {
		level: PermissionLevel.READ,
		deniedOperations: [
			YjsOperationType.INSERT,
			YjsOperationType.DELETE,
			YjsOperationType.UPDATE,
			YjsOperationType.TEXT_INSERT,
			YjsOperationType.TEXT_DELETE,
			YjsOperationType.TEXT_FORMAT,
			YjsOperationType.ARRAY_INSERT,
			YjsOperationType.ARRAY_DELETE,
			YjsOperationType.ARRAY_MOVE,
			YjsOperationType.MAP_SET,
			YjsOperationType.MAP_DELETE,
			YjsOperationType.XML_INSERT,
			YjsOperationType.XML_DELETE,
			YjsOperationType.XML_ATTRIBUTE
		]
	};
}

/**
 * Utility function: Create reviewer permission (read-only + comment-related operations)
 */
export function createCommentOnlyPermission(): PermissionResult {
	return {
		level: PermissionLevel.READ,
		allowedOperations: [
			YjsOperationType.MAP_SET,
			YjsOperationType.MAP_DELETE
		],
		allowedPaths: [
			'comments',
			'annotations',
			'suggestions'
		]
	};
}

/**
 * Utility function: Create path-restricted permission
 */
export function createPathRestrictedPermission(
	level: PermissionLevel,
	allowedPaths: string[]
): PermissionResult {
	return {
		level,
		allowedPaths
	};
}

/**
 * Utility function: Create time-limited permission checker
 */
export function createTimeRestrictedChecker(
	startHour = 9,
	endHour = 17,
	allowedOperations: YjsOperationType[] = []
) {
	return (context: YjsOperationContext): boolean => {
		const hour = new Date().getHours();
		if (hour >= startHour && hour <= endHour) {
			return true;
		}
		return allowedOperations.includes(context.operation);
	};
}

/**
 * Utility function: Create role-based permission
 */
export function createRoleBasedPermission(
	role: string,
	rolePermissions: Record<string, PermissionResult>
): PermissionResult {
	return rolePermissions[role] || createReadOnlyPermission();
}

/**
 * Utility function: Combine multiple permission checkers
 */
export function combinePermissionCheckers(
	checkers: ((context: YjsOperationContext) => boolean)[],
	mode: 'AND' | 'OR' = 'AND'
) {
	return (context: YjsOperationContext): boolean => {
		if (mode === 'AND') {
			return checkers.every(checker => checker(context));
		}
		return checkers.some(checker => checker(context));
	};
}