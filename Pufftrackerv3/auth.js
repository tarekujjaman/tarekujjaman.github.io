const scriptUrl = "https://script.google.com/macros/s/AKfycbzmnLsSvQuqIHoXwdbUYwY3_toOqmCly9rMsiCdrCJlDrAX7B-ma1MfVNiBdFImSjFs/exec";
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const alertContainer = document.getElementById('alert-container');

function showAlert(message, type) {
    alertContainer.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Logging in...';

        const data = new FormData(this);
        data.append('action', 'login');

        fetch(scriptUrl, { method: 'POST', body: data })
            .then(res => res.json())
            .then(response => {
                if (response.status === 'success') {
                    localStorage.setItem('puffTrackerUserID', response.userID);
                    localStorage.setItem('puffTrackerToken', response.token);
                    localStorage.setItem('puffTrackerNickname', response.nickname);
                    localStorage.setItem('puffTrackerEmail', response.email);
                    window.location.href = 'index.html';
                } else {
                    showAlert(response.message, 'danger');
                }
            })
            .catch(error => showAlert('An error occurred. Please try again.', 'danger'))
            .finally(() => {
                submitButton.disabled = false;
                submitButton.textContent = 'Login';
            });
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Registering...';

        const data = new FormData(this);
        data.append('action', 'register');

        fetch(scriptUrl, { method: 'POST', body: data })
            .then(res => res.json())
            .then(response => {
                if (response.status === 'success') {
                    showAlert('Registration successful! Please log in.', 'success');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    showAlert(response.message, 'danger');
                }
            })
            .catch(error => showAlert('An error occurred. Please try again.', 'danger'))
            .finally(() => {
                submitButton.disabled = false;
                submitButton.textContent = 'Register';
            });
    });
}