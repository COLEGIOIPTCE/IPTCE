const originalShowToast = window.showToast;
        window.showToast = function(titulo, mensaje, tipo) {
            const toast = document.getElementById('toast');
            const tTitle = document.getElementById('toast-title');
            const tMsg = document.getElementById('toast-msg');
            const tIconBox = document.getElementById('toast-icon-box');
            const tIconI = document.getElementById('toast-icon-i');
            const tProgress = document.getElementById('toast-progress');

            // Actualizar contenido
            tTitle.innerText = titulo || "Aviso";
            tMsg.innerText = mensaje || "";

            // Personalizar según tipo
            if (tipo === 'success' || (mensaje && mensaje.toLowerCase().includes('éxito'))) {
                tIconBox.className = "flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600";
                tIconI.className = "fa-solid fa-check-double text-lg";
                tProgress.className = "h-full bg-emerald-500 w-0 toast-progress-active";
            } else {
                tIconBox.className = "flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center bg-red-50 text-red-600";
                tIconI.className = "fa-solid fa-triangle-exclamation text-lg";
                tProgress.className = "h-full bg-red-500 w-0 toast-progress-active";
            }

            // Mostrar
            toast.classList.remove('translate-x-[120%]', 'opacity-0');

            // Auto-cerrar después de 5s (igual que la animación de la barra)
            clearTimeout(window.toastTimer);
            window.toastTimer = setTimeout(hideToast, 5000);
        };

        function hideToast() {
            const toast = document.getElementById('toast');
            const tProgress = document.getElementById('toast-progress');
            
            toast.classList.add('translate-x-[120%]', 'opacity-0');
            // Reset de la barra
            setTimeout(() => {
                tProgress.classList.remove('toast-progress-active');
            }, 500);
        }

        // Observer para la inicial
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.id === 'dash-nombre') {
                    const nombre = mutation.target.innerText.trim();
                    if (nombre && nombre !== '--' && nombre !== 'Cargando...') {
                        document.getElementById('profile-initial-text').innerText = nombre.charAt(0);
                    }
                }
            });
        });

        window.addEventListener('DOMContentLoaded', () => {
            const dashNombre = document.getElementById('dash-nombre');
            if (dashNombre) {
                observer.observe(dashNombre, { childList: true, characterData: true, subtree: true });
            }
        });
