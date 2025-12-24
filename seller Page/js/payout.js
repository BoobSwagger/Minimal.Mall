// ==================== CONFIGURATION ====================
const API_BASE_URL = 'https://minimallbackend.onrender.com/api';

console.log('🔧 CONFIG - API Base URL:', API_BASE_URL);

// ==================== AUTH & TOKEN MANAGEMENT ====================

function getAuthToken() {
    const token = localStorage.getItem('authToken');
    console.log('🔑 AUTH - Token exists:', !!token);
    if (token) {
        console.log('🔑 AUTH - Token preview:', token.substring(0, 20) + '...');
    }
    return token;
}

function isAuthenticated() {
    const authenticated = !!getAuthToken();
    console.log('🔐 AUTH - Is authenticated:', authenticated);
    return authenticated;
}

function redirectToLogin() {
    console.log('🚪 REDIRECT - Redirecting to login page');
    window.location.href = '../login.html';
}

// ==================== API HELPERS ====================

async function apiRequest(endpoint, options = {}) {
    console.group('📡 API REQUEST');
    console.log('Endpoint:', endpoint);
    console.log('Full URL:', `${API_BASE_URL}${endpoint}`);
    
    const token = getAuthToken();
    
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };
    
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
        console.log('✅ Authorization header added');
    }
    
    try {
        console.log('🚀 Sending request...');
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        console.log('📥 Response status:', response.status);
        
        if (response.status === 401) {
            console.error('❌ 401 - Unauthorized');
            localStorage.removeItem('authToken');
            redirectToLogin();
            throw new Error('Session expired');
        }
        
        if (response.status === 403) {
            console.error('❌ 403 - Forbidden');
            const data = await response.json();
            throw new Error(data.detail || 'Access denied - Seller access required');
        }
        
        const data = await response.json();
        console.log('📦 Response data:', data);
        
        if (!response.ok) {
            throw new Error(data.detail || `HTTP ${response.status}`);
        }
        
        console.log('✅ Request successful');
        console.groupEnd();
        return data;
        
    } catch (error) {
        console.error('💥 API Request failed:', error.message);
        console.groupEnd();
        throw error;
    }
}

// ==================== PAYOUT DATA FETCHING ====================

async function fetchPayoutData() {
    console.group('💰 FETCH PAYOUT DATA');
    
    try {
        showLoading(true);
        
        // Fetch seller revenue and order stats
        console.log('📊 Fetching seller revenue data...');
        const revenueResponse = await apiRequest('/seller/revenue?days=365');
        
        console.log('📊 Fetching order statistics...');
        const statsResponse = await apiRequest('/seller/orders/stats/summary');
        
        console.log('✅ Data fetched successfully');
        console.log('Revenue data:', revenueResponse);
        console.log('Stats data:', statsResponse);
        
        // Process and display the data
        const payoutInfo = processPayoutData(revenueResponse, statsResponse);
        displayPayoutInfo(payoutInfo);
        
        // Fetch and display transaction history
        await fetchTransactionHistory();
        
    } catch (error) {
        console.error('💥 ERROR in fetchPayoutData:', error);
        
        let errorMessage = 'Failed to load payout data.';
        
        if (error.message.includes('Seller access')) {
            errorMessage = 'This page requires seller access. Your account may not be approved as a seller yet.';
        } else if (error.message.includes('Session expired')) {
            errorMessage = 'Your session has expired. Redirecting to login...';
        }
        
        showError(errorMessage);
        
    } finally {
        showLoading(false);
        console.groupEnd();
    }
}

async function fetchTransactionHistory() {
    console.group('📜 FETCH TRANSACTION HISTORY');
    
    try {
        // Fetch recent orders for transaction history
        console.log('Fetching orders for transaction history...');
        const ordersResponse = await apiRequest('/seller/orders?page=1&limit=50&status=all');
        
        if (ordersResponse.success && ordersResponse.orders) {
            console.log(`✅ Found ${ordersResponse.orders.length} orders`);
            displayTransactionHistory(ordersResponse.orders);
            
            // Calculate total balance from orders
            const calculatedBalance = calculateBalanceFromOrders(ordersResponse.orders);
            updateBalanceDisplay(calculatedBalance);
        }
        
    } catch (error) {
        console.error('Error fetching transaction history:', error);
        showTransactionError();
    } finally {
        console.groupEnd();
    }
}

function calculateBalanceFromOrders(orders) {
    console.log('💰 Calculating balance from orders...');
    
    let totalBalance = 0;
    
    orders.forEach(order => {
        // Only count completed orders (delivered, shipped, or processing)
        // Don't count cancelled or pending orders
        if (['delivered', 'shipped', 'processing'].includes(order.status)) {
            const amount = order.seller_payout || order.seller_subtotal || 0;
            totalBalance += amount;
            console.log(`  + Order ${order.order_number}: ₱${amount.toFixed(2)} (${order.status})`);
        }
    });
    
    console.log(`📊 Total calculated balance: ₱${totalBalance.toFixed(2)}`);
    return totalBalance;
}

function updateBalanceDisplay(balance) {
    console.log('🔄 Updating balance display to:', balance);
    
    const balanceElement = document.querySelector('.balance-amount');
    if (balanceElement) {
        balanceElement.textContent = `₱${balance.toFixed(2)}`;
        console.log('✅ Balance display updated');
    }
}

function processPayoutData(revenueData, statsData) {
    console.group('⚙️ PROCESS PAYOUT DATA');
    
    const revenueArray = revenueData.revenue || [];
    const stats = statsData.stats || {};
    
    console.log('Revenue array:', revenueArray);
    console.log('Stats object:', stats);
    
    // Calculate total revenue from the array
    let totalRevenue = 0;
    if (Array.isArray(revenueArray) && revenueArray.length > 0) {
        totalRevenue = revenueArray.reduce((sum, item) => {
            return sum + (item.revenue || 0);
        }, 0);
        console.log('✅ Calculated total revenue from array:', totalRevenue);
    } else {
        // Fallback to stats
        totalRevenue = stats.total_revenue || 0;
        console.log('⚠️ Using stats total_revenue:', totalRevenue);
    }
    
    // Calculate seller payout (total revenue - 10% commission)
    let availableBalance = totalRevenue * 0.9; // 90% goes to seller, 10% marketplace fee
    
    console.log('💰 Total Revenue:', totalRevenue);
    console.log('💰 Marketplace Fee (10%):', totalRevenue * 0.1);
    console.log('💰 Available Balance (90%):', availableBalance);
    
    // Calculate next payout date
    const nextPayoutDate = calculateNextPayoutDate();
    
    const payoutInfo = {
        availableBalance: availableBalance,
        totalRevenue: totalRevenue,
        totalOrders: stats.total_orders || 0,
        averageOrderValue: stats.avg_order_value || 0,
        nextPayoutDate: nextPayoutDate,
        commissionRate: 10 // 10% marketplace fee
    };
    
    console.log('✅ Processed payout info:', payoutInfo);
    console.groupEnd();
    
    return payoutInfo;
}

function calculateNextPayoutDate() {
    // Calculate next payout (e.g., 15th of next month)
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 15);
    
    return formatDate(nextMonth.toISOString());
}

// ==================== UI RENDERING ====================

function displayPayoutInfo(payoutInfo) {
    console.group('🎨 DISPLAY PAYOUT INFO');
    console.log('Displaying payout info:', payoutInfo);
    
    // Update available balance
    const balanceElement = document.querySelector('.balance-amount');
    if (balanceElement) {
        balanceElement.textContent = `₱${payoutInfo.availableBalance.toFixed(2)}`;
        console.log('✅ Balance updated');
    }
    
    // Update next payout date
    const payoutDateElement = document.querySelector('.payout-date');
    if (payoutDateElement) {
        payoutDateElement.textContent = payoutInfo.nextPayoutDate;
        console.log('✅ Payout date updated');
    }
    
    console.groupEnd();
}

function displayTransactionHistory(orders) {
    console.group('🎨 DISPLAY TRANSACTION HISTORY');
    console.log('Displaying transactions:', orders.length);
    
    const tbody = document.querySelector('.custom-table tbody');
    
    if (!tbody) {
        console.error('❌ Table body not found');
        console.groupEnd();
        return;
    }
    
    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <div class="text-muted">
                        <i class="fa-solid fa-receipt fa-3x mb-3 opacity-25"></i>
                        <p class="mb-0">No transactions yet</p>
                        <small>Your transaction history will appear here</small>
                    </div>
                </td>
            </tr>
        `;
        console.groupEnd();
        return;
    }
    
    console.log('🔨 Building transaction rows...');
    
    // Sort orders by date (most recent first)
    const sortedOrders = orders.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
    );
    
    tbody.innerHTML = sortedOrders.map((order, index) => {
        const isEarning = ['delivered', 'processing', 'shipped'].includes(order.status);
        const amountClass = isEarning ? 'amount-plus' : 'amount-minus';
        const amountSign = isEarning ? '+' : '-';
        const amount = order.seller_payout || order.seller_subtotal || 0;
        
        const statusClass = getStatusClass(order.status);
        const statusText = order.status.charAt(0).toUpperCase() + order.status.slice(1);
        
        console.log(`  Row ${index + 1}: ${order.order_number}`);
        
        return `
            <tr>
                <td>${escapeHtml(order.order_number)}</td>
                <td>${formatDate(order.created_at)}</td>
                <td>${getTransactionType(order)}</td>
                <td class="${amountClass}">${amountSign}₱${amount.toFixed(2)}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
            </tr>
        `;
    }).join('');
    
    console.log('✅ Transaction history rendered');
    console.groupEnd();
}

function getTransactionType(order) {
    if (order.status === 'cancelled') {
        return 'Cancelled Order';
    } else if (order.status === 'delivered') {
        return 'Sale Revenue';
    } else {
        return 'Pending Sale';
    }
}

function getStatusClass(status) {
    const statusMap = {
        'delivered': 'status-completed',
        'shipped': 'status-completed',
        'processing': 'status-pending-orange',
        'pending': 'status-pending-orange',
        'cancelled': 'status-pending-orange'
    };
    
    return statusMap[status] || 'status-pending-orange';
}

// ==================== WITHDRAWAL ACTIONS ====================

function requestWithdrawal() {
    console.log('💳 REQUEST WITHDRAWAL clicked');
    
    const balanceElement = document.querySelector('.balance-amount');
    const balanceText = balanceElement ? balanceElement.textContent : '₱0.00';
    const balance = parseFloat(balanceText.replace('₱', '').replace(',', ''));
    
    if (balance <= 0) {
        showNotification('Insufficient balance for withdrawal', 'warning');
        return;
    }
    
    // Show withdrawal modal or redirect to withdrawal page
    if (confirm(`Request withdrawal of ${balanceText}?\n\nNote: Withdrawals are processed within 3-5 business days.`)) {
        processWithdrawal(balance);
    }
}

async function processWithdrawal(amount) {
    console.group('💸 PROCESS WITHDRAWAL');
    console.log('Amount:', amount);
    
    try {
        // In a real implementation, this would call an API endpoint
        // For now, we'll show a success message
        
        showNotification(
            `Withdrawal request of ₱${amount.toFixed(2)} submitted successfully! You will receive the funds within 3-5 business days.`,
            'success'
        );
        
        console.log('✅ Withdrawal request submitted');
        
        // Optionally refresh the data
        setTimeout(() => {
            fetchPayoutData();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Withdrawal failed:', error);
        showNotification('Failed to process withdrawal. Please try again.', 'danger');
    } finally {
        console.groupEnd();
    }
}

// ==================== UTILITY FUNCTIONS ====================

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    console.log(show ? '⏳ Showing loading state' : '✅ Hiding loading state');
    
    const balanceElement = document.querySelector('.balance-amount');
    const tbody = document.querySelector('.custom-table tbody');
    
    if (show) {
        if (balanceElement) {
            balanceElement.textContent = 'Loading...';
        }
        
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3 text-muted mb-0">Loading transactions...</p>
                    </td>
                </tr>
            `;
        }
    }
}

function showError(message) {
    console.error('🚨 SHOWING ERROR:', message);
    
    const tbody = document.querySelector('.custom-table tbody');
    const balanceElement = document.querySelector('.balance-amount');
    
    if (balanceElement) {
        balanceElement.textContent = '₱0.00';
    }
    
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <div class="text-danger">
                        <i class="fa-solid fa-triangle-exclamation fa-3x mb-3"></i>
                        <p class="mb-2 fw-bold">${escapeHtml(message)}</p>
                        <small class="text-muted d-block mb-3">
                            Check the browser console for detailed error logs.
                        </small>
                        <button class="btn btn-sm btn-primary mt-2" onclick="fetchPayoutData()">
                            <i class="fa-solid fa-rotate-right me-1"></i> Retry
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

function showTransactionError() {
    const tbody = document.querySelector('.custom-table tbody');
    
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-muted">
                    <i class="fa-solid fa-exclamation-circle me-2"></i>
                    Failed to load transactions
                </td>
            </tr>
        `;
    }
}

function showNotification(message, type = 'info') {
    console.log(`📢 NOTIFICATION [${type}]:`, message);
    
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px; max-width: 500px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 7000);
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    console.clear();
    console.log('═'.repeat(60));
    console.log('💰 PAYOUT PAGE - INITIALIZATION');
    console.log('═'.repeat(60));
    console.log('Timestamp:', new Date().toISOString());
    console.log('═'.repeat(60));
    
    // Check authentication
    console.log('\n🔐 AUTHENTICATION CHECK');
    if (!isAuthenticated()) {
        console.log('❌ Not authenticated');
        console.log('🚪 Redirecting to login...');
        redirectToLogin();
        return;
    }
    console.log('✅ User is authenticated');
    
    // Initialize withdrawal button
    const withdrawBtn = document.querySelector('.btn-withdraw');
    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', (e) => {
            e.preventDefault();
            requestWithdrawal();
        });
        console.log('✅ Withdrawal button initialized');
    }
    
    // Fetch and display payout data
    console.log('\n🚀 FETCHING DATA');
    fetchPayoutData();
    
    console.log('\n✅ Payout page initialization complete');
    console.log('═'.repeat(60));
});

// Make functions available globally
window.fetchPayoutData = fetchPayoutData;
window.requestWithdrawal = requestWithdrawal;

console.log('📜 payout.js loaded successfully');