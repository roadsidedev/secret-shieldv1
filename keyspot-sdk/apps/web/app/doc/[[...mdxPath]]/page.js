"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStaticParams = void 0;
exports.generateMetadata = generateMetadata;
exports.default = Page;
const pages_1 = require("nextra/pages");
exports.generateStaticParams = (0, pages_1.generateStaticParamsFor)('mdxPath');
async function generateMetadata({ params }) {
    const { mdxPath } = await params;
    const { metadata } = await (0, pages_1.importPage)(mdxPath);
    return metadata;
}
async function Page({ params, ...props }) {
    const { mdxPath } = await params;
    const { default: MDXContent, toc, metadata, sourceCode } = await (0, pages_1.importPage)(mdxPath);
    return <MDXContent {...props} params={mdxPath}/>;
}
//# sourceMappingURL=page.js.map