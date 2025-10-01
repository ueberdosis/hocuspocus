import { Server } from "@hocuspocus/server";
import { Logger } from "@hocuspocus/extension-logger";
import { SQLite } from "@hocuspocus/extension-sqlite";
import { 
	Permission, 
	PermissionLevel, 
	YjsOperationType,
	type PermissionResult,
	type User,
	type YjsOperationContext,
} from "../../../packages/extension-permission/dist/hocuspocus-extension-permission.esm.js";

// Import our services
import { UserService, type AuthenticatedUser } from "./services/UserService.ts";
import { PermissionService } from "./services/PermissionService.ts";

/**
 * Extract and authenticate user from WebSocket connection using token-based authentication
 */
async function getUser(connection: any): Promise<AuthenticatedUser | null> {
	try {
		// Extract token from connection (Authorization header, URL param, or cookie)
		const token = UserService.extractTokenFromConnection(connection);
		
		if (!token) {
			console.log('[Auth] No authentication token provided');
			return null;
		}
		
		// Authenticate user using token
		const user = await UserService.authenticateByToken(token);
		
		if (user) {
			UserService.logAuthAttempt(token, true, user);
			return user;
		} else {
			UserService.logAuthAttempt(token, false);
			return null;
		}
	} catch (error) {
		console.error('[Auth] Authentication error:', error);
		UserService.logAuthAttempt(null, false);
		return null;
	}
}

/**
 * Get document permission for authenticated user using permission service
 */
async function getPermission(user: AuthenticatedUser, documentName: string): Promise<PermissionResult> {
	try {
		// Anonymous users are denied access
		if (!user) {
			console.log('[Permission] Anonymous user - access denied');
			return { level: PermissionLevel.DENY };
		}
		
		// Use permission service to get document-specific permissions
		return await PermissionService.getDocumentPermission(user, documentName);
	} catch (error) {
		console.error('[Permission] Permission check error:', error);
		// Fail secure - deny access on error
		return { level: PermissionLevel.DENY };
	}
}

/**
 * Check operation-level permissions using permission service
 */
async function checkOperation(user: AuthenticatedUser, documentName: string, context: YjsOperationContext): Promise<boolean> {
	try {
		// Use permission service for comprehensive operation validation
		return await PermissionService.checkOperationPermission(user, documentName, context);
	} catch (error) {
		console.error('[Operation] Operation check error:', error);
		// Fail secure - deny operation on error
		return false;
	}
}

const server = new Server({
	port: Number(process.env.PORT) || 1234,
	
	extensions: [
		new Logger(),
		
		new SQLite({
			database: "hocuspocus-permission.sqlite",
		}),
		
		new Permission({
			getUser,
			getPermission,
			checkOperation,  // Enable operation-level permission checking
			timeout: 5000,   // Increase timeout for service calls
			enableLogging: true,
			
			onPermissionGranted: (context) => {
				const user = context.user as AuthenticatedUser;
				console.log(`[Permission] ✅ Access granted: ${user.username} (${user.role}) → ${context.documentName} [${context.permission.level}]`);
			},
			
			onPermissionDenied: (context) => {
				const user = context.user as AuthenticatedUser;
				console.log(`[Permission] ❌ Access denied: ${user?.username || 'anonymous'} → ${context.documentName} - ${context.reason}`);
			},
			
			onOperationDenied: (context) => {
				const user = context.user as AuthenticatedUser;
				console.log(`[Permission] 🚫 Operation denied: ${user.username} → ${context.operation.operation} on ${context.operation.path?.join('.')} - ${context.reason}`);
			}
		}),
	],

	async onConnect(data) {
		const { documentName, socketId } = data;
		const user = (data.context as any).__user as AuthenticatedUser;
		const permission = (data.context as any).__permission;
		
		console.log(`[Server] 🔌 Connected: ${user?.username || 'anonymous'} (${user?.role || 'none'}) → ${documentName} [${permission?.level}] [${socketId}]`);
		
		// Log available documents for this user (for development)
		if (user) {
			const availableDocuments = PermissionService.getAvailableDocuments(user);
			console.log(`[Server] Available documents for ${user.username}: ${availableDocuments.map(doc => doc.name).join(', ')}`);
		}
	},

	async onDisconnect(data) {
		const { documentName, socketId } = data;
		const user = (data.context as any).__user as AuthenticatedUser;
		
		console.log(`[Server] 🔌 Disconnected: ${user?.username || 'anonymous'} ← ${documentName} [${socketId}]`);
	},
});

server.listen().then(() => {
	const tokens = UserService.getAvailableDemoTokens();
	
	console.log(`\n🚀 Hocuspocus Permission Server (Token-Based Authentication) Started`);
	console.log(`📍 Server: http://localhost:${server.configuration.port}`);
	console.log(`🔌 WebSocket: ws://localhost:${server.configuration.port}`);
	console.log(`\n🔐 Token-Based Authentication Examples:`);
	console.log(`  Authorization Header: ws://localhost:1234/my-doc -H "Authorization: Bearer ${tokens.admin}"`);
	console.log(`  URL Parameter: ws://localhost:1234/my-doc?token=${tokens.editor}`);
	console.log(`  Cookie: Set Cookie: token=${tokens.reviewer}`);
	
	console.log(`\n🎟️ Available Demo Tokens:`);
	console.log(`  Admin:    ${tokens.admin} or ${tokens.adminSecure}`);
	console.log(`  Editor:   ${tokens.editor} or ${tokens.editorSession}`);
	console.log(`  Reviewer: ${tokens.reviewer} or ${tokens.reviewerAccess}`);
	console.log(`  Viewer:   ${tokens.viewer} or ${tokens.viewerReadonly}`);
	console.log(`  Guest:    ${tokens.guest} or ${tokens.guestLimited}`);
	
	console.log(`\n👥 User Roles & Capabilities:`);
	console.log(`  admin    - Full access to all documents and operations`);
	console.log(`  editor   - Write access with path restrictions on some documents`);
	console.log(`  reviewer - Can add comments/reviews but limited content editing`);
	console.log(`  viewer   - Read-only access to most documents`);
	console.log(`  guest    - Limited read access to public documents only`);
	
	console.log(`\n📄 Available Documents & Access Control:`);
	console.log(`  admin-dashboard      - Admin only (confidential)`);
	console.log(`  admin-settings       - Admin only (confidential)`);
	console.log(`  public-announcement  - Role-based access (public)`);
	console.log(`  public-policy        - Role-based access (public)`);
	console.log(`  comment-review-draft - Comment-only access (restricted)`);
	console.log(`  collab-project-spec  - Section-level permissions (private)`);
	console.log(`  protected-legal-doc  - No delete operations (confidential)`);
	console.log(`  [custom-name]        - Fallback to role-based permissions`);
	
	console.log(`\n🎯 Enterprise Features:`);
	console.log(`  • Token-based authentication with JWT-like validation`);
	console.log(`  • Document-level access control lists (ACL)`);
	console.log(`  • Y.js operation-level fine-grained control`);
	console.log(`  • Business rules (working hours, operation limits)`);
	console.log(`  • Path-based permission restrictions`);
	console.log(`  • Real-time permission validation and auditing`);
	
	console.log(`\n🌐 Frontend Testing:`);
	console.log(`  • Web UI: http://localhost:3002/permission`);
	console.log(`  • Use any of the demo tokens above for authentication`);
	console.log(`  • Try different documents to see permission differences`);
	
	console.log(`\n🔍 Business Rules:`);
	console.log(`  • Working hours: 9 AM - 5 PM UTC (editors/reviewers restricted)`);
	console.log(`  • Operation size limits for viewers and guests`);
	console.log(`  • Global path restrictions (system.*, *.secret, etc.)`);
	console.log(`  • Document type-specific operation restrictions`);
	
	console.log(`\n💡 Authentication Methods:`);
	console.log(`  1. Bearer Token: Add "Authorization: Bearer <token>" header`);
	console.log(`  2. URL Parameter: Add "?token=<token>" to connection URL`);
	console.log(`  3. Cookie: Set "token=<token>" cookie`);
	console.log(`\n✨ All authentication is now service-based - no hardcoded users in URL!\n`);
});