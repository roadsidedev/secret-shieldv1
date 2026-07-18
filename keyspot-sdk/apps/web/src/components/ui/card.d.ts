import { type ReactNode } from 'react';
interface CardProps {
    title?: string;
    subtitle?: string;
    children: ReactNode;
    className?: string;
    action?: ReactNode;
}
export declare function Card({ title, subtitle, children, className, action }: CardProps): import("react").JSX.Element;
export declare function StatCard({ label, value, sublabel, trend, }: {
    label: string;
    value: string;
    sublabel?: string;
    trend?: {
        value: string;
        positive: boolean;
    };
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=card.d.ts.map