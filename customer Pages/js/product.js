// products.js - Product API handler

const API_BASE_URL = 'https://minimallbackend.onrender.com';

// Get all products with filters
async function getProducts(options = {}) {
    try {
        const params = new URLSearchParams();
        
        if (options.limit) params.append('limit', options.limit);
        if (options.offset) params.append('offset', options.offset);
        if (options.category_id) params.append('category_id', options.category_id);
        if (options.is_featured !== undefined) params.append('is_featured', options.is_featured);
        if (options.search) params.append('search', options.search);
        
        const response = await fetch(`${API_BASE_URL}/api/products?${params.toString()}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Failed to fetch products');
        }
        
        return data;
        
    } catch (error) {
        console.error('Error fetching products:', error);
        return {
            success: false,
            message: error.message,
            products: [],
            total: 0
        };
    }
}

// Get featured products
async function getFeaturedProducts(limit = 8) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products/featured?limit=${limit}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Failed to fetch featured products');
        }
        
        return data;
        
    } catch (error) {
        console.error('Error fetching featured products:', error);
        return {
            success: false,
            message: error.message,
            products: [],
            total: 0
        };
    }
}

// Get single product by ID
async function getProductById(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products/id/${productId}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Product not found');
        }
        
        return data;
        
    } catch (error) {
        console.error('Error fetching product:', error);
        return {
            success: false,
            message: error.message,
            product: null
        };
    }
}

// Get single product by slug
async function getProductBySlug(slug) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products/${slug}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Product not found');
        }
        
        return data;
        
    } catch (error) {
        console.error('Error fetching product:', error);
        return {
            success: false,
            message: error.message,
            product: null
        };
    }
}

// Search products
async function searchProducts(searchTerm, limit = 20) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products/search?q=${encodeURIComponent(searchTerm)}&limit=${limit}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Search failed');
        }
        
        return data;
        
    } catch (error) {
        console.error('Error searching products:', error);
        return {
            success: false,
            message: error.message,
            products: [],
            total: 0
        };
    }
}

// Get products by tag
async function getProductsByTag(tagName, limit = 20) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products/tag/${encodeURIComponent(tagName)}?limit=${limit}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Failed to fetch products by tag');
        }
        
        return data;
        
    } catch (error) {
        console.error('Error fetching products by tag:', error);
        return {
            success: false,
            message: error.message,
            products: []
        };
    }
}

// Get all categories
async function getCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/categories`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Failed to fetch categories');
        }
        
        return data;
        
    } catch (error) {
        console.error('Error fetching categories:', error);
        return {
            success: false,
            message: error.message,
            categories: []
        };
    }
}

// Get category by slug
async function getCategoryBySlug(slug) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/categories/${slug}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Category not found');
        }
        
        return data;
        
    } catch (error) {
        console.error('Error fetching category:', error);
        return {
            success: false,
            message: error.message,
            category: null
        };
    }
}

// Render product card
function renderProductCard(product, isSelected = false, isFavorite = false) {
    const price = parseFloat(product.price).toFixed(2);
    const comparePrice = product.compare_at_price ? parseFloat(product.compare_at_price).toFixed(2) : null;
    const discount = comparePrice ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;
    
    // Determine image URL with fallbacks
    let imageUrl = product.primary_image;
    if (!imageUrl && product.images && product.images.length > 0) {
        imageUrl = product.images[0].image_url;
    }
    if (!imageUrl) {
        imageUrl = 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=400&q=80';
    }
    
    return `
        <div class="col-12 col-sm-6 col-lg-3">
            <div class="product-card" data-product-id="${product.id}">
                ${discount > 0 ? `<span class="badge bg-danger position-absolute top-0 start-0 m-2">${discount}% OFF</span>` : ''}
                
                <div class="prod-img-box">
                    <img src="${imageUrl}" alt="${product.name}" onerror="this.src='https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=400&q=80'">
                </div>
                <div class="row">
                    <div class="col-7">
                        <h4 class="prod-title">${product.name}</h4>
                        <span class="prod-cat">${product.category_name}</span>
                    </div>
                    <div class="col-5 text-end">
                        <div class="prod-price">₱${price}</div>
                        ${comparePrice ? `<small class="text-muted text-decoration-line-through">₱${comparePrice}</small>` : ''}
                        <i class="fa-${isFavorite ? 'solid' : 'regular'} fa-heart heart-icon mt-2 ${!isFavorite ? 'text-muted' : ''}" style="cursor: pointer;"></i>
                    </div>
                </div>
                
                <!-- Add to Cart Button at Bottom (Shopee style) -->
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-outline-primary flex-grow-1 cart-icon-btn" title="Add to cart">
                        <i class="fa-solid fa-cart-plus me-2"></i>Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Render category card
function renderCategoryCard(category) {
    // Use a default image if none provided
    const defaultImages = {
        'shoes': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80',
        'outerwear': 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80',
        'fitness-wear': 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=600&q=80'
    };
    
    const imageUrl = category.image_url || defaultImages[category.slug] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80';
    
    return `
        <div class="col-md-4">
            <div class="category-card" data-category-id="${category.id}" data-category-slug="${category.slug}">
                <img src="${imageUrl}" class="cat-img" alt="${category.name}" onerror="this.src='https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80'">
                <div class="cat-overlay">
                    <h3 class="cat-name">${category.name}</h3>
                    <span class="cat-count">${category.product_count || 0} Products</span>
                </div>
            </div>
        </div>
    `;
}

// Load and display products on page
async function loadProducts(containerId = 'productContainer', options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Show loading
    container.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>';
    
    const result = await getProducts(options);
    
    if (result.success && result.products.length > 0) {
        container.innerHTML = result.products.map(product => renderProductCard(product)).join('');
        
        // Add click handlers
        addProductClickHandlers();
    } else {
        container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">No products found</p></div>';
    }
}

// Load and display featured products
async function loadFeaturedProducts(containerId = 'productContainer', limit = 8) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Show loading
    container.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-3 text-muted">Loading products...</p></div>';
    
    try {
        const result = await getFeaturedProducts(limit);
        
        console.log('Featured products result:', result); // Debug log
        
        if (result.success && result.products.length > 0) {
            container.innerHTML = result.products.map(product => renderProductCard(product)).join('');
            
            // Add click handlers
            addProductClickHandlers();
        } else {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fa-solid fa-box-open fs-1 text-muted mb-3"></i>
                    <p class="text-muted">Unable to load products. Please check your backend connection.</p>
                    <button class="btn btn-primary mt-3" onclick="loadFeaturedProducts('productContainer', 8)">
                        <i class="fa-solid fa-rotate-right me-2"></i>Retry
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error in loadFeaturedProducts:', error);
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fa-solid fa-triangle-exclamation fs-1 text-warning mb-3"></i>
                <p class="text-muted">Error loading products: ${error.message}</p>
                <button class="btn btn-primary mt-3" onclick="loadFeaturedProducts('productContainer', 8)">
                    <i class="fa-solid fa-rotate-right me-2"></i>Retry
                </button>
            </div>
        `;
    }
}

// Load and display categories
async function loadCategories(containerId = 'categoryContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Show loading
    container.innerHTML = '<div class="col-12 text-center py-3"><div class="spinner-border text-white" role="status"></div></div>';
    
    try {
        const result = await getCategories();
        
        console.log('Categories result:', result); // Debug log
        
        if (result.success && result.categories.length > 0) {
            container.innerHTML = result.categories.map(category => renderCategoryCard(category)).join('');
            
            // Add click handlers for categories
            document.querySelectorAll('.category-card').forEach(card => {
                card.style.cursor = 'pointer';
                card.addEventListener('click', () => {
                    const categoryId = card.dataset.categoryId;
                    loadProducts('productContainer', { category_id: categoryId });
                });
            });
        } else {
            // Fallback to static categories if API fails
            console.warn('Failed to load categories from API, using fallback');
            container.innerHTML = `
                <div class="col-md-4">
                    <div class="category-card">
                        <img src="https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80" class="cat-img" alt="Shoes">
                        <div class="cat-overlay">
                            <h3 class="cat-name">Shoes</h3>
                            <span class="cat-count">Loading...</span>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="category-card">
                        <img src="https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80" class="cat-img" alt="Outerwear">
                        <div class="cat-overlay">
                            <h3 class="cat-name">Outerwear</h3>
                            <span class="cat-count">Loading...</span>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="category-card">
                        <img src="https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=600&q=80" class="cat-img" alt="Fitness">
                        <div class="cat-overlay">
                            <h3 class="cat-name">Fitness Wear</h3>
                            <span class="cat-count">Loading...</span>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error in loadCategories:', error);
        // Show fallback categories on error
        container.innerHTML = `
            <div class="col-md-4">
                <div class="category-card">
                    <img src="https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80" class="cat-img" alt="Shoes">
                    <div class="cat-overlay">
                        <h3 class="cat-name">Shoes</h3>
                        <span class="cat-count">3.1k Products</span>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="category-card">
                    <img src="https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80" class="cat-img" alt="Outerwear">
                    <div class="cat-overlay">
                        <h3 class="cat-name">Outerwear</h3>
                        <span class="cat-count">1.4k Products</span>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="category-card">
                    <img src="https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=600&q=80" class="cat-img" alt="Fitness">
                    <div class="cat-overlay">
                        <h3 class="cat-name">Fitness Wear</h3>
                        <span class="cat-count">320 Products</span>
                    </div>
                </div>
            </div>
        `;
    }
}

// Add click handlers to product cards
function addProductClickHandlers() {
    // Cart icon button handlers
    document.querySelectorAll('.cart-icon-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.product-card');
            const productId = card.dataset.productId;
            
            // Add animation effect
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 100);
            
            // Update cart count in header
            const cartCount = document.getElementById('cartCount');
            const currentCount = parseInt(cartCount.textContent) || 0;
            cartCount.textContent = currentCount + 1;
            cartCount.style.display = 'inline-block';
            
            // Show toast notification
            if (typeof showToast === 'function') {
                showToast('Product added to cart!', 'success');
            }
            
            console.log('Added to cart:', productId);
        });
    });
    
    // Heart icon handlers
    document.querySelectorAll('.heart-icon').forEach(heart => {
        heart.addEventListener('click', function(e) {
            e.stopPropagation();
            if (this.classList.contains('fa-regular')) {
                this.classList.remove('fa-regular', 'text-muted');
                this.classList.add('fa-solid');
                // Show added to favorites
                if (typeof showToast === 'function') {
                    showToast('Added to favorites!', 'success');
                }
            } else {
                this.classList.remove('fa-solid');
                this.classList.add('fa-regular', 'text-muted');
            }
        });
    });
    
    // Product card click handler (for viewing details)
    document.querySelectorAll('.product-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function(e) {
            // Don't trigger if clicking heart or cart button
            if (e.target.classList.contains('heart-icon') ||
                e.target.closest('.cart-icon-btn')) {
                return;
            }
            
            const productId = this.dataset.productId;
            // Redirect to product detail page or show modal
            // window.location.href = `product-detail.html?id=${productId}`;
            console.log('Product clicked:', productId);
        });
    });
}

// Search functionality
function initializeSearch(searchInputId = 'searchInput') {
    const searchInput = document.querySelector(`#${searchInputId}, .header-search input`);
    if (!searchInput) return;
    
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const searchTerm = this.value.trim();
        
        if (searchTerm.length >= 2) {
            searchTimeout = setTimeout(async () => {
                const result = await searchProducts(searchTerm);
                const container = document.getElementById('productContainer');
                if (container && result.success && result.products.length > 0) {
                    container.innerHTML = result.products.map(product => renderProductCard(product)).join('');
                    addProductClickHandlers();
                } else if (container) {
                    container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">No products found</p></div>';
                }
            }, 500);
        } else if (searchTerm.length === 0) {
            loadFeaturedProducts();
        }
    });
}

// Initialize everything on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Products.js initialized'); // Debug log
    console.log('API Base URL:', API_BASE_URL); // Debug log
    
    // Load categories
    loadCategories('categoryContainer');
    
    // Load featured products
    loadFeaturedProducts('productContainer', 8);
    
    // Initialize search
    initializeSearch();
    
    // Add to cart button handler
    const addToCartBtn = document.querySelector('.btn-add-all');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            const selectedProducts = document.querySelectorAll('.product-card.selected');
            console.log('Adding to cart:', selectedProducts.length, 'products');
            // Implement cart functionality here
        });
    }
});

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getProducts,
        getFeaturedProducts,
        getProductById,
        getProductBySlug,
        searchProducts,
        getProductsByTag,
        getCategories,
        getCategoryBySlug,
        loadProducts,
        loadFeaturedProducts,
        loadCategories
    };
}