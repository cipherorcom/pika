import {memo, useEffect, useMemo, useState} from 'react';
import {Activity, RotateCcw, ChevronDown, ChevronUp} from 'lucide-react';
import {Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {ChartPlaceholder} from '@portal/components/ChartPlaceholder';
import {CustomTooltip} from '@portal/components/CustomTooltip';
import {useMetricsQuery} from '@portal/hooks/server';
import {useIsMobile} from '@portal/hooks/use-mobile';
import {ChartContainer} from './ChartContainer';
import {formatChartTime} from '@/lib/format.ts';

interface MonitorChartProps {
    agentId: string;
    timeRange: string;
    start?: number;
    end?: number;
    isLive?: boolean;
}

/**
 * 降采样算法 - 使用LTTB (Largest Triangle Three Buckets)
 * 确保输出精确的maxPoints个点，保留关键特征
 */
const downsampleData = (data: any[], maxPoints: number): any[] => {
    // 边界检查
    if (!data || data.length === 0) return [];
    if (maxPoints < 2) maxPoints = 2;
    if (data.length <= maxPoints) return [...data];
    
    const result: any[] = [data[0]]; // 保留第一个点
    
    // 桶大小
    const bucketSize = (data.length - 2) / (maxPoints - 2);
    
    for (let i = 0; i < maxPoints - 2; i++) {
        // 计算当前桶的范围
        const start = Math.floor((i + 0) * bucketSize) + 1;
        const end = Math.floor((i + 1) * bucketSize) + 1;
        
        // 计算前一个点和后一个点
        const previousPoint = result[result.length - 1];
        const nextPoint = data[Math.min(end, data.length - 1)];
        
        // 在桶中选择与前后点形成的三角形面积最大的点
        let maxArea = -1;
        let selectedPoint = data[start];
        
        for (let j = start; j < end && j < data.length - 1; j++) {
            // 计算三角形面积
            const area = Math.abs(
                (previousPoint.timestamp - nextPoint.timestamp) * (data[j].value - previousPoint.value) -
                (previousPoint.timestamp - data[j].timestamp) * (nextPoint.value - previousPoint.value)
            );
            
            if (area > maxArea) {
                maxArea = area;
                selectedPoint = data[j];
            }
        }
        
        result.push(selectedPoint);
    }
    
    result.push(data[data.length - 1]); // 保留最后一个点
    
    return result;
};

/**
 * 根据时间范围确定最大数据点数
 */
const getMaxDataPoints = (timeRange: string): number => {
    switch (timeRange) {
        case '15m':
        case '1h':
            return 200; // 短时间：详细数据
        case '12h':
            return 300;
        case '24h':
            return 400;
        case '7d':
            return 500;
        case '30d':
            return 600;
        default:
            return 400;
    }
};

/**
 * 优先使用暗色界面下对比度稳定的调色板；超出后再补充 HSL 颜色。
 */
const generateColors = (count: number): string[] => {
    const palette = ['#38bdf8', '#f59e0b', '#a78bfa', '#34d399', '#fb7185', '#facc15', '#22d3ee', '#f97316'];
    const colors = palette.slice(0, count);
    for (let i = colors.length; i < count; i++) {
        colors.push(`hsl(${(i * 137.5) % 360}, 72%, 62%)`);
    }
    return colors;
};

/**
 * 自定义图例组件
 */
const CustomLegend = ({ onClick, selectedMonitors, allMonitorKeys, colors, collapsed }: any) => {
    if (!allMonitorKeys || allMonitorKeys.length === 0) return null;
    
    if (collapsed) return null;
    
    return (
        <div className="flex flex-wrap justify-center gap-4 pt-4">
            {allMonitorKeys.map((monitorKey: string, index: number) => {
                const isSelected = selectedMonitors.has(monitorKey);
                const color = colors[index];
                
                return (
                    <div
                        key={monitorKey}
                        onClick={() => onClick({ value: monitorKey })}
                        className="flex items-center gap-2 cursor-pointer transition-opacity"
                        style={{
                            opacity: isSelected ? 1 : 0.4,
                        }}
                    >
                        <svg width="32" height="12" className="overflow-visible">
                            <line
                                x1="0"
                                y1="6"
                                x2="32"
                                y2="6"
                                stroke={isSelected ? color : '#9ca3af'}
                                strokeWidth="2"
                            />
                        </svg>
                        <span
                            className="text-xs font-medium"
                            style={{
                                color: isSelected ? color : '#9ca3af',
                            }}
                        >
                            {monitorKey}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

/**
 * 监控响应时间图表组件
 */
const MonitorChartImpl = ({agentId, timeRange, start, end, isLive}: MonitorChartProps) => {
    const isMobile = useIsMobile();
    const rangeMs = start !== undefined && end !== undefined ? end - start : undefined;
    const [selectedMonitors, setSelectedMonitors] = useState<Set<string>>(new Set());
    const [hasManualSelection, setHasManualSelection] = useState(false);
    const [legendCollapsed, setLegendCollapsed] = useState(true); // 移动端默认收起
    // 监控任务由探针自定义周期上报，实时模式下保留 15m 视图，10s 重查
    const effectiveRange = isLive ? '15m' : timeRange;

    // 数据查询
    const {data: metricsResponse, isLoading} = useMetricsQuery({
        agentId,
        type: 'monitor',
        range: start !== undefined && end !== undefined ? undefined : effectiveRange,
        start,
        end,
        refetchIntervalMs: isLive ? 10000 : undefined,
    });

    // 获取所有监控任务的列表（使用名称）
    const allMonitorKeys = useMemo(() => {
        const series = (metricsResponse?.data.series || []).filter((series) => series.name === 'response_time');
        return series.map(s => s.labels?.monitor_name || s.labels?.monitor_id || s.name);
    }, [metricsResponse]);

    // 默认始终选中全部服务；用户手动筛选后才保留其选择。
    useEffect(() => {
        if (allMonitorKeys.length > 0 && !hasManualSelection) {
            setSelectedMonitors(new Set(allMonitorKeys));
        }
    }, [allMonitorKeys, hasManualSelection]);

    // 过滤后的监控任务列表
    const monitorKeys = useMemo(() => {
        return allMonitorKeys.filter(key => selectedMonitors.has(key));
    }, [allMonitorKeys, selectedMonitors]);

    // 数据转换 - 支持多个监控任务（统一时间轴 + 线性插值）
    const chartData = useMemo(() => {
        const series = (metricsResponse?.data.series || []).filter((series) => series.name === 'response_time');
        if (series.length === 0) return [];

        // 收集所有监控任务的数据
        const seriesDataArray: Array<{ key: string; data: Array<{ timestamp: number; value: number }> }> = [];

        series.forEach((s) => {
            const monitorKey = s.labels?.monitor_name || s.labels?.monitor_id || s.name;
            if (!selectedMonitors.has(monitorKey)) return;
            if (!s.data || s.data.length === 0) return;

            seriesDataArray.push({
                key: monitorKey,
                data: [...s.data].sort((a, b) => a.timestamp - b.timestamp)
            });
        });

        if (seriesDataArray.length === 0) return [];

        // 使用所有服务的时间并集。不同服务开始检测的时间可能不同，不能因没有共同区间而隐藏曲线。
        let minTime = Infinity, maxTime = -Infinity;
        seriesDataArray.forEach(s => {
            if (s.data.length > 0) {
                minTime = Math.min(minTime, s.data[0].timestamp);
                maxTime = Math.max(maxTime, s.data[s.data.length - 1].timestamp);
            }
        });

        if (!Number.isFinite(minTime) || !Number.isFinite(maxTime)) return [];
        if (minTime === maxTime) {
            return seriesDataArray.map((series) => ({timestamp: series.data[0].timestamp, [series.key]: series.data[0].value}));
        }

        // 均匀生成目标时间点
        const maxPoints = getMaxDataPoints(timeRange);
        const timeStep = (maxTime - minTime) / (maxPoints - 1);
        const targetTimestamps: number[] = [];
        for (let i = 0; i < maxPoints; i++) {
            targetTimestamps.push(minTime + i * timeStep);
        }

        // 线性插值函数
        const interpolate = (data: Array<{ timestamp: number; value: number }>, targetTime: number): number | null => {
            if (data.length === 0) return null;
            if (data.length === 1) {
                // 单点数据，只有精确匹配才返回
                return data[0].timestamp === targetTime ? data[0].value : null;
            }
            
            // 如果目标时间在数据范围外，返回 null（断开折线）
            if (targetTime < data[0].timestamp || targetTime > data[data.length - 1].timestamp) {
                return null;
            }
            
            // 二分查找找到 targetTime 前后两个点
            let left = 0, right = data.length - 1;
            while (right - left > 1) {
                const mid = Math.floor((left + right) / 2);
                if (data[mid].timestamp <= targetTime) {
                    left = mid;
                } else {
                    right = mid;
                }
            }
            
            // 线性插值
            const leftPoint = data[left];
            const rightPoint = data[right];
            const ratio = (targetTime - leftPoint.timestamp) / (rightPoint.timestamp - leftPoint.timestamp);
            return leftPoint.value + ratio * (rightPoint.value - leftPoint.value);
        };

        // 对每个时间点，从每个监控任务中插值获取值
        return targetTimestamps.map(timestamp => {
            const dataPoint: any = { timestamp };
            seriesDataArray.forEach(s => {
                const value = interpolate(s.data, timestamp);
                if (value !== null) {
                    dataPoint[s.key] = Number(value.toFixed(2));
                }
            });
            return dataPoint;
        });
    }, [metricsResponse, selectedMonitors, timeRange, start, end]);

    // 动态生成颜色（根据监控项数量）
    const colors = useMemo(() => {
        return generateColors(allMonitorKeys.length);
    }, [allMonitorKeys.length]);

    // 点击图表区域切换选中状态
    const handleAreaClick = (data: any) => {
        if (!data || !data.dataKey) return;
        
        const monitorKey = data.dataKey;
        setHasManualSelection(true);
        const newSelected = new Set(selectedMonitors);
        
        // 判断是否是全选状态
        const isAllSelected = selectedMonitors.size === allMonitorKeys.length;
        
        if (isAllSelected) {
            // 全选状态下，点击某个 → 只选这一个
            setSelectedMonitors(new Set([monitorKey]));
        } else {
            // 非全选状态下，点击切换
            if (newSelected.has(monitorKey)) {
                newSelected.delete(monitorKey);
            } else {
                newSelected.add(monitorKey);
            }
            setSelectedMonitors(newSelected);
        }
    };

    // 点击图例切换选中状态
    const handleLegendClick = (data: any) => {
        const monitorKey = data.value;
        setHasManualSelection(true);
        const newSelected = new Set(selectedMonitors);
        
        // 判断是否是全选状态
        const isAllSelected = selectedMonitors.size === allMonitorKeys.length;
        
        if (isAllSelected) {
            // 全选状态下，点击某个 → 只选这一个
            setSelectedMonitors(new Set([monitorKey]));
        } else {
            // 非全选状态下，点击切换
            if (newSelected.has(monitorKey)) {
                newSelected.delete(monitorKey);
            } else {
                newSelected.add(monitorKey);
            }
            setSelectedMonitors(newSelected);
        }
    };

    // 恢复全选
    const handleSelectAll = () => {
        setHasManualSelection(true);
        setSelectedMonitors(new Set(allMonitorKeys));
    };

    // 是否有监控项未选中（用于显示恢复按钮）
    const hasUnselected = selectedMonitors.size < allMonitorKeys.length;

    // 切换图例显示/隐藏（仅移动端）
    const toggleLegend = () => {
        setLegendCollapsed(!legendCollapsed);
    };

    // 即使暂时没有历史点也保留图表区域，避免服务监控页缺少趋势图。
    if (!isLoading && chartData.length === 0) {
        return (
            <ChartContainer title="服务响应时间趋势" icon={Activity}>
                <ChartPlaceholder
                    title="暂无服务监控历史数据"
                    subtitle="等待至少两次服务检测上报后即可绘制响应时间趋势"
                />
            </ChartContainer>
        );
    }

    // 渲染
    if (isLoading) {
        return (
            <ChartContainer title="监控响应时间" icon={Activity}>
                <ChartPlaceholder/>
            </ChartContainer>
        );
    }

    return (
        <ChartContainer title="监控响应时间" icon={Activity}>
            {chartData.length > 0 ? (
                <>
                    {/* 使用提示和恢复按钮 */}
                    {allMonitorKeys.length > 1 && (
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-xs text-gray-500 dark:text-cyan-600">
                                💡 点击图表线条或图例切换显示
                            </div>
                            {hasUnselected && (
                                <button
                                    onClick={handleSelectAll}
                                    className="p-1.5 rounded
                                        text-gray-500 dark:text-cyan-500 
                                        hover:text-gray-700 dark:hover:text-cyan-400
                                        hover:bg-gray-100 dark:hover:bg-cyan-900/30
                                        transition-colors"
                                    title="恢复全选"
                                >
                                    <RotateCcw size={16} />
                                </button>
                            )}
                        </div>
                    )}
                    
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={chartData}>
                            <defs>
                                {monitorKeys.map((key, index) => {
                                    const originalIndex = allMonitorKeys.indexOf(key);
                                    return (
                                        <linearGradient key={key} id={`monitorAreaGradient-${index}`} x1="0" y1="0" x2="0"
                                                        y2="1">
                                            <stop offset="5%" stopColor={colors[originalIndex]} stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor={colors[originalIndex]} stopOpacity={0}/>
                                        </linearGradient>
                                    );
                                })}
                            </defs>
                            <CartesianGrid stroke="currentColor" strokeDasharray="4 4"
                                           className="stroke-slate-200 dark:stroke-cyan-900/30"/>
                            <XAxis
                                dataKey="timestamp"
                                type="number"
                                scale="time"
                                domain={['dataMin', 'dataMax']}
                                tickFormatter={(value) => formatChartTime(Number(value), timeRange, rangeMs)}
                                stroke="currentColor"
                                angle={-15}
                                textAnchor="end"
                                className="text-xs text-gray-600 dark:text-cyan-500 font-mono"
                                height={45}
                            />
                            <YAxis
                                stroke="currentColor"
                                className="stroke-gray-400 dark:stroke-cyan-600 text-xs"
                                tickFormatter={(value) => `${value}ms`}
                            />
                            <Tooltip
                                content={<CustomTooltip unit="ms"/>}
                                wrapperStyle={{zIndex: 9999,}}
                            />
                            {monitorKeys.map((key, index) => {
                                const originalIndex = allMonitorKeys.indexOf(key);
                                return (
                                    <Area
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        name={key}
                                        stroke={colors[originalIndex]}
                                        strokeWidth={2}
                                        fill={`url(#monitorAreaGradient-${index})`}
                                        activeDot={{r: 3}}
                                        connectNulls
                                        onClick={handleAreaClick}
                                        style={{cursor: 'pointer'}}
                                        isAnimationActive={!isLive}
                                    />
                                );
                            })}
                        </AreaChart>
                    </ResponsiveContainer>
                    
                    {/* 桌面端：直接显示图例 */}
                    {!isMobile && allMonitorKeys.length > 0 && (
                        <CustomLegend
                            onClick={handleLegendClick}
                            selectedMonitors={selectedMonitors}
                            allMonitorKeys={allMonitorKeys}
                            colors={colors}
                        />
                    )}
                    
                    {/* 移动端：可折叠图例 */}
                    {isMobile && allMonitorKeys.length > 0 && (
                        <div className="pt-4">
                            <button
                                onClick={toggleLegend}
                                className="w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-600 dark:text-cyan-400 hover:text-gray-900 dark:hover:text-cyan-300"
                            >
                                <span>{legendCollapsed ? '显示图例' : '收起图例'}</span>
                                {legendCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                            </button>
                            <CustomLegend
                                onClick={handleLegendClick}
                                selectedMonitors={selectedMonitors}
                                allMonitorKeys={allMonitorKeys}
                                colors={colors}
                                collapsed={legendCollapsed}
                            />
                        </div>
                    )}
                </>
            ) : (
                <ChartPlaceholder/>
            )}
        </ChartContainer>
    );
};

export const MonitorChart = memo(MonitorChartImpl);
