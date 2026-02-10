// --- LÓGICA DE LOGIN (ADMIN) ---

// 1. Abrir Modal
const btnOpenLogin = document.getElementById('open-login-modal-btn');
const modalLogin = document.getElementById('login-modal');
const btnCloseLogin = document.getElementById('close-login-modal-btn');

if (btnOpenLogin) {
    btnOpenLogin.addEventListener('click', () => {
        modalLogin.classList.add('active');
        document.getElementById('login-modal-overlay').classList.add('active');
    });
}

// 2. Fechar Modal
if (btnCloseLogin) {
    btnCloseLogin.addEventListener('click', fecharModalLogin);
    document.getElementById('login-modal-overlay').addEventListener('click', fecharModalLogin);
}

function fecharModalLogin() {
    modalLogin.classList.remove('active');
    document.getElementById('login-modal-overlay').classList.remove('active');
}

// 3. Fazer Login
const formLogin = document.getElementById('login-form');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const usuario = document.getElementById('usuario').value; // Ignorado por enquanto (só temos senha)
        const senha = document.getElementById('senha').value;
        const btnEntrar = e.target.querySelector('button');

        btnEntrar.textContent = "Verificando...";
        btnEntrar.disabled = true;

        try {
            // Verifica se a senha bate com a barbearia atual carregada
            const { data, error } = await supabaseClient
                .from('barbearias')
                .select('id, slug, nome')
                .eq('slug', currentBarbeariaSlug) // Pega a barbearia da URL
                .eq('senha_admin', senha) // Verifica a senha
                .single();

            if (error || !data) {
                alert("Senha incorreta!");
            } else {
                // SUCESSO! Salva no LocalStorage
                localStorage.setItem('barbearia_admin_id', data.id);
                localStorage.setItem('barbearia_slug', data.slug);
                
                // Redireciona para o Painel
                window.location.href = `painel.html?barbearia=${data.slug}`;
            }

        } catch (err) {
            console.error(err);
            alert("Erro ao tentar fazer login.");
        } finally {
            btnEntrar.textContent = "Entrar";
            btnEntrar.disabled = false;
        }
    });
}