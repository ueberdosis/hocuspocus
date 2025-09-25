// Core Provider Export
export * from "./HocuspocusProvider.ts";
export * from "./HocuspocusProviderWebsocket.ts";
export * from "./types.ts";

// Unified Permission System Export
export * from "./PermissionTypes.ts";
export * from "./PermissionManager.ts";

// Factory functions for easy Provider creation
export {
  createProvider,
  createProviderWithPermissionPreset,
  upgradeToPermissionAware,
  isPermissionAwareProvider,
  PermissionPresets,
  ClientPermissionLevel,
  type DocumentPermissionConfig,
  type PermissionAwareProviderConfiguration,
  type ProviderFactoryOptions,
} from "./Factory.ts";

// Direct exports from PermissionManager for advanced usage
export {
  PermissionManager,
  PermissionAwareProvider,
  PermissionAwareDocument,
  createPermissionAwareProvider,
  createProviderWithPreset,
  type PermissionAwareDocumentConfig,
} from "./PermissionManager.ts";

// Utility functions
export {
  PermissionUtils,
  TypeGuards,
  canWrite,
  canRead,
  getPermissionDisplayName,
  isModifyOperation,
  createPermissionState,
} from "./PermissionTypes.ts";

// Backward compatibility aliases
export const createPermissionAwareDocument = () => {
  console.warn('createPermissionAwareDocument is deprecated. Use documentPermissionConfig in createProvider instead.');
  return null;
};

// Backward compatibility aliases - import createProvider first
import { createProvider } from "./Factory.ts";

export const createSmartProvider = createProvider;
export const createDebugProvider = createProvider;
