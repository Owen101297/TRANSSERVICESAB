/**
 * Trans Services A&B - Sistema de Notificaciones Toast Estilo Apple Dynamic Island
 * public/apps/viajes/js/toast.js
 */

(function () {
    // Contenedor principal de Toasts
    let toastContainer = null;

    function getOrCreateContainer() {
        if (!toastContainer || !document.body.contains(toastContainer)) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'appleToastContainer';
            toastContainer.style.cssText = `
                position: fixed;
                top: 16px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 99999;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                pointer-events: none;
                width: 90%;
                max-width: 420px;
            `;
            document.body.appendChild(toastContainer);
        }
        return toastContainer;
    }

    function showToast(message, type = 'info', duration = 3500) {
        const container = getOrCreateContainer();

        const toast = document.createElement('div');
        toast.style.cssText = `
            pointer-events: auto;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 18px;
            border-radius: 9999px;
            background: rgba(15, 23, 42, 0.88);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.16);
            box-shadow: 0 12px 30px -4px rgba(0, 0, 0, 0.35), 0 4px 10px rgba(0, 0, 0, 0.15);
            color: #FFFFFF;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", sans-serif;
            font-size: 13px;
            font-weight: 600;
            line-height: 1.35;
            letter-spacing: -0.01em;
            transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            opacity: 0;
            transform: translateY(-16px) scale(0.96);
            cursor: pointer;
            user-select: none;
        `;

        let iconSvg = '';
        let accentColor = '#007AFF';

        if (type === 'success') {
            accentColor = '#34C759';
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        } else if (type === 'error') {
            accentColor = '#FF3B30';
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
        } else if (type === 'warning') {
            accentColor = '#FF9500';
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        } else {
            accentColor = '#007AFF';
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        }

        toast.innerHTML = `
            <span style="display:flex;align-items:center;flex-shrink:0;">${iconSvg}</span>
            <span style="flex:1;text-align:left;">${message}</span>
        `;

        container.appendChild(toast);

        // Animación de Entrada
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0) scale(1)';
        });

        // Cierre automático o por click
        const removeToast = () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-12px) scale(0.96)';
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 350);
        };

        toast.addEventListener('click', removeToast);
        setTimeout(removeToast, duration);
    }

    // Exponer API global compatible
    window.TS = window.TS || {};
    window.TS.toastSuccess = (msg, d) => showToast(msg, 'success', d);
    window.TS.toastError = (msg, d) => showToast(msg, 'error', d || 4500);
    window.TS.toastWarning = (msg, d) => showToast(msg, 'warning', d);
    window.TS.toastInfo = (msg, d) => showToast(msg, 'info', d);

    // Fallbacks globales directos
    window.toastSuccess = window.TS.toastSuccess;
    window.toastError = window.TS.toastError;
    window.toastInfo = window.TS.toastInfo;
})();
