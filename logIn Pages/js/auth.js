// auth.js - Authentication handler with OTP support and Admin logic

const AUTH_API_BASE_URL = 'https://minimallbackend.onrender.com';

// Store token in sessionStorage (more secure for admin)
function saveToken(token) {
    localStorage.setItem('authToken', token);
}

// Get token from sessionStorage
function getToken() {
    return localStorage.getItem('authToken');
}
// Remove token from sessionStorage
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

// Get user role
function getUserRole() {
    const user = getUser();
    return user ? user.role : null;
}

// Check if user is admin
function isAdmin() {
    return getUserRole() === 'admin';
}

// Check if user is seller
function isSeller() {
    return getUserRole() === 'seller';
}

// Check if user is customer
function isCustomer() {
    return getUserRole() === 'customer';
}

// Store temporary signup data
function saveTempSignupData(data) {
    sessionStorage.setItem('tempSignupData', JSON.stringify(data));
    console.log('Saved temp signup data:', data);
}

function getTempSignupData() {
    const data = sessionStorage.getItem('tempSignupData');
    console.log('Retrieved temp signup data:', data);
    return data ? JSON.parse(data) : null;
}

function clearTempSignupData() {
    localStorage.removeItem('tempSignupData');
    console.log('Cleared temp signup data');
}

// Helper function to extract error messages from API responses
function extractErrorMessage(data) {
    if (!data.detail) {
        return data.message || 'An error occurred';
    }

    if (typeof data.detail === 'string') {
        return data.detail;
    }

    if (Array.isArray(data.detail)) {
        const errorMessages = data.detail.map(err => {
            if (err.msg) return err.msg;
            if (err.message) return err.message;
            if (err.loc && err.msg) {
                const field = err.loc[err.loc.length - 1];
                return `${field}: ${err.msg}`;
            }
            return JSON.stringify(err);
        }).join('; ');
        return errorMessages;
    }

    return JSON.stringify(data.detail);
}

// Send OTP for registration
async function sendRegistrationOTP(email, fullName) {
    console.log('Sending registration OTP to:', email);
    try {
        const requestBody = {
            email: email,
            full_name: fullName,
            purpose: 'registration'
        };
        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/send-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('OTP Response:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            throw new Error(extractErrorMessage(data));
        }

        return {
            success: data.success !== false,
            message: data.message || 'OTP sent successfully'
        };

    } catch (error) {
        console.error('Send OTP error:', error);
        return {
            success: false,
            message: error.message || 'Failed to send OTP. Please check your connection.'
        };
    }
}

// Send OTP for login
async function sendLoginOTP(email) {
    console.log('Sending login OTP to:', email);
    try {
        const requestBody = {
            email: email,
            full_name: 'User',
            purpose: 'login'
        };
        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/send-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Login OTP Response:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            throw new Error(extractErrorMessage(data));
        }

        return {
            success: data.success !== false,
            message: data.message || 'OTP sent successfully'
        };

    } catch (error) {
        console.error('Send login OTP error:', error);
        return {
            success: false,
            message: error.message || 'Failed to send OTP. Please check your connection.'
        };
    }
}

// Verify OTP
async function verifyOTP(email, otpCode, purpose = 'registration') {
    console.log('Verifying OTP for:', email, 'Purpose:', purpose);
    try {
        const requestBody = {
            email: email,
            otp_code: otpCode,
            purpose: purpose
        };
        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Verify OTP Response:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            throw new Error(extractErrorMessage(data));
        }

        return {
            success: data.success !== false,
            message: data.message || 'OTP verified successfully'
        };

    } catch (error) {
        console.error('Verify OTP error:', error);
        return {
            success: false,
            message: error.message || 'OTP verification failed'
        };
    }
}

// Complete Sign Up with OTP
async function signUp(email, password, fullName, phone = null, otpCode) {
    console.log('Completing signup for:', email);
    try {
        const requestBody = {
            email: email,
            password: password,
            full_name: fullName,
            phone: phone,
            role: 'customer',
            otp_code: otpCode
        };
        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Signup Response:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            throw new Error(extractErrorMessage(data));
        }

        if (data.token) {
            saveToken(data.token);
            if (data.user) {
                saveUser(data.user);
            }
            clearTempSignupData();
            return {
                success: true,
                message: data.message || 'Account created successfully',
                user_id: data.user_id,
                user: data.user
            };
        } else {
            throw new Error(data.message || 'Sign up failed - no token received');
        }

    } catch (error) {
        console.error('Sign up error:', error);
        return {
            success: false,
            message: error.message || 'An error occurred during sign up'
        };
    }
}

// Sign In with password (supports all roles)
async function signIn(email, password) {
    console.log('Signing in:', email);
    try {
        const requestBody = {
            email: email,
            password: password
        };
        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Signin Response:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            throw new Error(extractErrorMessage(data));
        }

        if (data.token) {
            saveToken(data.token);
            if (data.user) {
                saveUser(data.user);
            }
            return {
                success: true,
                message: data.message || 'Signed in successfully',
                user: data.user
            };
        } else {
            throw new Error(data.message || 'Sign in failed - no token received');
        }

    } catch (error) {
        console.error('Sign in error:', error);
        return {
            success: false,
            message: error.message || 'An error occurred during sign in'
        };
    }
}

// Sign In with OTP
async function signInWithOTP(email, otpCode) {
    console.log('=== SIGN IN WITH OTP START ===');
    console.log('Email:', email);
    console.log('OTP Code:', otpCode);
    
    try {
        const params = new URLSearchParams({
            email: email,
            otp_code: otpCode.toString()
        });
        
        const url = `${AUTH_API_BASE_URL}/api/auth/signin-with-otp?${params.toString()}`;
        console.log('Request URL:', url);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Signin with OTP Response:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            throw new Error(extractErrorMessage(data));
        }

        if (data.token) {
            console.log('Token received successfully');
            saveToken(data.token);
            if (data.user) {
                saveUser(data.user);
                console.log('User data saved:', data.user);
            }
            return {
                success: true,
                message: data.message || 'Signed in successfully',
                user: data.user
            };
        } else {
            throw new Error(data.message || 'Sign in failed - no token received');
        }

    } catch (error) {
        console.error('=== SIGN IN WITH OTP ERROR ===');
        console.error('Error message:', error.message);
        return {
            success: false,
            message: error.message || 'An error occurred during sign in'
        };
    } finally {
        console.log('=== SIGN IN WITH OTP END ===');
    }
}

// Admin Sign In (password-based authentication)
async function adminSignIn(email, password) {
    console.log('Admin signing in:', email);
    try {
        const result = await signIn(email, password);
        
        if (result.success && result.user) {
            // Verify user is actually an admin
            if (result.user.role !== 'admin') {
                // Clear the token if not admin
                removeToken();
                sessionStorage.removeItem('userData');
                return {
                    success: false,
                    message: 'Access denied. Admin privileges required.'
                };
            }
        }
        
        return result;
    } catch (error) {
        console.error('Admin sign in error:', error);
        return {
            success: false,
            message: error.message || 'An error occurred during admin sign in'
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
                removeToken();
            }
            throw new Error(extractErrorMessage(data));
        }

        if (data.user) {
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

// Get role-based redirect URL
function getRoleBasedRedirectURL(role) {
    switch(role) {
        case 'admin':
            return '../admin/admin.html';
        case 'seller':
            return '../seller Pages/dashboard.html';
        case 'customer':
        default:
            return '../customer Pages/index.html';
    }
}

// Redirect based on user role
function redirectByRole(user) {
    if (!user || !user.role) {
        console.error('Invalid user data for redirect');
        return;
    }
    
    const redirectUrl = getRoleBasedRedirectURL(user.role);
    console.log(`Redirecting ${user.role} to: ${redirectUrl}`);
    window.location.href = redirectUrl;
}

// Sign out function
function signOut() {
    removeToken();
    localStorage.removeItem('userData');
    clearTempSignupData();
    
    // Determine where to redirect based on current page
    const currentPath = window.location.pathname;
    if (currentPath.includes('admin')) {
        window.location.href = '../logIn Pages/admin-login.html';
    } else {
        window.location.href = '../logIn Pages/signin.html';
    }
}

// Check if user is authenticated
function isAuthenticated() {
    return getToken() !== null;
}

// Require authentication (redirect to login if not authenticated)
function requireAuth(requiredRole = null) {
    if (!isAuthenticated()) {
        console.log('Not authenticated, redirecting to login');
        window.location.href = '../logIn Pages/signin.html';
        return false;
    }
    
    if (requiredRole) {
        const user = getUser();
        if (!user || user.role !== requiredRole) {
            console.log(`Access denied. Required role: ${requiredRole}, User role: ${user?.role}`);
            signOut();
            return false;
        }
    }
    
    return true;
}

// Require admin authentication
function requireAdmin() {
    if (!isAuthenticated()) {
        console.log('Not authenticated, redirecting to admin login');
        window.location.href = '../logIn Pages/admin-login.html';
        return false;
    }
    
    const user = getUser();
    if (!user || user.role !== 'admin') {
        console.log('Access denied. Admin privileges required.');
        alert('Access denied. Admin privileges required.');
        signOut();
        return false;
    }
    
    return true;
}

// Display message
function showMessage(elementId, message, isError = false) {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.style.backgroundColor = isError ? '#ffebee' : '#e8f5e9';
        messageElement.style.color = isError ? '#d32f2f' : '#388e3c';
        messageElement.style.display = 'block';
        messageElement.style.padding = '12px';
        messageElement.style.borderRadius = '8px';
        messageElement.style.marginBottom = '20px';
    }
}

// Hide message
function hideMessage(elementId) {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.style.display = 'none';
    }
}

// Initialize Admin Login Form
function initAdminLoginForm() {
    const loginForm = document.getElementById('adminLoginForm');
    if (!loginForm) {
        console.log('Admin login form not found');
        return;
    }

    console.log('Initializing admin login form');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Admin login form submitted');

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = document.getElementById('submitBtn');

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing In...';
        }
        hideMessage('errorMessage');

        const result = await adminSignIn(email, password);

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }

        if (result.success) {
            console.log('Admin sign in successful!');
            showMessage('errorMessage', 'Admin sign in successful! Redirecting...', false);
            setTimeout(() => {
                window.location.href = '../admin/admin.html';
            }, 1000);
        } else {
            console.error('Admin sign in failed:', result.message);
            showMessage('errorMessage', result.message, true);
        }
    });
}

// Initialize Sign In Form
function initSignInForm() {
    const signinForm = document.getElementById('signinForm');
    if (!signinForm) {
        console.log('Sign in form not found');
        return;
    }

    console.log('Initializing sign in form');
    let otpSent = false;

    signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Sign in form submitted');

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = document.getElementById('submitBtn');

        if (!otpSent) {
            // Step 1: Send OTP
            console.log('Attempting to send OTP for sign in with email:', email);

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending OTP...';
            }
            hideMessage('errorMessage');

            const result = await sendLoginOTP(email);

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            }

            if (result.success) {
                console.log('OTP sent successfully for sign in');
                otpSent = true;
                showOTPModal('signin');
                showMessage('errorMessage', 'OTP sent to your email! Please check your inbox.', false);
            } else {
                showMessage('errorMessage', result.message, true);
            }
        }
    });

    // Handle OTP form submission for sign in
    const otpForm = document.getElementById('otpForm');
    if (otpForm) {
        otpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('=== OTP FORM SUBMITTED FOR SIGN IN ===');

            const email = document.getElementById('email').value;
            const otpCode = document.getElementById('otpCode')?.value;
            
            if (!otpCode || otpCode.length !== 6) {
                showMessage('errorMessage', 'Please enter a valid 6-digit OTP', true);
                return;
            }

            const submitBtn = otpForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Verifying...';
            }
            hideMessage('errorMessage');

            const result = await signInWithOTP(email, otpCode);

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Verify & Sign In';
            }

            if (result.success) {
                console.log('Sign in with OTP successful!');
                showMessage('errorMessage', 'Sign in successful! Redirecting...', false);
                closeOTPModal();
                setTimeout(() => {
                    redirectByRole(result.user);
                }, 1000);
            } else {
                console.error('Sign in with OTP failed:', result.message);
                showMessage('errorMessage', result.message, true);
            }
        });
    }
}

// Initialize Sign Up Form with OTP
function initSignUpForm() {
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) {
        console.log('Sign up form not found');
        return;
    }

    console.log('Initializing sign up form');
    let otpSent = false;

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Sign up form submitted. OTP sent:', otpSent);

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const fullName = document.getElementById('fullName')?.value || 'User';
        const phone = document.getElementById('phone')?.value || null;
        const submitBtn = document.getElementById('submitBtn');

        if (!otpSent) {
            // Step 1: Send OTP
            console.log('Step 1: Sending OTP');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending OTP...';
            }
            hideMessage('errorMessage');

            const result = await sendRegistrationOTP(email, fullName);

            if (submitBtn) {
                submitBtn.disabled = false;
            }

            if (result.success) {
                console.log('OTP sent successfully');
                otpSent = true;
                saveTempSignupData({ email, password, fullName, phone });
                showOTPModal('signup');
                showMessage('errorMessage', 'OTP sent to your email! Please check your inbox (including spam folder).', false);
                if (submitBtn) {
                    submitBtn.textContent = 'Send OTP';
                }
            } else {
                console.error('Failed to send OTP:', result.message);
                showMessage('errorMessage', result.message, true);
                if (submitBtn) {
                    submitBtn.textContent = 'Send OTP';
                }
            }
        }
    });

    // Handle OTP form submission for sign up
    const otpForm = document.getElementById('otpForm');
    if (otpForm) {
        otpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('OTP form submitted for sign up');

            const otpCode = document.getElementById('otpCode')?.value;
            
            if (!otpCode || otpCode.length !== 6) {
                showMessage('errorMessage', 'Please enter a valid 6-digit OTP', true);
                return;
            }

            const submitBtn = otpForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Verifying & Creating Account...';
            }
            hideMessage('errorMessage');

            const savedData = getTempSignupData();
            
            if (!savedData) {
                showMessage('errorMessage', 'Session expired. Please start over.', true);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Verify & Sign Up';
                }
                closeOTPModal();
                return;
            }

            const result = await signUp(
                savedData.email, 
                savedData.password, 
                savedData.fullName, 
                savedData.phone, 
                otpCode
            );

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Verify & Sign Up';
            }

            if (result.success) {
                console.log('Sign up successful!');
                showMessage('errorMessage', 'Account created successfully! Redirecting...', false);
                closeOTPModal();
                setTimeout(() => {
                    redirectByRole(result.user);
                }, 1500);
            } else {
                console.error('Sign up failed:', result.message);
                showMessage('errorMessage', result.message, true);
            }
        });
    }
}

// Show OTP Modal
function showOTPModal(formType) {
    const modal = document.getElementById('otpModal');
    const otpInput = document.getElementById('otpCode');
    
    if (modal) {
        modal.style.display = 'flex';
        if (otpInput) {
            otpInput.value = '';
            setTimeout(() => otpInput.focus(), 100);
        }
    }
}

// Close OTP Modal
function closeOTPModal() {
    const modal = document.getElementById('otpModal');
    const otpInput = document.getElementById('otpCode');
    
    if (modal) {
        modal.style.display = 'none';
    }
    
    if (otpInput) {
        otpInput.value = '';
    }
}

// Check if user is already logged in on page load
function checkAuthOnLoad() {
    if (isAuthenticated()) {
        const currentPage = window.location.pathname;
        const user = getUser();
        
        // If on login/signup pages and already authenticated, redirect to appropriate dashboard
        if (currentPage.includes('signin') || currentPage.includes('signup') || currentPage.includes('admin-login')) {
            console.log('User already authenticated, redirecting...');
            redirectByRole(user);
        }
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing auth system');
    checkAuthOnLoad();
    
    // Initialize appropriate form based on page
    initSignInForm();
    initSignUpForm();
    initAdminLoginForm();

    // Setup modal close handlers
    const closeModalBtn = document.getElementById('closeOtpModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeOTPModal);
    }

    // Close modal when clicking outside of it
    const modal = document.getElementById('otpModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeOTPModal();
            }
        });
    }

    // Setup resend OTP button in modal
    const resendBtn = document.getElementById('resendOTP');
    if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
            console.log('Resend OTP clicked from modal');
            const email = document.getElementById('email')?.value;

            if (!email) {
                const savedData = getTempSignupData();
                if (!savedData) {
                    showMessage('errorMessage', 'Session expired. Please refresh and start over.', true);
                    return;
                }
                
                resendBtn.disabled = true;
                resendBtn.innerHTML = 'Sending...';

                const result = await sendRegistrationOTP(savedData.email, savedData.fullName);
                
                if (result.success) {
                    showMessage('errorMessage', 'New OTP sent to your email!', false);
                } else {
                    showMessage('errorMessage', result.message, true);
                }

                resendBtn.disabled = false;
                resendBtn.innerHTML = "Didn't receive code? <strong>Resend</strong>";
            } else {
                resendBtn.disabled = true;
                resendBtn.innerHTML = 'Sending...';

                const result = await sendLoginOTP(email);
                
                if (result.success) {
                    showMessage('errorMessage', 'New OTP sent to your email!', false);
                } else {
                    showMessage('errorMessage', result.message, true);
                }

                resendBtn.disabled = false;
                resendBtn.innerHTML = "Didn't receive code? <strong>Resend</strong>";
            }
        });
    }
});

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        signIn,
        signUp,
        signInWithOTP,
        adminSignIn,
        sendRegistrationOTP,
        sendLoginOTP,
        verifyOTP,
        getCurrentUser,
        verifyToken,
        signOut,
        isAuthenticated,
        requireAuth,
        requireAdmin,
        isAdmin,
        isSeller,
        isCustomer,
        getUserRole,
        getToken,
        getUser,
        redirectByRole,
        showMessage,
        hideMessage
    };
}