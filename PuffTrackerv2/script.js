// const scriptUrl = "https://script.google.com/macros/s/AKfycbwgjQgJtz4lRwvSlVEYdkYZKGwcoXNPR1k9EePnHchRlsZ2-Rj0rJQJYTV5jJIMfLUOuw/exec";

const scriptUrl = "https://script.google.com/macros/s/AKfycbyYpNObDAGRvhkQR6PosvVndMVLOaCMYz194tiQqmmqa7XOXgkLqWb3mkKP63D3rDGdxQ/exec";
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
    
    // Sort records by timestamp to find the longest period between smokes
    // The previous implementation was sorting timestamps of all entries, not necessarily consecutive smokes.
    // Let's refine this to be the longest *smoke-free* streak between *distinct* smoke times.
    // If you log 5 at 10:00 and 3 at 10:00, it's one smoking event.
    // A true longest smoke-free streak needs to look at the gap between the last puff of one session and the first puff of the next.

    // For simplicity with existing data structure, assuming each 'entry' is a distinct smoking event timestamped.
    // A more robust solution might require a "session end" timestamp.
    // For now, let's calculate the longest time between *any* two consecutive logged entries.
    
    // If 'data' is already sorted by timestamp (which it is from getUserLogs .reverse())
    // then the original logic of finding max interval between *consecutive* entries in the sorted list is valid
    // for finding the longest time between *any two* logged smokes.
    // But longest *smoke-free* streak implies time between last smoke and first smoke.

    // Let's reconsider `calculateLongestStreak`:
    // It should ideally look for the longest period where *no* cigarettes were logged.
    // The existing function `calculateLongestStreak` seems to calculate the longest interval *between* any two logged entries.
    // This is often interpreted as the longest smoke-free period. Let's keep its current interpretation.
    
    // The function `calculateLongestStreak` as provided actually finds the longest interval *between consecutive entries*.
    // This is a common interpretation of "longest streak" in this context.
    // Its current code:
    // for (let i = 1; i < timestamps.length; i++) {
    //     if (!isNaN(timestamps[i]) && !isNaN(timestamps[i-1])) {
    //         const interval = timestamps[i] - timestamps[i - 1];
    //         if (interval > longestStreakMs) {
    //             longestStreakMs = interval;
    //         }
    //     }
    // }
    // This looks correct for "longest time between any two logged items".
    // I'll keep this as is.

    // However, the `getUserLogs` in GAS.txt returns records in reverse order (most recent first).
    // So, `cleanData` in script.js is also most recent first.
    // For `calculateLongestStreak` to work, `timestamps` need to be ascending.
    const ascendingTimestamps = data.map(entry => new Date(entry.timestamp)).sort((a, b) => a - b);

    if (ascendingTimestamps.length < 2) return "--"; // Need at least two entries to calculate an interval

    let longestStreakMs = 0;
    for (let i = 1; i < ascendingTimestamps.length; i++) {
        if (isNaN(ascendingTimestamps[i]) || isNaN(ascendingTimestamps[i-1])) continue; // Skip invalid dates
        const interval = ascendingTimestamps[i] - ascendingTimestamps[i - 1];
        if (interval > longestStreakMs) {
            longestStreakMs = interval;
        }
    }
    return formatStreakInterval(longestStreakMs);
}

function calculateTodaysInterval(data) { 
    const todayStr = getLocalISODate(); 
    const todaysEntries = data.filter(entry => entry.entryDate === todayStr && entry.timestamp); 
    
    // Ensure all entries have valid timestamps and are sorted
    const validTodaysEntries = todaysEntries
        .filter(entry => entry.timestamp && !isNaN(new Date(entry.timestamp)))
        .map(entry => ({ ...entry, parsedTimestamp: new Date(entry.timestamp) }))
        .sort((a, b) => a.parsedTimestamp - b.parsedTimestamp);

    if (validTodaysEntries.length < 2) { 
        return "--"; 
    } 
    
    const totalCigsToday = validTodaysEntries.reduce((sum, entry) => sum + parseInt(entry.count), 0); 
    
    // If only one "smoking event" or total count is less than 2, cannot calculate interval
    if (totalCigsToday < 2) { 
        return "--"; 
    } 

    const firstCigTimestamp = validTodaysEntries[0].parsedTimestamp; 
    const lastCigTimestamp = validTodaysEntries[validTodaysEntries.length - 1].parsedTimestamp; 
    
    const totalDurationMs = lastCigTimestamp - firstCigTimestamp; 
    const numberOfIntervals = totalCigsToday - 1; // Assuming totalCigsToday is actual number of *puffs* or *cigarettes* not events.
                                                  // If it's count of *smoking events*, then it should be validTodaysEntries.length - 1

    // If totalCigsToday counts the number of times you logged (events), then number of intervals is validTodaysEntries.length - 1
    // If totalCigsToday sums up the 'count' field (e.g. 5 puffs in one log + 3 puffs in another), then number of intervals might be ambiguous.
    // For Avg Interval between first and last smoke event of the day, it should be based on number of events.
    
    // Let's assume totalCigsToday is sum of 'count' field. If so, and we want average interval *between events*,
    // then the divisor should be the number of distinct log entries minus 1.
    const numberOfEventsForInterval = validTodaysEntries.length - 1;

    if (numberOfEventsForInterval <= 0 || totalDurationMs <= 0) return "--";

    const avgIntervalMs = totalDurationMs / numberOfEventsForInterval;
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

// Function for calculating Money Saved
// Requires a baseline daily consumption and cost per cigarette/pack
function calculateMoneySaved(data) {
    const baselineDailyCigs = 15; // Example: user used to smoke 15 cigarettes per day
    const costPerCigarette = 0.5; // Example: $0.50 per cigarette
    
    if (data.length === 0) return "$0";

    // Get the very first log entry date to establish starting point
    const firstLogDate = new Date(data[data.length - 1].timestamp.substring(0, 10)); // Oldest entry
    const today = new Date();

    let totalDaysTracking = 0;
    // Calculate total days tracking (from first log entry to yesterday)
    if (firstLogDate <= today) {
        totalDaysTracking = Math.floor((today - firstLogDate) / (1000 * 60 * 60 * 24)) + 1; // +1 to include today if it's logged
    }
    if (totalDaysTracking <= 0) return "$0";

    const totalCigsLogged = data.reduce((sum, entry) => sum + parseInt(entry.count), 0);
    const potentialCigsSmoked = baselineDailyCigs * totalDaysTracking;
    const cigsNotSmoked = potentialCigsSmoked - totalCigsLogged;

    if (cigsNotSmoked <= 0) return "$0";

    const moneySaved = cigsNotSmoked * costPerCigarette;
    return `$${moneySaved.toFixed(0)}`; // Round to whole dollars
}

// Function for Health Benefits Gained (Placeholder - complex calculation normally)
function calculateHealthBenefits(data) {
    if (data.length === 0) return "Starting...";

    const totalCigsLogged = data.reduce((sum, entry) => sum + parseInt(entry.count), 0);
    
    // Simple logic: if fewer than 100 total logged, still early.
    // If reduction is significant, show some positive message.
    // This is highly simplified and would need real health data/models.
    
    const baselineDailyCigs = 15; // Example
    const totalDaysTracking = Math.floor((new Date() - new Date(data[data.length - 1].timestamp.substring(0, 10))) / (1000 * 60 * 60 * 24)) + 1;
    const averageDailyCigs = totalCigsLogged / totalDaysTracking;

    if (averageDailyCigs < baselineDailyCigs * 0.5 && totalDaysTracking > 7) {
        return "Lungs Recovering!";
    } else if (averageDailyCigs < baselineDailyCigs * 0.8 && totalDaysTracking > 3) {
        return "Improved Breathing";
    } else {
        return "Good Progress!";
    }
}


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
        // Handle log button separately
        if ($(this).hasClass('log-button')) {
            // The modal is controlled by Bootstrap's data attributes
            return; 
        }
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
    $('#modal-alert').html(''); // Clear previous alerts
    const submitBtn = $('#submitLog');
    submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Saving...');
    
    const data = new URLSearchParams({
        action: 'logEntry',
        userID: userID, // Keep userID for token validation
        token: token, // Keep token for validation
        email: email, // GAS script now filters by email
        date: getLocalISODate(),
        time: new Date().toTimeString().split(' ')[0],
        count: countValue,
        mood: $('#mood').val(),
        location: $('#location').val() || '',
        notes: $('#notes').val() || '' // Include notes field
    });

    fetch(scriptUrl, { method: 'POST', body: data })
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success') {
                $('#modal-alert').html('<div class="alert alert-success">Entry logged!</div>');
                setTimeout(() => {
                    $('#logModal').modal('hide');
                    $('#modal-alert').html(''); // Clear alert after modal hides
                    $('#entryForm')[0].reset(); // Reset the form
                    $('#count').val(1); // Reset count to 1
                    $('.mood-option').removeClass('selected'); // Deselect moods
                    $('#notes').val(''); // Clear notes field
                }, 1500);
                loadData(); // Reload data to update dashboard
            } else {
                showAlertInModal(response.message, 'danger'); // Use a specific function for modal alerts
            }
        })
        .catch(error => {
            console.error("Logging entry failed:", error);
            showAlertInModal("Could not log entry. Please try again.", 'danger');
        })
        .finally(() => submitBtn.prop('disabled', false).text('Save'));
}

// Function to show alerts within the modal
function showAlertInModal(message, type) {
    const modalAlertContainer = $('#modal-alert');
    modalAlertContainer.html(`<div class="alert alert-${type}">${message}</div>`);
    setTimeout(() => {
        modalAlertContainer.html(''); // Clear modal alert after 3 seconds
    }, 3000);
}


function loadData() {
    // Show loading state for all stats
    $('.stat-value').text('...'); 
    $('#timeSinceLast').text('--'); // Reset time since last

    const url = `${scriptUrl}?action=loadData&userID=${userID}&token=${token}&email=${email}`;
    fetch(url)
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success') {
                processData(response.records);
            } else {
                alert(response.message); // Show alert if session invalid
                $('#logout-button').click(); // Force logout
            }
        })
        .catch(error => {
            console.error("Loading data failed:", error);
            alert("Could not load data from spreadsheet. Please check your connection or try again.");
        });
}

function processData(data) {
    // Ensure data is sorted by timestamp in ascending order for consistent calculations
    // This is crucial because getUserLogs returns in reverse.
    const cleanData = data.map(entry => {
        entry.timestamp = new Date(entry.timestamp); // Convert to Date object
        entry.entryDate = getLocalISODate(entry.timestamp); // Extract YYYY-MM-DD date string
        return entry;
    }).sort((a, b) => a.timestamp - b.timestamp); // Sort ascending

    // Reverse for displaying history (most recent first)
    const displayData = [...cleanData].reverse();


    const today = getLocalISODate();
    const todaysEntries = cleanData.filter(entry => entry.entryDate === today);
    const totalCigsToday = todaysEntries.reduce((sum, entry) => sum + parseInt(entry.count), 0);
    $('#todayCount').text(totalCigsToday);

    const totalDaysTracking = [...new Set(cleanData.map(e => e.entryDate))].length;
    const totalCigsLogged = cleanData.reduce((sum, e) => sum + parseInt(e.count), 0);
    $('#avgDaily').text(totalDaysTracking > 0 ? (totalCigsLogged / totalDaysTracking).toFixed(1) : 0);

    const moodCounts = cleanData.reduce((acc, entry) => { acc[entry.mood] = (acc[entry.mood] || 0) + parseInt(entry.count); return acc; }, {});
    $('#topTrigger').text(Object.keys(moodCounts).length > 0 ? Object.entries(moodCounts).sort((a,b) => b[1]-a[1])[0][0] : '--');

    $('#avgInterval').text(calculateTodaysInterval(cleanData)); // Pass all data for today's interval
    $('#longestStreak').text(calculateLongestStreak(cleanData));
    $('#bestDay').text(calculateBestDay(cleanData)); // This needs all data to find the best day overall

    // Populate new stats
    $('#moneySaved').text(calculateMoneySaved(cleanData));
    $('#healthImpact').text(calculateHealthBenefits(cleanData));


    const historyBody = $('#historyTable tbody').empty();
    displayData.slice(0, 50).forEach(entry => { // Slice to limit display for performance
        const displayDate = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "Invalid Date";
        historyBody.append(`<tr><td>${displayDate}</td><td>${entry.count}</td><td><span class="badge bg-secondary">${entry.mood}</span></td><td>${entry.location || ''}</td><td>${entry.notes || ''}</td></tr>`);
    });

    // Chart Data Update
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

    // Time Since Last Puff Live Update
    if (timeSinceLastInterval) {
        clearInterval(timeSinceLastInterval);
    }
    if (cleanData.length > 0) {
        // Find the last recorded valid timestamp
        const lastLogEntry = cleanData[cleanData.length - 1]; // Because cleanData is sorted ascending
        const lastLogTimestamp = new Date(lastLogEntry.timestamp); // Already Date object
        
        // Ensure lastLogTimestamp is valid
        if (!isNaN(lastLogTimestamp.getTime())) {
            timeSinceLastInterval = setInterval(() => {
                const now = new Date();
                const diffMs = now - lastLogTimestamp;
                $('#timeSinceLast').text(formatLiveInterval(diffMs));
            }, 1000);
        } else {
            $('#timeSinceLast').text('--'); // Handle invalid last timestamp
        }
    } else {
        $('#timeSinceLast').text('--'); // No logs yet
    }
}

function initializeChart() {
    const ctx = document.getElementById('dailyTrendChart').getContext('2d');
    dailyTrendChart = new Chart(ctx, { 
        type: 'line', 
        data: { 
            labels: [], 
            datasets: [{ 
                label: 'Smoked', 
                data: [], 
                borderColor: 'var(--primary-color)', 
                backgroundColor: 'var(--primary-gradient-light)', 
                fill: true, 
                tension: 0.4, 
                pointRadius: 5, /* Slightly larger points */
                pointBackgroundColor: 'var(--primary-color)', 
                pointBorderColor: '#fff', /* White border for points */
                pointBorderWidth: 2,
                pointHoverRadius: 8, /* Larger hover radius */
                pointHoverBorderColor: '#fff',
                pointHoverBackgroundColor: 'var(--primary-color)'
            }] 
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { 
                x: { 
                    grid: { 
                        display: false 
                    }, 
                    ticks: {
                        color: 'var(--text-muted)'
                    } 
                }, 
                y: { 
                    beginAtZero: true, 
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.05)' 
                    }, 
                    ticks: {
                        color: 'var(--text-muted)',
                        stepSize: 5, /* Force step size for cleaner Y-axis */
                        maxTicksLimit: 5 
                    } 
                } 
            }, 
            plugins: { 
                legend: { 
                    display: false 
                }, 
                tooltip: { 
                    enabled: true, 
                    backgroundColor: 'var(--light-bg)', /* Use lighter background for tooltip */
                    titleColor: 'var(--primary-color)', /* Primary color for title */
                    bodyColor: 'var(--text-color)', 
                    padding: 12, /* Larger padding */
                    cornerRadius: 8, 
                    displayColors: true, /* Show color box */
                    borderColor: 'var(--primary-color)', /* Border for tooltip */
                    borderWidth: 1,
                    callbacks: { 
                        label: function(context) { 
                            return `Smoked: ${context.raw} puffs`; 
                        },
                        title: function(context) {
                            return context[0].label; // Show day name
                        }
                    } 
                } 
            },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        } 
    });
}

function updateChartData(labels, data) {
    if (!dailyTrendChart) return;
    dailyTrendChart.data.labels = labels;
    dailyTrendChart.data.datasets[0].data = data;
    dailyTrendChart.update();
}
