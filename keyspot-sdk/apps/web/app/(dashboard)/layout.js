"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardLayout;
const sidebar_1 = require("@/components/dashboard/sidebar");
const mobile_nav_1 = require("@/components/dashboard/mobile-nav");
function DashboardLayout({ children }) {
    return (<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">
      <sidebar_1.Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <mobile_nav_1.MobileNav />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>);
}
//# sourceMappingURL=layout.js.map