import {useState} from 'react';
import {Outlet} from 'react-router-dom';
import PublicHeader from '@portal/components/PublicHeader';
import PublicFooter from '@portal/components/PublicFooter';

const PublicLayout = () => {
    const [hasCustomBackground, setHasCustomBackground] = useState(true);
    const overlayOpacity = Math.min(100, Math.max(0, window.SystemConfig?.BackgroundOverlayOpacity ?? 65));
    return (
        <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-slate-100 text-slate-800 transition-colors duration-500 dark:bg-[#020713] dark:text-slate-100">
            {/* 公开面板的视觉底图：内容区保留足够暗度，确保实时数据始终清晰可读。 */}
            <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_15%_0%,#dbeafe_0%,#f8fafc_42%,#e0f2fe_100%)] bg-cover bg-center dark:bg-[url('/pika-night-monitor-bg.png')]"/>
            {hasCustomBackground && <img src="/api/background" alt="" aria-hidden="true" onError={() => setHasCustomBackground(false)} className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover"/>}
            <div
                className="pointer-events-none fixed inset-0 z-0 hidden bg-[linear-gradient(180deg,rgba(2,9,23,.82)_0%,rgba(2,11,26,.86)_42%,rgba(2,8,19,1)_100%)] dark:block"
                style={{ opacity: overlayOpacity / 100 }}
            />
            <div className="pointer-events-none fixed inset-x-0 top-20 z-0 hidden h-px bg-gradient-to-r from-transparent via-teal-200/35 to-transparent dark:block"/>

            <PublicHeader/>
            <div className="relative z-10 flex min-h-screen flex-col pt-[81px]">
                <main className="flex-1">
                    <Outlet/>
                </main>
                <PublicFooter/>
            </div>
        </div>
    );
};

export default PublicLayout;
