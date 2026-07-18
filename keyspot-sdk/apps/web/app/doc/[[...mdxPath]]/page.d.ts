export declare const generateStaticParams: () => Promise<{
    [x: string]: string | string[];
}[]>;
export declare function generateMetadata({ params }: {
    params: Promise<{
        mdxPath: string[];
    }>;
}): Promise<import("nextra", { with: { "resolution-mode": "import" } }).$NextraMetadata>;
export default function Page({ params, ...props }: {
    params: Promise<{
        mdxPath: string[];
    }>;
}): Promise<import("react").JSX.Element>;
//# sourceMappingURL=page.d.ts.map