import {type JSX, useEffect, useMemo, useRef, useState} from 'react';
import {Outlet, useLocation, useNavigate} from 'react-router-dom';
import type {MenuProps} from 'antd';
import {App as AntApp, Avatar, Button, ConfigProvider, Dropdown, Space, theme} from 'antd';
import {
    Activity,
    AlertTriangle,
    BookOpen,
    Eye,
    Globe,
    Key,
    LogOut,
    Moon,
    Server,
    Settings,
    Sun,
    User as UserIcon
} from 'lucide-react';
import {logout} from '@/api/auth.ts';
import type {User} from '@/types';
import {cn} from '@/lib/utils';
import {getServerVersion, type VersionInfo} from "@/api/version.ts";
import {flushSync} from "react-dom";
import {ScrollArea} from "@radix-ui/react-scroll-area";
import {useTheme} from '@/portal/contexts/ThemeContext';

interface NavItem {
    key: string;
    label: string;
    path: string;
    icon: JSX.Element;
}

const SIDEBAR_WIDTH = 240;
const HEADER_HEIGHT = 56;

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {message: messageApi, modal} = AntApp.useApp();
    const [userInfo, setUserInfo] = useState<User | null>(null);
    const [version, setVersion] = useState<VersionInfo>();
    const {appliedTheme, setTheme} = useTheme();
    const themeButtonRef = useRef<HTMLButtonElement>(null);

    const menuItems: NavItem[] = useMemo(
        () => [
            {
                key: 'agents',
                label: '探针管理',
                path: '/admin/agents',
                icon: <Server className="h-4 w-4" strokeWidth={2}/>,
            },
            {
                key: 'monitors',
                label: '服务监控',
                path: '/admin/monitors',
                icon: <Activity className="h-4 w-4" strokeWidth={2}/>,
            },
            {
                key: 'ddns',
                label: 'DDNS',
                path: '/admin/ddns',
                icon: <Globe className="h-4 w-4" strokeWidth={2}/>,
            },
            {
                key: 'comm-keys',
                label: '通信密钥',
                path: '/admin/api-keys',
                icon: <Key className="h-4 w-4" strokeWidth={2}/>,
            },
            {
                key: 'api-keys',
                label: 'API密钥',
                path: '/admin/manage-api-keys',
                icon: <Key className="h-4 w-4" strokeWidth={2}/>,
            },
            {
                key: 'alert-records',
                label: '告警记录',
                path: '/admin/alert-records',
                icon: <AlertTriangle className="h-4 w-4" strokeWidth={2}/>,
            },
            {
                key: 'settings',
                label: '系统设置',
                path: '/admin/settings',
                icon: <Settings className="h-4 w-4" strokeWidth={2}/>,
            },
        ],
        [],
    );

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userInfoStr = localStorage.getItem('userInfo');

        if (!token || !userInfoStr) {
            navigate('/login');
            return;
        }

        setUserInfo(JSON.parse(userInfoStr));

        // 获取服务端版本信息
        getServerVersion()
            .then((res) => {
                setVersion(res.data);
            })
            .catch((err) => {
                console.error('获取版本信息失败:', err);
            });
    }, [navigate, location]);

    const handleLogout = () => {
        modal.confirm({
            title: '确认退出',
            content: '确定要退出登录吗？',
            onOk: async () => {
                try {
                    await logout();
                } finally {
                    localStorage.removeItem('token');
                    localStorage.removeItem('userInfo');
                    messageApi.success('已退出登录');
                    navigate('/');
                }
            },
        });
    };

    const userMenuItems: MenuProps['items'] = [
        {
            key: 'logout',
            icon: <LogOut size={16} strokeWidth={2}/>,
            label: '退出登录',
            onClick: handleLogout,
        },
    ];

    const handleNavigate = (item: NavItem) => {
        navigate(item.path);
    };

    const activeItem = menuItems.find((item) => location.pathname.startsWith(item.path)) || menuItems[0];

    // 切换主题的函数，带动画效果
    const toggleTheme = async () => {
        const newTheme = appliedTheme === 'dark' ? 'light' : 'dark';

        if (
            !themeButtonRef.current ||
            !document.startViewTransition ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            // 如果不支持 View Transition API 或用户偏好减少动画，直接切换
            setTheme(newTheme);
            return;
        }

        await document.startViewTransition(() => {
            flushSync(() => {
                setTheme(newTheme);
            });
        }).ready;

        const {top, left, width, height} = themeButtonRef.current.getBoundingClientRect();
        const x = left + width / 2;
        const y = top + height / 2;
        const right = window.innerWidth - left;
        const bottom = window.innerHeight - top;
        const maxRadius = Math.hypot(
            Math.max(left, right),
            Math.max(top, bottom),
        );

        document.documentElement.animate(
            {
                clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${maxRadius}px at ${x}px ${y}px)`,
                ],
            },
            {
                duration: 500,
                easing: 'ease-in-out',
                pseudoElement: '::view-transition-new(root)',
            }
        );
    };

    return (
        <ConfigProvider
            theme={{
                algorithm: appliedTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
            }}
        >
            <AntApp>
                <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#07111f] dark:text-slate-100">
                    {/* 顶部导航栏 */}
                    <header
                        className="fixed top-0 left-0 right-0 z-[300] h-14 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-cyan-950/80 dark:bg-[#081522]/90">
                        <div className="flex h-full items-center justify-between px-4 lg:px-6">
                            <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                                <div className="flex items-center justify-center rounded-xl bg-slate-100 p-1 dark:bg-cyan-400/10">
                                    <img
                                        src={"/api/logo"}
                                        alt="Logo"
                                        className="h-10 w-10 object-contain rounded-md"
                                        onError={(e) => {
                                            e.currentTarget.src = '/logo.png';
                                        }}
                                    />
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-cyan-300/65">{window.SystemConfig?.SystemNameZh}</p>
                                    <p className="text-sm font-semibold tracking-tight">控制台</p>
                                </div>
                            </div>

                            <div className="hidden min-w-0 flex-1 px-8 lg:block">
                                <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{activeItem.label}</p>
                                <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">管理与配置</p>
                            </div>

                            <Space size={8} className="flex h-full items-center">
                                <Button
                                    type="text"
                                    icon={<Eye className="h-4 w-4" strokeWidth={2}/>}
                                    onClick={() => window.open('/', '_blank')}
                                    className="hidden !h-9 !items-center !rounded-lg !px-3 !text-xs !text-slate-600 hover:!bg-slate-100 dark:!text-slate-300 dark:hover:!bg-cyan-400/10 sm:!inline-flex"
                                >
                                    公共页面
                                </Button>
                                <Button
                                    type="text"
                                    icon={<BookOpen className="h-4 w-4" strokeWidth={2}/>}
                                    onClick={() => navigate('/admin/agents-install/one-click')}
                                    className="!h-9 !items-center !rounded-lg !px-3 !text-xs !text-slate-600 hover:!bg-slate-100 dark:!text-slate-300 dark:hover:!bg-cyan-400/10"
                                >
                                    部署指南
                                </Button>

                                {/* 主题切换按钮 */}
                                <button
                                    ref={themeButtonRef}
                                    type="button"
                                    onClick={toggleTheme}
                                    className="inline-flex h-9 items-center rounded-lg p-2 text-slate-600 transition-all hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-cyan-400/10"
                                    title={appliedTheme === 'dark' ? "切换到浅色模式" : "切换到暗黑模式"}
                                >
                                    {appliedTheme === 'dark' ? (
                                        <Sun className="h-4 w-4" strokeWidth={2}/>
                                    ) : (
                                        <Moon className="h-4 w-4" strokeWidth={2}/>
                                    )}
                                </button>

                                <Dropdown menu={{items: userMenuItems}} placement="bottomRight" trigger={['click']}>
                                    <button
                                        type="button"
                                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-left text-slate-700 transition-colors hover:border-cyan-300 dark:border-cyan-950 dark:bg-cyan-400/5 dark:text-slate-200 dark:hover:border-cyan-500/50"
                                    >
                                        <Avatar
                                            size={24}
                                            icon={<UserIcon className="h-3.5 w-3.5" strokeWidth={2}/>}
                                            className="!bg-cyan-500/15 !text-cyan-600 dark:!text-cyan-300"
                                        />
                                        <span className="text-xs font-medium">
                                        {userInfo?.username || '访客'}
                                    </span>
                                    </button>
                                </Dropdown>
                            </Space>
                        </div>
                    </header>

                    {/* 侧边栏 */}
                    <aside
                        className="fixed left-0 z-[200] hidden h-screen overflow-hidden border-r border-slate-200/80 bg-white/85 shadow-[12px_0_36px_rgba(15,23,42,0.04)] backdrop-blur-xl dark:border-cyan-950/80 dark:bg-[#081522]/85 dark:shadow-none lg:block"
                        style={{
                            width: SIDEBAR_WIDTH,
                            paddingTop: HEADER_HEIGHT,
                        }}
                    >
                        <div className="flex h-full flex-col">
                            <div className="px-4 py-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-400 dark:text-cyan-300/50">Workspace</p>
                                <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">管理面板</p>
                            </div>
                            {/* 菜单区域 */}
                            <ScrollArea className="px-3 pb-6 space-y-1 h-[calc(100vh-228px)]">
                                {menuItems.map((item) => {
                                    const isActive = location.pathname.startsWith(item.path);
                                    return (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => handleNavigate(item)}
                                            className={cn(
                                                'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all cursor-pointer',
                                                isActive
                                                    ? 'bg-cyan-50 text-cyan-700 shadow-sm ring-1 ring-cyan-100 dark:bg-cyan-400/10 dark:text-cyan-200 dark:ring-cyan-400/15'
                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-cyan-400/5'
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-cyan-400/5 dark:text-slate-400',
                                                    isActive && 'bg-cyan-600 text-white dark:bg-cyan-400 dark:text-slate-950'
                                                )}
                                            >
                                                {item.icon}
                                            </span>
                                            <span className="truncate font-medium">{item.label}</span>
                                            {isActive &&
                                                <span
                                                    className="ml-auto text-[10px] uppercase text-cyan-600 dark:text-cyan-300">当前</span>}
                                        </button>
                                    );
                                })}
                            </ScrollArea>

                            {/* 版本信息 */}
                            {version && (
                                <div className="border-t border-slate-100 px-4 py-4 dark:border-cyan-950/70">
                                    <div className="rounded-xl border border-slate-100 bg-slate-50/90 p-3 dark:border-cyan-950/70 dark:bg-cyan-400/5">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-cyan-300/50">版本信息</p>
                                        <div className="mt-2 flex items-end justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Server: {version.version}</p>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Agent: {version.agentVersion}</p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">
                                                    {window.SystemConfig?.SystemNameEn}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* 主内容区 */}
                    <div className="flex flex-col bg-slate-50 dark:bg-[#07111f]"
                         style={{paddingTop: HEADER_HEIGHT, minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`}}>
                        {/* 内容区域 */}
                        <main className="flex-grow bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] pb-20 pt-5 dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.09),transparent_28%),linear-gradient(180deg,#07111f_0%,#0a1626_100%)] lg:ml-[240px] lg:pb-10">
                            <div className="w-full px-4 pb-4 lg:px-8">
                                <Outlet/>
                            </div>
                        </main>
                    </div>

                    {/* 移动端底部导航栏 */}
                    <nav
                        className="fixed bottom-0 left-0 right-0 z-[300] border-t border-gray-200 dark:border-white/10 bg-white/95 dark:bg-[#141414]/95 backdrop-blur lg:hidden">
                        <div className="grid h-16 grid-cols-5">
                            {menuItems.map((item) => {
                                const isActive = location.pathname.startsWith(item.path);
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => handleNavigate(item)}
                                        className={cn(
                                            'flex flex-col items-center justify-center gap-1 text-xs font-medium',
                                            isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
                                        )}
                                    >
                                    <span
                                        className={cn('rounded-full p-2', isActive ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'text-current')}>
                                        {item.icon}
                                    </span>
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </nav>
                </div>
            </AntApp>
        </ConfigProvider>
    );
};

export default AdminLayout;
