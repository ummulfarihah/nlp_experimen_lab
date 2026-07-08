/* NLP EXPERIMENT LAB - APPLICATION LOGIC & ROUTER (app.js) */

// Global App State
const STATE = {
    user: null,
    datasets: [],
    jobs: [],
    models: [],
    activeJobId: null,
    logsInterval: null,
    resourcesInterval: null,
    selectedDatasetId: null,
    inspectedJobId: null,
    realGpuAvailable: false
};

// Toast message trigger helper
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    
    toastMsg.textContent = message;
    if (isError) {
        toast.style.borderLeftColor = 'var(--red)';
    } else {
        toast.style.borderLeftColor = 'var(--primary-pink)';
    }
    
    toast.classList.remove('hidden');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Global Custom Confirmation Modal Helper
let confirmPromiseResolve = null;

function showCustomConfirm(title, message, submessage = '', okText = 'Ya, Hapus', cancelText = 'Batal', isDanger = true) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-modal-title');
        const messageEl = document.getElementById('confirm-modal-message');
        const submessageEl = document.getElementById('confirm-modal-submessage');
        const submessageContainer = document.getElementById('confirm-modal-submessage-container');
        const okBtn = document.getElementById('confirm-btn-ok');
        const cancelBtn = document.getElementById('confirm-btn-cancel');
        
        // Populate contents
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        if (submessage) {
            submessageEl.textContent = submessage;
            submessageContainer.classList.remove('hidden');
        } else {
            submessageContainer.classList.add('hidden');
        }
        
        okBtn.textContent = okText;
        cancelBtn.textContent = cancelText;
        
        if (isDanger) {
            okBtn.className = 'btn btn-danger';
        } else {
            okBtn.className = 'btn btn-primary';
        }
        
        // Open modal
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
        
        // Callback resolver
        confirmPromiseResolve = (result) => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 250);
            resolve(result);
        };
    });
}

function showCustomAlert(title, message, submessage = '', okText = 'Tutup') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-modal-title');
        const messageEl = document.getElementById('confirm-modal-message');
        const submessageEl = document.getElementById('confirm-modal-submessage');
        const submessageContainer = document.getElementById('confirm-modal-submessage-container');
        const okBtn = document.getElementById('confirm-btn-ok');
        const cancelBtn = document.getElementById('confirm-btn-cancel');
        const iconEl = document.getElementById('confirm-modal-icon');
        
        // Populate contents
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        if (submessage) {
            submessageEl.textContent = submessage;
            submessageContainer.classList.remove('hidden');
        } else {
            submessageContainer.classList.add('hidden');
        }
        
        okBtn.textContent = okText;
        okBtn.className = 'btn btn-primary';
        
        // Hide cancel button for alert
        cancelBtn.classList.add('hidden');
        
        // Change icon to warning
        iconEl.setAttribute('data-lucide', 'alert-circle');
        iconEl.className = 'text-pink w-6 h-6';
        if (window.lucide) lucide.createIcons();
        
        // Open modal
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
        
        // Callback resolver
        confirmPromiseResolve = (result) => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.classList.add('hidden');
                cancelBtn.classList.remove('hidden'); // restore cancel button
                iconEl.setAttribute('data-lucide', 'alert-triangle'); // restore icon
                iconEl.className = 'text-red w-6 h-6';
                if (window.lucide) lucide.createIcons();
            }, 250);
            resolve(true);
        };
    });
}

// Global loader controllers
function showLoader() {
    document.getElementById('global-loader').style.opacity = '1';
    document.getElementById('global-loader').style.pointerEvents = 'all';
}

function hideLoader() {
    document.getElementById('global-loader').style.opacity = '0';
    document.getElementById('global-loader').style.pointerEvents = 'none';
}

// --- VIEW NAVIGATION / ROUTER ---
const VIEWS = ['dashboard', 'datasets', 'preprocess', 'preprocess-bert', 'training', 'evaluations', 'mcnemar', 'prediction', 'registry', 'profile'];

function navigateToView(viewId) {
    if (!VIEWS.includes(viewId)) viewId = 'dashboard';
    
    // Hide all views, deactivate sidebar menu links
    VIEWS.forEach(v => {
        const viewEl = document.getElementById(`view-${v}`);
        if (viewEl) viewEl.classList.add('hidden');
        const navEl = document.getElementById(`nav-${v}`);
        if (navEl) navEl.classList.remove('active');
    });
    
    // Show active view
    const activeViewEl = document.getElementById(`view-${viewId}`);
    if (activeViewEl) activeViewEl.classList.remove('hidden');
    const activeNavEl = document.getElementById(`nav-${viewId}`);
    if (activeNavEl) activeNavEl.classList.add('active');
    
    // Set Header Title
    const viewTitleMap = {
        dashboard: "Dashboard Ringkasan",
        datasets: "Dataset Manager",
        preprocess: "Classic Preprocessing Lab",
        'preprocess-bert': "BERT Preprocessing Lab (WordPiece)",
        training: "Model Training & Jobs",
        evaluations: "Evaluation Lab & Rankings",
        mcnemar: "McNemar Significance Test",
        prediction: "Prediction & Inference Lab",
        registry: "Model Registry Lifecycle",
        profile: "Profil Pengguna & Keamanan"
    };
    document.getElementById('view-title').textContent = viewTitleMap[viewId];
    
    // Automatically close sidebar on mobile when navigating
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
    
    // View-specific trigger actions
    handleViewActivated(viewId);
}

function handleViewActivated(viewId) {
    // Resource Monitor Polling: Only run while on dashboard
    if (viewId === 'dashboard') {
        initResourceCharts();
        fetchSystemResources();
        startResourcePolling();
        fetchDashboardSummary();
    } else {
        stopResourcePolling();
    }
    
    if (viewId === 'datasets') {
        fetchDatasetsList();
    }
    
    if (viewId === 'training') {
        fetchDatasetsList(); // load dataset selector option
        fetchJobsHistory();
        checkActiveRunningJob();
    }
    
    if (viewId === 'evaluations') {
        fetchRankingsList();
    }
    
    if (viewId === 'mcnemar') {
        fetchModelsDropdowns(['mcnemar-model-a', 'mcnemar-model-b']);
    }
    
    if (viewId === 'prediction') {
        fetchModelsDropdowns(['pred-model', 'batch-pred-model']);
    }
    
    if (viewId === 'registry') {
        fetchModelRegistry();
    }
    
    if (viewId === 'profile') {
        loadUserProfile();
    }
}

// --- AUTHENTICATION & LOGIN INTERACTION ---
function checkAuthentication() {
    showLoader();
    fetch('/api/v1/auth/me')
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                setAuthenticatedUser(res.data);
            } else {
                showLoginOverlay();
            }
        })
        .catch(() => {
            showLoginOverlay();
        })
        .finally(() => {
            hideLoader();
        });
}

function showLoginOverlay() {
    document.getElementById('login-overlay').classList.remove('hidden');
    document.getElementById('app-wrapper').classList.add('hidden');
}

function hideLoginOverlay() {
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('app-wrapper').classList.remove('hidden');
}

function setAuthenticatedUser(user) {
    STATE.user = user;
    
    // Update Sidebar Profile elements
    document.getElementById('user-display-name').textContent = user.name;
    document.getElementById('user-display-role').textContent = user.role || 'Researcher';
    if (user.picture) {
        document.getElementById('user-avatar').src = user.picture;
    }
    
    hideLoginOverlay();
    
    // Re-trigger router navigation depending on current hash
    const initialHash = window.location.hash.substring(1) || 'dashboard';
    navigateToView(initialHash);
}


document.getElementById('form-real-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    showLoader();
    fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            showToast("Login Successful!");
            setAuthenticatedUser(res.data);
        } else {
            showToast(res.error || "Wrong email or password.", true);
        }
    })
    .catch(() => showToast("Connection failed.", true))
    .finally(() => hideLoader());
});

document.getElementById('btn-logout').addEventListener('click', () => {
    showLoader();
    fetch('/api/v1/auth/logout', { method: 'POST' })
        .then(() => {
            showToast("Logged out successfully.");
            STATE.user = null;
            showLoginOverlay();
            window.location.hash = '#dashboard';
        })
        .finally(() => hideLoader());
});


// --- USER PROFILE & PASSWORD MANAGEMENT ---
function loadUserProfile() {
    showLoader();
    fetch('/api/v1/auth/me')
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                const user = res.data;
                // Update Overview Card
                document.getElementById('profile-display-avatar').src = user.picture || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256";
                document.getElementById('profile-sidebar-name').textContent = user.name;
                document.getElementById('profile-sidebar-role').textContent = user.role || 'Administrator';
                document.getElementById('profile-sidebar-institution').textContent = user.institution || 'Universitas Muhammadiyah Malang';
                
                // Update Sidebar
                document.getElementById('user-display-name').textContent = user.name;
                document.getElementById('user-display-role').textContent = user.role || 'Administrator';
                if (user.picture) {
                    document.getElementById('user-avatar').src = user.picture;
                }

                // Update Inputs
                document.getElementById('profile-input-name').value = user.name;
                document.getElementById('profile-input-email').value = user.email;
                document.getElementById('profile-input-institution').value = user.institution || '';
                document.getElementById('profile-input-role').value = user.role || '';
            } else {
                showToast("Sesi kedaluwarsa. Silakan masuk kembali.", true);
                showLoginOverlay();
            }
        })
        .catch(() => showToast("Gagal memuat profil pengguna.", true))
        .finally(() => hideLoader());
}

// Sidebar Profile box redirect to #profile
document.querySelector('.user-profile').addEventListener('click', () => {
    window.location.hash = '#profile';
});

// Profile Picture (Avatar) Uploader Trigger and AJAX Submission
document.getElementById('avatar-uploader-container').addEventListener('click', () => {
    document.getElementById('profile-avatar-input').click();
});

document.getElementById('profile-avatar-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (max 2MB)
    const max_size = 2 * 1024 * 1024; // 2MB
    if (file.size > max_size) {
        showToast("Ukuran berkas terlalu besar. Maksimum batas ukuran adalah 2 MB.", true);
        e.target.value = "";
        return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    showLoader();
    fetch('/api/v1/auth/avatar', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            showToast(res.message || "Foto profil berhasil diperbarui.");
            const newUrl = res.data.picture;
            document.getElementById('profile-display-avatar').src = newUrl;
            document.getElementById('user-avatar').src = newUrl;
        } else {
            showToast(res.error || "Gagal mengunggah foto profil.", true);
        }
    })
    .catch(() => showToast("Terjadi kesalahan koneksi saat mengunggah foto profil.", true))
    .finally(() => {
        hideLoader();
        e.target.value = ""; // Reset so same file can be uploaded again
    });
});

// Profile Info Submission
document.getElementById('form-profile-info').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('profile-input-name').value;
    const email = document.getElementById('profile-input-email').value;
    const institution = document.getElementById('profile-input-institution').value;
    const role = document.getElementById('profile-input-role').value;

    showLoader();
    fetch('/api/v1/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, institution, role })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            showToast("Profil berhasil diperbarui!");
            // Sync user data
            const user = res.data;
            document.getElementById('profile-sidebar-name').textContent = user.name;
            document.getElementById('profile-sidebar-role').textContent = user.role;
            document.getElementById('profile-sidebar-institution').textContent = user.institution;
            
            document.getElementById('user-display-name').textContent = user.name;
            document.getElementById('user-display-role').textContent = user.role;
            
            // Re-trigger lucide icons reload
            if (window.lucide) {
                lucide.createIcons();
            }
        } else {
            showToast(res.error || "Gagal memperbarui profil.", true);
        }
    })
    .catch(() => showToast("Koneksi gagal saat memperbarui profil.", true))
    .finally(() => hideLoader());
});

// Change Password Submission
document.getElementById('form-change-password').addEventListener('submit', (e) => {
    e.preventDefault();
    const current_password = document.getElementById('profile-input-old-password').value;
    const new_password = document.getElementById('profile-input-new-password').value;
    const confirm_password = document.getElementById('profile-input-confirm-password').value;

    if (new_password.length < 6) {
        showToast("Kata sandi baru minimal harus 6 karakter.", true);
        return;
    }

    if (new_password !== confirm_password) {
        showToast("Konfirmasi kata sandi baru tidak cocok.", true);
        return;
    }

    showLoader();
    fetch('/api/v1/auth/change_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password, new_password })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            showToast("Kata sandi berhasil diubah!");
            document.getElementById('form-change-password').reset();
        } else {
            showToast(res.error || "Gagal mengubah kata sandi.", true);
        }
    })
    .catch(() => showToast("Koneksi gagal saat mengubah kata sandi.", true))
    .finally(() => hideLoader());
});

// Eye Toggle Helper Function
function setupPasswordToggle(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    if (input && button) {
        button.addEventListener('click', () => {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            button.innerHTML = isPassword 
                ? '<i data-lucide="eye-off" class="w-4 h-4"></i>' 
                : '<i data-lucide="eye" class="w-4 h-4"></i>';
            if (window.lucide) {
                lucide.createIcons();
            }
        });
    }
}

// Initialize Password toggles
setupPasswordToggle('profile-input-old-password', 'btn-toggle-old-password');
setupPasswordToggle('profile-input-new-password', 'btn-toggle-new-password');
setupPasswordToggle('profile-input-confirm-password', 'btn-toggle-confirm-password');


// --- DASHBOARD DATA & LIVE RESOURCES METRICS ---
function startResourcePolling() {
    if (STATE.resourcesInterval) return;
    
    STATE.resourcesInterval = setInterval(fetchSystemResources, 3000);
}

function stopResourcePolling() {
    if (STATE.resourcesInterval) {
        clearInterval(STATE.resourcesInterval);
        STATE.resourcesInterval = null;
    }
}

function fetchSystemResources() {
    fetch('/api/v1/system/resources')
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                const data = res.data;
                STATE.realGpuAvailable = !!data.real_gpu_available;
                updateResourceChart('cpu', data.cpu);
                updateResourceChart('ram', data.memory);
                updateResourceChart('disk', data.disk);
                

                if (data.gpu && data.gpu.available) {
                    updateResourceChart('gpu', data.gpu.memory_percent);
                    const memUsedGB = (data.gpu.memory_used / 1024).toFixed(1);
                    const memTotalGB = (data.gpu.memory_total / 1024).toFixed(0);
                    
                    const displayName = data.gpu.name || "NVIDIA L4 GPU";
                    document.getElementById('dash-gpu-meta').textContent = `VRAM: ${memUsedGB} GB / ${memTotalGB} GB`;
                    document.getElementById('dash-device-name').textContent = displayName;
                } else {
                    // GPU tidak tersedia / Fallback status
                    updateResourceChart('gpu', 0);
                    document.getElementById('dash-gpu-meta').textContent = "Running on Host Hypervisor Thread";
                    document.getElementById('dash-device-name').textContent = "GPU tidak tersedia";
                }
            }
        })
        .catch(err => console.error("Resource fetch failed", err));
}


function fetchDashboardSummary() {
    // Call datasets & jobs APIs to populate quick counts
    fetch('/api/v1/datasets')
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                document.getElementById('dash-dataset-count').textContent = res.data.length;
            }
        });
        
    fetch('/api/v1/experiments/jobs')
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                const jobs = res.data;
                const completedCount = jobs.filter(j => j.status === 'Completed').length;
                const activeJobs = jobs.filter(j => ['Preparing', 'Downloading Model', 'Training', 'Evaluating'].includes(j.status));
                
                document.getElementById('dash-model-count').textContent = completedCount;
                document.getElementById('dash-job-count').textContent = activeJobs.length;
                
                if (activeJobs.length > 0) {
                    document.getElementById('dash-job-subtext').innerHTML = `<span class="text-pink animated-pulse">${activeJobs.length} training berjalan</span>`;
                } else {
                    document.getElementById('dash-job-subtext').textContent = "Semua tugas selesai";
                }
                
                // Populate Dashboard Activity feed
                const list = document.getElementById('dash-activity-list');
                list.innerHTML = '';
                
                if (jobs.length === 0) {
                    list.innerHTML = '<div class="text-center py-6 text-rose-mauve text-xs">Belum ada eksperimen dilaunching.</div>';
                    return;
                }
                
                jobs.slice(0, 4).forEach(job => {
                    const elapsed = job.training_time ? `${Math.round(job.training_time)}s` : 'running';
                    const statusClass = job.status === 'Completed' ? 'badge-success' : (job.status === 'Failed' ? 'badge-danger' : 'badge-warning');
                    
                    const item = document.createElement('div');
                    item.className = 'timeline-item';
                    item.innerHTML = `
                        <div class="timeline-icon-dot" style="background: ${job.status === 'Completed' ? 'var(--primary-pink)' : (job.status === 'Failed' ? 'var(--red)' : 'var(--dusty-purple)')}"></div>
                        <div class="timeline-details text-xs">
                            <div class="flex justify-between font-bold text-dark">
                                <span>${job.exp_name} (${job.model_type.toUpperCase()})</span>
                                <span class="badge ${statusClass}">${job.status}</span>
                            </div>
                            <p class="text-rose-mauve mt-1">Dataset: ${job.dataset_name} • Duration: ${elapsed}</p>
                        </div>
                    `;
                    list.appendChild(item);
                });
            }
        });
}


// --- DATASET MANAGER INTERACTION ---
function fetchDatasetsList() {
    fetch('/api/v1/datasets')
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                STATE.datasets = res.data;
                
                // Render Dataset Selector dropdowns on Model Training
                const dropdown = document.getElementById('train-dataset');
                dropdown.innerHTML = '<option value="">-- Pilih Dataset --</option>';
                
                const testDropdown = document.getElementById('train-test-dataset');
                testDropdown.innerHTML = '<option value="">-- Pilih Dataset Uji --</option>';
                
                const valDropdown = document.getElementById('train-val-dataset');
                valDropdown.innerHTML = '<option value="">-- Tanpa Validasi (Opsional) --</option>';
                
                STATE.datasets.forEach(d => {
                    const opt = `<option value="${d.id}">${d.name} (${d.total_samples} baris)</option>`;
                    dropdown.innerHTML += opt;
                    testDropdown.innerHTML += opt;
                    valDropdown.innerHTML += opt;
                });
                
                // Render Datasets Table
                const tbody = document.getElementById('dataset-table-body');
                tbody.innerHTML = '';
                
                if (STATE.datasets.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-rose-mauve py-6">Belum ada dataset diunggah. Unggah CSV baru di samping.</td></tr>';
                    return;
                }
                
                STATE.datasets.forEach(dataset => {
                    const date = new Date(dataset.uploaded_at).toLocaleString();
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="font-semibold text-dark">${dataset.name}</td>
                        <td>${dataset.total_samples} baris</td>
                        <td>${date}</td>
                        <td><code class="text-xs bg-warm-gray p-1 rounded font-mono">${dataset.file_hash.substring(0, 12)}...</code></td>
                        <td>
                            <button class="btn btn-primary btn-sm mr-1" onclick="inspectDataset(${dataset.id})" title="Inspeksi Dataset"><i data-lucide="eye" class="inline w-3 h-3 mr-1"></i>Inspeksi</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteDataset(${dataset.id}, '${dataset.name}')" title="Hapus Dataset"><i data-lucide="trash-2" class="inline w-3 h-3"></i></button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
                lucide.createIcons();
            }
        });
}

// Drag & drop file upload bindings
const dropzone = document.getElementById('dataset-dropzone');
const fileInput = document.getElementById('file-input');

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--primary-pink)';
    dropzone.style.backgroundColor = 'var(--soft-pink)';
});

dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'rgba(255, 123, 167, 0.3)';
    dropzone.style.backgroundColor = 'var(--blush)';
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'rgba(255, 123, 167, 0.3)';
    dropzone.style.backgroundColor = 'var(--blush)';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        uploadDatasetFile(files[0]);
    }
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        uploadDatasetFile(fileInput.files[0]);
    }
});

function uploadDatasetFile(file) {
    if (!file.name.endsWith('.csv')) {
        showToast("Format berkas harus berekstensi .csv", true);
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const progressContainer = document.getElementById('upload-progress-container');
    const progressFill = document.getElementById('upload-fill');
    const progressPct = document.getElementById('upload-pct');
    
    progressContainer.classList.remove('hidden');
    progressFill.style.width = '0%';
    progressPct.textContent = '0%';
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/v1/datasets', true);
    
    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            progressFill.style.width = pct + '%';
            progressPct.textContent = pct + '%';
        }
    };
    
    xhr.onload = function() {
        progressContainer.classList.add('hidden');
        const res = JSON.parse(xhr.responseText);
        
        if (xhr.status === 200 && res.success) {
            showToast("Dataset berhasil diunggah!");
            fetchDatasetsList();
        } else {
            showToast(res.error || "Gagal mengunggah dataset.", true);
        }
    };
    
    xhr.onerror = function() {
        progressContainer.classList.add('hidden');
        showToast("Jaringan bermasalah.", true);
    };
    
    xhr.send(formData);
}

function inspectDataset(id) {
    const dataset = STATE.datasets.find(d => d.id === id);
    if (!dataset) return;
    
    document.getElementById('preview-dataset-name').textContent = dataset.name;
    document.getElementById('dataset-details-panel').classList.remove('hidden');
    
    // Fetch preview 10 rows
    fetch(`/api/v1/datasets/${id}/preview`)
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                const tbody = document.getElementById('dataset-preview-rows');
                tbody.innerHTML = '';
                
                res.data.forEach(row => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="text-xs text-rose-mauve text-wrap" style="max-width: 300px; word-break: break-word;">${row.text}</td>
                        <td class="font-bold text-dark text-xs">${row.label}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        });
        
    // Render distributions chart in charts.js
    renderDatasetDonut(dataset.class_distribution);
}

async function deleteDataset(id, name) {
    const title = "Hapus Dataset?";
    const msg = `Apakah Anda yakin ingin menghapus dataset "${name}"?`;
    const submsg = "Tindakan ini bersifat DESTRUKTIF dan akan menghapus semua eksperimen, model (.pkl), logs, evaluasi, serta hasil statistik McNemar yang terkait.";
    const confirmed = await showCustomConfirm(title, msg, submsg, "Ya, Hapus", "Batal", true);
    
    if (confirmed) {
        showLoader();
        fetch(`/api/v1/datasets/${id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    showToast("Dataset dan aset terkait berhasil dihapus.");
                    fetchDatasetsList();
                    // Hide details panel if it was showing this dataset
                    document.getElementById('dataset-details-panel').classList.add('hidden');
                } else {
                    showToast(res.error || "Gagal menghapus dataset.", true);
                }
            })
            .catch(() => showToast("Koneksi ke backend bermasalah.", true))
            .finally(() => hideLoader());
    }
}


// --- PREPROCESSING LAB WORKFLOW ---
document.getElementById('btn-run-preprocess').addEventListener('click', () => {
    const text = document.getElementById('preprocess-input').value;
    if (!text.trim()) {
        showToast("Kalimat uji tidak boleh kosong.", true);
        return;
    }
    
    showLoader();
    fetch('/api/v1/preprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            const data = res.data;
            
            // Render terminal steps elegantly with slight delays to feel real
            document.getElementById('term-raw').textContent = `"${data.raw}"`;
            
            const steps = [
                { id: 'term-casefolded', val: `"${data.case_folded}"` },
                { id: 'term-tokens', val: JSON.stringify(data.tokens) },
                { id: 'term-stopwords', val: JSON.stringify(data.filtered_tokens) },
                { id: 'term-processed', val: `"${data.processed}"` }
            ];
            
            steps.forEach((step, idx) => {
                const element = document.getElementById(step.id);
                element.textContent = "Processing...";
                
                setTimeout(() => {
                    element.textContent = step.val;
                }, (idx + 1) * 350); // delay step presentation
            });
        } else {
            showToast(res.error || "Gagal memproses teks.", true);
        }
    })
    .catch(() => showToast("Connection failed.", true))
    .finally(() => hideLoader());
});


// --- BERT PREPROCESSING LAB WORKFLOW ---
document.getElementById('btn-run-preprocess-bert').addEventListener('click', () => {
    const text = document.getElementById('preprocess-bert-input').value;
    if (!text.trim()) {
        showToast("Kalimat uji tidak boleh kosong.", true);
        return;
    }
    
    showLoader();
    fetch('/api/v1/preprocess/bert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            const data = res.data;
            // Clear old outputs first
            document.getElementById('bert-step-3').style.display = 'none';
            document.getElementById('bert-step-4').style.display = 'none';
            document.getElementById('bert-term-tokens').innerHTML = '';
            document.getElementById('bert-term-table-body').innerHTML = '';
            document.getElementById('bert-term-tensor-ids').textContent = '-';

            // Step 0 raw text
            document.getElementById('bert-term-raw').textContent = `"${data.raw}"`;
            
            // Step 1 normalized text (text_minimal)
            const normalizedEl = document.getElementById('bert-term-normalized');
            normalizedEl.textContent = "Processing...";
            setTimeout(() => {
                normalizedEl.textContent = `"${data.normalized}"`;
            }, 300);
            
            // Step 2 final preprocessed text
            const processedEl = document.getElementById('bert-term-processed');
            processedEl.textContent = "Finalizing...";
            setTimeout(() => {
                processedEl.textContent = `"${data.normalized}"`;
            }, 600);

            // Step 3 WordPiece Subword tokens
            setTimeout(() => {
                document.getElementById('bert-step-3').style.display = 'flex';
                const tokensContainer = document.getElementById('bert-term-tokens');
                data.tokens.forEach(tok => {
                    const badge = document.createElement('span');
                    badge.style.padding = '4px 8px';
                    badge.style.margin = '4px';
                    badge.style.borderRadius = '6px';
                    badge.style.fontSize = '12px';
                    badge.style.fontFamily = 'monospace';
                    badge.style.fontWeight = 'bold';
                    badge.style.display = 'inline-block';
                    
                    if (tok.startsWith('##')) {
                        badge.style.backgroundColor = 'rgba(236, 72, 153, 0.12)';
                        badge.style.color = '#ec4899';
                        badge.style.border = '1px solid rgba(236, 72, 153, 0.25)';
                    } else if (tok === '[CLS]' || tok === '[SEP]' || tok === '[PAD]') {
                        badge.style.backgroundColor = 'rgba(139, 92, 246, 0.12)';
                        badge.style.color = '#8b5cf6';
                        badge.style.border = '1px solid rgba(139, 92, 246, 0.25)';
                    } else {
                        badge.style.backgroundColor = 'rgba(16, 185, 129, 0.12)';
                        badge.style.color = '#10b981';
                        badge.style.border = '1px solid rgba(16, 185, 129, 0.25)';
                    }
                    badge.textContent = tok;
                    tokensContainer.appendChild(badge);
                });
            }, 900);

            // Step 4 Tensor map & Padded IDs
            setTimeout(() => {
                document.getElementById('bert-step-4').style.display = 'flex';
                const tableBody = document.getElementById('bert-term-table-body');
                
                data.tokens.forEach((tok, idx) => {
                    const id = data.token_ids[idx];
                    const mask = data.attention_mask[idx];
                    
                    const row = document.createElement('tr');
                    row.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
                    row.innerHTML = `
                        <td style="padding: 6px 12px; font-family: monospace; color: var(--text-muted);">${idx}</td>
                        <td style="padding: 6px 12px; font-weight: bold; color: ${tok.startsWith('##') ? '#ec4899' : (tok.startsWith('[') ? '#8b5cf6' : 'var(--text-dark)')}">${tok}</td>
                        <td style="padding: 6px 12px; text-align: right; font-family: monospace; color: #d53f8c;">${id}</td>
                        <td style="padding: 6px 12px; text-align: center; font-family: monospace;"><span style="background-color: ${mask === 1 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${mask === 1 ? '#10b981' : '#ef4444'}; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${mask}</span></td>
                    `;
                    tableBody.appendChild(row);
                });
                
                document.getElementById('bert-term-tensor-ids').textContent = `[${data.padded_token_ids.join(', ')}]`;
            }, 1200);
            
        } else {
            showToast(res.error || "Gagal memproses teks untuk BERT.", true);
        }
    })
    .catch(() => showToast("Connection failed.", true))
    .finally(() => hideLoader());
});


// --- MODEL TRAINING PIPELINE ---
// Update hyperparams input forms visibility on selection
document.getElementById('train-model-type').addEventListener('change', (e) => {
    const type = e.target.value;
    document.querySelectorAll('.hyperparams-section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById(`params-${type}`).classList.remove('hidden');
});

// Toggle split configuration container based on selected split method
document.querySelectorAll('input[name="split-method"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const method = e.target.value;
        if (method === 'dynamic') {
            document.getElementById('split-dynamic-container').classList.remove('hidden');
            document.getElementById('split-external-container').classList.add('hidden');
        } else {
            document.getElementById('split-dynamic-container').classList.add('hidden');
            document.getElementById('split-external-container').classList.remove('hidden');
        }
    });
});

// Update dynamic test size percent label on change
document.getElementById('train-test-size').addEventListener('input', (e) => {
    document.getElementById('train-test-size-val').textContent = e.target.value + '%';
});

document.getElementById('form-train').addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (STATE.activeJobId) {
        showToast("Ada proses pelatihan model yang sedang berjalan. Silakan tunggu hingga selesai.", true);
        return;
    }
    
    const name = document.getElementById('train-name').value;
    const dataset_val = document.getElementById('train-dataset').value;
    const model_type = document.getElementById('train-model-type').value;
    const random_seed = parseInt(document.getElementById('train-seed').value);
    
    // Client-side validations
    if (!name || !name.trim()) {
        showToast("Nama eksperimen tidak boleh kosong.", true);
        return;
    }
    
    if (!dataset_val) {
        showToast("Silakan pilih dataset terlebih dahulu. Jika belum ada dataset, silakan unggah di menu Dataset Manager.", true);
        return;
    }
    
    const dataset_id = parseInt(dataset_val);
    if (isNaN(dataset_id)) {
        showToast("Dataset ID tidak valid.", true);
        return;
    }
    
    if (isNaN(random_seed)) {
        showToast("Random Seed harus berupa angka.", true);
        return;
    }
    
    // Extract and validate split_config
    const splitMethod = document.querySelector('input[name="split-method"]:checked').value;
    let split_config = { method: splitMethod };
    
    if (splitMethod === 'dynamic') {
        const testSizeVal = parseInt(document.getElementById('train-test-size').value);
        split_config.test_size = testSizeVal / 100;
    } else {
        const testDatasetVal = document.getElementById('train-test-dataset').value;
        const valDatasetVal = document.getElementById('train-val-dataset').value;
        
        if (!testDatasetVal) {
            showToast("Silakan pilih dataset uji (test set) untuk metode split eksternal.", true);
            return;
        }
        
        split_config.test_dataset_id = parseInt(testDatasetVal);
        if (valDatasetVal) {
            split_config.val_dataset_id = parseInt(valDatasetVal);
        }
    }
    
    // Extract and validate parameters based on model type
    let parameters = {};
    if (model_type === 'naive_bayes') {
        const alpha_val = parseFloat(document.getElementById('param-alpha').value);
        if (isNaN(alpha_val) || alpha_val < 0) {
            showToast("Alpha (Smoothing) harus berupa angka positif.", true);
            return;
        }
        parameters.alpha = alpha_val;
    } else if (model_type === 'svm') {
        const kernel_val = document.getElementById('param-kernel').value;
        const c_val = parseFloat(document.getElementById('param-c').value);
        const gamma_val = document.getElementById('param-gamma').value;
        
        if (isNaN(c_val) || c_val <= 0) {
            showToast("Nilai C (Regularization) harus berupa angka positif lebih besar dari 0.", true);
            return;
        }
        parameters.kernel = kernel_val;
        parameters.C = c_val;
        parameters.gamma = gamma_val;
    } else if (model_type === 'indobert') {
        if (!STATE.realGpuAvailable) {
            showCustomAlert(
                "Akselerasi GPU Tidak Tersedia",
                "Pelatihan model IndoBERT tidak dapat dilakukan di server lokal ini karena hardware GPU (CUDA) tidak terdeteksi oleh PyTorch.",
                "Silakan unggah dan jalankan notebook 'run_server_colab.ipynb' di Google Colab untuk memanfaatkan akselerasi GPU (NVIDIA T4/L4) secara gratis."
            );
            return;
        }
        
        const lr_val = parseFloat(document.getElementById('param-lr').value);
        const epoch_val = parseInt(document.getElementById('param-epochs').value);
        const batch_val = parseInt(document.getElementById('param-batch').value);
        const max_len_val = parseInt(document.getElementById('param-max-len').value);
        
        if (isNaN(lr_val) || lr_val <= 0) {
            showToast("Learning rate harus berupa angka positif lebih besar dari 0.", true);
            return;
        }
        if (isNaN(epoch_val) || epoch_val < 1) {
            showToast("Jumlah epoch minimal 1.", true);
            return;
        }
        if (isNaN(batch_val) || batch_val < 2) {
            showToast("Batch size minimal 2.", true);
            return;
        }
        if (isNaN(max_len_val) || max_len_val < 16) {
            showToast("Max length minimal 16.", true);
            return;
        }
        
        parameters.learning_rate = lr_val;
        parameters.epoch = epoch_val;
        parameters.batch_size = batch_val;
        parameters.max_length = max_len_val;
    }
    
    showLoader();
    fetch('/api/v1/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, dataset_id, model_type, parameters, random_seed, split_config })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            showToast("Eksperimen dimulai!");
            STATE.activeJobId = res.data.job_id;
            
            // Instantly reset UI state to avoid remnants of previous jobs
            document.getElementById('console-terminal').innerHTML = '<p class="console-line text-rose-mauve">// Menginisialisasi aliran logs...</p>';
            document.getElementById('active-job-pct').textContent = '0%';
            document.getElementById('active-job-progress-fill').style.width = '0%';
            document.getElementById('active-job-name').textContent = `Eksperimen: ${name}`;
            document.getElementById('active-job-type').textContent = `Algoritma: ${model_type.toUpperCase()}`;
            document.getElementById('active-job-step').textContent = 'Preparing';
            document.getElementById('active-job-time').textContent = 'Waktu Latih: 0s';
            
            // clear form
            document.getElementById('train-name').value = '';
            
            // transition view states
            document.getElementById('no-active-job-state').classList.add('hidden');
            document.getElementById('active-job-state').classList.remove('hidden');
            
            // Poll for logs and progress
            startTrainingJobPolling(STATE.activeJobId);
            fetchJobsHistory();
        } else {
            showToast(res.error || "Gagal menjalankan eksperimen.", true);
        }
    })
    .catch(() => showToast("Connection error.", true))
    .finally(() => hideLoader());
});

function checkActiveRunningJob() {
    fetch('/api/v1/experiments/jobs')
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                const runningJob = res.data.find(j => ['Preparing', 'Downloading Model', 'Training', 'Evaluating'].includes(j.status));
                if (runningJob) {
                    STATE.activeJobId = runningJob.id;
                    document.getElementById('no-active-job-state').classList.add('hidden');
                    document.getElementById('active-job-state').classList.remove('hidden');
                    startTrainingJobPolling(runningJob.id);
                }
            }
        });
}

function startTrainingJobPolling(jobId) {
    if (STATE.logsInterval) clearInterval(STATE.logsInterval);
    
    const timerText = document.getElementById('active-job-time');
    
    const poll = () => {
        // 1. Fetch Job Progress
        fetch(`/api/v1/experiments/jobs/${jobId}`)
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    const job = res.data;
                    document.getElementById('active-job-name').textContent = `Eksperimen: ${job.exp_name}`;
                    document.getElementById('active-job-type').textContent = `Algoritma: ${job.model_type.toUpperCase()}`;
                    document.getElementById('active-job-step').textContent = job.status;
                    document.getElementById('active-job-pct').textContent = job.progress + '%';
                    document.getElementById('active-job-progress-fill').style.width = job.progress + '%';
                    
                    // Update timer from server-calculated elapsed time
                    const seconds = job.elapsed_seconds || 0;
                    const mins = Math.floor(seconds / 60);
                    const secs = seconds % 60;
                    timerText.textContent = `Waktu Latih: ${mins > 0 ? mins + 'm ' : ''}${secs}s`;
                    
                    // Trigger history table refresh to keep progress bars real-time
                    fetchJobsHistory();
                    
                    // If job completed or failed, stop polling
                    if (!['Preparing', 'Downloading Model', 'Training', 'Evaluating'].includes(job.status)) {
                        if (STATE.logsInterval) {
                            clearInterval(STATE.logsInterval);
                            STATE.logsInterval = null;
                        }
                        STATE.activeJobId = null;
                        
                        showToast(`Pekerjaan selesai dengan status: ${job.status}`);
                        
                        // Show finished state message, trigger refresh
                        setTimeout(() => {
                            document.getElementById('no-active-job-state').classList.remove('hidden');
                            document.getElementById('active-job-state').classList.add('hidden');
                            fetchJobsHistory();
                        }, 2000);
                    }
                }
            });
            
        // 2. Fetch Live Console Logs
        fetch(`/api/v1/experiments/jobs/${jobId}/logs`)
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    const terminal = document.getElementById('console-terminal');
                    terminal.innerHTML = '';
                    
                    if (res.data.length === 0) {
                        terminal.innerHTML = '<p class="console-line text-rose-mauve">// Menginisialisasi aliran logs...</p>';
                        return;
                    }
                    
                    res.data.forEach(line => {
                        const levelClass = line.level === 'ERROR' ? 'text-error' : (line.level === 'WARNING' ? 'text-warn' : 'text-info');
                        const p = document.createElement('p');
                        p.className = `console-line ${levelClass}`;
                        p.textContent = `[${line.timestamp.substring(11, 19)}] [${line.level}] [${line.event_type}] ${line.message}`;
                        terminal.appendChild(p);
                    });
                    
                    // Auto Scroll console terminal to bottom
                    terminal.scrollTop = terminal.scrollHeight;
                }
            });
    };
    
    // Execute poll immediately
    poll();
    
    // Poll logs & progress status every 1.5 seconds
    STATE.logsInterval = setInterval(() => {
        poll();
    }, 1500);
}

// Cancel job binder
document.getElementById('btn-cancel-job').addEventListener('click', () => {
    if (!STATE.activeJobId) return;
    
    fetch(`/api/v1/experiments/jobs/${STATE.activeJobId}/cancel`, { method: 'POST' })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                showToast("Sinyal pembatalan dikirim.");
            } else {
                showToast(res.error || "Gagal membatalkan pekerjaan.", true);
            }
        });
});

function fetchJobsHistory() {
    fetch('/api/v1/experiments/jobs')
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                STATE.jobs = res.data;
                const tbody = document.getElementById('jobs-table-body');
                tbody.innerHTML = '';
                
                if (STATE.jobs.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-rose-mauve py-6">Belum ada riwayat training.</td></tr>';
                    return;
                }
                
                STATE.jobs.forEach(job => {
                    const date = new Date(job.started_at).toLocaleString();
                    const duration = job.training_time ? `${Math.round(job.training_time)} detik` : 'running';
                    const progressStyle = `width: ${job.progress}%`;
                    const statusClass = job.status === 'Completed' ? 'badge-success' : (job.status === 'Failed' ? 'badge-danger' : (job.status === 'Cancelled' ? 'badge-neutral' : 'badge-warning'));
                    
                    const isRunning = ['Preparing', 'Downloading Model', 'Training', 'Evaluating'].includes(job.status);
                    let actionHtml = '';
                    if (isRunning) {
                        actionHtml = `<button class="btn btn-danger btn-sm" onclick="cancelJobHistory(${job.id})" title="Batalkan Training"><i data-lucide="x-circle" class="inline w-3.5 h-3.5 mr-1"></i>Batalkan</button>`;
                    } else {
                        if (job.status === 'Completed') {
                            actionHtml += `<button class="btn btn-primary btn-sm mr-1" onclick="location.hash='#evaluations'; inspectModel(${job.id})" title="Evaluasi & Inspeksi"><i data-lucide="award" class="inline w-3 h-3"></i></button>`;
                        }
                        actionHtml += `<button class="btn btn-danger btn-sm" onclick="deleteJobHistory(${job.id})" title="Hapus Riwayat"><i data-lucide="trash-2" class="inline w-3 h-3"></i></button>`;
                    }
                        
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="font-bold text-xs">${job.id}</td>
                        <td class="font-semibold text-dark">${job.exp_name}</td>
                        <td>${job.dataset_name}</td>
                        <td><span class="badge badge-neutral">${job.model_type.toUpperCase()}</span></td>
                        <td>${duration}</td>
                        <td>
                            <div class="progress-track" style="height:4px; max-width:80px">
                                <div class="progress-fill" style="${progressStyle}"></div>
                            </div>
                        </td>
                        <td><span class="badge ${statusClass}">${job.status}</span></td>
                        <td class="text-xs text-rose-mauve">${date}</td>
                        <td class="text-center">${actionHtml}</td>
                    `;
                    tbody.appendChild(tr);
                });
                lucide.createIcons();
            }
        });
}

async function cancelJobHistory(id) {
    const title = "Batalkan Training?";
    const msg = `Apakah Anda yakin ingin membatalkan proses pelatihan untuk Pekerjaan ID: ${id}?`;
    const confirmed = await showCustomConfirm(title, msg, '', "Ya, Batalkan", "Batal", true);
    
    if (confirmed) {
        showLoader();
        fetch(`/api/v1/experiments/jobs/${id}/cancel`, { method: 'POST' })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    showToast("Sinyal pembatalan terkirim.");
                    fetchJobsHistory();
                } else {
                    showToast(res.error || "Gagal membatalkan pelatihan.", true);
                }
            })
            .catch(() => showToast("Koneksi bermasalah.", true))
            .finally(() => hideLoader());
    }
}

async function deleteJobHistory(id) {
    const title = "Hapus Riwayat Training?";
    const msg = `Apakah Anda yakin ingin menghapus riwayat pelatihan ID: ${id}?`;
    const submsg = "Tindakan ini akan menghapus riwayat log database, biner model (.pkl), dan log teks di disk secara permanen.";
    const confirmed = await showCustomConfirm(title, msg, submsg, "Ya, Hapus", "Batal", true);
    
    if (confirmed) {
        showLoader();
        fetch(`/api/v1/experiments/jobs/${id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    showToast("Riwayat training berhasil dihapus.");
                    fetchJobsHistory();
                    fetchDashboardSummary(); // refresh counters
                } else {
                    showToast(res.error || "Gagal menghapus riwayat training.", true);
                }
            })
            .catch(() => showToast("Koneksi ke backend bermasalah.", true))
            .finally(() => hideLoader());
    }
}


// --- EVALUATIONS LAB INSPECTOR ---
function fetchRankingsList() {
    fetch('/api/v1/evaluations')
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                const evals = res.data;
                
                // Sort by F1 descending to create a true research leaderboard
                evals.sort((a, b) => b.macro_f1 - a.macro_f1);
                
                const tbody = document.getElementById('rankings-table-body');
                tbody.innerHTML = '';
                
                if (evals.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-rose-mauve py-6">Belum ada model terevaluasi. Selesaikan training model terlebih dahulu.</td></tr>';
                    return;
                }
                
                evals.forEach((ev, idx) => {
                    const acc = (ev.accuracy * 100).toFixed(2) + "%";
                    const f1 = (ev.macro_f1 * 100).toFixed(2) + "%";
                    const prec = (ev.precision * 100).toFixed(2) + "%";
                    const rec = (ev.recall * 100).toFixed(2) + "%";
                    
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="font-bold text-xs">${ev.experiment_job_id}</td>
                        <td class="font-semibold text-dark">${ev.exp_name}</td>
                        <td><span class="badge badge-neutral">${ev.model_type.toUpperCase()}</span></td>
                        <td class="font-bold text-dark">${acc}</td>
                        <td>${prec}</td>
                        <td>${rec}</td>
                        <td class="font-bold text-pink">${f1}</td>
                        <td>
                            <button class="btn btn-primary btn-sm" onclick="inspectModel(${ev.experiment_job_id})"><i data-lucide="zoom-in" class="inline w-3 h-3 mr-1"></i>Inspeksi</button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
                lucide.createIcons();
                
                // Render ranking leaderboard charts
                renderModelComparisons(evals);
            }
        });
}

function inspectModel(jobId) {
    showLoader();
    fetch(`/api/v1/experiments/jobs/${jobId}`)
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data.evaluation) {
                const job = res.data;
                const ev = job.evaluation;
                
                document.getElementById('no-eval-selected').classList.add('hidden');
                document.getElementById('eval-selected-panel').classList.remove('hidden');
                
                document.getElementById('inspect-model-name').textContent = job.exp_name;
                document.getElementById('inspect-model-type').textContent = `Algoritma: ${job.model_type.toUpperCase()} • Duration: ${Math.round(job.training_time)}s`;
                document.getElementById('inspect-acc').textContent = (ev.accuracy * 100).toFixed(2) + "%";
                document.getElementById('inspect-f1').textContent = (ev.macro_f1 * 100).toFixed(2) + "%";
                
                // Build confusion matrix
                const cm = ev.confusion_matrix;
                const classes = ev.classification_report;
                const classLabels = Object.keys(classes).filter(k => !['accuracy', 'macro avg', 'weighted avg'].includes(k));
                
                const matrixContainer = document.getElementById('confusion-matrix-container');
                matrixContainer.innerHTML = '';
                
                // Set grid matrix column count CSS variable
                matrixContainer.style.setProperty('--matrix-cols', classLabels.length);
                
                // Calculate max cell value to scale gradients
                const maxVal = Math.max(...cm.flat());
                
                for (let r = 0; r < classLabels.length; r++) {
                    for (let c = 0; r < cm.length && c < cm[r].length && c < classLabels.length; c++) {
                        const cellVal = cm[r][c];
                        // scale pink color opacity based on cell weight density
                        const opacity = maxVal > 0 ? (cellVal / maxVal) * 0.85 + 0.15 : 0.1;
                        const cellBg = `background-color: rgba(255, 123, 167, ${opacity})`;
                        
                        const cell = document.createElement('div');
                        cell.className = 'matrix-cell';
                        cell.style = cellBg;
                        cell.innerHTML = `
                            <span>${cellVal}</span>
                            <span class="matrix-cell-label">${classLabels[r]} → ${classLabels[c]}</span>
                        `;
                        matrixContainer.appendChild(cell);
                    }
                }
                
                // Build classification report table
                const tbody = document.getElementById('classification-report-tbody');
                tbody.innerHTML = '';
                
                const classKeys = Object.keys(classes).filter(k => !['accuracy', 'macro avg', 'weighted avg'].includes(k));
                
                // Calculate total support
                let totalSupport = 0;
                classKeys.forEach(k => {
                    totalSupport += Math.round(classes[k].support || 0);
                });

                // 1. Individual classes (negative, neutral, positive)
                classKeys.forEach(k => {
                    const rowData = classes[k];
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="font-medium">${k}</td>
                        <td class="text-right">${rowData.precision.toFixed(4)}</td>
                        <td class="text-right">${rowData.recall.toFixed(4)}</td>
                        <td class="text-right">${rowData['f1-score'].toFixed(4)}</td>
                        <td class="text-right">${Math.round(rowData.support)}</td>
                    `;
                    tbody.appendChild(tr);
                });
                
                // 2. Accuracy
                const accVal = classes.accuracy;
                if (accVal !== undefined) {
                    const trAcc = document.createElement('tr');
                    trAcc.innerHTML = `
                        <td class="font-medium">accuracy</td>
                        <td class="text-right"></td>
                        <td class="text-right"></td>
                        <td class="text-right">${accVal.toFixed(4)}</td>
                        <td class="text-right">${totalSupport}</td>
                    `;
                    tbody.appendChild(trAcc);
                }
                
                // 3. Macro Avg
                const macroVal = classes['macro avg'];
                if (macroVal) {
                    const trMacro = document.createElement('tr');
                    trMacro.innerHTML = `
                        <td class="font-medium">macro avg</td>
                        <td class="text-right">${macroVal.precision.toFixed(4)}</td>
                        <td class="text-right">${macroVal.recall.toFixed(4)}</td>
                        <td class="text-right">${macroVal['f1-score'].toFixed(4)}</td>
                        <td class="text-right">${Math.round(macroVal.support)}</td>
                    `;
                    tbody.appendChild(trMacro);
                }
                
                // 4. Weighted Avg
                const weightedVal = classes['weighted avg'];
                if (weightedVal) {
                    const trWeighted = document.createElement('tr');
                    trWeighted.innerHTML = `
                        <td class="font-medium">weighted avg</td>
                        <td class="text-right">${weightedVal.precision.toFixed(4)}</td>
                        <td class="text-right">${weightedVal.recall.toFixed(4)}</td>
                        <td class="text-right">${weightedVal['f1-score'].toFixed(4)}</td>
                        <td class="text-right">${Math.round(weightedVal.support)}</td>
                    `;
                    tbody.appendChild(trWeighted);
                }
            } else {
                showToast("Evaluasi model tidak ditemukan.", true);
            }
        })
        .finally(() => hideLoader());
}


// --- MCNEMAR SIGNIFICANCE LAB ---
function fetchModelsDropdowns(dropdownIds) {
    fetch('/api/v1/experiments/jobs')
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                const completedJobs = res.data.filter(j => j.status === 'Completed' && j.model_artifact_path && j.artifact_lifecycle !== 'Deleted');
                
                dropdownIds.forEach(ddId => {
                    const select = document.getElementById(ddId);
                    if (!select) return;
                    select.innerHTML = `<option value="">-- Pilih Model --</option>`;
                    completedJobs.forEach(job => {
                        select.innerHTML += `<option value="${job.id}">${job.exp_name} [${job.model_type.toUpperCase()}] (Dataset: ${job.dataset_name})</option>`;
                    });
                });
            }
        });
}

document.getElementById('form-mcnemar').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const model_a_job_id = parseInt(document.getElementById('mcnemar-model-a').value);
    const model_b_job_id = parseInt(document.getElementById('mcnemar-model-b').value);
    
    if (model_a_job_id === model_b_job_id) {
        showToast("Pilih dua model berbeda untuk dibandingkan.", true);
        return;
    }
    
    showLoader();
    fetch('/api/v1/evaluations/mcnemar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_a_job_id, model_b_job_id })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            const data = res.data;
            document.getElementById('no-mcnemar-state').classList.add('hidden');
            document.getElementById('mcnemar-result-state').classList.remove('hidden');
            
            // Populate Contingency matrix
            const cm = data.contingency_matrix;
            document.getElementById('mc-n00').textContent = cm[0][0];
            document.getElementById('mc-n01').textContent = cm[0][1];
            document.getElementById('mc-n10').textContent = cm[1][0];
            document.getElementById('mc-n11').textContent = cm[1][1];
            
            // Format P-Value
            const pVal = data.p_value;
            let pValStr = "";
            if (pVal === 0) {
                pValStr = "0.0 (0)";
            } else if (pVal < 0.0001) {
                const decimals = Math.max(6, -Math.floor(Math.log10(pVal)) + 2);
                pValStr = `${pVal.toFixed(decimals)} (${pVal.toExponential(2)})`;
            } else {
                pValStr = pVal.toFixed(6);
            }
            document.getElementById('mc-p-value').textContent = pValStr;
            
            const card = document.getElementById('mc-sig-card');
            const conclusion = document.getElementById('mc-conclusion');
            const explanation = document.getElementById('mc-explanation-text');
            
            if (data.significant) {
                card.className = "mcnemar-status-card significant text-center p-4 rounded-xl mb-4";
                conclusion.textContent = "Signifikan Secara Statistik (p < 0.05)";
                explanation.innerHTML = `Model memiliki tingkat performa yang <strong>berbeda secara signifikan</strong>. Hipotesis nol (H0) ditolak, yang berarti perbedaan akurasi antara Model A dan Model B bukan merupakan kebetulan belaka melainkan didukung oleh bukti statistik yang kuat.`;
            } else {
                card.className = "mcnemar-status-card not-significant text-center p-4 rounded-xl mb-4";
                conclusion.textContent = "Tidak Signifikan (p >= 0.05)";
                explanation.innerHTML = `Kedua model memiliki performa yang <strong>setara secara statistik</strong>. Hipotesis nol (H0) gagal ditolak, yang berarti variasi performa di antara mereka kemungkinan besar disebabkan oleh noise sampling acak saja.`;
            }
        } else {
            showToast(res.error || "Gagal membandingkan model.", true);
        }
    })
    .catch(() => showToast("Connection failed.", true))
    .finally(() => hideLoader());
});


// --- INFERENCE & PREDICTION SERVICE LAB ---
document.getElementById('btn-run-prediction').addEventListener('click', () => {
    const job_id = parseInt(document.getElementById('pred-model').value);
    const text = document.getElementById('pred-input-text').value;
    
    if (!job_id) {
        showToast("Silakan pilih model aktif.", true);
        return;
    }
    if (!text.trim()) {
        showToast("Masukkan kalimat yang ingin diprediksi.", true);
        return;
    }
    
    showLoader();
    fetch('/api/v1/predict/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id, text })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            const data = res.data;
            document.getElementById('pred-output-container').classList.remove('hidden');
            document.getElementById('pred-label').textContent = data.label;
            document.getElementById('pred-confidence').textContent = (data.confidence * 100).toFixed(2) + "%";
            
            // Render probabilities bar chart
            renderPredictionProbabilities(data.probabilities);
        } else {
            showToast(res.error || "Gagal menjalankan prediksi.", true);
        }
    })
    .catch(() => showToast("Connection failed.", true))
    .finally(() => hideLoader());
});

document.getElementById('btn-batch-prediction').addEventListener('click', () => {
    const job_id = parseInt(document.getElementById('batch-pred-model').value);
    const file = document.getElementById('batch-file-input').files[0];
    
    if (!job_id) {
        showToast("Pilih model terlatih.", true);
        return;
    }
    if (!file) {
        showToast("Unggah file CSV terlebih dahulu.", true);
        return;
    }
    
    const formData = new FormData();
    formData.append('job_id', job_id);
    formData.append('file', file);
    
    showLoader();
    fetch('/api/v1/predict/batch', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            const data = res.data;
            showToast("Batch prediksi selesai!");
            
            document.getElementById('batch-pred-result-card').classList.remove('hidden');
            document.getElementById('batch-pred-summary').textContent = `${data.total_samples} baris teks terklasifikasi sukses.`;
            document.getElementById('btn-download-batch').href = data.download_url;
        } else {
            showToast(res.error || "Batch prediksi gagal.", true);
        }
    })
    .catch(() => showToast("Connection failure.", true))
    .finally(() => hideLoader());
});


// --- MODEL LIFE-CYCLE REGISTRY ---
function fetchModelRegistry() {
    fetch('/api/v1/models')
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                const models = res.data;
                const tbody = document.getElementById('registry-table-body');
                tbody.innerHTML = '';
                
                if (models.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-rose-mauve py-6">Belum ada model di registry.</td></tr>';
                    return;
                }
                
                models.forEach(model => {
                    const acc = (model.accuracy * 100).toFixed(1) + "%";
                    const f1 = (model.macro_f1 * 100).toFixed(1) + "%";
                    const downloadUrl = `/static/uploads/models/model_job_${model.job_id}.pkl`;
                    
                    const optActive = model.artifact_lifecycle === 'Active' ? 'selected' : '';
                    const optArchived = model.artifact_lifecycle === 'Archived' ? 'selected' : '';
                    const optDeprecated = model.artifact_lifecycle === 'Deprecated' ? 'selected' : '';
                    
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="font-bold text-xs">${model.job_id}</td>
                        <td class="font-semibold text-dark">${model.exp_name}</td>
                        <td><span class="badge badge-neutral">${model.model_type.toUpperCase()}</span></td>
                        <td class="font-bold">${acc}</td>
                        <td class="font-bold text-pink">${f1}</td>
                        <td><code class="text-xs bg-warm-gray p-1 rounded font-mono">${model.artifact_hash.substring(0, 10)}...</code></td>
                        <td>
                            <select class="form-select text-xs py-1" onchange="updateModelLifecycleState(${model.job_id}, this.value)">
                                <option value="Active" ${optActive}>Active</option>
                                <option value="Archived" ${optArchived}>Archived</option>
                                <option value="Deprecated" ${optDeprecated}>Deprecated</option>
                            </select>
                        </td>
                        <td>
                            <div class="flex gap-1 justify-center">
                                <a href="${downloadUrl}" class="btn btn-primary btn-sm py-1 px-2" download title="Unduh Biner PKL"><i data-lucide="download" class="w-3.5 h-3.5"></i></a>
                                <button class="btn btn-secondary btn-sm py-1 px-2" onclick="predictModelRegistry(${model.job_id})" title="Gunakan untuk Prediksi"><i data-lucide="wand2" class="w-3.5 h-3.5"></i></button>
                                <button class="btn btn-danger btn-sm py-1 px-2" onclick="deleteModelRegistry(${model.job_id}, '${model.exp_name}')" title="Hapus Biner Model"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
                lucide.createIcons();
            }
        });
}

function predictModelRegistry(jobId) {
    location.hash = '#prediction';
    setTimeout(() => {
        const select = document.getElementById('pred-model');
        if (select) {
            select.value = jobId;
        }
        const batchSelect = document.getElementById('batch-pred-model');
        if (batchSelect) {
            batchSelect.value = jobId;
        }
    }, 150);
}

async function deleteModelRegistry(jobId, name) {
    const title = "Hapus Model Registry?";
    const msg = `Apakah Anda yakin ingin menghapus model "${name}" dari registry?`;
    const submsg = "Tindakan ini akan menghapus file biner (.pkl) dari disk untuk membebaskan ruang penyimpanan, namun tetap mempertahankan riwayat akurasi dan visualisasinya di Lab Evaluasi.";
    const confirmed = await showCustomConfirm(title, msg, submsg, "Ya, Hapus", "Batal", true);
    
    if (confirmed) {
        showLoader();
        fetch(`/api/v1/models/${jobId}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    showToast("Model berhasil dihapus dari registry.");
                    fetchModelRegistry();
                    fetchDashboardSummary(); // refresh counters
                } else {
                    showToast(res.error || "Gagal menghapus model.", true);
                }
            })
            .catch(() => showToast("Koneksi ke backend bermasalah.", true))
            .finally(() => hideLoader());
    }
}

function updateModelLifecycleState(jobId, state) {
    fetch(`/api/v1/models/${jobId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lifecycle: state })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            showToast(`Status model ${jobId} diperbarui ke '${state}'.`);
        } else {
            showToast(res.error || "Gagal memperbarui status.", true);
        }
    });
}


// --- GLOBAL SYNC EVENT ---
document.getElementById('btn-sync').addEventListener('click', () => {
    showToast("Sinkronisasi data...");
    const currentHash = window.location.hash.substring(1) || 'dashboard';
    handleViewActivated(currentHash);
});


// --- INITIALIZATION ---
window.addEventListener('hashchange', () => {
    const viewId = window.location.hash.substring(1);
    navigateToView(viewId);
});

// Sidebar drawer toggle on mobile sizes
document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
});

// Detect outside clicks to dismiss sidebar drawer on mobile
document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
    }
});

// Startup Bootstrapper
document.addEventListener('DOMContentLoaded', () => {
    // Bind click handlers for custom confirm modal
    document.getElementById('confirm-btn-ok').addEventListener('click', () => {
        if (confirmPromiseResolve) {
            confirmPromiseResolve(true);
            confirmPromiseResolve = null;
        }
    });

    document.getElementById('confirm-btn-cancel').addEventListener('click', () => {
        if (confirmPromiseResolve) {
            confirmPromiseResolve(false);
            confirmPromiseResolve = null;
        }
    });

    document.getElementById('confirm-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('confirm-modal')) {
            if (confirmPromiseResolve) {
                confirmPromiseResolve(false);
                confirmPromiseResolve = null;
            }
        }
    });



    checkAuthentication();
});
