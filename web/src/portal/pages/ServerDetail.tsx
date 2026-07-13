import {useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {Activity, BarChart3, CircleCheck, CircleX} from 'lucide-react';
import {useQuery} from '@tanstack/react-query';
import {Card} from '@portal/components/Card.tsx';
import {EmptyState} from '@portal/components/EmptyState.tsx';
import {LoadingSpinner} from '@portal/components/LoadingSpinner.tsx';
import {TimeRangeSelector} from '@portal/components/TimeRangeSelector.tsx';
import {GpuMonitorSection} from '@portal/components/server/GpuMonitorSection.tsx';
import {NetworkAddressSection} from '@portal/components/server/NetworkAddressSection.tsx';
import {NetworkConnectionSection} from '@portal/components/server/NetworkConnectionSection.tsx';
import {ServerHero} from '@portal/components/server/ServerHero.tsx';
import {SystemInfoSection} from '@portal/components/server/SystemInfoSection.tsx';
import {TemperatureMonitorSection} from '@portal/components/server/TemperatureMonitorSection.tsx';
import {CpuChart} from '@portal/components/server/CpuChart.tsx';
import {DiskIOChart} from '@portal/components/server/DiskIOChart.tsx';
import {GpuChart} from '@portal/components/server/GpuChart.tsx';
import {MemoryChart} from '@portal/components/server/MemoryChart.tsx';
import {MonitorChart} from '@portal/components/server/MonitorChart.tsx';
import {NetworkChart} from '@portal/components/server/NetworkChart.tsx';
import {NetworkConnectionChart} from '@portal/components/server/NetworkConnectionChart.tsx';
import {TemperatureChart} from '@portal/components/server/TemperatureChart.tsx';
import {useAgentQuery, useLatestMetricsQuery, useMetricsQuery} from '@portal/hooks/server.ts';
import {LIVE_RANGE, SERVER_TIME_RANGE_OPTIONS} from '@portal/constants/time.ts';
import {getPublicMonitors} from '@/api/monitor.ts';
import type {PublicMonitor} from '@/types';

/**
 * 服务器详情页面
 * 显示服务器的详细信息、实时指标和历史趋势图表
 */
const ServerDetail = () => {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [timeRange, setTimeRange] = useState<string>(LIVE_RANGE);
    const [customRange, setCustomRange] = useState<{ start: number; end: number } | null>(null);
    const [metricTab, setMetricTab] = useState<'history' | 'monitor'>('history');

    const handleCustomRangeApply = (range: { start: number; end: number }) => {
        setCustomRange(range);
    };

    const isLive = timeRange === LIVE_RANGE;
    const customStart = timeRange === 'custom' ? customRange?.start : undefined;
    const customEnd = timeRange === 'custom' ? customRange?.end : undefined;

    // 查询基础数据（用于页面头部和系统信息）
    // 实时模式 1s 拉取最新指标，其余 5s
    const {data: agentResponse, isLoading} = useAgentQuery(id);
    const {data: latestMetricsResponse} = useLatestMetricsQuery(id, isLive ? 1000 : 5000);
    const {data: monitorHistoryResponse} = useMetricsQuery({
        agentId: id || '',
        type: 'monitor',
        range: customStart !== undefined && customEnd !== undefined ? undefined : (isLive ? '15m' : timeRange),
        start: customStart,
        end: customEnd,
        aggregation: 'raw',
        refetchIntervalMs: isLive ? 10000 : undefined,
    });
    const {data: publicMonitors = []} = useQuery<PublicMonitor[]>({
        queryKey: ['publicMonitors'],
        queryFn: async () => (await getPublicMonitors()).data || [],
        staleTime: 30000,
    });

    const agent = agentResponse?.data;
    const latestMetrics = latestMetricsResponse?.data || null;
    const hostMonitors = latestMetrics?.monitors || [];
    const monitorNames = new Map(publicMonitors.map((monitor) => [monitor.id, monitor.name]));
    const latestMonitorByID = new Map(hostMonitors.map((monitor) => [monitor.monitorId, monitor]));
    const configuredHostMonitors = publicMonitors.filter((monitor) =>
        monitor.enabled && (!monitor.agentIds?.length || monitor.agentIds.includes(id!)),
    );
    const monitorHistoryStats = useMemo(() => {
        const stats = new Map<string, { min?: number; max?: number; failures: number; total: number }>();
        for (const series of monitorHistoryResponse?.data.series || []) {
            const monitorID = series.labels?.monitor_id;
            if (!monitorID || !series.data.length) continue;
            const item = stats.get(monitorID) || {failures: 0, total: 0};
            if (series.name === 'response_time') {
                const values = series.data.map((point) => point.value);
                item.min = Math.min(item.min ?? Infinity, ...values);
                item.max = Math.max(item.max ?? -Infinity, ...values);
            }
            if (series.name === 'status') {
                item.total += series.data.length;
                item.failures += series.data.filter((point) => point.value < 0.5).length;
            }
            stats.set(monitorID, item);
        }
        return stats;
    }, [monitorHistoryResponse]);
    const formatLoad = (value?: number) => (
        typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '-'
    );

    const deviceIpInterfaces = (latestMetrics?.networkInterfaces || [])
        .map((netInterface) => ({
            name: netInterface.interface,
            addrs: Array.from(new Set((netInterface.addrs || []).map((addr) => addr.trim()).filter(Boolean))),
        }))
        .filter((netInterface) => netInterface.addrs.length > 0);

    if (isLoading) {
        return <LoadingSpinner variant="detail" message="正在加载主机详情"/>;
    }

    if (!agent) {
        return <EmptyState/>;
    }

    return (
        <div className="min-h-screen">
            <div className="mx-auto flex max-w-[1440px] flex-col px-3 pb-12 pt-4 sm:px-5 sm:pt-6 lg:px-6">
                {/* 头部区域 */}
                <ServerHero
                    agent={agent}
                    latestMetrics={latestMetrics}
                    onBack={() => navigate('/')}
                />

                {/* 主内容区 */}
                <main className="flex-1 space-y-5 py-5 sm:space-y-6 sm:py-6 lg:space-y-7">
                    {/* 网络地址信息 */}
                    {(agent.ipv4 || agent.ipv6 || deviceIpInterfaces?.length > 0) && (
                        <NetworkAddressSection
                            ipv4={agent.ipv4}
                            ipv6={agent.ipv6}
                            deviceIpInterfaces={deviceIpInterfaces}
                        />
                    )}

                    {/* 系统信息 */}
                    <SystemInfoSection agent={agent} latestMetrics={latestMetrics}/>

                    {/* 趋势模块的外层导航 */}
                    <div className="flex items-center justify-center" role="tablist" aria-label="主机指标">
                        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-black/30">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={metricTab === 'history'}
                                onClick={() => setMetricTab('history')}
                                className={`flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                                    metricTab === 'history'
                                        ? 'bg-white text-slate-900 shadow-sm dark:bg-cyan-500/20 dark:text-cyan-100 dark:ring-1 dark:ring-cyan-400/30'
                                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-cyan-200'
                                }`}
                            >
                                <BarChart3 className="h-4 w-4"/>
                                历史趋势
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={metricTab === 'monitor'}
                                onClick={() => setMetricTab('monitor')}
                                className={`flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                                    metricTab === 'monitor'
                                        ? 'bg-white text-slate-900 shadow-sm dark:bg-cyan-500/20 dark:text-cyan-100 dark:ring-1 dark:ring-cyan-400/30'
                                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-cyan-200'
                                }`}
                            >
                                <Activity className="h-4 w-4"/>
                                服务监控
                            </button>
                        </div>
                    </div>

                    <Card
                        title={metricTab === 'history' ? '历史趋势' : '服务监控'}
                        description={metricTab === 'history'
                            ? '针对选定时间范围展示 CPU、内存与网络的变化趋势'
                            : '展示由此主机执行的服务监控响应时间'}
                        action={(
                            <div className="flex flex-wrap items-center gap-2">
                                <TimeRangeSelector
                                    value={timeRange}
                                    onChange={setTimeRange}
                                    options={SERVER_TIME_RANGE_OPTIONS}
                                    enableCustom
                                    customRange={customRange}
                                    onCustomRangeApply={handleCustomRangeApply}
                                />
                            </div>
                        )}
                    >
                        {metricTab === 'history' ? <div className="space-y-4 sm:space-y-5 lg:space-y-6" role="tabpanel">
                            {/* 核心指标：大屏 2 列，小屏 1 列 */}
                            <div className="grid gap-4 sm:gap-5 lg:gap-6 grid-cols-1 md:grid-cols-2">
                                <CpuChart agentId={id!} timeRange={timeRange} start={customStart} end={customEnd}
                                          isLive={isLive} latestMetrics={latestMetrics}/>
                                <MemoryChart agentId={id!} timeRange={timeRange} start={customStart} end={customEnd}
                                             isLive={isLive} latestMetrics={latestMetrics}/>
                            </div>

                            {/* 网络相关：大屏 2 列，中屏 1 列 */}
                            <div className="grid gap-4 sm:gap-5 lg:gap-6 grid-cols-1 lg:grid-cols-2">
                                <NetworkChart agentId={id!} timeRange={timeRange} start={customStart} end={customEnd}
                                              isLive={isLive} latestMetrics={latestMetrics}/>
                                <DiskIOChart agentId={id!} timeRange={timeRange} start={customStart} end={customEnd}
                                             isLive={isLive} latestMetrics={latestMetrics}/>
                            </div>

                            {/* 进阶指标：单列全宽 */}
                            <div className="grid gap-4 sm:gap-5 lg:gap-6 grid-cols-1">
                                <NetworkConnectionChart agentId={id!} timeRange={timeRange} start={customStart}
                                                        end={customEnd} isLive={isLive}
                                                        latestMetrics={latestMetrics}/>
                            </div>

                            {/* 硬件指标：条件渲染，单列全宽 */}
                            <div className="grid gap-4 sm:gap-5 lg:gap-6 grid-cols-1">
                                <GpuChart agentId={id!} timeRange={timeRange} start={customStart} end={customEnd}
                                          isLive={isLive}/>
                                <TemperatureChart agentId={id!} timeRange={timeRange} start={customStart}
                                                  end={customEnd} isLive={isLive}/>
                            </div>

                        </div> : (
                            <div className="space-y-5" role="tabpanel">
                                {configuredHostMonitors.length > 0 ? (
                                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50/70 dark:border-cyan-900/50 dark:bg-black/20">
                                        <div className="grid grid-cols-1 lg:grid-cols-[220px_repeat(auto-fit,minmax(190px,1fr))]">
                                            <div className="border-b border-slate-200 p-4 dark:border-cyan-900/50 lg:border-b-0 lg:border-r">
                                                <p className="truncate text-base font-semibold text-slate-900 dark:text-white">{agent.name}</p>
                                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{configuredHostMonitors.length} 个监控服务</p>
                                            </div>
                                        {configuredHostMonitors.map((configuredMonitor) => {
                                            const monitor = latestMonitorByID.get(configuredMonitor.id);
                                            const historyStats = monitorHistoryStats.get(configuredMonitor.id);
                                            const isUp = monitor?.status === 'up';
                                            const hasReported = !!monitor;
                                            return (
                                                <div key={configuredMonitor.id} className="border-b border-slate-200 p-4 dark:border-cyan-900/50 lg:border-b-0 lg:border-r last:border-0">
                                                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{monitor?.monitorName || monitorNames.get(configuredMonitor.id) || configuredMonitor.name}</p>
                                                    <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                                                        {hasReported ? monitor.responseTime : '-'}{hasReported && <span className="ml-1 text-sm font-medium">ms</span>}
                                                    </p>
                                                    <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${!hasReported ? 'text-slate-500 dark:text-slate-400' : isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                        {!hasReported ? <Activity className="h-3.5 w-3.5"/> : isUp ? <CircleCheck className="h-3.5 w-3.5"/> : <CircleX className="h-3.5 w-3.5"/>}
                                                        {!hasReported ? '等待检测' : isUp ? '正常' : '异常'}
                                                    </p>
                                                    <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                                        <span>↓ {Number.isFinite(historyStats?.min) ? `${Math.round(historyStats!.min!)}ms` : '-'}</span>
                                                        <span>↑ {Number.isFinite(historyStats?.max) ? `${Math.round(historyStats!.max!)}ms` : '-'}</span>
                                                        <span>丢包 {historyStats?.total ? `${((historyStats.failures / historyStats.total) * 100).toFixed(2)}%` : '-'}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-dashed border-slate-300 py-10 text-center dark:border-cyan-900/60">
                                        <Activity className="mx-auto h-8 w-8 text-slate-400 dark:text-cyan-700"/>
                                        <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">该主机暂未执行服务监控</p>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">请在服务监控中将监控任务分配给此主机。</p>
                                    </div>
                                )}

                                <MonitorChart agentId={id!} timeRange={timeRange} start={customStart} end={customEnd}
                                              isLive={isLive}/>
                            </div>
                        )}
                    </Card>

                    {/* 网络连接统计 */}
                    <NetworkConnectionSection latestMetrics={latestMetrics}/>

                    {/* GPU 监控 */}
                    <GpuMonitorSection latestMetrics={latestMetrics}/>

                    {/* 温度监控 */}
                    <TemperatureMonitorSection latestMetrics={latestMetrics}/>
                </main>
            </div>
        </div>
    );
};

export default ServerDetail;
