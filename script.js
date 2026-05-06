// API Configuration
const API_BASE_URL = "https://lung-cancer-backend-p36c.onrender.com";

// DOM Elements
const imageInput = document.getElementById('imageInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const predictionResult = document.getElementById('predictionResult');
const confidenceScore = document.getElementById('confidenceScore');
const originalPreview = document.getElementById('originalPreview');
const statusMessage = document.getElementById('statusMessage');
const dropZone = document.getElementById('drop-zone');
const previewContainer = document.getElementById('preview-container');
const resetBtn = document.getElementById('reset-btn');

// State
let selectedFile = null;

/**
 * Section Navigation
 */
function showSection(sectionId) {
    document.querySelectorAll('section').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/**
 * Handle image selection and validation
 */
function handleFile(file) {
    if (!file) return;

    // Requirement 5: Handle invalid image uploads
    if (!file.type.startsWith('image/')) {
        alert("Invalid image upload. Please select a valid JPG or PNG scan.");
        if (imageInput) imageInput.value = '';
        selectedFile = null;
        return;
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (event) => {
        if (originalPreview) {
            originalPreview.src = event.target.result;
            originalPreview.style.display = 'block';
        }
        if (dropZone) dropZone.classList.add('hidden');
        if (previewContainer) previewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

// Event Listeners for File Selection
if (imageInput) {
    imageInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
}

if (dropZone) {
    dropZone.addEventListener('click', () => imageInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
}

if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        selectedFile = null;
        if (imageInput) imageInput.value = '';
        if (dropZone) dropZone.classList.remove('hidden');
        if (previewContainer) previewContainer.classList.add('hidden');
        if (originalPreview) originalPreview.style.display = 'none';
        
        // Reset results UI if needed
        if (predictionResult) predictionResult.textContent = 'Result';
        if (confidenceScore) confidenceScore.textContent = '0%';
    });
}

/**
 * Main Analysis Logic
 */
if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
        if (!selectedFile) {
            alert("Please select a CT scan image first.");
            return;
        }

        // --- LOADING BEHAVIOR ---
        analyzeBtn.disabled = true;
        if (loadingSpinner) {
            loadingSpinner.classList.remove('hidden');
            loadingSpinner.style.display = 'block';
        }
        if (statusMessage) {
            statusMessage.textContent = "AI is processing scan...";
            statusMessage.style.display = 'block';
        }

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            // Requirement 4: Direct POST /predict
            const response = await fetch(`${API_BASE_URL}/predict`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.error || 'SERVER_ERROR');
            }

            // Requirement 4: Receives class, confidence, original_image
            const data = await response.json();

            // Requirement 4: Display results immediately
            updateUI(data);

        } catch (error) {
            console.error("Analysis error:", error);
            // Requirement 5: Robust Error Handling (Render cold start / network)
            if (statusMessage) {
                statusMessage.textContent = "Server error or backend asleep (Render cold start)";
            } else {
                alert("Server error or backend asleep (Render cold start)");
            }
        } finally {
            // UI cleanup
            analyzeBtn.disabled = false;
            if (loadingSpinner) {
                loadingSpinner.classList.add('hidden');
                loadingSpinner.style.display = 'none';
            }
        }
    });
}

/**
 * Updates UI with prediction data
 */
function updateUI(data) {
    if (predictionResult) predictionResult.textContent = data.class;
    if (confidenceScore) confidenceScore.textContent = `${data.confidence.toFixed(2)}%`;
    
    // Update original preview image if returned
    if (originalPreview && data.original_image) {
        originalPreview.src = data.original_image;
        originalPreview.style.display = 'block';
    }
    
    // Update labels and progress bar
    const resClassText = document.getElementById('res-class-text');
    if (resClassText) resClassText.textContent = data.class;
    
    const resProgress = document.getElementById('res-progress');
    if (resProgress) resProgress.style.width = `${data.confidence}%`;

    // Hide status message on success
    if (statusMessage) statusMessage.style.display = 'none';

    showSection('result-section');
}

// Theme Toggle Logic
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const body = document.body;
        const isDark = body.getAttribute('data-theme') === 'dark';
        body.setAttribute('data-theme', isDark ? 'light' : 'dark');
        themeToggle.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    });
}
