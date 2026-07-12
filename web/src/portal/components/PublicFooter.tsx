import {Github, Heart} from 'lucide-react';

import {useTheme} from '../contexts/ThemeContext';

const PublicFooter = () => {
    const currentYear = new Date().getFullYear();
    const icpCode = window.SystemConfig?.ICPCode || '';
    const {appliedTheme} = useTheme();
    const backgroundOverlayOpacity = Math.min(100, Math.max(0, window.SystemConfig?.BackgroundOverlayOpacity ?? 65));
    const chromeBlur = Math.min(24, Math.max(0, window.SystemConfig?.ChromeBlur ?? 24));
    const chromeOpacity = backgroundOverlayOpacity / 100;

    return (
        <footer
            className="border-t border-slate-200 bg-[#f0f2f5] backdrop-blur-xl transition-colors duration-300 dark:border-cyan-900/50 dark:bg-[#05050a]"
            style={{
                backgroundColor: appliedTheme === 'dark' ? `rgb(5 5 10 / ${chromeOpacity})` : `rgb(240 242 245 / ${chromeOpacity})`,
                backdropFilter: `blur(${chromeBlur}px)`,
            }}
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="py-6">
                    <div className="flex flex-col items-center justify-between gap-4 text-xs text-slate-500 dark:text-cyan-500 sm:flex-row font-mono">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            <span className="text-slate-600 dark:text-cyan-500">© {currentYear}</span>
                            <span className="text-slate-300 dark:text-cyan-900">|</span>
                            {/* GitHub 链接 */}
                            <a
                                href="https://github.com/cipherorcom/pika/tree/master"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-slate-600 dark:text-cyan-500 hover:text-cyan-500 dark:hover:text-cyan-300 transition-colors group"
                                title="查看 GitHub 仓库"
                            >
                                <Github className="h-3 w-3 group-hover:scale-110 transition-transform"/>
                                <span className="underline decoration-slate-400 dark:decoration-cyan-700 underline-offset-2">Pika Monitor</span>
                            </a>
                            <span className="text-slate-500 dark:text-cyan-500/80 tracking-wider">{window.SystemConfig.Version}</span>
                            {/* ICP 备案号 */}
                            {icpCode && (
                                <>
                                    <span className="text-slate-300 dark:text-cyan-900">|</span>
                                    <a
                                        href="https://beian.miit.gov.cn"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-slate-500 dark:text-cyan-500/80 hover:text-slate-700 dark:hover:text-cyan-500 transition-colors"
                                    >
                                        {icpCode}
                                    </a>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-cyan-500">
                            <span>用</span>
                            <Heart className="h-3 w-3 fill-rose-500 text-rose-500 animate-pulse"/>
                            <span>构建</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
        </footer>
    );
};

export default PublicFooter;
