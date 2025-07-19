const scriptUrl = "https://script.google.com/macros/s/AKfycbw3D15ekZtlMA_4AbXbejdrAuCLqJYV6I0XasSBjPv9SZeaXoKmlL3cbiQNBA7JR-CDZA/exec";
const userID = localStorage.getItem('puffTrackerUserID');
const token = localStorage.getItem('puffTrackerToken');
const nickname = localStorage.getItem('puffTrackerNickname');
const email = localStorage.getItem('puffTrackerEmail');

// --- AUTHENTICATION CHECK ---
if (!userID || !token || !nickname || !email) {
    window.location.href = 'login.html';
}

let dailyTrendChart;
let moodDistributionChart;
let locationDistributionChart;
let timeSinceLastInterval;
let allUserData = []; // Store all fetched user data for analytics

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
    
    let currentLongest = 0;
    for (let i = 1; i < timestamps.length; i++) {
        if (!isNaN(timestamps[i]) && !isNaN(timestamps[i-1])) {
            const interval = timestamps[i] - timestamps[i - 1];
            if (interval > currentLongest) {
                currentLongest = interval;
            }
        }
    }
    return formatStreakInterval(currentLongest);
}

function calculateBestDay(data) {
    if (data.length === 0) return "--";
    const dailyCounts = {};
    data.forEach(entry => {
        const date = entry.timestamp ? entry.timestamp.substring(0, 10) : getLocalISODate(new Date(entry.timestamp));
        dailyCounts[date] = (dailyCounts[date] || 0) + parseInt(entry.count);
    });
    let bestDayDate = null;
    let minCount = Infinity;
    
    const activeDays = Object.keys(dailyCounts).filter(date => dailyCounts[date] > 0);

    if (activeDays.length === 0) return "--";
    
    activeDays.sort((a, b) => new Date(a) - new Date(b));

    for (const date of activeDays) {
        if (dailyCounts[date] < minCount) {
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

function calculateTodaysInterval(data) {
    const todayStr = getLocalISODate();
    const todaysEntries = data.filter(entry => entry.entryDate === todayStr && entry.timestamp);
    
    if (todaysEntries.length < 2) {
        return "--";
    }
    
    const totalCigsToday = todaysEntries.reduce((sum, entry) => sum + parseInt(entry.count), 0);
    if (totalCigsToday < 2) {
        return "--";
    }

    const timestamps = todaysEntries.map(entry => new Date(entry.timestamp)).sort((a, b) => a - b);
    
    const firstCigTimestamp = timestamps[0];
    const lastCigTimestamp = timestamps[timestamps.length - 1];
    
    const totalDurationMs = lastCigTimestamp - firstCigTimestamp;
    const numberOfIntervals = totalCigsToday - 1;
    
    if (numberOfIntervals <= 0 || totalDurationMs <= 0) return "--";
    
    const avgIntervalMs = totalDurationMs / numberOfIntervals;
    return formatInterval(avgIntervalMs);
}

function formatInterval(ms) {
    if (!ms || ms <= 0) return "--";
    let totalMinutes = Math.floor(ms / (1000 * 60));
    if (totalMinutes < 1) return "<1m";
    let hours = Math.floor(totalMinutes / 60);
    let minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

// --- NEW HELPER FOR ADVANCED ANALYTICS ---
function getDistinctDates(data) {
    return [...new Set(data.map(e => e.entryDate))].sort((a, b) => new Date(a) - new Date(b));
}

function calculateAverage(data, period) {
    const distinctDates = getDistinctDates(data);
    if (distinctDates.length === 0) return 0;

    const dailyCounts = {};
    data.forEach(entry => {
        dailyCounts[entry.entryDate] = (dailyCounts[entry.entryDate] || 0) + parseInt(entry.count);
    });

    let totalPeriods = 0;
    let totalCount = 0;

    if (period === 'monthly') {
        const months = new Set(distinctDates.map(date => date.substring(0, 7)));
        totalPeriods = months.size;
        totalCount = data.reduce((sum, entry) => sum + parseInt(entry.count), 0);
    } else if (period === 'weekly') {
        let weekCounts = {};
        distinctDates.forEach(dateStr => {
            const date = new Date(dateStr + 'T00:00:00');
            const weekNum = getWeekNumber(date);
            const year = date.getFullYear();
            const weekKey = `${year}-${weekNum}`;
            weekCounts[weekKey] = (weekCounts[weekKey] || 0) + (dailyCounts[dateStr] || 0);
        });
        totalPeriods = Object.keys(weekCounts).length;
        totalCount = Object.values(weekCounts).reduce((sum, val) => sum + val, 0);
    } else {
        totalPeriods = distinctDates.length;
        totalCount = data.reduce((sum, entry) => sum + parseInt(entry.count), 0);
    }

    return totalPeriods > 0 ? (totalCount / totalPeriods).toFixed(1) : 0;
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return weekNo;
}


// --- MAIN LOGIC ---
$(document).ready(function() {
    setupInitialUI();
    initializeComponents();
    setupNavigation();
    initializeCharts();
    loadDashboardData(); // Consolidated function for dashboard and points
});

function setupInitialUI() {
    $('#welcome-message').html(`Welcome, <span>${nickname}</span>`);
    $('#current-date').text(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
    const today = getLocalISODate();
    $('#targetDate').attr('min', today);
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

    $('#goalType').change(function() {
        const goalType = $(this).val();
        const hint = $('#targetValueHint');
        if (goalType === 'DailyReduction') {
            hint.text('e.g., "5" to reduce to 5 cigarettes per day.');
        } else if (goalType === 'LongestStreak') {
            hint.text('e.g., "30" for 30 smoke-free days.');
        } else {
            hint.text('');
        }
    });
    $('#saveGoal').click(saveGoal);
    
    $('#exportDataButton').click(exportData);

    // NEW: Redeem Points button handler
    $(document).on('click', '.redeem-btn', function() {
        const rewardName = $(this).data('reward-name');
        const pointsCost = parseInt($(this).data('points-cost'));
        redeemPoints(rewardName, pointsCost);
    });
}

function setupNavigation() {
    $('.nav-item').click(function(e) {
        if ($(this).hasClass('log-button')) return;
        e.preventDefault();
        $('.nav-item').removeClass('active');
        $(this).addClass('active');
        $('.content-section').removeClass('active');
        const targetSectionId = $(this).attr('href');
        $(targetSectionId).addClass('active');

        // Dynamically load data based on section
        if (targetSectionId === '#dashboard' || targetSectionId === '#history' || targetSectionId === '#analytics') {
            loadDashboardData(); // Includes main data and points
        } else if (targetSectionId === '#goals') {
            loadGoals();
        } else if (targetSectionId === '#points') { // New: Load point data
            loadPointsData();
        }
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
                loadDashboardData(); // Reload all necessary data after logging
                loadGoals(); // Re-evaluate goals after logging
            } else {
                alert(response.message);
            }
        })
        .finally(() => submitBtn.prop('disabled', false).text('Save'));
}

// Consolidated function to load data for Dashboard, History, Analytics, and Points total
function loadDashboardData() {
    $('.stat-value').text('...');
    $('#totalPoints').text('...'); // Reset total points in header

    const dataUrl = `${scriptUrl}?action=loadData&userID=${userID}&token=${token}&email=${email}`;
    const pointsUrl = `${scriptUrl}?action=getUserPoints&userID=${userID}&token=${token}&email=${email}`;

    Promise.all([
        fetch(dataUrl).then(res => res.json()),
        fetch(pointsUrl).then(res => res.json())
    ])
    .then(([dataResponse, pointsResponse]) => {
        if (dataResponse.status === 'success') {
            allUserData = dataResponse.records;
            processData(allUserData); // Updates dashboard and history
            processAdvancedAnalytics(allUserData); // Updates analytics
        } else {
            console.error("Failed to load user data:", dataResponse.message);
            alert(dataResponse.message);
            $('#logout-button').click();
        }

        if (pointsResponse.status === 'success') {
            $('#totalPoints').text(pointsResponse.totalPoints);
        } else {
            console.error("Failed to load total points:", pointsResponse.message);
            $('#totalPoints').text('--');
        }
    })
    .catch(error => {
        console.error("Loading dashboard data failed:", error);
        alert("Could not load dashboard data from spreadsheet.");
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
    cleanData.forEach(entry => {
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
    updateDailyTrendChart(trendLabels, trendData);

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

function processAdvancedAnalytics(data) {
    if (data.length === 0) {
        $('#totalSmoked').text(0);
        $('#totalDaysTracked').text(0);
        $('#secondaryTopTrigger').text('--');
        $('#avgMonthly').text(0);
        $('#avgWeekly').text(0);
        updateMoodDistributionChart([], []);
        updateLocationDistributionChart([], []);
        return;
    }

    const cleanData = data.map(entry => {
        if (entry.timestamp) {
            entry.entryDate = entry.timestamp.substring(0, 10);
        }
        return entry;
    });

    const totalSmoked = cleanData.reduce((sum, entry) => sum + parseInt(entry.count), 0);
    $('#totalSmoked').text(totalSmoked);

    const distinctDates = [...new Set(cleanData.map(e => e.entryDate))];
    $('#totalDaysTracked').text(distinctDates.length);

    const moodCounts = cleanData.reduce((acc, entry) => { acc[entry.mood] = (acc[entry.mood] || 0) + parseInt(entry.count); return acc; }, {});
    const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
    $('#secondaryTopTrigger').text(sortedMoods.length > 1 ? sortedMoods[1][0] : '--');

    $('#avgMonthly').text(calculateAverage(cleanData, 'monthly'));
    $('#avgWeekly').text(calculateAverage(cleanData, 'weekly'));

    // Mood Distribution Chart
    const moodLabels = sortedMoods.map(item => item[0]);
    const moodData = sortedMoods.map(item => item[1]);
    updateMoodDistributionChart(moodLabels, moodData);

    // Location Distribution Chart
    const locationCounts = cleanData.reduce((acc, entry) => { acc[entry.location || 'Unknown'] = (acc[entry.location || 'Unknown'] || 0) + parseInt(entry.count); return acc; }, {});
    const sortedLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);
    const locationLabels = sortedLocations.map(item => item[0]);
    const locationData = sortedLocations.map(item => item[1]);
    updateLocationDistributionChart(locationLabels, locationData);
}

// --- CHART INITIALIZATION & UPDATES ---
function initializeCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { grid: { display: false }, ticks: {color: '#a0a0a0'} },
            y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: {color: '#a0a0a0', precision: 0} }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                padding: 10,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: function(context) { return `Smoked: ${context.raw}`; }
                }
            }
        }
    };

    // Daily Trend Chart
    const ctxDaily = document.getElementById('dailyTrendChart').getContext('2d');
    dailyTrendChart = new Chart(ctxDaily, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Smoked', data: [], borderColor: '#00ffab', backgroundColor: 'rgba(0, 255, 171, 0.1)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#00ffab', pointHoverRadius: 7, pointHoverBorderColor: '#fff' }] },
        options: chartOptions
    });

    // Mood Distribution Chart
    const ctxMood = document.getElementById('moodDistributionChart').getContext('2d');
    moodDistributionChart = new Chart(ctxMood, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#00ffab', '#f4d03f', '#a569bd', '#e74c3c', '#3498db', '#90ee90'
                ],
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#e0e0e0' } },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                            return `${label}: ${value} (${percentage})`;
                        }
                    }
                }
            }
        }
    });

    // Location Distribution Chart
    const ctxLocation = document.getElementById('locationDistributionChart').getContext('2d');
    locationDistributionChart = new Chart(ctxLocation, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Cigarettes',
                data: [],
                backgroundColor: '#00ffab',
                borderColor: '#00ffab',
                borderWidth: 1
            }]
        },
        options: chartOptions
    });
}

function updateDailyTrendChart(labels, data) {
    if (!dailyTrendChart) return;
    dailyTrendChart.data.labels = labels;
    dailyTrendChart.data.datasets[0].data = data;
    dailyTrendChart.update();
}

function updateMoodDistributionChart(labels, data) {
    if (!moodDistributionChart) return;
    moodDistributionChart.data.labels = labels;
    moodDistributionChart.data.datasets[0].data = data;
    moodDistributionChart.update();
}

function updateLocationDistributionChart(labels, data) {
    if (!locationDistributionChart) return;
    locationDistributionChart.data.labels = labels;
    locationDistributionChart.data.datasets[0].data = data;
    locationDistributionChart.update();
}


// --- GOAL SETTING & TRACKING ---

function saveGoal() {
    const goalType = $('#goalType').val();
    const targetValue = $('#targetValue').val();
    const targetDate = $('#targetDate').val();

    if (!goalType || !targetValue || !targetDate) {
        $('#goal-modal-alert').html('<div class="alert alert-danger">Please fill all goal fields.</div>');
        return;
    }

    const saveBtn = $('#saveGoal');
    saveBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Saving...');
    
    const data = new URLSearchParams({
        action: 'saveGoal',
        userID: userID,
        token: token,
        email: email,
        goalType: goalType,
        targetValue: targetValue,
        targetDate: targetDate
    });

    fetch(scriptUrl, { method: 'POST', body: data })
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success') {
                $('#goal-modal-alert').html('<div class="alert alert-success">Goal saved!</div>');
                setTimeout(() => {
                    $('#goalModal').modal('hide');
                    $('#goal-modal-alert').html('');
                    $('#goalForm')[0].reset();
                }, 1500);
                loadGoals();
            } else {
                $('#goal-modal-alert').html(`<div class="alert alert-danger">${response.message}</div>`);
            }
        })
        .catch(error => {
            console.error("Saving goal failed:", error);
            $('#goal-modal-alert').html('<div class="alert alert-danger">An error occurred while saving the goal.</div>');
        })
        .finally(() => saveBtn.prop('disabled', false).text('Save Goal'));
}


function loadGoals() {
    const url = `${scriptUrl}?action=loadGoals&userID=${userID}&token=${token}&email=${email}`;
    fetch(url)
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success') {
                displayGoals(response.goals);
            } else {
                $('#goal-alert-container').html(`<div class="alert alert-danger">${response.message}</div>`);
                console.error("Loading goals failed:", response.message);
            }
        })
        .catch(error => {
            console.error("Loading goals failed:", error);
            $('#goal-alert-container').html('<div class="alert alert-danger">Could not load goals.</div>');
        });
}

function displayGoals(goals) {
    const activeGoalsContainer = $('#activeGoalsContainer').empty();
    const goalsHistoryTableBody = $('#goalsHistoryTable tbody').empty();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let hasActiveGoal = false;

    goals.sort((a, b) => new Date(a.startdate) - new Date(b.startdate));

    goals.forEach(goal => {
        const targetDate = new Date(goal.targetdate + 'T00:00:00');
        const startDate = new Date(goal.startdate + 'T00:00:00');

        const displayTargetDate = targetDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const displayStartDate = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });


        let status = 'Active';
        let progressValue = 0;
        let progressText = '--';

        if (goal.goaltype === 'DailyReduction') {
            const initialDailyCount = getDailyCountAtDate(startDate);
            const currentDailyCount = getDailyCountAtDate(today);

            if (initialDailyCount > 0) {
                 const reductionNeeded = initialDailyCount - parseInt(goal.targetvalue);
                 const currentReduction = initialDailyCount - currentDailyCount;
                 progressValue = (reductionNeeded > 0) ? Math.min(100, Math.max(0, (currentReduction / reductionNeeded) * 100)) : 100;
            } else {
                progressValue = currentDailyCount <= parseInt(goal.targetvalue) ? 100 : 0;
            }
            progressText = `Current: ${currentDailyCount} / Target: ${goal.targetvalue}`;

            if (currentDailyCount <= parseInt(goal.targetvalue)) {
                status = 'Achieved';
            } else if (today > targetDate) {
                status = 'Not Achieved';
            }

        } else if (goal.goaltype === 'LongestStreak') {
            const currentStreak = calculateCurrentSmokeFreeStreak();
            progressValue = Math.min(100, Math.max(0, (currentStreak / parseInt(goal.targetvalue)) * 100));
            progressText = `Current: ${currentStreak} / Target: ${goal.targetvalue} days`;

            if (currentStreak >= parseInt(goal.targetvalue)) {
                status = 'Achieved';
            } else if (today > targetDate) {
                status = 'Not Achieved';
            }
        }

        if (status === 'Active' && today > targetDate) {
            status = 'Overdue';
        }


        if (status === 'Active' || status === 'Overdue') {
            hasActiveGoal = true;
            activeGoalsContainer.append(`
                <div class="bento-box">
                    <div class="box-content">
                        <div class="stat-icon"><i class="fas ${goal.goaltype === 'DailyReduction' ? 'fa-minus-circle' : 'fa-clock'}"></i></div>
                        <div class="stat-label">Goal: ${goal.goaltype === 'DailyReduction' ? 'Reduce Daily' : 'Longest Streak'}</div>
                        <div class="stat-value">${goal.targetvalue} ${goal.goaltype === 'DailyReduction' ? 'cigs' : 'days'}</div>
                        <small class="text-muted">Target by: ${displayTargetDate}</small><br>
                        <small class="text-info">${progressText}</small>
                        <div class="progress mt-2" style="height: 5px;">
                            <div class="progress-bar bg-primary" role="progressbar" style="width: ${progressValue}%" aria-valuenow="${progressValue}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                        <span class="badge ${status === 'Achieved' ? 'bg-success' : (status === 'Overdue' ? 'bg-danger' : 'bg-info')}">${status}</span>
                    </div>
                </div>
            `);
        }
        
        goalsHistoryTableBody.append(`
            <tr>
                <td>${goal.goaltype === 'DailyReduction' ? 'Reduce Daily' : 'Longest Streak'}</td>
                <td>${goal.targetvalue}</td>
                <td>${displayTargetDate}</td>
                <td>${progressText}</td>
                <td><span class="badge ${status === 'Achieved' ? 'bg-success' : (status === 'Overdue' ? 'bg-danger' : (status === 'Active' ? 'bg-info' : 'bg-secondary'))}">${status}</span></td>
                <td>${displayStartDate}</td>
            </tr>
        `);
    });

    if (!hasActiveGoal) {
        activeGoalsContainer.html('<p class="text-muted text-center py-4">No active goals. Set a new one!</p>');
    }
}

function getDailyCountAtDate(date) {
    const dateStr = getLocalISODate(date);
    const entriesOnDate = allUserData.filter(entry => entry.entryDate === dateStr);
    return entriesOnDate.reduce((sum, entry) => sum + parseInt(entry.count), 0);
}

function calculateCurrentSmokeFreeStreak() {
    if (allUserData.length === 0) return 0;

    const sortedEntries = allUserData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let lastSmokeDate = null;
    if (sortedEntries.length > 0) {
        lastSmokeDate = new Date(sortedEntries[sortedEntries.length - 1].timestamp);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (lastSmokeDate === null) {
        return 0;
    }

    lastSmokeDate.setHours(0, 0, 0, 0);

    const diffTime = today - lastSmokeDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
}


// --- DATA EXPORT ---
function exportData() {
    const exportBtn = $('#exportDataButton');
    exportBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Exporting...');

    const url = `${scriptUrl}?action=exportData&userID=${userID}&token=${token}&email=${email}`;
    fetch(url)
        .then(response => {
            if (response.ok) {
                alert("Data export initiated. Your download should start shortly!");
            } else {
                return response.json().then(errorData => {
                    alert(`Error exporting data: ${errorData.message}`);
                    console.error("Export data failed:", errorData.message);
                }).catch(() => {
                    alert("Error exporting data: Invalid response from server.");
                    console.error("Export data failed: Non-JSON error response.");
                });
            }
        })
        .catch(error => {
            console.error("Export data failed:", error);
            alert("An error occurred during data export. Please try again.");
        })
        .finally(() => {
            exportBtn.prop('disabled', false).html('<i class="fas fa-download"></i> Export Data');
        });
}


// --- NEW: POINTS SYSTEM FUNCTIONS ---

// Function to load total points and point history
function loadPointsData() {
    // Total points in header is updated by loadDashboardData, which is called on page load
    // We specifically fetch history here for the Points section
    const pointHistoryTableBody = $('#pointHistoryTable tbody').empty(); // Clear history table

    const historyUrl = `${scriptUrl}?action=getPointHistory&userID=${userID}&token=${token}&email=${email}`;

    fetch(historyUrl)
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success') {
                displayPointHistory(response.history);
            } else {
                console.error("Failed to load point history:", response.message);
                pointHistoryTableBody.append('<tr><td colspan="3" class="text-muted text-center">No point history available.</td></tr>');
            }
        })
        .catch(error => {
            console.error("Loading points history failed:", error);
            pointHistoryTableBody.append('<tr><td colspan="3" class="text-muted text-center">Could not load point history.</td></tr>');
        });
}

function displayPointHistory(history) {
    const pointHistoryTableBody = $('#pointHistoryTable tbody').empty();
    if (history.length === 0) {
        pointHistoryTableBody.append('<tr><td colspan="3" class="text-muted text-center">No point history available.</td></tr>');
        return;
    }

    history.forEach(entry => {
        const displayDateTime = new Date(entry.timestamp).toLocaleString();
        const pointClass = entry.points > 0 ? 'text-success' : 'text-danger';
        pointHistoryTableBody.append(`
            <tr>
                <td>${displayDateTime}</td>
                <td class="${pointClass}">${entry.points}</td>
                <td>${entry.reason}</td>
            </tr>
        `);
    });
}

function redeemPoints(rewardName, pointsCost) {
    const currentPoints = parseInt($('#totalPoints').text()); // Get points from header display
    const redeemAlertContainer = $('#redeem-alert-container');
    redeemAlertContainer.empty(); // Clear previous alerts

    if (isNaN(currentPoints) || currentPoints < pointsCost) {
        redeemAlertContainer.html(`<div class="alert alert-danger">You need ${pointsCost} points to redeem "${rewardName}", but you only have ${currentPoints} points.</div>`);
        return;
    }

    if (confirm(`Are you sure you want to redeem "${rewardName}" for ${pointsCost} points?`)) {
        const data = new URLSearchParams({
            action: 'redeemPoints',
            userID: userID,
            token: token,
            email: email,
            pointsToRedeem: pointsCost,
            rewardName: rewardName
        });

        fetch(scriptUrl, { method: 'POST', body: data })
            .then(res => res.json())
            .then(response => {
                if (response.status === 'success') {
                    redeemAlertContainer.html('<div class="alert alert-success">' + response.message + '</div>');
                    // Reload all necessary data after redemption
                    loadDashboardData();
                    loadPointsData();
                } else {
                    redeemAlertContainer.html(`<div class="alert alert-danger">Redemption failed: ${response.message}</div>`);
                }
            })
            .catch(error => {
                console.error("Redemption failed:", error);
                redeemAlertContainer.html('<div class="alert alert-danger">An error occurred during redemption. Please try again.</div>');
            });
    }
}