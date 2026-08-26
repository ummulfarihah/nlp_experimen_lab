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

function animateCounter(element, targetValue, duration = 800) {
    if (!element) return;
    const start = parseInt(element.textContent) || 0;
    const range = targetValue - start;
    if (range === 0) { element.textContent = targetValue; return; }
    const startTime = performance.now();
    function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        element.textContent = Math.round(start + range * eased);
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// Toast message trigger helper
let toastTimeoutId = null;

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    const toastIconWrap = document.getElementById('toast-icon-wrap');
    if (!toast || !toastMsg) return;
    
    if (toastTimeoutId) {
        clearTimeout(toastTimeoutId);
        toastTimeoutId = null;
    }
    
    // Clean any legacy emoji prefixes from messages
    const cleanMessage = (message || '').replace(/^([⚠️❌✅💡ℹ️]+\s*)/, '').trim();
    toastMsg.textContent = cleanMessage;
    
    if (isError) {
        toast.className = 'toast-capsule toast-error';
        if (toastIconWrap) {
            toastIconWrap.innerHTML = '<i data-lucide="alert-circle" class="w-4 h-4 text-white"></i>';
        }
    } else {
        toast.className = 'toast-capsule toast-success';
        if (toastIconWrap) {
            toastIconWrap.innerHTML = '<i data-lucide="check" class="w-4 h-4 text-white"></i>';
        }
    }
    
    if (window.lucide) {
        lucide.createIcons();
    }
    
    toast.classList.remove('hidden');
    
    // Auto hide after 3.2 seconds
    toastTimeoutId = setTimeout(() => {
        toast.classList.add('hidden');
        toastTimeoutId = null;
    }, 3200);
}

function hideToastImmediately() {
    const toast = document.getElementById('toast');
    if (toast) {
        if (toastTimeoutId) {
            clearTimeout(toastTimeoutId);
            toastTimeoutId = null;
        }
        toast.classList.add('hidden');
    }
}
window.hideToastImmediately = hideToastImmediately;

// Global Empty State Renderer for Tables (Consistent Centered Glassmorphism Design)
function renderEmptyTableState(tbody, colspan, icon, title, subtitle = '') {
    if (!tbody) return;
    tbody.innerHTML = `
        <tr class="empty-table-row">
            <td colspan="${colspan}" class="empty-table-cell">
                <div class="empty-state-content">
                    <div class="empty-state-icon-wrap">
                        <i data-lucide="${icon}" class="w-6 h-6 text-pink"></i>
                    </div>
                    <p class="empty-state-title">${title}</p>
                    ${subtitle ? `<p class="empty-state-subtitle">${subtitle}</p>` : ''}
                </div>
            </td>
        </tr>
    `;
    if (window.lucide) {
        lucide.createIcons({ root: tbody });
    }
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

// In-App Action / Global loader controllers (distinct from Cold Start Splash)
function showLoader(customMessage = "Memproses Data...") {
    const loaderEl = document.getElementById('global-loader');
    if (!loaderEl) return;
    const textEl = loaderEl.querySelector('.page-loader-text');
    if (textEl) textEl.textContent = customMessage;
    loaderEl.style.opacity = '1';
    loaderEl.style.pointerEvents = 'all';
}

function hideLoader() {
    const loaderEl = document.getElementById('global-loader');
    if (!loaderEl) return;
    loaderEl.style.opacity = '0';
    loaderEl.style.pointerEvents = 'none';
}

// --- VIEW NAVIGATION / ROUTER ---
const VIEWS = ['dashboard', 'datasets', 'preprocess', 'preprocess-bert', 'training', 'evaluations', 'mcnemar', 'prediction', 'registry', 'profile'];

function getViewFromPath() {
    const rawPath = window.location.pathname.replace(/^\/+/, '').split('/')[0];
    const hashFallback = window.location.hash ? window.location.hash.substring(1) : '';
    const candidate = rawPath || hashFallback;
    return VIEWS.includes(candidate) ? candidate : 'dashboard';
}

function navigateToView(viewId, updateHistory = true) {
    let targetTab = null;
    if (viewId === 'preprocess-bert') {
        viewId = 'preprocess';
        targetTab = 'bert';
    }
    
    if (!VIEWS.includes(viewId)) viewId = 'dashboard';
    
    // Update URL without hash using HTML5 History API
    if (updateHistory) {
        const targetUrl = '/' + (targetTab ? 'preprocess-bert' : viewId);
        if (window.location.pathname !== targetUrl && (viewId !== 'dashboard' || (window.location.pathname !== '/' && window.location.pathname !== '/dashboard'))) {
            history.pushState({ view: targetTab ? 'preprocess-bert' : viewId }, '', targetUrl);
        }
    }
    
    // Hide all views, deactivate sidebar menu links
    VIEWS.forEach(v => {
        const viewEl = document.getElementById(`view-${v}`);
        if (viewEl) viewEl.classList.add('hidden');
        const navEl = document.getElementById(`nav-${v}`);
        if (navEl) navEl.classList.remove('active');
    });
    
    // Update mobile bottom navigation items
    const mobileNavIds = ['dashboard', 'preprocess', 'training', 'evaluations'];
    mobileNavIds.forEach(id => {
        const el = document.getElementById(`mob-nav-${id}`);
        if (el) el.classList.toggle('active', id === viewId);
    });
    const mobMore = document.getElementById('mob-nav-more');
    if (mobMore) {
        mobMore.classList.toggle('active', !mobileNavIds.includes(viewId));
    }
    
    // Show active view
    const activeViewEl = document.getElementById(`view-${viewId}`);
    if (activeViewEl) {
        activeViewEl.classList.remove('hidden');
        activeViewEl.classList.add('animate-fadeIn');
        setTimeout(() => activeViewEl.classList.remove('animate-fadeIn'), 400);
    }
    const activeNavEl = document.getElementById(`nav-${viewId}`);
    if (activeNavEl) activeNavEl.classList.add('active');
    
    // Set Header Title
    const viewTitleMap = {
        dashboard: "Dashboard Ringkasan",
        datasets: "Dataset Manager",
        preprocess: "Preprocessing Lab",
        training: "Model Training & Jobs",
        evaluations: "Evaluation Lab & Rankings",
        mcnemar: "McNemar Significance Test",
        prediction: "Prediction & Inference Lab",
        registry: "Model Registry Lifecycle",
        profile: "Profil Pengguna & Keamanan"
    };
    document.getElementById('view-title').textContent = viewTitleMap[viewId] || "Preprocessing Lab";
    
    // If navigating via alias, activate specific tab
    if (targetTab && typeof switchPreprocessTab === 'function') {
        switchPreprocessTab(targetTab);
    }
    
    // Automatically close sidebar and sheet on mobile when navigating
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
    const mobileSheet = document.getElementById('mobile-more-sheet');
    if (mobileSheet && !mobileSheet.classList.contains('hidden')) {
        mobileSheet.classList.remove('active');
        setTimeout(() => mobileSheet.classList.add('hidden'), 300);
    }
    
    // View-specific trigger actions
    handleViewActivated(viewId);
}

function toggleMobileMoreDrawer() {
    const sheet = document.getElementById('mobile-more-sheet');
    if (sheet) {
        if (sheet.classList.contains('hidden')) {
            sheet.classList.remove('hidden');
            setTimeout(() => sheet.classList.add('active'), 10);
        } else {
            sheet.classList.remove('active');
            setTimeout(() => sheet.classList.add('hidden'), 300);
        }
    }
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
        initStaticCustomDropdowns();
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
    initSidebarState();
    
    const initialView = getViewFromPath();
    navigateToView(initialView, true);
}


document.getElementById('form-real-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('btn-real-login-submit');
    
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Memproses...'; }
    
    showLoader();
    fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            showToast("Berhasil masuk ke lab!");
            setAuthenticatedUser(res.data);
        } else {
            showToast(res.error || "Email atau kata sandi tidak valid.", true);
        }
    })
    .catch(() => {
        showToast("Koneksi ke server gagal.", true);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Masuk ke Lab'; }
    })
    .finally(() => {
        hideLoader();
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Masuk ke Lab'; }
    });
});

document.getElementById('btn-logout').addEventListener('click', () => {
    showLoader();
    fetch('/api/v1/auth/logout', { method: 'POST' })
        .then(() => {
            showToast("Berhasil keluar dari akun.");
            STATE.user = null;
            showLoginOverlay();
            history.pushState({ view: 'dashboard' }, '', '/dashboard');
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

// Sidebar Profile box redirect to profile
document.querySelector('.user-profile').addEventListener('click', () => {
    navigateToView('profile', true);
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
                animateCounter(document.getElementById('dash-dataset-count'), res.data.length);
            }
        });
        
    fetch('/api/v1/experiments/jobs')
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                const jobs = res.data;
                const completedCount = jobs.filter(j => j.status === 'Completed').length;
                const activeJobs = jobs.filter(j => ['Preparing', 'Downloading Model', 'Training', 'Evaluating'].includes(j.status));
                
                animateCounter(document.getElementById('dash-model-count'), completedCount);
                animateCounter(document.getElementById('dash-job-count'), activeJobs.length);
                
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
                            <div class="timeline-meta-grid">
                                <div class="meta-row">
                                    <span class="meta-label">Dataset</span>
                                    <span class="meta-colon">:</span>
                                    <span class="meta-val font-mono">${job.dataset_name}</span>
                                </div>
                                <div class="meta-row">
                                    <span class="meta-label">Duration</span>
                                    <span class="meta-colon">:</span>
                                    <span class="meta-val font-mono">${elapsed}</span>
                                </div>
                            </div>
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
                
                renderCustomDatasetDropdowns();
                
                // Render Datasets Table
                const tbody = document.getElementById('dataset-table-body');
                tbody.innerHTML = '';
                
                if (STATE.datasets.length === 0) {
                    renderEmptyTableState(
                        tbody,
                        5,
                        'database',
                        'Belum Ada Dataset Diunggah',
                        'Silakan unggah berkas CSV dataset baru melalui panel di samping untuk memulai eksperimen.'
                    );
                    return;
                }
                
                STATE.datasets.forEach(dataset => {
                    const date = new Date(dataset.uploaded_at).toLocaleString();
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td data-label="Nama Dataset" class="font-semibold text-dark card-header-cell">${dataset.name}</td>
                        <td data-label="Total Baris"><span class="badge badge-neutral">${dataset.total_samples} baris</span></td>
                        <td data-label="Waktu Unggah" class="text-xs text-rose-mauve">${date}</td>
                        <td data-label="Hash (SHA256)"><code class="text-xs bg-warm-gray px-1.5 py-0.5 rounded font-mono">${dataset.file_hash.substring(0, 10)}...</code></td>
                        <td data-label="Aksi" class="card-actions-cell">
                            <div class="flex items-center gap-2 justify-end">
                                <button class="btn btn-primary btn-sm btn-with-text" onclick="inspectDataset(${dataset.id})" title="Inspeksi Dataset"><i data-lucide="eye" class="w-3.5 h-3.5 mr-1 inline"></i>Lihat</button>
                                <button class="btn btn-danger btn-sm btn-with-text" onclick="deleteDataset(${dataset.id}, '${dataset.name}')" title="Hapus Dataset"><i data-lucide="trash-2" class="w-3.5 h-3.5 mr-1 inline"></i>Hapus</button>
                            </div>
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
                
                if (!res.data || res.data.length === 0) {
                    renderEmptyTableState(
                        tbody,
                        2,
                        'file-text',
                        'Tidak Ada Data Pratinjau',
                        'Dataset ini kosong atau tidak memiliki baris data yang valid.'
                    );
                    return;
                }
                
                res.data.forEach(row => {
                    const tr = document.createElement('tr');
                    const labelBadge = row.label === 'positive' || row.label === '1' || row.label === 1 ? 'badge-success' : (row.label === 'negative' || row.label === '-1' || row.label === -1 ? 'badge-danger' : 'badge-neutral');
                    tr.innerHTML = `
                        <td data-label="Teks" class="text-xs text-dark wrap-cell">${row.text}</td>
                        <td data-label="Label"><span class="badge ${labelBadge}">${row.label}</span></td>
                    `;
                    tbody.appendChild(tr);
                });
                // Auto-scroll to Dataset Details panel on mobile / tablet (< 1024px)
                if (window.innerWidth <= 1024) {
                    setTimeout(() => {
                        const previewPanel = document.getElementById('dataset-details-panel');
                        if (previewPanel) {
                            previewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }, 120);
                }
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


// --- PREPROCESSING LAB KNOWLEDGE BASE (INFO MODALS) ---
const STEP_INFO_DETAILS = {
    'classic-0': {
        title: "Input Raw",
        subtitle: "Teks Masukan Asli",
        icon: "file-text",
        badge: "Data Mentah",
        description: "Kalimat masukan asli langsung dari pengguna atau data crawling media sosial tanpa modifikasi apa pun. Kalimat ini umumnya memiliki tingkat derau (<em>noise</em>) seperti URL, tagar (<em>hashtag</em>), mention akun (@user), emoji, dan karakter nonalfabet.",
        role: "Menjadi titik awal (<em>baseline</em>) pemrosesan sebelum dilakukan ekstraksi fitur tekstual.",
        comparison: "Sama persis antara kedua pipeline, sebagai data uji bersama."
    },
    'classic-1': {
        title: "Case Folding & Noise Removal",
        subtitle: "Pembersihan Karakter Non-Alfabet & Lowercasing",
        icon: "scissors",
        badge: "Pembersihan Derau",
        description: "Mengubah seluruh huruf menjadi huruf kecil (<em>lowercasing</em>) dan menghapus tautan URL, mention, tanda baca, simbol, serta angka menggunakan ekspresi reguler (<em>Regular Expressions</em>).",
        role: "Mencegah duplikasi fitur leksikal pada matriks TF-IDF. Kata 'Bagus', 'BAGUS', dan 'bagus!' akan diseragamkan menjadi satu token tunggal 'bagus'.",
        comparison: "Pada model klasik, tanda baca dibuang total. Pada model deep learning tertentu, tanda baca dapat dipertahankan jika membawa konteks penekanan emosi."
    },
    'classic-2': {
        title: "Tokenization & Slang Normalization",
        subtitle: "Segmentasi Kata & Normalisasi Kata Gaul",
        icon: "book-open",
        badge: "Normalisasi Kamus",
        description: "Memecah untaian teks menjadi daftar kata tunggal (<em>unigram tokens</em>), kemudian memetakan setiap kata gaul/singkatan ke bentuk baku Bahasa Indonesia berdasarkan kamus slang (misal: <code>bgt</code> &rarr; <code>sangat</code>, <code>sy</code> &rarr; <code>saya</code>, <code>sm</code> &rarr; <code>sama</code>, <code>udh</code> &rarr; <code>sudah</code>, <code>krn</code> &rarr; <code>karena</code>).",
        role: "Meningkatkan kecocokan fitur teks dengan korpus pelatihan (<em>training vocabulary</em>) dan mencegah kata informal menjadi kata yang tidak dikenali.",
        comparison: "Dilakukan pada kedua pipeline agar kata-kata informal dapat dikenali oleh model statistik maupun transformer."
    },
    'classic-3': {
        title: "Stopword Removal",
        subtitle: "Penyaringan Kata Tugas & Preservasi Negasi",
        icon: "filter",
        badge: "Filtrasi Fitur",
        description: "Menghapus kata-kata fungsional umum yang sering muncul namun tidak membawa informasi polaritas sentimen (seperti <em>yang, di, dari, ke, ini, itu</em>). <strong>Penting:</strong> Penghapusan dilakukan secara selektif dengan <strong>mempertahankan kata negasi</strong> (<em>tidak, bukan, jangan, tanpa, belum</em>).",
        role: "Mereduksi dimensi ruang vektor TF-IDF secara signifikan tanpa merusak makna pembalikan sentimen pada kalimat negatif.",
        comparison: "Pipeline klasik membuang stopword untuk mereduksi dimensi. Sebaliknya, IndoBERT <u>TIDAK</u> membuang stopword agar urutan kalimat tetap utuh untuk mekanisme Self-Attention."
    },
    'classic-4': {
        title: "Hasil Preprocessing",
        subtitle: "Representasi Fitur Bersih untuk TF-IDF",
        icon: "badge-check",
        badge: "Output Klasik",
        description: "Menggabungkan kembali token kata hasil pembersihan menjadi kalimat bersih yang padat makna kata kunci (<em>lexical density</em>).",
        role: "Teks ini siap diubah menjadi vektor numerik frekuensi term (TF-IDF) untuk diklasifikasikan oleh algoritma Multinomial Naïve Bayes dan Support Vector Machine (SVM).",
        comparison: "Hasil akhir berbentuk kalimat pendek tanpa kata tugas, berfokus pada frekuensi kemunculan kata independen."
    },
    'bert-0': {
        title: "Input Raw",
        subtitle: "Teks Masukan Asli",
        icon: "file-text",
        badge: "Input Transformer",
        description: "Kalimat asli bahasa Indonesia yang menjadi masukan bagi arsitektur model Deep Learning Transformer.",
        role: "Sebagai input komparasi langsung terhadap kinerja pemahaman konteks IndoBERT.",
        comparison: "Identik dengan input pada model klasik."
    },
    'bert-1': {
        title: "Normalisasi & Slang",
        subtitle: "Case Folding & Slang (Stopword Dipertahankan)",
        icon: "zap",
        badge: "Minimal Cleaning",
        description: "Hanya melakukan penyeragaman huruf kecil (<em>case folding</em>) dan penggantian singkatan gaul (<em>slang normalization</em>). Seluruh kata tugas (<em>stopword</em>) tetap <strong>dipertahankan secara penuh</strong>.",
        role: "Mempertahankan hubungan gramatikal, urutan kata (<em>syntactic dependencies</em>), dan struktur kalimat yang utuh agar representasi semantik tidak cacat.",
        comparison: "Sangat kontras dengan model klasik. Membuang stopword pada IndoBERT akan merusak pemahaman posisi kata dalam mekanisme Self-Attention."
    },
    'bert-2': {
        title: "Hasil Preprocessing",
        subtitle: "Teks Masukan Lengkap Siap Tokenisasi",
        icon: "badge-check",
        badge: "Konteks Utuh",
        description: "Kalimat hasil normalisasi minimal yang masih memiliki tata bahasa dan struktur kalimat lengkap Bahasa Indonesia.",
        role: "Diumpankan secara langsung ke modul <code>BertTokenizer</code> berbasis WordPiece.",
        comparison: "Memiliki jumlah kata yang lebih lengkap dibandingkan output tahap 4 model klasik."
    },
    'bert-3': {
        title: "Tokenisasi WordPiece",
        subtitle: "Pemecahan Subkata & Token Khusus",
        icon: "layers",
        badge: "Subword Splitting",
        description: "Algoritma WordPiece memecah kata menjadi unit subkata (<em>subword tokens</em>) yang ditandai prefiks <code>##</code> jika kata tidak ada dalam kamus. Ditambahkan token khusus <code>[CLS]</code> di awal (agregator representasi sentimen) dan <code>[SEP]</code> di akhir kalimat.",
        role: "Menghilangkan permasalahan kata di luar kamus (<em>Out-Of-Vocabulary / OOV</em>), khususnya untuk kata-kata berafiks/berimbuhan kompleks khas Bahasa Indonesia (misal: <em>menakjubkan</em> &rarr; <code>menak</code>, <code>##jub</code>, <code>##kan</code>).",
        comparison: "Model klasik menggunakan token kata utuh (<em>word-level</em>). IndoBERT menggunakan token subkata (<em>subword-level</em>)."
    },
    'bert-4': {
        title: "Tensor & Attention Mask",
        subtitle: "Pemetaan Token IDs & Matriks Masking",
        icon: "cpu",
        badge: "Tensor PyTorch",
        description: "Setiap token subkata dipetakan ke ID integer unik (<em>Token ID</em>) dari total 30.521 vocabulary IndoBERT. <em>Attention Mask</em> bernilai <code>1</code> untuk token nyata dan <code>0</code> untuk token padding <code>[PAD]</code>. Panjang tensor diseragamkan dengan padding tetap (<code>max_length = 32</code>).",
        role: "Menghasilkan tensor numerik 2D [Batch_Size, Max_Length] yang siap masuk ke Multi-Head Self-Attention Transformer Blocks di PyTorch.",
        comparison: "Model klasik menghasilkan representasi vektor jarang (<em>sparse TF-IDF matrix</em>), sedangkan IndoBERT menghasilkan tensor padat (<em>dense contextual embeddings</em>)."
    }
};

function formatRichMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function showPreprocessStepInfo(stepKey) {
    const info = STEP_INFO_DETAILS[stepKey];
    if (!info) return;

    const modal = document.getElementById('preprocess-info-modal');
    const titleEl = document.getElementById('info-modal-title');
    const subtitleEl = document.getElementById('info-modal-subtitle');
    const bodyEl = document.getElementById('info-modal-body');
    const iconContainer = document.getElementById('info-modal-icon-container');

    if (titleEl) titleEl.textContent = info.title;
    if (subtitleEl) subtitleEl.textContent = info.subtitle;
    if (iconContainer) {
        iconContainer.innerHTML = `<i data-lucide="${info.icon || 'file-text'}" class="w-6 h-6 text-white" style="width: 24px; height: 24px;"></i>`;
    }

    if (bodyEl) {
        bodyEl.innerHTML = `
            <div class="info-overview-card">
                <div class="flex items-center justify-between mb-3">
                    <span class="info-badge-pill">
                        <i data-lucide="tag" class="w-3.5 h-3.5 inline mr-1"></i>${info.badge}
                    </span>
                    <span class="font-bold uppercase tracking-wider" style="color: #E94F9A; font-size: 0.75rem; letter-spacing: 0.08em;">PIPELINE INFO</span>
                </div>
                <p class="font-normal leading-relaxed text-dark" style="font-size: 0.9rem; line-height: 1.7; color: #2D2230; margin-top: 12px;">${formatRichMarkdown(info.description)}</p>
            </div>
            
            <div class="space-y-3 mt-3">
                <div class="info-callout-card accent-purple">
                    <div class="callout-icon-circle purple">
                        <i data-lucide="target" class="w-5 h-5"></i>
                    </div>
                    <div class="callout-content">
                        <h5 class="callout-title purple">PERAN & TUJUAN ILMIAH</h5>
                        <p class="callout-desc">${formatRichMarkdown(info.role)}</p>
                    </div>
                </div>
                
                <div class="info-callout-card accent-pink">
                    <div class="callout-icon-circle pink">
                        <i data-lucide="scale" class="w-5 h-5"></i>
                    </div>
                    <div class="callout-content">
                        <h5 class="callout-title pink">KOMPARASI TEORETIS</h5>
                        <p class="callout-desc">${formatRichMarkdown(info.comparison)}</p>
                    </div>
                </div>
            </div>
        `;
    }

    if (modal) {
        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
        setTimeout(() => {
            modal.classList.add('active');
            if (window.lucide) lucide.createIcons();
        }, 10);
    }
}

function closePreprocessInfoModal() {
    const modal = document.getElementById('preprocess-info-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 250);
    }
}

// Bind directly to window for guaranteed inline onclick accessibility
window.showPreprocessStepInfo = showPreprocessStepInfo;
window.closePreprocessInfoModal = closePreprocessInfoModal;

// Close info modal on clicking backdrop
document.getElementById('preprocess-info-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('preprocess-info-modal')) {
        closePreprocessInfoModal();
    }
});


// --- PREPROCESSING LAB WORKFLOW (SIMULTANEOUS SIDE-BY-SIDE) ---
function fillPreprocessSample(sampleId) {
    const input = document.getElementById('preprocess-input');
    const bertInput = document.getElementById('preprocess-bert-input');
    if (!input) return;
    if (sampleId === 1) {
        input.value = "Pelayanan staf lab sangat memuaskan, tempatnya bersih dan responnya cepat!";
    } else {
        input.value = "Wah gila sih pelayanan di sini bener-bener mantul bgt! Suka bgt sama respon adminnya keren abis.";
    }
    if (bertInput) bertInput.value = input.value;
    showToast("Contoh kalimat berhasil dimasukkan.");
}

// Sync input events between inputs
document.getElementById('preprocess-input')?.addEventListener('input', (e) => {
    const bertInput = document.getElementById('preprocess-bert-input');
    if (bertInput) bertInput.value = e.target.value;
});

// Run Both Preprocessing Pipelines Simultaneously Side-by-Side
document.getElementById('btn-run-preprocess')?.addEventListener('click', () => {
    const text = document.getElementById('preprocess-input').value;
    if (!text.trim()) {
        showToast("Kalimat uji tidak boleh kosong.", true);
        return;
    }
    
    showLoader();
    
    // Clear old BERT outputs first
    const step3 = document.getElementById('bert-step-3');
    const step4 = document.getElementById('bert-step-4');
    const tokensContainer = document.getElementById('bert-term-tokens');
    const tableBody = document.getElementById('bert-term-table-body');
    const tensorIds = document.getElementById('bert-term-tensor-ids');
    
    if (step3) step3.style.display = 'none';
    if (step4) step4.style.display = 'none';
    if (tokensContainer) tokensContainer.innerHTML = '';
    if (tableBody) tableBody.innerHTML = '';
    if (tensorIds) tensorIds.textContent = '-';
    
    // Set loading indicator in both terminals
    const classicSteps = ['term-casefolded', 'term-tokens', 'term-stopwords', 'term-processed'];
    classicSteps.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "Processing...";
    });
    const bertNormalized = document.getElementById('bert-term-normalized');
    const bertProcessed = document.getElementById('bert-term-processed');
    if (bertNormalized) bertNormalized.textContent = "Processing...";
    if (bertProcessed) bertProcessed.textContent = "Finalizing...";

    Promise.all([
        fetch('/api/v1/preprocess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        }).then(r => r.json()),
        fetch('/api/v1/preprocess/bert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        }).then(r => r.json())
    ])
    .then(([classicRes, bertRes]) => {
        // 1. Render Classic Pipeline (Left Column)
        if (classicRes.success) {
            const data = classicRes.data;
            document.getElementById('term-raw').textContent = `"${data.raw}"`;
            
            const steps = [
                { id: 'term-casefolded', val: `"${data.case_folded}"` },
                { id: 'term-tokens', val: JSON.stringify(data.tokens) },
                { id: 'term-stopwords', val: JSON.stringify(data.filtered_tokens) },
                { id: 'term-processed', val: `"${data.processed}"` }
            ];
            
            steps.forEach((step, idx) => {
                const element = document.getElementById(step.id);
                if (element) {
                    setTimeout(() => {
                        element.textContent = step.val;
                    }, (idx + 1) * 200);
                }
            });
        }
        
        // 2. Render IndoBERT Pipeline (Right Column)
        if (bertRes.success) {
            const data = bertRes.data;
            document.getElementById('bert-term-raw').textContent = `"${data.raw}"`;
            
            setTimeout(() => {
                if (bertNormalized) bertNormalized.textContent = `"${data.normalized}"`;
            }, 200);
            
            setTimeout(() => {
                if (bertProcessed) bertProcessed.textContent = `"${data.normalized}"`;
            }, 400);

            // Step 3 WordPiece Subword tokens
            setTimeout(() => {
                if (step3) step3.style.display = 'flex';
                if (tokensContainer) {
                    tokensContainer.innerHTML = '';
                    data.tokens.forEach(tok => {
                        const badge = document.createElement('span');
                        badge.style.padding = '4px 8px';
                        badge.style.margin = '4px';
                        badge.style.borderRadius = '6px';
                        badge.style.fontSize = '0.75rem';
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
                }
            }, 600);

            // Step 4 Tensor map & Padded IDs
            setTimeout(() => {
                if (step4) step4.style.display = 'flex';
                if (tableBody) {
                    tableBody.innerHTML = '';
                    data.tokens.forEach((tok, idx) => {
                        const id = data.token_ids[idx];
                        const mask = data.attention_mask[idx];
                        
                        const row = document.createElement('tr');
                        row.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
                        row.innerHTML = `
                            <td data-label="Index" style="padding: 6px 12px; font-family: monospace; color: var(--text-muted);">${idx}</td>
                            <td data-label="Subword Token" style="padding: 6px 12px; font-weight: bold; color: ${tok.startsWith('##') ? '#ec4899' : (tok.startsWith('[') ? '#8b5cf6' : 'var(--text-dark)')}">${tok}</td>
                            <td data-label="Token ID" style="padding: 6px 12px; text-align: right; font-family: monospace; color: #d53f8c;">${id}</td>
                            <td data-label="Attention Mask" style="padding: 6px 12px; text-align: center; font-family: monospace;"><span style="background-color: ${mask === 1 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${mask === 1 ? '#10b981' : '#ef4444'}; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">${mask}</span></td>
                        `;
                        tableBody.appendChild(row);
                    });
                }
                
                if (tensorIds) {
                    tensorIds.textContent = `[${data.padded_token_ids.join(', ')}]`;
                }
            }, 800);
        }
        
        showToast("Kedua pipeline preprocessing berhasil dieksekusi!");
    })
    .catch(() => showToast("Gagal memproses teks.", true))
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
    .catch(() => showToast("Terjadi kesalahan koneksi ke server.", true))
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
                    renderEmptyTableState(
                        tbody,
                        9,
                        'cpu',
                        'Belum Ada Riwayat Training',
                        'Konfigurasikan parameter dan mulai proses pelatihan model baru pada panel formulir di atas.'
                    );
                    return;
                }
                
                STATE.jobs.forEach(job => {
                    const date = new Date(job.started_at).toLocaleString();
                    const duration = job.training_time ? `${Math.round(job.training_time)} detik` : 'running';
                    const progressStyle = `width: ${job.progress}%`;
                    const statusClass = job.status === 'Completed' ? 'badge-success' : (job.status === 'Failed' ? 'badge-danger' : (job.status === 'Cancelled' ? 'badge-neutral' : 'badge-warning'));
                    const statusDot = `<span class="badge-dot"></span>`;
                    
                    const isRunning = ['Preparing', 'Downloading Model', 'Training', 'Evaluating'].includes(job.status);
                    let actionHtml = '';
                    if (isRunning) {
                        actionHtml = `<button class="btn btn-danger btn-sm" onclick="cancelJobHistory(${job.id})" title="Batalkan Training"><i data-lucide="x-circle" class="inline w-3.5 h-3.5 mr-1"></i>Batalkan</button>`;
                    } else {
                        if (job.status === 'Completed') {
                            actionHtml += `<button class="btn btn-primary btn-sm mr-1" onclick="navigateToView('evaluations', true); inspectModel(${job.id})" title="Evaluasi & Inspeksi"><i data-lucide="award" class="inline w-3.5 h-3.5"></i></button>`;
                        }
                        actionHtml += `<button class="btn btn-danger btn-sm" onclick="deleteJobHistory(${job.id})" title="Hapus Riwayat"><i data-lucide="trash-2" class="inline w-3.5 h-3.5"></i></button>`;
                    }
                        
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td data-label="ID" class="font-bold text-xs font-mono">#${job.id}</td>
                        <td data-label="Eksperimen" class="font-semibold text-dark card-header-cell">${job.exp_name}</td>
                        <td data-label="Dataset" class="text-xs text-rose-mauve">${job.dataset_name}</td>
                        <td data-label="Model"><span class="badge badge-neutral">${job.model_type.toUpperCase()}</span></td>
                        <td data-label="Durasi Latih" class="font-mono text-xs">${duration}</td>
                        <td data-label="Progres">
                            <div class="progress-track" style="height:6px; min-width:70px; max-width:90px; border-radius: 4px;">
                                <div class="progress-fill" style="${progressStyle}"></div>
                            </div>
                        </td>
                        <td data-label="Status"><span class="badge ${statusClass}">${statusDot}${job.status}</span></td>
                        <td data-label="Waktu Mulai" class="text-xs text-rose-mauve">${date}</td>
                        <td data-label="Aksi" class="card-actions-cell">
                            <div class="flex items-center gap-1 justify-end">
                                ${actionHtml}
                            </div>
                        </td>
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
                    renderEmptyTableState(
                        tbody,
                        9,
                        'trophy',
                        'Belum Ada Model Terevaluasi',
                        'Selesaikan pelatihan model terlebih dahulu untuk melihat papan peringkat performa dan metrik komparasi.'
                    );
                    return;
                }
                
                evals.forEach((ev, idx) => {
                    const acc = (ev.accuracy * 100).toFixed(2) + "%";
                    const f1 = (ev.macro_f1 * 100).toFixed(2) + "%";
                    const prec = (ev.precision * 100).toFixed(2) + "%";
                    const rec = (ev.recall * 100).toFixed(2) + "%";
                    
                    let rankBadge = '';
                    if (idx === 0) rankBadge = '<span class="rank-badge-1" title="Peringkat 1">🥇</span>';
                    else if (idx === 1) rankBadge = '<span class="rank-badge-2" title="Peringkat 2">🥈</span>';
                    else if (idx === 2) rankBadge = '<span class="rank-badge-3" title="Peringkat 3">🥉</span>';
                    else rankBadge = `<span class="font-bold text-xs text-rose-mauve">#${idx + 1}</span>`;
                    
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td data-label="Peringkat" class="text-center">${rankBadge}</td>
                        <td data-label="ID" class="font-bold text-xs font-mono">#${ev.experiment_job_id}</td>
                        <td data-label="Nama Model" class="font-semibold text-dark card-header-cell">${ev.exp_name}</td>
                        <td data-label="Arsitektur"><span class="badge badge-neutral">${ev.model_type.toUpperCase()}</span></td>
                        <td data-label="Akurasi" class="font-bold text-dark font-mono text-xs">${acc}</td>
                        <td data-label="Presisi" class="font-mono text-xs">${prec}</td>
                        <td data-label="Recall" class="font-mono text-xs">${rec}</td>
                        <td data-label="Macro F1" class="font-bold text-pink font-mono text-xs">${f1}</td>
                        <td data-label="Aksi" class="card-actions-cell">
                            <div class="flex items-center justify-center">
                                <button class="btn btn-primary btn-sm btn-with-text" onclick="inspectModel(${ev.experiment_job_id})" title="Inspeksi Model"><i data-lucide="zoom-in" class="inline w-3 h-3 mr-1"></i>Inspeksi</button>
                            </div>
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
                const selectedPanel = document.getElementById('eval-selected-panel');
                selectedPanel.classList.remove('hidden');
                selectedPanel.classList.add('animate-fadeIn');
                setTimeout(() => selectedPanel.classList.remove('animate-fadeIn'), 400);
                
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
                
                // 1. Individual classes (negative, neutral, positive)
                classKeys.forEach(k => {
                    const rowData = classes[k];
                    const tr = document.createElement('tr');
                    const badgeClass = k.toLowerCase().includes('pos') ? 'badge-success' : (k.toLowerCase().includes('neg') ? 'badge-danger' : 'badge-neutral');
                    tr.innerHTML = `
                        <td data-label="Kelas" class="font-semibold text-dark card-header-cell"><span class="badge ${badgeClass}">${k.toUpperCase()}</span></td>
                        <td data-label="Precision" class="text-right font-mono text-xs">${rowData.precision.toFixed(2)}</td>
                        <td data-label="Recall" class="text-right font-mono text-xs">${rowData.recall.toFixed(2)}</td>
                        <td data-label="F1-Score" class="text-right font-mono text-xs font-bold text-pink">${rowData['f1-score'].toFixed(2)}</td>
                        <td data-label="Support" class="text-right font-mono text-xs text-rose-mauve">${Math.round(rowData.support)}</td>
                    `;
                    tbody.appendChild(tr);
                });
                
                // 2. Accuracy
                const accVal = classes.accuracy;
                if (accVal !== undefined) {
                    const trAcc = document.createElement('tr');
                    trAcc.innerHTML = `
                        <td data-label="Metrik" class="font-bold text-dark card-header-cell">Accuracy</td>
                        <td data-label="Precision" class="text-right font-mono text-xs text-rose-mauve">-</td>
                        <td data-label="Recall" class="text-right font-mono text-xs text-rose-mauve">-</td>
                        <td data-label="F1-Score" class="text-right font-mono text-xs font-bold text-pink">${accVal.toFixed(2)}</td>
                        <td data-label="Support" class="text-right font-mono text-xs text-rose-mauve">${classes['macro avg'] ? Math.round(classes['macro avg'].support) : '-'}</td>
                    `;
                    tbody.appendChild(trAcc);
                }
                
                // 3. Macro Avg
                const macroVal = classes['macro avg'];
                if (macroVal) {
                    const trMacro = document.createElement('tr');
                    trMacro.innerHTML = `
                        <td data-label="Metrik" class="font-bold text-dark card-header-cell">Macro Avg</td>
                        <td data-label="Precision" class="text-right font-mono text-xs">${macroVal.precision.toFixed(2)}</td>
                        <td data-label="Recall" class="text-right font-mono text-xs">${macroVal.recall.toFixed(2)}</td>
                        <td data-label="F1-Score" class="text-right font-mono text-xs font-bold text-pink">${macroVal['f1-score'].toFixed(2)}</td>
                        <td data-label="Support" class="text-right font-mono text-xs text-rose-mauve">${Math.round(macroVal.support)}</td>
                    `;
                    tbody.appendChild(trMacro);
                }
                
                // 4. Weighted Avg
                const weightedVal = classes['weighted avg'];
                if (weightedVal) {
                    const trWeighted = document.createElement('tr');
                    trWeighted.innerHTML = `
                        <td data-label="Metrik" class="font-bold text-dark card-header-cell">Weighted Avg</td>
                        <td data-label="Precision" class="text-right font-mono text-xs">${weightedVal.precision.toFixed(2)}</td>
                        <td data-label="Recall" class="text-right font-mono text-xs">${weightedVal.recall.toFixed(2)}</td>
                        <td data-label="F1-Score" class="text-right font-mono text-xs font-bold text-pink">${weightedVal['f1-score'].toFixed(2)}</td>
                        <td data-label="Support" class="text-right font-mono text-xs text-rose-mauve">${Math.round(weightedVal.support)}</td>
                    `;
                    tbody.appendChild(trWeighted);
                }

                // Auto-scroll to Detail Evaluasi Model on mobile / tablet (< 1024px)
                if (window.innerWidth <= 1024) {
                    setTimeout(() => {
                        const targetPanel = document.getElementById('detail-eval-panel-card') || document.getElementById('eval-selected-panel');
                        if (targetPanel) {
                            targetPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }, 120);
                }
            } else {
                showToast("Evaluasi model tidak ditemukan.", true);
            }
        })
        .finally(() => hideLoader());
}


// --- UNIVERSAL CUSTOM GLASSMORPHISM DROPDOWN ENGINE ---
function buildCustomDropdown(selectId, customOptionsHtmlGenerator = null) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Hide native select visually while keeping accessible for forms
    select.style.display = 'none';

    let customWrap = select.parentElement.querySelector(`.custom-dropdown-container[data-target="${selectId}"]`);
    if (!customWrap) {
        customWrap = document.createElement('div');
        customWrap.className = 'custom-dropdown-container';
        customWrap.setAttribute('data-target', selectId);
        select.parentElement.insertBefore(customWrap, select.nextSibling);
    }

    const options = Array.from(select.options);
    const selectedOption = select.options[select.selectedIndex] || options[0];
    const defaultPlaceholder = options[0] ? options[0].text : '-- Pilih --';
    const isSelectedValEmpty = !select.value || select.value === '';

    const triggerHtml = `
        <button type="button" class="custom-dropdown-trigger" id="trigger-${selectId}">
            <span class="custom-dropdown-selected-text ${isSelectedValEmpty ? 'text-rose-mauve' : 'text-dark font-bold'}">
                ${selectedOption && !isSelectedValEmpty ? selectedOption.text : defaultPlaceholder}
            </span>
            <i data-lucide="chevron-down" class="custom-dropdown-arrow inline-block w-4 h-4"></i>
        </button>
    `;

    let menuItemsHtml = '';
    if (customOptionsHtmlGenerator && typeof customOptionsHtmlGenerator === 'function') {
        menuItemsHtml = customOptionsHtmlGenerator(options, select.value);
    } else {
        menuItemsHtml = options.map(opt => `
            <div class="custom-dropdown-item ${opt.value === select.value && opt.value !== '' ? 'is-selected' : ''}" data-value="${opt.value}">
                <div class="flex items-center justify-between py-0.5">
                    <span class="font-medium text-dark text-xs sm:text-sm ${opt.value === '' ? 'text-rose-mauve italic' : ''}">${opt.text}</span>
                    ${opt.value === select.value && opt.value !== '' ? '<i data-lucide="check" class="w-3.5 h-3.5 text-primary-pink"></i>' : ''}
                </div>
            </div>
        `).join('');
    }

    customWrap.innerHTML = `
        ${triggerHtml}
        <div class="custom-dropdown-menu hidden" id="menu-${selectId}">
            ${menuItemsHtml}
        </div>
    `;

    if (window.lucide) lucide.createIcons({ root: customWrap });

    const trigger = customWrap.querySelector('.custom-dropdown-trigger');
    const menu = customWrap.querySelector('.custom-dropdown-menu');
    const textSpan = customWrap.querySelector('.custom-dropdown-selected-text');
    const items = customWrap.querySelectorAll('.custom-dropdown-item');

    trigger.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-dropdown-container').forEach(c => {
            if (c !== customWrap) {
                c.classList.remove('is-open');
                const m = c.querySelector('.custom-dropdown-menu');
                if (m) m.classList.add('hidden');
            }
        });
        const isOpen = customWrap.classList.toggle('is-open');
        menu.classList.toggle('hidden', !isOpen);
    };

    items.forEach(item => {
        item.onclick = (e) => {
            e.stopPropagation();
            const val = item.dataset.value;
            select.value = val;
            select.dispatchEvent(new Event('change', { bubbles: true }));

            const matchedOpt = options.find(o => String(o.value) === String(val));
            if (matchedOpt && val !== '') {
                textSpan.textContent = matchedOpt.text;
                textSpan.className = 'custom-dropdown-selected-text text-dark font-bold';
            } else {
                textSpan.textContent = defaultPlaceholder;
                textSpan.className = 'custom-dropdown-selected-text text-rose-mauve';
            }

            items.forEach(i => i.classList.remove('is-selected'));
            if (val !== '') item.classList.add('is-selected');

            customWrap.classList.remove('is-open');
            menu.classList.add('hidden');
        };
    });
}

function renderCustomDatasetDropdowns() {
    ['train-dataset', 'train-test-dataset', 'train-val-dataset'].forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;

        buildCustomDropdown(id, (options, selectedVal) => {
            if (STATE.datasets.length === 0) {
                return '<div class="p-3 text-center text-xs text-rose-mauve">Belum ada dataset diunggah.</div>';
            }
            const placeholderText = id === 'train-dataset' ? '-- Pilih Dataset --' : (id === 'train-test-dataset' ? '-- Pilih Dataset Uji --' : '-- Tanpa Validasi (Opsional) --');
            return `
                <div class="custom-dropdown-item ${selectedVal === '' ? 'is-selected' : ''}" data-value="">
                    <span class="text-xs text-rose-mauve italic">${placeholderText}</span>
                </div>
                ${STATE.datasets.map(d => `
                    <div class="custom-dropdown-item ${String(d.id) === String(selectedVal) ? 'is-selected' : ''}" data-value="${d.id}">
                        <div class="flex items-center justify-between mb-0.5">
                            <span class="font-bold text-dark text-xs sm:text-sm">${d.name}</span>
                            <span class="badge badge-neutral text-2xs">${d.total_samples} baris</span>
                        </div>
                        <div class="text-[11px] text-rose-mauve font-mono">SHA: ${d.file_hash.substring(0, 10)}...</div>
                    </div>
                `).join('')}
            `;
        });
    });
}

function initStaticCustomDropdowns() {
    ['train-model-type', 'param-kernel', 'param-gamma'].forEach(id => {
        buildCustomDropdown(id);
    });
}

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
                    
                    buildCustomDropdown(ddId, (options, selectedVal) => {
                        if (completedJobs.length === 0) {
                            return '<div class="p-3 text-center text-xs text-rose-mauve">Belum ada model terlatih.</div>';
                        }
                        return `
                            <div class="custom-dropdown-item ${selectedVal === '' ? 'is-selected' : ''}" data-value="">
                                <span class="text-xs text-rose-mauve italic">-- Pilih Model --</span>
                            </div>
                            ${completedJobs.map(job => `
                                <div class="custom-dropdown-item ${String(job.id) === String(selectedVal) ? 'is-selected' : ''}" data-value="${job.id}">
                                    <div class="timeline-meta-grid">
                                        <div class="meta-row">
                                            <span class="meta-label">Nama model</span>
                                            <span class="meta-colon">:</span>
                                            <span class="meta-val font-bold text-dark">${job.exp_name}</span>
                                        </div>
                                        <div class="meta-row">
                                            <span class="meta-label">Algoritma</span>
                                            <span class="meta-colon">:</span>
                                            <span class="meta-val text-purple font-semibold">${job.model_type.toUpperCase()}</span>
                                        </div>
                                        <div class="meta-row">
                                            <span class="meta-label">Dataset</span>
                                            <span class="meta-colon">:</span>
                                            <span class="meta-val text-rose-mauve font-mono">${job.dataset_name}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        `;
                    });
                });
            }
        });
}

// Global click outside to close custom dropdowns
document.addEventListener('click', () => {
    document.querySelectorAll('.custom-dropdown-container').forEach(c => {
        c.classList.remove('is-open');
        const m = c.querySelector('.custom-dropdown-menu');
        if (m) m.classList.add('hidden');
    });
});

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
            let pValMain = "";
            let pValSub = "";
            
            if (pVal === 0) {
                pValMain = "0.0000";
                pValSub = "Nilai P-Value sangat mendekati 0";
            } else if (pVal < 0.0001) {
                pValMain = pVal.toExponential(4);
                pValSub = `Desimal: ${pVal.toFixed(8)}`;
            } else {
                pValMain = pVal.toFixed(6);
                pValSub = `Eksponensial: ${pVal.toExponential(2)}`;
            }
            
            document.getElementById('mc-p-value').textContent = pValMain;
            const subEl = document.getElementById('mc-p-subtext');
            if (subEl) subEl.textContent = pValSub;
            
            const card = document.getElementById('mc-sig-card');
            const conclusion = document.getElementById('mc-conclusion');
            const explanation = document.getElementById('mc-explanation-text');
            
            if (data.significant) {
                card.className = "mcnemar-status-card significant text-center p-4 rounded-2xl";
                conclusion.textContent = "Signifikan Secara Statistik (p < 0.05)";
                conclusion.className = "inline-block px-3 py-1 rounded-full text-xs font-bold bg-pink text-white shadow-sm";
                explanation.innerHTML = `Model memiliki tingkat performa yang <strong>berbeda secara signifikan</strong>. Hipotesis nol (H0) ditolak, yang berarti perbedaan akurasi antara Model A dan Model B bukan merupakan kebetulan belaka melainkan didukung oleh bukti statistik yang kuat.`;
            } else {
                card.className = "mcnemar-status-card not-significant text-center p-4 rounded-2xl";
                conclusion.textContent = "Tidak Signifikan (p >= 0.05)";
                conclusion.className = "inline-block px-3 py-1 rounded-full text-xs font-bold bg-rose-mauve/20 text-dark";
                explanation.innerHTML = `Kedua model memiliki performa yang <strong>setara secara statistik</strong>. Hipotesis nol (H0) gagal ditolak, yang berarti variasi performa di antara mereka kemungkinan besar disebabkan oleh noise sampling acak saja.`;
            }

            // Auto-scroll to Hasil Analisis Signifikansi Statistik on mobile / tablet (< 1024px)
            if (window.innerWidth <= 1024) {
                setTimeout(() => {
                    const targetPanel = document.getElementById('mcnemar-result-panel-card') || document.getElementById('mcnemar-result-state');
                    if (targetPanel) {
                        targetPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 120);
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
            const outputContainer = document.getElementById('pred-output-container');
            outputContainer.classList.remove('hidden');
            outputContainer.classList.add('animate-fadeInUp');
            setTimeout(() => outputContainer.classList.remove('animate-fadeInUp'), 500);
            
            const predLabelEl = document.getElementById('pred-label');
            predLabelEl.textContent = data.label;
            
            // Dynamic badge color coding based on predicted sentiment
            const lbl = String(data.label).toLowerCase();
            const badgeClass = lbl.includes('pos') ? 'badge-success' : (lbl.includes('neg') ? 'badge-danger' : 'badge-info');
            predLabelEl.className = `badge ${badgeClass} text-sm px-3 py-1.5 font-bold`;
            
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

// --- BATCH PREDICTION DRAG & DROP BINDINGS ---
const batchDropzone = document.getElementById('batch-dropzone');
const batchFileInput = document.getElementById('batch-file-input');

if (batchDropzone && batchFileInput) {
    batchDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        batchDropzone.classList.add('dragover');
    });

    batchDropzone.addEventListener('dragleave', () => {
        batchDropzone.classList.remove('dragover');
    });

    batchDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        batchDropzone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            batchFileInput.files = files;
            updateBatchDropzoneUI(files[0]);
        }
    });

    batchFileInput.addEventListener('change', () => {
        if (batchFileInput.files.length > 0) {
            updateBatchDropzoneUI(batchFileInput.files[0]);
        }
    });
}

function updateBatchDropzoneUI(file) {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
        showToast("Format berkas harus berekstensi .csv", true);
        return;
    }
    const dropzone = document.getElementById('batch-dropzone');
    const label = document.getElementById('batch-dropzone-label');
    const sub = document.getElementById('batch-dropzone-sub');
    if (dropzone) dropzone.classList.add('has-file');
    if (label) label.innerHTML = `📄 <strong class="text-pink font-mono">${file.name}</strong>`;
    if (sub) sub.textContent = `Ukuran: ${(file.size / 1024).toFixed(1)} KB (Klik untuk ganti file)`;
    showToast(`File "${file.name}" siap diproses.`);
}

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
                    renderEmptyTableState(
                        tbody,
                        8,
                        'archive',
                        'Belum Ada Model di Registry',
                        'Model yang telah selesai dilatih dan terevaluasi akan secara otomatis terdaftar pada repositori ini.'
                    );
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
                        <td data-label="Job ID" class="font-bold text-xs font-mono">#${model.job_id}</td>
                        <td data-label="Nama Model" class="font-semibold text-dark card-header-cell">${model.exp_name}</td>
                        <td data-label="Algoritma"><span class="badge badge-neutral">${model.model_type.toUpperCase()}</span></td>
                        <td data-label="Akurasi" class="font-bold text-dark font-mono text-xs">${acc}</td>
                        <td data-label="Macro F1" class="font-bold text-pink font-mono text-xs">${f1}</td>
                        <td data-label="Hash Model"><code class="text-xs bg-warm-gray px-1.5 py-0.5 rounded font-mono">${model.artifact_hash.substring(0, 8)}...</code></td>
                        <td data-label="Status Lifecycle">
                            <select class="table-status-select" onchange="updateModelLifecycleState(${model.job_id}, this.value)">
                                <option value="Active" ${optActive}>Active</option>
                                <option value="Archived" ${optArchived}>Archived</option>
                                <option value="Deprecated" ${optDeprecated}>Deprecated</option>
                            </select>
                        </td>
                        <td data-label="Aksi" class="card-actions-cell">
                            <div class="flex items-center gap-1 justify-center">
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
    navigateToView('prediction', true);
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
    const currentView = getViewFromPath();
    handleViewActivated(currentView);
});


// --- INITIALIZATION & ROUTING ---
// Handle Browser Back / Forward buttons
window.addEventListener('popstate', (e) => {
    const viewId = (e.state && e.state.view) ? e.state.view : getViewFromPath();
    navigateToView(viewId, false);
});

// Fallback for legacy hash URLs (e.g., if navigated via #preprocess)
window.addEventListener('hashchange', () => {
    if (window.location.hash) {
        const viewId = window.location.hash.substring(1);
        window.location.hash = '';
        navigateToView(viewId, true);
    }
});

// Sidebar link click handling for clean SPA transitions
document.addEventListener('click', (e) => {
    const menuLink = e.target.closest('.sidebar-menu a.menu-item');
    if (menuLink) {
        e.preventDefault();
        const href = menuLink.getAttribute('href') || '';
        const viewId = href.replace(/^[\/#]+/, '');
        if (viewId) {
            navigateToView(viewId, true);
        }
    }
});

// Sidebar drawer toggle on mobile / mini sidebar toggle on desktop
document.getElementById('sidebar-toggle').addEventListener('click', () => {
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.toggle('open');
    } else {
        toggleDesktopSidebar();
    }
});

// Desktop Collapsed Sidebar State Controller
function toggleDesktopSidebar(forceState = null) {
    const appWrapper = document.getElementById('app-wrapper');
    if (!appWrapper) return;
    
    const isCurrentlyCollapsed = appWrapper.classList.contains('sidebar-collapsed');
    const newState = forceState !== null ? forceState : !isCurrentlyCollapsed;
    
    if (newState) {
        appWrapper.classList.add('sidebar-collapsed');
        localStorage.setItem('ummu_sidebar_collapsed', 'true');
    } else {
        appWrapper.classList.remove('sidebar-collapsed');
        localStorage.setItem('ummu_sidebar_collapsed', 'false');
    }
    
    // Dispatch window resize event so charts / ApexCharts adapt smoothly if any
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 320);
}

function initSidebarState() {
    if (window.innerWidth > 768) {
        const savedState = localStorage.getItem('ummu_sidebar_collapsed');
        if (savedState === 'true') {
            const appWrapper = document.getElementById('app-wrapper');
            if (appWrapper) appWrapper.classList.add('sidebar-collapsed');
        }
    }
}

window.toggleDesktopSidebar = toggleDesktopSidebar;

// Detect outside clicks to dismiss sidebar drawer on mobile
document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    if (sidebar && toggle && window.innerWidth <= 768 && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
    }
});

// Global Keyboard Accessibility (Escape key closes modals, drawers, dropdowns)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.keyCode === 27) {
        // 0. Close PWA Install Modal
        const pwaModal = document.getElementById('pwa-install-modal');
        if (pwaModal && !pwaModal.classList.contains('hidden')) {
            hidePwaInstallModal(false);
            return;
        }
        // 1. Close Info Modal
        const infoModal = document.getElementById('preprocess-info-modal');
        if (infoModal && !infoModal.classList.contains('hidden')) {
            if (typeof closePreprocessInfoModal === 'function') closePreprocessInfoModal();
            return;
        }
        // 2. Dismiss Confirm Modal
        const confirmModal = document.getElementById('confirm-modal');
        if (confirmModal && !confirmModal.classList.contains('hidden')) {
            const cancelBtn = document.getElementById('confirm-btn-cancel');
            if (cancelBtn) cancelBtn.click();
            return;
        }
        // 3. Close open custom dropdowns
        document.querySelectorAll('.custom-dropdown-container.is-open').forEach(c => {
            c.classList.remove('is-open');
            const m = c.querySelector('.custom-dropdown-menu');
            if (m) m.classList.add('hidden');
        });
        // 4. Close mobile sidebar
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    }
});

// Startup Bootstrapper
document.addEventListener('DOMContentLoaded', () => {
    // Bind click handlers for custom confirm modal
    document.getElementById('confirm-btn-ok')?.addEventListener('click', () => {
        if (confirmPromiseResolve) {
            confirmPromiseResolve(true);
            confirmPromiseResolve = null;
        }
    });

    document.getElementById('confirm-btn-cancel')?.addEventListener('click', () => {
        if (confirmPromiseResolve) {
            confirmPromiseResolve(false);
            confirmPromiseResolve = null;
        }
    });

    document.getElementById('confirm-modal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('confirm-modal')) {
            if (confirmPromiseResolve) {
                confirmPromiseResolve(false);
                confirmPromiseResolve = null;
            }
        }
    });

    // PWA Modal backdrop click
    document.getElementById('pwa-install-modal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('pwa-install-modal')) {
            hidePwaInstallModal(false);
        }
    });

    initSidebarState();
    checkAuthentication();
    initStaticCustomDropdowns();
});

// --- BACKEND HEALTH CHECK & SERVER OFFLINE INTERCEPTOR ---
let isBackendOnline = true;
let healthCheckTimer = null;
let isHealthCheckRunning = false;

function setBackendOnlineStatus(online) {
    const banner = document.getElementById('server-offline-banner');
    
    if (!online) {
        if (isBackendOnline) {
            isBackendOnline = false;
            if (banner) banner.classList.remove('hidden');
            startAggressiveHealthCheck();
        }
    } else {
        if (!isBackendOnline) {
            isBackendOnline = true;
            if (banner) banner.classList.add('hidden');
            showToast("Terhubung kembali ke Server AI!", false);
            // Refresh current view data automatically
            const currentView = STATE.currentView || getViewFromPath();
            handleViewActivated(currentView);
        } else {
            if (banner && !banner.classList.contains('hidden')) {
                banner.classList.add('hidden');
            }
        }
    }
}

async function checkBackendHealth() {
    if (isHealthCheckRunning) return isBackendOnline;
    isHealthCheckRunning = true;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await originalFetch('/api/v1/system/resources?_t=' + Date.now(), {
            method: 'GET',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (res.ok) {
            setBackendOnlineStatus(true);
            isHealthCheckRunning = false;
            return true;
        } else {
            setBackendOnlineStatus(false);
            isHealthCheckRunning = false;
            return false;
        }
    } catch (e) {
        setBackendOnlineStatus(false);
        isHealthCheckRunning = false;
        return false;
    }
}

function startAggressiveHealthCheck() {
    if (healthCheckTimer) clearInterval(healthCheckTimer);
    healthCheckTimer = setInterval(async () => {
        const healthy = await checkBackendHealth();
        if (healthy && healthCheckTimer) {
            clearInterval(healthCheckTimer);
            healthCheckTimer = null;
        }
    }, 6000);
}

async function triggerManualHealthCheck(btnElement) {
    if (btnElement) {
        btnElement.classList.add('checking');
        const textSpan = btnElement.querySelector('span');
        if (textSpan) textSpan.textContent = 'Memeriksa...';
    }
    
    const isOnline = await checkBackendHealth();
    
    if (btnElement) {
        btnElement.classList.remove('checking');
        const textSpan = btnElement.querySelector('span');
        if (textSpan) textSpan.textContent = isOnline ? 'Terhubung!' : 'Cek Koneksi';
    }
}

window.triggerManualHealthCheck = triggerManualHealthCheck;
window.setBackendOnlineStatus = setBackendOnlineStatus;

// Global Fetch Interceptor for API Calls
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    try {
        const response = await originalFetch.apply(this, args);
        const urlStr = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
        
        if (urlStr.includes('/api/')) {
            if (response.status >= 500) {
                setBackendOnlineStatus(false);
            } else if (response.status === 200) {
                setBackendOnlineStatus(true);
            }
        }
        return response;
    } catch (error) {
        const urlStr = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
        if (urlStr.includes('/api/')) {
            setBackendOnlineStatus(false);
        }
        throw error;
    }
};

// --- PWA SERVICE WORKER & AUTO INSTALL PROMPT ENGINE ---
let deferredInstallPrompt = null;
let pwaPromptShownThisSession = false;

function checkAutoPwaInstallPrompt() {
    if (pwaPromptShownThisSession) return;

    // 1. Check if already running in standalone app mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) return;

    // 2. Check if user already installed the app
    const isAlreadyInstalled = localStorage.getItem('ummu_pwa_installed') === 'true';
    if (isAlreadyInstalled) return;

    // 3. Check if user dismissed prompt recently (within 3 days)
    const dismissedTimestamp = localStorage.getItem('ummu_pwa_prompt_dismissed');
    const isDismissedRecently = dismissedTimestamp && (Date.now() - parseInt(dismissedTimestamp, 10)) < 3 * 24 * 60 * 60 * 1000;
    if (isDismissedRecently) return;

    // 4. Automatically show the minimalist install modal
    pwaPromptShownThisSession = true;
    setTimeout(() => {
        showPwaInstallModal();
    }, 700);
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    console.log('[PWA] beforeinstallprompt event captured and ready.');
    checkAutoPwaInstallPrompt();
});

// Fallback auto-check on window load (for all browsers / first visit)
window.addEventListener('load', () => {
    setTimeout(checkAutoPwaInstallPrompt, 1000);
});

window.addEventListener('appinstalled', () => {
    console.log('[PWA] Ummu NLP Lab application installed successfully!');
    localStorage.setItem('ummu_pwa_installed', 'true');
    deferredInstallPrompt = null;
    hidePwaInstallModal();
    if (typeof showToast === 'function') {
        showToast('Aplikasi Ummu NLP Lab berhasil diinstall!');
    }
});

function showPwaInstallModal() {
    const modal = document.getElementById('pwa-install-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('active');
        if (window.lucide) lucide.createIcons();
    }, 10);
}

function hidePwaInstallModal(rememberDismiss = false) {
    const modal = document.getElementById('pwa-install-modal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 250);
    if (rememberDismiss) {
        localStorage.setItem('ummu_pwa_prompt_dismissed', Date.now().toString());
    }
}

async function triggerPwaInstall() {
    if (deferredInstallPrompt) {
        try {
            deferredInstallPrompt.prompt();
            const choiceResult = await deferredInstallPrompt.userChoice;
            console.log('[PWA] User choice outcome:', choiceResult.outcome);
            if (choiceResult.outcome === 'accepted') {
                localStorage.setItem('ummu_pwa_installed', 'true');
                if (typeof showToast === 'function') {
                    showToast('Memasang aplikasi NLP Lab ke perangkat Anda...');
                }
            }
            deferredInstallPrompt = null;
            hidePwaInstallModal();
        } catch (err) {
            console.warn('[PWA] Prompt error:', err);
            hidePwaInstallModal();
        }
    } else {
        hidePwaInstallModal();
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        if (typeof showToast === 'function') {
            if (isIOS) {
                showToast('💡 Klik tombol Bagikan (Share ⎋) di browser Safari -> pilih "Tambah ke Layar Utama"');
            } else if (isMobile) {
                showToast('💡 Buka menu browser (⋮) -> pilih "Install Aplikasi" atau "Tambah ke Layar Utama"');
            } else {
                showToast('💡 Klik ikon Install (💻 / ⊕) di bilah alamat URL browser atau menu (⋮) -> "Install Ummu NLP Lab"');
            }
        }
    }
}

// Bind PWA functions globally to window for guaranteed inline onclick execution
window.showPwaInstallModal = showPwaInstallModal;
window.hidePwaInstallModal = hidePwaInstallModal;
window.triggerPwaInstall = triggerPwaInstall;

// --- PWA AUTO-UPDATE ENGINE (ZERO REINSTALL REQUIRED) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then((registration) => {
                console.log('[PWA] Service Worker active with scope:', registration.scope);

                // 1. Check for SW updates periodically (every 10 minutes)
                setInterval(() => {
                    registration.update().catch(() => {});
                }, 10 * 60 * 1000);

                // 2. Check for updates on tab focus / visibility change
                document.addEventListener('visibilitychange', () => {
                    if (document.visibilityState === 'visible') {
                        registration.update().catch(() => {});
                    }
                });
                window.addEventListener('focus', () => {
                    registration.update().catch(() => {});
                });

                // 3. Detect new updates immediately when pushed
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('[PWA] New version detected! Automatically activating update...');
                            // Instruct the new service worker to skip waiting
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                });
            })
            .catch((err) => {
                console.warn('[PWA] Service Worker registration skipped/failed:', err);
            });

        // 4. Seamlessly refresh page when the new Service Worker takes over
        let isRefreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!isRefreshing) {
                isRefreshing = true;
                console.log('[PWA] Service Worker updated to new version. Refreshing seamlessly...');
                window.location.reload();
            }
        });
    });
}

// --- APP LAUNCH SPLASH LOADING SCREEN CONTROLLER ---
function hideAppSplash() {
    const splash = document.getElementById('app-splash-screen');
    if (splash && !splash.classList.contains('fade-out')) {
        splash.classList.add('fade-out');
        setTimeout(() => {
            if (splash.parentNode) {
                splash.parentNode.removeChild(splash);
            }
        }, 550);
    }
}

window.addEventListener('load', () => {
    setTimeout(hideAppSplash, 400);
});
// Fallback safety timer to ensure splash never hangs
setTimeout(hideAppSplash, 1500);




