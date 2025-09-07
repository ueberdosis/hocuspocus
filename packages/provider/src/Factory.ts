/**
 * Simplified Factory Functions for Provider Creation
 *
 * Provides backward-compatible factory functions for progressive upgrade 
 * to permission-aware providers with reduced complexity.
 */

import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";

import { HocuspocusProvider, type HocuspocusProviderConfiguration } from "./HocuspocusProvider.ts";
import {
  PermissionAwareProvider,
  createPermissionAwareProvider,
  createProviderWithPreset,
  isPermissionAwareProvider,
  type PermissionAwareProviderConfiguration,
} from "./PermissionManager.ts";
import {
  ClientPermissionLevel,
  type DocumentPermissionConfig,
  PermissionPresets,
} from "./PermissionTypes.ts";

/**
 * Simplified provider creation options
 */
export interface ProviderFactoryOptions {
  // Basic configuration (required)
  name: string;
  
  // Basic configuration (optional)
  document?: Y.Doc;
  awareness?: Awareness | null;
  token?: string | (() => string) | (() => Promise<string>) | null;
  url?: string;

  // Permission-related configuration
  enablePermissions?: boolean;
  documentPermissionConfig?: DocumentPermissionConfig;
  
  // Allow additional provider configuration options
  [key: string]: any;
}

/**
 * Smart provider factory function
 * 
 * Automatically chooses to create a standard provider or permission-aware provider
 * based on the configuration. Maintains backward compatibility without affecting existing code.
 * 
 * @param options - Provider configuration options
 * @returns HocuspocusProvider or PermissionAwareProvider instance
 */
export function createProvider(
  options: ProviderFactoryOptions
): HocuspocusProvider | PermissionAwareProvider {
  // Smart detection of whether permission features should be enabled
  // Force enable permissions when token is present or explicitly enabled
  const shouldEnablePermissions = options.enablePermissions ?? !!(
    options.token || // Having a token usually requires permission control
    options.documentPermissionConfig // Having document permission configuration
  );

  // Always create permission-aware provider when token is present
  // This ensures proper permission handling for authenticated users
  if (shouldEnablePermissions || options.token) {
    // Create permission-aware provider
    const permissionConfig: PermissionAwareProviderConfiguration = {
      ...options,
      enableClientSidePermissionCheck: true,
      disableEditingWhenReadOnly: true,
      showPermissionStatus: true,
      documentPermissionConfig: options.documentPermissionConfig,
    };

    return createPermissionAwareProvider(permissionConfig);
  }

  // Create standard provider only when no token and permissions explicitly disabled
  return new HocuspocusProvider(options as any);
}

/**
 * Create provider with preset permissions
 * 
 * @param options - Configuration options (excluding documentPermissionConfig)
 * @param preset - Permission preset name
 * @returns Permission-aware provider instance
 */
export function createProviderWithPermissionPreset(
  options: Omit<ProviderFactoryOptions, 'documentPermissionConfig'>,
  preset: keyof typeof PermissionPresets
): PermissionAwareProvider {
  return createProviderWithPreset({
    ...options,
    preset,
  } as any);
}

/**
 * Upgrade existing provider to permission-aware provider
 * 
 * @param provider - Existing provider instance
 * @param permissionConfig - Permission configuration
 * @returns New permission-aware provider instance
 */
export function upgradeToPermissionAware(
  provider: HocuspocusProvider,
  permissionConfig: Partial<DocumentPermissionConfig> = {}
): PermissionAwareProvider {
  // Get existing provider configuration
  const config = provider.configuration;

  // Destroy existing provider
  provider.destroy();

  // Create permission-aware provider
  const permissionAwareConfig: PermissionAwareProviderConfiguration = {
    ...config,
    enableClientSidePermissionCheck: true,
    disableEditingWhenReadOnly: true,
    showPermissionStatus: true,
    documentPermissionConfig: {
      level: ClientPermissionLevel.WRITE,
      ...permissionConfig,
    },
  };

  return createPermissionAwareProvider(permissionAwareConfig);
}

/**
 * Type guard: check if provider is permission-aware
 */
export { isPermissionAwareProvider };

/**
 * Export permission preset configurations
 */
export { PermissionPresets };

/**
 * Convenience exports
 */
export {
  createPermissionAwareProvider,
  createProviderWithPreset,
  PermissionAwareProvider,
  ClientPermissionLevel,
  type DocumentPermissionConfig,
  type PermissionAwareProviderConfiguration,
};