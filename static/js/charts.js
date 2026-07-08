/* NLP EXPERIMENT LAB - VISUALIZATIONS ENGINE (charts.js) */

// Global storage for active ApexCharts instances to allow updates/destruction
const CHARTS = {
    cpu: null,
    ram: null,
    disk: null,
    gpu: null,
    dataset: null,
    ranking: null,
    prediction: null
};

// Colors matching the modern Pink & Purple palette
const PALETTE = {
    pink: '#FF7BA7',
    softPink: '#FFD6E7',
    blush: '#FFF0F5',
    purple: '#8E7CC3',
    mauve: '#D291BC',
    roseMauve: '#D291BC',
    dark: '#333333',
    gray: '#F5F5F7'
};

/**
 * Creates a circular progress radial bar chart (for resources)
 */
function createRadialBarChart(containerId, label, color) {
    const options = {
        series: [0],
        chart: {
            type: 'radialBar',
            height: 140,
            sparkline: { enabled: true }
        },
        plotOptions: {
            radialBar: {
                startAngle: -90,
                endAngle: 90,
                track: {
                    background: PALETTE.gray,
                    strokeWidth: '97%',
                    margin: 5,
                },
                dataLabels: {
                    name: { show: false },
                    value: {
                        offsetY: -2,
                        fontSize: '18px',
                        fontWeight: '700',
                        color: PALETTE.dark,
                        formatter: function (val) {
                            return Math.round(val) + "%";
                        }
                    }
                }
            }
        },
        fill: {
            colors: [color]
        },
        stroke: {
            lineCap: 'round'
        }
    };

    const chart = new ApexCharts(document.querySelector(containerId), options);
    chart.render();
    return chart;
}

/**
 * Initializes the four Circular Resource Monitors
 */
function initResourceCharts() {
    if (CHARTS.cpu) return; // Already initialized
    
    CHARTS.cpu = createRadialBarChart("#cpu-chart", "CPU", PALETTE.pink);
    CHARTS.ram = createRadialBarChart("#ram-chart", "RAM", PALETTE.mauve);
    CHARTS.disk = createRadialBarChart("#disk-chart", "DISK", PALETTE.purple);
    CHARTS.gpu = createRadialBarChart("#gpu-chart", "GPU", PALETTE.pink);
}

/**
 * Updates a specific resource circular chart percentage
 */
function updateResourceChart(type, percentage) {
    if (CHARTS[type]) {
        CHARTS[type].updateSeries([percentage]);
    }
}

/**
 * Renders dataset class distribution donut chart
 */
function renderDatasetDonut(classDist) {
    const labels = Object.keys(classDist).map(l => {
        // Jika label berupa angka murni, tambahkan prefiks "Kelas " agar lebih profesional
        return isNaN(l) ? l : "Kelas " + l;
    });
    const series = Object.values(classDist);
    
    if (CHARTS.dataset) {
        CHARTS.dataset.destroy();
    }
    
    const options = {
        series: series,
        chart: {
            type: 'donut',
            height: 250,
            fontFamily: 'Outfit',
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 600,
                animateGradually: {
                    enabled: true,
                    delay: 150
                },
                dynamicAnimation: {
                    enabled: true,
                    speed: 350
                }
            }
        },
        labels: labels,
        colors: [PALETTE.pink, PALETTE.purple, PALETTE.mauve, '#FCA3B7', '#8672C1'],
        stroke: {
            show: true,
            width: 3,
            colors: ['#ffffff']
        },
        plotOptions: {
            pie: {
                expandOnClick: true,
                donut: {
                    size: '72%',
                    background: 'transparent',
                    labels: {
                        show: true,
                        name: {
                            show: true,
                            fontSize: '13px',
                            fontFamily: 'Outfit',
                            fontWeight: 600,
                            color: '#8E7CC3',
                            offsetY: -6
                        },
                        value: {
                            show: true,
                            fontSize: '22px',
                            fontFamily: 'Outfit',
                            fontWeight: 700,
                            color: '#333333',
                            offsetY: 6,
                            formatter: function (val) {
                                return Number(val).toLocaleString('id-ID');
                            }
                        },
                        total: {
                            show: true,
                            showAlways: true,
                            label: 'Total Data',
                            fontSize: '12px',
                            fontFamily: 'Outfit',
                            fontWeight: 600,
                            color: '#8E7CC3',
                            formatter: function (w) {
                                const sum = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                                return Number(sum).toLocaleString('id-ID');
                            }
                        }
                    }
                }
            }
        },
        legend: {
            show: true,
            position: 'right',
            horizontalAlign: 'center',
            verticalAlign: 'middle',
            fontFamily: 'Outfit',
            fontSize: '13px',
            fontWeight: 500,
            labels: {
                colors: '#555555'
            },
            markers: {
                width: 10,
                height: 10,
                radius: 12,
                offsetX: -4
            },
            itemMargin: {
                horizontal: 10,
                vertical: 6
            },
            formatter: function(seriesName, opts) {
                const val = opts.w.globals.series[opts.seriesIndex];
                const total = opts.w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return `${seriesName}: <strong>${val}</strong> <span style="color: #888; font-size: 11px;">(${pct}%)</span>`;
            }
        },
        dataLabels: {
            enabled: true,
            style: {
                fontSize: '11px',
                fontFamily: 'Outfit',
                fontWeight: '600',
                colors: ['#ffffff']
            },
            background: {
                enabled: false
            },
            dropShadow: {
                enabled: true,
                top: 1,
                left: 1,
                blur: 1,
                color: '#000000',
                opacity: 0.15
            }
        },
        tooltip: {
            enabled: true,
            theme: 'light',
            style: {
                fontSize: '12px',
                fontFamily: 'Outfit'
            },
            y: {
                formatter: function (val) {
                    return val.toLocaleString('id-ID') + " baris data";
                }
            }
        },
        responsive: [
            {
                breakpoint: 768,
                options: {
                    chart: {
                        height: 320
                    },
                    legend: {
                        position: 'bottom',
                        offsetX: 0,
                        offsetY: 0
                    }
                }
            }
        ]
    };
    
    CHARTS.dataset = new ApexCharts(document.querySelector("#dataset-class-chart"), options);
    CHARTS.dataset.render();
}

/**
 * Renders model evaluation comparison bar chart
 */
function renderModelComparisons(models) {
    if (!models || models.length === 0) return;
    
    const names = models.map(m => m.exp_name);
    const accuracies = models.map(m => m.accuracy * 100);
    const f1s = models.map(m => m.macro_f1 * 100);
    
    if (CHARTS.ranking) {
        CHARTS.ranking.destroy();
    }
    
    const options = {
        series: [
            { name: 'Accuracy (%)', data: accuracies },
            { name: 'Macro F1 (%)', data: f1s }
        ],
        chart: {
            type: 'bar',
            height: 260,
            toolbar: { show: false }
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
                endingShape: 'rounded',
                borderRadius: 4
            },
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            show: true,
            width: 2,
            colors: ['transparent']
        },
        colors: [PALETTE.pink, PALETTE.purple],
        xaxis: {
            categories: names,
            labels: { style: { fontFamily: 'Outfit' } }
        },
        yaxis: {
            title: { text: 'Performa (%)', style: { fontFamily: 'Outfit' } },
            max: 100,
            labels: {
                formatter: function (val) {
                    return Math.round(val);
                },
                style: {
                    fontFamily: 'Outfit'
                }
            }
        },
        fill: {
            opacity: 1
        },
        legend: {
            position: 'top',
            fontFamily: 'Outfit'
        },
        tooltip: {
            y: {
                formatter: function (val) {
                    return val.toFixed(2) + " %";
                }
            }
        }
    };
    
    CHARTS.ranking = new ApexCharts(document.querySelector("#models-bar-chart"), options);
    CHARTS.ranking.render();
}

/**
 * Renders the prediction probability bar chart for single inference
 */
function renderPredictionProbabilities(probMap) {
    const classes = Object.keys(probMap);
    const probabilities = Object.values(probMap).map(p => p * 100);
    
    if (CHARTS.prediction) {
        CHARTS.prediction.destroy();
    }
    
    const options = {
        series: [{
            name: 'Probability (%)',
            data: probabilities
        }],
        chart: {
            type: 'bar',
            height: 180,
            toolbar: { show: false }
        },
        plotOptions: {
            bar: {
                borderRadius: 4,
                horizontal: true,
                barHeight: '40%'
            }
        },
        colors: [PALETTE.pink],
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return val.toFixed(1) + "%";
            },
            style: { fontFamily: 'Outfit' }
        },
        xaxis: {
            categories: classes,
            max: 100,
            labels: { show: false }
        },
        yaxis: {
            labels: { style: { fontFamily: 'Outfit', fontWeight: 600 } }
        },
        grid: { show: false },
        tooltip: {
            y: {
                formatter: function (val) {
                    return val.toFixed(2) + "%";
                }
            }
        }
    };
    
    CHARTS.prediction = new ApexCharts(document.querySelector("#pred-dist-chart"), options);
    CHARTS.prediction.render();
}
