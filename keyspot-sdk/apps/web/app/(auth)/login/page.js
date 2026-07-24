'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoginPage;
const react_1 = require("react");
const react_2 = require("next-auth/react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const button_1 = require("@/components/ui/button");
function LoginPage() {
    const router = (0, navigation_1.useRouter)();
    const [email, setEmail] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const [error, setError] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await (0, react_2.signIn)('credentials', {
                email,
                password,
                redirect: false,
            });
            if (result?.error) {
                setError('Invalid email or password');
                return;
            }
            router.push('/dashboard');
            router.refresh();
        }
        catch {
            setError('An error occurred. Please try again.');
        }
        finally {
            setLoading(false);
        }
    }
    return (<div className="w-full max-w-sm">
      <div className="flex items-center justify-center gap-2 mb-8">
        <lucide_react_1.Shield className="w-6 h-6"/>
        <span className="text-xl font-semibold">KeySpot</span>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8">
        <h1 className="text-lg font-semibold mb-1">Sign in</h1>
        <p className="text-sm text-zinc-500 mb-6">Enter your credentials to access your dashboard</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white" required autoComplete="email"/>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white" required autoComplete="current-password"/>
          </div>

          {error && (<p className="text-sm text-red-600">{error}</p>)}

          <button_1.Button type="submit" loading={loading} className="w-full">
            Sign in
          </button_1.Button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-500">
          <link_1.default href="/register" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Create an account
          </link_1.default>
          <span className="mx-2">·</span>
          <link_1.default href="/forgot-password" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Forgot password?
          </link_1.default>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map