export declare const handlers: {
    POST: (req: NextRequest) => Promise<Response>;
    GET: (req: NextRequest) => Promise<Response>;
}, signIn: <P extends import(".pnpm/@auth+core@0.41.2_nodemailer@6.10.1/node_modules/@auth/core/providers", { with: { "resolution-mode": "import" } }).ProviderId, R extends boolean = true>(provider?: P, options?: FormData | ({
    redirectTo?: string;
    redirect?: R;
} & Record<string, any>), authorizationParams?: string[][] | Record<string, string> | string | URLSearchParams) => Promise<R extends false ? any : never>, signOut: <R extends boolean = true>(options?: {
    redirectTo?: string;
    redirect?: R;
}) => Promise<R extends false ? any : never>, auth: ((args_0: import("next").NextApiRequest, args_1: import("next").NextApiResponse) => Promise<import("next-auth", { with: { "resolution-mode": "import" } }).Session | null>) & (() => Promise<import("next-auth", { with: { "resolution-mode": "import" } }).Session | null>) & ((args_0: import("next").GetServerSidePropsContext) => Promise<import("next-auth", { with: { "resolution-mode": "import" } }).Session | null>) & ((args_0: (req: import("next-auth", { with: { "resolution-mode": "import" } }).NextAuthRequest, ctx: import("../../node_modules/next-auth/lib/types.js", { with: { "resolution-mode": "import" } }).AppRouteHandlerFnContext) => ReturnType<import("../../node_modules/next-auth/lib/types.js", { with: { "resolution-mode": "import" } }).AppRouteHandlerFn>) => import("../../node_modules/next-auth/lib/types.js", { with: { "resolution-mode": "import" } }).AppRouteHandlerFn) & ((args_0: import("../../node_modules/next-auth/lib/index.js", { with: { "resolution-mode": "import" } }).NextAuthMiddleware) => NextMiddleware);
//# sourceMappingURL=auth.d.ts.map