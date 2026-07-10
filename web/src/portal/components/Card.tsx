import type {ReactNode} from 'react';
import CyberCard from "@portal/components/CyberCard.tsx";

interface CardProps {
    title?: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}

export const Card = ({
                         title,
                         description,
                         action,
                         children,
                         className,
                     }: CardProps) => {
    return (
        <CyberCard className={className || 'p-6'}>
            {(title || description || action) && (
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-white/10 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        {title && (
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {title}
                            </h2>
                        )}
                        {description && (
                            <p className="mt-1 text-xs font-mono text-gray-600 dark:text-slate-400">
                                {description}
                            </p>
                        )}
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </div>
            )}
            <div className="pt-4">{children}</div>
        </CyberCard>
    );
};
