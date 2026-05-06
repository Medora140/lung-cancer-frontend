// API Configuration
const API_BASE_URL = "https://lung-cancer-backend-p36c.onrender.com";

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('fileInput');
const previewContainer = document.getElementById('preview-container');
const imagePreview = document.getElementById('image-preview');
const analyzeBtn = document.getElementById('analyzeBtn');
const resetBtn = document.getElementById('reset-btn');
const loader = document.getElementById('loader');
const themeToggle = document.getElementById('theme-toggle');

let selectedFile = null;

// --- Section Navigation ---
function showSection(sectionId) {
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// --- Dark Mode Toggle ---
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const body = document.body;
        const isDark = body.getAttribute('data-theme') === 'dark';
        body.setAttribute('data-theme', isDark ? 'light' : 'dark');
        themeToggle.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    });
}

// --- Drag & Drop ---
if (dropZone) {
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
    }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        dropZone.classList.add('hidden');
        previewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        selectedFile = null;
        fileInput.value = '';
        dropZone.classList.remove('hidden');
        previewContainer.classList.add('hidden');
    });
}

// --- Prediction Logic ---
if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        // Show loading state
        analyzeBtn.disabled = true;
        loader.classList.remove('hidden');

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch(`${API_BASE_URL}/predict`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server error');
            }

            const data = await response.json();
            displayResults(data);
            
        } catch (error) {
            console.error('Error:', error);
            alert("Server error or backend asleep (Render cold start)");
        } finally {
            analyzeBtn.disabled = false;
            loader.classList.add('hidden');
        }
    });
}

function displayResults(data) {
    const resClass = document.getElementById('res-class');
    const resClassText = document.getElementById('res-class-text');
    const resConfidence = document.getElementById('res-confidence');
    const resProgress = document.getElementById('res-progress');
    const resHeat = document.getElementById('res-heat');

    if (resClass) {
        resClass.textContent = data.class;
        resClass.className = `label ${data.class.replace(/ /g, '.')}`;
    }
    if (resClassText) resClassText.textContent = data.class;
    if (resConfidence) resConfidence.textContent = `${data.confidence}%`;
    if (resProgress) resProgress.style.width = `${data.confidence}%`;
    if (resHeat) resHeat.src = data.heatmap_image;

    showSection('result-section');
}
