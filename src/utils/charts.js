const QuickChart = require('quickchart-js');

/**
 * Generates a Radar Chart URL for user stats
 */
function createRadarChart(labels, data, labelName = 'Stats') {
    const chart = new QuickChart();
    chart.setConfig({
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: labelName,
                data: data,
                backgroundColor: 'rgba(114, 137, 218, 0.4)',
                borderColor: 'rgba(114, 137, 218, 1)',
                pointBackgroundColor: 'rgba(114, 137, 218, 1)',
            }]
        },
        options: {
            scale: {
                ticks: {
                    display: false,
                    min: 0,
                    max: 100
                },
                gridLines: { color: 'rgba(255, 255, 255, 0.2)' },
                angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
                pointLabels: { fontColor: '#fff', fontSize: 14 }
            },
            legend: {
                labels: { fontColor: '#fff' }
            }
        }
    });

    chart.setBackgroundColor('#2f3136');
    chart.setWidth(400);
    chart.setHeight(400);

    return chart.getUrl();
}

/**
 * Generates a Line Chart URL for growth forecasting
 */
function createLineChart(labels, data, title = 'Growth Forecast') {
    const chart = new QuickChart();
    chart.setConfig({
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                fill: true,
                backgroundColor: 'rgba(241, 196, 15, 0.2)',
                borderColor: 'rgba(241, 196, 15, 1)',
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: '#fff'
            }]
        },
        options: {
            legend: { display: false },
            title: {
                display: true,
                text: title,
                fontColor: '#fff',
                fontSize: 16
            },
            scales: {
                yAxes: [{
                    gridLines: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { fontColor: '#fff' }
                }],
                xAxes: [{
                    gridLines: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { fontColor: '#fff' }
                }]
            }
        }
    });

    chart.setBackgroundColor('#2f3136');
    chart.setWidth(500);
    chart.setHeight(300);

    return chart.getUrl();
}

module.exports = { createRadarChart, createLineChart };
