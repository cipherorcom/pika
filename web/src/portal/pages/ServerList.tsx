import {type ReactNode, useMemo, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {ArrowDown, ArrowUp, Filter, Hand, HardDrive, Link2, Radio, Server, Wifi, type LucideIcon} from 'lucide-react';
import {getPublicTags, listAgents} from '@/api/agent.ts';
import type {Agent, LatestMetrics} from '@/types';
import {cn} from '@/lib/utils.ts';
import {formatBytes, formatSpeed} from '@/lib/format.ts';
import ServerCard from '@portal/components/ServerCard.tsx';
import {LoadingSpinner} from '@portal/components/LoadingSpinner.tsx';

interface AgentWithMetrics extends Agent {
    metrics?: LatestMetrics;
}

interface EmptyStateProps {
    title: string;
    description: string;
    extra?: ReactNode;
}

const EmptyState = ({title, description, extra}: EmptyStateProps) => (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/80 p-12 text-center dark:border-cyan-300/30 dark:bg-slate-950/80">
        <HardDrive className="h-7 w-7 text-cyan-500"/>
        <h2 className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
        {extra ? <div className="mt-4">{extra}</div> : null}
    </div>
);

interface OverviewFilterCardProps {
    title: string;
    icon: LucideIcon;
    active: boolean;
    onClick: () => void;
    children: ReactNode;
    tone: {
        accent: string;
        line: string;
        selected: string;
    };
}

const OverviewFilterCard = ({title, icon: Icon, active, onClick, children, tone}: OverviewFilterCardProps) => (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn(
        'group relative min-h-24 overflow-hidden rounded-xl border border-slate-200 bg-white/74 p-3.5 text-left backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 dark:border-white/15 dark:bg-[#061a2c]/70 dark:hover:border-white/30',
        active && tone.selected
    )}>
        <div className={cn('absolute inset-x-0 top-0 h-0.5', tone.line)}/>
        <div className="relative flex items-start justify-between gap-3">
            <div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-300"><Icon className={cn('h-3.5 w-3.5', tone.accent)} aria-hidden="true"/>{title}</div>
                <div className="mt-2">{children}</div>
            </div>
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0 opacity-35 transition-opacity group-hover:opacity-70', tone.accent)} aria-hidden="true"/>
        </div>
    </button>
);

const ServerList = () => {
    const [selectedTag, setSelectedTag] = useState('');
    const {data: agents = [], isLoading} = useQuery<AgentWithMetrics[]>({
        queryKey: ['agents', 'online'],
        queryFn: async () => (await listAgents()).data || [],
        refetchInterval: 3000,
    });
    const {data: tagsData} = useQuery({
        queryKey: ['tags', 'public'],
        queryFn: async () => (await getPublicTags()).data.tags || [],
        refetchInterval: 30000,
    });

    const allTags = useMemo(() => {
        const tags = ['ALL', 'ONLINE', 'OFFLINE'];
        tagsData?.forEach((tag: string) => {
            if (!tags.includes(tag.toUpperCase())) tags.push(tag.toUpperCase());
        });
        return tags;
    }, [tagsData]);

    const displayAgents = useMemo(() => {
        if (selectedTag === 'ONLINE') return agents.filter(agent => agent.status === 1);
        if (selectedTag === 'OFFLINE') return agents.filter(agent => agent.status !== 1);
        if (selectedTag) return agents.filter(agent => agent.tags?.some(tag => tag.toUpperCase() === selectedTag));
        return agents;
    }, [agents, selectedTag]);

    const onlineCount = agents.filter(agent => agent.status === 1).length;
    const networkStats = useMemo(() => agents.reduce((total, agent) => ({
        uploadRate: total.uploadRate + (agent.metrics?.network?.totalBytesSentRate ?? 0),
        downloadRate: total.downloadRate + (agent.metrics?.network?.totalBytesRecvRate ?? 0),
        uploadTotal: total.uploadTotal + (agent.metrics?.network?.totalBytesSentTotal ?? 0),
        downloadTotal: total.downloadTotal + (agent.metrics?.network?.totalBytesRecvTotal ?? 0),
    }), {uploadRate: 0, downloadRate: 0, uploadTotal: 0, downloadTotal: 0}), [agents]);
    const offlineCount = agents.length - onlineCount;
    const toggleOverviewFilter = (filter: string) => setSelectedTag(current => current === filter ? '' : filter);

    if (isLoading) return <LoadingSpinner/>;

    return (
        <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-5 sm:py-6 lg:px-6">
            <section className="mb-5" aria-labelledby="overview-title">
                <div className="mb-3 flex items-end justify-between">
                    <div>
                        <h1 id="overview-title" className="flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100"><Hand className="h-4 w-4 text-amber-400" aria-hidden="true"/>概览</h1>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">实时汇总当前可见的探针节点</p>
                    </div>
                    <span className="hidden text-xs font-mono tabular-nums text-slate-500 dark:text-teal-100/70 sm:block">每 3 秒刷新</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                    <OverviewFilterCard title="服务器总数" icon={Server} active={selectedTag === ''} onClick={() => toggleOverviewFilter('')} tone={{accent: 'text-teal-400', line: 'bg-teal-400', selected: 'border-teal-400/80 shadow-[0_0_18px_rgba(45,212,191,.16)]'}}>
                        <div className="font-mono text-2xl font-bold tabular-nums text-slate-800 dark:text-white">{agents.length}</div>
                        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">全部节点</p>
                    </OverviewFilterCard>
                    <OverviewFilterCard title="在线服务器" icon={Link2} active={selectedTag === 'ONLINE'} onClick={() => toggleOverviewFilter('ONLINE')} tone={{accent: 'text-emerald-400', line: 'bg-emerald-400', selected: 'border-emerald-400/80 shadow-[0_0_18px_rgba(52,211,153,.16)]'}}>
                        <div className="font-mono text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{onlineCount}</div>
                        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">连接正常</p>
                    </OverviewFilterCard>
                    <OverviewFilterCard title="离线服务器" icon={Radio} active={selectedTag === 'OFFLINE'} onClick={() => toggleOverviewFilter('OFFLINE')} tone={{accent: 'text-rose-400', line: 'bg-rose-400', selected: 'border-rose-400/80 shadow-[0_0_18px_rgba(251,113,133,.16)]'}}>
                        <div className="font-mono text-2xl font-bold tabular-nums text-rose-700 dark:text-rose-300">{offlineCount}</div>
                        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">需要关注</p>
                    </OverviewFilterCard>
                    <div className="relative min-h-24 overflow-hidden rounded-xl border border-slate-200 bg-white/74 p-3.5 text-left backdrop-blur-md dark:border-white/15 dark:bg-[#061a2c]/70">
                        <div className="absolute inset-x-0 top-0 h-0.5 bg-sky-400"/>
                        <div className="relative flex items-start justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-300"><Wifi className="h-3.5 w-3.5 text-sky-400" aria-hidden="true"/>网络总览</div>
                                <div className="mt-2">
                        <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-blue-700 dark:text-cyan-100"><ArrowUp className="h-3 w-3"/>{formatSpeed(networkStats.uploadRate)} <span className="text-slate-400 dark:text-slate-400">{formatBytes(networkStats.uploadTotal, 1)}</span></div>
                                    <div className="mt-1 flex items-center gap-2 text-[11px] font-mono tabular-nums text-blue-700 dark:text-cyan-100"><ArrowDown className="h-3 w-3"/>{formatSpeed(networkStats.downloadRate)}</div>
                                </div>
                            </div>
                            <Wifi className="mt-0.5 h-5 w-5 shrink-0 text-sky-400 opacity-35" aria-hidden="true"/>
                        </div>
                    </div>
                </div>
            </section>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start">
                <h2 className="text-sm font-medium text-slate-700 dark:text-slate-200">探针节点</h2>
                <div className="flex flex-wrap items-center gap-1.5" aria-label="探针筛选">
                    <Filter className="mr-1 h-4 w-4 text-cyan-600 dark:text-teal-200" aria-hidden="true"/>
                    {allTags.map(tag => {
                        const tagKey = tag === 'ALL' ? '' : tag;
                        const count = tag === 'ALL' ? agents.length : tag === 'ONLINE' ? agents.filter(agent => agent.status === 1).length : tag === 'OFFLINE' ? agents.filter(agent => agent.status !== 1).length : agents.filter(agent => agent.tags?.some(item => item.toUpperCase() === tag)).length;
                        if (count === 0 && tag !== 'ALL') return null;
                        return <button key={tag} type="button" onClick={() => setSelectedTag(tagKey)} className={cn('min-h-9 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300', selectedTag === tagKey ? 'border-teal-200 bg-teal-500/85 text-slate-950 shadow-[0_0_18px_rgba(45,212,191,.3)]' : 'border-slate-200 bg-white/60 text-slate-600 hover:border-cyan-400 dark:border-teal-100/25 dark:bg-[#061a2c]/62 dark:text-slate-200 dark:hover:border-teal-200/65')} aria-pressed={selectedTag === tagKey}>{tag} ({count})</button>;
                    })}
                </div>
            </div>

            {displayAgents.length === 0 ? <EmptyState title={selectedTag ? '没有匹配的探针' : '暂无探针'} description={selectedTag ? `标签 “${selectedTag}” 下暂无探针。` : '注册并启动探针后，它会显示在这里。'}/> : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {displayAgents.map(server => <ServerCard key={server.id} server={server}/>) }
                </div>
            )}
        </div>
    );
};

export default ServerList;
