/**
 * Unified Permission System Types
 * 
 * Consolidates all permission-related types to avoid circular dependencies.
 */

import type * as Y from "yjs";

/**
 * Client permission levels
 */
export enum ClientPermissionLevel {
  DENY = "deny",
  READ = "read", 
  WRITE = "write",
}

/**
 * Y.js operation types
 */
export enum YjsOperationType {
  // Basic operations
  INSERT = "insert",
  DELETE = "delete",
  UPDATE = "update",
  
  // Data type operations
  TEXT_INSERT = "text_insert",
  TEXT_DELETE = "text_delete", 
  TEXT_FORMAT = "text_format",
  
  ARRAY_INSERT = "array_insert",
  ARRAY_DELETE = "array_delete",
  ARRAY_MOVE = "array_move",
  
  MAP_SET = "map_set",
  MAP_DELETE = "map_delete",
  
  XML_INSERT = "xml_insert",
  XML_DELETE = "xml_delete",
  XML_ATTRIBUTE = "xml_attribute",
  
  // Transaction operations
  TRANSACTION_START = "transaction_start",
  TRANSACTION_COMMIT = "transaction_commit", 
  TRANSACTION_ABORT = "transaction_abort",
}

/**
 * Client permission state
 */
export interface ClientPermissionState {
  level: ClientPermissionLevel;
  reason?: string;
  timestamp?: number;
}

/**
 * Permission change event
 */
export interface PermissionChangeEvent {
  level: ClientPermissionLevel;
  previousLevel?: ClientPermissionLevel;
  reason?: string;
  timestamp?: number;
}

/**
 * Permission denied event
 */
export interface PermissionDeniedEvent {
  operation: string;
  operationType?: YjsOperationType;
  path?: string[];
  reason?: string;
  timestamp?: number;
}

/**
 * Operation permission check event
 */
export interface OperationCheckEvent {
  operationType: YjsOperationType;
  path?: string[];
  allowed: boolean;
  reason?: string;
  timestamp?: number;
}

/**
 * Y.js operation context
 */
export interface YjsOperationContext {
  operation: YjsOperationType;
  path?: string[];
  position?: number;
  key?: string;
  value?: any;
  length?: number;
  attributes?: Record<string, any>;
  clientId?: number;
  clock?: number;
  transactionId?: string;
  metadata?: Record<string, any>;
}

/**
 * Permission configuration
 */
export interface PermissionConfig {
  allowedOperations?: YjsOperationType[];
  deniedOperations?: YjsOperationType[];
  allowedPaths?: string[];
  deniedPaths?: string[];
}

/**
 * Document permission configuration
 */
export interface DocumentPermissionConfig {
  level: ClientPermissionLevel;
  allowedOperations?: YjsOperationType[];
  deniedOperations?: YjsOperationType[];
  allowedPaths?: string[];
  deniedPaths?: string[];
  customChecker?: (context: YjsOperationContext) => boolean;
}

/**
 * Permission statistics
 */
export interface PermissionStats {
  permissionChecks: number;
  permissionDenials: number;
  operationChecks: number;
  operationDenials: number;
}

/**
 * Permission sync response
 */
export interface PermissionSyncResponse {
  level: ClientPermissionLevel;
  allowedOperations?: YjsOperationType[];
  deniedOperations?: YjsOperationType[];
  allowedPaths?: string[];
  deniedPaths?: string[];
  timestamp?: number;
}

/**
 * Permission utility functions
 */
export const PermissionUtils = {
  /**
   * Check if has write permission
   */
  canWrite(level: ClientPermissionLevel): boolean {
    return level === ClientPermissionLevel.WRITE;
  },
  
  /**
   * Check if has read permission
   */
  canRead(level: ClientPermissionLevel): boolean {
    return level !== ClientPermissionLevel.DENY;
  },
  
  /**
   * Check if operation is a modify operation
   */
  isModifyOperation(operationType: YjsOperationType): boolean {
    const modifyOperations = [
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
      YjsOperationType.XML_ATTRIBUTE,
    ];
    return modifyOperations.includes(operationType);
  },
  
  /**
   * Get permission level display name
   */
  getPermissionDisplayName(level: ClientPermissionLevel): string {
    switch (level) {
      case ClientPermissionLevel.WRITE:
        return "Full Access";
      case ClientPermissionLevel.READ:
        return "Read Only";
      case ClientPermissionLevel.DENY:
        return "No Access";
      default:
        return "Unknown";
    }
  }
};

/**
 * Permission preset configurations
 */
export const PermissionPresets = {
  /**
   * Read-only mode
   */
  ReadOnly: (): DocumentPermissionConfig => ({
    level: ClientPermissionLevel.READ,
  }),
  
  /**
   * Comment mode (can only add comments)
   */
  CommentOnly: (): DocumentPermissionConfig => ({
    level: ClientPermissionLevel.READ,
    allowedOperations: [YjsOperationType.MAP_SET, YjsOperationType.MAP_DELETE],
    allowedPaths: ["comments", "annotations", "suggestions"],
  }),
  
  /**
   * Content editor mode (cannot edit metadata)
   */
  ContentEditor: (): DocumentPermissionConfig => ({
    level: ClientPermissionLevel.WRITE,
    deniedPaths: ["metadata.*", "system.*", "admin.*"],
  }),
  
  /**
   * Admin mode (full permissions)
   */
  Admin: (): DocumentPermissionConfig => ({
    level: ClientPermissionLevel.WRITE,
  }),
  
  /**
   * Reviewer mode (can add annotations but cannot modify content)
   */
  Reviewer: (): DocumentPermissionConfig => ({
    level: ClientPermissionLevel.READ,
    allowedOperations: [YjsOperationType.MAP_SET, YjsOperationType.MAP_DELETE],
    allowedPaths: ["reviews", "comments", "annotations"],
  }),
};

/**
 * Type guard functions
 */
export const TypeGuards = {
  isPermissionChangeEvent(obj: any): obj is PermissionChangeEvent {
    return obj && typeof obj.level === "string";
  },
  
  isPermissionDeniedEvent(obj: any): obj is PermissionDeniedEvent {
    return obj && typeof obj.operation === "string";
  },
  
  isOperationCheckEvent(obj: any): obj is OperationCheckEvent {
    return obj && typeof obj.operationType === "string" && typeof obj.allowed === "boolean";
  },
  
  isYjsOperationContext(obj: any): obj is YjsOperationContext {
    return obj && typeof obj.operation === "string";
  },
};

/**
 * Utility functions
 */

/**
 * Create permission state
 */
export function createPermissionState(level: ClientPermissionLevel, reason?: string): ClientPermissionState {
  return { 
    level, 
    reason, 
    timestamp: Date.now() 
  };
}

/**
 * Check if has write permission
 */
export function canWrite(level: ClientPermissionLevel): boolean {
  return PermissionUtils.canWrite(level);
}

/**
 * Check if has read permission
 */
export function canRead(level: ClientPermissionLevel): boolean {
  return PermissionUtils.canRead(level);
}

/**
 * Get permission display name
 */
export function getPermissionDisplayName(level: ClientPermissionLevel): string {
  return PermissionUtils.getPermissionDisplayName(level);
}

/**
 * Check if operation is a modify operation
 */
export function isModifyOperation(operationType: YjsOperationType): boolean {
  return PermissionUtils.isModifyOperation(operationType);
}