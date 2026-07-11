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
            NavigationEnabled: boolean;
            NavigationSheetURL: string;
            Version: string;
        };
    }
}
