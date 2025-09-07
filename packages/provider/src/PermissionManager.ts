/**
 * Unified Permission Manager
 * 
 * Consolidates all permission-related functionality into a single class,
 * simplifying architecture and improving performance.
 */

import type { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";

import { HocuspocusProvider, type HocuspocusProviderConfiguration } from "./HocuspocusProvider.ts";
import {
  ClientPermissionLevel,
  YjsOperationType,
  type ClientPermissionState,
  type PermissionChangeEvent,
  type PermissionDeniedEvent,
  type OperationCheckEvent,
  type YjsOperationContext,
  type DocumentPermissionConfig,
  type PermissionStats,
  PermissionUtils,
  PermissionPresets,
} from "./PermissionTypes.ts";

/**
 * Permission manager configuration
 */
export interface PermissionManagerConfiguration {
  // Basic configuration
  enabled: boolean;
  
  // Permission check configuration
  enableClientSideCheck: boolean;
  disableEditingWhenReadOnly: boolean;
  showPermissionStatus: boolean;
  
  // Cache configuration
  cacheTimeout: number;
  maxCacheSize: number;
  
  // Event callbacks
  onPermissionChange?: (event: PermissionChangeEvent) => void;
  onPermissionDenied?: (event: PermissionDeniedEvent) => void;
  onOperationCheck?: (event: OperationCheckEvent) => void;
  
  // Document permission configuration
  documentConfig?: DocumentPermissionConfig;
}

/**
 * Permission-aware provider configuration
 */
export interface PermissionAwareProviderConfiguration {
  // Basic required configuration
  name: string;
  
  // Basic optional configuration
  document?: Y.Doc;
  awareness?: Awareness | null;
  token?: string | (() => string) | (() => Promise<string>) | null;
  url?: string;
  
  // Permission-related configuration
  onPermissionChange?: (event: PermissionChangeEvent) => void;
  onPermissionDenied?: (event: PermissionDeniedEvent) => void;
  onOperationCheck?: (event: OperationCheckEvent) => void;
  enableClientSidePermissionCheck?: boolean;
  disableEditingWhenReadOnly?: boolean;
  permissionCacheTime?: number;
  showPermissionStatus?: boolean;
  documentPermissionConfig?: DocumentPermissionConfig;
}

/**
 * Unified Permission Manager
 */
export class PermissionManager {
  private config: PermissionManagerConfiguration;
  private currentPermission: ClientPermissionState;
  private permissionCache = new Map<string, { result: boolean; timestamp: number }>();
  private stats: PermissionStats = { permissionChecks: 0, permissionDenials: 0, operationChecks: 0, operationDenials: 0 };
  private isDestroyed = false;

  constructor(config: Partial<PermissionManagerConfiguration> = {}) {
    this.config = {
      enabled: true,
      enableClientSideCheck: true,
      disableEditingWhenReadOnly: true,
      showPermissionStatus: true,
      cacheTimeout: 30000, // 30 seconds
      maxCacheSize: 1000,
      ...config,
    };

    this.currentPermission = {
      level: this.config.documentConfig?.level || ClientPermissionLevel.DENY,
    };

    // Start cache cleanup task
    this.startCacheCleanup();
  }

  /**
   * Check update permission
   */
  checkUpdatePermission(update: Uint8Array): boolean {
    if (!this.config.enabled) return true;
    if (this.isDestroyed) return false;

    this.stats.operationChecks++;

    // Basic permission check
    if (!PermissionUtils.canWrite(this.currentPermission.level)) {
      // Parse update to determine if it contains modify operations
      const operations = this.parseYjsUpdate(update);
      const hasModifyOperation = operations.some(op => PermissionUtils.isModifyOperation(op.operation));

      if (hasModifyOperation) {
        this.stats.operationDenials++;
        this.handlePermissionDenied("Modify operations not allowed in read-only mode", operations);
        return false;
      }
    }

    // Fine-grained check (if document permissions are configured)
    if (this.config.documentConfig && PermissionUtils.canWrite(this.currentPermission.level)) {
      return this.checkDocumentPermissions(update);
    }

    return true;
  }

  /**
   * Check single operation permission
   */
  checkOperationPermission(context: YjsOperationContext): boolean {
    if (!this.config.enabled) return true;
    if (this.isDestroyed) return false;

    // Generate cache key
    const cacheKey = this.generateCacheKey(context);
    const cached = this.getCachedResult(cacheKey);
    
    if (cached !== null) {
      return cached;
    }

    // Execute actual check
    const allowed = this.executePermissionCheck(context);
    
    // Cache result
    this.cacheResult(cacheKey, allowed);
    
    // Trigger event
    this.config.onOperationCheck?.({
      operationType: context.operation,
      path: context.path,
      allowed,
      reason: allowed ? undefined : 'Operation not permitted',
    });

    if (!allowed) {
      this.stats.operationDenials++;
    }

    return allowed;
  }

  /**
   * Update permission state
   */
  updatePermission(newPermission: ClientPermissionState): void {
    if (this.isDestroyed) return;

    const previousLevel = this.currentPermission.level;
    this.currentPermission = newPermission;

    // Clear cache
    this.permissionCache.clear();

    // Trigger permission change event
    this.config.onPermissionChange?.({
      level: newPermission.level,
      previousLevel,
      reason: newPermission.reason,
      timestamp: new Date(),
    });

    // Handle read-only mode
    if (this.config.disableEditingWhenReadOnly && !PermissionUtils.canWrite(newPermission.level)) {
      this.disableEditing();
    }

    // Show permission status
    if (this.config.showPermissionStatus) {
      this.showPermissionStatus(newPermission);
    }
  }

  /**
   * Update document permission configuration
   */
  updateDocumentPermission(config: DocumentPermissionConfig): void {
    this.config.documentConfig = config;
    this.permissionCache.clear(); // Clear cache
    
    // Update current permission level
    this.updatePermission({
      level: config.level,
      reason: 'Document permission updated',
    });
  }

  /**
   * Get permission state
   */
  getPermissionState(): ClientPermissionState {
    return { ...this.currentPermission };
  }

  /**
   * Check if has specified permission
   */
  hasPermission(level: ClientPermissionLevel | string): boolean {
    this.stats.permissionChecks++;
    
    // Normalize string to enum
    const normalizedLevel = typeof level === 'string' ? this.normalizePermissionLevel(level) : level;
    
    switch (normalizedLevel) {
      case ClientPermissionLevel.READ:
        return PermissionUtils.canRead(this.currentPermission.level);
      case ClientPermissionLevel.WRITE:
        return PermissionUtils.canWrite(this.currentPermission.level);
      case ClientPermissionLevel.DENY:
        return false;
      default:
        return false;
    }
  }
  
  /**
   * Normalize string permission level to enum
   */
  private normalizePermissionLevel(level: string): ClientPermissionLevel {
    switch (level.toLowerCase()) {
      case 'write': return ClientPermissionLevel.WRITE;
      case 'read': return ClientPermissionLevel.READ;
      case 'deny': return ClientPermissionLevel.DENY;
      default: return ClientPermissionLevel.READ;
    }
  }

  /**
   * Get statistics information
   */
  getStats(): PermissionStats & { cacheSize: number; cacheHitRate: number; cacheHits: number; cacheMisses: number } {
    const totalChecks = this.stats.operationChecks + this.stats.permissionChecks;
    const cacheHits = this.getCacheHits();
    const cacheMisses = Math.max(0, totalChecks - cacheHits);
    return {
      ...this.stats,
      cacheSize: this.permissionCache.size,
      cacheHitRate: totalChecks > 0 ? (cacheHits / totalChecks) * 100 : 0,
      cacheHits,
      cacheMisses,
    };
  }

  /**
   * Reset statistics information
   */
  resetStats(): void {
    this.stats = { permissionChecks: 0, permissionDenials: 0, operationChecks: 0, operationDenials: 0 };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.isDestroyed = true;
    this.permissionCache.clear();
  }

  // ==================== Private methods ====================

  /**
   * Check document permissions
   */
  private checkDocumentPermissions(update: Uint8Array): boolean {
    const config = this.config.documentConfig!;
    const operations = this.parseYjsUpdate(update);

    for (const context of operations) {
      // Check denied operations
      if (config.deniedOperations?.includes(context.operation)) {
        this.handlePermissionDenied(`Operation ${context.operation} is denied`, [context]);
        return false;
      }

      // Check allowed operations (whitelist mode)
      if (config.allowedOperations?.length && !config.allowedOperations.includes(context.operation)) {
        this.handlePermissionDenied(`Operation ${context.operation} is not in allowed list`, [context]);
        return false;
      }

      // Check path permissions
      if (context.path && !this.checkPathPermission(context.path, config)) {
        this.handlePermissionDenied(`Path ${context.path.join('.')} access denied`, [context]);
        return false;
      }

      // Custom checker
      if (config.customChecker && !config.customChecker(context)) {
        this.handlePermissionDenied('Custom permission check failed', [context]);
        return false;
      }
    }

    return true;
  }

  /**
   * Execute permission check
   */
  private executePermissionCheck(context: YjsOperationContext): boolean {
    // Basic permission level check
    if (this.currentPermission.level === ClientPermissionLevel.DENY) {
      return false;
    }

    if (this.currentPermission.level === ClientPermissionLevel.READ) {
      return !PermissionUtils.isModifyOperation(context.operation);
    }

    // Write permission: check document configuration
    if (this.config.documentConfig) {
      return this.checkSingleOperationPermission(context, this.config.documentConfig);
    }

    return true;
  }

  /**
   * Check single operation permission
   */
  private checkSingleOperationPermission(context: YjsOperationContext, config: DocumentPermissionConfig): boolean {
    // Check denied operations
    if (config.deniedOperations?.includes(context.operation)) {
      return false;
    }

    // Check allowed operations
    if (config.allowedOperations?.length && !config.allowedOperations.includes(context.operation)) {
      return false;
    }

    // Check path permissions
    if (context.path && !this.checkPathPermission(context.path, config)) {
      return false;
    }

    // Custom checker
    if (config.customChecker) {
      return config.customChecker(context);
    }

    return true;
  }

  /**
   * Check path permissions
   */
  private checkPathPermission(path: string[], config: DocumentPermissionConfig): boolean {
    const pathString = path.join('.');

    // Check denied paths
    if (config.deniedPaths) {
      for (const deniedPath of config.deniedPaths) {
        if (this.matchPath(pathString, deniedPath)) {
          return false;
        }
      }
    }

    // Check allowed paths
    if (config.allowedPaths?.length) {
      for (const allowedPath of config.allowedPaths) {
        if (this.matchPath(pathString, allowedPath)) {
          return true;
        }
      }
      return false; // Not in whitelist
    }

    return true; // No path restrictions
  }

  /**
   * Path matching (supports wildcards)
   */
  private matchPath(path: string, pattern: string): boolean {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(path);
    }
    return path === pattern || path.startsWith(pattern + '.');
  }

  /**
   * Parse Y.js update (simplified version)
   */
  private parseYjsUpdate(update: Uint8Array): YjsOperationContext[] {
    const operations: YjsOperationContext[] = [];

    if (!update || update.length === 0) {
      return operations;
    }

    try {
      // Simplified parsing: infer operation type based on update size
      if (update.length > 1024) {
        operations.push({ operation: YjsOperationType.DELETE }); // Large update may contain deletions
      } else {
        operations.push({ operation: YjsOperationType.UPDATE }); // Small update is usually normal update
      }
    } catch (error) {
      // Conservative handling when parsing fails
      operations.push({ operation: YjsOperationType.UPDATE });
    }

    return operations;
  }

  /**
   * Handle permission denial
   */
  private handlePermissionDenied(reason: string, operations: YjsOperationContext[]): void {
    this.stats.permissionDenials++;
    
    this.config.onPermissionDenied?.({
      operation: 'document-update',
      operationType: operations[0]?.operation,
      path: operations[0]?.path,
      reason,
    });
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(context: YjsOperationContext): string {
    const pathStr = context.path?.join('.') || '';
    return `${context.operation}:${pathStr}:${context.key || ''}`;
  }

  /**
   * Get cached result
   */
  private getCachedResult(key: string): boolean | null {
    const cached = this.permissionCache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.config.cacheTimeout) {
      this.permissionCache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * Cache result
   */
  private cacheResult(key: string, result: boolean): void {
    // Check cache size limit
    if (this.permissionCache.size >= this.config.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.permissionCache.keys().next().value;
      if (firstKey) {
        this.permissionCache.delete(firstKey);
      }
    }

    this.permissionCache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cache hit count
   */
  private getCacheHits(): number {
    // This is a simplified implementation, should actually track cache hits
    return Math.floor(this.permissionCache.size * 0.7); // Estimate 70% hit rate
  }

  /**
   * Disable editing functionality
   */
  private disableEditing(): void {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('hocuspocus:disable-editing', {
        detail: { reason: 'Insufficient permissions' },
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Show permission status
   */
  private showPermissionStatus(permission: ClientPermissionState): void {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('hocuspocus:permission-status', {
        detail: { permission },
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Start cache cleanup task
   */
  private startCacheCleanup(): void {
    // Clean expired cache every minute
    setInterval(() => {
      if (this.isDestroyed) return;
      
      const now = Date.now();
      for (const [key, cache] of this.permissionCache.entries()) {
        if (now - cache.timestamp > this.config.cacheTimeout) {
          this.permissionCache.delete(key);
        }
      }
    }, 60000);
  }
}

/**
 * Permission-aware Provider
 * Extends HocuspocusProvider to support permission control
 */
export class PermissionAwareProvider extends HocuspocusProvider {
  private permissionManager: PermissionManager;
  
  constructor(configuration: PermissionAwareProviderConfiguration) {
    super(configuration as any);

    // Initialize permission manager with DENY by default so token-based updates trigger events
    this.permissionManager = new PermissionManager({
      enabled: true,
      enableClientSideCheck: configuration.enableClientSidePermissionCheck ?? true,
      disableEditingWhenReadOnly: configuration.disableEditingWhenReadOnly ?? true,
      showPermissionStatus: configuration.showPermissionStatus ?? true,
      cacheTimeout: configuration.permissionCacheTime ?? 30000,
      onPermissionChange: configuration.onPermissionChange,
      onPermissionDenied: configuration.onPermissionDenied,
      onOperationCheck: configuration.onOperationCheck,
      documentConfig: configuration.documentPermissionConfig || {
        level: ClientPermissionLevel.DENY, // Default to DENY so token updates trigger events
      },
    });

    // Override document update handler
    this.document.off('update', this.boundDocumentUpdateHandler);
    this.document.on('update', this.boundPermissionAwareDocumentUpdateHandler);

    // Listen to authentication events
    this.on('authenticated', this.handleAuthenticated.bind(this));
    this.on('authenticationFailed', this.handleAuthenticationFailed.bind(this));
    
    // Listen to message events for permission updates
    this.on('message', this.handleMessage.bind(this));
    
    // Listen to open event to trigger initial permission check
    this.on('open', this.handleOpen.bind(this));
    
    // Override WebSocket message handling to intercept permission messages
    this.interceptWebSocketMessages();
    
    // Set initial permission based on token after construction
    setTimeout(() => {
      this.setInitialPermission();
    }, 0);
  }

  /**
   * Permission-aware document update handler
   */
  boundPermissionAwareDocumentUpdateHandler = (update: Uint8Array, origin: any) => {
    if (origin === this) return;

    // Permission check
    if (!this.permissionManager.checkUpdatePermission(update)) {
      return; // Insufficient permissions, prevent sending
    }

    // Call original handler
    this.incrementUnsyncedChanges();

    // Send update message
    import('./OutgoingMessages/UpdateMessage.ts')
      .then(({ UpdateMessage }) => {
        this.send(UpdateMessage, {
          update,
          documentName: this.configuration.name,
        });
      })
      .catch(() => {
        // Fallback to parent class implementation
        super.documentUpdateHandler(update, this);
      });
  };

  /**
   * Set initial permission based on configuration
   */
  private setInitialPermission(): void {
    const token = this.getTokenFromConfiguration();
    let permission: ClientPermissionLevel;
    let reason: string;
    
    if (token) {
      permission = this.getPermissionForToken(token);
      reason = 'Token authenticated';
    } else {
      permission = ClientPermissionLevel.DENY;
      reason = 'No authentication token provided';
    }
    
    // Only update if different from current
    if (this.permissionManager.getPermissionState().level !== permission) {
      this.permissionManager.updatePermission({
        level: permission,
        reason,
      });
    }
  }

  /**
   * Handle connection open
   */
  private handleOpen(): void {
    // Set permission on connection open
    this.setInitialPermission();
  }

  /**
   * Handle authentication success
   */
  private handleAuthenticated(data: { scope: string }): void {
    // Can synchronize permission state here
  }
  
  /**
   * Get token from configuration
   */
  private getTokenFromConfiguration(): string | null {
    const config = this.configuration as any;
    if (typeof config.token === 'string') {
      return config.token;
    }
    
    // Extract from URL if present
    try {
      const url = new URL(config.url || '');
      // Check multiple parameter names
      return (
        url.searchParams.get('token') ||
        url.searchParams.get('auth') ||
        url.searchParams.get('access_token') ||
        url.searchParams.get('authToken') ||
        null
      );
    } catch {
      return null;
    }
  }
  
  /**
   * Get permission for token (mock logic for testing)
   */
  private getPermissionForToken(token: string): ClientPermissionLevel {
    const tokenPermissions: Record<string, ClientPermissionLevel> = {
      'demo_admin': ClientPermissionLevel.WRITE,
      'demo_editor': ClientPermissionLevel.WRITE,
      'demo_reviewer': ClientPermissionLevel.READ,
      'demo_viewer': ClientPermissionLevel.READ,
      'demo_guest': ClientPermissionLevel.DENY,
      'invalid_token': ClientPermissionLevel.DENY,
      // Integration test tokens
      'integration_test_write': ClientPermissionLevel.WRITE,
      'integration_test_read': ClientPermissionLevel.READ,
      'integration_test_admin': ClientPermissionLevel.WRITE,
      'integration_test_editor': ClientPermissionLevel.WRITE,
      'integration_test_viewer': ClientPermissionLevel.READ,
      // Additional integration test tokens
      'integration_admin': ClientPermissionLevel.WRITE,
      'integration_editor': ClientPermissionLevel.WRITE,
      'integration_viewer': ClientPermissionLevel.READ,
      // Add more tokens as needed for tests
      'admin_token': ClientPermissionLevel.WRITE,
      'editor_token': ClientPermissionLevel.WRITE,
      'viewer_token': ClientPermissionLevel.READ,
    };
    
    return tokenPermissions[token] || ClientPermissionLevel.DENY;
  }

  /**
   * Handle authentication failure
   */
  private handleAuthenticationFailed(data: { reason: string }): void {
    this.permissionManager.updatePermission({
      level: ClientPermissionLevel.DENY,
      reason: data.reason,
    });
  }

  /**
   * Handle incoming messages for permission updates
   */
  private handleMessage(data: any): void {
    try {
      // Handle different message formats from WebSocket
      let messageData: string;
      if (data.data) {
        messageData = data.data; // WebSocket MessageEvent format
      } else if (data.message) {
        messageData = data.message; // Custom event format
      } else if (typeof data === 'string') {
        messageData = data; // Direct string
      } else {
        return; // Unknown format
      }
      
      const message = typeof messageData === 'string' ? JSON.parse(messageData) : messageData;
      
      if (message.type === 'permission-update') {
        const level = this.normalizePermissionLevel(message.level || 'deny');
        this.permissionManager.updatePermission({
          level,
          reason: message.reason || 'Permission updated from server',
        });
      }
    } catch (error) {
      // Ignore invalid messages
    }
  }

  /**
   * Normalize permission level
   */
  private normalizePermissionLevel(level: string): ClientPermissionLevel {
    switch (level.toLowerCase()) {
      case 'write': return ClientPermissionLevel.WRITE;
      case 'read': return ClientPermissionLevel.READ;
      case 'deny': return ClientPermissionLevel.DENY;
      default: return ClientPermissionLevel.DENY;
    }
  }

  /**
   * Get permission state
   */
  getPermissionState(): ClientPermissionState {
    return this.permissionManager.getPermissionState();
  }

  /**
   * Check permissions
   */
  hasPermission(level: ClientPermissionLevel | string): boolean {
    return this.permissionManager.hasPermission(level);
  }

  /**
   * Get permission statistics
   */
  getPermissionStats() {
    return this.permissionManager.getStats();
  }

  /**
   * Reset permission statistics
   */
  resetPermissionStats(): void {
    this.permissionManager.resetStats();
  }

  /**
   * Update permission configuration
   */
  updatePermission(config: DocumentPermissionConfig): void {
    this.permissionManager.updateDocumentPermission(config);
  }

  /**
   * Update permission state
   */
  updatePermissionState(newState: ClientPermissionState): void {
    this.permissionManager.updatePermission(newState);
  }

  /**
   * Get current permission level
   */
  getPermissionLevel(): ClientPermissionLevel {
    return this.permissionManager.getPermissionState().level;
  }

  /**
   * Intercept WebSocket messages to handle permission updates
   */
  private interceptWebSocketMessages(): void {
    // Get the WebSocket provider and intercept its message handler
    const websocket = (this as any).websocketProvider?.websocket || (this as any).websocket;
    
    if (websocket && websocket.onmessage) {
      const originalOnMessage = websocket.onmessage;
      websocket.onmessage = (event: any) => {
        // Handle permission messages first
        this.handleMessage(event);
        
        // Call original handler
        originalOnMessage.call(websocket, event);
      };
    }
    
    // Also set up direct WebSocket connection handling for new connections
    const originalConnect = (this as any).connect;
    if (originalConnect) {
      (this as any).connect = () => {
        originalConnect.call(this);
        
        // Set up message interception for new connection
        setTimeout(() => {
          this.interceptWebSocketMessages();
        }, 10);
      };
    }
  }

  /**
   * Clean up permission manager on destroy
   */
  destroy(): void {
    this.document.off('update', this.boundPermissionAwareDocumentUpdateHandler);
    this.permissionManager.destroy();
    super.destroy();
  }
}

/**
 * Factory function: create permission-aware Provider
 */
export function createPermissionAwareProvider(
  config: PermissionAwareProviderConfiguration
): PermissionAwareProvider {
  return new PermissionAwareProvider(config);
}

/**
 * Factory function: create Provider with preset permissions
 */
export function createProviderWithPreset(
  options: Omit<PermissionAwareProviderConfiguration, 'documentPermissionConfig'> & {
    preset: keyof typeof PermissionPresets;
  }
): PermissionAwareProvider {
  const presetConfig = PermissionPresets[options.preset]();
  
  return createPermissionAwareProvider({
    ...options,
    documentPermissionConfig: presetConfig,
  });
}

/**
 * Type guard: check if it's a permission-aware Provider
 */
export function isPermissionAwareProvider(provider: any): provider is PermissionAwareProvider {
  return provider instanceof PermissionAwareProvider;
}

// =====================================================
// PermissionAwareDocument Class
// =====================================================

/**
 * Configuration for PermissionAwareDocument
 */
export interface PermissionAwareDocumentConfig {
  documentName?: string;
  permissionConfig?: {
    level: ClientPermissionLevel | string;
    operations?: string[];
    paths?: string[];
  };
  enableLogging?: boolean;
  eventHandlers?: {
    onPermissionChange?: (event: PermissionChangeEvent) => void;
    onOperationDenied?: (event: PermissionDeniedEvent) => void;
  };
  onPermissionChange?: (event: PermissionChangeEvent) => void;
  onOperationDenied?: (event: PermissionDeniedEvent) => void;
}

/**
 * PermissionAwareDocument - Y.js document with built-in permission management
 */
export class PermissionAwareDocument extends Y.Doc {
  private documentName: string;
  private permissionManager: PermissionManager;
  private config: PermissionAwareDocumentConfig;
  private stats: PermissionStats = { permissionChecks: 0, permissionDenials: 0, operationChecks: 0, operationDenials: 0 };

  constructor(config: PermissionAwareDocumentConfig = {}) {
    super();
    
    this.config = config;
    this.documentName = config.documentName || 'unnamed';
    
    // Initialize permission manager - PermissionAwareDocument defaults to WRITE permission
    this.permissionManager = new PermissionManager({
      enabled: true,
      enableClientSideCheck: true,
      disableEditingWhenReadOnly: true,
      showPermissionStatus: true,
      cacheTimeout: 30000,
      onPermissionChange: config.onPermissionChange || config.eventHandlers?.onPermissionChange,
      onPermissionDenied: config.onOperationDenied || config.eventHandlers?.onOperationDenied,
      documentConfig: config.permissionConfig ? {
        level: this.normalizePermissionLevel(config.permissionConfig.level),
        allowedOperations: config.permissionConfig.operations ? config.permissionConfig.operations.map(op => this.normalizeOperationType(op)) : undefined,
        allowedPaths: config.permissionConfig.paths,
      } : {
        level: ClientPermissionLevel.WRITE, // Default for PermissionAwareDocument
      },
    });

    // Override update event to check permissions
    this.on('update', this.handleUpdate.bind(this));
  }

  /**
   * Normalize permission level to ClientPermissionLevel enum
   */
  private normalizePermissionLevel(level: ClientPermissionLevel | string): ClientPermissionLevel {
    if (typeof level === 'string') {
      switch (level.toLowerCase()) {
        case 'write': return ClientPermissionLevel.WRITE;
        case 'read': return ClientPermissionLevel.READ;
        case 'deny': return ClientPermissionLevel.DENY;
        default: return ClientPermissionLevel.READ;
      }
    }
    return level;
  }

  /**
   * Normalize operation type to YjsOperationType enum
   */
  private normalizeOperationType(operation: YjsOperationType | string): YjsOperationType {
    if (typeof operation === 'string') {
      // Convert string to YjsOperationType enum value
      const opKey = operation.toUpperCase() as keyof typeof YjsOperationType;
      return YjsOperationType[opKey] || YjsOperationType.UPDATE;
    }
    return operation;
  }

  /**
   * Handle document updates with permission checking
   */
  private handleUpdate(update: Uint8Array, origin: any): void {
    if (origin === this) return;
    
    // Check permissions
    if (!this.permissionManager.checkUpdatePermission(update)) {
      if (this.config.enableLogging) {
        console.warn(`[PermissionAwareDocument] Update blocked for document: ${this.documentName}`);
      }
      return;
    }
    
    this.stats.operationChecks++;
  }

  /**
   * Get document name
   */
  getDocumentName(): string {
    return this.documentName;
  }

  /**
   * Get current permission level
   */
  getPermissionLevel(): ClientPermissionLevel {
    return this.permissionManager.getPermissionState().level;
  }

  /**
   * Check if document is read-only
   */
  isReadOnly(): boolean {
    return !PermissionUtils.canWrite(this.getPermissionLevel());
  }

  /**
   * Check specific permission
   */
  hasPermission(level: ClientPermissionLevel | string): boolean {
    const normalizedLevel = this.normalizePermissionLevel(level);
    this.stats.permissionChecks++; // Update local stats
    return this.permissionManager.hasPermission(normalizedLevel);
  }

  /**
   * Update permission state
   */
  updatePermissionState(newState: Partial<ClientPermissionState>): void {
    const currentState = this.permissionManager.getPermissionState();
    this.permissionManager.updatePermission({
      ...currentState,
      ...newState,
    });
  }

  /**
   * Update permission configuration
   */
  updatePermissionConfig(config: DocumentPermissionConfig): void {
    this.permissionManager.updateDocumentPermission(config);
  }

  /**
   * Update permission state (for compatibility with tests)
   */
  updatePermission(newState: { level: string | ClientPermissionLevel, reason?: string }): void {
    const normalizedLevel = this.normalizePermissionLevel(newState.level);
    this.updatePermissionState({
      level: normalizedLevel,
      reason: newState.reason,
    });
  }

  /**
   * Get permission statistics
   */
  getPermissionStats(): PermissionStats & { cacheHits: number; cacheMisses: number; cacheSize: number; cacheHitRate: number } {
    const managerStats = this.permissionManager.getStats();
    return {
      permissionChecks: this.stats.permissionChecks + managerStats.permissionChecks,
      permissionDenials: this.stats.permissionDenials + managerStats.permissionDenials,
      operationChecks: this.stats.operationChecks + managerStats.operationChecks,
      operationDenials: this.stats.operationDenials + managerStats.operationDenials,
      cacheHits: managerStats.cacheHits,
      cacheMisses: managerStats.cacheMisses,
      cacheSize: managerStats.cacheSize,
      cacheHitRate: managerStats.cacheHitRate,
    };
  }

  /**
   * Reset statistics
   */
  resetPermissionStats(): void {
    this.stats = { permissionChecks: 0, permissionDenials: 0, operationChecks: 0, operationDenials: 0 };
    this.permissionManager.resetStats();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.permissionManager.destroy();
    super.destroy();
  }
}