'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DocLayout;
const react_1 = require("react");
const sidebar_1 = require("./sidebar");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const sidebarGroups = [
    {
        label: 'Getting Started',
        separator: true,
        pages: [
            { href: '/doc', label: 'Overview' },
            { href: '/doc/installation', label: 'Installation' },
            { href: '/doc/quick-start', label: 'Quick Start' },
        ],
    },
    {
        label: 'Core',
        separator: true,
        pages: [
            { href: '/doc/concepts', label: 'Core Concepts' },
            { href: '/doc/api-reference', label: 'API Reference' },
            { href: '/doc/scanner', label: 'Scanner' },
            { href: '/doc/taint-engine', label: 'Taint Engine' },
            { href: '/doc/promptshield', label: 'PromptShield' },
            { href: '/doc/checkpoint-system', label: 'Checkpoint System' },
        ],
    },
    {
        label: 'Storage',
        separator: true,
        pages: [
            { href: '/doc/vault-adapters', label: 'Vault Adapters' },
            { href: '/doc/audit-compliance', label: 'Audit & Compliance' },
        ],
    },
    {
        label: 'Integrations',
        separator: true,
        pages: [
            { href: '/doc/integrations', label: 'Framework Integrations' },
            { href: '/doc/vector-store-adapters', label: 'Vector Store Adapters' },
            { href: '/doc/cli', label: 'CLI' },
        ],
    },
    {
        label: 'Deploy',
        separator: true,
        pages: [
            { href: '/doc/observability', label: 'Observability' },
            { href: '/doc/pricing-deployment', label: 'Pricing & Deployment' },
            { href: '/doc/security-architecture', label: 'Security Architecture' },
            { href: '/doc/threat-model', label: 'Threat Model' },
        ],
    },
    {
        label: 'Other',
        separator: true,
        pages: [
            { href: '/doc/python-sdk', label: 'Python SDK' },
        ],
    },
];
function DocLayout({ children }) {
    const [isMenuOpen, setIsMenuOpen] = (0, react_1.useState)(false);
    const pathname = (0, navigation_1.usePathname)();
    (0, react_1.useEffect)(() => {
        setIsMenuOpen(false);
    }, [pathname]);
    const allPages = (0, react_1.useMemo)(() => sidebarGroups.flatMap(g => g.pages), []);
    const currentIndex = (0, react_1.useMemo)(() => allPages.findIndex(p => p.href === pathname), [allPages, pathname]);
    const currentPage = allPages[currentIndex] || allPages[0];
    const prevPage = currentIndex > 0 ? allPages[currentIndex - 1] : null;
    const nextPage = currentIndex >= 0 && currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null;
    return (<div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 -ml-2 md:hidden text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Toggle menu">
              {isMenuOpen ? <lucide_react_1.X size={20}/> : <lucide_react_1.Menu size={20}/>}
            </button>
            <link_1.default href="/" className="font-bold tracking-tight text-xl hover:opacity-80 transition-opacity">
              KeySpot
            </link_1.default>
          </div>

          <div className="flex items-center gap-4 sm:gap-8 text-sm font-medium">
            <link_1.default href="/doc" className="text-zinc-950 dark:text-white">Docs</link_1.default>
            <link_1.default href="/pricing" className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors">Pricing</link_1.default>
            <a href="https://github.com/roadsidedev/keyspot-sdk" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors">
              <lucide_react_1.GitBranch size={20}/>
            </a>
          </div>
        </div>
      </nav>

      {/* Mobile Breadcrumb */}
      <div className="md:hidden border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50 px-5 py-3 flex items-center text-xs font-medium text-zinc-500">
        <link_1.default href="/doc" className="hover:text-zinc-950 dark:hover:text-white transition-colors">Docs</link_1.default>
        <lucide_react_1.ChevronRight size={14} className="mx-1.5 opacity-50 shrink-0"/>
        <span className="text-zinc-900 dark:text-white truncate">{currentPage?.label}</span>
      </div>

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
        {/* Sidebar - Desktop */}
        <div className="hidden md:block">
          <sidebar_1.DocSidebar groups={sidebarGroups}/>
        </div>

        {/* Sidebar - Mobile Overlay */}
        {isMenuOpen && (<div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-zinc-950/20 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}/>
            <div className="absolute inset-y-0 left-0 w-72 bg-white dark:bg-zinc-950 shadow-2xl border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto pt-16">
              <sidebar_1.DocSidebar groups={sidebarGroups} onItemClick={() => setIsMenuOpen(false)}/>
            </div>
          </div>)}

        {/* Main Content */}
        <main className="flex-1 min-w-0 px-5 sm:px-8 md:px-12 py-10 md:py-12">
          <div className="max-w-[800px]">
            <article className="prose prose-zinc dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:tracking-tight
              prose-h1:text-4xl max-md:prose-h1:text-3xl
              prose-h2:text-2xl max-md:prose-h2:text-xl
              prose-h3:text-xl max-md:prose-h3:text-lg
              prose-p:text-zinc-600 dark:prose-p:text-zinc-400
              prose-a:text-zinc-900 dark:prose-a:text-white prose-a:font-medium prose-a:underline-offset-4 hover:prose-a:text-blue-600 dark:hover:prose-a:text-blue-400
              prose-strong:text-zinc-900 dark:prose-strong:text-white
              prose-code:text-zinc-900 dark:prose-code:text-zinc-100 prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
              prose-pre:bg-zinc-950 dark:prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-pre:rounded-xl prose-pre:shadow-lg
              prose-blockquote:border-l-[3px] prose-blockquote:border-zinc-300 dark:prose-blockquote:border-zinc-700 prose-blockquote:not-italic prose-blockquote:text-zinc-600 dark:prose-blockquote:text-zinc-400
            ">
              {children}
            </article>

            {/* Dynamic Previous / Next Navigation */}
            <div className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row justify-between gap-4">
              {prevPage ? (<link_1.default href={prevPage.href} className="group flex flex-col p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-white transition-all flex-1">
                  <span className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                    <lucide_react_1.ChevronLeft size={12}/> Previous
                  </span>
                  <span className="font-semibold group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                    {prevPage.label}
                  </span>
                </link_1.default>) : <div className="flex-1"/>}
              {nextPage ? (<link_1.default href={nextPage.href} className="group flex flex-col p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-white transition-all flex-1 text-right">
                  <span className="text-xs text-zinc-500 mb-1 flex items-center justify-end gap-1">
                    Next <lucide_react_1.ChevronRight size={12}/>
                  </span>
                  <span className="font-semibold group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                    {nextPage.label}
                  </span>
                </link_1.default>) : <div className="flex-1"/>}
            </div>
          </div>
        </main>
      </div>
    </div>);
}
//# sourceMappingURL=layout.js.map