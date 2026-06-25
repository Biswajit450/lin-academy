// course-builder.js

// 🚨 ADDED query, where, getDocs for Smart Roster 🚨
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

// ==========================================
// COURSE BUILDER CANVAS ENGINE
// ==========================================
window.clearCanvasPlaceholder = function() { 
    const placeholder = document.getElementById('canvas-placeholder'); 
    if (placeholder) placeholder.remove(); 
}

window.addBlock = function(type) {
    window.clearCanvasPlaceholder();
    const dropzone = document.getElementById('editor-canvas-dropzone');
    const blockId = 'block-' + Date.now();
    let blockHTML = '';

    if(type === 'text') {
        blockHTML = `
        <div id="${blockId}" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm block-hover-effect cursor-move mb-3" draggable="true" ondragstart="window.drag(event)">
            <div class="flex justify-between items-center mb-2">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"><i class="fa-solid fa-heading text-purple-400 mr-1"></i> Text Area</span>
                <button onclick="document.getElementById('${blockId}').remove(); window.autoSaveDraft();" class="text-slate-300 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash"></i></button>
            </div>
            <input type="text" placeholder="Section Heading (Optional)" class="w-full bg-transparent border-none outline-none text-xl font-bold text-slate-900 dark:text-white mb-2 placeholder-slate-300 dark:placeholder-slate-700">
            <textarea placeholder="Type your paragraph or description here..." rows="2" class="w-full bg-transparent border-none outline-none text-sm text-slate-600 dark:text-slate-400 placeholder-slate-300 dark:placeholder-slate-700 resize-y"></textarea>
        </div>`;
    } else if(type === 'table') {
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
    
    dropzone.insertAdjacentHTML('beforeend', blockHTML); 
    setTimeout(window.autoSaveDraft, 200);
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
    dropzone.insertAdjacentHTML('beforeend', html); 
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

// Drag & Drop logic for Course Builder
window.draggedElement = null;

window.drag = function(ev) { 
    window.draggedElement = ev.target; 
    ev.dataTransfer.effectAllowed = "move"; 
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
        
        if(!dropTarget && ev.target.closest('[id^="folder-"]')) {
            dropTarget = ev.target.closest('[id^="folder-"]').querySelector('.folder-dropzone');
        }
        
        if(!dropTarget) {
            dropTarget = document.getElementById('editor-canvas-dropzone'); 
        }
        
        if(window.draggedElement !== dropTarget && !window.draggedElement.contains(dropTarget)) { 
            const innerText = dropTarget.querySelector('.pointer-events-none'); 
            if(innerText) innerText.style.display = 'none'; 
            dropTarget.appendChild(window.draggedElement); 
            window.autoSaveDraft(); 
        } 
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
        querySnapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            if(userData.email) {
                emails.push(userData.email);
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
            document.getElementById('editor-canvas-dropzone').innerHTML = data.canvasHtml || ''; 
        } else { 
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
// 🚨 THE STUDENT LOCKDOWN ENGINE 🚨
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
            
            canvas.innerHTML = data.canvasHtml || ''; 
            
            // 🔒 1. Disable all drag & drop completely
            canvas.querySelectorAll('[draggable]').forEach(el => {
                el.removeAttribute('draggable');
                el.classList.remove('cursor-move', 'block-hover-effect');
            });
            
            // 🔒 2. Lock all tables and headings so they can't be edited
            canvas.querySelectorAll('[contenteditable="true"]').forEach(el => {
                el.setAttribute('contenteditable', 'false');
            });
            
            // 🔒 3. Lock all input boxes and textareas so student can't type
            // BUG FIX: Added specific 'disabled=true' for Date/Time picker!
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
            
        } else { 
            canvas.innerHTML = '<div class="text-center text-rose-500 py-10"><i class="fa-solid fa-triangle-exclamation text-2xl mb-3"></i><br>Course content is being updated. Please check back soon!</div>'; 
        } 
    } catch(error) { 
        console.error("Error fetching course", error); 
        canvas.innerHTML = '<div class="text-center text-rose-500 py-10">Error fetching course. Check console.</div>'; 
    }
}

// ==========================================
// EXAM BUILDER ENGINE
// ==========================================
window.openTestModal = function() { 
    document.getElementById('test-creator-modal').classList.remove('hidden'); 
    // 🚀 ENGINE START: Modal khulte hi Quill Editors ko zinda karo!
    if(window.initRichEditors) window.initRichEditors();
}

window.closeTestModal = function() { 
    document.getElementById('test-creator-modal').classList.add('hidden'); 
}

window.draftQuestions = []; 

window.addDraftQuestion = function() {
    // 🚀 NEW: Read Question Text from Quill Editor (handle empty state)
    const qTextHtml = window.questionEditor ? window.questionEditor.root.innerHTML : '';
    const qText = (qTextHtml === '<p><br></p>') ? '' : qTextHtml; 

    const opt1 = document.getElementById('q-opt1').value; 
    const opt2 = document.getElementById('q-opt2').value; 
    const opt3 = document.getElementById('q-opt3').value; 
    const opt4 = document.getElementById('q-opt4').value; 
    const correctAns = parseInt(document.getElementById('q-correct').value); 
    
    // 🚀 NEW: Read Explanation from Quill Editor
    const expHtml = window.explanationEditor ? window.explanationEditor.root.innerHTML : '';
    const explanation = (expHtml === '<p><br></p>') ? '' : expHtml;
    
    if(!qText || !opt1 || !opt2 || !opt3 || !opt4) { 
        alert("Please fill out the question and all 4 options!"); 
        return; 
    }
    
    window.draftQuestions.push({ 
        question: qText, 
        options: [opt1, opt2, opt3, opt4], 
        correctAnswerIndex: correctAns, 
        explanation: explanation 
    });
    
    document.getElementById('draft-counter').innerText = window.draftQuestions.length;
    
    // 🚀 NEW: Safely Clear Quill Editors for the next question
    if(window.questionEditor) window.questionEditor.setContents([]);
    if(window.explanationEditor) window.explanationEditor.setContents([]);

    document.getElementById('q-opt1').value = ''; 
    document.getElementById('q-opt2').value = ''; 
    document.getElementById('q-opt3').value = ''; 
    document.getElementById('q-opt4').value = ''; 
}

window.publishExamToFirebase = async function() {
    if(window.draftQuestions.length === 0) { 
        alert("Add at least 1 question before publishing!"); 
        return; 
    }
    
    const title = document.getElementById('exam-setting-title').value; 
    const duration = parseFloat(document.getElementById('exam-setting-time').value); 
    const posMarks = parseFloat(document.getElementById('exam-setting-pos').value); 
    const negMarks = parseFloat(document.getElementById('exam-setting-neg').value); 
    const passPct = parseFloat(document.getElementById('exam-setting-pass').value);
    
    if(!title || !duration || !posMarks) { 
        alert("Please fill out the Global Exam Settings at the top!"); 
        return; 
    }

    const submitBtn = event.target; 
    const originalText = submitBtn.innerHTML; 
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving to Vault...'; 
    submitBtn.disabled = true;

    try {
        const docRef = await addDoc(collection(db, "exams"), { 
            settings: { 
                testTitle: title, 
                totalTimeInMinutes: duration, 
                marksForCorrectAnswer: posMarks, 
                marksForWrongAnswer: negMarks, 
                passPercentage: passPct 
            }, 
            questions: window.draftQuestions, 
            createdAt: new Date().toISOString() 
        });
        
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
                        <div class="text-[10px] text-slate-500 font-medium mt-0.5">Vault ID: ${docRef.id} • ${window.draftQuestions.length} Questions</div>
                        <button class="student-action-btn mt-3 px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-transform hover:scale-105 active:scale-95 bg-emerald-600 hover:bg-emerald-700 text-white" onclick="window.consumeContent('test', '${docRef.id}')">📝 Start Mock Test</button>
                    </div>
                </div>`;
                
            dropzone.insertAdjacentHTML('beforeend', testHtml); 
            window.autoSaveDraft();
        }
        
        window.draftQuestions = []; 
        document.getElementById('draft-counter').innerText = "0"; 
        document.getElementById('exam-builder-form').reset(); 
        // 🚀 NEW: Clean up Rich Editors completely after publishing
        if(window.questionEditor) window.questionEditor.setContents([]);
        if(window.explanationEditor) window.explanationEditor.setContents([]);
        window.closeTestModal();
        
        alert(`Test Saved! Your Vault ID is: ${docRef.id}\nYou can copy this ID and use it in the Arena Test Manager!`);
        
    } catch (e) { 
        console.error(e); 
        alert("Failed to publish exam."); 
    } finally { 
        submitBtn.innerHTML = originalText; 
        submitBtn.disabled = false; 
    }
}

// ==========================================
// CONTENT CONSUMPTION ENGINE (PREMIUM PLAYER)
// ==========================================
window.consumeContent = function(type, elementOrId) {
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
    
    if(type === 'live') { 
        window.open(val, '_blank'); 
    } 
    else if(type === 'video' || type === 'pdf') { 
        document.getElementById('content-player-modal').classList.remove('hidden');
        document.getElementById('player-title').innerText = title;
        
        if (type === 'video') {
            // 🚀 SMART AUTO-IFRAME ENGINE FOR BUNNY.NET 🚀
            // Agar link Bunny.net ka pura Embed HTML Code hai, toh usme se sirf URL extract karo
            if (val.includes('<iframe') && val.includes('src="')) {
                const urlMatch = val.match(/src="([^"]+)"/);
                if (urlMatch && urlMatch[1]) {
                    val = urlMatch[1]; // Sirf "https://iframe.mediadelivery.net/..." nikala
                }
            }
            
            // YouTube Handler (Pehle jaisa)
            if (val.includes('youtube.com/watch?v=')) {
                val = val.replace('watch?v=', 'embed/');
            } else if (val.includes('youtu.be/')) {
                val = val.replace('youtu.be/', 'www.youtube.com/embed/');
            }
        }
        
        document.getElementById('player-iframe').src = val;
    }
}

window.closeContentPlayer = function() {
    document.getElementById('content-player-modal').classList.add('hidden');
    document.getElementById('player-iframe').src = ''; 
}