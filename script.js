// API Configuration
const API_BASE_URL = "https://lung-cancer-backend-p36c.onrender.com";

// DOM Elements
const imageInput = document.getElementById('imageInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const predictionResult = document.getElementById('predictionResult');
const confidenceScore = document.getElementById('confidenceScore');
const originalPreview = document.getElementById('originalPreview');
const heatmapPreview = document.getElementById('heatmapPreview');
const statusMessage = document.getElementById('statusMessage');
const dropZone = document.getElementById('drop-zone');
const previewContainer = document.getElementById('preview-container');
const resetBtn = document.getElementById('reset-btn');

// State
let selectedFile = null;
let heatmapPollingInterval = null;

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

    // Requirement 8: Handle invalid image uploads
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
        if (heatmapPreview) heatmapPreview.style.display = 'none';
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

        // --- LOADING BEHAVIOR (Initial) ---
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
            // Requirement 1: Uploads image to /predict
            const response = await fetch(`${API_BASE_URL}/predict`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('PREDICT_FAILED');

            // Requirement 3: Receives class, confidence, job_id, original_image
            const data = await response.json();

            // Requirement 4: Displays prediction immediately
            updatePredictionUI(data);

            // --- LOADING BEHAVIOR (After Prediction) ---
            if (statusMessage) {
                statusMessage.textContent = "Generating GradCAM visualization...";
            }

            // Requirement 5: Starts polling
            startHeatmapPolling(data.job_id);

        } catch (error) {
            console.error("Prediction error:", error);
            // Requirement 8: Handle backend cold starts / network errors
            if (statusMessage) {
                statusMessage.textContent = "Server error or backend asleep (Render cold start)";
            }
            resetLoadingState();
        }
    });
}

/**
 * Polls the heatmap endpoint
 */
function startHeatmapPolling(jobId) {
    if (heatmapPollingInterval) clearInterval(heatmapPollingInterval);

    // Requirement 5: Polling interval 3000ms
    heatmapPollingInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/heatmap/${jobId}`);
            if (!response.ok) throw new Error('POLLING_ERROR');

            const data = await response.json();

            if (data.status === 'completed') {
                // Requirement 6 & 7: Stop polling and display GradCAM
                handlePollingSuccess(data.heatmap_image);
            } else if (data.status === 'failed') {
                // Requirement 6 & 8: Stop polling on failure
                handlePollingFailure();
            }
            // If status is 'processing', continue polling
        } catch (error) {
            console.error("Polling error:", error);
            handlePollingFailure();
        }
    }, 3000);
}

/**
 * Updates UI with initial prediction data
 */
function updatePredictionUI(data) {
    if (predictionResult) predictionResult.textContent = data.class;
    if (confidenceScore) confidenceScore.textContent = `${data.confidence.toFixed(2)}%`;
    if (originalPreview && data.original_image) {
        originalPreview.src = data.original_image;
    }
    
    // Update labels and progress bar
    const resClassText = document.getElementById('res-class-text');
    if (resClassText) resClassText.textContent = data.class;
    
    const resProgress = document.getElementById('res-progress');
    if (resProgress) resProgress.style.width = `${data.confidence}%`;

    showSection('result-section');
}

/**
 * Handles successful heatmap generation
 */
function handlePollingSuccess(heatmapImage) {
    stopPolling();
    if (heatmapPreview) {
        heatmapPreview.src = heatmapImage;
        heatmapPreview.style.display = 'block';
    }
    if (loadingSpinner) {
        loadingSpinner.classList.add('hidden');
        loadingSpinner.style.display = 'none';
    }
    if (statusMessage) statusMessage.style.display = 'none';
    analyzeBtn.disabled = false;
}

/**
 * Handles heatmap generation failure
 */
function handlePollingFailure() {
    stopPolling();
    // Requirement 8: Handle failed heatmap jobs
    if (statusMessage) {
        statusMessage.textContent = "Heatmap generation failed";
    }
    if (loadingSpinner) {
        loadingSpinner.classList.add('hidden');
        loadingSpinner.style.display = 'none';
    }
    analyzeBtn.disabled = false;
}

/**
 * Stops the polling interval
 */
function stopPolling() {
    if (heatmapPollingInterval) {
        clearInterval(heatmapPollingInterval);
        heatmapPollingInterval = null;
    }
}

/**
 * Resets the loading state UI
 */
function resetLoadingState() {
    if (loadingSpinner) {
        loadingSpinner.classList.add('hidden');
        loadingSpinner.style.display = 'none';
    }
    analyzeBtn.disabled = false;
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
