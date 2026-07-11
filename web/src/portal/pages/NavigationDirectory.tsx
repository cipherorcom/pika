import {useMemo, useState} from 'react';
import {Navigate} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {ExternalLink, FolderOpen, Link2, LoaderCircle, Search} from 'lucide-react';
import {getNavigationLinks, type NavigationLink} from '@/api/navigation.ts';

const faviconProxyURL = (siteURL: string) => {
    const faviconURL = `https://www.google.com/s2/favicons?sz=64&domain=${siteURL}`;
    return `https://edgeone.2ms.pp.ua/proxy?url=${encodeURIComponent(faviconURL)}`;
};

const SiteIcon = ({item}: {item: NavigationLink}) => {
    const [failed, setFailed] = useState(false);

    if (failed) {
        return (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-sm font-black uppercase text-cyan-700 dark:text-cyan-100">
                {item.name.slice(0, 1)}
            </span>
        );
    }

    return (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 bg-white/65 p-2 shadow-sm dark:border-cyan-300/15 dark:bg-slate-950/45">
            <img
                src={faviconProxyURL(item.url)}
                alt=""
                className="h-full w-full rounded-md object-contain"
                loading="lazy"
                onError={() => setFailed(true)}
            />
        </span>
    );
};

const NavigationDirectory = () => {
    const [keyword, setKeyword] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('全部');
    const isEnabled = window.SystemConfig?.NavigationEnabled === true;

    const {data: links = [], isLoading, isError} = useQuery<NavigationLink[]>({
        queryKey: ['navigationLinks'],
        queryFn: async () => (await getNavigationLinks()).data || [],
        enabled: isEnabled,
        staleTime: 5 * 60 * 1000,
    });

    const categories = useMemo(
        () => ['全部', ...Array.from(new Set(links.map((item) => item.category)))],
        [links],
    );

    const groupedLinks = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLowerCase();
        const visible = links.filter((item) => {
            const inCategory = selectedCategory === '全部' || item.category === selectedCategory;
            const searchable = `${item.name} ${item.desc} ${item.url} ${item.category}`.toLowerCase();
            return inCategory && (!normalizedKeyword || searchable.includes(normalizedKeyword));
        });

        return visible.reduce<Record<string, NavigationLink[]>>((groups, item) => {
            (groups[item.category] ??= []).push(item);
            return groups;
        }, {});
    }, [keyword, links, selectedCategory]);

    if (!isEnabled) {
        return <Navigate to="/" replace/>;
    }

    return (
        <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-9 lg:px-8">
            <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 p-5 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.42)] backdrop-blur-md dark:border-cyan-300/15 dark:bg-slate-950/55 dark:shadow-[0_18px_55px_-30px_rgba(34,211,238,0.25)] sm:p-7">
                <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl dark:bg-cyan-300/12"/>
                <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl"/>

                <div className="relative">
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">导航站</h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-cyan-100/65">从共享表格同步的常用站点，一站直达。</p>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="min-w-0 flex-1 overflow-x-auto pb-1 [scrollbar-width:none]">
                            <div className="flex w-max gap-2">
                                {categories.map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition ${selectedCategory === category
                                            ? 'bg-slate-900 text-white shadow-md shadow-slate-900/15 dark:bg-cyan-300 dark:text-slate-950'
                                            : 'border border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-700 dark:border-cyan-300/25 dark:bg-[#06131f] dark:text-cyan-50/75 dark:hover:border-cyan-200/55 dark:hover:text-cyan-100'}`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label className="group relative block w-full shrink-0 lg:w-64">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-600 dark:text-cyan-100/50 dark:group-focus-within:text-cyan-200"/>
                            <input
                                value={keyword}
                                onChange={(event) => setKeyword(event.target.value)}
                                placeholder="搜索导航..."
                                aria-label="搜索导航"
                                className="h-9 w-full rounded-lg border border-slate-200 bg-white/80 pl-8 pr-3 text-xs text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 dark:border-cyan-300/20 dark:bg-[#020d18]/75 dark:text-cyan-50 dark:placeholder:text-cyan-100/45"
                            />
                        </label>
                    </div>
                </div>
            </section>

            {isLoading ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-slate-500 dark:text-cyan-100/65">
                    <LoaderCircle className="h-8 w-8 animate-spin text-cyan-500"/>
                    <span className="text-sm">正在同步导航数据…</span>
                </div>
            ) : isError ? (
                <div className="mt-5 flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-rose-300/70 bg-white/95 p-6 text-center dark:border-rose-300/35 dark:bg-[#071827]/95">
                    <Link2 className="h-9 w-9 text-rose-500"/>
                    <p className="mt-3 font-semibold text-slate-800 dark:text-white">暂时无法读取导航表格</p>
                    <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-cyan-100/60">请确认 Google 表格已公开可查看，且首行包含 category、name、url、desc 四列。</p>
                </div>
            ) : Object.keys(groupedLinks).length === 0 ? (
                <div className="mt-5 flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/95 p-6 text-center dark:border-cyan-300/30 dark:bg-[#071827]/95">
                    <FolderOpen className="h-10 w-10 text-slate-400 dark:text-cyan-100/45"/>
                    <p className="mt-3 font-semibold text-slate-800 dark:text-white">没有找到匹配的站点</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-cyan-100/60">换个关键词，或在 Google 表格中添加导航项。</p>
                </div>
            ) : (
                <div className="mt-6 space-y-7">
                    {Object.entries(groupedLinks).map(([category, items]) => (
                        <section key={category}>
                            <div className="mb-3 flex items-center gap-2.5">
                                <span className="h-5 w-1 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600"/>
                                <h2 className="text-base font-black text-slate-800 dark:text-cyan-50">{category}</h2>
                                <span className="rounded-full bg-slate-200/75 px-2 py-0.5 text-[11px] font-mono text-slate-500 dark:bg-cyan-300/10 dark:text-cyan-100/60">{items.length}</span>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {items.map((item) => (
                                    <a
                                        key={`${item.category}-${item.name}-${item.url}`}
                                        href={item.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="group relative flex min-h-[104px] items-start gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white/75 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-500/10 dark:border-cyan-300/25 dark:bg-[#071827]/70 dark:hover:border-cyan-200/65"
                                    >
                                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/0 to-transparent transition group-hover:via-cyan-400/70"/>
                                        <SiteIcon item={item}/>
                                        <div className="min-w-0 flex-1 pt-0.5">
                                            <div className="flex items-start gap-2">
                                                <h3 className="line-clamp-1 flex-1 font-bold text-slate-800 transition-colors group-hover:text-cyan-700 dark:text-cyan-50 dark:group-hover:text-cyan-200">{item.name}</h3>
                                                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-600 dark:text-cyan-100/45 dark:group-hover:text-cyan-200"/>
                                            </div>
                                            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500 dark:text-cyan-100/60">{item.desc || '打开站点'}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NavigationDirectory;
