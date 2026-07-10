import {ArrowLeft} from 'lucide-react';
import {formatBytes, formatDateTime, formatUptime} from '@/lib/format.ts';
import type {Agent, LatestMetrics} from '@/types';
import LittleStatCard from '@portal/components/LittleStatCard';
import CyberCard from '@portal/components/CyberCard.tsx';
import {StatusBadge} from '@portal/components/StatusBadge';

interface ServerHeroProps {
    agent: Agent;
    latestMetrics: LatestMetrics | null;
    onBack: () => void;
}

export const ServerHero = ({agent, latestMetrics, onBack}: ServerHeroProps) => {
    const displayName = agent.name?.trim() || '未命名探针';
    const platform = latestMetrics?.host?.platform
        ? `${latestMetrics.host.platform} ${latestMetrics.host.platformVersion || ''}`.trim()
        : agent.os || '—';
    const networkTotal = latestMetrics?.network
        ? `${formatBytes(latestMetrics.network.totalBytesSentTotal)} ↑ / ${formatBytes(latestMetrics.network.totalBytesRecvTotal)} ↓`
        : '—';

    const heroStats = [
        {label: '运行系统', value: platform},
        {label: '硬件架构', value: latestMetrics?.host?.kernelArch || agent.arch || '—'},
        {label: '系统进程', value: latestMetrics?.host?.procs || '—'},
        {label: '运行时长', value: formatUptime(latestMetrics?.host?.uptime)},
    ];

    return (
        <CyberCard className="p-5 sm:p-6">
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <button type="button" onClick={onBack} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 dark:text-teal-200 dark:hover:bg-white/[.06]">
                            <ArrowLeft className="h-3.5 w-3.5"/>返回概览
                        </button>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{displayName}</h1>
                            <StatusBadge status={agent.status === 1 ? 'up' : 'down'}/>
                        </div>
                        <p className="mt-2 truncate font-mono text-xs text-slate-500 dark:text-teal-100/75">{agent.hostname || '未知主机'}</p>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2 lg:w-auto lg:min-w-[590px] lg:grid-cols-4">
                        {heroStats.map((stat) => <LittleStatCard key={stat.label} label={stat.label} value={stat.value}/>) }
                    </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 pt-3 text-[11px] text-slate-500 dark:border-white/10 dark:text-teal-100/70">
                    <span>探针 ID：{agent.id}</span><span>版本：{agent.version || '—'}</span><span>网络累计：{networkTotal}</span><span>最近心跳：{formatDateTime(agent.lastSeenAt)}</span>
                </div>
            </div>
        </CyberCard>
    );
};
