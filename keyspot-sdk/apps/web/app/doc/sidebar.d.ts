interface SidebarGroup {
    label: string;
    separator?: boolean;
    pages: {
        href: string;
        label: string;
    }[];
}
export declare function DocSidebar({ groups, onItemClick }: {
    groups: SidebarGroup[];
    onItemClick?: () => void;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=sidebar.d.ts.map