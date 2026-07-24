import { type ButtonHTMLAttributes } from 'react';
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
}
export declare function Button({ variant, size, loading, disabled, className, children, ...props }: ButtonProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=button.d.ts.map