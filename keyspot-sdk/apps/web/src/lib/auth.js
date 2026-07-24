"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.signOut = exports.signIn = exports.handlers = void 0;
const next_auth_1 = __importDefault(require("next-auth"));
const credentials_1 = __importDefault(require("next-auth/providers/credentials"));
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
_a = (0, next_auth_1.default)({
    trustHost: true,
    providers: [
        (0, credentials_1.default)({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password)
                    return null;
                try {
                    const res = await fetch(`${API_URL}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    });
                    if (!res.ok)
                        return null;
                    const data = await res.json();
                    return {
                        id: data.user.id,
                        email: data.user.email,
                        name: data.user.name,
                        accessToken: data.accessToken,
                        refreshToken: data.refreshToken,
                        subscriptionTier: data.subscription?.tier || 'FREE',
                        subscriptionStatus: data.subscription?.status || 'ACTIVE',
                    };
                }
                catch {
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.accessToken = user.accessToken;
                token.refreshToken = user.refreshToken;
                token.subscriptionTier = user.subscriptionTier || 'FREE';
                token.subscriptionStatus = user.subscriptionStatus || 'ACTIVE';
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.accessToken = token.accessToken;
                session.user.subscriptionTier = token.subscriptionTier;
                session.user.subscriptionStatus = token.subscriptionStatus;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60,
    },
}), exports.handlers = _a.handlers, exports.signIn = _a.signIn, exports.signOut = _a.signOut, exports.auth = _a.auth;
//# sourceMappingURL=auth.js.map