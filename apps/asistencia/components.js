import { BRANDING } from './config.js';

/**
 * Injects the header component into a container.
 * @param {string} containerId - The ID of the container element.
 * @param {string} subtitle - Optional subtitle to override.
 */
export function renderHeader(containerId, subtitle = BRANDING.subtitle) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="bg-blue-900 p-6 text-center">
            <div class="inline-block bg-white p-2 rounded-lg mb-3 shadow-lg">
                <img src="${BRANDING.logo}" alt="${BRANDING.name} Logo" class="h-16 mx-auto">
            </div>
            <h1 class="text-white font-bold text-lg">${BRANDING.name}</h1>
            <p class="text-blue-200 text-sm">${subtitle}</p>
        </div>
    `;
}

/**
 * Returns the HTML for the Admin Report Header (legacy compatibility).
 */
export function getAdminHeaderHTML() {
    return `
        <div class="grid grid-cols-[140px_1fr_140px] min-h-[70px]">
            <div class="border-r border-black p-1 flex flex-col items-center justify-center text-center">
                <img src="${BRANDING.logo}" alt="Logo" class="h-12 w-auto mb-1">
                <div class="text-[7px] font-bold">${BRANDING.name}</div>
                <div class="text-[6px]">NIT: ${BRANDING.nit}</div>
            </div>
            <div class="flex flex-col">
                <div class="h-1/2 flex items-center justify-center border-b border-black font-bold text-sm">
                    GESTION DE RECURSOS HUMANOS</div>
                <div class="h-1/2 flex items-center justify-center font-bold text-lg">REGISTRO DE ASISTENCIA
                </div>
            </div>
            <div class="border-l border-black text-[8px] text-center flex flex-col">
                <div class="flex-1 flex items-center justify-center border-b border-black font-bold">GRRHH-F-007
                </div>
                <div class="flex-1 flex flex-col justify-center border-b border-black px-1">
                    <span class="font-bold">Aprobación:</span> 01/09/2024
                </div>
                <div class="flex-1 flex items-center justify-center font-bold bg-gray-100">Ver: 02</div>
            </div>
        </div>
    `;
}
