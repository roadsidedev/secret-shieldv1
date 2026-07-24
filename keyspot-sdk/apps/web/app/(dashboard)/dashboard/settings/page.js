'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SettingsPage;
const react_1 = require("react");
const react_2 = require("next-auth/react");
const navigation_1 = require("next/navigation");
const useApi_1 = require("@/hooks/useApi");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const lucide_react_1 = require("lucide-react");
function SettingsPage() {
    const { data: session, status, update } = (0, react_2.useSession)();
    if (status === 'unauthenticated')
        (0, navigation_1.redirect)('/login');
    const user = session?.user;
    const [name, setName] = (0, react_1.useState)(user?.name || '');
    const [currentPassword, setCurrentPassword] = (0, react_1.useState)('');
    const [newPassword, setNewPassword] = (0, react_1.useState)('');
    const [message, setMessage] = (0, react_1.useState)(null);
    const updateProfile = (0, useApi_1.useUpdateProfile)();
    async function handleProfileUpdate(e) {
        e.preventDefault();
        setMessage(null);
        try {
            await updateProfile.mutateAsync({ name });
            await update();
            setMessage({ type: 'success', text: 'Profile updated successfully' });
        }
        catch (err) {
            setMessage({ type: 'error', text: err.message || 'Update failed' });
        }
    }
    async function handlePasswordChange(e) {
        e.preventDefault();
        setMessage(null);
        if (newPassword.length < 8) {
            setMessage({ type: 'error', text: 'New password must be at least 8 characters' });
            return;
        }
        try {
            await updateProfile.mutateAsync({ currentPassword, newPassword });
            setCurrentPassword('');
            setNewPassword('');
            setMessage({ type: 'success', text: 'Password changed successfully' });
        }
        catch (err) {
            setMessage({ type: 'error', text: err.message || 'Password change failed' });
        }
    }
    return (<div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your account</p>
      </div>

      {message && (<div className={`mb-6 p-3 rounded-lg text-sm ${message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
          {message.text}
        </div>)}

      <div className="space-y-8">
        {/* Profile */}
        <card_1.Card title="Profile" subtitle="Update your name">
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" value={user?.email || ''} disabled className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm opacity-60 cursor-not-allowed"/>
              <p className="text-xs text-zinc-400 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white"/>
            </div>
            <button_1.Button type="submit" loading={updateProfile.isPending}>
              <lucide_react_1.User className="w-4 h-4 mr-1"/>
              Save changes
            </button_1.Button>
          </form>
        </card_1.Card>

        {/* Password */}
        <card_1.Card title="Password" subtitle="Change your password">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Current password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white"/>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white" minLength={8}/>
              <p className="text-xs text-zinc-400 mt-1">At least 8 characters</p>
            </div>
            <button_1.Button type="submit" disabled={!currentPassword || !newPassword} loading={updateProfile.isPending}>
              <lucide_react_1.Lock className="w-4 h-4 mr-1"/>
              Update password
            </button_1.Button>
          </form>
        </card_1.Card>

        {/* Account info */}
        <card_1.Card title="Account" subtitle="Account details">
          <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
            <p>
              <span className="text-zinc-500">User ID:</span>{' '}
              <span className="font-mono text-xs">{user?.id}</span>
            </p>
            <p>
              <span className="text-zinc-500">Role:</span>{' '}
              {user?.role || 'USER'}
            </p>
            <p>
              <span className="text-zinc-500">Signed in with:</span>{' '}
              Email
            </p>
          </div>
        </card_1.Card>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map