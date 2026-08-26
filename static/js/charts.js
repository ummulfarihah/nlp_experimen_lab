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
            height: 125,
            sparkline: { enabled: true }
        },
        plotOptions: {
            radialBar: {
                startAngle: -90,
                endAngle: 90,
                track: {
                    background: PALETTE.gray,
                    strokeWidth: '97%',
                    margin: 4,
                },
                dataLabels: {
                    name: { show: false },
                    value: {
                        offsetY: -2,
                        fontSize: '16px',
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
            type: 'gradient',
            gradient: {
                shade: 'light',
                type: 'horizontal',
                shadeIntensity: 0.5,
                gradientToColors: ['#8E7CC3'],
                inverseColors: false,
                opacityFrom: 1,
                opacityTo: 1,
                stops: [0, 100]
            }
        },
        stroke: {
            lineCap: 'round'
        },
        responsive: [{
            breakpoint: 640,
            options: {
                chart: { height: 105 },
                plotOptions: {
                    radialBar: {
                        dataLabels: {
                            value: { fontSize: '13px', offsetY: -2 }
                        }
                    }
                }
            }
        }]
    };

    const containerEl = document.querySelector(containerId);
    if (!containerEl) return null;

    const chart = new ApexCharts(containerEl, options);
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
/**
 * Renders dataset class distribution donut chart (Expanded Ring without Legend)
 */
function renderDatasetDonut(classDist) {
    const labels = Object.keys(classDist).map(l => {
        const name = isNaN(l) ? l : "Kelas " + l;
        return name.charAt(0).toUpperCase() + name.slice(1);
    });
    const series = Object.values(classDist);
    
    if (CHARTS.dataset) {
        CHARTS.dataset.destroy();
    }
    
    const options = {
        series: series,
        chart: {
            type: 'donut',
            height: 320,
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
            width: 4,
            colors: ['#ffffff']
        },
        plotOptions: {
            pie: {
                expandOnClick: true,
                donut: {
                    size: '60%',
                    background: 'transparent',
                    labels: {
                        show: true,
                        name: {
                            show: true,
                            fontSize: '14px',
                            fontFamily: 'Outfit',
                            fontWeight: 600,
                            color: '#E94F9A',
                            offsetY: -4
                        },
                        value: {
                            show: true,
                            fontSize: '22px',
                            fontFamily: 'Outfit',
                            fontWeight: 800,
                            color: '#2D2230',
                            offsetY: 6,
                            formatter: function (val) {
                                return Number(val).toLocaleString('id-ID');
                            }
                        },
                        total: {
                            show: true,
                            showAlways: false,
                            label: 'Total Data',
                            fontSize: '13px',
                            fontFamily: 'Outfit',
                            fontWeight: 700,
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
        states: {
            normal: {
                filter: { type: 'none' }
            },
            hover: {
                filter: {
                    type: 'darken',
                    value: 0.88
                }
            },
            active: {
                allowMultipleDataPointsSelection: false,
                filter: {
                    type: 'none'
                }
            }
        },
        legend: {
            show: false
        },
        dataLabels: {
            enabled: true,
            formatter: function(val) {
                return val.toFixed(1) + '%';
            },
            style: {
                fontSize: '13px',
                fontFamily: 'Outfit',
                fontWeight: '700',
                colors: ['#ffffff']
            },
            background: {
                enabled: false
            },
            dropShadow: {
                enabled: true,
                top: 1,
                left: 1,
                blur: 3,
                color: '#000000',
                opacity: 0.5
            }
        },
        tooltip: {
            enabled: true,
            theme: 'light',
            fillSeriesColor: false,
            shared: false,
            intersect: true,
            followCursor: true,
            style: {
                fontSize: '13px',
                fontFamily: 'Outfit'
            },
            y: {
                formatter: function (val, opts) {
                    const total = opts.globals.seriesTotals.reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                    return Number(val).toLocaleString('id-ID') + " baris (" + pct + "%)";
                }
            }
        },
        responsive: [
            {
                breakpoint: 768,
                options: {
                    chart: {
                        height: 280
                    }
                }
            }
        ]
    };
    
    const containerEl = document.querySelector("#dataset-class-chart");
    if (!containerEl) return;

    CHARTS.dataset = new ApexCharts(containerEl, options);
    CHARTS.dataset.render();
}

/**
 * Renders model evaluation comparison horizontal bar chart (Top 10 Models)
 */
function renderModelComparisons(models) {
    if (!models || models.length === 0) return;
    
    // Display Top 10 best performing models
    const topModels = models.slice(0, 10);
    
    const names = topModels.map(m => m.exp_name);
    const accuracies = topModels.map(m => Number((m.accuracy * 100).toFixed(1)));
    const f1s = topModels.map(m => Number((m.macro_f1 * 100).toFixed(1)));
    
    if (CHARTS.ranking) {
        CHARTS.ranking.destroy();
    }
    
    // Dynamic height based on number of models for optimal spacing
    const chartHeight = Math.max(300, Math.min(540, topModels.length * 48));
    
    const options = {
        series: [
            { name: 'Accuracy (%)', data: accuracies },
            { name: 'Macro F1 (%)', data: f1s }
        ],
        chart: {
            type: 'bar',
            height: chartHeight,
            toolbar: { show: false },
            fontFamily: 'Outfit, sans-serif'
        },
        plotOptions: {
            bar: {
                horizontal: true,
                barHeight: '65%',
                borderRadius: 5
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
            title: {
                text: 'Performa (%)',
                style: { fontFamily: 'Outfit', fontSize: '12px', fontWeight: 600, color: '#7A687F' }
            },
            max: 100,
            labels: { 
                formatter: function (val) {
                    return Math.round(val) + '%';
                },
                style: { 
                    fontFamily: 'Outfit',
                    fontSize: '11px',
                    fontWeight: 500,
                    colors: '#7A687F'
                } 
            }
        },
        yaxis: {
            labels: {
                style: {
                    fontFamily: 'Outfit',
                    fontSize: '12px',
                    fontWeight: 600,
                    colors: '#2D2230'
                }
            }
        },
        grid: {
            borderColor: 'rgba(255, 123, 167, 0.12)',
            strokeDashArray: 4,
            xaxis: {
                lines: { show: true }
            },
            yaxis: {
                lines: { show: false }
            }
        },
        fill: {
            opacity: 1
        },
        legend: {
            position: 'top',
            horizontalAlign: 'center',
            fontFamily: 'Outfit',
            fontWeight: 600,
            fontSize: '12px',
            markers: {
                radius: 4
            }
        },
        tooltip: {
            enabled: true,
            theme: 'light',
            shared: true,
            intersect: false,
            style: {
                fontSize: '12px',
                fontFamily: 'Outfit'
            },
            y: {
                formatter: function (val) {
                    return val.toFixed(2) + " %";
                }
            }
        },
        responsive: [
            {
                breakpoint: 640,
                options: {
                    chart: {
                        height: Math.max(280, Math.min(500, topModels.length * 44))
                    },
                    plotOptions: {
                        bar: {
                            barHeight: '72%'
                        }
                    },
                    yaxis: {
                        labels: {
                            style: {
                                fontSize: '11px'
                            }
                        }
                    }
                }
            }
        ]
    };
    
    const containerEl = document.querySelector("#models-bar-chart");
    if (!containerEl) return;

    CHARTS.ranking = new ApexCharts(containerEl, options);
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
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'light',
                type: 'horizontal',
                shadeIntensity: 0.5,
                gradientToColors: ['#8E7CC3'],
                inverseColors: false,
                opacityFrom: 1,
                opacityTo: 1,
                stops: [0, 100]
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return val.toFixed(1) + "%";
            },
            style: { fontSize: '10px', colors: ['#333333'], fontFamily: 'Outfit' }
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
            fixed: {
                enabled: true,
                position: 'topCenter',
                offsetX: 0,
                offsetY: 0
            },
            y: {
                formatter: function (val) {
                    return val.toFixed(2) + "%";
                }
            }
        }
    };
    
    const predContainerEl = document.querySelector("#pred-dist-chart");
    if (!predContainerEl) return;

    CHARTS.prediction = new ApexCharts(predContainerEl, options);
    CHARTS.prediction.render();
}
