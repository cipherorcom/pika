import type {FC} from 'react';
import {ArrowDown, ArrowUp, HardDrive, MemoryStick, Microchip, Network, Server} from 'lucide-react';
import {Link} from 'react-router-dom';
import type {Agent, LatestMetrics} from '@/types';
import {cn} from '@/lib/utils.ts';
import {formatBytes, formatSpeed} from '@/lib/format.ts';

interface AgentWithMetrics extends Agent {
    metrics?: LatestMetrics;
}

interface ServerCardProps {
    server: AgentWithMetrics;
}

const clampPercent = (value?: number) => Math.max(0, Math.min(100, value ?? 0));

const Metric = ({label, value, icon: Icon, tone = 'bg-emerald-400'}: {
    label: string;
    value: string;
    icon?: typeof Microchip;
    tone?: string;
}) => (
    <div className="min-w-0">
        <div className="mb-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            {Icon ? <Icon className="h-3 w-3 shrink-0" aria-hidden="true"/> : null}
            <span className="truncate">{label}</span>
        </div>
        <div className="font-mono text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-100">{value}</div>
        <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
            <div className={cn('h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none', tone)}
                 style={{width: value === '-' ? '0%' : `${Math.max(8, Math.min(100, Number.parseFloat(value) || 0))}%`}}/>
        </div>
    </div>
);

const Traffic = ({label, value, tone}: {label: string; value: string; tone: string}) => (
    <div className="rounded-md border border-slate-200/80 bg-slate-100/70 px-2 py-1.5 text-center dark:border-white/10 dark:bg-black/20">
        <div className="text-[10px] text-slate-500 dark:text-slate-400">{label}</div>
        <div className={cn('mt-0.5 font-mono text-[11px] font-semibold tabular-nums', tone)}>{value}</div>
    </div>
);

const ServerCard: FC<ServerCardProps> = ({server}) => {
    const isOnline = server.status === 1;
    const metrics = server.metrics;
    const cpu = clampPercent(metrics?.cpu?.usagePercent);
    const memory = clampPercent(metrics?.memory?.usagePercent);
    const disk = clampPercent(metrics?.disk?.usagePercent);
    const upload = metrics?.network?.totalBytesSentRate ?? 0;
    const download = metrics?.network?.totalBytesRecvRate ?? 0;
    const uploadTotal = metrics?.network?.totalBytesSentTotal ?? 0;
    const downloadTotal = metrics?.network?.totalBytesRecvTotal ?? 0;
    const traffic = server.trafficStats;
    const trafficUsage = traffic?.enabled && traffic.limit > 0
        ? Math.min(100, (traffic.used / traffic.limit) * 100)
        : null;
    const trafficTone = trafficUsage === null
        ? 'bg-teal-400'
        : trafficUsage >= 100 ? 'bg-rose-500' : trafficUsage >= 90 ? 'bg-orange-400' : trafficUsage >= 80 ? 'bg-amber-400' : 'bg-teal-400';
    const daysUntilExpiry = server.expireTime && server.expireTime > 0
        ? Math.ceil((server.expireTime - Date.now()) / (24 * 60 * 60 * 1000))
        : null;
    const name = server.name || server.hostname;

    return (
        <Link
            to={`/servers/${server.id.substring(0, 8)}`}
            aria-label={`查看探针 ${name} 的详情`}
            className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
            <article className={cn(
                'relative min-h-[178px] overflow-hidden rounded-xl border p-3.5 shadow-sm transition duration-200 ease-out',
                'bg-white/78 backdrop-blur-md hover:-translate-y-0.5 hover:shadow-lg dark:bg-[#061a2c]/72 dark:shadow-black/50',
                isOnline
                    ? 'border-slate-200/80 hover:border-cyan-400/70 dark:border-teal-100/20 dark:hover:border-teal-200/55'
                    : 'border-rose-300/80 opacity-80 dark:border-rose-400/30'
            )}>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-300/[0.14] via-transparent to-blue-500/[0.11] opacity-0 transition-opacity duration-200 group-hover:opacity-100"/>
                <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                            <span className={cn('h-2 w-2 shrink-0 rounded-full', isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,.9)]' : 'bg-rose-400')}/>
                            <h2 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{name}</h2>
                        </div>
                        <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium', isOnline ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300')}>
                            {isOnline ? '在线' : '离线'}
                        </span>
                    </div>

                    <div className="mt-1 flex min-h-4 items-center gap-1.5 overflow-hidden text-[10px] text-slate-500 dark:text-slate-400">
                        <Server className="h-3 w-3 shrink-0" aria-hidden="true"/>
                        <span className="truncate">{server.os || '未知系统'}</span>
                        {server.arch ? <><span aria-hidden="true">·</span><span>{server.arch}</span></> : null}
                        {daysUntilExpiry !== null && <><span aria-hidden="true">·</span><span className={cn(daysUntilExpiry <= 0 ? 'text-rose-500' : daysUntilExpiry <= 30 ? 'text-amber-500 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400')}>{Math.max(daysUntilExpiry, 0)}天</span></>}
                        {server.tags?.slice(0, 2).map(tag => <span key={tag} className="rounded bg-slate-100 px-1 py-px text-[9px] dark:bg-white/10">{tag}</span>)}
                    </div>

                    {isOnline ? (
                        <>
                            <div className="mt-3 grid grid-cols-6 gap-2">
                                <Metric label="CPU" value={`${cpu.toFixed(1)}%`} icon={Microchip} tone="bg-teal-400"/>
                                <Metric label="内存" value={`${memory.toFixed(1)}%`} icon={MemoryStick} tone="bg-cyan-400"/>
                                <Metric label="存储" value={`${disk.toFixed(1)}%`} icon={HardDrive} tone="bg-emerald-400"/>
                                <Metric label="上行" value={formatSpeed(upload)} icon={ArrowUp} tone="bg-sky-400"/>
                                <Metric label="下行" value={formatSpeed(download)} icon={ArrowDown} tone="bg-blue-400"/>
                                <Metric label="连接" value={`${metrics?.networkConnection?.established ?? 0}`} icon={Network} tone="bg-amber-400"/>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <Traffic label="累计上传" value={formatBytes(uploadTotal, 1)} tone="text-sky-700 dark:text-sky-300"/>
                                <Traffic label="累计下载" value={formatBytes(downloadTotal, 1)} tone="text-blue-700 dark:text-blue-300"/>
                            </div>
                            {trafficUsage !== null && traffic && (
                                <div className="mt-3 border-t border-slate-200/80 pt-2.5 dark:border-white/10">
                                    <div className="flex items-center justify-between gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                                        <span>流量限额</span>
                                        <span className="font-mono font-medium tabular-nums text-slate-700 dark:text-slate-200">{formatBytes(traffic.used, 1)} / {formatBytes(traffic.limit, 1)} · {trafficUsage.toFixed(1)}%</span>
                                    </div>
                                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10" role="progressbar" aria-label="流量限额使用情况" aria-valuemin={0} aria-valuemax={100} aria-valuenow={trafficUsage}>
                                        <div className={cn('h-full rounded-full', trafficTone)} style={{width: `${trafficUsage}%`}}/>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="mt-5 flex h-[84px] items-center justify-center rounded-lg border border-dashed border-rose-300/70 bg-rose-50/60 text-xs text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/5 dark:text-rose-300">
                            探针暂时无法连接
                        </div>
                    )}
                </div>
            </article>
        </Link>
    );
};

export default ServerCard;
