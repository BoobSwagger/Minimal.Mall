// cart-page.js - Shopping Cart Page Handler

// Load and display cart items
async function loadCartPage() {
    try {
        // Check if user is logged in
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = '../logIn Pages/login.html';
            return;
        }

        // Show loading state
        showLoadingState();

        // Fetch cart data
        const cart = await window.CartAPI.getCart();

        if (!cart || !cart.items || cart.items.length === 0) {
            showEmptyCart();
            return;
        }

        // Display cart items
        displayCartItems(cart.items);
        displayOrderSummary(cart);

    } catch (error) {
        console.error('Error loading cart:', error);
        showErrorState(error.message);
    }
}

// Show loading state
function showLoadingState() {
    const cartList = document.querySelector('.cart-list');
    if (cartList) {
        cartList.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading your cart...</p>
            </div>
        `;
    }
}

// Show empty cart
function showEmptyCart() {
    const cartList = document.querySelector('.cart-list');
    if (cartList) {
        cartList.innerHTML = `
            <div class="empty-cart-message text-center py-5">
                <i class="fa-solid fa-cart-arrow-down fs-1 text-muted mb-3"></i>
                <h3>Your cart is empty</h3>
                <p class="text-muted">Looks like you haven't added anything to your cart yet.</p>
                <a href="index.html" class="btn btn-primary mt-3">
                    <i class="fa-solid fa-shopping-bag me-2"></i>Continue Shopping
                </a>
            </div>
        `;
    }

    // Hide summary or show empty state
    const summaryCard = document.querySelector('.summary-card');
    if (summaryCard) {
        summaryCard.innerHTML = `
            <div class="text-center py-4">
                <i class="fa-solid fa-receipt fs-1 text-muted mb-3"></i>
                <p class="text-muted">No items to summarize</p>
            </div>
        `;
    }

    // Update cart title
    const cartTitle = document.querySelector('.cart-title h1');
    if (cartTitle) {
        cartTitle.textContent = 'Your Cart (0 items)';
    }
}

// Show error state
function showErrorState(message) {
    const cartList = document.querySelector('.cart-list');
    if (cartList) {
        cartList.innerHTML = `
            <div class="text-center py-5">
                <i class="fa-solid fa-exclamation-triangle fs-1 text-warning mb-3"></i>
                <h3>Oops! Something went wrong</h3>
                <p class="text-muted">${message}</p>
                <button class="btn btn-primary mt-3" onclick="loadCartPage()">
                    <i class="fa-solid fa-rotate-right me-2"></i>Try Again
                </button>
            </div>
        `;
    }
}

// Display cart items
function displayCartItems(items) {
    const cartList = document.querySelector('.cart-list');
    if (!cartList) return;

    cartList.innerHTML = items.map(item => {
        // Convert to numbers safely
        const priceAtTime = parseFloat(item.price_at_time) || 0;
        const quantity = parseInt(item.quantity) || 1;
        const itemTotal = (priceAtTime * quantity).toFixed(2);
        
        // Build variant info
        const variantInfo = item.variant_name && item.variant_value 
            ? `<br>${item.variant_name}: ${item.variant_value}` 
            : '';
        
        return `
            <article class="cart-item" data-cart-item-id="${item.cart_item_id}">
                <div class="item-checkbox">
                    <input type="checkbox" class="form-check-input item-select" checked>
                </div>
                <img src="${item.product_image || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=150&q=80'}" 
                     alt="${item.product_name}" 
                     class="item-image"
                     onerror="this.src='https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=150&q=80'">
                
                <div class="item-details">
                    <span class="item-name">${item.product_name}</span>
                    <span class="item-desc">SKU: ${item.product_id}${variantInfo}</span>
                    
                    <div class="quantity-control">
                        <span class="text-muted me-3 small fw-medium">Quantity</span>
                        <div class="stepper">
                            <button class="step-btn btn-decrease" data-cart-item-id="${item.cart_item_id}">-</button>
                            <span class="step-count">${quantity}</span>
                            <button class="step-btn btn-increase" data-cart-item-id="${item.cart_item_id}">+</button>
                        </div>
                    </div>
                </div>

                <div class="item-price-block">
                    <span class="item-price">₱${itemTotal}</span>
                    <span class="item-price-label">₱${priceAtTime.toFixed(2)} each</span>
                    <button class="item-remove" data-cart-item-id="${item.cart_item_id}">
                        <i class="fa-regular fa-trash-can"></i> Remove
                    </button>
                </div>
            </article>
        `;
    }).join('');

    // Add event listeners
    attachCartItemListeners();
}

// Display order summary
function displayOrderSummary(cart) {
    const summaryList = document.querySelector('.summary-list');
    const subtotalElement = document.querySelector('.breakdown-row:nth-child(1) span:last-child');
    const taxElement = document.querySelector('.breakdown-row:nth-child(2) span:last-child');
    const totalElement = document.querySelector('.breakdown-row.total .price');
    const checkoutBtn = document.querySelector('.btn-checkout');

    if (!cart || !cart.items || cart.items.length === 0) {
        if (checkoutBtn) checkoutBtn.disabled = true;
        return;
    }

    // Display summary list
    if (summaryList) {
        summaryList.innerHTML = cart.items.map(item => {
            const priceAtTime = parseFloat(item.price_at_time) || 0;
            const quantity = parseInt(item.quantity) || 1;
            
            return `
                <div class="summary-list-item">
                    <span>${item.product_name}</span>
                    <span>${quantity}x ₱${priceAtTime.toFixed(2)}</span>
                </div>
            `;
        }).join('');
    }

    // Calculate totals - ensure we're working with numbers
    const subtotal = parseFloat(cart.total) || 0;
    const tax = subtotal * 0.12; // 12% tax (adjust as needed)
    const shipping = 0; // Free shipping
    const total = subtotal + tax + shipping;

    // Update breakdown
    if (subtotalElement) subtotalElement.textContent = `₱${subtotal.toFixed(2)}`;
    if (taxElement) taxElement.textContent = `₱${tax.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `₱${total.toFixed(2)}`;

    // Enable checkout button
    if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.onclick = () => handleCheckout(total);
    }

    // Update cart title with item count
    const cartTitle = document.querySelector('.cart-title h1');
    if (cartTitle) {
        const itemCount = parseInt(cart.item_count) || 0;
        cartTitle.textContent = `Your Cart (${itemCount} ${itemCount === 1 ? 'item' : 'items'})`;
    }
}

// Attach event listeners to cart items
function attachCartItemListeners() {
    // Decrease quantity buttons
    document.querySelectorAll('.btn-decrease').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const cartItemId = parseInt(btn.dataset.cartItemId);
            const cartItem = btn.closest('.cart-item');
            const quantityElement = cartItem.querySelector('.step-count');
            const currentQuantity = parseInt(quantityElement.textContent);

            if (currentQuantity > 1) {
                await updateItemQuantity(cartItemId, currentQuantity - 1);
            } else {
                // If quantity is 1, ask to remove instead
                if (confirm('Remove this item from cart?')) {
                    await removeItem(cartItemId);
                }
            }
        });
    });

    // Increase quantity buttons
    document.querySelectorAll('.btn-increase').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const cartItemId = parseInt(btn.dataset.cartItemId);
            const cartItem = btn.closest('.cart-item');
            const quantityElement = cartItem.querySelector('.step-count');
            const currentQuantity = parseInt(quantityElement.textContent);

            await updateItemQuantity(cartItemId, currentQuantity + 1);
        });
    });

    // Remove buttons
    document.querySelectorAll('.item-remove').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const cartItemId = parseInt(btn.dataset.cartItemId);
            
            if (confirm('Are you sure you want to remove this item?')) {
                await removeItem(cartItemId);
            }
        });
    });
}

// Update item quantity
async function updateItemQuantity(cartItemId, newQuantity) {
    let cartItem;
    try {
        // Show loading on the specific item
        cartItem = document.querySelector(`[data-cart-item-id="${cartItemId}"]`);
        if (cartItem) {
            cartItem.style.opacity = '0.5';
            cartItem.style.pointerEvents = 'none';
        }

        await window.CartAPI.updateCartItem(cartItemId, newQuantity);
        
        // Reload cart
        await loadCartPage();
        
        showToast('Cart updated successfully', 'success');
    } catch (error) {
        console.error('Error updating quantity:', error);
        showToast(error.message || 'Failed to update quantity', 'error');
        
        // Restore item state
        if (cartItem) {
            cartItem.style.opacity = '1';
            cartItem.style.pointerEvents = 'auto';
        }
    }
}

// Remove item from cart
async function removeItem(cartItemId) {
    let cartItem;
    try {
        cartItem = document.querySelector(`[data-cart-item-id="${cartItemId}"]`);
        if (cartItem) {
            cartItem.style.opacity = '0.5';
        }

        await window.CartAPI.removeCartItem(cartItemId);
        
        // Reload cart
        await loadCartPage();
        
        showToast('Item removed from cart', 'success');
    } catch (error) {
        console.error('Error removing item:', error);
        showToast(error.message || 'Failed to remove item', 'error');
        
        if (cartItem) {
            cartItem.style.opacity = '1';
        }
    }
}

// Clear entire cart
async function clearCart() {
    if (!confirm('Are you sure you want to clear your entire cart?')) {
        return;
    }

    try {
        showLoadingState();
        await window.CartAPI.clearCart();
        showEmptyCart();
        showToast('Cart cleared successfully', 'success');
        
        // Update header cart count
        if (typeof window.CartUI !== 'undefined') {
            await window.CartUI.updateCartCount();
        }
    } catch (error) {
        console.error('Error clearing cart:', error);
        showToast(error.message || 'Failed to clear cart', 'error');
        await loadCartPage();
    }
}

// Handle checkout
function handleCheckout(total) {
    // Store checkout data
    sessionStorage.setItem('checkoutTotal', total.toFixed(2));
    
    // Redirect to checkout page
    window.location.href = '../trasaction Pages/checkout.html';
}

// Show toast notification
function showToast(message, type = 'success') {
    // Create toast element if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '11';
        document.body.appendChild(toastContainer);
    }

    const toastId = 'toast-' + Date.now();
    const iconClass = type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-circle' : 'times-circle';
    const bgClass = type === 'success' ? 'bg-success' : type === 'warning' ? 'bg-warning' : 'bg-danger';

    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fa-solid fa-${iconClass} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();

    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// Initialize cart page
document.addEventListener('DOMContentLoaded', () => {
    // Load cart data
    loadCartPage();

    // Clear cart button
    const clearBtn = document.querySelector('.btn-clear');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCart);
    }

    // Update user info in header
    const user = getUser();
    if (user) {
        const userIcon = document.querySelector('.fa-user');
        if (userIcon && userIcon.parentElement) {
            userIcon.parentElement.innerHTML = `
                <i class="fa-solid fa-user fs-5"></i>
                <small class="d-none d-lg-inline ms-1">${user.full_name.split(' ')[0]}</small>
            `;
        }
    }
});