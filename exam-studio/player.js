// player.js - PWOS Exam Studio Student Engine

import { doc, getDoc, setDoc, collection, query, where, getCountFromServer } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "../firebase-config.js";

let state = {
    testId: null,
    courseName: null,
    settings: null,
    questions: [],
    userAnswers: [],
    currentQIndex: 0,
    timeRemaining: 0,
    timerInterval: null
};

// ==========================================
// 1. INITIALIZATION & DATA FETCHING
// ==========================================
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    state.testId = urlParams.get('testId');
    state.courseName = urlParams.get('course') ? decodeURIComponent(urlParams.get('course')) : 'Premium Course';
    
    document.getElementById('top-course-name').innerText = state.courseName;

    auth.onAuthStateChanged((user) => {
        if (user) {
            if (state.testId) {
                fetchTestData(state.testId);
            } else {
                alert("Invalid Test Link!");
                window.closePlayer();
            }
        } else {
            alert("Security Alert: You must be logged in to access this test.");
            // Safe fallback to main dashboard
            window.location.href = '../index.html';
        }
    });

    // Dark Mode init
    if (localStorage.getItem('theme') === 'dark' || document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.add('dark');
        document.getElementById('btn-theme').innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
});

async function fetchTestData(testId) {
    try {
        // 🚀 THE FIX: Sirf public 'exams' collection se fetch karo!
        const examSnap = await getDoc(doc(db, "exams", testId));

        if (examSnap.exists()) {
            const data = examSnap.data();
            state.settings = data.settings;
            state.questions = data.questions || [];
            state.userAnswers = new Array(state.questions.length).fill(null);
            state.timeRemaining = (state.settings.totalTimeInMinutes || 0) * 60;
            
            // Populate Intro Screen
            document.getElementById('intro-title').innerText = state.settings.testTitle;
            document.getElementById('top-test-name').innerText = state.settings.testTitle;
            document.getElementById('intro-qs').innerText = state.questions.length;
            document.getElementById('intro-time').innerText = state.settings.totalTimeInMinutes;
            document.getElementById('intro-pos').innerText = "+" + state.settings.marksForCorrectAnswer;
            document.getElementById('intro-neg').innerText = "-" + state.settings.marksForWrongAnswer;
            
            const btnStart = document.getElementById('btn-start-test');
            btnStart.disabled = false;
            document.getElementById('start-test-text').innerText = "Begin Assessment";
        } else {
            alert("Test not found or has been removed by the educator.");
            window.closePlayer();
        }
    } catch (e) {
        console.error("Failed to fetch test:", e);
        document.getElementById('intro-title').innerText = "Network Error";
        document.getElementById('start-test-text').innerText = "Cannot Load Data";
    }
}

window.showScreen = function(screenName) {
    ['intro', 'active', 'result', 'review'].forEach(id => {
        document.getElementById(`screen-${id}`).classList.add('hidden');
        document.getElementById(`screen-${id}`).classList.remove('flex');
    });
    document.getElementById(`screen-${screenName}`).classList.remove('hidden');
    document.getElementById(`screen-${screenName}`).classList.add('flex');
    window.scrollTo(0, 0);
}

// ==========================================
// 2. EXAM ENGINE (TIMER & PALETTE)
// ==========================================
window.startExam = function() {
    window.showScreen('active');
    document.getElementById('exam-timer-display').classList.remove('hidden');
    
    buildQuestionPalette();
    renderQuestion(0);
    startTimer();
}

function startTimer() {
    const timeText = document.getElementById('exam-time-text');
    const timerDisplay = document.getElementById('exam-timer-display');
    const icon = document.getElementById('exam-clock-icon');

    state.timerInterval = setInterval(() => {
        let tr = state.timeRemaining;
        let m = parseInt(tr / 60, 10); let s = parseInt(tr % 60, 10);
        m = m < 10 ? "0" + m : m; s = s < 10 ? "0" + s : s;
        timeText.textContent = m + ":" + s;

        // Warning state
        if(tr <= 60) {
            timerDisplay.classList.replace('bg-slate-100', 'bg-rose-50');
            timerDisplay.classList.replace('dark:bg-slate-800', 'dark:bg-rose-900/30');
            timerDisplay.classList.replace('border-slate-200', 'border-rose-200');
            timerDisplay.classList.replace('dark:border-slate-700', 'dark:border-rose-800/50');
            timeText.classList.replace('text-slate-700', 'text-rose-600');
            timeText.classList.replace('dark:text-white', 'dark:text-rose-400');
            icon.classList.replace('text-slate-400', 'text-rose-500');
            icon.classList.add('animate-pulse');
        }

        if (--state.timeRemaining < 0) {
            clearInterval(state.timerInterval);
            triggerTimeOut();
        }
    }, 1000);
}

function triggerTimeOut() {
    const overlay = document.getElementById('timeout-overlay');
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.remove('opacity-0'), 50);
    
    setTimeout(() => {
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 500);
        evaluateExam();
    }, 3000);
}

// ==========================================
// 3. RENDER LOGIC
// ==========================================
function renderQuestion(index) {
    state.currentQIndex = index;
    const q = state.questions[index];
    
    document.getElementById('active-q-number').innerText = `Question ${index + 1}`;
    document.getElementById('active-q-marks').innerText = `+${state.settings.marksForCorrectAnswer} / -${state.settings.marksForWrongAnswer}`;
    
    // Set Question Text
    document.getElementById('active-q-text').innerHTML = q.question;
    
    // Set Options
    const optContainer = document.getElementById('active-options-container');
    optContainer.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];
    
    q.options.forEach((opt, optIndex) => {
        const isChecked = state.userAnswers[index] === optIndex ? "checked" : "";
        optContainer.innerHTML += `
            <label class="relative block cursor-pointer group">
                <input type="radio" name="exam-option" class="peer sr-only" value="${optIndex}" onchange="window.selectOption(${index}, ${optIndex})" ${isChecked}>
                <div class="border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4 lg:p-5 bg-white dark:bg-slate-800 transition-all hover:border-brand-blue flex items-center gap-4 shadow-sm group-hover:shadow-md">
                    <div class="radio-circle shrink-0 w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center transition-colors bg-slate-50 dark:bg-slate-900">
                        <div class="w-2.5 h-2.5 rounded-full bg-white dark:bg-slate-900"></div>
                    </div>
                    <div class="font-bold text-slate-400 dark:text-slate-500 w-4">${letters[optIndex]}</div>
                    <span class="text-slate-700 dark:text-slate-300 font-medium text-sm lg:text-base">${opt}</span>
                </div>
            </label>
        `;
    });

    // Update Progress Bar
    const progress = ((index + 1) / state.questions.length) * 100;
    document.getElementById('mobile-progress-bar').style.width = `${progress}%`;

    // Button States
    document.getElementById('btn-prev').disabled = (index === 0);
    
    if (index === state.questions.length - 1) {
        document.getElementById('btn-next').classList.add('hidden');
        document.getElementById('btn-submit').classList.remove('hidden');
    } else {
        document.getElementById('btn-next').classList.remove('hidden');
        document.getElementById('btn-submit').classList.add('hidden');
    }

    updatePaletteSelection();
}

window.selectOption = function(qIndex, optIndex) {
    state.userAnswers[qIndex] = optIndex;
    updatePaletteSelection();
}

window.nextQuestion = function() {
    if (state.currentQIndex < state.questions.length - 1) renderQuestion(state.currentQIndex + 1);
}

window.prevQuestion = function() {
    if (state.currentQIndex > 0) renderQuestion(state.currentQIndex - 1);
}

window.jumpToQuestion = function(index) {
    renderQuestion(index);
    document.getElementById('mobile-palette-modal').classList.add('hidden');
}

function buildQuestionPalette() {
    let html = '';
    for(let i = 0; i < state.questions.length; i++) {
        html += `<button id="pal-${i}" onclick="window.jumpToQuestion(${i})" class="w-full aspect-square rounded-xl text-xs lg:text-sm font-bold border-2 transition-all flex items-center justify-center border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-brand-blue">${i + 1}</button>`;
    }
    document.getElementById('desktop-palette-grid').innerHTML = html;
    document.getElementById('mobile-palette-grid').innerHTML = html;
}

function updatePaletteSelection() {
    for(let i = 0; i < state.questions.length; i++) {
        const isAnswered = state.userAnswers[i] !== null;
        const isActive = state.currentQIndex === i;
        
        ['desktop-palette-grid', 'mobile-palette-grid'].forEach(gridId => {
            const btn = document.getElementById(gridId).querySelector(`#pal-${i}`);
            if(!btn) return;
            
            // Reset classes
            btn.className = "w-full aspect-square rounded-xl text-xs lg:text-sm font-bold border-2 transition-all flex items-center justify-center";
            
            if (isAnswered && isActive) btn.classList.add('bg-brand-blue', 'text-white', 'border-brand-blue', 'shadow-[0_0_10px_rgba(37,99,235,0.5)]');
            else if (isAnswered) btn.classList.add('bg-brand-blue', 'text-white', 'border-brand-blue');
            else if (isActive) btn.classList.add('bg-blue-50', 'dark:bg-blue-900/30', 'text-brand-blue', 'dark:text-blue-400', 'border-brand-blue');
            else btn.classList.add('bg-white', 'dark:bg-slate-800', 'text-slate-500', 'border-slate-200', 'dark:border-slate-700', 'hover:border-brand-blue');
        });
    }
}

// ==========================================
// 4. EVALUATION & FIREBASE UPLOAD
// ==========================================
window.confirmSubmit = function() {
    let unanswered = state.userAnswers.filter(a => a === null).length;
    let msg = unanswered > 0 ? `You have ${unanswered} unanswered questions. Are you sure you want to submit?` : "Ready to submit your test?";
    
    if(confirm(msg)) {
        clearInterval(state.timerInterval);
        evaluateExam();
    }
}

async function evaluateExam() {
    document.getElementById('exam-timer-display').classList.add('hidden');
    
    let correct = 0; let wrong = 0; let skipped = 0;

    for (let i = 0; i < state.questions.length; i++) {
        if (state.userAnswers[i] === null) skipped++;
        else if (state.userAnswers[i] === state.questions[i].correctAnswerIndex) correct++;
        else wrong++;
    }

    const totalScore = (correct * state.settings.marksForCorrectAnswer) - (wrong * state.settings.marksForWrongAnswer);
    const maxScore = state.questions.length * state.settings.marksForCorrectAnswer;
    const pct = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // 🚀 FIREBASE SYNC: Save Performance directly to public performance ledger
    if (auth.currentUser) {
        try {
            // One Student, One Rank Logic (UserId + TestId)
            const perfRef = doc(db, "student_performance", auth.currentUser.uid + "_" + state.testId);
            await setDoc(perfRef, {
                userId: auth.currentUser.uid,
                userName: auth.currentUser.displayName || "Student",
                userPhoto: auth.currentUser.photoURL || "",
                testId: state.testId,
                testTitle: state.settings.testTitle,
                score: totalScore,
                maxScore: maxScore,
                percentage: pct,
                timestamp: new Date().toISOString()
            });

            // Calculate Rank asynchronously
            calculateMyRank(totalScore, state.testId);
        } catch(e) { console.error("Performance sync failed", e); }
    }

    renderResultsUI(totalScore, maxScore, pct, correct, wrong, skipped);
    window.showScreen('result');
}

async function calculateMyRank(myScore, testId) {
    try {
        const perfCol = collection(db, "student_performance");
        
        // 1. Total Students
        const totalQuery = query(perfCol, where("testId", "==", testId));
        const totalSnap = await getCountFromServer(totalQuery);
        const totalStudents = totalSnap.data().count;
        
        // 2. Students who scored higher
        const higherQuery = query(perfCol, where("testId", "==", testId), where("score", ">", myScore));
        const higherSnap = await getCountFromServer(higherQuery);
        const higherStudents = higherSnap.data().count;
        
        const myRank = higherStudents + 1;
        const myPercentile = totalStudents > 1 ? ((totalStudents - myRank) / totalStudents) * 100 : 100;
        
        document.getElementById('res-rank').innerText = `${myRank} / ${totalStudents}`;
        document.getElementById('res-perc').innerText = `${myPercentile.toFixed(1)}%`;
    } catch (e) {
        console.error("Rank calculation error:", e);
        document.getElementById('res-rank').innerText = "N/A";
        document.getElementById('res-perc').innerText = "N/A";
    }
}

function renderResultsUI(score, max, pct, c, w, s) {
    document.getElementById('res-score').innerText = score.toFixed(2);
    document.getElementById('res-max').innerText = max.toFixed(2);
    document.getElementById('res-correct').innerText = c;
    document.getElementById('res-wrong').innerText = w;
    document.getElementById('res-skip').innerText = s;

    const avatar = document.getElementById('result-avatar');
    const status = document.getElementById('result-status');
    const msg = document.getElementById('result-msg');
    const headerBg = status.parentElement;

    // Reset styles
    headerBg.className = "pt-8 pb-16 px-4 text-center rounded-b-[3rem] shadow-md relative overflow-hidden";
    
    if (pct >= state.settings.passPercentage) {
        headerBg.classList.add('bg-emerald-500', 'border-b', 'border-emerald-700');
        status.innerText = "Exam Cleared!";
        avatar.innerText = "🐴🎉";
        msg.innerText = "Hee-haw! Congratulations! You successfully crossed the target line. Outstanding performance!";
    } else {
        headerBg.classList.add('bg-rose-500', 'border-b', 'border-rose-700');
        status.innerText = "Failed!";
        avatar.innerText = "🐴🤣";
        msg.innerText = "Hee-haw! That was a disaster! You fell short of the pass mark. Review your mistakes and try again!";
    }
}

// ==========================================
// 5. REVIEW SCREEN ENGINE
// ==========================================
window.buildReviewScreen = function() {
    window.showScreen('review');
    const container = document.getElementById('review-container');
    container.innerHTML = '';
    
    const letters = ['A', 'B', 'C', 'D'];

    state.questions.forEach((q, index) => {
        const userAns = state.userAnswers[index];
        const correctAns = q.correctAnswerIndex;
        
        let badgeHtml = '';
        if (userAns === null) badgeHtml = `<span class="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] lg:text-xs font-bold px-3 py-1 rounded-md uppercase">Skipped</span>`;
        else if (userAns === correctAns) badgeHtml = `<span class="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] lg:text-xs font-bold px-3 py-1 rounded-md uppercase">Correct</span>`;
        else badgeHtml = `<span class="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-[10px] lg:text-xs font-bold px-3 py-1 rounded-md uppercase">Incorrect</span>`;

        let optionsHtml = '';
        q.options.forEach((opt, optIndex) => {
            let borderClass = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60';
            let circleClass = 'border-slate-300 dark:border-slate-600';
            let dotClass = 'bg-transparent';
            
            if (optIndex === correctAns) {
                borderClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 opacity-100';
                circleClass = 'border-emerald-500 bg-emerald-500';
                dotClass = 'bg-white';
            } else if (optIndex === userAns && userAns !== correctAns) {
                borderClass = 'border-rose-400 bg-rose-50 dark:bg-rose-900/20 opacity-100';
                circleClass = 'border-rose-400 bg-rose-400';
                dotClass = 'bg-white';
            }
            
            optionsHtml += `
                <div class="border-2 ${borderClass} rounded-xl p-3 lg:p-4 flex items-center gap-4 mb-3 transition-all">
                    <div class="shrink-0 w-5 h-5 rounded-full border-2 ${circleClass} flex items-center justify-center"><div class="w-2.5 h-2.5 rounded-full ${dotClass}"></div></div>
                    <div class="font-bold text-slate-400 dark:text-slate-500 w-4">${letters[optIndex]}</div>
                    <span class="text-slate-700 dark:text-slate-300 font-medium text-xs lg:text-sm">${opt}</span>
                </div>`;
        });

        container.innerHTML += `
            <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div class="p-5 lg:p-8">
                    <div class="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <span class="text-[10px] lg:text-xs font-extrabold text-brand-blue uppercase bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg">Question ${index + 1}</span>
                        ${badgeHtml}
                    </div>
                    <div class="question-content text-sm lg:text-base font-semibold text-slate-900 dark:text-white mb-6">${q.question}</div>
                    <div class="mb-6">${optionsHtml}</div>
                    <div class="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-2xl p-4 lg:p-5 mt-6">
                        <h4 class="text-[10px] lg:text-xs font-bold text-amber-600 dark:text-amber-500 mb-3 uppercase tracking-widest"><i class="fa-solid fa-lightbulb mr-1.5"></i> Step-by-Step Solution</h4>
                        <div class="question-content text-xs lg:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">${q.explanation || '<p class="italic text-slate-400">No explanation provided by educator.</p>'}</div>
                    </div>
                </div>
            </div>`;
    });
}

// ==========================================
// 6. UTILITIES
// ==========================================
document.getElementById('btn-theme').addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('btn-theme').innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
});

window.closePlayer = function() {
    if(confirm("Exit the test player? Any unsaved progress will be lost.")) {
        // Because it was launched from Course View via `window.location.href`
        // We will just redirect them back
        window.location.href = '../index.html'; 
    }
}