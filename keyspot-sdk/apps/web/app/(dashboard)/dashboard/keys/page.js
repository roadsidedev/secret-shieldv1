'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ApiKeysPage;
const react_1 = require("react");
const react_2 = require("next-auth/react");
const navigation_1 = require("next/navigation");
const useApi_1 = require("@/hooks/useApi");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const badge_1 = require("@/components/ui/badge");
const lucide_react_1 = require("lucide-react");
function ApiKeysPage() {
    const { data: session, status } = (0, react_2.useSession)();
    if (status === 'unauthenticated')
        (0, navigation_1.redirect)('/login');
    const [showKey, setShowKey] = (0, react_1.useState)(null);
    const [name, setName] = (0, react_1.useState)('');
    const [creating, setCreating] = (0, react_1.useState)(false);
    const [newKey, setNewKey] = (0, react_1.useState)(null);
    const { data: keys, isLoading } = (0, useApi_1.useApiKeys)();
    const createKey = (0, useApi_1.useCreateApiKey)();
    const revokeKey = (0, useApi_1.useRevokeApiKey)();
    async function handleCreate() {
        if (!name.trim())
            return;
        setCreating(true);
        try {
            const result = await createKey.mutateAsync({ name });
            setNewKey(result.plaintext);
            setName('');
        }
        catch (err) {
            alert(err.message || 'Failed to create key');
        }
        finally {
            setCreating(false);
        }
    }
    async function handleRevoke(id) {
        if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.'))
            return;
        await revokeKey.mutateAsync(id);
    }
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text);
    }
    return (<div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
          <p className="text-sm text-zinc-500 mt-1">Create and manage API keys for programmatic access</p>
        </div>
      </div>

      {/* New Key Created Alert */}
      {newKey && (<div className="mb-6 p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
            Key created — copy it now. You won&apos;t be able to see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs p-2 rounded bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800 truncate">
              {newKey}
            </code>
            <button_1.Button variant="secondary" size="sm" onClick={() => copyToClipboard(newKey)}>
              <lucide_react_1.Copy className="w-3 h-3"/>
            </button_1.Button>
            <button_1.Button variant="primary" size="sm" onClick={() => setNewKey(null)}>
              Dismiss
            </button_1.Button>
          </div>
        </div>)}

      {/* Create Key */}
      <card_1.Card title="Create a new key" subtitle="Give your key a descriptive name" className="mb-8">
        <div className="flex gap-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production CI/CD" className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white" onKeyDown={(e) => e.key === 'Enter' && handleCreate()}/>
          <button_1.Button onClick={handleCreate} loading={creating} disabled={!name.trim()}>
            <lucide_react_1.Plus className="w-4 h-4 mr-1"/>
            Create
          </button_1.Button>
        </div>
      </card_1.Card>

      {/* Keys List */}
      <card_1.Card title="Your API Keys" subtitle={keys?.length ? `${keys.length} active key(s)` : 'No keys created yet'}>
        {isLoading ? (<p className="text-sm text-zinc-400 py-4">Loading...</p>) : !keys?.length ? (<div className="text-center py-8">
            <lucide_react_1.KeyRound className="w-8 h-8 mx-auto text-zinc-300 mb-2"/>
            <p className="text-sm text-zinc-400">No API keys yet. Create one above to get started.</p>
          </div>) : (<div className="space-y-3">
            {keys.map((key) => (<div key={key.id} className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{key.name}</span>
                    {key.scopes?.map((scope) => (<badge_1.Badge key={scope} variant="default">{scope}</badge_1.Badge>))}
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-zinc-500">
                      {showKey === key.id ? key.key : `${key.prefix}_${'•'.repeat(32)}`}
                    </code>
                    <button onClick={() => setShowKey(showKey === key.id ? null : key.id)} className="text-zinc-400 hover:text-zinc-600">
                      {showKey === key.id ? <lucide_react_1.EyeOff className="w-3 h-3"/> : <lucide_react_1.Eye className="w-3 h-3"/>}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                    {key.expiresAt && ` · Expires ${new Date(key.expiresAt).toLocaleDateString()}`}
                  </p>
                </div>
                <button onClick={() => handleRevoke(key.id)} className="p-2 text-zinc-400 hover:text-red-600 transition ml-4" title="Revoke key">
                  <lucide_react_1.Trash2 className="w-4 h-4"/>
                </button>
              </div>))}
          </div>)}
      </card_1.Card>
    </div>);
}
//# sourceMappingURL=page.js.map