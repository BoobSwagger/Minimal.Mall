const API_BASE_URL = 'https://minimallbackend.onrender.com/api';

// ==================== AUTHENTICATION ====================

function getAuthToken() {
    return localStorage.getItem('authToken');
}

function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '../logIn Pages/signin.html';
        return false;
    }
    return true;
}

// ==================== UI HELPERS ====================

function showAlert(message, type = 'success') {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.appendChild(alert);
    
    setTimeout(() => alert.remove(), 5000);
}

function toggleLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const container = document.getElementById('profileContainer');
    
    if (spinner) spinner.style.display = show ? 'block' : 'none';
    if (container) container.style.display = show ? 'none' : 'block';
}

function setButtonLoading(button, isLoading, loadingText = 'Loading...') {
    if (!button) return;
    
    if (isLoading) {
        button.dataset.originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i>${loadingText}`;
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || 'Save Changes';
    }
}

// ==================== PROFILE IMAGE HANDLING ====================

let selectedFile = null;

function generateAvatarUrl(fullName) {
    const name = encodeURIComponent(fullName || 'User');
    return `https://ui-avatars.com/api/?name=${name}&size=200&background=4F46E5&color=fff&bold=true&rounded=true`;
}

function displayProfileImage(imageUrl, fullName = '') {
    const photoPreview = document.getElementById('photoPreview');
    if (!photoPreview) return;
    
    const finalUrl = imageUrl || generateAvatarUrl(fullName);
    
    photoPreview.innerHTML = `
        <img src="${finalUrl}" 
             alt="Profile Picture" 
             style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" 
             onclick="document.getElementById('photoInput').click()"
             onerror="this.src='${generateAvatarUrl(fullName)}'">
    `;
    photoPreview.style.cursor = 'pointer';
    photoPreview.style.border = 'none';
}

function setupPhotoUploadHandler() {
    const photoInput = document.getElementById('photoInput');
    if (!photoInput) return;
    
    photoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        console.log('File selected:', file.name, file.type, file.size);
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showAlert('Invalid file type. Please upload JPG, PNG, or WEBP image.', 'danger');
            e.target.value = '';
            return;
        }
        
        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            showAlert('File too large. Maximum size is 5MB.', 'danger');
            e.target.value = '';
            return;
        }
        
        selectedFile = file;
        
        // Preview the image
        const reader = new FileReader();
        reader.onload = function(e) {
            const photoPreview = document.getElementById('photoPreview');
            photoPreview.innerHTML = `
                <img src="${e.target.result}" 
                     alt="Profile Picture" 
                     style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" 
                     onclick="document.getElementById('photoInput').click()">
            `;
            photoPreview.style.border = 'none';
            console.log('Preview displayed successfully');
        };
        reader.onerror = function(error) {
            console.error('FileReader error:', error);
            showAlert('Failed to read image file.', 'danger');
        };
        reader.readAsDataURL(file);
    });
}

async function uploadProfileImage(file) {
    if (!file) throw new Error('No file provided');
    
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('Uploading image:', file.name, file.type, file.size);
    
    const response = await fetch(`${API_BASE_URL}/upload/profile-image`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload image');
    }
    
    const data = await response.json();
    console.log('Upload successful:', data);
    
    const imageUrl = data.secure_url || data.url;
    if (!imageUrl) {
        throw new Error('No image URL received from server');
    }
    
    return imageUrl;
}

// ==================== PROFILE DATA MANAGEMENT ====================

async function loadProfile() {
    if (!checkAuth()) return;
    
    console.log('Loading profile data...');
    toggleLoading(true);
    
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            localStorage.removeItem('authToken');
            window.location.href = '../logIn Pages/signin.html';
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to load profile');
        }

        const data = await response.json();
        console.log('Profile data received:', data);
        populateForm(data);
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showAlert('Failed to load profile: ' + error.message, 'danger');
    } finally {
        toggleLoading(false);
    }
}

function populateForm(profile) {
    console.log('Populating form with profile data:', profile);
    
    // Helper function to safely set input value
    const setInputValue = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.value = value || '';
            console.log(`${id} set to:`, element.value);
        }
    };
    
    // Populate all form fields
    setInputValue('fullName', profile.full_name);
    setInputValue('email', profile.email);
    setInputValue('phoneNumber', profile.phone);
    setInputValue('gender', profile.gender);
    setInputValue('dateOfBirth', profile.date_of_birth);
    setInputValue('address', profile.address);
    setInputValue('bio', profile.bio);
    
    // Display profile image (or avatar if no image)
    displayProfileImage(profile.profile_image, profile.full_name);
}

async function updateProfile(updateData) {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
    });

    if (response.status === 401) {
        localStorage.removeItem('authToken');
        window.location.href = '../logIn Pages/signin.html';
        return;
    }

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update profile');
    }

    return await response.json();
}

// ==================== FORM SUBMISSION ====================

function setupFormSubmission() {
    const form = document.getElementById('profileForm');
    const saveBtn = document.getElementById('saveBtn');
    
    if (!form || !saveBtn) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        setButtonLoading(saveBtn, true, 'Saving...');
        
        try {
            // Prepare update data
            const updateData = {
                full_name: document.getElementById('fullName').value.trim(),
                phone: document.getElementById('phoneNumber').value.trim() || null,
                gender: document.getElementById('gender').value || null,
                date_of_birth: document.getElementById('dateOfBirth').value || null,
                address: document.getElementById('address').value.trim() || null,
                bio: document.getElementById('bio').value.trim() || null
            };
            
            // Upload image if selected
            if (selectedFile) {
                try {
                    setButtonLoading(saveBtn, true, 'Uploading image...');
                    const imageUrl = await uploadProfileImage(selectedFile);
                    updateData.profile_image = imageUrl;
                    showAlert('Profile picture uploaded successfully!', 'success');
                } catch (uploadError) {
                    console.error('Image upload failed:', uploadError);
                    showAlert('Failed to upload image: ' + uploadError.message + '. Other changes will still be saved.', 'warning');
                }
            }

            // Update profile
            setButtonLoading(saveBtn, true, 'Updating profile...');
            const data = await updateProfile(updateData);
            
            console.log('Profile updated successfully:', data);
            showAlert('Profile updated successfully!', 'success');
            
            // Reset and reload
            selectedFile = null;
            setTimeout(() => loadProfile(), 1500);
            
        } catch (error) {
            console.error('Error updating profile:', error);
            showAlert(error.message || 'Failed to update profile. Please try again.', 'danger');
        } finally {
            setButtonLoading(saveBtn, false);
        }
    });
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing edit profile page...');
    setupPhotoUploadHandler();
    setupFormSubmission();
    loadProfile();
});