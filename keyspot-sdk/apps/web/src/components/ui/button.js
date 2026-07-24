"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = Button;
const variantStyles = {
    primary: 'bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200',
    secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
    ghost: 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
    danger: 'bg-red-600 text-white hover:bg-red-700',
};
const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-arbitrum',
};
function Button({ variant = 'primary', size = 'md', loading, disabled, className = '', children, ...props }) {
    return (<button className={`rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? (<span className="flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/>
          Loading...
        </span>) : (children)}
    </button>);
}
//# sourceMappingURL=button.js.map