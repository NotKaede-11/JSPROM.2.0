class MobileMetricsAnalyzer {
    constructor() {
        this.numericColumns = new Map();
        this.initializeElements();
        this.addEventListeners();
        this.initializeTabs();
    }

    initializeElements() {
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.fileName = document.getElementById('fileName');
        this.column1 = document.getElementById('column1');
        this.column2 = document.getElementById('column2');
        this.column3 = document.getElementById('column3');
        this.column3Group = document.getElementById('column3Group');
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.results = document.getElementById('results');
    }

    addEventListeners() {
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.clearBtn.addEventListener('click', () => this.resetAnalyzer());
        this.analyzeBtn.addEventListener('click', () => this.performAnalysis());
    }

    initializeTabs() {
        const tabs = document.querySelectorAll('.tab-button');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const type = tab.dataset.type;
                this.column3Group.style.display = type === 'average' ? 'block' : 'none';
                this.column3.disabled = type === 'basic';
            });
        });
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showError('Please select a CSV file');
            return;
        }

        this.fileName.textContent = file.name;
        this.processCSVFile(file);
    }

    async processCSVFile(file) {
        try {
            const text = await file.text();
            const rows = text.split('\n').map(row => row.split(','));
            const headers = rows[0];
            
            this.numericColumns.clear();
            headers.forEach((header, index) => {
                const values = rows.slice(1)
                    .map(row => this.extractNumber(row[index]))
                    .filter(val => val !== null);
                
                if (values.length > 0) {
                    this.numericColumns.set(header.trim(), values);
                }
            });

            this.updateColumnSelectors();
            this.enableAnalysis();
        } catch (error) {
            this.showError('Error processing file: ' + error.message);
        }
    }

    extractNumber(value) {
        if (!value) return null;
        const number = parseFloat(value.replace(/[^0-9.-]/g, ''));
        return isNaN(number) ? null : number;
    }

    updateColumnSelectors() {
        const columns = Array.from(this.numericColumns.keys());
        [this.column1, this.column2, this.column3].forEach((select, index) => {
            select.innerHTML = columns.map(col => 
                `<option value="${col}">${col}</option>`
            ).join('');
            if (index < columns.length) {
                select.selectedIndex = index;
            }
        });
    }

    enableAnalysis() {
        this.column1.disabled = false;
        this.column2.disabled = false;
        this.column3.disabled = false;
        this.analyzeBtn.disabled = false;
    }

    calculateCorrelation(x, y) {
        const n = x.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

        for (let i = 0; i < n; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumX2 += x[i] * x[i];
            sumY2 += y[i] * y[i];
        }

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        
        return denominator === 0 ? 0 : numerator / denominator;
    }

    performAnalysis() {
        const col1Data = this.numericColumns.get(this.column1.value);
        const col2Data = this.numericColumns.get(this.column2.value);
        const isBasic = document.querySelector('.tab-button.active').dataset.type === 'basic';
        
        if (isBasic) {
            const correlation = this.calculateCorrelation(col1Data, col2Data);
            this.displayResults(`Correlation between ${this.column1.value} and ${this.column2.value}: ${correlation.toFixed(4)}`);
        } else {
            const col3Data = this.numericColumns.get(this.column3.value);
            const corr12 = this.calculateCorrelation(col1Data, col2Data);
            const corr23 = this.calculateCorrelation(col2Data, col3Data);
            const corr13 = this.calculateCorrelation(col1Data, col3Data);
            
            this.displayResults({
                correlations: [
                    { pair: `${this.column1.value} vs ${this.column2.value}`, value: corr12.toFixed(4) },
                    { pair: `${this.column2.value} vs ${this.column3.value}`, value: corr23.toFixed(4) },
                    { pair: `${this.column1.value} vs ${this.column3.value}`, value: corr13.toFixed(4) }
                ],
                average: ((corr12 + corr23 + corr13) / 3).toFixed(4)
            });
        }
    }

    displayResults(data) {
        let html = '';
        
        if (typeof data === 'string') {
            const [description, value] = data.split(': ');
            html = `
                <div class="correlation-result">
                    <div class="result-header">Correlation Analysis</div>
                    <div class="result-detail">${description}</div>
                    <div class="result-value">${value}</div>
                </div>
            `;
        } else {
            html = `
                <div class="correlation-result">
                    <div class="result-header">Detailed Correlation Analysis</div>
                    <div class="result-detail">Individual Correlations:</div>
                    ${data.correlations.map(corr => `
                        <div class="result-detail">${corr.pair}: 
                            <span class="result-value">${corr.value}</span>
                        </div>
                    `).join('')}
                    <div class="result-detail">Average Correlation:</div>
                    <div class="result-value">${data.average}</div>
                </div>
            `;
        }
        
        this.results.innerHTML = html;
    }

    resetAnalyzer() {
        this.fileInput.value = '';
        this.fileName.textContent = 'No file selected';
        this.numericColumns.clear();
        this.column1.disabled = true;
        this.column2.disabled = true;
        this.column3.disabled = true;
        this.analyzeBtn.disabled = true;
        this.results.innerHTML = '';
    }

    showError(message) {
        alert(message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MobileMetricsAnalyzer();
});
