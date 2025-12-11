// cart.js - Shopping Cart Management

// Use existing API_BASE_URL if already defined, otherwise use production URL
const CART_API_BASE_URL = window.API_BASE_URL || 'https://minimallbackend.onrender.com/api';

// Cart API Functions
const CartAPI = {
    // Add item to cart
    async addToCart(productId, quantity = 1, variantId = null) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('Please login to add items to cart');
        }

        try {
            const response = await fetch(`${CART_API_BASE_URL}/cart/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    product_id: productId,
                    quantity: quantity,
                    variant_id: variantId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to add item to cart');
            }

            return data;
        } catch (error) {
            console.error('Error adding to cart:', error);
            throw error;
        }
    },

    // Get cart items
    async getCart() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('Please login to view cart');
        }

        try {
            const response = await fetch(`${CART_API_BASE_URL}/cart/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to get cart');
            }

            return data.cart;
        } catch (error) {
            console.error('Error getting cart:', error);
            throw error;
        }
    },

    // Get cart count
    async getCartCount() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            return 0;
        }

        try {
            const response = await fetch(`${CART_API_BASE_URL}/cart/count`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                return 0;
            }

            return data.count;
        } catch (error) {
            console.error('Error getting cart count:', error);
            return 0;
        }
    },

    // Update cart item quantity
    async updateCartItem(cartItemId, quantity) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('Please login to update cart');
        }

        try {
            const response = await fetch(`${CART_API_BASE_URL}/cart/items/${cartItemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    quantity: quantity
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to update cart item');
            }

            return data;
        } catch (error) {
            console.error('Error updating cart item:', error);
            throw error;
        }
    },

    // Remove item from cart
    async removeCartItem(cartItemId) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('Please login to remove items');
        }

        try {
            const response = await fetch(`${CART_API_BASE_URL}/cart/items/${cartItemId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to remove item');
            }

            return data;
        } catch (error) {
            console.error('Error removing cart item:', error);
            throw error;
        }
    },

    // Clear entire cart
    async clearCart() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('Please login to clear cart');
        }

        try {
            const response = await fetch(`${CART_API_BASE_URL}/cart/clear`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to clear cart');
            }

            return data;
        } catch (error) {
            console.error('Error clearing cart:', error);
            throw error;
        }
    }
};

// Cart UI Management
const CartUI = {
    // Update cart count badge in header
    async updateCartCount() {
        try {
            const count = await CartAPI.getCartCount();
            const cartCountElement = document.getElementById('cartCount');
            
            if (cartCountElement) {
                if (count > 0) {
                    cartCountElement.textContent = count;
                    cartCountElement.style.display = 'inline-block';
                } else {
                    cartCountElement.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error updating cart count:', error);
        }
    },

    // Add single product to cart
    async addProductToCart(productId, quantity = 1, variantId = null) {
        try {
            // Check if user is logged in
            const token = localStorage.getItem('authToken');
            if (!token) {
                showToast('Please login to add items to cart', 'warning');
                setTimeout(() => {
                    window.location.href = '../logIn Pages/login.html';
                }, 1500);
                return;
            }

            await CartAPI.addToCart(productId, quantity, variantId);
            await this.updateCartCount();
            showToast('Item added to cart!', 'success');
        } catch (error) {
            showToast(error.message || 'Failed to add item to cart', 'error');
        }
    },

    // Add multiple selected products to cart
    async addSelectedProductsToCart() {
        const selectedProducts = document.querySelectorAll('.product-card.selected');
        
        if (selectedProducts.length === 0) {
            showToast('Please select at least one product', 'warning');
            return;
        }

        // Check if user is logged in
        const token = localStorage.getItem('authToken');
        if (!token) {
            showToast('Please login to add items to cart', 'warning');
            setTimeout(() => {
                window.location.href = '../logIn Pages/login.html';
            }, 1500);
            return;
        }

        let successCount = 0;
        let failCount = 0;

        // Show loading state
        const addBtn = document.querySelector('.btn-add-all');
        const originalText = addBtn.innerHTML;
        addBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Adding...';
        addBtn.disabled = true;

        // Add each selected product
        for (const card of selectedProducts) {
            const productId = card.dataset.productId;
            
            try {
                await CartAPI.addToCart(parseInt(productId), 1);
                successCount++;
                
                // Uncheck and remove selected class
                const checkbox = card.querySelector('.card-checkbox');
                if (checkbox) {
                    checkbox.checked = false;
                }
                card.classList.remove('selected');
            } catch (error) {
                console.error(`Failed to add product ${productId}:`, error);
                failCount++;
            }
        }

        // Restore button state
        addBtn.innerHTML = originalText;
        addBtn.disabled = false;

        // Update cart count
        await this.updateCartCount();

        // Show result
        if (successCount > 0) {
            showToast(`${successCount} item(s) added to cart!`, 'success');
        }
        if (failCount > 0) {
            showToast(`Failed to add ${failCount} item(s)`, 'error');
        }
    }
};

// Initialize cart functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Update cart count on page load
    CartUI.updateCartCount();

    // Handle "Add Selected to Cart" button
    const addToCartBtn = document.querySelector('.btn-add-all');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            CartUI.addSelectedProductsToCart();
        });
    }

    // Handle individual product add to cart (if you have such buttons)
    document.addEventListener('click', (e) => {
        // Check if clicked element is an "add to cart" button for individual products
        if (e.target.closest('.btn-add-to-cart')) {
            e.preventDefault();
            const button = e.target.closest('.btn-add-to-cart');
            const productId = button.dataset.productId;
            const variantId = button.dataset.variantId || null;
            const quantity = parseInt(button.dataset.quantity) || 1;
            
            if (productId) {
                CartUI.addProductToCart(parseInt(productId), quantity, variantId ? parseInt(variantId) : null);
            }
        }
    });

    // Handle cart icon click - navigate to cart page
    const cartIconLink = document.getElementById('cartIconLink');
    if (cartIconLink) {
        cartIconLink.addEventListener('click', (e) => {
            e.preventDefault();
            const token = localStorage.getItem('authToken');
            if (!token) {
                showToast('Please login to view cart', 'warning');
                setTimeout(() => {
                    window.location.href = '../logIn Pages/login.html';
                }, 1500);
                return;
            }
            // Navigate to cart page
            window.location.href = './cart.html';
        });
    }
});

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
    window.CartAPI = CartAPI;
    window.CartUI = CartUI;
}