// Update your farm assessment form JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = "https://agronomy-backend-ehk1.onrender.com";
    
    // Rest of your existing JavaScript code...
    
    function initFormSubmission() {
        const form = document.getElementById('farmAssessmentForm');
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (validateStep(4)) {
                // Show loading state
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
                submitBtn.disabled = true;
                
                try {
                    // Collect form data
                    const formData = collectFormData();
                    
                    // Submit to backend API
                    const response = await fetch(`${API_BASE_URL}/assessment/submit`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Update reference number from server
                        const refNumber = data.referenceNumber;
                        document.getElementById('referenceNumber').textContent = refNumber;
                        
                        // Save to localStorage as backup
                        saveAssessmentRequest(refNumber, formData);
                        
                        // Show success message
                        document.getElementById('farmAssessmentForm').style.display = 'none';
                        document.getElementById('successMessage').style.display = 'block';
                        
                        // Reset form after submission
                        setTimeout(() => {
                            form.reset();
                            goToStep(1);
                            document.getElementById('farmAssessmentForm').style.display = 'block';
                            document.getElementById('successMessage').style.display = 'none';
                        }, 10000);
                        
                    } else {
                        // Show errors from server
                        if (data.errors) {
                            data.errors.forEach(error => {
                                alert(error);
                            });
                        } else {
                            alert(data.error || 'Failed to submit request');
                        }
                    }
                    
                } catch (error) {
                    console.error('Submission error:', error);
                    alert('Network error. Your request has been saved locally and will be submitted when online.');
                    
                    // Fallback to localStorage
                    const refNumber = 'ASS-' + Date.now().toString().slice(-8);
                    document.getElementById('referenceNumber').textContent = refNumber;
                    saveAssessmentRequest(refNumber, formData);
                    
                    // Show success message with offline warning
                    document.getElementById('farmAssessmentForm').style.display = 'none';
                    document.getElementById('successMessage').style.display = 'block';
                    
                    // Add offline warning
                    const successMsg = document.getElementById('successMessage');
                    const offlineWarning = document.createElement('div');
                    offlineWarning.style.cssText = `
                        background-color: #fff3cd;
                        color: #856404;
                        padding: 10px;
                        border-radius: 5px;
                        margin-top: 15px;
                        border: 1px solid #ffeaa7;
                    `;
                    offlineWarning.innerHTML = `
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong> Your request was saved offline.</strong>
                        <p style="margin: 5px 0 0 0; font-size: 0.9em;">
                            The request will be submitted when you're back online.
                        </p>
                    `;
                    successMsg.appendChild(offlineWarning);
                    
                } finally {
                    // Restore button state
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }
        });
    }
    
    function collectFormData() {
        const formData = {};
        
        // Collect all form fields
        formData.assessmentType = document.getElementById('assessmentType').value;
        formData.farmName = document.getElementById('farmName').value.trim();
        formData.farmLocation = document.getElementById('farmLocation').value.trim();
        formData.farmSize = document.getElementById('farmSize').value.trim();
        formData.farmAge = document.getElementById('farmAge').value.trim();
        
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
        formData.crops = selectedCrops;
        
        // Collect other fields
        formData.livestock = document.getElementById('livestock').value.trim();
        formData.currentIssues = document.getElementById('currentIssues').value.trim();
        formData.fullName = document.getElementById('fullName').value.trim();
        formData.phone = document.getElementById('phone').value.trim();
        formData.email = document.getElementById('email').value.trim();
        formData.idNumber = document.getElementById('idNumber').value.trim();
        
        // Collect radio button
        const registeredFarmer = document.querySelector('input[name="registeredFarmer"]:checked');
        formData.registeredFarmer = registeredFarmer ? registeredFarmer.value : '';
        
        // Collect other fields
        formData.preferredDate = document.getElementById('preferredDate').value;
        formData.additionalInfo = document.getElementById('additionalInfo').value.trim();
        formData.terms = document.getElementById('terms').checked;
        formData.newsletter = document.getElementById('newsletter').checked;
        
        return formData;
    }
    
    function saveAssessmentRequest(refNumber, formData) {
        // Get existing requests
        const requests = JSON.parse(localStorage.getItem('assessmentRequests') || '[]');
        
        // Create new request
        const newRequest = {
            id: `LOCAL-${Date.now()}`,
            referenceNumber: refNumber,
            ...formData,
            submissionDate: new Date().toISOString(),
            status: 'pending_offline',
            synced: false
        };
        
        // Add to requests array
        requests.push(newRequest);
        localStorage.setItem('assessmentRequests', JSON.stringify(requests));
        
        console.log('Assessment request saved locally:', newRequest);
        
        // Try to sync in background
        syncOfflineRequests();
    }
    
    async function syncOfflineRequests() {
        const requests = JSON.parse(localStorage.getItem('assessmentRequests') || '[]');
        const offlineRequests = requests.filter(req => req.status === 'pending_offline');
        
        for (const request of offlineRequests) {
            try {
                const response = await fetch(`${API_BASE_URL}/assessment/submit`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(request)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Update local record
                    const index = requests.findIndex(r => r.id === request.id);
                    if (index !== -1) {
                        requests[index].status = 'pending';
                        requests[index].synced = true;
                        requests[index].serverId = data.requestId;
                        requests[index].serverRef = data.referenceNumber;
                        localStorage.setItem('assessmentRequests', JSON.stringify(requests));
                        console.log(`Request ${request.referenceNumber} synced successfully`);
                    }
                }
            } catch (error) {
                console.error('Sync error for request:', request.referenceNumber, error);
            }
        }
    }
    
    

});
