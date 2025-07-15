// const scriptUrl = "https://script.google.com/macros/s/AKfycbwgjQgJtz4lRwvSlVEYdkYZKGwcoXNPR1k9EePnHchRlsZ2-Rj0rJQJYTV5jJIMfLUOuw/exec";

const scriptUrl = "https://script.google.com/macros/s/AKfycbwgjQgJtz4lRwvSlVEYdkYZKGwcoXNPR1k9EePnHchRlsZ2-Rj0rJQJYTV5jJIMfLUOuw/exec";
const userID = localStorage.getItem('puffTrackerUserID');
const token = localStorage.getItem('puffTrackerToken');
const nickname = localStorage.getItem('puffTrackerNickname');
const email = localStorage.getItem('puffTrackerEmail');

// --- AUTHENTICATION CHECK ---
if (!userID || !token || !nickname || !email) {
    window.location.href = 'login.html';
}

let dailyTrendChart;
let timeSinceLastInterval;

// --- HELPER FUNCTIONS ---
function getLocalISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLiveInterval(ms) {
    if (isNaN(ms) || ms < 0) return "--";
    let totalSeconds = Math.floor(ms / 1000);
    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;
    minutes = String(minutes).padStart(2, "0");
    seconds = String(seconds).padStart(2, "0");
    return `${hours}h ${minutes}m ${seconds}s`;
}

function formatStreakInterval(ms) {
    if (!ms || ms <= 0) return "--";
    let totalMinutes = Math.floor(ms / (1000 * 60));
    let totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    let result = "";
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h`;
    return result.trim() === "" ? "<1h" : result.trim();
}

function calculateLongestStreak(data) {
    if (data.length < 2) return "--";
    const timestamps = data.map(entry => new Date(entry.timestamp)).sort((a, b) => a - b);
    let longestStreakMs = 0;
    for (let i = 1; i < timestamps.length; i++) {
        if (!isNaN(timestamps[i]) && !isNaN(timestamps[i-1])) {
            const interval = timestamps[i] - timestamps[i - 1];
            if (interval > longestStreakMs) {
                longestStreakMs = interval;
            }
        }
    }
    return formatStreakInterval(longestStreakMs);
}

function calculateBestDay(data) {
    if (data.length === 0) return "--";
    const dailyCounts = {};
    data.forEach(entry => {
        dailyCounts[entry.entryDate] = (dailyCounts[entry.entryDate] || 0) + parseInt(entry.count);
    });
    let bestDayDate = null;
    let minCount = Infinity;
    for (const date in dailyCounts) {
        if (dailyCounts[date] > 0 && dailyCounts[date] < minCount) {
            minCount = dailyCounts[date];
            bestDayDate = date;
        }
    }
    if (bestDayDate) {
        const dayName = new Date(bestDayDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
        return `${minCount} on ${dayName}`;
    }
    return "--";
}

function calculateTodaysInterval(data) { const todayStr = getLocalISODate(); const todaysEntries = data.filter(entry => entry.entryDate === todayStr && entry.timestamp); if (todaysEntries.length < 2) { return "--"; } const totalCigsToday = todaysEntries.reduce((sum, entry) => sum + parseInt(entry.count), 0); if (totalCigsToday < 2) { return "--"; } const timestamps = todaysEntries.map(entry => new Date(entry.timestamp)).sort((a, b) => a - b); const firstCigTimestamp = timestamps[0]; const lastCigTimestamp = timestamps[timestamps.length - 1]; const totalDurationMs = lastCigTimestamp - firstCigTimestamp; const numberOfIntervals = totalCigsToday - 1; if (numberOfIntervals <= 0) return "--"; const avgIntervalMs = totalDurationMs / numberOfIntervals; return formatInterval(avgIntervalMs); }
function formatInterval(ms) { if (!ms || ms <= 0) return "--"; let totalMinutes = Math.floor(ms / (1000 * 60)); if (totalMinutes < 1) return "<1m"; let hours = Math.floor(totalMinutes / 60); let minutes = totalMinutes % 60; return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`; }


// --- MAIN LOGIC ---
$(document).ready(function() {
    setupInitialUI();
    initializeComponents();
    setupNavigation();
    initializeChart();
    loadData();
});

function setupInitialUI() {
    $('#welcome-message').html(`Welcome, <span>${nickname}</span>`);
    $('#current-date').text(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
}

function initializeComponents() {
    $('#logout-button').on('click', function() {
        localStorage.clear();
        clearInterval(timeSinceLastInterval);
        window.location.href = 'login.html';
    });
    $('.mood-option').click(function() {
        $('.mood-option').removeClass('selected');
        $(this).addClass('selected');
        $('#mood').val($(this).data('mood'));
    });
    $('#increment').click(() => $('#count').val(parseInt($('#count').val()) + 1));
    $('#decrement').click(() => $('#count').val(Math.max(1, parseInt($('#count').val()) - 1)));
    $('#submitLog').click(logEntry);
}

function setupNavigation() {
    $('.nav-item').click(function(e) {
        if ($(this).hasClass('log-button')) return;
        e.preventDefault();
        $('.nav-item').removeClass('active');
        $(this).addClass('active');
        $('.content-section').removeClass('active');
        $($(this).attr('href')).addClass('active');
    });
}

function logEntry() {
    if (!$('#mood').val()) {
        $('#modal-alert').html('<div class="alert alert-danger">Please select a mood.</div>');
        return;
    }
    const countInput = $('#count');
    const countValue = Number(countInput.val());
    if (!Number.isInteger(countValue) || countValue < 1) {
        $('#modal-alert').html('<div class="alert alert-danger">Please enter a valid whole number (1 or higher).</div>');
        return;
    }
    $('#modal-alert').html('');
    const submitBtn = $('#submitLog');
    submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Saving...');
    const data = new URLSearchParams({
        action: 'logEntry',
        userID: userID,
        token: token,
        email: email,
        date: getLocalISODate(),
        time: new Date().toTimeString().split(' ')[0],
        count: countValue,
        mood: $('#mood').val(),
        location: $('#location').val() || '',
    });
    fetch(scriptUrl, { method: 'POST', body: data })
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success') {
                $('#modal-alert').html('<div class="alert alert-success">Entry logged!</div>');
                setTimeout(() => {
                    $('#logModal').modal('hide');
                    $('#modal-alert').html('');
                    $('#entryForm')[0].reset();
                    $('#count').val(1);
                    $('.mood-option').removeClass('selected');
                }, 1500);
                loadData();
            } else {
                alert(response.message);
            }
        })
        .finally(() => submitBtn.prop('disabled', false).text('Save'));
}

function loadData() {
    $('.stat-value').text('...');
    const url = `${scriptUrl}?action=loadData&userID=${userID}&token=${token}&email=${email}`;
    fetch(url)
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success') {
                processData(response.records);
            } else {
                alert(response.message);
                $('#logout-button').click();
            }
        })
        .catch(error => {
            console.error("Loading data failed:", error);
            alert("Could not load data from spreadsheet.");
        });
}

function processData(data) {
    const cleanData = data.map(entry => {
        if (entry.timestamp) {
            entry.entryDate = entry.timestamp.substring(0, 10);
        }
        return entry;
    });

    const today = getLocalISODate();
    const todayCount = cleanData.filter(entry => entry.entryDate === today).reduce((sum, entry) => sum + parseInt(entry.count), 0);
    $('#todayCount').text(todayCount);

    const totalDays = [...new Set(cleanData.map(e => e.entryDate))].length;
    const totalCount = cleanData.reduce((sum, e) => sum + parseInt(e.count), 0);
    $('#avgDaily').text(totalDays > 0 ? (totalCount / totalDays).toFixed(1) : 0);

    const moodCounts = cleanData.reduce((acc, entry) => { acc[entry.mood] = (acc[entry.mood] || 0) + parseInt(entry.count); return acc; }, {});
    $('#topTrigger').text(Object.keys(moodCounts).length > 0 ? Object.entries(moodCounts).sort((a,b) => b[1]-a[1])[0][0] : '--');

    $('#avgInterval').text(calculateTodaysInterval(cleanData));
    $('#longestStreak').text(calculateLongestStreak(cleanData));
    $('#bestDay').text(calculateBestDay(cleanData));

    const historyBody = $('#historyTable tbody').empty();
    cleanData.slice(0, 50).forEach(entry => {
        // =====> FIX: Corrected a typo here ("Dete" to "Date") <=====
        const displayDate = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "Invalid Date";
        historyBody.append(`<tr><td>${displayDate}</td><td>${entry.count}</td><td><span class="badge bg-secondary">${entry.mood}</span></td><td>${entry.location || ''}</td></tr>`);
    });

    const trendLabels = [];
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = getLocalISODate(d); 
        trendLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        trendData.push(cleanData.filter(entry => entry.entryDate === dateString).reduce((sum, entry) => sum + parseInt(entry.count), 0));
    }
    updateChartData(trendLabels, trendData);

    if (timeSinceLastInterval) {
        clearInterval(timeSinceLastInterval);
    }
    if (cleanData.length > 0) {
        const lastLogTimestamp = new Date(cleanData[0].timestamp);
        timeSinceLastInterval = setInterval(() => {
            const now = new Date();
            const diffMs = now - lastLogTimestamp;
            $('#timeSinceLast').text(formatLiveInterval(diffMs));
        }, 1000);
    } else {
        $('#timeSinceLast').text('--');
    }
}

function initializeChart() {
    const ctx = document.getElementById('dailyTrendChart').getContext('2d');
    dailyTrendChart = new Chart(ctx, { type: 'line', data: { labels: [], datasets: [{ label: 'Smoked', data: [], borderColor: '#00ffab', backgroundColor: 'rgba(0, 255, 171, 0.1)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#00ffab', pointHoverRadius: 7, pointHoverBorderColor: '#fff' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: {color: '#a0a0a0'} }, y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: {color: '#a0a0a0'} } }, plugins: { legend: { display: false }, tooltip: { enabled: true, backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: '#fff', bodyColor: '#fff', padding: 10, cornerRadius: 8, displayColors: false, callbacks: { label: function(context) { return `Smoked: ${context.raw}`; } } } } } });
}

function updateChartData(labels, data) {
    if (!dailyTrendChart) return;
    dailyTrendChart.data.labels = labels;
    dailyTrendChart.data.datasets[0].data = data;
    dailyTrendChart.update();
}