class MobileMetricsAnalyzer {
    constructor() {
        this.numericColumns = new Map();
        this.initializeElements();
        this.addEventListeners();
        this.initializeTabs();
        this.initializeThemeToggle();
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

    initializeThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        const icon = themeToggle.querySelector('i');
        
        themeToggle.addEventListener('click', () => {
            const root = document.documentElement;
            const currentTheme = root.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            root.setAttribute('data-theme', newTheme);
            icon.className = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
            
            localStorage.setItem('theme', newTheme);
        });
        
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        icon.className = savedTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
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
            
            // Use PapaParse for proper CSV handling
            const results = Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                transform: (value) => this.extractNumber(value)
            });

            if (results.errors.length > 0) {
                this.showError('Error parsing CSV: ' + results.errors[0].message);
                return;
            }

            const headers = results.meta.fields;
            const dataRows = results.data;

            this.numericColumns.clear();
            headers.forEach(header => {
                const values = dataRows
                    .map(item => item[header])
                    .filter(val => val !== null && !isNaN(val) && isFinite(val));

                // Match Java's minimum data threshold (10 values)
                if (values.length >= 10) {
                    this.numericColumns.set(header.trim(), values);
                }
            });

            if (this.numericColumns.size === 0) {
                this.showError('No columns with sufficient numeric data found');
                return;
            }

            this.updateColumnSelectors();
            this.enableAnalysis();
        } catch (error) {
            this.showError('Error processing file: ' + error.message);
        }
    }

    extractNumber(value) {
        if (!value) return null;
        // Handle quoted numbers and currency formats
        const cleanValue = String(value)
            .replace(/["$,]/g, '')  // Remove quotes, currency symbols, and commas
            .replace(/[^\d.-]/g, ''); // Remove remaining non-numeric characters
        
        const number = parseFloat(cleanValue);
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
        const meanX = x.reduce((a, b) => a + b) / n;
        const meanY = y.reduce((a, b) => a + b) / n;
        
        const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
        const denomX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0));
        const denomY = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0));
        
        return denomX * denomY === 0 ? 0 : numerator / (denomX * denomY);
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
            
            // Handle potential NaN values
            const average = (corr12 + corr23 + corr13) / 3;
            this.displayResults({
                correlations: [
                    { pair: `${this.column1.value} vs ${this.column2.value}`, value: corr12.toFixed(4) },
                    { pair: `${this.column2.value} vs ${this.column3.value}`, value: corr23.toFixed(4) },
                    { pair: `${this.column1.value} vs ${this.column3.value}`, value: corr13.toFixed(4) }
                ],
                average: isNaN(average) ? 'N/A' : average.toFixed(4)
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