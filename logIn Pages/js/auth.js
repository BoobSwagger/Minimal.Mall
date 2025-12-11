// auth.js - Authentication handler for login/signup

const AUTH_API_BASE_URL = 'https://minimallbackend.onrender.com';

// Store token in localStorage
function saveToken(token) {
    localStorage.setItem('authToken', token);
}

// Get token from localStorage
function getToken() {
    return localStorage.getItem('authToken');
}

// Remove token from localStorage
function removeToken() {
    localStorage.removeItem('authToken');
}

// Save user data
function saveUser(user) {
    localStorage.setItem('userData', JSON.stringify(user));
}

// Get user data
function getUser() {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
}

// Sign In function
async function signIn(email, password) {
    try {
        const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Sign in failed');
        }

        if (data.success && data.token) {
            // Save token and user data
            saveToken(data.token);
            if (data.user) {
                saveUser(data.user);
            }
            return {
                success: true,
                message: data.message,
                user: data.user
            };
        } else {
            throw new Error(data.message || 'Sign in failed');
        }

    } catch (error) {
        console.error('Sign in error:', error);
        return {
            success: false,
            message: error.message || 'An error occurred during sign in'
        };
    }
}

// Sign Up function
async function signUp(email, password, fullName, phone = null) {
    try {
        const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password,
                full_name: fullName,
                phone: phone,
                role: 'customer'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Sign up failed');
        }

        if (data.success && data.token) {
            // Save token
            saveToken(data.token);
            return {
                success: true,
                message: data.message,
                user_id: data.user_id
            };
        } else {
            throw new Error(data.message || 'Sign up failed');
        }

    } catch (error) {
        console.error('Sign up error:', error);
        return {
            success: false,
            message: error.message || 'An error occurred during sign up'
        };
    }
}

// Get current user profile
async function getCurrentUser() {
    const token = getToken();
    
    if (!token) {
        return {
            success: false,
            message: 'No authentication token found'
        };
    }

    try {
        const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                // Token is invalid or expired
                removeToken();
            }
            throw new Error(data.detail || 'Failed to get user profile');
        }

        if (data.success && data.user) {
            saveUser(data.user);
            return {
                success: true,
                user: data.user
            };
        } else {
            throw new Error('Failed to get user profile');
        }

    } catch (error) {
        console.error('Get user error:', error);
        return {
            success: false,
            message: error.message || 'An error occurred while getting user profile'
        };
    }
}

// Verify if token is still valid
async function verifyToken() {
    const token = getToken();
    
    if (!token) {
        return false;
    }

    try {
        const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/verify-token`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                removeToken();
            }
            return false;
        }

        return true;

    } catch (error) {
        console.error('Token verification error:', error);
        return false;
    }
}

// Sign out function
function signOut() {
    removeToken();
    localStorage.removeItem('userData');
    // Redirect to sign in page
    window.location.href = '../logIn Pages/signin.html';
}

// Check if user is authenticated
function isAuthenticated() {
    return getToken() !== null;
}

// Display error message
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// Hide error message
function hideError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// Initialize Sign In Form (if exists on page)
function initSignInForm() {
    const signinForm = document.getElementById('signinForm');
    if (!signinForm) return;

    signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = document.getElementById('submitBtn');
        const errorDiv = document.getElementById('errorMessage');

        // Disable button and show loading
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';
        }
        if (errorDiv) errorDiv.style.display = 'none';

        // Attempt sign in
        const result = await signIn(email, password);

        // Re-enable button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }

        if (result.success) {
            // Show success message
            if (errorDiv) {
                errorDiv.textContent = 'Sign in successful! Redirecting...';
                errorDiv.style.backgroundColor = '#e8f5e9';
                errorDiv.style.color = '#388e3c';
                errorDiv.style.display = 'block';
            }
            
            // Redirect to customer pages after 1 second
            setTimeout(() => {
                window.location.href = '../customer Pages/index.html';
            }, 1000);
        } else {
            // Show error message
            if (errorDiv) {
                errorDiv.textContent = result.message;
                errorDiv.style.backgroundColor = '#ffebee';
                errorDiv.style.color = '#d32f2f';
                errorDiv.style.display = 'block';
            }
        }
    });
}

// Initialize Sign Up Form (if exists on page)
function initSignUpForm() {
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) return;

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const fullName = document.getElementById('fullName')?.value || 'User';
        const phone = document.getElementById('phone')?.value || null;
        const submitBtn = document.getElementById('submitBtn');
        const errorDiv = document.getElementById('errorMessage');

        // Disable button and show loading
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';
        }
        if (errorDiv) errorDiv.style.display = 'none';

        // Attempt sign up
        const result = await signUp(email, password, fullName, phone);

        // Re-enable button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
        }

        if (result.success) {
            // Show success message
            if (errorDiv) {
                errorDiv.textContent = 'Account created successfully! Redirecting...';
                errorDiv.style.backgroundColor = '#e8f5e9';
                errorDiv.style.color = '#388e3c';
                errorDiv.style.display = 'block';
            }
            
            // Redirect to customer pages after 1 second
            setTimeout(() => {
                window.location.href = '../customer Pages/index.html';
            }, 1000);
        } else {
            // Show error message
            if (errorDiv) {
                errorDiv.textContent = result.message;
                errorDiv.style.backgroundColor = '#ffebee';
                errorDiv.style.color = '#d32f2f';
                errorDiv.style.display = 'block';
            }
        }
    });
}

// Tab switching functionality (for pages with both Sign In and Sign Up)
function initTabSwitching() {
    const tabs = document.querySelectorAll('.tab-item');
    const tabPillBg = document.querySelector('.tab-pill-bg');
    
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Move pill background
            if (tabPillBg) {
                tabPillBg.style.left = index === 0 ? '0' : '50%';
            }
            
            // Switch between signin and signup (if on combined page)
            const tabText = tab.querySelector('.tab-text').textContent;
            if (tabText === 'Sign In') {
                window.location.href = 'signin.html';
            } else if (tabText === 'Sign Up') {
                window.location.href = 'signup.html';
            }
        });
    });
}

// Check if user is already logged in on page load
function checkAuthOnLoad() {
    if (isAuthenticated()) {
        const currentPage = window.location.pathname;
        // If on signin or signup page and already authenticated, redirect to customer pages
        if (currentPage.includes('signin') || currentPage.includes('signup')) {
            window.location.href = '../customer Pages/index.html';
        }
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    checkAuthOnLoad();
    initSignInForm();
    initSignUpForm();
    initTabSwitching();
});

// Export functions for use in other files (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        signIn,
        signUp,
        getCurrentUser,
        verifyToken,
        signOut,
        isAuthenticated,
        getToken,
        getUser,
        showError,
        hideError
    };
}