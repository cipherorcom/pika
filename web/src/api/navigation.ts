import {get} from './request';

export interface NavigationLink {
    category: string;
    name: string;
    url: string;
    desc: string;
}

export const getNavigationLinks = () => get<NavigationLink[]>('/navigation');
