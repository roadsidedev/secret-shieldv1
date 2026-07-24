'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sidebar = Sidebar;
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const react_1 = require("next-auth/react");
const navItems = [
    { href: '/dashboard', label: 'Overview', icon: lucide_react_1.LayoutDashboard },
    { href: '/dashboard/keys', label: 'API Keys', icon: lucide_react_1.KeyRound },
    { href: '/dashboard/usage', label: 'Usage', icon: lucide_react_1.BarChart3 },
    { href: '/dashboard/billing', label: 'Billing', icon: lucide_react_1.CreditCard },
    { href: '/dashboard/settings', label: 'Settings', icon: lucide_react_1.Settings },
];
function Sidebar() {
    const pathname = (0, navigation_1.usePathname)();
    return (<div className="hidden lg:flex lg:flex-col lg:w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <div className="flex items-center gap-2 px-6 h-14 border-b border-zinc-200 dark:border-zinc-800">
        <lucide_react_1.Shield className="w-5 h-5"/>
        <span className="font-semibold">KeySpot</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (<link_1.default key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${isActive
                    ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50'}`}>
              <item.icon className="w-4 h-4"/>
              {item.label}
            </link_1.default>);
        })}
      </nav>

      <div className="px-3 pb-4">
        <button onClick={() => (0, react_1.signOut)({ callbackUrl: '/login' })} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50 w-full transition">
          <lucide_react_1.LogOut className="w-4 h-4"/>
          Sign out
        </button>
      </div>
    </div>);
}
//# sourceMappingURL=sidebar.js.map