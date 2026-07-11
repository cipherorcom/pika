import {type ReactNode, useMemo, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {ArrowDown, ArrowUp, Filter, Hand, HardDrive, Link2, Radio, Server, Wifi, type LucideIcon} from 'lucide-react';
import {Link} from 'react-router-dom';
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

const ServerListRow = ({server}: {server: AgentWithMetrics}) => {
    const isOnline = server.status === 1;
    const metrics = server.metrics;
    const cpu = metrics?.cpu?.usagePercent ?? 0;
    const memory = metrics?.memory?.usagePercent ?? 0;
    const disk = metrics?.disk?.usagePercent ?? 0;
    const upload = metrics?.network?.totalBytesSentRate ?? 0;
    const download = metrics?.network?.totalBytesRecvRate ?? 0;
    const uploadTotal = metrics?.network?.totalBytesSentTotal ?? 0;
    const downloadTotal = metrics?.network?.totalBytesRecvTotal ?? 0;
    const connections = metrics?.networkConnection?.established ?? 0;
    const traffic = server.trafficStats;
    const trafficText = traffic?.enabled && traffic.limit > 0
        ? `${formatBytes(traffic.used, 1)} / ${formatBytes(traffic.limit, 1)}`
        : '—';
    const daysUntilExpiry = server.expireTime && server.expireTime > 0
        ? Math.ceil((server.expireTime - Date.now()) / (24 * 60 * 60 * 1000))
        : null;

    return (
        <Link to={`/servers/${server.id.substring(0, 8)}`} aria-label={`查看探针 ${server.name || server.hostname} 的详情`} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">
            <article className="grid gap-3 rounded-xl border border-slate-200 bg-white/74 p-3.5 backdrop-blur-md transition hover:border-teal-300 hover:shadow-lg dark:border-white/15 dark:bg-[#061a2c]/70 dark:hover:border-teal-200/45 sm:grid-cols-[minmax(190px,1.3fr)_repeat(3,minmax(72px,.55fr))_minmax(105px,.8fr)_minmax(64px,.45fr)_minmax(130px,.85fr)_minmax(125px,.8fr)] sm:items-center">
                <div className="min-w-0">
                    <div className="flex items-center gap-2"><span className={cn('h-2 w-2 rounded-full', isOnline ? 'bg-emerald-400' : 'bg-rose-400')}/><h3 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{server.name || server.hostname}</h3><span className={cn('rounded px-1.5 py-0.5 text-[10px]', isOnline ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300')}>{isOnline ? '在线' : '离线'}</span></div>
                    <div className="mt-1 flex items-center gap-1.5 overflow-hidden text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="shrink-0 whitespace-nowrap">{server.os || '未知系统'} · {server.arch || '—'}</span>
                        {daysUntilExpiry !== null && <span className={cn('shrink-0 whitespace-nowrap rounded px-1 py-px font-medium', daysUntilExpiry <= 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300' : daysUntilExpiry <= 30 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300')}>{Math.max(daysUntilExpiry, 0)} 天</span>}
                        {server.tags?.map(tag => <span key={tag} className="shrink-0 whitespace-nowrap rounded bg-cyan-500/10 px-1 py-px text-cyan-700 dark:text-cyan-300">{tag}</span>)}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono tabular-nums sm:contents">
                    <div><p className="text-slate-500 dark:text-slate-400 sm:hidden">CPU</p><p className="mt-1 font-semibold text-slate-800 dark:text-slate-100 sm:mt-0">{cpu.toFixed(1)}%</p></div>
                    <div><p className="text-slate-500 dark:text-slate-400 sm:hidden">内存</p><p className="mt-1 font-semibold text-slate-800 dark:text-slate-100 sm:mt-0">{memory.toFixed(1)}%</p></div>
                    <div><p className="text-slate-500 dark:text-slate-400 sm:hidden">存储</p><p className="mt-1 font-semibold text-slate-800 dark:text-slate-100 sm:mt-0">{disk.toFixed(1)}%</p></div>
                </div>
                <div className="text-[11px] font-mono tabular-nums sm:text-center"><p className="text-slate-500 dark:text-slate-400 sm:hidden">实时网络</p><div className="mt-1 flex justify-center gap-2 sm:mt-0"><span className="text-sky-600 dark:text-sky-300">↑ {formatSpeed(upload)}</span><span className="text-blue-600 dark:text-blue-300">↓ {formatSpeed(download)}</span></div></div>
                <div className="text-center text-[11px] font-mono tabular-nums"><p className="text-slate-500 dark:text-slate-400 sm:hidden">连接</p><p className="mt-1 font-semibold text-slate-800 dark:text-slate-100 sm:mt-0">{connections}</p></div>
                <div className="text-[11px] font-mono tabular-nums sm:text-center"><p className="text-slate-500 dark:text-slate-400 sm:hidden">累计流量</p><div className="mt-1 flex justify-center gap-2 text-slate-600 dark:text-slate-300 sm:mt-0"><span>↑ {formatBytes(uploadTotal, 1)}</span><span>↓ {formatBytes(downloadTotal, 1)}</span></div></div>
                <div className="text-[11px] font-mono tabular-nums sm:text-right"><p className="text-slate-500 dark:text-slate-400 sm:hidden">流量限额</p><p className="mt-1 text-slate-600 dark:text-slate-300 sm:mt-0">{trafficText}</p></div>
            </article>
        </Link>
    );
};

const ServerList = () => {
    const [selectedTag, setSelectedTag] = useState('');
    const defaultView = window.SystemConfig?.DefaultView === 'list' ? 'list' : 'grid';
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

            {displayAgents.length === 0 ? <EmptyState title={selectedTag ? '没有匹配的探针' : '暂无探针'} description={selectedTag ? `标签 “${selectedTag}” 下暂无探针。` : '注册并启动探针后，它会显示在这里。'}/> : defaultView === 'list' ? (
                <div className="space-y-2">
                    <div className="hidden grid-cols-[minmax(190px,1.3fr)_repeat(3,minmax(72px,.55fr))_minmax(105px,.8fr)_minmax(64px,.45fr)_minmax(130px,.85fr)_minmax(125px,.8fr)] gap-3 px-3.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 sm:grid"><span>探针</span><span className="text-center">CPU</span><span className="text-center">内存</span><span className="text-center">存储</span><span className="text-center">实时网络</span><span className="text-center">连接</span><span className="text-center">累计流量</span><span className="text-right">流量限额</span></div>
                    {displayAgents.map(server => <ServerListRow key={server.id} server={server}/>) }
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {displayAgents.map(server => <ServerCard key={server.id} server={server}/>) }
                </div>
            )}
        </div>
    );
};

export default ServerList;
