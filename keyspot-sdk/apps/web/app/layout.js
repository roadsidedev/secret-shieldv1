"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const google_1 = require("next/font/google");
const next_themes_1 = require("next-themes");
const session_1 = require("@/lib/session");
const queryClient_1 = require("@/lib/queryClient");
require("./globals.css");
const geistSans = (0, google_1.Geist)({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});
const geistMono = (0, google_1.Geist_Mono)({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});
exports.metadata = {
    title: 'KeySpot — Runtime Security for AI Agents',
    description: 'Detect, vault, and replace secrets at every checkpoint. Enterprise-grade runtime security for autonomous AI agents.',
};
function RootLayout({ children, }) {
    return (<html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased">
        <next_themes_1.ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <session_1.AuthProvider>
            <queryClient_1.QueryProvider>
              {children}
            </queryClient_1.QueryProvider>
          </session_1.AuthProvider>
        </next_themes_1.ThemeProvider>
      </body>
    </html>);
}
//# sourceMappingURL=layout.js.map