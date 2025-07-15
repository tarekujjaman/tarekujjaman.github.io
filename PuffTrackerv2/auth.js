const scriptUrl = "https://script.google.com/macros/s/AKfycbwgjQgJtz4lRwvSlVEYdkYZKGwcoXNPR1k9EePnHchRlsZ2-Rj0rJQJYTV5jJIMfLUOuw/exec"; // Your Google Apps Script URL
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const alertContainer = document.getElementById('alert-container');

function showAlert(message, type) {
    alertContainer.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    // Optional: Auto-hide after some time
    setTimeout(() => {
        alertContainer.innerHTML = '';
    }, 4000);
}

if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...'; // Add spinner

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
                    showAlert('Login successful!', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000); // Shorter delay before redirect
                } else {
                    showAlert(response.message, 'danger');
                }
            })
            .catch(error => {
                console.error('Error during login:', error);
                showAlert('An error occurred. Please try again.', 'danger');
            })
            .finally(() => {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Login'; // Reset button text
            });
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registering...'; // Add spinner

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
            .catch(error => {
                console.error('Error during registration:', error);
                showAlert('An error occurred. Please try again.', 'danger');
            })
            .finally(() => {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Register'; // Reset button text
            });
    });
}
