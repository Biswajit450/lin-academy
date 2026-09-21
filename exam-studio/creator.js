// creator.js - The Core Engine for PWOS Exam Studio

import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
// 🚀 Importing Firebase configs directly from the main project root
import { auth, db, storage } from "../firebase-config.js";

let questionEditor = null;
let explanationEditor = null;
let draftQuestions = [];
let currentFileId = 'test_' + Date.now();
let autoSaveTimeout = null;

// ==========================================
// 1. RICH TEXT & MATH ENGINE INITIALIZATION
// ==========================================
function initEditors() {
    const toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        ['image', 'formula'],
        ['clean']
    ];

    // 🚀 Smart Storage Engine: Direct Upload to Vault Cloud
    const imageHandler = function() {
        const editor = this.quill;
        const input = document.getElementById('exam-image-upload');
        
        input.onchange = async () => {
            const file = input.files[0];
            if (file) {
                const range = editor.getSelection(true);
                editor.insertText(range.index, 'Uploading image...', 'user');
                
                try {
                    const uid = auth.currentUser ? auth.currentUser.uid : 'temp_user';
                    // Save isolated in exam_assets folder
                    const filename = `PWOS_Vault/${uid}/exam_assets/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                    const storageRef = ref(storage, filename);
                    
                    await uploadBytes(storageRef, file);
                    const url = await getDownloadURL(storageRef);
                    
                    editor.deleteText(range.index, 18);
                    editor.insertEmbed(range.index, 'image', url);
                    editor.setSelection(range.index + 1);
                    
                    triggerAutoSave(); // Image daalte hi auto-save
                } catch (error) {
                    console.error("Image upload failed:", error);
                    editor.deleteText(range.index, 18);
                    alert("Failed to securely upload image to Cloud Vault.");
                }
                input.value = ''; // Input reset
            }
        };
        input.click();
    };

    questionEditor = new window.Quill('#q-text-editor', {
        modules: { toolbar: { container: toolbarOptions, handlers: { image: imageHandler } } },
        theme: 'snow',
        placeholder: 'Type your question here. Use (fx) for complex math equations...'
    });

    explanationEditor = new window.Quill('#q-exp-editor', {
        modules: { toolbar: { container: toolbarOptions, handlers: { image: imageHandler } } },
        theme: 'snow',
        placeholder: 'Provide a detailed step-by-step explanation here...'
    });

    // Typing track for auto-save
    questionEditor.on('text-change', triggerAutoSave);
    explanationEditor.on('text-change', triggerAutoSave);
}

// ==========================================
// 2. WORKSPACE & QUESTION ARRAY MANAGEMENT
// ==========================================
document.getElementById('btn-add-draft').addEventListener('click', () => {
    const qTextHtml = questionEditor.root.innerHTML;
    const qText = (qTextHtml === '<p><br></p>') ? '' : qTextHtml;
    
    const optA = document.getElementById('q-opt0').value.trim();
    const optB = document.getElementById('q-opt1').value.trim();
    const optC = document.getElementById('q-opt2').value.trim();
    const optD = document.getElementById('q-opt3').value.trim();
    const correctAns = parseInt(document.getElementById('q-correct').value);
    
    const expHtml = explanationEditor.root.innerHTML;
    const explanation = (expHtml === '<p><br></p>') ? '' : expHtml;

    if(!qText || !optA || !optB || !optC || !optD) {
        alert("Please write the question and fill out all 4 options!");
        return;
    }

    draftQuestions.push({
        question: qText,
        options: [optA, optB, optC, optD],
        correctAnswerIndex: correctAns,
        explanation: explanation
    });

    updateDraftUI();
    clearWorkspace();
    triggerAutoSave();
});

function clearWorkspace() {
    questionEditor.setContents([]);
    explanationEditor.setContents([]);
    document.getElementById('q-opt0').value = '';
    document.getElementById('q-opt1').value = '';
    document.getElementById('q-opt2').value = '';
    document.getElementById('q-opt3').value = '';
    document.getElementById('q-correct').value = '0';
}

document.getElementById('btn-clear-workspace').addEventListener('click', clearWorkspace);

function updateDraftUI() {
    document.getElementById('draft-counter-badge').innerText = draftQuestions.length;
    const listEl = document.getElementById('draft-question-list');
    
    if (draftQuestions.length === 0) {
        listEl.innerHTML = '<div class="text-center text-[10px] text-slate-400 font-bold uppercase py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">No questions drafted yet.</div>';
        return;
    }

    listEl.innerHTML = '';
    draftQuestions.forEach((q, index) => {
        // Strip HTML for quick preview
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = q.question;
        const plainText = tempDiv.textContent || tempDiv.innerText || "";
        const previewText = plainText.length > 35 ? plainText.substring(0, 35) + '...' : plainText;

        listEl.innerHTML += `
            <div class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm relative group transition-colors hover:border-brand-blue">
                <button onclick="window.removeDraftQuestion(${index})" class="absolute top-2 right-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><i class="fa-solid fa-trash text-xs"></i></button>
                <span class="text-[9px] font-bold text-brand-blue uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">Q${index + 1}</span>
                <p class="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5 truncate pr-6">${previewText}</p>
            </div>
        `;
    });
}

// Attach to window so HTML onclick can access it
window.removeDraftQuestion = function(index) {
    if(confirm("Remove this question from the draft?")) {
        draftQuestions.splice(index, 1);
        updateDraftUI();
        triggerAutoSave();
    }
}

// ==========================================
// 3. SECURE VAULT INTEGRATION (AUTO-SAVE)
// ==========================================
function triggerAutoSave() {
    clearTimeout(autoSaveTimeout);
    document.getElementById('auto-save-status').classList.add('hidden');
    // Debounce wait time: 1.5 seconds after user stops typing
    autoSaveTimeout = setTimeout(saveToVault, 1500);
}

// Attach listeners to global settings
['exam-setting-title', 'exam-setting-time', 'exam-setting-pass', 'exam-setting-pos', 'exam-setting-neg'].forEach(id => {
    document.getElementById(id).addEventListener('input', triggerAutoSave);
});

async function saveToVault() {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const title = document.getElementById('exam-setting-title').value.trim() || 'Untitled_Test';
    
    const settings = {
        testTitle: title,
        totalTimeInMinutes: parseFloat(document.getElementById('exam-setting-time').value) || 0,
        passPercentage: parseFloat(document.getElementById('exam-setting-pass').value) || 40,
        marksForCorrectAnswer: parseFloat(document.getElementById('exam-setting-pos').value) || 0,
        marksForWrongAnswer: parseFloat(document.getElementById('exam-setting-neg').value) || 0
    };

    const testPayload = {
        id: currentFileId,
        name: title,
        type: 'test', // 🚀 MAGIC FLAG: This differentiates it from '.slate' files in Vault
        settings: settings,
        questions: draftQuestions,
        timestamp: new Date().toISOString(),
        trashed: false
    };

    try {
        await setDoc(doc(db, "PWOS_Vault", uid, "projects", currentFileId), testPayload, { merge: true });
        
        document.getElementById('header-vault-id').innerText = currentFileId;
        document.getElementById('auto-save-status').classList.remove('hidden');
    } catch (error) {
        console.error("Vault Auto-Save Error:", error);
    }
}

document.getElementById('btn-save-vault').addEventListener('click', () => {
    saveToVault();
    alert("Test perfectly synchronized with your Vault!");
});

// ==========================================
// 4. BOOT SEQUENCE & EDIT MODE LISTENER
// ==========================================
window.addEventListener('load', () => {
    initEditors();
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Check if App.js opened an existing file
            const urlParams = new URLSearchParams(window.location.search);
            const fileId = urlParams.get('fileId');
            
            if (fileId) {
                currentFileId = fileId;
                document.getElementById('header-vault-id').innerText = 'Loading Workspace...';
                
                try {
                    const snap = await getDoc(doc(db, "PWOS_Vault", user.uid, "projects", fileId));
                    if (snap.exists()) {
                        const data = snap.data();
                        
                        // Load Settings
                        document.getElementById('exam-setting-title').value = data.settings?.testTitle || data.name || '';
                        document.getElementById('exam-setting-time').value = data.settings?.totalTimeInMinutes || '';
                        document.getElementById('exam-setting-pass').value = data.settings?.passPercentage || '';
                        document.getElementById('exam-setting-pos').value = data.settings?.marksForCorrectAnswer || '';
                        document.getElementById('exam-setting-neg').value = data.settings?.marksForWrongAnswer || '';
                        
                        // Load Questions
                        draftQuestions = data.questions || [];
                        updateDraftUI();
                        
                        document.getElementById('header-vault-id').innerText = currentFileId;
                    }
                } catch (e) {
                    console.error("Failed to load test from Vault", e);
                    document.getElementById('header-vault-id').innerText = 'Corrupted File';
                }
            }
        }
    });
});

// ==========================================
// 5. THEME & WINDOW CONTROLS (PWOS BRIDGE)
// ==========================================
const btnTheme = document.getElementById('btn-theme');

btnTheme.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    btnTheme.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    
    // Sync theme back to parent OS if running inside iframe
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'SYNC_THEME', theme: isDark ? 'dark' : 'light' }, '*');
    }
});

// Listen for OS-level theme changes
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SYNC_THEME') {
        if (event.data.theme === 'dark') {
            document.documentElement.classList.add('dark');
            btnTheme.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            document.documentElement.classList.remove('dark');
            btnTheme.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    }
});

// Close Application Request
document.getElementById('btn-close-studio').addEventListener('click', () => {
    if (window.parent !== window) {
        // We reuse the 'CLOSE_SLATE' command as it just closes the main iframe container
        window.parent.postMessage({ type: 'CLOSE_SLATE' }, '*');
    } else {
        window.close();
    }
});