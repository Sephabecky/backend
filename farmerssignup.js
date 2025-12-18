// Update your registration form JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'http://localhost:3003/api';
    let currentStep = 1;
    const registrationData = {};
    
    // Initialize form
    initFormSteps();
    initPasswordStrength();
    initCropCheckboxes();
    initFormSubmission();
    initEmailAvailabilityCheck();
    
    function initFormSteps() {
        // Next step buttons
        document.querySelectorAll('.next-step').forEach(button => {
            button.addEventListener('click', function() {
                const nextStep = this.getAttribute('data-next');
                if (validateStep(currentStep)) {
                    saveStepData(currentStep);
                    goToStep(nextStep.replace('step', ''));
                }
            });
        });
        
        // Previous step buttons
        document.querySelectorAll('.prev-step').forEach(button => {
            button.addEventListener('click', function() {
                const prevStep = this.getAttribute('data-prev');
                goToStep(prevStep.replace('step', ''));
            });
        });
    }
    
    function initPasswordStrength() {
        const passwordInput = document.getElementById('password');
        const strengthFill = document.getElementById('passwordStrengthFill');
        const strengthText = document.getElementById('passwordStrengthText');
        
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            let strength = calculatePasswordStrength(password);
            updatePasswordStrengthUI(strength, strengthFill, strengthText);
        });
    }
    
    function initCropCheckboxes() {
        const cropCheckboxes = document.querySelectorAll('input[name="crops"]');
        const otherCropsInput = document.getElementById('otherCrops');
        
        cropCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                if (this.value === 'other' && this.checked) {
                    otherCropsInput.style.display = 'block';
                } else if (this.value === 'other' && !this.checked) {
                    otherCropsInput.style.display = 'none';
                }
            });
        });
    }
    
    function initFormSubmission() {
        document.getElementById('submitRegistration').addEventListener('click', async function() {
            if (validateStep(3)) {
                saveStepData(3);
                await submitRegistration();
            }
        });
    }
    
    function initEmailAvailabilityCheck() {
        const emailInput = document.getElementById('email');
        let emailCheckTimeout;
        
        emailInput.addEventListener('input', function() {
            clearTimeout(emailCheckTimeout);
            const email = this.value.trim();
            
            if (email && isValidEmail(email)) {
                emailCheckTimeout = setTimeout(() => {
                    checkEmailAvailability(email);
                }, 1000);
            }
        });
    }
    
    async function checkEmailAvailability(email) {
        try {
            const response = await fetch(`${API_BASE_URL}/farmer/check-email/${email}`);
            const data = await response.json();
            
            if (data.success && !data.available) {
                showError('emailError', 'This email is already registered. Please login instead.');
            }
        } catch (error) {
            console.error('Email check error:', error);
        }
    }
    
    function validateStep(step) {
        let isValid = true;
        clearStepErrors(step);
        
        switch(step) {
            case 1:
                isValid = validateAccountStep();
                break;
            case 2:
                isValid = validateFarmStep();
                break;
            case 3:
                isValid = validateFinalStep();
                break;
        }
        
        return isValid;
    }
    
    function validateAccountStep() {
        let isValid = true;
        
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validate first name
        if (!firstName) {
            showError('firstNameError', 'First name is required');
            isValid = false;
        } else if (firstName.length < 2) {
            showError('firstNameError', 'First name must be at least 2 characters');
            isValid = false;
        }
        
        // Validate last name
        if (!lastName) {
            showError('lastNameError', 'Last name is required');
            isValid = false;
        } else if (lastName.length < 2) {
            showError('lastNameError', 'Last name must be at least 2 characters');
            isValid = false;
        }
        
        // Validate email
        if (!email) {
            showError('emailError', 'Email is required');
            isValid = false;
        } else if (!isValidEmail(email)) {
            showError('emailError', 'Please enter a valid email address');
            isValid = false;
        }
        
        // Validate phone
        if (!phone) {
            showError('phoneError', 'Phone number is required');
            isValid = false;
        } else if (!isValidPhone(phone)) {
            showError('phoneError', 'Please enter a valid phone number');
            isValid = false;
        }
        
        // Validate password
        if (!password) {
            showError('passwordError', 'Password is required');
            isValid = false;
        } else if (password.length < 6) {
            showError('passwordError', 'Password must be at least 6 characters');
            isValid = false;
        } else if (!isStrongPassword(password)) {
            showError('passwordError', 'Password should include uppercase, lowercase, and numbers');
            isValid = false;
        }
        
        // Validate confirm password
        if (!confirmPassword) {
            showError('confirmPasswordError', 'Please confirm your password');
            isValid = false;
        } else if (password !== confirmPassword) {
            showError('confirmPasswordError', 'Passwords do not match');
            isValid = false;
        }
        
        return isValid;
    }
    
    function validateFarmStep() {
        let isValid = true;
        
        const farmLocation = document.getElementById('farmLocation').value.trim();
        const farmSize = document.getElementById('farmSize').value.trim();
        
        // Validate farm location
        if (!farmLocation) {
            showError('farmLocationError', 'Farm location is required');
            isValid = false;
        }
        
        // Validate farm size
        if (!farmSize || farmSize <= 0) {
            showError('farmSizeError', 'Please enter a valid farm size');
            isValid = false;
        }
        
        // Validate at least one crop selected
        const selectedCrops = document.querySelectorAll('input[name="crops"]:checked');
        if (selectedCrops.length === 0) {
            showError('cropsError', 'Please select at least one crop');
            isValid = false;
        }
        
        return isValid;
    }
    
    function validateFinalStep() {
        let isValid = true;
        const terms = document.getElementById('terms').checked;
        
        if (!terms) {
            showError('termsError', 'You must accept the terms and conditions');
            isValid = false;
        }
        
        return isValid;
    }
    
    function saveStepData(step) {
        switch(step) {
            case 1:
                registrationData.firstName = document.getElementById('firstName').value.trim();
                registrationData.lastName = document.getElementById('lastName').value.trim();
                registrationData.email = document.getElementById('email').value.trim();
                registrationData.phone = document.getElementById('phone').value.trim();
                registrationData.idNumber = document.getElementById('idNumber').value.trim();
                registrationData.password = document.getElementById('password').value;
                break;
            case 2:
                registrationData.farmName = document.getElementById('farmName').value.trim();
                registrationData.farmLocation = document.getElementById('farmLocation').value.trim();
                registrationData.farmSize = document.getElementById('farmSize').value.trim();
                registrationData.farmAge = document.getElementById('farmAge').value.trim();
                
                // Collect crops
                const selectedCrops = [];
                document.querySelectorAll('input[name="crops"]:checked').forEach(cb => {
                    if (cb.value === 'other') {
                        const otherCrops = document.getElementById('otherCrops').value;
                        if (otherCrops) selectedCrops.push(otherCrops);
                    } else {
                        selectedCrops.push(cb.value);
                    }
                });
                registrationData.crops = selectedCrops;
                
                registrationData.livestock = document.getElementById('livestock').value.trim();
                registrationData.irrigation = document.getElementById('irrigation').value;
                registrationData.farmGoals = document.getElementById('farmGoals').value.trim();
                break;
            case 3:
                registrationData.newsletter = document.getElementById('newsletter').checked;
                registrationData.shareInfo = document.getElementById('shareInfo').checked;
                registrationData.terms = document.getElementById('terms').checked;
                break;
        }
    }
    
    async function submitRegistration() {
        const submitBtn = document.getElementById('submitRegistration');
        const originalText = submitBtn.innerHTML;
        
        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
        submitBtn.disabled = true;
        
        try {
            // Prepare data for API
            const formData = {
                ...registrationData,
                confirmPassword: document.getElementById('confirmPassword').value
            };
            
            // Submit to backend
            const response = await fetch(`${API_BASE_URL}/farmer/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Update UI with server response
                document.getElementById('accountId').textContent = data.accountId;
                
                // Store token for auto-login
                if (data.token) {
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('farmerData', JSON.stringify(data.farmer));
                }
                
                // Show success message
                goToStep('success');
            } else {
                // Show errors
                if (data.errors && data.errors.length > 0) {
                    data.errors.forEach(error => {
                        showFormError(error);
                    });
                } else if (data.error) {
                    showFormError(data.error);
                }
                
                // Scroll to top to show errors
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            showFormError('Network error. Please try again later.');
            
            // Fallback: Save to localStorage
            saveRegistrationLocally();
            
        } finally {
            // Restore button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    function saveRegistrationLocally() {
        const accountId = 'FARM-LOCAL-' + Date.now().toString().slice(-8);
        
        // Save to localStorage
        const farmers = JSON.parse(localStorage.getItem('farmers') || '[]');
        const newFarmer = {
            id: Date.now(),
            accountId,
            ...registrationData,
            registrationDate: new Date().toISOString(),
            status: 'pending_online',
            synced: false
        };
        
        farmers.push(newFarmer);
        localStorage.setItem('farmers', JSON.stringify(farmers));
        
        // Show offline message
        document.getElementById('accountId').textContent = accountId;
        
        const successSection = document.getElementById('success-section');
        const offlineWarning = document.createElement('div');
        offlineWarning.style.cssText = `
            background-color: #fff3cd;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border: 1px solid #ffeaa7;
        `;
        offlineWarning.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <strong> Registration saved offline.</strong>
            <p style="margin: 5px 0 0 0;">
                Your registration will be completed when you're back online.
                Check your email for verification once connected.
            </p>
        `;
        successSection.querySelector('.success-message').appendChild(offlineWarning);
        
        goToStep('success');
    }
    
    function goToStep(stepNumber) {
        // Update current step
        if (stepNumber !== 'success') {
            currentStep = parseInt(stepNumber);
        }
        
        // Hide all form sections
        document.querySelectorAll('.form-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show current section
        if (stepNumber === 'success') {
            document.getElementById('success-section').classList.add('active');
        } else {
            document.getElementById(`step${stepNumber}-section`).classList.add('active');
        }
        
        // Update progress steps
        document.querySelectorAll('.step').forEach(step => {
            const stepNum = parseInt(step.getAttribute('data-step'));
            
            step.classList.remove('active', 'completed');
            
            if (stepNum < currentStep) {
                step.classList.add('completed');
            } else if (stepNum === currentStep) {
                step.classList.add('active');
            }
        });
        
        // Update step connectors
        document.querySelectorAll('.step-connector').forEach((connector, index) => {
            connector.classList.remove('completed');
            if (index < currentStep - 1) {
                connector.classList.add('completed');
            }
        });
        
        // Update progress title
        const titles = {
            1: 'Create Your Account',
            2: 'Farm Information',
            3: 'Review & Submit',
            success: 'Registration Complete!'
        };
        document.getElementById('progressTitle').textContent = titles[stepNumber] || 'Registration';
        
        // If going to step 3, update review summary
        if (stepNumber == 3) {
            updateReviewSummary();
        }
    }
    
    function updateReviewSummary() {
        const summaryDiv = document.getElementById('reviewSummary');
        let summaryHtml = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <h4 style="color: var(--primary-green); margin-bottom: 10px;">Personal Information</h4>
                    <p><strong>Name:</strong> ${registrationData.firstName} ${registrationData.lastName}</p>
                    <p><strong>Email:</strong> ${registrationData.email}</p>
                    <p><strong>Phone:</strong> ${registrationData.phone}</p>
                    ${registrationData.idNumber ? `<p><strong>ID Number:</strong> ${registrationData.idNumber}</p>` : ''}
                </div>
                <div>
                    <h4 style="color: var(--primary-green); margin-bottom: 10px;">Farm Information</h4>
                    <p><strong>Location:</strong> ${registrationData.farmLocation}</p>
                    <p><strong>Farm Size:</strong> ${registrationData.farmSize} acres</p>
                    <p><strong>Main Crops:</strong> ${registrationData.crops ? registrationData.crops.join(', ') : 'Not specified'}</p>
                    ${registrationData.farmAge ? `<p><strong>Years of Operation:</strong> ${registrationData.farmAge} years</p>` : ''}
                </div>
            </div>
        `;
        
        if (registrationData.farmName) {
            summaryHtml = `<p><strong>Farm Name:</strong> ${registrationData.farmName}</p>` + summaryHtml;
        }
        
        if (registrationData.livestock) {
            summaryHtml += `<p style="margin-top: 15px;"><strong>Livestock:</strong> ${registrationData.livestock}</p>`;
        }
        
        if (registrationData.irrigation) {
            summaryHtml += `<p><strong>Irrigation System:</strong> ${registrationData.irrigation}</p>`;
        }
        
        if (registrationData.farmGoals) {
            summaryHtml += `<p style="margin-top: 15px;"><strong>Farm Goals:</strong> ${registrationData.farmGoals}</p>`;
        }
        
        summaryDiv.innerHTML = summaryHtml;
    }
    
    // Helper Functions
    function calculatePasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength += 25;
        if (/[a-z]/.test(password)) strength += 25;
        if (/[A-Z]/.test(password)) strength += 25;
        if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) strength += 25;
        
        return strength;
    }
    
    function updatePasswordStrengthUI(strength, fillElement, textElement) {
        let text = 'None';
        let color = '#dc3545';
        
        if (strength >= 75) {
            text = 'Strong';
            color = '#28a745';
        } else if (strength >= 50) {
            text = 'Medium';
            color = '#ffc107';
        } else if (strength >= 25) {
            text = 'Weak';
            color = '#fd7e14';
        }
        
        fillElement.style.width = `${strength}%`;
        fillElement.style.backgroundColor = color;
        textElement.textContent = `Password strength: ${text}`;
        textElement.style.color = color;
    }
    
    function isStrongPassword(password) {
        return password.length >= 6 &&
               /[a-z]/.test(password) &&
               /[A-Z]/.test(password) &&
               /[0-9]/.test(password);
    }
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function isValidPhone(phone) {
        const phoneRegex = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/;
        return phoneRegex.test(phone) && phone.length >= 9;
    }
    
    function showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    }
    
    function showFormError(message) {
        // Create or show general error container
        let errorContainer = document.getElementById('formErrorContainer');
        
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'formErrorContainer';
            errorContainer.style.cssText = `
                background-color: #f8d7da;
                color: #721c24;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
                border: 1px solid #f5c6cb;
            `;
            
            const formBody = document.querySelector('.form-body');
            formBody.insertBefore(errorContainer, formBody.firstChild);
        }
        
        errorContainer.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <strong> Error:</strong> ${message}
        `;
        errorContainer.style.display = 'block';
    }
    
    function clearStepErrors(step) {
        let errorIds = [];
        
        switch(step) {
            case 1:
                errorIds = ['firstNameError', 'lastNameError', 'emailError', 'phoneError', 'passwordError', 'confirmPasswordError'];
                break;
            case 2:
                errorIds = ['farmLocationError', 'farmSizeError', 'cropsError'];
                break;
            case 3:
                errorIds = ['termsError'];
                break;
        }
        
        errorIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
                element.textContent = '';
            }
        });
        
        // Clear general error container
        const errorContainer = document.getElementById('formErrorContainer');
        if (errorContainer) {
            errorContainer.style.display = 'none';
        }
    }
});