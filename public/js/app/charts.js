/**
 * public/js/app/charts.js
 * Chart initialization and real-time update logic.
 * All Chart.js chart instances are created and managed here.
 */

let rawZChart, deltaZChart, frequencyChart, frequencyTimeChart, amplitudeTimeChart;

const CHART_COLORS = {
  blue: 'rgb(59, 130, 246)',
  blueAlpha: 'rgba(59, 130, 246, 0.1)',
  purple: 'rgb(139, 92, 246)',
  purpleAlpha: 'rgba(139, 92, 246, 0.1)',
  green: 'rgb(74, 222, 128)',
  greenAlpha: 'rgba(74, 222, 128, 0.1)',
  grid: 'rgba(75, 85, 99, 0.2)',
  tick: 'rgb(156, 163, 175)'
};

const BASE_SCALE = {
  ticks: { color: CHART_COLORS.tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
  grid: { color: CHART_COLORS.grid }
};

const BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  elements: { line: { tension: 0.2 }, point: { radius: 0 } },
  plugins: { legend: { display: false } },
  scales: { x: { ...BASE_SCALE }, y: { ...BASE_SCALE, beginAtZero: true, ticks: { ...BASE_SCALE.ticks, maxTicksLimit: 8 } } }
};

const TIME_SERIES_OPTIONS = {
  ...BASE_OPTIONS,
  elements: {
    line: {
      tension: 0.45,
      cubicInterpolationMode: 'monotone'
    },
    point: { radius: 0 }
  }
};

export function initCharts() {
  rawZChart = new Chart(document.getElementById('rawZChart').getContext('2d'), {
    type: 'line',
    data: { 
      labels: [], 
      datasets: [{ 
        label: 'Raw Z (g)', 
        data: [], 
        borderColor: CHART_COLORS.blue, 
        backgroundColor: CHART_COLORS.blueAlpha, 
        borderWidth: 2,
        pointRadius: 0,
        pointHitRadius: 0,
        showLine: true
      }] 
    },
    options: { ...BASE_OPTIONS }
  });

  deltaZChart = new Chart(document.getElementById('deltaZChart').getContext('2d'), {
    type: 'line',
    data: { 
      labels: [], 
      datasets: [{ 
        label: 'Delta Z (g)', 
        data: [], 
        borderColor: CHART_COLORS.purple, 
        backgroundColor: CHART_COLORS.purpleAlpha, 
        borderWidth: 2,
        pointRadius: 0,
        pointHitRadius: 0,
        showLine: true
      }] 
    },
    options: { ...BASE_OPTIONS }
  });

  frequencyChart = new Chart(document.getElementById('frequencyChart').getContext('2d'), {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Magnitude', data: [], borderColor: CHART_COLORS.green, backgroundColor: CHART_COLORS.greenAlpha, borderWidth: 2, pointRadius: 1 }] },
    options: {
      ...BASE_OPTIONS,
      elements: { line: { tension: 0.15 }, point: { radius: 1 } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { title: items => items[0].label + ' Hz' } } },
      scales: {
        x: { ...BASE_SCALE, title: { display: true, text: 'Frequency (Hz)', color: CHART_COLORS.tick } },
        y: { ...BASE_SCALE, beginAtZero: true, title: { display: true, text: 'Magnitude', color: CHART_COLORS.tick } }
      }
    }
  });

  const freqTimeCtx = document.getElementById('frequencyTimeChart')?.getContext('2d');
  if (freqTimeCtx) {
    frequencyTimeChart = new Chart(freqTimeCtx, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Frequency (Hz)', data: [], borderColor: CHART_COLORS.blue, backgroundColor: CHART_COLORS.blueAlpha, borderWidth: 2, pointRadius: 1 }] },
      options: { ...TIME_SERIES_OPTIONS, scales: { x: { ...BASE_SCALE, title: { display: true, text: 'Time', color: CHART_COLORS.tick } }, y: { ...BASE_SCALE, beginAtZero: true, title: { display: true, text: 'Hz', color: CHART_COLORS.tick } } } }
    });
  }

  const ampTimeCtx = document.getElementById('amplitudeTimeChart')?.getContext('2d');
  if (ampTimeCtx) {
    amplitudeTimeChart = new Chart(ampTimeCtx, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Amplitude', data: [], borderColor: CHART_COLORS.purple, backgroundColor: CHART_COLORS.purpleAlpha, borderWidth: 2, pointRadius: 1 }] },
      options: { ...TIME_SERIES_OPTIONS, scales: { x: { ...BASE_SCALE, title: { display: true, text: 'Time', color: CHART_COLORS.tick } }, y: { ...BASE_SCALE, beginAtZero: true, title: { display: true, text: 'Amplitude', color: CHART_COLORS.tick } } } }
    });
  }

  console.log('[Charts] Initialized successfully with Monotone Cubic Spline curves');
}

export function pushChartData(chart, label, value, maxPoints = 50) {
  if (chart.data.labels.length >= maxPoints) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.data.labels.push(label);
  chart.data.datasets[0].data.push(value);
  chart.update('none');
}

export function updateVibrationCharts(data) {
  const ts = new Date(data.timestamp || Date.now()).toLocaleTimeString();
  pushChartData(rawZChart, ts, data.rawAcceleration || 0);
  pushChartData(deltaZChart, ts, data.deltaZ || 0);

  if (frequencyTimeChart && data.frequency) pushChartData(frequencyTimeChart, ts, data.frequency);
  if (amplitudeTimeChart && data.amplitude) pushChartData(amplitudeTimeChart, ts, data.amplitude);
}

export function updateFrequencySpectrum(frequencies, magnitudes) {
  if (!frequencyChart || !frequencies || !magnitudes) return;
  frequencyChart.data.labels = frequencies.map(f => parseFloat(f).toFixed(1));
  frequencyChart.data.datasets[0].data = magnitudes;
  frequencyChart.update('none');
}


export function loadHistoricalCharts(vibData, frequencyData) {
  clearAllCharts();

  const timestamps = vibData.map(p => new Date(p.timestamp || p.receivedAt).toLocaleTimeString());

  rawZChart.data.labels = timestamps;
  rawZChart.data.datasets[0].data = vibData.map(p => p.rawAcceleration || 0);
  rawZChart.update();

  deltaZChart.data.labels = timestamps;
  deltaZChart.data.datasets[0].data = vibData.map(p => p.deltaZ || 0);
  deltaZChart.update();

  if (frequencyData?.frequencies?.length) {
    frequencyChart.data.labels = frequencyData.frequencies.map(f => parseFloat(f).toFixed(1));
    frequencyChart.data.datasets[0].data = frequencyData.magnitudes || frequencyData.amplitudes;
    frequencyChart.update();
  }

  if (frequencyTimeChart) {
    frequencyTimeChart.data.labels = timestamps;
    frequencyTimeChart.data.datasets[0].data = vibData.map(p => p.frequency || 0);
    frequencyTimeChart.update();
  }

  if (amplitudeTimeChart) {
    amplitudeTimeChart.data.labels = timestamps;
    amplitudeTimeChart.data.datasets[0].data = vibData.map(p => p.amplitude || 0);
    amplitudeTimeChart.update();
  }
}

export function clearAllCharts() {
  [rawZChart, deltaZChart, frequencyChart, frequencyTimeChart, amplitudeTimeChart].forEach(c => {
    if (!c) return;
    c.data.labels = [];
    c.data.datasets[0].data = [];
    c.update();
  });
}
