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
window.deployEditor = null; // Naya Global Variable

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
        window.loadDeployerCategories(); 
        
        // 🚀 NEW: Start Quill Editor for Deployer
        if(!window.deployEditor) {
            window.deployEditor = new window.Quill('#deploy-explore-editor', {
                modules: { toolbar: [ ['bold', 'italic', 'underline'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['image'] ] },
                theme: 'snow',
                placeholder: 'Type detailed course description, syllabus, and features here...'
            });
        }
    }
}

// ==========================================
// 🚀 THE NEW SDUI ADMIN BUILDER ENGINE 🚀
// ==========================================

window.clearHomeCanvas = function() {
    if(confirm("Are you sure you want to clear the entire canvas?")) {
        const dropzone = document.getElementById('home-canvas-inner');
        dropzone.innerHTML = `
            <div id="home-canvas-placeholder" class="text-center text-slate-400 dark:text-slate-500 py-20 text-sm font-medium flex flex-col items-center justify-center h-full opacity-50">
                <i class="fa-solid fa-wand-magic-sparkles text-4xl mb-4 animate-bounce text-brand-blue"></i>
                <span>Click widgets from the toolbox<br>to build your homepage.</span>
            </div>`;
    }
}

window.dropHomeWidget = function(ev) {
    ev.preventDefault();
    if(window.draggedElement && window.draggedElement.classList.contains('cms-widget-block')) {
        const dropTarget = ev.target.closest('.cms-widget-block');
        const list = document.getElementById('home-canvas-inner');
        if(dropTarget && window.draggedElement !== dropTarget) dropTarget.parentNode.insertBefore(window.draggedElement, dropTarget);
        else if (!dropTarget && ev.target.closest('#home-canvas-dropzone')) list.appendChild(window.draggedElement);
    }
}

window.dropSubCat = function(ev) {
    ev.preventDefault();
    ev.stopPropagation(); // Main canvas ko disturb na kare
    if(window.draggedElement && window.draggedElement.classList.contains('cms-subcat-block')) {
        const dropTarget = ev.target.closest('.cms-subcat-block');
        const list = ev.target.closest('.widget-subcat-list');
        if(dropTarget && window.draggedElement !== dropTarget) dropTarget.parentNode.insertBefore(window.draggedElement, dropTarget);
        else if (!dropTarget && list) list.appendChild(window.draggedElement);
    }
}

window.addHomeWidget = function(type, data = null) {
    const dropzone = document.getElementById('home-canvas-inner');
    const placeholder = document.getElementById('home-canvas-placeholder');
    if(placeholder) placeholder.remove();

    const id = 'widget-' + Date.now() + Math.floor(Math.random()*1000);
    const div = document.createElement('div');
    div.className = "cms-widget-block bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-4 cursor-move hover:border-brand-blue transition-colors";
    div.draggable = true;
    div.ondragstart = window.drag;
    div.ondrop = window.dropHomeWidget;
    div.ondragover = window.allowDrop;
    div.setAttribute('data-type', type);

    let html = `<div class="flex justify-between items-center mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">`;

    if (type === 'banner') {
        html += `<span class="text-[10px] font-bold text-indigo-500 uppercase tracking-wider"><i class="fa-solid fa-images mr-1"></i> Image Carousel</span>
                 <button type="button" onclick="this.closest('.cms-widget-block').remove()" class="text-slate-400 hover:text-rose-500"><i class="fa-solid fa-trash"></i></button></div>`;
        
        const aspect = data && data.aspectRatio ? data.aspectRatio : 'video';

        html += `
            <div class="flex justify-between items-center mb-3 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <label class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Banner Shape (Size)</label>
                <select class="banner-aspect-ratio text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded p-1 font-bold outline-none dark:text-white cursor-pointer">
                    <option value="video" ${aspect === 'video' ? 'selected' : ''}>Standard (16:9)</option>
                    <option value="4/1" ${aspect === '4/1' ? 'selected' : ''}>Classroom Style (4:1)</option>
                </select>
            </div>
            <div class="carousel-slides-container space-y-2 mb-3"></div>
            <button type="button" onclick="window.addCarouselSlideUI(this)" class="w-full py-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition-colors hover:bg-indigo-100">+ Add New Slide</button>`;
        
        // Timeout to render existing slides safely
        setTimeout(() => {
            const btn = div.querySelector('button[onclick="window.addCarouselSlideUI(this)"]');
            if (data && data.slides && data.slides.length > 0) {
                data.slides.forEach(s => window.addCarouselSlideUI(btn, s));
            } else if (data && data.imgUrl) {
                // Backwards compatibility for old single banner
                window.addCarouselSlideUI(btn, { imgUrl: data.imgUrl, link: data.link });
            } else {
                window.addCarouselSlideUI(btn); // Add one blank slide by default
            }
        }, 50);
    }
    else if (type === 'courseRow') {
        html += `<span class="text-[10px] font-bold text-emerald-500 uppercase tracking-wider"><i class="fa-solid fa-layer-group mr-1"></i> Course Row</span>
                 <button type="button" onclick="this.closest('.cms-widget-block').remove()" class="text-slate-400 hover:text-rose-500"><i class="fa-solid fa-trash"></i></button></div>`;
        const cat = data ? data.category : '';
        
        // Agar pehle se subcategories saved hain, toh unhe draw karo
        let existingSubCatsHtml = '';
        if (data && data.orderedSubCats && data.orderedSubCats.length > 0) {
            data.orderedSubCats.forEach(sub => {
                existingSubCatsHtml += `
                    <div class="cms-subcat-block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded text-xs font-bold cursor-move flex items-center gap-2 shadow-sm" draggable="true" ondragstart="window.drag(event)" ondrop="window.dropSubCat(event)" ondragover="window.allowDrop(event)">
                        <i class="fa-solid fa-grip-vertical text-slate-400"></i>
                        <span class="subcat-name text-slate-700 dark:text-slate-300 flex-grow">${sub}</span>
                        <button type="button" onclick="this.parentElement.remove()" class="text-slate-300 hover:text-rose-500"><i class="fa-solid fa-xmark"></i></button>
                    </div>`;
            });
        } else {
            existingSubCatsHtml = `<div class="text-[10px] text-slate-400 text-center py-2 italic pointer-events-none">Type category name above and click 'Fetch Sub-Cats'</div>`;
        }

        html += `
            <div class="flex gap-2 items-end">
                <div class="flex-grow">
                    <label class="text-[9px] font-bold text-slate-400 block mb-1">CATEGORY TO DISPLAY</label>
                    <input type="text" list="deploy-category-list" class="widget-category w-full p-2 text-sm font-bold rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:border-emerald-500" placeholder="e.g. UPSC CSE" value="${cat}">
                </div>
                <button type="button" onclick="window.fetchWidgetSubCategories(this)" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded font-bold text-xs h-[38px] transition-colors whitespace-nowrap"><i class="fa-solid fa-cloud-arrow-down mr-1"></i> Fetch Sub-Cats</button>
            </div>
            <p class="text-[9px] text-slate-500 mt-3 mb-1.5 uppercase font-bold tracking-wider">Sub-Category Rendering Order (Drag to sort)</p>
            <div class="widget-subcat-list space-y-1 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-700 min-h-[40px]" ondragover="window.allowDrop(event)" ondrop="window.dropSubCat(event)">
                ${existingSubCatsHtml}
            </div>`;
    }
    else if (type === 'arenaRow') {
        html += `<span class="text-[10px] font-bold text-blue-500 uppercase tracking-wider"><i class="fa-solid fa-bolt mr-1"></i> Arena Category</span>
                 <button type="button" onclick="this.closest('.cms-widget-block').remove()" class="text-slate-400 hover:text-rose-500"><i class="fa-solid fa-trash"></i></button></div>`;
        const catName = data ? data.name : '';
        html += `
            <input type="text" class="arena-cat-name w-full p-2 text-sm font-bold rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:border-blue-500 mb-2" placeholder="Arena Category Name (e.g. Weekly Mocks)" value="${catName}">
            <div class="arena-tests-container space-y-2"></div>
            <button type="button" onclick="window.addTestToArenaWidget(this)" class="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold mt-2 hover:bg-blue-200">+ Add Test Link</button>`;
        
        if(data && data.tests) {
            setTimeout(() => {
                const btn = div.querySelector('button[onclick="window.addTestToArenaWidget(this)"]');
                data.tests.forEach(t => window.addTestToArenaWidget(btn, t));
            }, 50);
        }
    }
    else if (type === 'educatorRow') {
        html += `<span class="text-[10px] font-bold text-purple-500 uppercase tracking-wider"><i class="fa-solid fa-chalkboard-user mr-1"></i> Educator Profile</span>
                 <button type="button" onclick="this.closest('.cms-widget-block').remove()" class="text-slate-400 hover:text-rose-500"><i class="fa-solid fa-trash"></i></button></div>`;
        const name = data ? data.name : '';
        const exp = data ? data.expertise : '';
        const qual = data ? data.qualifications : '';
        const photoUrl = data ? data.photoUrl : '';
        html += `
            <div class="flex gap-4">
                <div class="shrink-0 w-16 h-16 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center relative cursor-pointer overflow-hidden bg-slate-50 dark:bg-slate-950" onclick="document.getElementById('upload-${id}').click()">
                    <img id="preview-${id}" src="${photoUrl}" class="absolute inset-0 w-full h-full object-cover z-10 ${photoUrl ? '' : 'hidden'}">
                    <i class="fa-solid fa-camera text-slate-300 text-sm"></i>
                </div>
                <input type="file" id="upload-${id}" class="widget-upload hidden" accept="image/*" onchange="window.previewImage(this, 'preview-${id}')">
                <input type="hidden" class="widget-existing-photo" value="${photoUrl}">
                <div class="flex-grow grid grid-cols-2 gap-2">
                    <input type="text" class="edu-name w-full p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 dark:text-white" placeholder="Name" value="${name}">
                    <input type="text" class="edu-exp w-full p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 dark:text-white" placeholder="Expertise" value="${exp}">
                    <input type="text" class="edu-qual col-span-2 w-full p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 dark:text-white" placeholder="Qualifications" value="${qual}">
                </div>
            </div>`;
    }
    else if (type === 'announcement') {
        html += `<span class="text-[10px] font-bold text-amber-500 uppercase tracking-wider"><i class="fa-solid fa-bell mr-1"></i> Announcement</span>
                 <button type="button" onclick="this.closest('.cms-widget-block').remove()" class="text-slate-400 hover:text-rose-500"><i class="fa-solid fa-trash"></i></button></div>`;
        const text = data ? data.text : '';
        html += `<input type="text" class="announcement-text w-full p-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:border-amber-500" placeholder="Type breaking news or alert..." value="${text}">`;
    }

    div.innerHTML = html;
    dropzone.appendChild(div);
}

window.addCarouselSlideUI = function(btn, slideData = null) {
    const container = btn.previousElementSibling;
    const id = 'slide-' + Date.now() + Math.floor(Math.random()*1000);
    const imgUrl = slideData ? slideData.imgUrl : '';
    const link = slideData ? slideData.link : '';

    const div = document.createElement('div');
    div.className = "carousel-slide-item flex gap-4 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 relative shadow-sm hover:border-indigo-300 transition-colors cursor-move";
    div.draggable = true;
    div.ondragstart = window.drag;
    div.ondrop = function(ev) {
        ev.preventDefault(); ev.stopPropagation();
        if(window.draggedElement && window.draggedElement.classList.contains('carousel-slide-item')) {
            const dropTarget = ev.target.closest('.carousel-slide-item');
            if(dropTarget && window.draggedElement !== dropTarget) dropTarget.parentNode.insertBefore(window.draggedElement, dropTarget);
            else if (!dropTarget && container) container.appendChild(window.draggedElement);
        }
    };
    div.ondragover = window.allowDrop;

    div.innerHTML = `
        <i class="fa-solid fa-grip-vertical text-slate-400 flex items-center shrink-0"></i>
        <div class="shrink-0 w-24 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center relative cursor-pointer overflow-hidden bg-white dark:bg-slate-900" onclick="document.getElementById('upload-${id}').click()">
            <img id="preview-${id}" src="${imgUrl}" class="absolute inset-0 w-full h-full object-cover z-10 ${imgUrl ? '' : 'hidden'}">
            <i class="fa-solid fa-image text-slate-300"></i>
        </div>
        <input type="file" id="upload-${id}" class="slide-upload hidden" accept="image/*" onchange="window.previewImage(this, 'preview-${id}')">
        <input type="hidden" class="slide-existing-photo" value="${imgUrl}">
        <div class="flex-grow flex flex-col justify-center">
            <label class="text-[9px] font-bold text-slate-400 block mb-1">IMAGE ON-CLICK URL</label>
            <input type="text" class="slide-link w-full p-2 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white outline-none focus:border-indigo-500" placeholder="https://..." value="${link}">
        </div>
        <button type="button" onclick="this.parentElement.remove()" class="absolute -top-2 -right-2 bg-rose-100 text-rose-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-rose-200 shadow-sm"><i class="fa-solid fa-xmark"></i></button>
    `;
    container.appendChild(div);
}

window.fetchWidgetSubCategories = async function(btn) {
    const catInput = btn.previousElementSibling.querySelector('.widget-category').value.trim();
    if(!catInput) return alert("Please enter a category name first!");

    const container = btn.parentElement.parentElement.querySelector('.widget-subcat-list');
    container.innerHTML = '<div class="text-[10px] text-center py-2 text-slate-400"><i class="fa-solid fa-spinner fa-spin"></i> Finding sub-categories...</div>';

    try {
        const q = query(collection(db, "deployed_courses"), where("status", "==", "live"), where("category", "==", catInput));
        const snap = await getDocs(q);
        
        let subCats = new Set();
        snap.forEach(doc => { subCats.add(doc.data().subCategory || "Uncategorized"); });

        if(subCats.size === 0) {
            container.innerHTML = '<div class="text-[10px] text-center py-2 text-rose-500">No courses found in this category.</div>';
            return;
        }

        container.innerHTML = '';
        Array.from(subCats).forEach(subCat => {
            container.innerHTML += `
                <div class="cms-subcat-block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded text-xs font-bold cursor-move flex items-center gap-2 shadow-sm" draggable="true" ondragstart="window.drag(event)" ondrop="window.dropSubCat(event)" ondragover="window.allowDrop(event)">
                    <i class="fa-solid fa-grip-vertical text-slate-400"></i>
                    <span class="subcat-name text-slate-700 dark:text-slate-300 flex-grow">${subCat}</span>
                    <button type="button" onclick="this.parentElement.remove()" class="text-slate-300 hover:text-rose-500"><i class="fa-solid fa-xmark"></i></button>
                </div>`;
        });
    } catch(e) { console.error(e); container.innerHTML = '<div class="text-[10px] text-center py-2 text-rose-500">Fetch failed.</div>'; }
}

window.addTestToArenaWidget = function(btn, testData = null) {
    const container = btn.previousElementSibling;
    const name = testData ? testData.name : '';
    const vaultId = testData ? testData.vaultId : '';
    const status = testData ? testData.status : 'live';

    const div = document.createElement('div');
    div.className = "flex gap-2 items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded border border-slate-200 dark:border-slate-700";
    div.innerHTML = `
        <input type="text" class="test-name w-[35%] text-[10px] p-1 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white" placeholder="Test Name" value="${name}">
        <input type="text" class="test-vault w-[35%] text-[10px] p-1 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white font-mono" placeholder="Vault ID" value="${vaultId}">
        <select class="test-status w-[20%] text-[10px] p-1 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white">
            <option value="live" ${status==='live'?'selected':''}>Live</option>
            <option value="locked" ${status==='locked'?'selected':''}>Locked</option>
        </select>
        <button type="button" onclick="this.parentElement.remove()" class="text-slate-400 hover:text-rose-500 w-[10%]"><i class="fa-solid fa-xmark"></i></button>
    `;
    container.appendChild(div);
}

window.saveHomeCMSData = async function() {
    if (!window.cmsDataLoaded) return alert("⚠️ Sync Lock: Background data loading. Wait a second!");

    const btn = document.getElementById('cms-publish-btn'); 
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Compiling & Publishing...'; 
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

        const sduiLayout = [];
        const blocks = document.querySelectorAll('.cms-widget-block');

        for (let block of blocks) {
            const type = block.getAttribute('data-type');
            
            if (type === 'banner') {
                const slides = [];
                const aspectRatio = block.querySelector('.banner-aspect-ratio').value;
                const slideItems = block.querySelectorAll('.carousel-slide-item');
                for (let item of slideItems) {
                    let imgUrl = item.querySelector('.slide-existing-photo').value;
                    const file = item.querySelector('.slide-upload').files[0];
                    if (file) {
                        const upUrl = await uploadFileToStorage(file, 'cms_images/banners', item.querySelector('img').id);
                        if (upUrl) imgUrl = upUrl;
                    }
                    if (imgUrl) {
                        slides.push({ imgUrl: imgUrl, link: item.querySelector('.slide-link').value.trim() });
                    }
                }
                if (slides.length > 0) {
                    sduiLayout.push({ type: 'banner', data: { slides: slides, aspectRatio: aspectRatio } });
                }
            }
            else if (type === 'courseRow') {
                const cat = block.querySelector('.widget-category').value.trim();
                const subCats = [];
                block.querySelectorAll('.subcat-name').forEach(el => subCats.push(el.innerText.trim()));
                if(cat) sduiLayout.push({ type: 'courseRow', data: { category: cat, orderedSubCats: subCats }});
            }
            else if (type === 'arenaRow') {
                const catName = block.querySelector('.arena-cat-name').value.trim();
                const tests = [];
                block.querySelectorAll('.flex.gap-2.items-center').forEach(tItem => {
                    const tName = tItem.querySelector('.test-name').value.trim();
                    const tVault = tItem.querySelector('.test-vault').value.trim();
                    if(tName && tVault) tests.push({ name: tName, vaultId: tVault, status: tItem.querySelector('.test-status').value });
                });
                if(catName) sduiLayout.push({ type: 'arenaRow', data: { name: catName, tests: tests }});
            }
            else if (type === 'educatorRow') {
                let photoUrl = block.querySelector('.widget-existing-photo').value;
                const file = block.querySelector('.widget-upload').files[0];
                if (file) {
                    const upUrl = await uploadFileToStorage(file, 'cms_images/educators', block.querySelector('img').id);
                    if(upUrl) photoUrl = upUrl;
                }
                sduiLayout.push({ type: 'educatorRow', data: { 
                    name: block.querySelector('.edu-name').value.trim(),
                    expertise: block.querySelector('.edu-exp').value.trim(),
                    qualifications: block.querySelector('.edu-qual').value.trim(),
                    photoUrl: photoUrl
                }});
            }
            else if (type === 'announcement') {
                const text = block.querySelector('.announcement-text').value.trim();
                if(text) sduiLayout.push({ type: 'announcement', data: { text: text }});
            }
        }

        const finalCmsData = {
            appLogo: globalLogoUrl,
            sduiLayout: sduiLayout,
            updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, "cms", "homepage"), finalCmsData, { merge: true });
        alert("Success! 🚀 Your Smart SDUI Homepage is now live.");
        window.renderHomepage(); 

    } catch(e) { 
        console.error("SDUI Save Error", e); 
        alert("Failed to publish design. Check console."); 
    } finally { 
        btn.innerHTML = originalHtml; 
        btn.disabled = false; 
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

            const dropzone = document.getElementById('home-canvas-inner');
            if (dropzone && data.sduiLayout && data.sduiLayout.length > 0) {
                dropzone.innerHTML = '';
                data.sduiLayout.forEach(item => window.addHomeWidget(item.type, item.data));
            }
        }
        window.cmsDataLoaded = true;
    } catch(e) { 
        console.error("CMS Load Error", e); 
    }
}

// ==========================================
// 🚀 RENDER CMS DATA ON STUDENT HOMEPAGE 🚀
// ==========================================

window.renderHomepage = async function() {
    try {
        const snap = await getDoc(doc(db, "cms", "homepage"));
        if(!snap.exists()) return;
        const data = snap.data();
        
        if(data.appLogo) {
            ['app-logo-img', 'mobile-logo-img'].forEach(id => {
                const img = document.getElementById(id);
                if(img) { img.src = data.appLogo; img.classList.remove('hidden'); }
            });
            ['app-logo-text', 'mobile-logo-text'].forEach(id => {
                const txt = document.getElementById(id);
                if(txt) txt.classList.add('hidden');
            });
        }

        const canvas = document.getElementById('dynamic-home-canvas');
        if (!canvas) return; 

        canvas.innerHTML = ''; 
        
        const coursesSnap = await getDocs(query(collection(db, "deployed_courses"), where("status", "==", "live")));
        const allLiveCourses = [];
        coursesSnap.forEach(doc => allLiveCourses.push({ id: doc.id, ...doc.data() }));

        let announcementGroup = [];
        let educatorGroup = [];

        const flushGroups = () => {
            if(announcementGroup.length > 0) {
                const notifListHtml = announcementGroup.map(text => `
                    <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50 mb-2">
                        <p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed"><i class="fa-solid fa-bolt text-amber-500 mr-1"></i> ${text}</p>
                    </div>`).join('');
                
                canvas.innerHTML += `
                    <section class="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm w-full">
                        <h3 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white font-serif flex items-center gap-2 mb-4"><i class="fa-solid fa-bullhorn text-amber-500"></i> Announcements</h3>
                        ${notifListHtml}
                    </section>`;
                announcementGroup = [];
            }

            if(educatorGroup.length > 0) {
                const eduListHtml = educatorGroup.map(edu => {
                    const photo = edu.photoUrl || `https://ui-avatars.com/api/?name=${edu.name}&background=2563eb&color=fff`;
                    return `
                    <div class="snap-center shrink-0 w-64 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center">
                        <div class="w-20 h-20 rounded-full border-4 border-slate-50 dark:border-slate-800 shadow-sm overflow-hidden mb-4">
                            <img src="${photo}" class="w-full h-full object-cover">
                        </div>
                        <h4 class="text-lg font-bold text-slate-900 dark:text-white mb-1">${edu.name}</h4>
                        <p class="text-xs text-brand-blue dark:text-blue-400 font-bold uppercase tracking-wider mb-2">${edu.expertise}</p>
                        <p class="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-4 h-6">${edu.qualifications}</p>
                        <div id="stars-${edu.name.replace(/[^a-zA-Z0-9]/g, '_')}" class="flex gap-1.5 text-lg mb-2"><i class="fa-solid fa-spinner fa-spin text-slate-300 text-sm"></i></div>
                        <span id="rating-text-${edu.name.replace(/[^a-zA-Z0-9]/g, '_')}" class="text-[9px] text-slate-400 font-bold">Loading...</span>
                    </div>`;
                }).join('');

                canvas.innerHTML += `
                    <section class="w-full">
                        <div class="flex flex-row justify-between items-start sm:items-end flex-wrap gap-2 mb-5">
                            <div><h3 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white font-serif">Meet Our Top Educators</h3><p class="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">Learn from the absolute best.</p></div>
                            <button onclick="window.showGenericViewAll('Our Top Educators', 'educators')" class="text-brand-blue dark:text-blue-400 text-xs md:text-sm font-bold hover:underline shrink-0">View All</button>
                        </div>
                        <div class="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-4 md:gap-5 pb-4">${eduListHtml}</div>
                    </section>`;
                
                educatorGroup.forEach(edu => { if(window.loadSingleEducatorRating) window.loadSingleEducatorRating(edu.name); });
                educatorGroup = [];
            }
        };

        if (data.sduiLayout && data.sduiLayout.length > 0) {
            data.sduiLayout.forEach(item => {
                if(item.type !== 'educatorRow' && item.type !== 'announcement') flushGroups();

                if (item.type === 'banner') {
                    // Extract new slides array or fallback to old imgUrl
                    const slides = item.data.slides || (item.data.imgUrl ? [{imgUrl: item.data.imgUrl, link: item.data.link}] : []);
                    const aspectClass = item.data.aspectRatio === '4/1' ? 'aspect-[4/1]' : 'aspect-video';
                    
                    if (slides.length > 0) {
                        const cid = 'carousel-' + Math.random().toString(36).substr(2, 9);
                        let dotsHtml = ''; let slidesHtml = '';

                        slides.forEach((slide, i) => {
                            const activeClass = i === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0';
                            slidesHtml += `
                                <div class="absolute inset-0 transition-opacity duration-700 ease-in-out cursor-pointer ${activeClass}" data-slide-index="${i}" onclick="if('${slide.link}') window.open('${slide.link}', '_blank')">
                                    <img src="${slide.imgUrl}" class="w-full h-full object-cover">
                                </div>`;
                            const dotActive = i === 0 ? 'bg-white w-5' : 'bg-white/50 w-2 hover:bg-white/80';
                            dotsHtml += `<button onclick="window.goToCarouselSlide('${cid}', ${i}); event.stopPropagation();" class="h-2.5 rounded-full transition-all duration-300 shadow-sm ${dotActive}" data-dot-index="${i}"></button>`;
                        });

                        canvas.innerHTML += `
                            <section id="${cid}" class="w-full relative rounded-3xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-800 bg-slate-900 ${aspectClass} group" data-current-slide="0" data-total-slides="${slides.length}">
                                ${slidesHtml}
                                <button onclick="window.moveCarousel('${cid}', -1); event.stopPropagation();" class="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 backdrop-blur-sm"><i class="fa-solid fa-chevron-left"></i></button>
                                <button onclick="window.moveCarousel('${cid}', 1); event.stopPropagation();" class="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 backdrop-blur-sm"><i class="fa-solid fa-chevron-right"></i></button>
                                <div class="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
                                    ${dotsHtml}
                                </div>
                            </section>`;
                        
                        setTimeout(() => window.initCarouselAutoplay(cid), 200);
                    }
                }
                
                else if (item.type === 'courseRow') {
                    const catName = item.data.category;
                    const catCourses = allLiveCourses.filter(c => c.category === catName);
                    
                    if(catCourses.length > 0) {
                        // 🧠 SMART ENGINE: Group courses by Sub-Category
                        const groupedCourses = { "Uncategorized": [] };
                        catCourses.forEach(course => {
                            const subCat = course.subCategory || "Uncategorized";
                            if (!groupedCourses[subCat]) groupedCourses[subCat] = [];
                            groupedCourses[subCat].push(course);
                        });

                        // Pehle Main Category ka Header banayenge
                        let categorySectionHtml = `
                        <section class="w-full mb-2">
                            <div class="flex flex-row justify-between items-start sm:items-end flex-wrap gap-2 mb-2 border-l-4 border-brand-blue pl-3">
                                <h3 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white font-serif">${catName}</h3>
                                <button onclick="window.showGenericViewAll('${catName}', 'course_${catName}')" class="text-brand-blue dark:text-blue-400 text-xs md:text-sm font-bold hover:underline shrink-0">View All</button>
                            </div>`;

                        // 🧠 SMART ENGINE: Ordered Sub-Categories ko combine karo
                        const orderedSubCats = item.data.orderedSubCats || [];
                        const availableSubCats = Object.keys(groupedCourses);
                        const finalRenderOrder = [...new Set([...orderedSubCats, ...availableSubCats])];

                        // Ab har Sub-Category ke hisaab se alag row render karenge
                        for (const subCat of finalRenderOrder) {
                            const courses = groupedCourses[subCat];
                            if (!courses || courses.length === 0) continue;
                            
                            let tilesHtml = '';
                            courses.forEach(course => {
                                const d = course.design || {};
                                let badgeHtml = course.badge ? `<div class="absolute top-0 right-0 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10 shadow-sm ${course.badge==='bestseller'?'bg-rose-500':course.badge==='new'?'bg-emerald-500':course.badge==='premium'?'bg-purple-500':'bg-amber-500'}">${course.badge.toUpperCase()}</div>` : '';
                                
                                // 🚀 UPDATED: Mega-Explore Premium Button Logic (Dedicated Space)
                                let exploreBtnHtml = (course.exploreHtml || course.trailerUrl) ? 
                                    `<button onclick="window.openMegaExplore('${course.title}')" class="w-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-brand-blue dark:text-blue-400 font-bold py-2 rounded-xl border border-blue-100 dark:border-blue-800/50 transition-colors shadow-sm active:scale-95 text-xs flex items-center justify-center gap-1.5 mb-2"><i class="fa-solid fa-circle-info"></i> Explore Details</button>` : '';
                                let tWidth = d.tileSize==='small'?'w-40':d.tileSize==='medium'?'w-52':'w-64';
                                
                                tilesHtml += `
                                <div class="snap-center shrink-0 ${tWidth} bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 border-solid shadow-md hover:-translate-y-1 transition-all flex flex-col relative overflow-hidden group" style="border-color: ${d.tileBorder || '#f1f5f9'};">
                                    ${badgeHtml}
                                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-xl border-2 border-solid shadow-inner transition-transform group-hover:scale-110" style="background-color: ${d.boxBg || '#ecfdf5'}; color: ${d.iconColor || '#059669'}; border-color: ${d.boxBorder || 'transparent'};">
                                        <i class="fa-solid ${d.icon || 'fa-book'}"></i>
                                    </div>
                                    <h4 class="text-base font-bold mb-2 leading-snug text-slate-900 dark:text-white" style="color: ${d.textColorMode === 'brand' ? '#2563eb' : ''}">${course.title}</h4>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mb-4 line-clamp-2 flex-grow">${course.subtitle || ''}</p>
                                    
                                    <div class="mt-auto flex flex-col w-full">
                                        ${exploreBtnHtml}
                                        <button onclick="window.initiateCheckout('${course.title}')" class="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-brand-blue font-bold py-2 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm active:scale-95 text-xs">Enroll Now</button>
                                    </div>
                                </div>`;
                            });

                            // Sub-category ka Title tabhi dikhayenge jab wo actually bani ho
                            let subCatHeading = '';
                            if (subCat !== "Uncategorized") {
                                subCatHeading = `<h4 class="text-sm font-bold text-slate-600 dark:text-slate-400 mb-3 mt-4 ml-1 uppercase tracking-wider"><i class="fa-solid fa-layer-group text-brand-blue mr-1"></i> ${subCat}</h4>`;
                            } else if (Object.keys(groupedCourses).length > 1) {
                                // Agar kuch uncategorized bhi hain, toh unhe 'Others' dikha do
                                subCatHeading = `<h4 class="text-sm font-bold text-slate-600 dark:text-slate-400 mb-3 mt-4 ml-1 uppercase tracking-wider"><i class="fa-solid fa-layer-group text-brand-blue mr-1"></i> General</h4>`;
                            } else {
                                // Agar koi sub-category hai hi nahi, toh bas thoda margin de do
                                subCatHeading = `<div class="mt-4"></div>`;
                            }

                            categorySectionHtml += `
                            <div>
                                ${subCatHeading}
                                <div class="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-4 pb-4">${tilesHtml}</div>
                            </div>`;
                        }

                        categorySectionHtml += `</section>`;
                        canvas.innerHTML += categorySectionHtml;
                    }
                }
                
                else if (item.type === 'arenaRow') {
                    let testsHtml = '';
                    item.data.tests.forEach(test => {
                        if(test.status === 'locked') {
                            testsHtml += `
                                <button class="shrink-0 w-28 h-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center opacity-50 cursor-not-allowed shadow-sm">
                                    <i class="fa-solid fa-lock text-slate-400 dark:text-slate-600 mb-1"></i>
                                    <span class="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">Locked</span>
                                    <div class="text-[9px] font-bold text-slate-500 truncate w-full px-2 mt-1">${test.name}</div>
                                </button>`;
                        } else {
                            testsHtml += `
                                <button onclick="window.consumeContent('test', '${test.vaultId}')" class="shrink-0 w-32 h-20 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-col items-center justify-center transition-all hover:-translate-y-1 shadow-sm">
                                    <span class="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest"><i class="fa-solid fa-play mr-1"></i> Live</span>
                                    <div class="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate w-full px-2 mt-1.5">${test.name}</div>
                                </button>`;
                        }
                    });

                    canvas.innerHTML += `
                        <section class="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm w-full">
                            <div class="flex items-end justify-between mb-4">
                                <h3 class="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white font-serif flex items-center gap-2"><i class="fa-solid fa-bolt text-blue-500"></i> ${item.data.name}</h3>
                            </div>
                            <div class="flex overflow-x-auto hide-scrollbar gap-3 pb-2 pt-1">${testsHtml || '<div class="text-xs text-slate-400">Tests coming soon...</div>'}</div>
                        </section>`;
                }
                
                else if (item.type === 'announcement') announcementGroup.push(item.data.text);
                else if (item.type === 'educatorRow') educatorGroup.push(item.data);
            });

            flushGroups(); 
        } else {
            canvas.innerHTML = `<div class="text-center text-slate-400 py-20 font-bold border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl w-full">No layout configured yet. Go to Admin CMS.</div>`;
        }
    } catch(e) { console.error("Render error", e); }
}

window.showGenericViewAll = async function(title, type) {
    await window.showScreen('screen-generic-view'); 
    document.getElementById('generic-view-title').innerText = title;
    const grid = document.getElementById('generic-view-grid');
    grid.innerHTML = '<div class="text-slate-400 col-span-full text-center py-10">Loading...</div>';

    if(type.startsWith('course_')) {
        const catName = type.replace('course_', '');
        try {
            const coursesSnap = await getDocs(query(collection(db, "deployed_courses"), where("status", "==", "live"), where("category", "==", catName)));
            grid.innerHTML = '';
            if(coursesSnap.empty) return grid.innerHTML = '<div class="text-slate-400 col-span-full text-center py-10">No courses found.</div>';
            
            coursesSnap.forEach(doc => {
                const course = doc.data(); const d = course.design || {};
                
                // 🚀 NEW: Explore Button added to View All Grid
                let exploreBtnHtml = (course.exploreHtml || course.trailerUrl) ? 
                    `<button onclick="window.openMegaExplore('${course.title}')" class="w-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-brand-blue dark:text-blue-400 font-bold py-2 rounded-xl border border-blue-100 dark:border-blue-800/50 transition-colors shadow-sm active:scale-95 text-xs flex items-center justify-center gap-1.5 mb-2"><i class="fa-solid fa-circle-info"></i> Explore Details</button>` : '';

                grid.innerHTML += `
                    <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 border-solid shadow-md hover:-translate-y-1 transition-transform flex flex-col relative overflow-hidden group w-full" style="border-color: ${d.tileBorder || '#f1f5f9'};">
                        <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-xl border-2 shadow-inner" style="background-color: ${d.boxBg || '#ecfdf5'}; color: ${d.iconColor || '#059669'}; border-color: ${d.boxBorder || 'transparent'};"><i class="fa-solid ${d.icon || 'fa-book'}"></i></div>
                        <h4 class="text-base font-bold mb-2 leading-snug text-slate-900 dark:text-white">${course.title}</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mb-4 line-clamp-2 flex-grow">${course.subtitle || ''}</p>
                        
                        <div class="mt-auto flex flex-col w-full">
                            ${exploreBtnHtml}
                            <button onclick="window.initiateCheckout('${course.title}')" class="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-brand-blue font-bold py-2 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm active:scale-95 text-xs">Enroll Now</button>
                        </div>
                    </div>`;
            });
        } catch(e) { console.error(e); }
    } else if(type === 'educators') {
        // Find educators from the new SDUI layout
        getDoc(doc(db, "cms", "homepage")).then(snap => {
            if(snap.exists() && snap.data().sduiLayout) {
                grid.innerHTML = '';
                const layout = snap.data().sduiLayout;
                layout.filter(i => i.type === 'educatorRow').forEach(item => {
                    const edu = item.data;
                    const photo = edu.photoUrl || `https://ui-avatars.com/api/?name=${edu.name}&background=2563eb&color=fff`;
                    const safeName = edu.name.replace(/[^a-zA-Z0-9]/g, '_');
                    grid.innerHTML += `
                        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-md flex flex-col items-center text-center hover:-translate-y-1 transition-transform cursor-pointer">
                            <img src="${photo}" class="w-20 h-20 rounded-full mb-4 object-cover border-4 border-slate-50 dark:border-slate-800 shadow-sm">
                            <h4 class="font-bold text-slate-900 dark:text-white mb-1">${edu.name}</h4>
                            <p class="text-[10px] text-brand-blue uppercase font-bold tracking-wider mb-3">${edu.expertise}</p>
                            <div id="stars-${safeName}-viewall" class="flex gap-1.5 text-base mb-1"><i class="fa-solid fa-spinner fa-spin text-slate-300 text-xs"></i></div>
                            <span id="rating-text-${safeName}-viewall" class="text-[9px] text-slate-400 font-bold">Loading...</span>
                        </div>`;
                    setTimeout(() => { if(window.loadSingleEducatorRating) window.loadSingleEducatorRating(edu.name); }, 50);
                });
            }
        });
    }
}

window.renderHomepage(); // Initialize call

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

// ==========================================
// 🚀 DYNAMIC CAROUSEL ANIMATION ENGINE
// ==========================================
window.carouselTimers = window.carouselTimers || {};

window.moveCarousel = function(cid, direction) {
    const c = document.getElementById(cid);
    if(!c) return;
    let curr = parseInt(c.getAttribute('data-current-slide'));
    let total = parseInt(c.getAttribute('data-total-slides'));
    let next = (curr + direction + total) % total;
    window.goToCarouselSlide(cid, next);
    window.resetCarouselTimer(cid);
};

window.goToCarouselSlide = function(cid, index) {
    const c = document.getElementById(cid);
    if(!c) return;
    c.setAttribute('data-current-slide', index);
    
    // Slide fade animation
    const slides = c.querySelectorAll('div[data-slide-index]');
    slides.forEach((sl, i) => {
        if (i === index) { sl.classList.replace('opacity-0', 'opacity-100'); sl.classList.replace('z-0', 'z-10'); } 
        else { sl.classList.replace('opacity-100', 'opacity-0'); sl.classList.replace('z-10', 'z-0'); }
    });

    // Dot expansion animation
    const dots = c.querySelectorAll('button[data-dot-index]');
    dots.forEach((dot, i) => {
        if (i === index) dot.className = "h-2.5 rounded-full transition-all duration-300 shadow-sm bg-white w-5";
        else dot.className = "h-2.5 rounded-full transition-all duration-300 shadow-sm bg-white/50 w-2 hover:bg-white/80";
    });
};

window.initCarouselAutoplay = function(cid) { window.resetCarouselTimer(cid); };

window.resetCarouselTimer = function(cid) {
    if(window.carouselTimers[cid]) clearInterval(window.carouselTimers[cid]);
    const c = document.getElementById(cid);
    if(c && parseInt(c.getAttribute('data-total-slides')) > 1) {
        window.carouselTimers[cid] = setInterval(() => window.moveCarousel(cid, 1), 4000); // 4 Seconds Auto-Shuffle
    }
};