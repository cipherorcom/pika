export {};

declare global {
    interface Window {
        SystemConfig: {
            SystemNameZh: string;
            SystemNameEn: string;
            ICPCode: string;
            DefaultView: string;
            BackgroundOverlayOpacity: number;
            ChromeBlur: number;
            Version: string;
        };
    }
}
