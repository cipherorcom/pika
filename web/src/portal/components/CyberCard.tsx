import React from 'react';
import {cn} from "@/lib/utils.ts";

interface Props {
    className?: string
    children: React.ReactNode;
    animation?: boolean
    hover?: boolean
}

const CyberCard = ({className, children, animation, hover}: Props) => {
    return (
        <div
            className={cn(
                "group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/82 shadow-sm backdrop-blur-md transition-all duration-300 dark:border-white/15 dark:bg-[#061a2c]/72 dark:shadow-[0_12px_32px_rgba(0,0,0,.18)]",
                hover && "cursor-pointer hover:border-slate-300 hover:bg-white dark:hover:border-teal-200/35 dark:hover:bg-[#082038]/92"
            )}>
            {animation &&
                <div
                    className="pointer-events-none absolute inset-0 -translate-y-full bg-gradient-to-b from-transparent via-teal-400/5 to-transparent opacity-0 transition-[transform,opacity] duration-1000 ease-in-out will-change-transform group-hover:translate-y-full group-hover:opacity-100"/>
            }

            <div className={cn("relative z-10 p-4", className)}>
                {children}
            </div>
        </div>
    );
};

export default CyberCard;
