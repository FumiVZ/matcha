import {toast} from 'react-toastify';
import { MessageToast, InfoToast, ErrorToast } from './types';

export function notify(content: string, type: 'info' | 'message' | 'error' = 'info', title?: string) {
    const options = {
        position: "top-right" as const,
        autoClose: 5000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0
        }
    };

    switch (type) {
        case 'info':
            toast(InfoToast, {
                ...options,
                data: { title: title || 'Info', content }
            });
            break;
        case 'message':
            toast(MessageToast, {
                ...options,
                data: { title: title || 'New Message', content }
            });
            break;
        case 'error':
            toast(ErrorToast, {
                ...options,
                data: { title: title || 'Error', content }
            });
            break;
        default:
            toast(content, options);
    }
}