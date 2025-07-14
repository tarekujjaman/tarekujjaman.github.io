

// const scriptUrl = "https://script.google.com/macros/s/AKfycbzYmDTQtC9M8XI43g5UUv69bX4CfdSeg9RnKCd2MFr9r3_GT5yB9Od7G3KTI5H-h6DD/exec"

// Google Apps Script URL
const scriptUrl = 'https://script.google.com/macros/s/AKfycbzYmDTQtC9M8XI43g5UUv69bX4CfdSeg9RnKCd2MFr9r3_GT5yB9Od7G3KTI5H-h6DD/exec';

// Chart.js instance variable
let dailyTrendChart;

// ==================================================================
// HELPER FUNCTIONS
// ==================================================================

/**
 * Gets the local date in YYYY-MM-DD format.
 */
function getLocalISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats milliseconds into a human-readable string (e.g., "Xh Ym").
 */
function formatInterval(ms) {
    if (!ms || ms <= 0) return "--";

    let totalMinutes = Math.floor(ms / (1000 * 60));
    if (totalMinutes < 1) return "<1m";
    
    let hours = Math.floor(totalMinutes / 60);
    let minutes = totalMinutes % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

/**
 * Calculates the average interval between log entries.
 */
function calculateAverageInterval(data) {
    if (data.length < 2) {
        return "--";
    }

    // Create combined timestamps and sort them chronologically
    const timestamps = data.map(entry => new Date(`${entry.date}T${entry.time}`))
                           .sort((a, b) => a - b);

    // Calculate the intervals in milliseconds
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
        // Ensure both dates are valid before calculating the interval
        if (!isNaN(timestamps[i]) && !isNaN(timestamps[i-1])) {
            const interval = timestamps[i] - timestamps[i - 1];
            intervals.push(interval);
        }
    }

    if (intervals.length === 0) {
        return "--";
    }

    // Calculate the average of all intervals
    const totalInterval = intervals.reduce((sum, val) => sum + val, 0);
    const avgIntervalMs = totalInterval / intervals.length;

    // Format for display
    return formatInterval(avgIntervalMs);
}


// Main document ready function
$(document).ready(function() {
    setupInitialUI();
    initializeComponents();
    setupNavigation();
    initializeChart();
    loadData();
});

function setupInitialUI() {
    $('#current-date').text(new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
    }));
}

function initializeComponents() {
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
        
        const target = $(this).attr('href');
        $('.content-section').removeClass('active');
        $(target).addClass('active');
    });
}

function logEntry() {
    if (!$('#mood').val()) {
        $('#modal-alert').html('<div class="alert alert-warning">Please select a mood.</div>');
        return;
    }

    const submitBtn = $('#submitLog');
    submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status"></span> Saving...');

    const data = {
      date: getLocalISODate(), 
      time: new Date().toTimeString().split(' ')[0],
      count: $('#count').val(),
      mood: $('#mood').val(),
      location: $('#location').val() || '',
    };
    
    fetch(scriptUrl, {
        method: 'POST',
        body: new URLSearchParams(data)
    })
    .then(res => res.json())
    .then(response => {
        if (response.result === "success") {
            $('#modal-alert').html('<div class="alert alert-success">Entry logged successfully!</div>');
            setTimeout(() => {
                $('#logModal').modal('hide');
                $('#modal-alert').html('');
                $('#entryForm')[0].reset();
                $('.mood-option').removeClass('selected');
            }, 1500);
            loadData();
        } else {
             $('#modal-alert').html(`<div class="alert alert-danger">${response.message || 'An unknown error occurred'}</div>`);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        $('#modal-alert').html('<div class="alert alert-danger">Failed to save. Please check your connection.</div>');
    })
    .finally(() => {
        submitBtn.prop('disabled', false).text('Save');
    });
}

function loadData() {
    $('#todayCount').text('...');
    $('#avgDaily').text('...');
    $('#avgInterval').text('...'); // Show loading state

    fetch(scriptUrl)
        .then(res => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
        })
        .then(data => {
            processData(data.records);
        })
        .catch(error => {
            console.error('Error loading data:', error);
            alert("Could not load data from spreadsheet.");
        });
}

function processData(data) {
    const today = getLocalISODate();
    const todayCount = data
        .filter(entry => entry.date === today)
        .reduce((sum, entry) => sum + parseInt(entry.count), 0);
    $('#todayCount').text(todayCount);
    
    const totalDays = [...new Set(data.map(e => e.date))].length;
    const totalCount = data.reduce((sum, e) => sum + parseInt(e.count), 0);
    const avgDaily = totalDays > 0 ? (totalCount / totalDays).toFixed(1) : 0;
    $('#avgDaily').text(avgDaily);

    const moodCounts = data.reduce((acc, entry) => {
        acc[entry.mood] = (acc[entry.mood] || 0) + parseInt(entry.count);
        return acc;
    }, {});
    const topTrigger = Object.keys(moodCounts).length > 0 ? Object.entries(moodCounts).sort((a,b) => b[1]-a[1])[0][0] : '--';
    $('#topTrigger').text(topTrigger);

    // =====> THE FIX IS HERE <=====
    // Calculate and display the average interval
    const avgInterval = calculateAverageInterval(data);
    $('#avgInterval').text(avgInterval);


    const historyBody = $('#historyTable tbody');
    historyBody.empty();
    data.slice(0, 15).forEach(entry => {
        historyBody.append(`
            <tr>
                <td>${new Date(entry.date + 'T' + entry.time).toLocaleString()}</td>
                <td>${entry.count}</td>
                <td><span class="badge bg-secondary">${entry.mood}</span></td>
                <td><button class="btn btn-sm btn-outline-danger"><i class="fas fa-trash"></i></button></td>
            </tr>
        `);
    });

    const trendLabels = [];
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = getLocalISODate(d); 
        trendLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        const dayCount = data
            .filter(entry => entry.date === dateString)
            .reduce((sum, entry) => sum + parseInt(entry.count), 0);
        trendData.push(dayCount);
    }
    updateChartData(trendLabels, trendData);
}

function initializeChart() {
    const ctx = document.getElementById('dailyTrendChart').getContext('2d');
    dailyTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Cigarettes per Day',
                data: [],
                borderColor: '#00ffab',
                backgroundColor: 'rgba(0, 255, 171, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#00ffab',
                pointBorderColor: '#121212',
                pointHoverRadius: 7,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#a0a0a0' }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#a0a0a0' }
                }
            }
        }
    });
}

function updateChartData(labels, data) {
    if (!dailyTrendChart) {
        initializeChart();
    }
    dailyTrendChart.data.labels = labels;
    dailyTrendChart.data.datasets[0].data = data;
    dailyTrendChart.update();
}