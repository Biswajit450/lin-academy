// board-engine.js

const wrapper = document.getElementById('canvas-wrapper');

const canvas = new fabric.Canvas('studio-canvas', {
    isDrawingMode: true,
    width: wrapper.clientWidth,
    height: wrapper.clientHeight,
    backgroundColor: '#ffffff'
});

// Convert Hex to RGBA for Highlighter
function hexToRgba(hex, alpha) {
    let r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
canvas.freeDrawingBrush.color = '#0f172a';
canvas.freeDrawingBrush.width = 3;
canvas.freeDrawingBrush.strokeLineCap = 'round';
canvas.freeDrawingBrush.strokeLineJoin = 'round';

// Update resize listener to use the new wrapper size
window.addEventListener('resize', () => {
    canvas.setWidth(wrapper.clientWidth);
    canvas.setHeight(wrapper.clientHeight);
    canvas.renderAll();
});

// =====================================
// STATE & TOOLBAR MANAGEMENT (Keep your existing code below this line)
// =====================================
let currentMode = 'draw';
// ... rest of the code remains exactly the same // Modes: draw, select, erase, pan
const toolBtns = document.querySelectorAll('.tool-btn');

function updateToolbarUI(activeBtnId) {
    toolBtns.forEach(btn => {
        btn.classList.replace('text-brand-blue', 'text-slate-500');
        btn.classList.remove('bg-blue-50');
        btn.classList.add('hover:bg-slate-100');
    });
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) {
        activeBtn.classList.replace('text-slate-500', 'text-brand-blue');
        activeBtn.classList.remove('hover:bg-slate-100');
        activeBtn.classList.add('bg-blue-50');
    }
}

// Base Pen
document.getElementById('btn-draw').addEventListener('click', () => {
    currentMode = 'draw';
    canvas.isDrawingMode = true;
    updateToolbarUI('btn-draw');
    
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.width = parseInt(document.getElementById('pen-width').value, 10);
    canvas.freeDrawingBrush.color = document.getElementById('pen-color').value;
    canvas.freeDrawingBrush.shadow = null;
});

// Highlighter (Thick, 40% Opacity)
document.getElementById('btn-highlight').addEventListener('click', () => {
    currentMode = 'highlight';
    canvas.isDrawingMode = true;
    updateToolbarUI('btn-highlight');
    
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.width = parseInt(document.getElementById('pen-width').value, 10) * 4; 
    let color = document.getElementById('pen-color').value;
    canvas.freeDrawingBrush.color = hexToRgba(color, 0.4);
    canvas.freeDrawingBrush.shadow = null;
});

// Laser Pointer (Glowing Red, Vanishes)
document.getElementById('btn-laser').addEventListener('click', () => {
    currentMode = 'laser';
    canvas.isDrawingMode = true;
    updateToolbarUI('btn-laser');
    
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.width = 5;
    canvas.freeDrawingBrush.color = '#ef4444'; // Red glow
    canvas.freeDrawingBrush.shadow = new fabric.Shadow({
        blur: 15,
        color: '#ef4444'
    });
});

document.getElementById('btn-select').addEventListener('click', () => {
    currentMode = 'select';
    canvas.isDrawingMode = false;
    updateToolbarUI('btn-select');
});

document.getElementById('btn-eraser').addEventListener('click', () => {
    currentMode = 'erase';
    canvas.isDrawingMode = false;
    updateToolbarUI('btn-eraser');
});

document.getElementById('btn-pan').addEventListener('click', () => {
    currentMode = 'pan';
    canvas.isDrawingMode = false;
    updateToolbarUI('btn-pan');
});

// =====================================
// INFINITE PANNING (HAND TOOL) & ERASER
// =====================================
let isDragging = false;
let lastPosX, lastPosY;

canvas.on('mouse:down', function(opt) {
    if (currentMode === 'pan') {
        isDragging = true;
        canvas.selection = false;
        lastPosX = opt.e.clientX;
        lastPosY = opt.e.clientY;
    } else if (currentMode === 'erase' && opt.target) {
        if (opt.target.type === 'path') {
            canvas.remove(opt.target);
            saveHistory(); // Save state after erasing
        }
    }
});

canvas.on('mouse:move', function(opt) {
    if (isDragging && currentMode === 'pan') {
        let e = opt.e;
        let vpt = this.viewportTransform;
        vpt[4] += e.clientX - lastPosX;
        vpt[5] += e.clientY - lastPosY;
        this.requestRenderAll();
        lastPosX = e.clientX;
        lastPosY = e.clientY;
    }
});

canvas.on('mouse:up', function(opt) {
    if (currentMode === 'pan') {
        isDragging = false;
        canvas.selection = true;
    }
});

// =====================================
// TIME MACHINE (UNDO / REDO)
// =====================================
let canvasHistory = [];
let historyIndex = -1;
let isHistoryTracking = false;

function saveHistory() {
    if (!isHistoryTracking) return;
    
    // If we undo and then draw something new, delete the future redo states
    if (historyIndex < canvasHistory.length - 1) {
        canvasHistory = canvasHistory.slice(0, historyIndex + 1);
    }
    
    // Snapshot the board including our custom 'isSlide' tag
    canvasHistory.push(JSON.stringify(canvas.toJSON(['isSlide'])));
    historyIndex++;
}

// Initial Blank State
setTimeout(() => {
    isHistoryTracking = true;
    saveHistory();
}, 100);

// Auto-track drawing, but ignore and vanish laser pointers
canvas.on('path:created', (e) => {
    if (currentMode === 'laser') {
        const path = e.path;
        path.set({ selectable: false, evented: false });
        
        // Smoothly fade out the laser stroke after 1 second
        setTimeout(() => {
            path.animate('opacity', 0, {
                duration: 500,
                onChange: canvas.renderAll.bind(canvas),
                onComplete: () => canvas.remove(path)
            });
        }, 1000);
    } else {
        saveHistory(); 
    }
});
canvas.on('object:modified', saveHistory);

function loadHistory(index) {
    if (index < 0 || index >= canvasHistory.length) return;
    isHistoryTracking = false; // Pause tracking while loading past state
    canvas.loadFromJSON(canvasHistory[index], function() {
        canvas.renderAll();
        isHistoryTracking = true; // Resume tracking
    });
}

document.getElementById('btn-undo').addEventListener('click', () => {
    if (historyIndex > 0) {
        historyIndex--;
        loadHistory(historyIndex);
    }
});

document.getElementById('btn-redo').addEventListener('click', () => {
    if (historyIndex < canvasHistory.length - 1) {
        historyIndex++;
        loadHistory(historyIndex);
    }
});

// Keyboard Shortcuts (Ctrl+Z / Ctrl+Y)
window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') document.getElementById('btn-undo').click();
    if (e.ctrlKey && e.key === 'y') document.getElementById('btn-redo').click();
});

// =====================================
// BACKGROUND SLIDE, PDF ENGINE & INK CONTROLS
// =====================================
let pdfDoc = null;
let currentSlide = 1;
let totalSlides = 0;
let slideMap = {}; // Tracks if a slide is a PDF page or a Blank Page
let pageInkMemory = {}; // 🧠 Bug-Free Memory

const pdfNav = document.getElementById('pdf-nav');
const pageIndicator = document.getElementById('page-indicator');

function saveCurrentPageInk() {
    if (totalSlides === 0) return;
    const inkObjects = canvas.getObjects().filter(obj => obj.type === 'path');
    pageInkMemory[currentSlide] = inkObjects.map(obj => obj.toObject());
}

function restorePageInk() {
    if (!pageInkMemory[currentSlide]) return;
    fabric.util.enlivenObjects(pageInkMemory[currentSlide], function(objects) {
        objects.forEach(obj => canvas.add(obj));
        canvas.renderAll();
    });
}

function renderSlide(slideNum) {
    pageIndicator.textContent = `${slideNum} / ${totalSlides}`;
    const slideData = slideMap[slideNum];
    
    canvas.clear();
    
    // 🚀 THE FIX: Check current theme before setting slide background
    const isDark = document.documentElement.classList.contains('dark');
    canvas.backgroundColor = isDark ? '#0f172a' : '#ffffff';

    if (slideData.type === 'pdf') {
        pdfDoc.getPage(slideData.pdfPageIndex).then(page => {
            const viewport = page.getViewport({ scale: 2.0 });
            const tempCanvas = document.createElement('canvas');
            const ctx = tempCanvas.getContext('2d');
            tempCanvas.height = viewport.height;
            tempCanvas.width = viewport.width;

            page.render({ canvasContext: ctx, viewport: viewport }).promise.then(() => {
                fabric.Image.fromURL(tempCanvas.toDataURL(), function(img) {
                    const scale = Math.min((wrapper.clientWidth * 0.9) / img.width, (wrapper.clientHeight * 0.9) / img.height);
                    img.set({
                        scaleX: scale, scaleY: scale,
                        left: wrapper.clientWidth / 2, top: wrapper.clientHeight / 2,
                        originX: 'center', originY: 'center',
                        selectable: false, evented: false, isSlide: true
                    });
                    canvas.add(img);
                    canvas.sendToBack(img);
                    restorePageInk();
                    
                    canvasHistory = [];
                    historyIndex = -1;
                    saveHistory(); 
                });
            });
        });
    } else if (slideData.type === 'blank') {
        const blankWidth = wrapper.clientWidth * 0.8;
        const blankHeight = blankWidth * (9/16);
        const rect = new fabric.Rect({
            width: blankWidth, height: blankHeight,
            left: wrapper.clientWidth / 2, top: wrapper.clientHeight / 2,
            originX: 'center', originY: 'center',
            fill: isDark ? '#1e293b' : '#ffffff', // Adapts blank slide box to dark mode
            stroke: '#cbd5e1', strokeWidth: 2,
            selectable: false, evented: false, isSlide: true
        });
        canvas.add(rect);
        canvas.sendToBack(rect);
        restorePageInk();
        
        canvasHistory = [];
        historyIndex = -1;
        saveHistory(); 
        syncNotesUI();
    }
}

document.getElementById('btn-upload').addEventListener('click', () => document.getElementById('slide-upload').click());

document.getElementById('slide-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
        const fileReader = new FileReader();
        fileReader.onload = function() {
            const typedarray = new Uint8Array(this.result);
            pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                pdfDoc = pdf;
                totalSlides = pdf.numPages;
                currentSlide = 1;
                slideMap = {};
                pageInkMemory = {}; 
                
                // Map original PDF pages
                for(let i = 1; i <= totalSlides; i++) {
                    slideMap[i] = { type: 'pdf', pdfPageIndex: i };
                }
                
                pdfNav.classList.remove('hidden');
                pdfNav.classList.add('flex');
                renderSlide(currentSlide);
            });
        };
        fileReader.readAsArrayBuffer(file);
    }
});

// 🚀 Dynamic Slide Controls
document.getElementById('btn-prev-page').addEventListener('click', () => {
    if (currentSlide <= 1) return;
    saveCurrentPageInk();
    currentSlide--;
    renderSlide(currentSlide);
});

document.getElementById('btn-next-page').addEventListener('click', () => {
    if (currentSlide >= totalSlides) return;
    saveCurrentPageInk();
    currentSlide++;
    renderSlide(currentSlide);
});

document.getElementById('btn-add-blank').addEventListener('click', () => {
    saveCurrentPageInk();
    totalSlides++;
    
    // Shift all subsequent slides mapping forward
    for(let i = totalSlides; i > currentSlide + 1; i--) {
        slideMap[i] = slideMap[i - 1];
        pageInkMemory[i] = pageInkMemory[i - 1];
    }
    
    // Insert blank slide right after current
    currentSlide++;
    slideMap[currentSlide] = { type: 'blank' };
    pageInkMemory[currentSlide] = [];
    
    renderSlide(currentSlide);
});

document.getElementById('btn-close-pdf').addEventListener('click', () => {
    if(confirm("Close presentation? All slide ink will be lost.")) {
        pdfDoc = null;
        totalSlides = 0;
        currentSlide = 1;
        slideMap = {};
        pageInkMemory = {};
        pdfNav.classList.replace('flex', 'hidden');
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        document.getElementById('slide-upload').value = ''; // Reset file input
    }
});

// Basic Controls
document.getElementById('pen-color').addEventListener('input', (e) => {
    if (currentMode === 'highlight') {
        canvas.freeDrawingBrush.color = hexToRgba(e.target.value, 0.4);
    } else if (currentMode !== 'laser') {
        canvas.freeDrawingBrush.color = e.target.value;
    }
});

document.getElementById('pen-width').addEventListener('input', (e) => {
    let w = parseInt(e.target.value, 10);
    if (currentMode === 'highlight') {
        canvas.freeDrawingBrush.width = w * 4;
    } else if (currentMode !== 'laser') {
        canvas.freeDrawingBrush.width = w;
    }
});

document.getElementById('btn-clear').addEventListener('click', () => {
    if(confirm("Clear the entire board?")) {
        const objects = canvas.getObjects();
        objects.forEach(obj => { if (obj.type === 'path') canvas.remove(obj); });
        saveHistory();
    }
});

// =====================================
// FULLSCREEN TOGGLE & FLOATING WEBCAM
// =====================================
const rightPanel = document.getElementById('right-panel');
const toggleBtn = document.getElementById('btn-toggle-panel');
const toggleIcon = toggleBtn.querySelector('i');
const webcamContainer = document.getElementById('webcam-container');
const webcamPlaceholder = document.getElementById('webcam-placeholder');

let isFullscreen = false;
let isDraggingCam = false;
let camOffsetX = 0, camOffsetY = 0;

toggleBtn.addEventListener('click', () => {
    isFullscreen = !isFullscreen;
    
    if (isFullscreen) {
        // 1. Hide Panel Instantly
        rightPanel.style.display = 'none';
        toggleIcon.classList.replace('fa-expand', 'fa-compress');
        
        // 2. Detach Webcam & Apply Floating Classes
        document.body.appendChild(webcamContainer);
        webcamContainer.className = 'absolute z-50 shadow-2xl rounded-2xl overflow-hidden cursor-grab border border-slate-700 bg-slate-900 flex flex-col items-center justify-center text-slate-500 select-none';
        webcamContainer.style.width = '340px';
        webcamContainer.style.height = '200px';
        webcamContainer.style.top = '20px'; 
        webcamContainer.style.right = '20px';
        webcamContainer.style.left = 'auto';
    } else {
        // 1. Show Panel Instantly
        rightPanel.style.display = '';
        toggleIcon.classList.replace('fa-compress', 'fa-expand');
        
        // 2. Snap Webcam Back & Hard-Reset Classes
        webcamPlaceholder.appendChild(webcamContainer);
        webcamContainer.className = 'h-full w-full bg-slate-900 flex flex-col items-center justify-center text-slate-500 select-none';
        webcamContainer.removeAttribute('style'); // Clears all dragging coordinates
    }
    
    // 3. Give the browser exact time to reflow the DOM before snapping canvas
    setTimeout(() => {
        canvas.setWidth(wrapper.clientWidth);
        canvas.setHeight(wrapper.clientHeight);
        canvas.renderAll();
    }, 50);
});

// Dragging Logic
webcamContainer.addEventListener('mousedown', (e) => {
    if (!isFullscreen) return; 
    isDraggingCam = true;
    camOffsetX = e.clientX - webcamContainer.getBoundingClientRect().left;
    camOffsetY = e.clientY - webcamContainer.getBoundingClientRect().top;
    webcamContainer.classList.replace('cursor-grab', 'cursor-grabbing');
});

window.addEventListener('mousemove', (e) => {
    if (!isDraggingCam) return;
    webcamContainer.style.left = (e.clientX - camOffsetX) + 'px';
    webcamContainer.style.top = (e.clientY - camOffsetY) + 'px';
    webcamContainer.style.right = 'auto'; 
});

window.addEventListener('mouseup', () => {
    if (!isDraggingCam) return;
    isDraggingCam = false;
    webcamContainer.classList.replace('cursor-grabbing', 'cursor-grab');
});

// =====================================
// DARK MODE, WEBRTC & LOCAL HD RECORDER
// =====================================

// 1. Dark Mode Toggle & Bidirectional PWOS Sync
const btnTheme = document.getElementById('btn-theme');

window.applySlateTheme = function(forceTheme, broadcast = false) {
    let isDark;
    if (forceTheme) {
        if (forceTheme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        isDark = (forceTheme === 'dark');
    } else {
        document.documentElement.classList.toggle('dark');
        isDark = document.documentElement.classList.contains('dark');
    }

    const currentTheme = isDark ? 'dark' : 'light';
    btnTheme.innerHTML = isDark ? '<i class="fa-solid fa-sun text-lg"></i>' : '<i class="fa-solid fa-moon text-lg"></i>';
    
    // Update Canvas background
    canvas.backgroundColor = isDark ? '#0f172a' : '#ffffff';
    
    // Smart Ink Toggle
    const currentColor = canvas.freeDrawingBrush.color.toLowerCase();
    if (isDark && currentColor === '#0f172a') {
        canvas.freeDrawingBrush.color = '#ffffff';
        document.getElementById('pen-color').value = '#ffffff';
    } else if (!isDark && currentColor === '#ffffff') {
        canvas.freeDrawingBrush.color = '#0f172a';
        document.getElementById('pen-color').value = '#0f172a';
    }

    // Update blank slide rectangles
    canvas.getObjects().forEach(obj => {
        if (obj.isSlide && obj.type === 'rect') {
            obj.set('fill', isDark ? '#1e293b' : '#ffffff');
        }
    });
    canvas.renderAll();

    // Broadcast to Parent PWOS if initiated from inside Slate
    if (broadcast && window.parent !== window) {
        window.parent.postMessage({ type: 'SYNC_THEME', theme: currentTheme }, '*');
    }
};

// Click Listener for the Theme Button
btnTheme.addEventListener('click', () => {
    window.applySlateTheme(null, true); // true = broadcast to parent
});

// Listen for Theme Sync from Parent PWOS
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SYNC_THEME') {
        const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        if (currentTheme !== event.data.theme) {
            window.applySlateTheme(event.data.theme, false); // false = don't bounce back
        }
    }
});

// Initial Load Check (Fallback memory)
if (localStorage.getItem('theme') === 'dark') {
    window.applySlateTheme('dark', false);
}

// 2. WebRTC Camera Initialization
let localStream = null;
const btnStartCam = document.getElementById('btn-start-cam');
const liveVideo = document.getElementById('live-video');
const camOfflineUI = document.getElementById('cam-offline-ui');
const liveBadge = document.getElementById('live-badge');

btnStartCam.addEventListener('click', async () => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true });
        liveVideo.srcObject = localStream;
        camOfflineUI.classList.add('hidden');
        liveVideo.classList.remove('hidden');
        liveBadge.classList.remove('hidden');
    } catch (err) {
        alert("Camera access denied or device not found.");
        console.error(err);
    }
});

// 3. HD Local Screen Recorder (1080p Hidden Merge Engine)
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let animationFrameId;

const btnRecord = document.getElementById('btn-record');
const recordIcon = btnRecord.querySelector('i');

// The invisible 1080p canvas for final video render
const offscreenCanvas = document.createElement('canvas');
offscreenCanvas.width = 1920;
offscreenCanvas.height = 1080;
const offCtx = offscreenCanvas.getContext('2d');

function drawFrame() {
    if (!isRecording) return;
    
    // Fill background (Dark Mode Support)
    offCtx.fillStyle = document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff';
    offCtx.fillRect(0, 0, 1920, 1080);
    
    // 🚀 THE FIX: Draw BOTH canvases (Lower for saved objects, Upper for live pen strokes)
    const lowerCanvas = canvas.getElement();
    const upperCanvas = canvas.upperCanvasEl;
    
    // Paint Base Layer
    offCtx.drawImage(lowerCanvas, 0, 0, 1920, 1080);
    // Paint Live Ink Layer on top
    if (upperCanvas) {
        offCtx.drawImage(upperCanvas, 0, 0, 1920, 1080);
    }

    // Draw Webcam PiP (Picture-in-Picture)
    if (localStream && liveVideo.videoWidth > 0) {
        const camW = 400;
        const camH = (liveVideo.videoHeight / liveVideo.videoWidth) * camW;
        const pad = 30;
        
        offCtx.save();
        offCtx.translate(1920 - pad, pad + camH);
        offCtx.scale(-1, 1);
        offCtx.drawImage(liveVideo, 0, -camH, camW, camH);
        offCtx.restore();
        
        offCtx.strokeStyle = '#cbd5e1';
        offCtx.lineWidth = 4;
        offCtx.strokeRect(1920 - pad - camW, pad, camW, camH);
    }

    animationFrameId = requestAnimationFrame(drawFrame);
}

btnRecord.addEventListener('click', () => {
    if (!isRecording) {
        isRecording = true;
        recordedChunks = [];
        recordIcon.classList.replace('text-rose-500', 'text-emerald-500');
        btnRecord.classList.add('animate-pulse');

        const canvasStream = offscreenCanvas.captureStream(30);
        
        if (localStream && localStream.getAudioTracks().length > 0) {
            canvasStream.addTrack(localStream.getAudioTracks()[0]);
        }

        // 🚀 SMART FORMAT DETECTOR
        let options = { mimeType: 'video/webm; codecs=vp9' };
        let ext = 'webm';
        
        if (MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.424028, mp4a.40.2"')) {
            options = { mimeType: 'video/mp4; codecs="avc1.424028, mp4a.40.2"' };
            ext = 'mp4';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
            options = { mimeType: 'video/mp4' };
            ext = 'mp4';
        }

        mediaRecorder = new MediaRecorder(canvasStream, options);
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
            // Save file with dynamic extension
            const blob = new Blob(recordedChunks, { type: options.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Lin_Academy_Lecture_${new Date().getTime()}.${ext}`;
            a.click();
            URL.revokeObjectURL(url);
        };
        
        drawFrame(); 
        mediaRecorder.start();
        
    } else {
        isRecording = false;
        recordIcon.classList.replace('text-emerald-500', 'text-rose-500');
        btnRecord.classList.remove('animate-pulse');
        cancelAnimationFrame(animationFrameId);
        mediaRecorder.stop();
    }
});

// =====================================
// TYPOGRAPHY & TEXT ENGINE
// =====================================

let isTextMode = false;
let activeTextObject = null;

const btnText = document.getElementById('btn-text');
const textToolbar = document.getElementById('text-format-toolbar');
const mathGrid = document.getElementById('math-symbols-grid');

// 1. Text Mode Toggle
btnText.addEventListener('click', () => {
    isTextMode = true;
    canvas.isDrawingMode = false;
    
    // UI Feedback for Active Tool
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('bg-blue-50', 'dark:bg-blue-900/30', 'text-brand-blue', 'dark:text-blue-400'));
    btnText.classList.add('bg-blue-50', 'dark:bg-blue-900/30', 'text-brand-blue', 'dark:text-blue-400');
});

// 2. Click to Add Text
canvas.on('mouse:down', function(options) {
    if (isTextMode && !options.target) {
        const pointer = canvas.getPointer(options.e);
        const isDark = document.documentElement.classList.contains('dark');
        
        const text = new fabric.IText('Type here...', {
            left: pointer.x,
            top: pointer.y,
            fontFamily: 'sans-serif',
            fill: document.getElementById('fmt-color').value || (isDark ? '#ffffff' : '#0f172a'),
            fontSize: parseInt(document.getElementById('fmt-size').value) || 24,
            fontWeight: 'normal',
            fontStyle: 'normal',
            underline: false,
            cursorColor: isDark ? '#ffffff' : '#0f172a'
        });
        
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        canvas.renderAll();
        
        // Auto-switch back to Select Mode after placing text
        isTextMode = false;
        document.getElementById('btn-select').click();
    }
});

// 3. Floating Toolbar Logic (Show/Hide based on selection)
canvas.on('selection:created', handleSelection);
canvas.on('selection:updated', handleSelection);
canvas.on('selection:cleared', () => {
    activeTextObject = null;
    textToolbar.classList.add('hidden');
    mathGrid.classList.add('hidden');
});

function handleSelection(options) {
    const obj = options.selected[0];
    if (obj && obj.type === 'i-text') {
        activeTextObject = obj;
        
        // Sync toolbar values with the selected text object
        document.getElementById('fmt-size').value = obj.fontSize;
        document.getElementById('fmt-color').value = obj.fill;
        
        // Show Toolbar near the text
        textToolbar.classList.remove('hidden');
        textToolbar.classList.add('flex');
    } else {
        activeTextObject = null;
        textToolbar.classList.add('hidden');
        textToolbar.classList.remove('flex');
        mathGrid.classList.add('hidden');
    }
}

// 4. Formatting Controls
document.getElementById('fmt-bold').addEventListener('click', () => {
    if (!activeTextObject) return;
    const isBold = activeTextObject.fontWeight === 'bold';
    activeTextObject.set('fontWeight', isBold ? 'normal' : 'bold');
    canvas.renderAll();
});

document.getElementById('fmt-italic').addEventListener('click', () => {
    if (!activeTextObject) return;
    const isItalic = activeTextObject.fontStyle === 'italic';
    activeTextObject.set('fontStyle', isItalic ? 'normal' : 'italic');
    canvas.renderAll();
});

document.getElementById('fmt-underline').addEventListener('click', () => {
    if (!activeTextObject) return;
    const isUnderlined = activeTextObject.underline;
    activeTextObject.set('underline', !isUnderlined);
    canvas.renderAll();
});

document.getElementById('fmt-size').addEventListener('input', (e) => {
    if (!activeTextObject) return;
    activeTextObject.set('fontSize', parseInt(e.target.value));
    canvas.renderAll();
});

document.getElementById('fmt-color').addEventListener('input', (e) => {
    if (!activeTextObject) return;
    activeTextObject.set('fill', e.target.value);
    canvas.renderAll();
});

// 5. Math Symbols Grid Toggle & Insertion
document.getElementById('fmt-math').addEventListener('click', (e) => {
    if (mathGrid.classList.contains('hidden')) {
        // Position grid below the math button
        const btnRect = e.target.getBoundingClientRect();
        mathGrid.style.top = `${btnRect.bottom + 10}px`;
        mathGrid.style.left = `${btnRect.left}px`;
        mathGrid.classList.remove('hidden');
    } else {
        mathGrid.classList.add('hidden');
    }
});

document.querySelectorAll('.math-sym-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (!activeTextObject) return;
        const symbol = e.target.innerText;
        
        if (activeTextObject.isEditing) {
            activeTextObject.insertChars(symbol);
        } else {
            activeTextObject.set('text', activeTextObject.text + symbol);
        }
        
        canvas.renderAll();
        mathGrid.classList.add('hidden');
    });
});

// 6. Delete Button in Toolbar
document.getElementById('fmt-delete').addEventListener('click', () => {
    if (activeTextObject) {
        canvas.remove(activeTextObject);
        canvas.discardActiveObject();
        canvas.renderAll();
    }
});

// 7. Auto-Remove Empty Text Boxes
canvas.on('text:editing:exited', function(e) {
    if (e.target.text.trim() === '') {
        canvas.remove(e.target);
        canvas.renderAll();
    }
});

// 8. Keyboard Delete/Backspace Support
window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObj = canvas.getActiveObject();
        // Ensure we don't delete the box if the user is actively typing inside it
        if (activeObj && !activeObj.isEditing) {
            canvas.remove(activeObj);
            canvas.discardActiveObject();
            canvas.renderAll();
        }
    }
});

// =====================================
// NATIVE DRAG & DROP (IMAGE DROPPER)
// =====================================
const dropZone = document.getElementById('canvas-wrapper');

// 1. Visual feedback when hovering with a file
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('ring-4', 'ring-brand-blue', 'ring-inset');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('ring-4', 'ring-brand-blue', 'ring-inset');
});

// 2. Handle the dropped image
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('ring-4', 'ring-brand-blue', 'ring-inset');

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (!file.type.match('image.*')) {
        alert('Please drop a valid image file (PNG, JPG, SVG).');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(f) {
        const data = f.target.result;
        fabric.Image.fromURL(data, function(img) {
            // Smart Scaling: Ensure image isn't too huge for the canvas
            const maxDim = wrapper.clientWidth * 0.4;
            if (img.width > maxDim || img.height > maxDim) {
                const scale = Math.min(maxDim / img.width, maxDim / img.height);
                img.scale(scale);
            }
            
            // Calculate exact drop coordinates relative to the canvas
            const rect = dropZone.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            img.set({
                left: x,
                top: y,
                originX: 'center',
                originY: 'center',
                cornerColor: '#2563eb',
                cornerStrokeColor: '#2563eb',
                borderColor: '#2563eb',
                cornerSize: 12,
                transparentCorners: false
            });

            canvas.add(img);
            canvas.setActiveObject(img);
            
            // Auto-switch to select mode so the educator can resize it immediately
            document.getElementById('btn-select').click();
            saveHistory();
        });
    };
    reader.readAsDataURL(file);
});

// =====================================
// EDUCATOR TOOLKIT (SHAPES & ASSETS)
// =====================================

const btnShapes = document.getElementById('btn-shapes');
const assetMenu = document.getElementById('asset-library-menu');

// 1. Toggle Asset Library Menu
btnShapes.addEventListener('click', (e) => {
    if (assetMenu.classList.contains('hidden')) {
        // Position menu below the button
        const btnRect = e.target.closest('button').getBoundingClientRect();
        assetMenu.style.top = `${btnRect.bottom + 10}px`;
        assetMenu.classList.remove('hidden');
    } else {
        assetMenu.classList.add('hidden');
    }
});

// Close menu if clicked outside
document.addEventListener('click', (e) => {
    if (!assetMenu.contains(e.target) && !btnShapes.contains(e.target)) {
        assetMenu.classList.add('hidden');
    }
});

// 2. Logic to Generate Shapes
document.querySelectorAll('.asset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const shapeType = e.currentTarget.getAttribute('data-shape');
        const isDark = document.documentElement.classList.contains('dark');
        
        // Define common properties for all shapes
        const strokeColor = isDark ? '#ffffff' : '#0f172a';
        const commonProps = {
            left: wrapper.clientWidth / 2,
            top: wrapper.clientHeight / 2,
            originX: 'center',
            originY: 'center',
            fill: 'transparent',
            stroke: strokeColor,
            strokeWidth: 3,
            cornerColor: '#2563eb',
            borderColor: '#2563eb',
            transparentCorners: false
        };

        let newObject = null;

        switch(shapeType) {
            case 'rect':
                newObject = new fabric.Rect({ ...commonProps, width: 150, height: 100 });
                break;
            case 'circle':
                newObject = new fabric.Circle({ ...commonProps, radius: 75 });
                break;
            case 'triangle':
                newObject = new fabric.Triangle({ ...commonProps, width: 150, height: 150 });
                break;
            case 'line':
                newObject = new fabric.Line([0, 0, 200, 0], { ...commonProps });
                break;
            case 'axis':
                // X and Y Coordinate Graph Axis
                const xAxis = new fabric.Line([-150, 0, 150, 0], { stroke: strokeColor, strokeWidth: 3 });
                const yAxis = new fabric.Line([0, -150, 0, 150], { stroke: strokeColor, strokeWidth: 3 });
                newObject = new fabric.Group([xAxis, yAxis], { ...commonProps });
                break;
            case 'benzene':
                // Proper Hexagonal Benzene Ring with inner circle
                const hexagon = new fabric.Polygon([
                    {x: 50, y: 0}, {x: 100, y: 28}, {x: 100, y: 86},
                    {x: 50, y: 115}, {x: 0, y: 86}, {x: 0, y: 28}
                ], { fill: 'transparent', stroke: strokeColor, strokeWidth: 3 });
                const innerCircle = new fabric.Circle({ radius: 35, left: 15, top: 22, fill: 'transparent', stroke: strokeColor, strokeWidth: 2 });
                newObject = new fabric.Group([hexagon, innerCircle], { ...commonProps });
                break;
            case 'resistor':
                // Physics zigzag resistor path
                newObject = new fabric.Path('M 0 50 L 20 50 L 30 20 L 50 80 L 70 20 L 90 80 L 100 50 L 120 50', { ...commonProps, fill: 'transparent', strokeLineJoin: 'round' });
                break;
            case 'battery':
                // Physics battery circuit symbol
                newObject = new fabric.Path('M 0 50 L 40 50 M 40 20 L 40 80 M 60 35 L 60 65 M 60 50 L 100 50', { ...commonProps, fill: 'transparent' });
                break;
            case 'beaker':
                // Chemistry Flask/Beaker
                newObject = new fabric.Path('M 30 0 L 70 0 M 40 0 L 40 40 L 10 100 Q 0 120 20 120 L 80 120 Q 100 120 90 100 L 60 40 L 60 0 M 15 90 L 85 90', { ...commonProps, fill: 'transparent', strokeLineJoin: 'round' });
                break;
            case 'cube':
                // 3D Cube using paths
                newObject = new fabric.Path('M 0 30 L 30 0 L 130 0 L 100 30 Z M 0 30 L 0 130 L 100 130 L 100 30 M 100 130 L 130 100 L 130 0 M 130 100 L 100 130', { ...commonProps, fill: 'transparent', strokeLineJoin: 'round' });
                break;
        }

        if (newObject) {
            canvas.add(newObject);
            canvas.setActiveObject(newObject);
            document.getElementById('btn-select').click();
            saveHistory();
        }
        
        assetMenu.classList.add('hidden'); // Auto-close menu after selecting
    });
});

// =====================================
// SLATE COMMAND CENTER & VAULT INTEGRATION
// =====================================
const btnMenu = document.getElementById('btn-menu');
const cmdMenu = document.getElementById('command-menu');
const renameInput = document.getElementById('menu-rename-input');

// Unique ID for the current session (generated on first load)
let currentFileId = 'slate_' + Date.now();
let currentFileName = "Untitled_Lecture";

// Check if Vault sent an existing File ID via URL parameters
const urlParams = new URLSearchParams(window.location.search);
const existingFileId = urlParams.get('fileId');

if (existingFileId) {
    currentFileId = existingFileId;
    // Request the Vault (parent window) to send the data for this ID
    window.parent.postMessage({ type: 'LOAD_SLATE_FILE', id: existingFileId }, '*');
}

// Listen for incoming data from Vault
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SLATE_DATA_LOADED') {
        const fileData = event.data.payload;
        if(fileData && fileData.jsonContent) {
            currentFileName = fileData.name;
            renameInput.value = currentFileName;
            
            // Turn off history tracking while loading to prevent history bugs
            isHistoryTracking = false; 
            canvas.loadFromJSON(fileData.jsonContent, function() {
                canvas.renderAll();
                isHistoryTracking = true;
                // Rebuild slide Map if needed
                canvasHistory = [JSON.stringify(canvas.toJSON(['isSlide']))];
                historyIndex = 0;
            });
        }
    }
});

// Toggle Menu
btnMenu.addEventListener('click', () => {
    cmdMenu.classList.contains('hidden') ? cmdMenu.classList.replace('hidden', 'flex') : cmdMenu.classList.replace('flex', 'hidden');
});
document.addEventListener('click', (e) => {
    if (!btnMenu.contains(e.target) && !cmdMenu.contains(e.target)) cmdMenu.classList.replace('flex', 'hidden');
});

// Live Rename Sync
renameInput.addEventListener('input', (e) => {
    currentFileName = e.target.value.trim() || "Untitled_Lecture";
});

// 1. Vault Save (Sends Data to Parent Window)
document.getElementById('menu-save').addEventListener('click', () => {
    cmdMenu.classList.replace('flex', 'hidden');
    
    // Create a low-res thumbnail for the Vault Grid
    const thumbnail = canvas.toDataURL({ format: 'jpeg', quality: 0.3, multiplier: 0.2 });
    const jsonContent = JSON.stringify(canvas.toJSON(['isSlide']));

    const filePayload = {
        id: currentFileId,
        name: currentFileName,
        jsonContent: jsonContent,
        thumbnail: thumbnail,
        timestamp: Date.now()
    };

    // If running inside the Vault iframe, send it up!
    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'SAVE_SLATE_FILE',
            payload: filePayload
        }, '*');
    } else {
        // Fallback if opened directly in browser without Vault
        const blob = new Blob([jsonContent], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentFileName}.slate`;
        a.click();
        URL.revokeObjectURL(url);
    }
});

// 2. Save As (Creates a new ID and saves)
document.getElementById('menu-save-as').addEventListener('click', () => {
    const newName = prompt("Enter new file name:", currentFileName);
    if (newName) {
        currentFileName = newName;
        renameInput.value = currentFileName;
        currentFileId = 'slate_' + Date.now(); // Generate new ID
        document.getElementById('menu-save').click(); 
    }
});

// 3. Export Annotated PDF
document.getElementById('menu-export-annotated').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 1.0, multiplier: 2 });
    pdf.addImage(dataUrl, 'JPEG', 0, 0, 297, 210);
    pdf.save(`${currentFileName}_Annotated.pdf`);
    cmdMenu.classList.replace('flex', 'hidden');
});

// 4. Export Original PDF (Placeholder)
document.getElementById('menu-export-original').addEventListener('click', () => {
    if (pdfDoc) {
        alert(`Original PDF extraction will be connected to the Vault backend.`);
    } else {
        alert("No background PDF currently loaded.");
    }
    cmdMenu.classList.replace('flex', 'hidden');
});

// 5. Share Link (Placeholder)
document.getElementById('menu-share').addEventListener('click', () => {
    alert(`Live Session Link for ${currentFileName} copied to clipboard!`);
    cmdMenu.classList.replace('flex', 'hidden');
});

// 6. Delete / Close File (Tells Vault to close the iframe)
document.getElementById('menu-delete').addEventListener('click', () => {
    if(confirm(`Close this session without saving?`)) {
        if (window.parent !== window) {
            window.parent.postMessage({ type: 'CLOSE_SLATE' }, '*');
        } else {
            canvas.clear();
            canvas.backgroundColor = document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff';
        }
    }
    cmdMenu.classList.replace('flex', 'hidden');
});

// =====================================
// PRESENTER'S TELEPROMPTER (PRIVATE NOTES)
// =====================================
let slideNotesMemory = {}; // 🧠 Stores notes per slide

const btnNotes = document.getElementById('btn-presenter-notes');
const notesWidget = document.getElementById('presenter-notes-widget');
const btnCloseNotes = document.getElementById('btn-close-notes');
const notesDragHandle = document.getElementById('notes-drag-handle');
const notesTextarea = document.getElementById('notes-textarea');
const notesSlideNum = document.getElementById('notes-slide-num');

// 1. Toggle Window
btnNotes.addEventListener('click', () => {
    notesWidget.classList.toggle('hidden');
    syncNotesUI();
});

btnCloseNotes.addEventListener('click', () => {
    notesWidget.classList.add('hidden');
});

// 2. Sync Logic (Save on type, restore on slide change)
notesTextarea.addEventListener('input', (e) => {
    slideNotesMemory[currentSlide] = e.target.value;
});

// 🚀 Add this line to the END of your existing `renderSlide(slideNum)` function manually:
// syncNotesUI(); 
function syncNotesUI() {
    notesSlideNum.textContent = currentSlide;
    notesTextarea.value = slideNotesMemory[currentSlide] || "";
}

// 3. Draggable Window Logic
let isDraggingNotes = false;
let notesOffsetX = 0, notesOffsetY = 0;

notesDragHandle.addEventListener('mousedown', (e) => {
    isDraggingNotes = true;
    notesOffsetX = e.clientX - notesWidget.getBoundingClientRect().left;
    notesOffsetY = e.clientY - notesWidget.getBoundingClientRect().top;
});

window.addEventListener('mousemove', (e) => {
    if (!isDraggingNotes) return;
    notesWidget.style.left = (e.clientX - notesOffsetX) + 'px';
    notesWidget.style.top = (e.clientY - notesOffsetY) + 'px';
    notesWidget.style.right = 'auto'; 
});

window.addEventListener('mouseup', () => {
    isDraggingNotes = false;
});