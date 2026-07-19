// course-builder.js

// 🚨 ADDED query, where, getDocs for Smart Roster 🚨
// 🚨 ADDED query, where, getDocs for Smart Roster & Firebase Storage for PDF Uploads 🚨
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { auth, db, storage } from "./firebase-config.js";

// ==========================================
// COURSE BUILDER CANVAS ENGINE
// ==========================================
window.clearCanvasPlaceholder = function() { 
    const placeholder = document.getElementById('canvas-placeholder'); 
    if (placeholder) placeholder.remove(); 
}

window.initBlockEditor = function(element) {
    if(!element) return;
    const toolbarOptions = [
        [{ 'header': [1, 2, 3, 4, 5, false] }], // Styles: H1 to H5 & Normal
        ['bold', 'italic', 'underline'],        // Text Formatting
        [{ 'color': [] }, { 'background': [] }],// Text Color & Highlight
        [{ 'align': [] }],                      // Alignment
        [{ 'list': 'ordered'}, { 'list': 'bullet' }], // Lists
        ['link', 'clean']                       // Links & Remove Formatting
    ];
    const quill = new window.Quill(element, {
        modules: { toolbar: toolbarOptions },
        theme: 'snow',
        placeholder: 'Type your rich content here...'
    });
    // Auto-save whenever educator types something!
    quill.on('text-change', function() {
        window.autoSaveDraft();
    });
}

window.addBlock = function(type) {
    window.clearCanvasPlaceholder();
    const dropzone = document.getElementById('editor-canvas-dropzone');
    const blockId = 'block-' + Date.now();
    let blockHTML = '';

    if(type === 'text') {
        blockHTML = `
        <div id="${blockId}" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-0 shadow-sm block-hover-effect cursor-move mb-3 text-block-container overflow-hidden" draggable="true" ondragstart="window.drag(event)">
            <div class="flex justify-between items-center p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"><i class="fa-solid fa-heading text-purple-400 mr-1"></i> Rich Text Block</span>
                <button onclick="document.getElementById('${blockId}').remove(); window.autoSaveDraft();" class="text-slate-300 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="p-2 bg-white">
                <div class="quill-editor-container text-slate-800" style="min-height: 120px; font-family: inherit;"></div>
            </div>
        </div>`;
    } else if(type === 'table') { // Iske aage ka code same rahega
        blockHTML = `
        <div id="${blockId}" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm block-hover-effect cursor-move mb-3" draggable="true" ondragstart="window.drag(event)">
            <div class="flex justify-between items-center mb-2">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><i class="fa-solid fa-table text-cyan-400"></i> <input type="text" value="Table" class="bg-transparent border-none outline-none font-bold text-slate-400 uppercase tracking-wider text-[10px] w-32"></span>
                <div class="flex items-center gap-2">
                    <button onclick="window.addRow(this)" class="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">+ Row</button>
                    <button onclick="window.removeRow(this)" class="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">- Row</button>
                    <button onclick="window.addCol(this)" class="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ml-2">+ Col</button>
                    <button onclick="window.removeCol(this)" class="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">- Col</button>
                    <button onclick="document.getElementById('${blockId}').remove(); window.autoSaveDraft();" class="text-slate-300 hover:text-red-500 transition-colors ml-2"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="editor-table w-full text-sm">
                    <tr>
                        <th contenteditable="true" class="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold p-2">Column 1</th>
                        <th contenteditable="true" class="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold p-2">Column 2</th>
                    </tr>
                    <tr>
                        <td contenteditable="true" class="p-2 text-slate-600 dark:text-slate-400">Data</td>
                        <td contenteditable="true" class="p-2 text-slate-600 dark:text-slate-400">Data</td>
                    </tr>
                </table>
            </div>
        </div>`;
    } else if(type === 'live' || type === 'video' || type === 'pdf') {
        let icon = ''; let color = ''; let placeholderText = ''; let typeName = ''; let extraInputs = ''; let actionBtnText = ''; let actionColor = ''; let studentVisibleHtml = '';
        
        if(type === 'live') { 
            icon = 'fa-video'; color = 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'; typeName = 'Live Session'; placeholderText = 'Meeting Link (Zoom, Meet, etc.)';
            actionBtnText = '🔴 Join Live Class'; actionColor = 'bg-red-500 hover:bg-red-600 text-white border border-red-600';
            
            // 🚨 BUG FIX: Time boxes moved OUTSIDE admin area so students can see them!
            extraInputs = ``; 
            studentVisibleHtml = `
                <div class="grid grid-cols-2 gap-3 mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div>
                        <label class="text-[10px] font-bold text-slate-500 block mb-1">SCHEDULED START</label>
                        <input type="datetime-local" class="w-full text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 dark:text-white outline-none font-bold text-slate-700" onchange="window.autoSaveDraft()">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-500 block mb-1">SCHEDULED END</label>
                        <input type="datetime-local" class="w-full text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 dark:text-white outline-none font-bold text-slate-700" onchange="window.autoSaveDraft()">
                    </div>
                </div>`;
        }
        
        if(type === 'video') { 
            icon = 'fa-play'; color = 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'; typeName = 'Video Lecture'; placeholderText = 'Video Link (Bunny.net, YouTube, etc.)'; 
            actionBtnText = '▶ Watch Lecture'; actionColor = 'bg-brand-blue hover:bg-blue-700 text-white border border-blue-700'; 
        }
        
        if(type === 'pdf') { 
            icon = 'fa-file-pdf'; color = 'text-rose-500 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'; typeName = 'PDF Handout'; placeholderText = 'Secure File URL (Firebase Storage etc.)'; 
            actionBtnText = '📄 View Document'; actionColor = 'bg-rose-500 hover:bg-rose-600 text-white border border-rose-600'; 
            
            // 🚀 NEW: Firebase Upload Button for PDF
            extraInputs = `
                <div class="mt-2 flex items-center gap-2">
                    <input type="file" accept="application/pdf" class="hidden" onchange="window.uploadCoursePdf(this)">
                    <button type="button" onclick="this.previousElementSibling.click()" class="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded font-bold hover:bg-slate-300 transition-colors flex items-center gap-1"><i class="fa-solid fa-cloud-arrow-up"></i> Upload PDF to Firebase</button>
                    <span class="upload-status text-[10px] text-emerald-500 font-bold hidden"><i class="fa-solid fa-check"></i> Uploaded Successfully</span>
                </div>`;
        }

        blockHTML = `
        <div id="${blockId}" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start gap-4 shadow-sm block-hover-effect cursor-move mb-3" draggable="true" ondragstart="window.drag(event)">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center border ${color} shrink-0 text-xl shadow-inner">
                <i class="fa-solid ${icon}"></i>
            </div>
            <div class="flex-grow w-full">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${typeName}</span>
                    <button onclick="document.getElementById('${blockId}').remove(); window.autoSaveDraft();" class="text-slate-300 hover:text-red-500 transition-colors" title="Delete Resource"><i class="fa-solid fa-trash"></i></button>
                </div>
                <input type="text" placeholder="${typeName} Title" class="w-full bg-transparent border-b border-slate-100 dark:border-slate-800 focus:border-brand-blue outline-none text-sm font-bold text-slate-900 dark:text-white pb-1 mb-2 transition-colors">
                <div class="admin-input-area">
                    <input type="text" placeholder="${placeholderText}" class="link-input w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5 outline-none text-xs text-slate-500 dark:text-slate-400 font-mono">
                    ${extraInputs}
                </div>
                ${studentVisibleHtml}
                <button class="student-action-btn mt-4 px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-transform hover:-translate-y-0.5 active:scale-95 ${actionColor} hidden w-full sm:w-auto text-center justify-center" onclick="window.consumeContent('${type}', this)">${actionBtnText}</button>
            </div>
        </div>`;
    }
    
    // 🚀 NEW: Smart Insertion Logic (Top or Bottom)
    const position = document.getElementById('admin-insert-position')?.value || 'bottom';
    if (position === 'top') {
        // Agar pehle se koi placeholder hai, toh seedha top par jodo
        if (dropzone.querySelector('#canvas-placeholder')) {
            window.clearCanvasPlaceholder();
            dropzone.insertAdjacentHTML('afterbegin', blockHTML);
        } else {
            // Agar pehle se blocks hain, toh unke theek upar jodo
            window.clearCanvasPlaceholder();
            dropzone.insertAdjacentHTML('afterbegin', blockHTML);
        }
    } else {
        window.clearCanvasPlaceholder();
        dropzone.insertAdjacentHTML('beforeend', blockHTML); 
    }
    
    // 🚀 FIX 1: Toolbar ab add karte hi immediately render ho jayega!
    if (type === 'text') {
        const editorDiv = document.getElementById(blockId).querySelector('.quill-editor-container');
        window.initBlockEditor(editorDiv);
    }
    
    setTimeout(window.autoSaveDraft, 200);
}

// 🚀 NAYA ENGINE: PDF Upload to Firebase Storage
window.uploadCoursePdf = async function(input) {
    const file = input.files[0];
    if (!file) return;
    
    const block = input.closest('[id^="block-"]');
    const linkInput = block.querySelector('.link-input');
    const status = block.querySelector('.upload-status');
    const btn = input.nextElementSibling;
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
    btn.disabled = true;
    
    try {
        const filename = 'course_pdfs/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        linkInput.value = url; // Link automatic text box mein fill ho jayega
        window.autoSaveDraft(); 
        
        btn.classList.add('hidden'); // Button chupa do
        status.classList.remove('hidden'); // Success message dikha do
    } catch(e) {
        console.error("PDF Upload Error:", e);
        alert("Upload failed! Please try again.");
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

window.addDynamicFolder = function() {
    window.clearCanvasPlaceholder(); 
    const blockId = 'folder-' + Date.now(); 
    const dropzone = document.getElementById('editor-canvas-dropzone');
    const html = `
        <div id="${blockId}" class="bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-amber-300 dark:border-amber-700/50 rounded-2xl p-4 mb-4 shadow-sm" draggable="true" ondragstart="window.drag(event)">
            <div class="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div class="flex items-center gap-3 w-full">
                    <i class="fa-solid fa-folder-open text-amber-500 text-2xl"></i>
                    <input type="text" placeholder="Folder Name (e.g., Module 1: Basics)" class="bg-transparent border-none outline-none font-bold text-slate-800 dark:text-white w-full text-lg">
                </div>
                <button onclick="document.getElementById('${blockId}').remove(); window.autoSaveDraft();" class="text-slate-300 hover:text-red-500 transition-colors ml-2" title="Delete Folder"><i class="fa-solid fa-trash text-lg"></i></button>
            </div>
            <div class="folder-dropzone min-h-[80px] space-y-3 p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 transition-colors shadow-inner" ondragover="window.allowDrop(event)" ondrop="window.drop(event)">
                <div class="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest pointer-events-none mt-4"><i class="fa-solid fa-download block text-lg mb-1 opacity-50"></i>Drop Content Blocks Here</div>
            </div>
        </div>`;
    // 🚀 NEW: Smart Insertion Logic (Top or Bottom)
    const position = document.getElementById('admin-insert-position')?.value || 'bottom';
    if (position === 'top') {
        if (dropzone.querySelector('#canvas-placeholder')) window.clearCanvasPlaceholder();
        dropzone.insertAdjacentHTML('afterbegin', html);
    } else {
        window.clearCanvasPlaceholder();
        dropzone.insertAdjacentHTML('beforeend', html); 
    }
 
    setTimeout(window.autoSaveDraft, 200);
}

// Table logic
window.addRow = function(btn) { 
    const table = btn.closest('div[id^="block-"]').querySelector('table'); 
    const cols = table.rows[0].cells.length; 
    let row = table.insertRow(); 
    for(let i=0; i<cols; i++) { 
        row.insertCell(i).innerHTML = "Data"; 
        row.cells[i].contentEditable = "true"; 
        row.cells[i].className = "p-2 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"; 
    } 
    window.autoSaveDraft(); 
}

window.removeRow = function(btn) { 
    const table = btn.closest('div[id^="block-"]').querySelector('table'); 
    if(table.rows.length > 2) { 
        table.deleteRow(-1); 
        window.autoSaveDraft(); 
    } else { 
        alert("You must have at least one row of data!"); 
    } 
}

window.addCol = function(btn) { 
    const table = btn.closest('div[id^="block-"]').querySelector('table'); 
    for(let i=0; i<table.rows.length; i++) { 
        let cell = (i===0) ? document.createElement('th') : table.rows[i].insertCell(-1); 
        if(i===0) { 
            table.rows[0].appendChild(cell); 
            cell.innerHTML = "New Column"; 
            cell.className = "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold p-2 border border-slate-200 dark:border-slate-700"; 
        } else { 
            cell.innerHTML = "Data"; 
            cell.className = "p-2 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"; 
        } 
        cell.contentEditable = "true"; 
    } 
    window.autoSaveDraft(); 
}

window.removeCol = function(btn) { 
    const table = btn.closest('div[id^="block-"]').querySelector('table'); 
    if(table.rows[0].cells.length > 1) { 
        for(let i=0; i<table.rows.length; i++) { 
            table.rows[i].deleteCell(-1); 
        } 
        window.autoSaveDraft(); 
    } else { 
        alert("You must have at least one column!"); 
    } 
}

// ==========================================
// 🚀 THE ULTIMATE DRAG & DROP ENGINE
// ==========================================
window.draggedElement = null;

window.drag = function(ev) { 
    window.draggedElement = ev.target; 
    ev.dataTransfer.effectAllowed = "move"; 
    // Thoda delay taaki ghost image theek dikhe
    setTimeout(() => ev.target.classList.add('opacity-50'), 0); 
}

window.allowDrop = function(ev) { 
    ev.preventDefault(); 
    ev.stopPropagation(); 
}

window.drop = function(ev) { 
    ev.preventDefault(); 
    ev.stopPropagation(); 
    
    if(window.draggedElement) { 
        window.draggedElement.classList.remove('opacity-50'); 
        
        let dropTarget = ev.target.closest('.folder-dropzone'); 
        
        // 1. Agar block ko kisi Folder ke andar daal rahe hain
        if(dropTarget && !window.draggedElement.closest('.folder-dropzone')) {
            const innerText = dropTarget.querySelector('.pointer-events-none'); 
            if(innerText) innerText.style.display = 'none'; 
            dropTarget.appendChild(window.draggedElement); 
            window.autoSaveDraft();
            return;
        }

        // 2. Agar canvas par upar/neeche arrange kar rahe hain (THE MAGIC)
        let mainCanvas = document.getElementById('editor-canvas-dropzone');
        
        // Jiske upar mouse chhoda, us block ko identify karo
        let targetBlock = ev.target.closest('[draggable="true"]');
        
        if (targetBlock && targetBlock !== window.draggedElement && targetBlock.parentElement === mainCanvas) {
            // Mouse ki exact position calculate karo
            const bounding = targetBlock.getBoundingClientRect();
            const offset = bounding.y + (bounding.height / 2);
            
            if (ev.clientY - offset > 0) {
                // Agar mouse block ke neeche wale hisse mein hai, toh block ke theek NEECHE jodo
                targetBlock.insertAdjacentElement('afterend', window.draggedElement);
            } else {
                // Agar mouse block ke upar wale hisse mein hai, toh block ke theek UPAR jodo
                targetBlock.insertAdjacentElement('beforebegin', window.draggedElement);
            }
        } else if (mainCanvas && !targetBlock) {
            // Agar khali jagah par chhoda, toh seedha last mein chipka do
            mainCanvas.appendChild(window.draggedElement);
        }
        
        window.autoSaveDraft(); 
    } 
}

document.addEventListener('dragend', function(e) { 
    if(window.draggedElement) window.draggedElement.classList.remove('opacity-50'); 
});

// ==========================================
// SMART ROSTER ENGINE
// ==========================================
window.fetchCourseRoster = async function(courseName) {
    const rosterBtn = document.getElementById('view-roster-btn');
    const rosterCount = document.getElementById('roster-count-btn');
    const rosterEmails = document.getElementById('roster-emails');

    if(!courseName) {
        if(rosterBtn) rosterBtn.classList.add('hidden');
        return;
    }

    if(rosterBtn) rosterBtn.classList.remove('hidden');
    if(rosterEmails) rosterEmails.value = "Fetching active student emails from secure vault...";
    if(rosterCount) rosterCount.innerText = "0";

    try {
        const q = query(collection(db, "users"), where("unlocked_courses", "array-contains", courseName));
        const querySnapshot = await getDocs(q);
        
        let emails = [];
        const now = new Date(); // 🚀 NEW: Aaj ki date pakadne ke liye

        querySnapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            
            if(userData.email) {
                let isExpired = false;
                
                // 🚀 NEW: The Expiry Bouncer Logic
                // Check karte hain ki kya is course ki date aaj se purani ho chuki hai
                if (userData.course_expiries && userData.course_expiries[courseName]) {
                    const expDate = new Date(userData.course_expiries[courseName]);
                    if (now > expDate) {
                        isExpired = true; // Validity khatam!
                    }
                }
                
                // Agar expired NAHI hai, tabhi list mein daalo
                if (!isExpired) {
                    emails.push(userData.email);
                }
            }
        });

        if(emails.length > 0) {
            if(rosterCount) rosterCount.innerText = emails.length;
            if(rosterEmails) rosterEmails.value = emails.join(', '); 
        } else {
            if(rosterCount) rosterCount.innerText = "0";
            if(rosterEmails) rosterEmails.value = "No active students found for this course yet.";
        }
    } catch(e) {
        console.error("Error fetching roster:", e);
        if(rosterEmails) rosterEmails.value = "Failed to fetch roster. Please check your connection.";
    }
}

window.copyRosterEmails = function() {
    const emailBox = document.getElementById('roster-emails');
    if(!emailBox || !emailBox.value || emailBox.value.includes("Fetching") || emailBox.value.includes("No active")) {
        alert("Nothing to copy yet!");
        return;
    }
    
    navigator.clipboard.writeText(emailBox.value).then(() => {
        const btn = event.currentTarget;
        const originalHtml = btn.innerHTML;
        
        btn.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
        btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
        btn.classList.add('bg-slate-800', 'hover:bg-slate-700');
        
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.remove('bg-slate-800', 'hover:bg-slate-700');
            btn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert("Failed to copy to clipboard. You can manually select and copy the text.");
    });
}

// ==========================================
// CLOUD SAVE & PUBLISH (COURSE BUILDER)
// ==========================================
window.autoSaveDraft = async function() {
    const courseName = document.getElementById('admin-course-selector').value; 
    if(!courseName) return;
    
    const dropzone = document.getElementById('editor-canvas-dropzone');
    dropzone.querySelectorAll('input').forEach(input => input.setAttribute('value', input.value));
    dropzone.querySelectorAll('textarea').forEach(ta => ta.innerHTML = ta.value);
    dropzone.querySelectorAll('th, td').forEach(cell => { 
        if(cell.contentEditable === "true") cell.setAttribute('data-content', cell.innerHTML); 
    });
    
    try { 
        await setDoc(doc(db, "course_drafts", courseName), { 
            mainTitle: document.getElementById('draft-main-title').value, 
            subTitle: document.getElementById('draft-sub-title').value, 
            canvasHtml: dropzone.innerHTML, 
            updatedAt: new Date().toISOString() 
        }); 
        
        const status = document.getElementById('cloud-sync-status'); 
        status.classList.remove('hidden'); 
        setTimeout(() => status.classList.add('hidden'), 2000); 
    } catch(e) { 
        console.error("Auto-save failed", e); 
    }
}

window.loadDraftForAdmin = async function(courseName) {
    if(!courseName) return; 
    document.getElementById('admin-editor-toolbar').classList.remove('hidden'); 
    document.getElementById('admin-draft-canvas-wrapper').classList.remove('hidden');
    
    window.fetchCourseRoster(courseName);

    try { 
        const draftSnap = await getDoc(doc(db, "course_drafts", courseName)); 
        if(draftSnap.exists()) { 
            const data = draftSnap.data(); 
            document.getElementById('draft-main-title').value = data.mainTitle || ''; 
            document.getElementById('draft-sub-title').value = data.subTitle || ''; 
            
            const dropzone = document.getElementById('editor-canvas-dropzone');
            dropzone.innerHTML = data.canvasHtml || ''; 

            // 🚀 NEW: Restore Quill Editors
            dropzone.querySelectorAll('.text-block-container').forEach(block => {
                const container = block.querySelector('.quill-editor-container');
                if (container) {
                    const rawHtml = block.querySelector('.ql-editor') ? block.querySelector('.ql-editor').innerHTML : container.innerHTML;
                    const oldToolbar = block.querySelector('.ql-toolbar');
                    if (oldToolbar) oldToolbar.remove(); // Clean duplicate toolbars
                    container.innerHTML = rawHtml;
                    window.initBlockEditor(container);
                }
            });
        } else { 
            // Baaki same rahega...
            document.getElementById('draft-main-title').value = ''; 
            document.getElementById('draft-sub-title').value = ''; 
            document.getElementById('editor-canvas-dropzone').innerHTML = `<div id="canvas-placeholder" class="text-center text-slate-400 dark:text-slate-600 py-10 text-sm font-medium"><i class="fa-solid fa-arrow-up text-2xl mb-3 animate-bounce"></i><br>Select a course, then use the ribbon above to insert folders and blocks here.</div>`; 
        } 
    } catch(e) { 
        console.error("Load draft failed", e); 
    }
}

window.publishCourse = async function() {
    const courseName = document.getElementById('admin-course-selector').value; 
    if(!courseName) { alert("Please select a course first!"); return; }
    
    const dropzone = document.getElementById('editor-canvas-dropzone'); 
    dropzone.querySelectorAll('input').forEach(input => input.setAttribute('value', input.value)); 
    dropzone.querySelectorAll('textarea').forEach(ta => ta.innerHTML = ta.value);
    
    try { 
        await setDoc(doc(db, "published_courses", courseName), { 
            mainTitle: document.getElementById('draft-main-title').value, 
            subTitle: document.getElementById('draft-sub-title').value, 
            canvasHtml: dropzone.innerHTML, 
            publishedAt: new Date().toISOString() 
        }); 
        alert("Boom! 🚀 Course successfully published to the Enrollments tab!"); 
    } catch(e) { 
        console.error("Publish failed", e); 
        alert("Failed to publish!"); 
    }
}

// ==========================================
// 🚨 THE STUDENT LOCKDOWN ENGINE (WITH PROGRESS TRACKER) 🚨
// ==========================================
window.openCourseView = async function(courseName) {
    await window.showScreen('screen-course-view'); 
    
    document.getElementById('course-view-title').innerText = courseName; 
    const canvas = document.getElementById('course-render-canvas'); 
    canvas.innerHTML = '<div class="text-center text-slate-400 py-10"><i class="fa-solid fa-spinner fa-spin text-2xl mb-3"></i><br>Fetching your ecosystem...</div>';
    
    try { 
        const docRef = doc(db, "published_courses", courseName); 
        const docSnap = await getDoc(docRef); 
        
        if (docSnap.exists()) { 
            const data = docSnap.data(); 
            document.getElementById('student-main-title').innerText = data.mainTitle || ''; 
            document.getElementById('student-sub-title').innerText = data.subTitle || ''; 
            
            // 🚀 FIX: Tailwind CSS ke Reset ko override karne ke liye Custom Rich Text Styles
            const richTextStyles = `
                <style>
                    /* Headings Fix */
                    .ql-editor h1 { font-size: 2.25rem !important; font-weight: 800 !important; line-height: 1.2 !important; margin-bottom: 0.5rem !important; }
                    .ql-editor h2 { font-size: 1.875rem !important; font-weight: 700 !important; line-height: 1.3 !important; margin-bottom: 0.5rem !important; }
                    .ql-editor h3 { font-size: 1.5rem !important; font-weight: 700 !important; line-height: 1.4 !important; margin-bottom: 0.5rem !important; }
                    .ql-editor h4 { font-size: 1.25rem !important; font-weight: 600 !important; line-height: 1.5 !important; margin-bottom: 0.5rem !important; }
                    
                    /* Lists & Links Fix */
                    .ql-editor ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin-bottom: 0.5rem !important; }
                    .ql-editor ol { list-style-type: decimal !important; padding-left: 1.5rem !important; margin-bottom: 0.5rem !important; }
                    .ql-editor a { color: #2563eb !important; text-decoration: underline !important; }
                    
                    /* Alignments Fix */
                    .ql-align-center { text-align: center !important; }
                    .ql-align-right { text-align: right !important; }
                    .ql-align-justify { text-align: justify !important; }
                </style>
            `;
            
            // Puraane HTML ke theek upar yeh style tag laga do
            canvas.innerHTML = richTextStyles + (data.canvasHtml || ''); 
            
            // 🔒 1. Disable all drag & drop completely
            canvas.querySelectorAll('[draggable]').forEach(el => {
                el.removeAttribute('draggable');
                el.classList.remove('cursor-move', 'block-hover-effect');
            });
            
            // 🚀 NEW: Clean up Quill Editors for Students
            canvas.querySelectorAll('.ql-toolbar').forEach(tb => tb.remove()); // Toolbar chhupa do
            canvas.querySelectorAll('.ql-container').forEach(c => {
                c.style.border = 'none'; // Editing borders hata do
                c.classList.remove('ql-snow'); 
            });
            canvas.querySelectorAll('.ql-editor').forEach(e => {
                e.setAttribute('contenteditable', 'false'); // Type karna lock kar do
                e.style.padding = '0';
            });
            // 🚀 FIX 2: Hide "Rich Text Block" Admin Header & Borders from Students
            canvas.querySelectorAll('.text-block-container').forEach(block => {
                // 1. Upar ka Title aur Trash button hata do
                const adminHeader = block.querySelector('.flex.justify-between.items-center.p-3');
                if (adminHeader) adminHeader.remove();
                
                // 2. Dabbe (Box) jaisa look hata do taaki text page ke sath seamlessly blend ho jaye
                block.classList.remove('bg-white', 'dark:bg-slate-900', 'border', 'border-slate-200', 'dark:border-slate-800', 'shadow-sm', 'p-0');
                
                // 3. Andar ka white background bhi hata do
                const innerBox = block.querySelector('.p-2.bg-white');
                if (innerBox) innerBox.classList.remove('bg-white', 'p-2');
            });
            
            // 🔒 2. Lock all tables and headings so they can't be edited
            canvas.querySelectorAll('[contenteditable="true"]').forEach(el => {
                el.setAttribute('contenteditable', 'false');
            });
            
            // 🔒 3. Lock all input boxes and textareas so student can't type
            canvas.querySelectorAll('input, textarea').forEach(el => {
                el.readOnly = true;
                if(el.type === 'datetime-local') {
                    el.disabled = true;
                }
                el.classList.add('pointer-events-none');
            });
            
            // 🟢 4. Keep only action buttons clickable
            canvas.querySelectorAll('button').forEach(btn => {
                btn.style.pointerEvents = 'auto';
            });

            // 🚀 NEW: PROGRESS TRACKING RENDERER (PHASE 2) 🚀
            if (auth.currentUser) {
                try {
                    const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        const courseProgress = userData.course_progress?.[courseName] || {};
                        
                        let totalBlocks = 0;
                        let completedBlocks = 0;

                        const actionBlocks = canvas.querySelectorAll('[id^="block-"]');
                        
                        actionBlocks.forEach(block => {
                            const btn = block.querySelector('.student-action-btn');
                            if (btn) {
                                totalBlocks++;
                                if (courseProgress[block.id]) {
                                    completedBlocks++;
                                    btn.innerHTML = '✅ Completed (Watch Again)';
                                    btn.classList.remove('bg-brand-blue', 'bg-rose-500', 'hover:bg-blue-700', 'hover:bg-rose-600', 'border-blue-700', 'border-rose-600');
                                    btn.classList.add('bg-emerald-600', 'hover:bg-emerald-700', 'border-emerald-700');
                                    
                                    const iconBox = block.querySelector('.w-12.h-12');
                                    if(iconBox) {
                                        iconBox.className = 'w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 text-xl shadow-inner text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
                                    }
                                }
                            }
                        });

                        const progressPct = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;
                        
                        // Yeh UI update hum next step mein HTML mein fix karenge
                        const progressFill = document.getElementById('course-progress-fill');
                        const progressText = document.getElementById('course-progress-text');
                        
                        if (progressFill) progressFill.style.width = progressPct + '%';
                        if (progressText) progressText.innerText = progressPct + '% Completed';
                    }
                } catch (e) {
                    console.error("Progress fetch error:", e);
                }
            }
            
        } else { 
            canvas.innerHTML = '<div class="text-center text-rose-500 py-10"><i class="fa-solid fa-triangle-exclamation text-2xl mb-3"></i><br>Course content is being updated. Please check back soon!</div>'; 
        } 
    } catch(error) { 
        console.error("Error fetching course", error); 
        canvas.innerHTML = '<div class="text-center text-rose-500 py-10">Error fetching course. Check console.</div>'; 
    }
}

// ==========================================
// 🚀 EXAM BUILDER ENGINE (THE VAULT MANAGER UPGRADE)
// ==========================================
window.openTestModal = function(mode = 'course') { 
    document.getElementById('test-creator-modal').classList.remove('hidden'); 
    
    // UI Connections
    const searchBox = document.getElementById('test-manager-search-box');
    const btnPublish = document.getElementById('btn-publish-test');
    const btnUpdate = document.getElementById('btn-update-test');
    const btnDelete = document.getElementById('btn-delete-test');
    const title = document.getElementById('test-modal-title');
    const publishText = document.getElementById('btn-publish-text');
    
    // Sab kuch reset karo modal khulte hi
    document.getElementById('editing-test-id').value = '';
    window.draftQuestions = [];
    document.getElementById('draft-counter').innerText = "0";
    document.getElementById('exam-builder-form').reset();
    if(window.questionEditor) window.questionEditor.setContents([]);
    if(window.explanationEditor) window.explanationEditor.setContents([]);

    if (mode === 'manager') {
        // Vault Manager Mode: Standalone Test Manager
        searchBox.classList.remove('hidden');
        searchBox.classList.add('flex');
        title.innerText = "Vault Manager";
        btnUpdate.classList.add('hidden');
        btnDelete.classList.add('hidden');
        btnPublish.classList.remove('hidden');
        publishText.innerText = "Save New Test to Vault";
    } else {
        // Course Drop Mode: Purana normal behavior
        searchBox.classList.add('hidden');
        searchBox.classList.remove('flex');
        title.innerText = "Interactive Test Creator";
        btnUpdate.classList.add('hidden');
        btnDelete.classList.add('hidden');
        btnPublish.classList.remove('hidden');
        publishText.innerText = "Save & Drop to Canvas";
    }

    if(window.initRichEditors) window.initRichEditors();
}

window.closeTestModal = function() { 
    document.getElementById('test-creator-modal').classList.add('hidden'); 
}

window.draftQuestions = []; 

window.addDraftQuestion = function() {
    const qTextHtml = window.questionEditor ? window.questionEditor.root.innerHTML : '';
    const qText = (qTextHtml === '<p><br></p>') ? '' : qTextHtml; 
    const opt1 = document.getElementById('q-opt1').value; 
    const opt2 = document.getElementById('q-opt2').value; 
    const opt3 = document.getElementById('q-opt3').value; 
    const opt4 = document.getElementById('q-opt4').value; 
    const correctAns = parseInt(document.getElementById('q-correct').value); 
    const expHtml = window.explanationEditor ? window.explanationEditor.root.innerHTML : '';
    const explanation = (expHtml === '<p><br></p>') ? '' : expHtml;
    
    if(!qText || !opt1 || !opt2 || !opt3 || !opt4) { 
        alert("Please fill out the question and all 4 options!"); 
        return; 
    }
    
    window.draftQuestions.push({ question: qText, options: [opt1, opt2, opt3, opt4], correctAnswerIndex: correctAns, explanation: explanation });
    document.getElementById('draft-counter').innerText = window.draftQuestions.length;
    
    if(window.questionEditor) window.questionEditor.setContents([]);
    if(window.explanationEditor) window.explanationEditor.setContents([]);
    document.getElementById('q-opt1').value = ''; 
    document.getElementById('q-opt2').value = ''; 
    document.getElementById('q-opt3').value = ''; 
    document.getElementById('q-opt4').value = ''; 
}

window.publishExamToFirebase = async function() {
    if(window.draftQuestions.length === 0) { alert("Add at least 1 question before publishing!"); return; }
    const title = document.getElementById('exam-setting-title').value; 
    const duration = parseFloat(document.getElementById('exam-setting-time').value); 
    const posMarks = parseFloat(document.getElementById('exam-setting-pos').value); 
    const negMarks = parseFloat(document.getElementById('exam-setting-neg').value); 
    const passPct = parseFloat(document.getElementById('exam-setting-pass').value);
    
    if(!title || !duration || !posMarks) { alert("Please fill out the Global Exam Settings at the top!"); return; }

    const submitBtn = event.target; 
    const originalText = submitBtn.innerHTML; 
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'; 
    submitBtn.disabled = true;

    try {
        const docRef = await addDoc(collection(db, "exams"), { 
            settings: { testTitle: title, totalTimeInMinutes: duration, marksForCorrectAnswer: posMarks, marksForWrongAnswer: negMarks, passPercentage: passPct }, 
            questions: window.draftQuestions, 
            createdAt: new Date().toISOString() 
        });
        
        // Smart Check: Agar button par Canvas likha hai, toh Drop karo. Warna sirf Save.
        const btnText = document.getElementById('btn-publish-text').innerText;
        if (btnText.includes('Canvas')) {
            window.renderTestBlockToCanvas(docRef.id, title, window.draftQuestions.length);
        } else {
            alert(`Test Successfully Saved to Vault! \n\nVault ID: ${docRef.id}\n(Save this ID to insert it anywhere later)`);
        }
        
        window.closeTestModal();
    } catch (e) { 
        console.error(e); alert("Failed to publish exam."); 
    } finally { 
        submitBtn.innerHTML = originalText; submitBtn.disabled = false; 
    }
}

// 🚀 NEW: THE MAGIC LOAD ENGINE
window.loadTestForEditing = async function() {
    const vaultId = document.getElementById('test-vault-search-id').value.trim();
    if(!vaultId) return alert("Please paste a valid Vault ID to load a test.");

    const searchBtn = event.currentTarget;
    searchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-[10px]"></i>';
    
    try {
        const snap = await getDoc(doc(db, "exams", vaultId));
        if(snap.exists()) {
            const data = snap.data();
            document.getElementById('editing-test-id').value = vaultId;
            
            // Fill Settings
            document.getElementById('exam-setting-title').value = data.settings.testTitle || '';
            document.getElementById('exam-setting-time').value = data.settings.totalTimeInMinutes || '';
            document.getElementById('exam-setting-pos').value = data.settings.marksForCorrectAnswer || '';
            document.getElementById('exam-setting-neg').value = data.settings.marksForWrongAnswer || '';
            document.getElementById('exam-setting-pass').value = data.settings.passPercentage || '';
            
            // Load Questions
            window.draftQuestions = data.questions || [];
            document.getElementById('draft-counter').innerText = window.draftQuestions.length;
            
            // Swap Action Buttons for Editing
            document.getElementById('btn-publish-test').classList.add('hidden');
            document.getElementById('btn-update-test').classList.remove('hidden');
            document.getElementById('btn-delete-test').classList.remove('hidden');
            
            alert(`Test Loaded Successfully!\nIt contains ${window.draftQuestions.length} questions. You can add new questions or hit 'Update Vault' to save changes.`);
        } else {
            alert("Test not found! Please check the Vault ID.");
        }
    } catch(e) { 
        console.error(e); alert("Error fetching the test."); 
    } finally { 
        searchBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass text-[10px]"></i>'; 
    }
}

// 🚀 NEW: UPDATE EXISTING TEST
window.updateTestInVault = async function() {
    const vaultId = document.getElementById('editing-test-id').value;
    if(!vaultId) return alert("No test loaded to update!");
    if(window.draftQuestions.length === 0) return alert("Cannot save an empty test.");

    const title = document.getElementById('exam-setting-title').value; 
    const duration = parseFloat(document.getElementById('exam-setting-time').value); 
    const posMarks = parseFloat(document.getElementById('exam-setting-pos').value); 
    const negMarks = parseFloat(document.getElementById('exam-setting-neg').value); 
    const passPct = parseFloat(document.getElementById('exam-setting-pass').value);

    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
    btn.disabled = true;

    try {
        await updateDoc(doc(db, "exams", vaultId), {
            settings: { testTitle: title, totalTimeInMinutes: duration, marksForCorrectAnswer: posMarks, marksForWrongAnswer: negMarks, passPercentage: passPct },
            questions: window.draftQuestions,
            updatedAt: new Date().toISOString()
        });
        alert("Test successfully updated in the Vault!");
        window.closeTestModal();
    } catch(e) { 
        console.error(e); alert("Failed to update test."); 
    } finally { 
        btn.innerHTML = originalText; btn.disabled = false; 
    }
}

// 🚀 NEW: DELETE TEST PERMANENTLY
window.deleteTestFromVault = async function() {
    const vaultId = document.getElementById('editing-test-id').value;
    if(!vaultId) return;
    
    if(confirm(`⚠️ WARNING: Are you sure you want to completely DELETE this test?\nIf it's deployed in any course, students will no longer be able to access it.`)) {
        try {
            await deleteDoc(doc(db, "exams", vaultId));
            alert("Test permanently deleted from the Vault.");
            window.closeTestModal();
        } catch(e) { 
            console.error(e); alert("Failed to delete test."); 
        }
    }
}

// 🚀 NEW: SMART INJECTOR LOGIC
window.promptInsertExistingTest = async function() {
    const vaultId = prompt("Enter the Vault ID of the Test you want to insert:");
    if(!vaultId) return;

    try {
        const snap = await getDoc(doc(db, "exams", vaultId));
        if(snap.exists()) {
            const data = snap.data();
            const qCount = (data.questions || []).length;
            // Render to canvas directly
            window.renderTestBlockToCanvas(vaultId, data.settings.testTitle, qCount);
        } else {
            alert("Test not found! Please check the Vault ID.");
        }
    } catch(e) { 
        console.error(e); alert("Error fetching test."); 
    }
}

// Helper Function: Renders HTML block on Canvas
window.renderTestBlockToCanvas = function(vaultId, title, qCount) {
    window.clearCanvasPlaceholder(); 
    const blockId = 'test-' + Date.now(); 
    const dropzone = document.getElementById('editor-canvas-dropzone');
    if(dropzone) {
        const testHtml = `
            <div id="${blockId}" class="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-4 shadow-sm block-hover-effect cursor-move mb-3" draggable="true" ondragstart="window.drag(event)">
                <div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-800 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 text-xl border border-emerald-200 dark:border-emerald-700">
                    <i class="fa-solid fa-clipboard-list"></i>
                </div>
                <div class="flex-grow w-full">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">Premium Mock Test</span>
                        <button onclick="document.getElementById('${blockId}').remove(); window.autoSaveDraft();" class="text-slate-300 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash"></i></button>
                    </div>
                    <div class="font-bold text-slate-900 dark:text-white text-sm truncate">${title}</div>
                    <div class="text-[10px] text-slate-500 font-medium mt-0.5">Vault ID: ${vaultId} • ${qCount} Questions</div>
                    <button class="student-action-btn mt-3 px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-transform hover:scale-105 active:scale-95 bg-emerald-600 hover:bg-emerald-700 text-white" onclick="window.consumeContent('test', '${vaultId}')">📝 Start Mock Test</button>
                </div>
            </div>`;
        // 🚀 NEW: Smart Insertion Logic (Top or Bottom)
        const position = document.getElementById('admin-insert-position')?.value || 'bottom';
        if (position === 'top') {
            if (dropzone.querySelector('#canvas-placeholder')) window.clearCanvasPlaceholder();
            dropzone.insertAdjacentHTML('afterbegin', testHtml);
        } else {
            window.clearCanvasPlaceholder();
            dropzone.insertAdjacentHTML('beforeend', testHtml); 
        }
        window.autoSaveDraft();
    }
}

// ==========================================
// CONTENT CONSUMPTION ENGINE (PREMIUM PLAYER)
// ==========================================
window.consumeContent = async function(type, elementOrId) { // 🚀 Changed to async
    if(type === 'test') { 
        window.initStudentExam(elementOrId);
        return; 
    }
    
    const block = elementOrId.closest('[id^="block-"]'); 
    const linkInput = block.querySelector('.link-input'); 
    let val = linkInput ? linkInput.value.trim() : '';
    
    const titleInput = block.querySelector('input[placeholder*="Title"]');
    const title = titleInput ? titleInput.value : 'Classroom Content';
    
    if(!val) { 
        alert("Your educator hasn't provided a secure link for this resource yet."); 
        return; 
    }

    // 🚀 NEW: PROGRESS SAVER ENGINE (PHASE 1) 🚀
    if (auth.currentUser && block && block.id) {
        try {
            // 🚨 BUG FIX: Ab hum exact Database ID padh rahe hain!
            const courseName = document.getElementById('course-view-title').innerText;
            // Humne merge: true use kiya hai taaki user ka purana data delete na ho
            await setDoc(doc(db, "users", auth.currentUser.uid), {
                course_progress: {
                    [courseName]: {
                        [block.id]: true
                    }
                }
            }, { merge: true });

            const btn = elementOrId;
            if (!btn.innerText.includes("Completed")) {
                btn.innerHTML = '✅ Completed (Watch Again)';
                btn.classList.remove('bg-brand-blue', 'bg-rose-500', 'hover:bg-blue-700', 'hover:bg-rose-600', 'border-blue-700', 'border-rose-600');
                btn.classList.add('bg-emerald-600', 'hover:bg-emerald-700', 'border-emerald-700');
                
                const iconBox = block.querySelector('.w-12.h-12');
                if(iconBox) iconBox.className = 'w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 text-xl shadow-inner text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
            }
        } catch (e) {
            console.error("Failed to save progress", e);
        }
    }

    // --- (Baaki ka purana video/pdf logic same rahega) ---
    if(type === 'live') { 
        window.open(val, '_blank'); 
    } 
    else if(type === 'video' || type === 'pdf') { 
        document.getElementById('content-player-modal').classList.remove('hidden');
        document.getElementById('player-title').innerText = title;
        
        const playerBox = document.getElementById('player-container-box');
        
        if (window.innerWidth < 768) {
            try {
                const modal = document.getElementById('content-player-modal');
                const reqFullscreen = modal.requestFullscreen || modal.webkitRequestFullscreen || modal.msRequestFullscreen;
                if (reqFullscreen) {
                    reqFullscreen.call(modal).then(() => {
                        if (screen.orientation && screen.orientation.lock) {
                            screen.orientation.lock('landscape').catch(e => console.log("Orientation lock warning:", e));
                        }
                    }).catch(e => console.log("Fullscreen request failed:", e));
                }
            } catch(e) {}
        }

        if (type === 'video') {
            if (val.includes('<iframe') && val.includes('src="')) {
                const urlMatch = val.match(/src="([^"]+)"/);
                if (urlMatch && urlMatch[1]) val = urlMatch[1]; 
            }
            
            if (val.includes('youtube.com/watch?v=')) {
                val = val.replace('watch?v=', 'embed/');
            } else if (val.includes('youtu.be/')) {
                val = val.replace('youtu.be/', 'www.youtube.com/embed/');
            }
            
            if (val.includes('iframe.mediadelivery.net') || val.includes('bunny.net')) {
                const separator = val.includes('?') ? '&' : '?';
                val = val + separator + 'autoplay=true&loop=false&muted=false&preload=true&responsive=true';
            }

            if (playerBox) {
                playerBox.classList.remove('sm:h-[85vh]');
                playerBox.classList.add('sm:aspect-video', 'sm:h-auto');
            }
        } else if (type === 'pdf') { 
            if (playerBox) {
                playerBox.classList.remove('sm:aspect-video', 'sm:h-auto');
                playerBox.classList.add('sm:h-[85vh]');
            }
            if (val.includes('firebasestorage.googleapis.com') && !val.includes('docs.google.com')) {
                val = `https://docs.google.com/gview?url=${encodeURIComponent(val)}&embedded=true`;
            }
        }
        
        document.getElementById('player-iframe').src = val;
    }
}

window.closeContentPlayer = function() {
    document.getElementById('content-player-modal').classList.add('hidden');
    document.getElementById('player-iframe').src = ''; 
    
    // 📱 ROBUST MOBILE MAGIC: The Android Fullscreen & Portrait Fix
    try {
        // 1. Pehle Fullscreen se bahar aao
        const exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen || document.mozCancelFullScreen;
        if (exitFS && (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement)) {
            exitFS.call(document).catch(err => console.log("Exit FS Error:", err));
        }
        
        // 2. Zabardasti Portrait mode mein laao, phir Unlock karo
        if (screen.orientation) {
            if (screen.orientation.lock) {
                // Force portrait
                screen.orientation.lock('portrait').then(() => {
                    // 1 second baad lock hata do taaki device naturally behave kare
                    setTimeout(() => screen.orientation.unlock(), 1000);
                }).catch(e => {
                    // Agar browser restrict kare, toh directly unlock chala do
                    screen.orientation.unlock();
                });
            } else if (screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        }
    } catch(e) {
        console.error("Mobile rotation fix failed", e);
    }
}