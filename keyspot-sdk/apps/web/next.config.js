"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nextra_1 = __importDefault(require("nextra"));
const withNextra = (0, nextra_1.default)({
    contentDirBasePath: '/doc',
});
exports.default = withNextra({
    // Allow the dashboard routes to work alongside the doc pages
    transpilePackages: ['@tanstack/react-query', 'recharts'],
    env: {
        NEXTRA_LOCALES: JSON.stringify(['']),
    },
});
//# sourceMappingURL=next.config.js.map