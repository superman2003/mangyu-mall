document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const emailInput = document.getElementById('email');
    const character1 = document.getElementById('character1');
    const character2 = document.getElementById('character2');
    const captchaImage = document.getElementById('captcha-image');
    const refreshButton = document.getElementById('refresh-captcha');

    const character1Normal = 'character1_normal.png';
    const character1Covered = 'character1_covered.png';
    const character2Normal = 'character2_normal.png';
    const character2Covered = 'character2_covered.png';

    function updateCharacterImages() {
        if (usernameInput.matches(':focus') || emailInput.matches(':focus')) {
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
    emailInput.addEventListener('focus', updateCharacterImages);
    emailInput.addEventListener('blur', updateCharacterImages);

    // 加载验证码
    function loadCaptcha() {
        fetch('/api/captcha')
            .then(response => response.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                captchaImage.innerHTML = `<img src="${url}" alt="验证码" width="100%" height="100%">`;
            })
            .catch(error => console.error('加载验证码失败:', error));
    }

    // 初始加载验证码
    loadCaptcha();

    // 刷新验证码的函数
    function refreshCaptcha() {
        captchaImage.src = '/api/captcha?' + new Date().getTime();  // 添加时间戳防止缓存
    }

    // 点击刷新按钮时刷新验证码
    refreshButton.addEventListener('click', refreshCaptcha);

    // 点击验证码图片时也刷新
    captchaImage.addEventListener('click', refreshCaptcha);

    // 修改注册表单提交逻辑
    registerForm.onsubmit = async function(e) {
        e.preventDefault();

        const captchaValue = document.getElementById('captcha').value;
        
        // 先验证验证码
        try {
            const captchaResponse = await fetch('/api/verify-captcha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ captcha: captchaValue })
            });

            if (!captchaResponse.ok) {
                const error = await captchaResponse.json();
                alert(error.error || '验证码错误');
                loadCaptcha(); // 刷新验证码
                return;
            }

            // 验证码正确，继续注册流程
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const email = document.getElementById('email').value;

            const registerResponse = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, email })
            });

            if (registerResponse.ok) {
                alert('注册成功！');
                window.location.href = 'login.html';
            } else {
                const error = await registerResponse.json();
                alert(error.error || '注册失败');
                loadCaptcha(); // 刷新验证码
            }
        } catch (error) {
            console.error('注册失败:', error);
            alert('注册失败，请稍后重试');
            loadCaptcha(); // 刷新验证码
        }
    };
});
