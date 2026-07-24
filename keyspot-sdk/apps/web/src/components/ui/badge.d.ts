import { type ReactNode } from 'react';
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';
interface BadgeProps {
    children: ReactNode;
    variant?: BadgeVariant;
    className?: string;
}
export declare function Badge({ children, variant, className }: BadgeProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=badge.d.ts.map