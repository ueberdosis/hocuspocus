"use client";

import { useState, useEffect, useRef } from "react";
import * as Y from "yjs";
import { 
  createProvider,
  createPermissionAwareProvider, 
  isPermissionAwareProvider,
  HocuspocusProvider,
  ClientPermissionLevel, 
  YjsOperationType,
  canWrite,
  canRead,
  getPermissionDisplayName,
  getOperationDisplayName,
  isModifyOperation,
  type PermissionAwareProvider,
  type PermissionChangeEvent,
  type PermissionDeniedEvent,
  type OperationCheckEvent,
  type SimplePermissionProviderConfig
} from "@hocuspocus/provider";

// Common interfaces
interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

interface User {
  id: string;
  name: string;
  role: 'viewer' | 'commenter' | 'editor' | 'admin';
  color: string;
  isConnected: boolean;
  lastActive: Date;
  permissionLevel?: ClientPermissionLevel;
  provider?: any;
}

// Demo tokens for token-based auth
const DEMO_TOKENS = {
  admin: {
    token: 'demo_admin',
    display: 'Admin',
    role: 'admin',
    description: 'Full system access'
  },
  editor: {
    token: 'demo_editor',
    display: 'Editor',
    role: 'editor', 
    description: 'Write access with restrictions'
  },
  reviewer: {
    token: 'demo_reviewer',
    display: 'Reviewer',
    role: 'reviewer',
    description: 'Comment and review access'
  },
  viewer: {
    token: 'demo_viewer',
    display: 'Viewer',
    role: 'viewer',
    description: 'Read-only access'
  },
  guest: {
    token: 'demo_guest',
    display: 'Guest',
    role: 'guest',
    description: 'Limited public access'
  }
} as const;

// Demo documents
const DEMO_DOCUMENTS = [
  {
    name: 'admin-dashboard',
    displayName: 'Admin Dashboard',
    description: 'System administration panel',
    classification: 'confidential' as const,
    icon: '🛠️',
    accessRules: ['Admin only', 'Full system control']
  },
  {
    name: 'public-announcement',
    displayName: 'Public Announcement',
    description: 'Company-wide announcements',
    classification: 'public' as const,
    icon: '📢',
    accessRules: ['Role-based access', 'Read permissions vary by role']
  },
  {
    name: 'comment-review-draft',
    displayName: 'Review Draft',
    description: 'Document under review',
    classification: 'restricted' as const,
    icon: '📝',
    accessRules: ['Comment-only for reviewers', 'Limited editing']
  },
  {
    name: 'collab-project-spec',
    displayName: 'Project Specification',
    description: 'Technical project requirements',
    classification: 'private' as const,
    icon: '📋',
    accessRules: ['Section-level permissions', 'Path-based restrictions']
  }
];

export default function UnifiedPermissionDemo() {
  const [activeTab, setActiveTab] = useState<'token-auth' | 'multi-user' | 'operations' | 'basic'>('token-auth');
  
  // Common state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-99), { timestamp, message, type }]);
  };

  const clearLogs = () => setLogs([]);

  // Tab navigation
  const tabs = [
    {
      id: 'token-auth' as const,
      label: '🔐 Token Authentication',
      description: 'Enterprise token-based authentication with service integration'
    },
    {
      id: 'multi-user' as const,
      label: '👥 Multi-User Collaboration',
      description: 'Multiple users with different permission levels'
    },
    {
      id: 'operations' as const,
      label: '⚡ Operation-Level Control',
      description: 'Fine-grained Y.js operation permissions'
    },
    {
      id: 'basic' as const,
      label: '📚 Basic Permission Demo',
      description: 'Simple permission concepts and configuration'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🔒 Hocuspocus Permission System
          </h1>
          <p className="text-lg text-gray-600">
            Comprehensive demonstration of enterprise-grade permission controls and real-time collaboration security
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="text-base font-semibold">{tab.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{tab.description}</div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'token-auth' && <TokenAuthDemo addLog={addLog} />}
          {activeTab === 'multi-user' && <MultiUserDemo addLog={addLog} />}
          {activeTab === 'operations' && <OperationsDemo addLog={addLog} />}
          {activeTab === 'basic' && <BasicDemo addLog={addLog} />}
        </div>

        {/* Unified Logs Panel */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">📊 Real-time Operation Logs</h2>
            <button
              onClick={clearLogs}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Clear Logs
            </button>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 h-48 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">🔍 No operations logged yet. Interact with the demos above...</div>
            ) : (
              logs.map((logEntry, index) => (
                <div 
                  key={index} 
                  className={`mb-1 ${
                    logEntry.type === 'error' ? 'text-red-400' :
                    logEntry.type === 'warning' ? 'text-yellow-400' :
                    logEntry.type === 'success' ? 'text-green-400' :
                    logEntry.type === 'info' ? 'text-blue-400' :
                    'text-green-400'
                  }`}
                >
                  <span className="text-gray-500">[{logEntry.timestamp}]</span> {logEntry.message}
                </div>
              ))
            )}
          </div>
          
          <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
            <span>🔄 Auto-scroll enabled • Real-time permission validation</span>
            <span>Total logs: {logs.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Token Authentication Demo Component
function TokenAuthDemo({ addLog }: { addLog: (msg: string, type?: LogEntry["type"]) => void }) {
  const [currentToken, setCurrentToken] = useState<keyof typeof DEMO_TOKENS>('viewer');
  const [documentName, setDocumentName] = useState('public-announcement');
  const [provider, setProvider] = useState<PermissionAwareProvider | null>(null);
  const [permission, setPermission] = useState<ClientPermissionLevel>('deny');
  const [text, setText] = useState('');
  const [authMethod, setAuthMethod] = useState<'bearer' | 'url' | 'cookie'>('url');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const connectWithToken = async () => {
    if (provider) {
      provider.destroy();
    }

    const tokenInfo = DEMO_TOKENS[currentToken];
    const doc = new Y.Doc();
    
    let url = `ws://localhost:1234/${documentName}`;
    let headers: Record<string, string> = {};

    // Apply authentication method
    switch (authMethod) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${tokenInfo.token}`;
        break;
      case 'url':
        url += `?token=${tokenInfo.token}`;
        break;
      case 'cookie':
        document.cookie = `token=${tokenInfo.token}; path=/`;
        break;
    }

    addLog(`🔐 Connecting as ${tokenInfo.display} to ${documentName} via ${authMethod}`, 'info');

    try {
      const newProvider = createPermissionAwareProvider({
        url,
        name: documentName,
        document: doc,
        // @ts-ignore
        headers,
        onPermissionChange: (event: PermissionChangeEvent) => {
          addLog(`🔐 Permission: ${event.previousLevel || 'none'} → ${event.level}`, 'info');
          setPermission(event.level);
        },
        onPermissionDenied: (event: PermissionDeniedEvent) => {
          addLog(`🚫 Denied: ${event.operation} - ${event.reason || 'No permission'}`, 'warning');
        },
        enableClientSidePermissionCheck: true,
        disableEditingWhenReadOnly: true,
        showPermissionStatus: true
      }) as PermissionAwareProvider;

      const ytext = doc.getText('content');
      ytext.observe(() => {
        setText(ytext.toString());
      });

      newProvider.on('connect', () => {
        addLog(`✅ Connected as ${tokenInfo.display}`, 'success');
      });

      newProvider.on('disconnect', () => {
        addLog(`❌ Disconnected`, 'error');
      });

      setProvider(newProvider);
    } catch (error) {
      addLog(`❌ Connection failed: ${error}`, 'error');
    }
  };

  const handleTextChange = (newText: string) => {
    if (provider?.document) {
      const ytext = provider.document.getText('content');
      if (canWrite(permission)) {
        ytext.delete(0, ytext.length);
        ytext.insert(0, newText);
        addLog(`✏️ Text updated: ${newText.length} chars`, 'info');
      } else {
        addLog(`🚫 Edit blocked - insufficient permissions`, 'warning');
      }
    }
  };

  const switchUser = (tokenKey: keyof typeof DEMO_TOKENS) => {
    setCurrentToken(tokenKey);
    addLog(`👤 Switching to ${DEMO_TOKENS[tokenKey].display}`, 'info');
  };

  const switchDocument = (docName: string) => {
    setDocumentName(docName);
    addLog(`📄 Switching to document: ${docName}`, 'info');
  };

  useEffect(() => {
    connectWithToken();
    return () => {
      if (provider) {
        provider.destroy();
      }
    };
  }, [currentToken, documentName, authMethod]);

  return (
    <div className="space-y-6">
      {/* Authentication Method Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">🔑 Authentication Method</h2>
        <div className="flex gap-4">
          {(['bearer', 'url', 'cookie'] as const).map((method) => (
            <button
              key={method}
              onClick={() => setAuthMethod(method)}
              className={`px-4 py-2 rounded-lg border-2 transition-all ${
                authMethod === method
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">
                {method === 'bearer' ? '🛡️ Bearer Token' :
                 method === 'url' ? '🔗 URL Parameter' : '🍪 Cookie'}
              </div>
              <div className="text-xs text-gray-500">
                {method === 'bearer' ? 'Authorization Header' :
                 method === 'url' ? '?token=...' : 'Cookie: token=...'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* User Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">👤 User Roles & Tokens</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(DEMO_TOKENS).map(([tokenKey, tokenInfo]) => (
            <button
              key={tokenKey}
              onClick={() => switchUser(tokenKey as keyof typeof DEMO_TOKENS)}
              className={`p-4 rounded-lg border-2 transition-all ${
                currentToken === tokenKey
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium text-sm">{tokenInfo.display}</div>
              <div className="text-xs text-gray-500 mt-1">{tokenInfo.role}</div>
              <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded mt-2">
                {tokenInfo.token}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Document Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">📄 Document Library</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DEMO_DOCUMENTS.map((doc) => (
            <button
              key={doc.name}
              onClick={() => switchDocument(doc.name)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                documentName === doc.name
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{doc.icon}</span>
                <span className={`px-2 py-1 text-xs rounded font-medium ${
                  doc.classification === 'confidential' ? 'bg-red-100 text-red-700' :
                  doc.classification === 'restricted' ? 'bg-yellow-100 text-yellow-700' :
                  doc.classification === 'private' ? 'bg-blue-100 text-blue-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {doc.classification.toUpperCase()}
                </span>
              </div>
              <h3 className="font-semibold text-sm mb-1">{doc.displayName}</h3>
              <p className="text-xs text-gray-600">{doc.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Collaborative Editor */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">📝 Collaborative Editor</h2>
          <div className="flex items-center space-x-2">
            {provider && (
              <>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  provider.wsconnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {provider.wsconnected ? '🟢 Connected' : '🔴 Disconnected'}
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  permission === 'write' ? 'bg-blue-100 text-blue-700' :
                  permission === 'read' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {permission === 'write' ? '✏️ Write' : 
                   permission === 'read' ? '👁️ Read-Only' : 
                   '🚫 No Access'}
                </div>
              </>
            )}
          </div>
        </div>
        
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={
            !canRead(permission) 
              ? "❌ No permission to access this document" 
              : canWrite(permission) 
                ? "Start collaborative editing... (Changes sync in real-time)" 
                : "📖 Read-only mode - editing disabled"
          }
          disabled={!canRead(permission)}
          className={`w-full h-40 p-4 border rounded-lg resize-none font-mono text-sm transition-colors ${
            !canRead(permission) 
              ? 'bg-red-50 border-red-200 text-red-600' 
              : canWrite(permission) 
                ? 'bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                : 'bg-yellow-50 border-yellow-200 text-gray-700'
          }`}
        />
      </div>
    </div>
  );
}

// Placeholder components for other tabs
function MultiUserDemo({ addLog }: { addLog: (msg: string, type?: LogEntry["type"]) => void }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">👥 Multi-User Collaboration Demo</h2>
      <p className="text-gray-600">
        This demo shows multiple users collaborating simultaneously with different permission levels.
        Each user connects with their own provider instance and permission context.
      </p>
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">🚧 Implementation in progress...</p>
      </div>
    </div>
  );
}

function OperationsDemo({ addLog }: { addLog: (msg: string, type?: LogEntry["type"]) => void }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">⚡ Operation-Level Permission Control</h2>
      <p className="text-gray-600">
        This demo shows fine-grained control over individual Y.js operations like text insert, 
        delete, format, and map operations based on user permissions and document paths.
      </p>
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">🚧 Implementation in progress...</p>
      </div>
    </div>
  );
}

function BasicDemo({ addLog }: { addLog: (msg: string, type?: LogEntry["type"]) => void }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">📚 Basic Permission Concepts</h2>
      <p className="text-gray-600">
        This demo explains the fundamental concepts of Hocuspocus permissions: 
        permission levels, user authentication, document access control, and basic configuration.
      </p>
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">🚧 Implementation in progress...</p>
      </div>
    </div>
  );
}