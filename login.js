const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwEfNpze7Zu4biiFvKMt_xVXuMWEMzVdDywsqV5cmjvm0mMgQHBD48I4Xrq5xZKFXuKLw/exec';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Verificando...';
            btn.disabled = true;
            btn.classList.add('opacity-80', 'cursor-not-allowed');

            const userValue = document.getElementById('user').value.toUpperCase().trim();
            const passValue = document.getElementById('pass').value.trim();

            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8',
                    },
                    body: JSON.stringify({
                        user: userValue,
                        pass: passValue
                    })
                });

                const data = await response.json();

                if (data.status === "success") {
                    localStorage.setItem('iptce_digital_session', 'true');
                    window.location.href = data.redirect; 
                } else {
                    alert("Credenciales incorrectas. Por favor, verifica tu usuario y contraseña.");
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    btn.classList.remove('opacity-80', 'cursor-not-allowed');
                }

            } catch (error) {
                console.error("Error de conexión:", error);
                alert("Ocurrió un error al intentar conectar con el servidor. Intenta de nuevo más tarde.");
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.classList.remove('opacity-80', 'cursor-not-allowed');
            }
        });
    }
});