interface LoadingSpinnerProps {
    message?: string;
    variant?: 'overview' | 'detail';
}

const SkeletonLine = ({className}: {className: string}) => (
    <div className={`rounded-full bg-slate-300/70 dark:bg-cyan-100/12 ${className}`}/>
);

const SkeletonCard = ({compact = false}: {compact?: boolean}) => (
    <div className={`rounded-xl border border-slate-200/80 bg-white/58 p-4 shadow-sm backdrop-blur-md dark:border-cyan-100/15 dark:bg-[#061a2c]/58 ${compact ? 'min-h-24' : 'min-h-36'}`}>
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
                <SkeletonLine className="h-2.5 w-24"/>
                <SkeletonLine className={compact ? 'h-6 w-14' : 'h-4 w-2/3'}/>
                {!compact && <SkeletonLine className="h-2.5 w-1/2"/>}
            </div>
            <div className="h-8 w-8 shrink-0 rounded-lg bg-slate-300/65 dark:bg-cyan-300/10"/>
        </div>
        {!compact && (
            <div className="mt-6 flex gap-2">
                <SkeletonLine className="h-2 flex-1"/>
                <SkeletonLine className="h-2 flex-1"/>
                <SkeletonLine className="h-2 flex-1"/>
            </div>
        )}
    </div>
);

export const LoadingSpinner = ({message = '正在同步最新数据', variant = 'overview'}: LoadingSpinnerProps) => (
    <div className="mx-auto min-h-[58vh] w-full max-w-[1440px] px-3 py-4 sm:px-5 sm:py-6 lg:px-6" role="status" aria-live="polite">
        <div className="mb-5 flex items-center gap-3">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-400/10 shadow-[0_0_22px_rgba(34,211,238,.1)]">
                <span className="absolute h-2.5 w-2.5 rounded-full bg-cyan-400 motion-safe:animate-ping"/>
                <span className="relative h-2.5 w-2.5 rounded-full bg-cyan-500 dark:bg-cyan-300"/>
            </span>
            <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-cyan-50">{message}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-cyan-100/55">正在建立实时数据视图…</p>
            </div>
        </div>

        <div className="space-y-4 motion-safe:animate-pulse" aria-hidden="true">
            {variant === 'overview' ? (
                <>
                    <div className="space-y-2">
                        <SkeletonLine className="h-4 w-24"/>
                        <SkeletonLine className="h-2.5 w-52 max-w-2/3"/>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                        {Array.from({length: 4}, (_, index) => <SkeletonCard key={index} compact/>)}
                    </div>
                    <div className="pt-2">
                        <div className="mb-3 flex items-center gap-2">
                            <SkeletonLine className="h-3.5 w-20"/>
                            <SkeletonLine className="h-7 w-16"/>
                            <SkeletonLine className="h-7 w-20"/>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {Array.from({length: 3}, (_, index) => <SkeletonCard key={index}/>)}
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="rounded-2xl border border-slate-200/80 bg-white/58 p-5 backdrop-blur-md dark:border-cyan-100/15 dark:bg-[#061a2c]/58">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-slate-300/65 dark:bg-cyan-300/10"/>
                            <div className="flex-1 space-y-3">
                                <SkeletonLine className="h-5 w-48 max-w-2/3"/>
                                <SkeletonLine className="h-2.5 w-72 max-w-full"/>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <SkeletonCard/>
                        <SkeletonCard/>
                    </div>
                    <div className="min-h-52 rounded-xl border border-slate-200/80 bg-white/58 p-5 backdrop-blur-md dark:border-cyan-100/15 dark:bg-[#061a2c]/58">
                        <SkeletonLine className="h-3.5 w-32"/>
                        <div className="mt-10 space-y-8">
                            <SkeletonLine className="h-2 w-full"/>
                            <SkeletonLine className="h-2 w-5/6"/>
                            <SkeletonLine className="h-2 w-11/12"/>
                        </div>
                    </div>
                </>
            )}
        </div>
        <span className="sr-only">{message}</span>
    </div>
);
