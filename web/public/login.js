document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const character1 = document.getElementById('character1');
    const character2 = document.getElementById('character2');

    const character1Normal = 'character1_normal.png';
    const character1Covered = 'character1_covered.png';
    const character2Normal = 'character2_normal.png';
    const character2Covered = 'character2_covered.png';

    function updateCharacterImages() {
        if (usernameInput.matches(':focus')) {
            character1.src = character1Normal;
            character2.src = character2Normal;
        } else if (passwordInput.matches(':focus')) {
            character1.src = character1Covered;
            character2.src = character2Covered;
        }
    }

    usernameInput.addEventListener('focus', updateCharacterImages);
    usernameInput.addEventListener('blur', updateCharacterImages);
    passwordInput.addEventListener('focus', updateCharacterImages);
    passwordInput.addEventListener('blur', updateCharacterImages);

    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const username = usernameInput.value;
        const password = passwordInput.value;

        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const { token } = await response.json();
            localStorage.setItem('token', token);
            alert('登录成功');
            window.location.href = 'my.html'; // 跳转到“我的”页面
        } else {
            alert('用户名或密码错误');
        }
    });
});
