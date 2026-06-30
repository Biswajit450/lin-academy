// cms.js

import { doc, getDoc, setDoc, arrayUnion, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { auth, db, storage } from "./firebase-config.js";

// 🚨 THE SYNC LOCK GUARD 🚨
window.cmsDataLoaded = false;

// Global Drag & Drop Utilities
window.drag = function(ev) {
    window.draggedElement = ev.currentTarget;
}
window.allowDrop = function(ev) {
    ev.preventDefault();
}

// Image Preview & Clear Utilities for CMS
window.previewImage = function(input, previewId) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById(previewId);
            img.src = e.target.result;
            img.classList.remove('hidden');
            const parent = img.parentElement;
            const icon = parent.querySelector('i');
            const span = parent.querySelector('span');
            if(icon) icon.style.display = 'none';
            if(span) span.style.display = 'none';
        }
        reader.readAsDataURL(file);
    }
}

window.clearImagePreview = function(previewId, inputId) {
    document.getElementById(inputId).value = '';
    const img = document.getElementById(previewId);
    img.src = '';
    img.classList.add('hidden');
    const parent = img.parentElement;
    const icon = parent.querySelector('i');
    const span = parent.querySelector('span');
    if(icon) icon.style.display = '';
    if(span) span.style.display = '';
}

async function uploadFileToStorage(file, folderPath, fallbackPreviewId) {
    if (!file) return null;
    try {
        const filename = Date.now() + '_' + file.name;
        const storageRef = ref(storage, folderPath + '/' + filename);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    } catch(err) {
        console.warn("Storage upload failed (probably security rules). Executing Smart Base64 Fallback.", err.message);
        if (fallbackPreviewId) {
            const imgEl = document.getElementById(fallbackPreviewId);
            if (imgEl && imgEl.src) return imgEl.src;
        }
        return null;
    }
}

// ==========================================
// ADMIN CMS ENGINE (PRO LEVEL)
// ==========================================
window.switchAdminSubTab = function(tabId) {
    document.querySelectorAll('.admin-subtab').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active', 'text-brand-blue', 'border-brand-blue');
        btn.classList.add('text-slate-500', 'border-transparent');
    });
    
    document.getElementById('admin-subtab-' + tabId).classList.remove('hidden');
    event.currentTarget.classList.remove('text-slate-500', 'border-transparent');
    event.currentTarget.classList.add('active', 'text-brand-blue', 'border-brand-blue');
    
    if(tabId === 'homecms') { 
        window.loadCMSDataIntoAdmin(); 
    } else if (tabId === 'deployer') {
        window.loadDeployerCategories(); // Load category list when deployer is opened
    }
}

window.cmsAddNotification = function(text = '') {
    const list = document.getElementById('cms-notification-list');
    const placeholder = list.querySelector('.text-slate-400');
    if(placeholder) placeholder.remove(); 
    
    const id = 'notif-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = "cms-notif-item bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 cursor-move";
    div.draggable = true;
    div.ondragstart = window.drag; 
    
    div.innerHTML = `
        <i class="fa-solid fa-grip-vertical text-slate-400 px-2 cursor-grab"></i>
        <input type="text" class="notif-text w-full bg-transparent border-none outline-none text-sm text-slate-800 dark:text-white" value="${text}" placeholder="Enter announcement text...">
        <button type="button" onclick="document.getElementById('${id}').remove()" class="text-slate-400 hover:text-rose-500 transition-colors"><i class="fa-solid fa-trash"></i></button>
    `;
    list.appendChild(div);
}

window.dropSort = function(ev) {
    ev.preventDefault();
    if(window.draggedElement && window.draggedElement.classList.contains('cms-notif-item')) {
        const dropTarget = ev.target.closest('.cms-notif-item');
        const list = document.getElementById('cms-notification-list');
        
        if(dropTarget && window.draggedElement !== dropTarget) {
            dropTarget.parentNode.insertBefore(window.draggedElement, dropTarget);
        } else if (!dropTarget && ev.target.id === 'cms-notification-list') {
            list.appendChild(window.draggedElement);
        }
    }
}

// 🚀 NEW: Carousel Drag & Drop Logic
window.dropSortCarousel = function(ev) {
    ev.preventDefault();
    if(window.draggedElement && window.draggedElement.classList.contains('cms-slide-item')) {
        const dropTarget = ev.target.closest('.cms-slide-item');
        const list = document.getElementById('cms-carousel-list');
        if(dropTarget && window.draggedElement !== dropTarget) dropTarget.parentNode.insertBefore(window.draggedElement, dropTarget);
        else if (!dropTarget && ev.target.id === 'cms-carousel-list') list.appendChild(window.draggedElement);
    }
}

// 🚀 NEW: Add Slide Dynamic HTML
window.cmsAddCarouselSlide = function(slideData = null) {
    const list = document.getElementById('cms-carousel-list');
    const placeholder = list.querySelector('.text-slate-400.text-center');
    if(placeholder) placeholder.remove();

    const id = 'slide-' + Date.now() + Math.floor(Math.random() * 1000);
    const title = slideData && slideData.title ? slideData.title : '';
    const subtitle = slideData && slideData.subtitle ? slideData.subtitle : '';
    const btnText = slideData && slideData.btnText ? slideData.btnText : '';
    const link = slideData && slideData.link ? slideData.link : '';
    const imgUrl = slideData && slideData.imgUrl ? slideData.imgUrl : '';

    let photoPreviewHtml = imgUrl ? `<img id="preview-${id}" src="${imgUrl}" class="absolute inset-0 w-full h-full object-cover z-10">` : `<img id="preview-${id}" class="absolute inset-0 w-full h-full object-cover hidden z-10">`;

    const div = document.createElement('div');
    div.id = id;
    div.className = "cms-slide-item bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 shadow-sm cursor-move relative";
    div.draggable = true;
    div.ondragstart = window.drag;

    div.innerHTML = `
        <div class="shrink-0 w-full md:w-48 flex flex-col items-center">
            <div class="w-full h-28 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden relative bg-white dark:bg-slate-900 cursor-pointer hover:border-brand-blue transition-colors" onclick="document.getElementById('upload-${id}').click()">
                ${photoPreviewHtml}
                <i class="fa-solid fa-image text-slate-300 text-2xl mb-1"></i>
            </div>
            <input type="file" id="upload-${id}" class="slide-upload hidden" accept="image/*" onchange="window.previewImage(this, 'preview-${id}')">
            <input type="hidden" class="slide-existing-photo" value="${imgUrl}">
            <button type="button" onclick="window.clearImagePreview('preview-${id}', 'upload-${id}'); document.getElementById('${id}').querySelector('.slide-existing-photo').value='';" class="text-[10px] text-rose-500 hover:underline mt-2 font-bold">Remove Image</button>
        </div>
        <div class="flex-grow w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
                <label class="text-[9px] font-bold text-slate-400 mb-1 block uppercase">Title (Optional)</label>
                <input type="text" class="slide-title w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none" value="${title}" placeholder="e.g. Mega Launch">
            </div>
            <div>
                <label class="text-[9px] font-bold text-slate-400 mb-1 block uppercase">Button Text (Optional)</label>
                <input type="text" class="slide-btn w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none" value="${btnText}" placeholder="e.g. Enroll Now">
            </div>
            <div class="sm:col-span-2">
                <label class="text-[9px] font-bold text-slate-400 mb-1 block uppercase">Subtitle (Optional)</label>
                <input type="text" class="slide-subtitle w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none" value="${subtitle}" placeholder="Short description...">
            </div>
            <div class="sm:col-span-2 flex gap-2">
                <div class="flex-grow">
                    <label class="text-[9px] font-bold text-slate-400 mb-1 block uppercase">Target Link URL</label>
                    <input type="text" class="slide-link w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none" value="${link}" placeholder="https://...">
                </div>
                <button type="button" onclick="document.getElementById('${id}').remove()" class="text-slate-400 hover:text-rose-500 transition-colors self-end pb-2 ml-2"><i class="fa-solid fa-trash text-lg"></i></button>
            </div>
        </div>
    `;
    list.appendChild(div);
}

window.cmsAddArenaCategory = function(catData = null) {
    const list = document.getElementById('cms-arena-category-list');
    const placeholder = list.querySelector('.text-slate-400.text-center');
    if(placeholder) placeholder.remove();
    
    const catId = 'cat-' + Date.now() + Math.floor(Math.random()*1000);
    const catName = catData ? catData.name : '';
    
    const div = document.createElement('div');
    div.id = catId;
    div.className = "cms-arena-cat-item bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm";
    div.innerHTML = `
        <div class="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-700 pb-3">
            <input type="text" class="cat-name w-1/2 bg-transparent border-none outline-none font-bold text-slate-800 dark:text-white text-lg placeholder-slate-400" placeholder="Category Name (e.g., Weekly Mock Tests)" value="${catName}">
            <div class="flex gap-3 items-center">
                <button type="button" onclick="window.cmsAddArenaTestToCat('${catId}')" class="text-xs bg-brand-blue text-white px-3 py-1.5 rounded-lg font-bold">+ Add Test</button>
                <button type="button" onclick="document.getElementById('${catId}').remove()" class="text-xs text-rose-500 hover:underline font-bold">Delete Category</button>
            </div>
        </div>
        <div class="cat-tests-list space-y-3 pl-4 border-l-2 border-slate-200 dark:border-slate-800">
        </div>`;
    list.appendChild(div);
    
    if(catData && catData.tests) {
        catData.tests.forEach(test => window.cmsAddArenaTestToCat(catId, test));
    }
}

window.cmsAddArenaTestToCat = function(catId, testData = null) {
    const testList = document.getElementById(catId).querySelector('.cat-tests-list');
    const testId = 'test-' + Date.now() + Math.floor(Math.random()*1000);
    
    const name = testData ? testData.name : '';
    const vaultId = testData ? testData.vaultId : '';
    const status = testData ? testData.status : 'live';

    const div = document.createElement('div');
    div.id = testId;
    div.className = "cms-arena-test-item flex flex-col md:flex-row gap-3 items-end bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800";
    div.innerHTML = `
        <div class="w-full md:w-2/5">
            <label class="text-[10px] font-bold text-slate-400 block mb-1">TEST NAME</label>
            <input type="text" class="test-name w-full p-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 outline-none dark:text-white" value="${name}" placeholder="e.g., Minor Test 1">
        </div>
        <div class="w-full md:w-2/5">
            <div class="flex justify-between items-center">
                <label class="text-[10px] font-bold text-slate-400 block mb-1">VAULT ID</label>
                <button type="button" onclick="window.openTestModal()" class="text-emerald-500 hover:underline font-bold text-[10px]"><i class="fa-solid fa-flask"></i> Create New</button>
            </div>
            <input type="text" class="test-vault w-full p-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 outline-none dark:text-white" value="${vaultId}" placeholder="Paste Vault ID Here">
        </div>
        <div class="w-full md:w-1/5">
            <label class="text-[10px] font-bold text-slate-400 block mb-1">STATUS</label>
            <select class="test-status w-full p-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 outline-none dark:text-white font-bold">
                <option value="live" ${status==='live'?'selected':''}>🟢 Live</option>
                <option value="locked" ${status==='locked'?'selected':''}>🔒 Locked</option>
            </select>
        </div>
        <button type="button" onclick="document.getElementById('${testId}').remove()" class="text-slate-400 hover:text-rose-500 p-2 mb-0.5"><i class="fa-solid fa-trash"></i></button>`;
    testList.appendChild(div);
}

window.cmsAddEducator = function(eduData = null) {
    const list = document.getElementById('cms-educator-list');
    const placeholder = list.querySelector('.text-slate-400.text-center');
    if(placeholder) placeholder.remove();
    
    const id = 'edu-' + Date.now();
    const name = eduData ? eduData.name : '';
    const exp = eduData ? eduData.expertise : '';
    const qual = eduData ? eduData.qualifications : '';
    const photoUrl = eduData ? eduData.photoUrl : '';
    
    let photoPreviewHtml = photoUrl 
        ? `<img id="preview-${id}" src="${photoUrl}" class="absolute inset-0 w-full h-full object-cover">` 
        : `<img id="preview-${id}" class="absolute inset-0 w-full h-full object-cover hidden">`;
    let iconDisplay = photoUrl ? 'style="display:none;"' : '';

    const div = document.createElement('div');
    div.id = id;
    div.className = "cms-edu-item bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-6 items-start shadow-sm";
    div.innerHTML = `
        <div class="flex flex-col items-center gap-2">
            <div class="shrink-0 w-24 h-24 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden relative bg-white dark:bg-slate-900 cursor-pointer hover:border-brand-blue transition-colors" onclick="document.getElementById('upload-${id}').click()">
                ${photoPreviewHtml}
                <i class="fa-solid fa-camera text-slate-300 text-2xl" ${iconDisplay}></i>
            </div>
            <input type="file" id="upload-${id}" class="edu-upload hidden" accept="image/*" onchange="window.previewImage(this, 'preview-${id}')">
            <input type="hidden" class="edu-existing-photo" value="${photoUrl}">
            <button type="button" onclick="window.clearImagePreview('preview-${id}', 'upload-${id}'); document.getElementById('${id}').querySelector('.edu-existing-photo').value='';" class="text-[10px] text-rose-500 hover:underline">Remove Photo</button>
        </div>
        
        <div class="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <div>
                <label class="text-[10px] font-bold text-slate-400 block mb-1">EDUCATOR NAME</label>
                <input type="text" class="edu-name w-full p-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none" value="${name}" placeholder="e.g. Dr. Biswajit">
            </div>
            <div>
                <label class="text-[10px] font-bold text-slate-400 block mb-1">EXPERTISE</label>
                <input type="text" class="edu-exp w-full p-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none" value="${exp}" placeholder="e.g. Zoology & Anatomy">
            </div>
            <div class="md:col-span-2">
                <label class="text-[10px] font-bold text-slate-400 block mb-1">QUALIFICATIONS</label>
                <input type="text" class="edu-qual w-full p-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none" value="${qual}" placeholder="e.g. MBBS, AIIMS Delhi">
            </div>
        </div>
        <button type="button" onclick="document.getElementById('${id}').remove()" class="text-slate-400 hover:text-rose-500 transition-colors pt-2 md:pt-8"><i class="fa-solid fa-trash text-lg"></i></button>`;
    list.appendChild(div);
}

window.saveCMSData = async function() {
    if (!window.cmsDataLoaded) {
        alert("⚠️ SYNC LOCK ACTIVE: Background data is still loading. Please wait a few seconds before publishing, or refresh the page!");
        return;
    }

    const btn = event.currentTarget; 
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing to Cloud...'; 
    btn.disabled = true;

    try {
        let globalLogoUrl = document.getElementById('cms-logo-preview').src;
        const logoFileInput = document.getElementById('cms-logo-upload').files[0];
        if(logoFileInput) {
            const upUrl = await uploadFileToStorage(logoFileInput, 'cms_images/logo', 'cms-logo-preview');
            if(upUrl) globalLogoUrl = upUrl;
        } else if (!globalLogoUrl || globalLogoUrl.includes('index.html')) {
            globalLogoUrl = ''; 
        }

        const notifications = [];
        document.querySelectorAll('.cms-notif-item').forEach(item => {
            const text = item.querySelector('.notif-text').value.trim();
            if(text) notifications.push(text);
        });

        // 🚀 NEW: Process Multiple Carousel Slides
        const carousel_slides = [];
        const slideNodes = document.querySelectorAll('.cms-slide-item');
        for (let item of slideNodes) {
            let imgUrl = item.querySelector('.slide-existing-photo').value;
            const fileInput = item.querySelector('.slide-upload').files[0];
            
            if (fileInput) {
                const sUrl = await uploadFileToStorage(fileInput, 'cms_images/carousel', item.querySelector('img').id);
                if(sUrl) imgUrl = sUrl;
            } else if (!imgUrl || imgUrl.includes('index.html')) {
                imgUrl = ''; // Avoid base64 or empty local paths if not selected
            }
            
            carousel_slides.push({
                imgUrl: imgUrl,
                title: item.querySelector('.slide-title').value.trim(),
                subtitle: item.querySelector('.slide-subtitle').value.trim(),
                btnText: item.querySelector('.slide-btn').value.trim(),
                link: item.querySelector('.slide-link').value.trim()
            });
        }

        const arenaCategories = [];
        let validationFailed = false;

        document.querySelectorAll('.cms-arena-cat-item').forEach(catItem => {
            const catName = catItem.querySelector('.cat-name').value.trim();
            if(!catName) {
                alert("⚠️ HOLD ON! One of your Arena Categories is missing a Name. Please give it a title (e.g., 'Weekly Tests') before publishing.");
                validationFailed = true;
                return;
            }

            const tests = [];
            catItem.querySelectorAll('.cms-arena-test-item').forEach(testItem => {
                const tName = testItem.querySelector('.test-name').value.trim();
                const tVault = testItem.querySelector('.test-vault').value.trim();
                
                if(!tName || !tVault) {
                    alert(`⚠️ HOLD ON! In category '${catName}', a test is missing its Name or Vault ID. Please fill them out.`);
                    validationFailed = true;
                    return;
                }

                tests.push({
                    name: tName, 
                    vaultId: tVault,
                    status: testItem.querySelector('.test-status').value
                });
            });
            
            if(!validationFailed) {
                arenaCategories.push({ name: catName, tests: tests });
            }
        });

        if(validationFailed) {
            btn.innerHTML = originalHtml; 
            btn.disabled = false;
            return; 
        }

        const educators = [];
        const eduNodes = document.querySelectorAll('.cms-edu-item');
        for (let item of eduNodes) {
            let photoUrl = item.querySelector('.edu-existing-photo').value;
            const fileInput = item.querySelector('.edu-upload').files[0];
            
            if (fileInput) {
                const pUrl = await uploadFileToStorage(fileInput, 'cms_images/educators', item.querySelector('img').id);
                if(pUrl) photoUrl = pUrl;
            }
            
            educators.push({ 
                name: item.querySelector('.edu-name').value, 
                expertise: item.querySelector('.edu-exp').value,
                qualifications: item.querySelector('.edu-qual').value,
                photoUrl: photoUrl
            });
        }

        const finalCmsData = {
            appLogo: globalLogoUrl,
            notifications: notifications,
            carousel_slides: carousel_slides, // 🚀 NEW ADDITION
            arenaCategories: arenaCategories, 
            educators: educators, 
            updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, "cms", "homepage"), finalCmsData, { merge: true });
        alert("Success! 🚀 Your Homepage CMS is officially published and live for all students.");
        
        window.renderHomepage(); 

    } catch(e) { 
        console.error("CMS Save Error", e); 
        alert("Failed to save CMS data. Check console for details."); 
    } finally { 
        if(!validationFailed) {
            btn.innerHTML = originalHtml; 
            btn.disabled = false; 
        }
    }
}

window.loadCMSDataIntoAdmin = async function() {
    try {
        const snap = await getDoc(doc(db, "cms", "homepage"));
        if(snap.exists()) {
            const data = snap.data();
            
            if(data.appLogo) {
                const logoImg = document.getElementById('cms-logo-preview');
                if(logoImg) {
                    logoImg.src = data.appLogo;
                    logoImg.classList.remove('hidden');
                    const icon = logoImg.parentElement.querySelector('i');
                    if (icon) icon.style.display = 'none';
                }
            }

            const notifList = document.getElementById('cms-notification-list');
            if(notifList) {
                notifList.innerHTML = '';
                if(data.notifications && data.notifications.length > 0) {
                    data.notifications.forEach(text => window.cmsAddNotification(text));
                } else {
                    notifList.innerHTML = '<div class="text-center text-slate-400 text-sm py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl pointer-events-none">Click "+ Add Notification" to create alerts. Drag to reorder priority.</div>';
                }
            }

            // 🚀 NEW: Load Carousel Slides
            const slideList = document.getElementById('cms-carousel-list');
            if(slideList) {
                slideList.innerHTML = '';
                if(data.carousel_slides && data.carousel_slides.length > 0) {
                    data.carousel_slides.forEach(slide => window.cmsAddCarouselSlide(slide));
                } else {
                    slideList.innerHTML = '<div class="text-center text-slate-400 text-sm py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl pointer-events-none">Click "+ Add Slide" to create your first carousel banner.</div>';
                }
            }
            
            const catList = document.getElementById('cms-arena-category-list');
            if(catList) {
                catList.innerHTML = '';
                if(data.arenaCategories && data.arenaCategories.length > 0) { 
                    data.arenaCategories.forEach(cat => window.cmsAddArenaCategory(cat)); 
                } else { 
                    catList.innerHTML = '<div class="text-center text-slate-400 text-sm py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">Click "+ Add Category" (e.g., "NEET UG Minor") to start building Arenas.</div>'; 
                }
            }

            const eduList = document.getElementById('cms-educator-list');
            if(eduList) {
                eduList.innerHTML = '';
                if(data.educators && data.educators.length > 0) { 
                    data.educators.forEach(edu => window.cmsAddEducator(edu)); 
                } else {
                    eduList.innerHTML = '<div class="text-center text-slate-400 text-sm py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl pointer-events-none">Click "+ Add Educator" to create a public profile.</div>';
                }
            }
        }
        window.cmsDataLoaded = true;
    } catch(e) { 
        console.error("CMS Load Error", e); 
        alert("Failed to sync background data. The Sync Guard is active to protect your files.");
    }
}

// ==========================================
// RENDER CMS DATA ON STUDENT HOMEPAGE
// ==========================================

window.renderHomepage = async function() {
    try {
        const snap = await getDoc(doc(db, "cms", "homepage"));
        if(snap.exists()) {
            const data = snap.data();
            
            if(data.appLogo) {
                const desktopLogoImg = document.getElementById('app-logo-img');
                const desktopLogoText = document.getElementById('app-logo-text');
                if(desktopLogoImg) {
                    desktopLogoImg.src = data.appLogo;
                    desktopLogoImg.classList.remove('hidden');
                    if(desktopLogoText) desktopLogoText.classList.add('hidden');
                }
                
                const mobileLogoImg = document.getElementById('mobile-logo-img');
                const mobileLogoText = document.getElementById('mobile-logo-text');
                if(mobileLogoImg) {
                    mobileLogoImg.src = data.appLogo;
                    mobileLogoImg.classList.remove('hidden');
                    if(mobileLogoText) mobileLogoText.classList.add('hidden');
                }
            }

            const notifList = document.getElementById('bell-notif-list');
            const notifCount = document.getElementById('bell-notif-count');
            const notifIndicator = document.getElementById('bell-notif-indicator');
            
            if(data.notifications && data.notifications.length > 0) {
                notifList.innerHTML = '';
                notifCount.innerText = `${data.notifications.length} New`;
                notifIndicator.classList.remove('hidden');
                
                data.notifications.forEach(text => {
                    notifList.innerHTML += `
                        <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50">
                            <p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed"><i class="fa-solid fa-bolt text-amber-500 mr-1"></i> ${text}</p>
                        </div>`;
                });
            } else {
                notifList.innerHTML = '<div class="text-xs text-slate-400 text-center py-4">No new announcements.</div>';
                notifCount.innerText = '0 New';
                notifIndicator.classList.add('hidden');
            }

            // 🚀 NEW: Dynamic Auto-Play Carousel Engine
            const carouselContainer = document.getElementById('student-carousel-container');
            if (carouselContainer) {
                // Clear old interval if it exists (prevents fast-forward glitch)
                if (window.carouselInterval) clearInterval(window.carouselInterval);
                
                if (data.carousel_slides && data.carousel_slides.length > 0) {
                    let slidesHtml = '';
                    let dotsHtml = '';
                    
                    data.carousel_slides.forEach((slide, index) => {
                        // Agar admin ne field khali chhodi hai, toh wo UI par nahi dikhegi! (Zero Restriction)
                        const titleHtml = slide.title ? `<h3 class="text-xl md:text-5xl font-extrabold font-serif mb-2 md:mb-4 leading-tight text-white drop-shadow-lg">${slide.title}</h3>` : '';
                        const subHtml = slide.subtitle ? `<p class="text-blue-50 text-xs md:text-lg mb-4 md:mb-8 max-w-lg mx-auto drop-shadow-md line-clamp-2 md:line-clamp-none">${slide.subtitle}</p>` : '';
                        const btnHtml = slide.btnText ? `<button onclick="window.open('${slide.link || '#'}', '_blank')" class="bg-white text-brand-blue text-xs md:text-base font-bold px-5 py-2 md:px-8 md:py-3 rounded-xl md:rounded-2xl hover:scale-105 transition-transform shadow-md">${slide.btnText}</button>` : '';
                        const bgImage = slide.imgUrl ? `background-image: url('${slide.imgUrl}');` : 'background-color: #2563eb;'; // Fallback blue color
                        
                        slidesHtml += `
                            <div class="carousel-slide absolute inset-0 transition-opacity duration-1000 flex flex-col items-center justify-center text-center bg-cover bg-center p-4 md:p-10 ${index === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0'}" style="${bgImage}">
                                <div class="absolute inset-0 bg-slate-900/60 z-0"></div>
                                <div class="relative z-10 max-w-xl w-full">
                                    ${titleHtml}
                                    ${subHtml}
                                    ${btnHtml}
                                </div>
                            </div>
                        `;
                        
                        dotsHtml += `<button onclick="window.goToSlide(${index})" class="carousel-dot w-2 h-2 md:w-3 md:h-3 rounded-full transition-colors ${index === 0 ? 'bg-white' : 'bg-white/40'} mx-1 shadow-sm"></button>`;
                    });
                    
                    carouselContainer.innerHTML = `
                        ${slidesHtml}
                        <div class="absolute bottom-4 left-0 right-0 flex justify-center z-20">
                            ${dotsHtml}
                        </div>
                    `;

                    // Auto-Play Logic
                    let currentSlide = 0;
                    const totalSlides = data.carousel_slides.length;
                    
                    window.goToSlide = function(index) {
                        const slides = carouselContainer.querySelectorAll('.carousel-slide');
                        const dots = carouselContainer.querySelectorAll('.carousel-dot');
                        if(!slides.length) return;
                        
                        slides[currentSlide].classList.replace('opacity-100', 'opacity-0');
                        slides[currentSlide].classList.replace('z-10', 'z-0');
                        dots[currentSlide].classList.replace('bg-white', 'bg-white/40');
                        
                        currentSlide = index;
                        
                        slides[currentSlide].classList.replace('opacity-0', 'opacity-100');
                        slides[currentSlide].classList.replace('z-0', 'z-10');
                        dots[currentSlide].classList.replace('bg-white/40', 'bg-white');
                    };
                    
                    if (totalSlides > 1) {
                        window.carouselInterval = setInterval(() => {
                            window.goToSlide((currentSlide + 1) % totalSlides);
                        }, 4000); // Badlega har 4 second mein
                    }
                } else {
                    carouselContainer.classList.add('hidden'); // Hide container if no slides exist
                }
            }

            // ==========================================
            // 🚀 THE NEW AUTO-SYNC MASTER COURSE ENGINE
            // ==========================================
            const courseShowcase = document.getElementById('master-course-showcase');
            if (courseShowcase) {
                courseShowcase.innerHTML = '<div class="text-center text-slate-400 py-10 font-bold"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading Premium Ecosystems...</div>';

                const categories = data.courseCategories || [];
                
                // Fetch ONLY 'live' courses from the deployed_courses vault
                const coursesSnap = await getDocs(query(collection(db, "deployed_courses"), where("status", "==", "live")));
                const courses = [];
                coursesSnap.forEach(doc => courses.push({ id: doc.id, ...doc.data() }));

                courseShowcase.innerHTML = ''; // Clear loading

                if (categories.length > 0 && courses.length > 0) {
                    categories.forEach(cat => {
                        // 🚀 UPGRADE: Backward compatibility ke liye (String vs Object check)
                        const catName = typeof cat === 'string' ? cat : cat.name;
                        const explicitSubs = typeof cat === 'object' && cat.subCategories ? cat.subCategories : [];
                        
                        const catCourses = courses.filter(c => c.category === catName);
                        
                        if (catCourses.length > 0) {
                            const subCatGroups = {};
                            const defaultGroup = [];
                            
                            catCourses.forEach(course => {
                                if(course.subCategory && course.subCategory.trim() !== '') {
                                    if(!subCatGroups[course.subCategory]) subCatGroups[course.subCategory] = [];
                                    subCatGroups[course.subCategory].push(course);
                                } else {
                                    defaultGroup.push(course);
                                }
                            });

                            let fullCategoryHtml = `
                                <section class="mb-4">
                                    <div class="flex flex-row justify-between items-start sm:items-end flex-wrap gap-2 mb-4">
                                        <div>
                                            <h3 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white font-serif">${catName}</h3>
                                        </div>
                                        <button onclick="window.showGenericViewAll('${catName}', 'course_${catName}')" class="text-brand-blue dark:text-blue-400 text-xs md:text-sm font-bold hover:underline shrink-0">View All</button>
                                    </div>
                            `;

                            const renderTiles = (courseArray) => {
                                let tilesHtml = '';
                                courseArray.forEach(course => {
                                    const d = course.design;
                                    let badgeHtml = '';
                                    if (course.badge) {
                                        let badgeClass = 'bg-slate-500', badgeText = course.badge;
                                        if(course.badge === 'bestseller') { badgeClass = 'bg-rose-500'; badgeText = '🔥 Bestseller'; }
                                        else if(course.badge === 'new') { badgeClass = 'bg-emerald-500'; badgeText = '✨ New Launch'; }
                                        else if(course.badge === 'limited') { badgeClass = 'bg-amber-500'; badgeText = '⏳ Limited Offer'; }
                                        else if(course.badge === 'premium') { badgeClass = 'bg-purple-500'; badgeText = '💎 Premium'; }
                                        badgeHtml = `<div class="absolute top-0 right-0 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10 shadow-sm transition-all ${badgeClass}">${badgeText}</div>`;
                                    }

                                    let titleColorClass = 'text-slate-900 dark:text-white';
                                    if (d.textColorMode === 'brand') titleColorClass = 'text-brand-blue';
                                    else if (d.textColorMode === 'emerald') titleColorClass = 'text-emerald-600 dark:text-emerald-400';
                                    else if (d.textColorMode === 'rose') titleColorClass = 'text-rose-600 dark:text-rose-400';
                                    else if (d.textColorMode === 'amber') titleColorClass = 'text-amber-600 dark:text-amber-400';

                                    const sz = d.tileSize || 'large';
                                    let tWidth = 'w-64', tPad = 'p-6', iSize = 'w-14 h-14', iText = 'text-2xl', iMarg = 'mb-5';
                                    let tSize = 'text-lg', sText = 'text-xs mb-6 line-clamp-2', bPad = 'py-2.5 text-sm';
                                    if (sz === 'medium') { tWidth = 'w-52'; tPad = 'p-5'; iSize = 'w-12 h-12'; iText = 'text-xl'; iMarg = 'mb-4'; tSize = 'text-base'; sText = 'text-[11px] mb-4 line-clamp-2'; bPad = 'py-2 text-xs'; } 
                                    else if (sz === 'small') { tWidth = 'w-40'; tPad = 'p-4'; iSize = 'w-10 h-10'; iText = 'text-lg'; iMarg = 'mb-3'; tSize = 'text-sm'; sText = 'text-[10px] mb-3 line-clamp-1'; bPad = 'py-1.5 text-[10px]'; }

                                    tilesHtml += `
                                        <div class="snap-center shrink-0 ${tWidth} bg-white dark:bg-slate-900 rounded-3xl ${tPad} border-2 border-solid shadow-md hover:-translate-y-1 transition-all flex flex-col relative overflow-hidden group" style="border-color: ${d.tileBorder || '#f1f5f9'};">
                                            ${badgeHtml}
                                            <div class="${iSize} rounded-2xl flex items-center justify-center ${iMarg} ${iText} border-2 border-solid shadow-inner transition-transform group-hover:scale-110" style="background-color: ${d.boxBg}; color: ${d.iconColor}; border-color: ${d.boxBorder || 'transparent'};">
                                                <i class="fa-solid ${d.icon}"></i>
                                            </div>
                                            <h4 class="${tSize} font-bold mb-2 leading-snug ${titleColorClass}">${course.title}</h4>
                                            <p class="${sText} text-slate-500 dark:text-slate-400 font-medium flex-grow">${course.subtitle}</p>
                                            <button onclick="window.initiateCheckout('${course.title}')" class="mt-auto w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-brand-blue font-bold ${bPad} rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm active:scale-95">Enroll Now</button>
                                        </div>
                                    `;
                                });
                                return `<div class="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-4 md:gap-5 pb-6">${tilesHtml}</div>`;
                            };

                            // 🚀 1. Render EXPLICIT Sub-categories (In order managed by Admin)
                            explicitSubs.forEach(subName => {
                                if(subCatGroups[subName] && subCatGroups[subName].length > 0) {
                                    fullCategoryHtml += `
                                        <div class="mb-2 ml-0 md:ml-4 border-l-4 border-brand-blue/20 pl-4 py-2">
                                            <h4 class="text-sm md:text-base font-extrabold text-slate-600 dark:text-slate-400 mb-4 uppercase tracking-wider">${subName}</h4>
                                            ${renderTiles(subCatGroups[subName])}
                                        </div>`;
                                    delete subCatGroups[subName]; // Mark as done
                                }
                            });

                            // 🚀 2. Render Remaining Sub-categories (If any new ones aren't sorted yet)
                            for(const [subCatName, coursesInSub] of Object.entries(subCatGroups)) {
                                fullCategoryHtml += `
                                    <div class="mb-2 ml-0 md:ml-4 border-l-4 border-brand-blue/20 pl-4 py-2">
                                        <h4 class="text-sm md:text-base font-extrabold text-slate-600 dark:text-slate-400 mb-4 uppercase tracking-wider">${subCatName}</h4>
                                        ${renderTiles(coursesInSub)}
                                    </div>`;
                            }

                            if(defaultGroup.length > 0) fullCategoryHtml += `<div class="mb-4">${renderTiles(defaultGroup)}</div>`;
                            fullCategoryHtml += `</section>`;
                            courseShowcase.insertAdjacentHTML('beforeend', fullCategoryHtml);
                        }
                    });
                }
            }
            // ==========================================

            if(data.arenaCategories) {
                const arenaContainer = document.getElementById('dynamic-arena-container');
                arenaContainer.innerHTML = ''; 
                
                data.arenaCategories.forEach(cat => {
                    let testsHtml = '';
                    cat.tests.forEach(test => {
                        if(test.status === 'locked') {
                            testsHtml += `
                                <button class="shrink-0 w-24 h-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center opacity-50 cursor-not-allowed shadow-sm">
                                    <i class="fa-solid fa-lock text-slate-400 dark:text-slate-600 mb-1"></i>
                                    <span class="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">Locked</span>
                                    <div class="text-[9px] font-bold text-slate-500 truncate w-full px-2 mt-1">${test.name}</div>
                                </button>`;
                        } else {
                            testsHtml += `
                                <button onclick="window.consumeContent('test', '${test.vaultId}')" class="shrink-0 w-28 h-20 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-col items-center justify-center transition-all hover:-translate-y-1 shadow-sm">
                                    <span class="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest"><i class="fa-solid fa-play mr-1"></i> Live</span>
                                    <div class="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate w-full px-2 mt-1.5">${test.name}</div>
                                </button>`;
                        }
                    });

                    const catHtml = `
                        <div class="mb-6">
                            <div class="flex items-end justify-between mb-3">
                                <h5 class="text-[10px] md:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">${cat.name}</h5>
                                <button onclick="window.showGenericViewAll('${cat.name}', 'arena_${cat.name}')" class="text-brand-blue dark:text-blue-400 text-[10px] md:text-xs font-bold hover:underline shrink-0">View All</button>
                            </div>
                            <div class="flex overflow-x-auto hide-scrollbar gap-3 pb-2 pt-1">
                                ${testsHtml || '<div class="text-xs text-slate-400">Tests coming soon...</div>'}
                            </div>
                        </div>`;
                    arenaContainer.insertAdjacentHTML('beforeend', catHtml);
                });
            }

            if(data.educators) {
                const eduContainer = document.getElementById('dynamic-educator-container');
                eduContainer.innerHTML = '';
                
                data.educators.forEach(edu => {
                    const photo = edu.photoUrl || `https://ui-avatars.com/api/?name=${edu.name}&background=2563eb&color=fff`;
                    
                    const eduHtml = `
                        <div class="snap-center shrink-0 w-64 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center">
                            <div class="w-20 h-20 rounded-full border-4 border-slate-50 dark:border-slate-800 shadow-sm overflow-hidden mb-4">
                                <img src="${photo}" class="w-full h-full object-cover" alt="${edu.name}">
                            </div>
                            <h4 class="text-lg font-bold text-slate-900 dark:text-white mb-1">${edu.name}</h4>
                            <p class="text-xs text-brand-blue dark:text-blue-400 font-bold uppercase tracking-wider mb-2">${edu.expertise}</p>
                            <p class="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-4 h-6">${edu.qualifications}</p>
                            
                            <div id="stars-${edu.name.replace(/[^a-zA-Z0-9]/g, '_')}" class="flex gap-1.5 text-lg mb-2">
                                <i class="fa-solid fa-spinner fa-spin text-slate-300 text-sm"></i>
                            </div>
                            <span id="rating-text-${edu.name.replace(/[^a-zA-Z0-9]/g, '_')}" class="text-[9px] text-slate-400 font-bold">Loading ratings...</span>
                        </div>`;
                    eduContainer.insertAdjacentHTML('beforeend', eduHtml);
                    
                    // 🚀 Trigger background fetch for this educator's real rating
                    if(window.loadSingleEducatorRating) window.loadSingleEducatorRating(edu.name);
                });
                
                const eduViewAllBtn = document.getElementById('view-all-edu-btn');
                if(eduViewAllBtn) {
                    eduViewAllBtn.onclick = () => window.showGenericViewAll('Our Top Educators', 'educators');
                }
            }
        }
    } catch(e) { console.error("Error rendering homepage", e); }
}

window.showGenericViewAll = async function(title, type) {
    await window.showScreen('screen-generic-view'); 

    document.getElementById('generic-view-title').innerText = title;
    const grid = document.getElementById('generic-view-grid');
    grid.innerHTML = '<div class="text-slate-400 col-span-full text-center py-10">Loading...</div>';

    // 🚀 NEW: Dynamic Course Grid Viewer
    if(type.startsWith('course_')) {
        const catName = type.replace('course_', '');
        try {
            const coursesSnap = await getDocs(query(collection(db, "deployed_courses"), where("status", "==", "live"), where("category", "==", catName)));
            grid.innerHTML = '';
            if(coursesSnap.empty) {
                grid.innerHTML = '<div class="text-slate-400 col-span-full text-center py-10">No courses found in this category.</div>';
                return;
            }
            
            coursesSnap.forEach(doc => {
                const course = doc.data();
                const d = course.design;
                
                let badgeHtml = '';
                if (course.badge) {
                    let badgeClass = 'bg-slate-500', badgeText = course.badge;
                    if(course.badge === 'bestseller') { badgeClass = 'bg-rose-500'; badgeText = '🔥 Bestseller'; }
                    else if(course.badge === 'new') { badgeClass = 'bg-emerald-500'; badgeText = '✨ New Launch'; }
                    else if(course.badge === 'limited') { badgeClass = 'bg-amber-500'; badgeText = '⏳ Limited Offer'; }
                    else if(course.badge === 'premium') { badgeClass = 'bg-purple-500'; badgeText = '💎 Premium'; }
                    badgeHtml = `<div class="absolute top-0 right-0 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10 shadow-sm transition-all ${badgeClass}">${badgeText}</div>`;
                }

                let titleColorClass = 'text-slate-900 dark:text-white';
                if (d.textColorMode === 'brand') titleColorClass = 'text-brand-blue';
                else if (d.textColorMode === 'emerald') titleColorClass = 'text-emerald-600 dark:text-emerald-400';
                else if (d.textColorMode === 'rose') titleColorClass = 'text-rose-600 dark:text-rose-400';
                else if (d.textColorMode === 'amber') titleColorClass = 'text-amber-600 dark:text-amber-400';

                // 🛡️ SECURE POPUP UPGRADE: Grid view buttons also mapped to initiateCheckout Popup Engine
                grid.innerHTML += `
                    <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 border-solid shadow-md hover:-translate-y-1 transition-transform flex flex-col relative overflow-hidden group w-full" style="border-color: ${d.tileBorder || '#f1f5f9'};">
                        ${badgeHtml}
                        <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-xl border-2 border-solid shadow-inner transition-transform group-hover:scale-110" style="background-color: ${d.boxBg}; color: ${d.iconColor}; border-color: ${d.boxBorder || 'transparent'};">
                            <i class="fa-solid ${d.icon}"></i>
                        </div>
                        <h4 class="text-base font-bold mb-2 leading-snug ${titleColorClass}">${course.title}</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mb-4 line-clamp-2 flex-grow">${course.subtitle}</p>
                        <button onclick="window.initiateCheckout('${course.title}')" class="mt-auto w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-brand-blue font-bold py-2 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm active:scale-95 text-xs">Enroll Now</button>
                    </div>
                `;
            });
        } catch(e) { console.error(e); }
        return; 
    }

    // Existing CMS logic for Educators and Arenas
    getDoc(doc(db, "cms", "homepage")).then(snap => {
        if(snap.exists()) {
            const data = snap.data();
            grid.innerHTML = '';
            
            if(type === 'educators' && data.educators) {
                data.educators.forEach(edu => {
                    const photo = edu.photoUrl || `https://ui-avatars.com/api/?name=${edu.name}&background=2563eb&color=fff`;
                    const safeName = edu.name.replace(/[^a-zA-Z0-9]/g, '_');
                    grid.innerHTML += `
                        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-md flex flex-col items-center text-center hover:-translate-y-1 transition-transform cursor-pointer">
                            <img src="${photo}" class="w-20 h-20 rounded-full mb-4 object-cover border-4 border-slate-50 dark:border-slate-800 shadow-sm">
                            <h4 class="font-bold text-slate-900 dark:text-white mb-1">${edu.name}</h4>
                            <p class="text-[10px] text-brand-blue uppercase font-bold tracking-wider mb-3">${edu.expertise}</p>
                            
                            <div id="stars-${safeName}-viewall" class="flex gap-1.5 text-base mb-1">
                                <i class="fa-solid fa-spinner fa-spin text-slate-300 text-xs"></i>
                            </div>
                            <span id="rating-text-${safeName}-viewall" class="text-[9px] text-slate-400 font-bold">Loading...</span>
                        </div>`;
                    
                    // 🚀 Trigger rating paint for view-all tile instantly
                    setTimeout(() => {
                        if(window.loadSingleEducatorRating) window.loadSingleEducatorRating(edu.name);
                    }, 50);
                });
            } else if(type.startsWith('arena_')) {
                const catName = type.split('_')[1];
                const cat = data.arenaCategories.find(c => c.name === catName);
                if(cat && cat.tests) {
                    cat.tests.forEach(test => {
                        if(test.status === 'locked') {
                            grid.innerHTML += `
                                <button class="h-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center opacity-50 cursor-not-allowed shadow-sm">
                                    <i class="fa-solid fa-lock text-slate-400 dark:text-slate-600 mb-1"></i>
                                    <span class="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">Locked</span>
                                    <div class="text-[10px] font-bold text-slate-500 mt-1 truncate w-full px-2">${test.name}</div>
                                </button>`;
                        } else {
                            grid.innerHTML += `
                                <button onclick="window.consumeContent('test', '${test.vaultId}')" class="h-24 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-col items-center justify-center shadow-sm hover:-translate-y-1 transition-transform">
                                    <span class="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest"><i class="fa-solid fa-play mr-1"></i> Live</span>
                                    <div class="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1.5 truncate w-full px-2">${test.name}</div>
                                </button>`;
                        }
                    });
                }
            }
        }
    });
}

// Initial Call
window.renderHomepage();

// ==========================================
// 🚀 THE SMART EDUCATOR RATING ENGINE (WITH PRO-LEARNER BOUNCER)
// ==========================================
window.rateEducator = async function(educatorName, stars) {
    if (!auth.currentUser) return alert("Please log in first to rate our educators!");
    
    try {
        // 1. THE BOUNCER: Check if User is Admin or a Pro Learner
        const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        const userData = userSnap.exists() ? userSnap.data() : {};
        const role = String(userData.role || 'student').toLowerCase().trim();
        const isGodMode = role.includes('admin') || role === 'superadmin' || role.includes('educator');
        
        let isProLearner = false;
        
        // Loop through all enrollments to see if at least one is NOT expired
        if(!isGodMode && userData.course_expiries) {
            const now = new Date();
            for (const [course, expDateStr] of Object.entries(userData.course_expiries)) {
                if (new Date(expDateStr) > now) {
                    isProLearner = true;
                    break;
                }
            }
        }

        // Kick out unauthorized users
        if (!isGodMode && !isProLearner) {
            return alert("🔒 Access Denied: You need to be an Active Learner (with at least one valid course subscription) to rate educators.");
        }

        // 2. SAVE RATING (One User = One Vote Math)
        const safeName = educatorName.replace(/[^a-zA-Z0-9]/g, '_');
        
        // 🚀 FIREBASE FIX: Sahi tareeke se Map (Folder) banakar save karna
        await setDoc(doc(db, "educator_ratings", safeName), {
            ratings: {
                [auth.currentUser.uid]: stars
            }
        }, { merge: true });

        alert(`Thank you! You rated ${educatorName} ${stars} Stars. 🌟`);
        
        // 3. REFRESH UI INSTANTLY
        window.loadSingleEducatorRating(educatorName);
        
    } catch(error) {
        console.error("Rating Error:", error);
        alert("Failed to submit rating. Please try again.");
    }
}

// Automatically calculates the average and paints the stars on the Homepage
window.loadSingleEducatorRating = async function(educatorName) {
    const safeName = educatorName.replace(/[^a-zA-Z0-9]/g, '_');
    try {
        const snap = await getDoc(doc(db, "educator_ratings", safeName));
        let totalStars = 0;
        let count = 0;
        let average = 0;
        
        if (snap.exists() && snap.data().ratings) {
            const ratings = snap.data().ratings;
            for (const uid in ratings) {
                totalStars += ratings[uid];
                count++;
            }
            if (count > 0) average = (totalStars / count).toFixed(1);
        }

        const starsContainers = document.querySelectorAll(`[id^="stars-${safeName}"]`);
        const textContainers = document.querySelectorAll(`[id^="rating-text-${safeName}"]`);

        // 1. Interactive Stars (Bachhon ke click karne ke liye)
        let interactiveStarsHtml = '';
        for (let i = 1; i <= 5; i++) {
            let starClass = i <= Math.round(average) ? "fa-solid fa-star text-amber-400 drop-shadow-sm" : "fa-regular fa-star text-amber-400/40";
            interactiveStarsHtml += `<i class="${starClass} cursor-pointer hover:scale-125 hover:text-amber-400 transition-all active:scale-95" onclick="window.rateEducator('${educatorName}', ${i})" title="Rate ${i} Stars"></i>`;
        }

        // 2. The Premium Average Badge (Display ke liye)
        const displayAverage = count > 0 ? average : 'New';
        const displayReviews = count > 0 ? `${count} Reviews` : 'No Ratings';
        
        const fullWidgetHtml = `
            <div class="flex flex-col items-center w-full mt-1">
                <div class="flex items-center justify-center gap-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-4 py-1.5 rounded-full mb-3 shadow-sm border border-amber-200 dark:border-amber-800">
                    <span class="text-sm font-extrabold">${displayAverage}</span>
                    <i class="fa-solid fa-star text-xs pb-0.5"></i>
                    <span class="text-[10px] font-bold opacity-80 border-l border-amber-300 dark:border-amber-700 pl-1.5 ml-0.5">${displayReviews}</span>
                </div>
                
                <p class="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-1">Your Rating</p>
                <div class="flex gap-1 text-lg">
                    ${interactiveStarsHtml}
                </div>
            </div>
        `;
        
        // Dono jagah data live flush karo!
        starsContainers.forEach(container => {
            container.innerHTML = fullWidgetHtml;
        });
        
        // Purane chhote text ko hide kar do
        textContainers.forEach(container => {
            container.style.display = 'none';
        });

    } catch (e) {
        console.error("Failed to load ratings for " + educatorName, e);
    }
}