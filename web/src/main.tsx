import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

// 开发环境不会经过服务端模板渲染，因此为全局系统配置提供安全默认值。
// 生产环境中服务端注入的配置会被保留。
window.SystemConfig ??= {
    SystemNameZh: '皮卡监控',
    SystemNameEn: 'Pika Monitor',
    ICPCode: '',
    DefaultView: 'grid',
    BackgroundOverlayOpacity: 65,
    ChromeBlur: 24,
    Version: '',
};

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
})

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <App/>
        </QueryClientProvider>
    </StrictMode>,
)
