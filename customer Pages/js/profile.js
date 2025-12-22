// API Configuration
const API_BASE_URL = 'https://minimallbackend.onrender.com/api';

// DOM Elements
let profileData = null;
let dashboardData = null;

// ==================== UTILITY FUNCTIONS ====================

function getAuthToken() {
    // Match the token key used in auth.js
    return localStorage.getItem('authToken');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num;
}

function showLoading(show = true) {
    const transList = document.querySelector('.trans-list');
    if (show && transList) {
        transList.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    }
    document.body.style.cursor = show ? 'wait' : 'default';
}

function showError(message) {
    // Create a better notification
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function showSuccess(message) {
    // Create a better notification
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// ==================== MODAL FUNCTIONS ====================

function createSellerApplicationModal() {
    // Check if modal already exists
    if (document.getElementById('sellerApplicationModal')) {
        return;
    }

    const modalHTML = `
        <div class="modal fade" id="sellerApplicationModal" tabindex="-1" aria-labelledby="sellerApplicationModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="sellerApplicationModalLabel">Apply to Become a Seller</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="sellerApplicationForm">
                            <div class="mb-3">
                                <label for="storeName" class="form-label">Store Name <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="storeName" name="storeName" required minlength="3" placeholder="Enter your store name">
                                <div class="form-text">Minimum 3 characters</div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="businessType" class="form-label">Business Type <span class="text-danger">*</span></label>
                                <select class="form-select" id="businessType" name="businessType" required>
                                    <option value="" selected disabled>Select business type</option>
                                    <option value="individual">Individual</option>
                                    <option value="business">Business</option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label for="businessDescription" class="form-label">Business Description <span class="text-muted">(Optional)</span></label>
                                <textarea class="form-control" id="businessDescription" name="businessDescription" rows="3" placeholder="Tell us about your business..."></textarea>
                                <div class="form-text">Describe what you plan to sell</div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="submitSellerApplication">Submit Application</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showSellerApplicationModal() {
    console.log('Attempting to show seller application modal');
    console.log('Profile Data:', profileData);
    
    if (!profileData) {
        showError('Profile data not loaded. Please refresh the page.');
        return;
    }
    
    // Check if user is already a seller
    if (profileData.is_seller) {
        showError('You are already a seller!');
        return;
    }
    
    // Check if application is approved (should redirect to seller dashboard)
    if (profileData.seller_application_status === 'approved') {
        showSuccess('Your application has been approved! Redirecting to seller dashboard...');
        setTimeout(() => {
            window.location.href = '../seller Page/seller_dash.html';
        }, 1500);
        return;
    }
    
    // Check if application is pending
    if (profileData.seller_application_status === 'pending' || 
        profileData.has_pending_application) {
        showError('You already have a pending application. Please wait for approval.');
        return;
    }

    // Allow modal to open only if no application exists or application was rejected
    if (profileData.seller_application_status && 
        profileData.seller_application_status !== 'rejected') {
        showError('You already have an active application.');
        return;
    }

    createSellerApplicationModal();
    const modal = new bootstrap.Modal(document.getElementById('sellerApplicationModal'));
    modal.show();

    // Setup form submission
    const submitBtn = document.getElementById('submitSellerApplication');
    const form = document.getElementById('sellerApplicationForm');

    // Remove any existing event listeners
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

    newSubmitBtn.addEventListener('click', async function() {
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const storeName = document.getElementById('storeName').value.trim();
        const businessType = document.getElementById('businessType').value;
        const businessDescription = document.getElementById('businessDescription').value.trim();

        if (storeName.length < 3) {
            showError('Store name must be at least 3 characters long');
            return;
        }

        // Disable submit button to prevent double submission
        newSubmitBtn.disabled = true;
        newSubmitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Submitting...';

        try {
            await submitSellerApplication(storeName, businessType, businessDescription);
            modal.hide();
            
            // Reset form
            form.reset();
        } catch (error) {
            console.error('Error submitting application:', error);
        } finally {
            newSubmitBtn.disabled = false;
            newSubmitBtn.innerHTML = 'Submit Application';
        }
    });
}

async function submitSellerApplication(storeName, businessType, businessDescription) {
    const token = getAuthToken();
    
    if (!token) {
        window.location.href = '../logIn Pages/signin.html';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/seller/apply`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                store_name: storeName,
                business_type: businessType,
                business_description: businessDescription
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess('Your seller application has been submitted! We will review it shortly.');
            
            // Update the profile data to reflect pending status
            if (profileData) {
                profileData.has_pending_application = true;
                profileData.seller_application_status = 'pending';
            }
            
            // Refresh dashboard after 2 seconds
            setTimeout(() => {
                fetchProfileDashboard();
            }, 2000);
        } else {
            // Check if it's a duplicate application error
            if (response.status === 400 && 
                (result.detail?.includes('pending') || 
                 result.detail?.includes('already have') ||
                 result.detail?.includes('approved') ||
                 result.detail?.includes('application'))) {
                showError('You already have an active seller application.');
                
                // Update local data to prevent future attempts
                if (profileData) {
                    profileData.has_pending_application = true;
                }
                
                // Refresh to update UI
                setTimeout(() => {
                    fetchProfileDashboard();
                }, 1000);
            } else {
                showError(result.detail || 'Failed to submit application');
            }
            throw new Error(result.detail || 'Failed to submit application');
        }
    } catch (error) {
        console.error('Error applying to become seller:', error);
        if (!error.message.includes('pending') && 
            !error.message.includes('already have') && 
            !error.message.includes('approved')) {
            showError('Failed to submit application. Please try again.');
        }
        throw error;
    }
}

// ==================== API CALLS ====================

async function fetchProfileDashboard() {
    const token = getAuthToken();
    
    if (!token) {
        console.log('No token found, redirecting to signin');
        window.location.href = '../logIn Pages/signin.html';
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/profile/dashboard`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 401) {
            // Token expired or invalid
            console.log('Token invalid, clearing and redirecting');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = '../logIn Pages/signin.html';
            return;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to fetch profile data');
        }
        
        const data = await response.json();
        dashboardData = data;
        
        console.log('Dashboard data loaded:', data);
        
        // Store profile data globally FIRST before checking status
        profileData = data.profile;
        
        // Check seller application status if not already a seller
        if (!data.profile.is_seller) {
            await checkSellerApplicationStatus(token);
        }
        
        // Render all sections
        renderProfile(profileData);
        renderStatistics(data.statistics);
        renderTransactions(data.recent_transactions);
        
        showLoading(false);
    } catch (error) {
        console.error('Error fetching dashboard:', error);
        showError('Failed to load profile data. Please try again.');
        showLoading(false);
    }
}

async function checkSellerApplicationStatus(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/seller/application/status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const application = await response.json();
            console.log('Seller application status from API:', application);
            
            // Update profileData with the application status
            if (profileData) {
                profileData.seller_application_status = application.status;
                
                if (application.status === 'pending') {
                    profileData.has_pending_application = true;
                } else if (application.status === 'rejected') {
                    profileData.has_pending_application = false;
                } else if (application.status === 'approved') {
                    profileData.has_pending_application = false;
                    // If approved, user should be treated as a seller
                    profileData.is_seller = true;
                }
            }
        } else if (response.status === 404) {
            // No application found
            if (profileData) {
                profileData.seller_application_status = null;
                profileData.has_pending_application = false;
            }
        }
    } catch (error) {
        console.log('Could not fetch seller application status:', error);
    }
}

// ==================== RENDER FUNCTIONS ====================

function renderProfile(profile) {
    console.log('=== RENDERING PROFILE ===');
    console.log('Profile object:', profile);
    console.log('is_seller:', profile.is_seller);
    console.log('seller_application_status:', profile.seller_application_status);
    console.log('has_pending_application:', profile.has_pending_application);
    
    // Update profile header
    const userName = document.querySelector('.user-name');
    const userEmail = document.querySelector('.user-email');
    const userHandle = document.querySelector('.user-handle');
    const avatar = document.querySelector('.avatar img');
    const bioText = document.querySelector('.bio-text');
    
    if (userName) userName.textContent = profile.full_name || 'User';
    if (userEmail) userEmail.textContent = profile.email || '';
    if (userHandle) userHandle.textContent = profile.social_handle || '@user';
    
    if (avatar && profile.profile_image) {
        avatar.src = profile.profile_image;
        avatar.onerror = function() {
            this.src = 'https://via.placeholder.com/150';
        };
    }
    
    if (bioText) {
        bioText.textContent = profile.bio || 'No bio added yet. Update your profile to add a bio!';
    }
    
    // Show/hide seller stats link based on seller status
    const sellerStatsLink = document.querySelector('a[href*="seller"]');
    if (sellerStatsLink) {
        // Show link if user is seller OR if application is approved
        if (profile.is_seller || profile.seller_application_status === 'approved') {
            sellerStatsLink.style.display = 'flex';
        } else {
            sellerStatsLink.style.display = 'none';
        }
    }
    
    // Update Start Selling button
    const startSellingBtn = document.querySelector('.btn-selling');
    if (startSellingBtn) {
        console.log('=== UPDATING BUTTON ===');
        
        // Reset button
        startSellingBtn.disabled = false;
        startSellingBtn.className = 'btn btn-selling';
        startSellingBtn.style.cursor = 'pointer';
        
        // Priority 1: Check if user is seller OR application is approved
        if (profile.is_seller || profile.seller_application_status === 'approved') {
            console.log('User is seller or approved - showing dashboard button');
            startSellingBtn.textContent = 'Go to Seller Dashboard';
            startSellingBtn.className = 'btn btn-primary';
            startSellingBtn.onclick = (e) => {
                e.preventDefault();
                console.log('Redirecting to seller dashboard');
                window.location.href = '../seller Page/seller_dash.html';
            };
        } 
        // Priority 2: Check if application is pending
        else if (profile.seller_application_status === 'pending' || profile.has_pending_application) {
            console.log('Application is pending - disabling button');
            startSellingBtn.textContent = 'Application Pending';
            startSellingBtn.disabled = true;
            startSellingBtn.className = 'btn btn-secondary';
            startSellingBtn.style.cursor = 'not-allowed';
            startSellingBtn.onclick = (e) => {
                e.preventDefault();
                showError('Your seller application is currently under review.');
            };
        } 
        // Priority 3: Check if application was rejected
        else if (profile.seller_application_status === 'rejected') {
            console.log('Application was rejected - allowing reapply');
            startSellingBtn.textContent = 'Reapply as Seller';
            startSellingBtn.className = 'btn btn-warning';
            startSellingBtn.onclick = (e) => {
                e.preventDefault();
                showSellerApplicationModal();
            };
        } 
        // Priority 4: No application yet
        else {
            console.log('No application - showing start selling button');
            startSellingBtn.textContent = 'Start Selling';
            startSellingBtn.className = 'btn btn-selling';
            startSellingBtn.onclick = (e) => {
                e.preventDefault();
                showSellerApplicationModal();
            };
        }
        
        console.log('Button text:', startSellingBtn.textContent);
        console.log('Button disabled:', startSellingBtn.disabled);
        console.log('=== END BUTTON UPDATE ===');
    }
}

function renderStatistics(stats) {
    console.log('Rendering statistics:', stats);
    
    const statBoxes = document.querySelectorAll('.stat-box');
    
    if (statBoxes.length >= 4) {
        // Purchased Products
        const purchasedValue = statBoxes[0].querySelector('.stat-value');
        if (purchasedValue) {
            purchasedValue.textContent = stats.purchased_products || 0;
        }
        
        // Total Spent
        const spentValue = statBoxes[1].querySelector('.stat-value');
        const spentLabel = statBoxes[1].querySelector('.stat-label');
        if (spentValue) {
            spentValue.textContent = formatCurrency(stats.total_spent || 0);
        }
        if (spentLabel) {
            spentLabel.textContent = 'Total Spent';
        }
        
        // Coupons & Offers
        const couponsValue = statBoxes[2].querySelector('.stat-value');
        if (couponsValue) {
            couponsValue.textContent = stats.available_coupons || 0;
        }
        
        // Loyalty Points
        const pointsValue = statBoxes[3].querySelector('.stat-value');
        if (pointsValue) {
            pointsValue.textContent = stats.loyalty_points || 0;
        }
    }
}

function renderTransactions(transactions) {
    console.log('Rendering transactions:', transactions);
    
    const transList = document.querySelector('.trans-list');
    
    if (!transList) return;
    
    if (!transactions || transactions.length === 0) {
        transList.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="fa-solid fa-receipt fs-1 mb-3 d-block"></i>
                <p class="mb-0">No transactions yet</p>
                <small>Your purchase history will appear here</small>
            </div>
        `;
        return;
    }
    
    transList.innerHTML = transactions.map(transaction => `
        <div class="trans-item">
            <div>
                <div class="trans-id">${transaction.order_number || 'Order #' + transaction.order_id}</div>
                <div class="trans-date">Purchased on: ${formatDate(transaction.purchased_date)}</div>
            </div>
            <div class="trans-price">${formatCurrency(transaction.total_amount)}</div>
        </div>
    `).join('');
}

// ==================== LOGOUT FUNCTION ====================

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '../logIn Pages/signin.html';
    }
}

// ==================== EVENT LISTENERS ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Profile page loaded');
    
    // Check if user is logged in
    const token = getAuthToken();
    console.log('Token found:', !!token);
    
    if (!token) {
        console.log('No token, redirecting to signin');
        window.location.href = '../logIn Pages/signin.html';
        return;
    }
    
    // Fetch profile dashboard
    console.log('Fetching profile dashboard...');
    fetchProfileDashboard();
    
    // Setup logout button
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

// ==================== EXPORT FUNCTIONS (for other pages to use) ====================

window.ProfileAPI = {
    fetchProfileDashboard,
    showSellerApplicationModal,
    getAuthToken,
    formatCurrency,
    formatDate,
    showError,
    showSuccess
};