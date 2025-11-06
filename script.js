document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM Elements ---
    const algoSelect = document.getElementById('algo-select');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const randomBtn = document.getElementById('random-btn');
    const loadBtn = document.getElementById('load-btn');
    const arrayInput = document.getElementById('array-input');
    const inputError = document.getElementById('input-error');
    const speedSlider = document.getElementById('speed-slider');
    const visArea = document.getElementById('visualization-area');
    const subArea = document.getElementById('sub-area');
    const subAreaTitle = document.getElementById('sub-area-title');
    const statusBarText = document.getElementById('status-text');
    const helpBtn = document.getElementById('help-btn');
    const infoModal = document.getElementById('info-modal');
    const closeInfoBtn = document.getElementById('close-info-btn');
    const infoTitle = document.getElementById('info-title');
    const infoSteps = document.getElementById('info-steps');

    // --- State ---
    let mainArray = [];
    let isSorting = false;
    let maxVal = 99;
    let isPaused = false;
    let pauseResolver = null;
    let maxDigits = 1;
    let isDecimalArray = false;

    // --- Utility Functions ---

    function setupNewArray(newArray) {
        if (!newArray || newArray.length === 0) {
            inputError.textContent = 'Array cannot be empty.';
            return;
        }

        mainArray = [...newArray];
        maxVal = Math.max(...mainArray);
        if (maxVal === 0) maxVal = 1;
        maxDigits = (maxVal === 0) ? 1 : Math.floor(Math.log10(maxVal)) + 1;
        isDecimalArray = newArray.some(num => num % 1 !== 0);

        renderBars(visArea, mainArray);
        clearSubArea();
        subArea.classList.remove('column-view');
        updateStatus('Array loaded. Select an algorithm and press "Start".');
        setControls(true);
        inputError.textContent = '';
    }

    function generateRandomArray() {
        isDecimalArray = false; 
        const newArr = [];
        const size = 20;
        const max = 99;
        for (let i = 0; i < size; i++) {
            newArr.push(Math.floor(Math.random() * (max + 1)));
        }
        setupNewArray(newArr);
    }

    function loadArrayFromInput() {
        const inputText = arrayInput.value.trim();
        inputError.textContent = '';

        if (inputText === '') {
            inputError.textContent = 'Please enter some numbers.';
            return;
        }

        const stringArray = inputText.split(',');
        const numberArray = [];

        for (const item of stringArray) {
            const num = parseFloat(item.trim());
            
            if (isNaN(num) || num < 0) {
                inputError.textContent = `Invalid input: "${item.trim()}". Only positive numbers and commas.`;
                return;
            }
            numberArray.push(num);
        }

        setupNewArray(numberArray);
    }

    function renderBars(container, array, highlightDigit = -1) {
        container.innerHTML = '';
        
        for (let i = 0; i < array.length; i++) {
            const bar = document.createElement('div');
            bar.classList.add('bar');
            
            const height = (array[i] / maxVal) * 100;
            bar.style.height = `${Math.max(height, 5)}%`; 
            bar.style.width = `${100 / array.length}%`;
            
            if (highlightDigit > 0) {
                const digit = Math.floor(array[i] / highlightDigit) % 10;
                bar.innerText = digit;
                bar.title = `Value: ${array[i]}, Digit: ${digit}`;
                bar.style.backgroundColor = `hsl(${digit * 36}, 70%, 50%)`; 
            } else {
                // --- CHANGED to toFixed(3) ---
                bar.innerText = (array[i] % 1 !== 0) ? array[i].toFixed(3) : array[i];
                bar.title = `Value: ${array[i]}`;
                bar.style.backgroundColor = '';
            }
            
            bar.dataset.value = array[i];
            bar.dataset.id = i;
            container.appendChild(bar);
        }
    }

    function updateBar(bar, value) {
        const height = (value / maxVal) * 100;
        bar.style.height = `${Math.max(height, 5)}%`;
        // --- CHANGED to toFixed(3) ---
        bar.innerText = (value % 1 !== 0) ? value.toFixed(3) : value;
        bar.dataset.value = value;
    }

    function clearSubArea() {
        subArea.innerHTML = '';
        subAreaTitle.innerText = '';
    }

    function updateStatus(text) {
        statusBarText.innerHTML = text;
    }

    async function sleep() {
        if (isPaused) {
            const originalText = statusBarText.innerHTML;
            updateStatus(originalText + "<br><strong>-- PAUSED --</strong>");
            
            await new Promise(resolve => {
                pauseResolver = resolve;
            });

            updateStatus(originalText);
        }

        if (!isSorting) return;
        
        await new Promise(resolve => setTimeout(resolve, speedSlider.value));
    }

    function setControls(enabled) {
        isSorting = !enabled;
        
        startBtn.disabled = !enabled;
        algoSelect.disabled = !enabled;
        pauseBtn.disabled = enabled;
        
        if (enabled) {
            isPaused = false;
            pauseBtn.innerText = 'Pause';
            pauseBtn.classList.remove('btn-pause-active');
            if (pauseResolver) {
                pauseResolver();
                pauseResolver = null;
            }
        }
    }

    function getBars(container = visArea) {
        return container.getElementsByClassName('bar');
    }

    // --- Event Listeners ---
    startBtn.addEventListener('click', () => {
        const algorithm = algoSelect.value;
        
        if (isDecimalArray && (algorithm === 'counting' || algorithm === 'radix')) {
            updateStatus(`<b>Error:</b> Counting Sort and Radix Sort only work with <b>integers</b>.
                <br>Your array has decimals. Please use <b>Bucket Sort</b> or load a new array.`);
            setControls(true);
            return;
        }

        const k_LIMIT = 500; 
        if ((algorithm === 'counting' && maxVal > k_LIMIT)) {
            updateStatus(`<b>Error:</b> Max value (<b>k = ${Math.floor(maxVal)}</b>) is too large for ${algorithm}.
                This sort is only efficient for small ranges (e.g., <b>k &le; ${k_LIMIT}</b>).
                <br>Please try <b>Radix Sort</b> instead, or load a new array.`);
            setControls(true);
            return;
        }

        setControls(false);
        
        switch (algorithm) {
            case 'counting':
                countingSortVisual();
                break;
            case 'bucket':
                bucketSortVisual();
                break;
            case 'radix':
                radixSortVisual();
                break;
        }
    });

    randomBtn.addEventListener('click', generateRandomArray);
    loadBtn.addEventListener('click', loadArrayFromInput);

    pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        
        if (isPaused) {
            pauseBtn.innerText = 'Resume';
            pauseBtn.classList.add('btn-pause-active');
        } else {
            pauseBtn.innerText = 'Pause';
            pauseBtn.classList.remove('btn-pause-active');
            
            if (pauseResolver) {
                pauseResolver();
                pauseResolver = null;
            }
        }
    });
    
    helpBtn.addEventListener('click', () => {
        populateHelpModal(algoSelect.value);
        infoModal.classList.remove('hidden');
    });

    closeInfoBtn.addEventListener('click', () => {
        infoModal.classList.add('hidden');
    });

    infoModal.addEventListener('click', (e) => {
        if (e.target === infoModal) {
            infoModal.classList.add('hidden');
        }
    });

    function populateHelpModal(algoName) {
         switch (algoName) {
            case 'counting':
                infoTitle.innerText = 'Counting Sort';
                infoSteps.innerHTML = `
                    <p>Counting Sort is an integer sorting algorithm. <b>It does not work with decimals.</b> It assumes each element is a non-negative integer in a known range (<b>k</b>).</p>
                    <ul>
                        <li><b>Phase 1: Counting</b>
                            <p>The algorithm creates a new 'count' array of size <b>k+1</b>. It iterates through the main array, and for each value, it increments the corresponding index in the 'count' array.</p>
                        </li>
                        <li><b>Phase 2: Placing</b>
                            <p>It iterates through the 'count' array (from 0 to k). For each index, it reads the count and places that many elements (of value <b>index</b>) back into the main array in order.</p>
                        </li>
                        <li><b>Time:</b> <b>O(n + k)</b></li>
                        <li><b>Space:</b> <b>O(k)</b></li>
                    </ul>
                `;
                break;
            case 'bucket':
                infoTitle.innerText = 'Bucket Sort';
                infoSteps.innerHTML = `
                    <p>Bucket Sort works by distributing elements into a number of 'buckets'. Each bucket is then sorted individually. <b>This is the only sort here that works with decimals.</b></p>
                    <ul>
                        <li><b>Phase 1: Create Buckets</b>
                            <p>Finds the <b>min</b> and <b>max</b> values in the array. It then creates 10 empty buckets, each responsible for an equal part of the range (e.g., <b>[min]...[max]</b>).</p>
                        </li>
                        <li><b>Phase 2: Distribute</b>
                            <p>The algorithm iterates through the main array. It calculates which bucket each value belongs to based on its position in the <b>min-max</b> range and places it inside.</p>
                        </li>
                        <li><b>Phase 3: Sort Buckets</b>
                            <p>Each non-empty bucket is sorted. This visualizer uses <b>Insertion Sort</b> for this, which is efficient for small lists.</p>
                        </li>
                        <li><b>Phase 4: Concatenate</b>
                            <p>All sorted buckets are joined back together in order to form the final, sorted array.</p>
                        </li>
                        <li><b>Time:</b> <b>O(n + k)</b> (Average)</li>
                    </ul>
                `;
                break;
            case 'radix':
                infoTitle.innerText = 'Radix Sort (LSD)';
                infoSteps.innerHTML = `
                    <p>Radix Sort is a non-comparative integer sorting algorithm. <b>It does not work with decimals.</b> This (LSD) version sorts integers by processing individual digits, starting from the right-most (1's) to the left-most (100's, etc.).</p>
                    <ul>
                        <li><b>Pass 1 (1's Digit)</b>
                            <p>Sorts the entire array *stably* based only on the 1's digit. The visualization shows this using <b>Counting Sort</b> as the subroutine.</p>
                        </li>
                        <li><b>Pass 2 (10's Digit)</b>
                            <p>Sorts the *already-sorted* array based only on the 10's digit. Because the sort is stable, elements with the same 10's digit (e.g., 25, 21) will keep their order from the previous pass (21 will come before 25).</p>
                        </li>
                        <li><b>Pass 3+ (100's...)</b>
                            <p>This continues for all digits until the array is fully sorted.</p>
                        </li>
                        <li><b>Time:</b> <b>O(d * (n + k))</b> where <b>d</b> is the number of digits in the max number.</li>
                    </ul>
                `;
                break;
        }
    }


    // --- Sorting Algorithms ---

    /**
     * 1. COUNTING SORT VISUALIZATION
     */
    async function countingSortVisual() {
        subArea.classList.remove('column-view');

        let k = Math.floor(maxVal);
        updateStatus(`Creating a 'count' array of size <b>k+1</b> (from 0 to ${k}).`);
        await sleep();
        if (!isSorting) return;

        subAreaTitle.innerText = 'Count Array (Indices 0 to ' + k + ')';
        let countArray = new Array(k + 1).fill(0);
        let countCells = [];
        const cellSize = Math.max(10, 50 - Math.floor(k / 5));

        for (let i = 0; i <= k; i++) {
            const cell = document.createElement('div');
            cell.classList.add('count-cell');
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            cell.innerHTML = `
                <div class="count-label">${i}</div>
                <div class="count-value">0</div>
            `;
            subArea.appendChild(cell);
            countCells.push(cell);
        }
        
        updateStatus('<b>Phase 1:</b> Counting occurrences. Iterating the main array and incrementing the count for each value in the \'count\' array.');
        const bars = getBars();
        for (let i = 0; i < mainArray.length; i++) {
            if (!isSorting) return;
            const value = mainArray[i];
            
            bars[i].classList.add('highlight-primary');
            countCells[value].classList.add('highlight-secondary');
            
            await sleep();
            if (!isSorting) return;
            
            countArray[value]++;
            countCells[value].querySelector('.count-value').innerText = countArray[value];
            
            bars[i].classList.remove('highlight-primary');
            countCells[value].classList.remove('highlight-secondary');
        }

        updateStatus('<b>Phase 2:</b> Placing elements. Reading the \'count\' array from left-to-right and placing that many elements back into the main array.');
        let sortedIndex = 0; 

        for (let i = 0; i <= k; i++) {
            if (!isSorting) return;

            countCells[i].classList.add('highlight-primary');
            
            while (countArray[i] > 0) {
                if (!isSorting) return;

                const barToUpdate = bars[sortedIndex];
                mainArray[sortedIndex] = i;
                
                updateBar(barToUpdate, i);
                barToUpdate.classList.add('highlight-secondary');
                
                countArray[i]--;
                countCells[i].querySelector('.count-value').innerText = countArray[i];
                
                await sleep();
                if (!isSorting) return;
                
                barToUpdate.classList.remove('highlight-secondary');
                sortedIndex++;
            }
            
            countCells[i].classList.remove('highlight-primary');
        }

        if (isSorting) {
            updateStatus('Counting Sort Complete. Time: <b>O(n + k)</b>, Space: <b>O(k)</b>');
            setControls(true);
        }
    }


    /**
     * 2. BUCKET SORT VISUALIZATION
     */
    async function bucketSortVisual() {
        subArea.classList.remove('column-view');
        
        const numBuckets = 10;
        
        let min = mainArray[0];
        let max = mainArray[0];
        for (let i = 1; i < mainArray.length; i++) {
            if (mainArray[i] < min) min = mainArray[i];
            if (mainArray[i] > max) max = mainArray[i];
        }
        max += 0.001; // Adjusted epsilon for 3-decimal precision

        const bucketSize = (max - min) / numBuckets;

        updateStatus(`<b>Phase 1:</b> Creating ${numBuckets} dynamic buckets...`);
        await sleep();
        if (!isSorting) return;

        subAreaTitle.innerText = 'Buckets (by value range)';
        let buckets = [];
        let bucketElements = [];
        for (let i = 0; i < numBuckets; i++) {
            buckets.push([]);
            const bucketDiv = document.createElement('div');
            bucketDiv.classList.add('bucket');
            
            // --- CHANGED to toFixed(3) ---
            const rangeStart = min + (i * bucketSize);
            const rangeEnd = min + ((i + 1) * bucketSize);
            const rangeLabel = `[${rangeStart.toFixed(3)} - ${rangeEnd.toFixed(3)})`;

            bucketDiv.dataset.rangeStart = rangeStart.toFixed(3);
            bucketDiv.dataset.rangeEnd = rangeEnd.toFixed(3);
            
            bucketDiv.innerHTML = `<div class="bucket-label">${rangeLabel} <span class="bucket-size">(0)</span></div>`;
            subArea.appendChild(bucketDiv);
            bucketElements.push(bucketDiv);
        }

        updateStatus('<b>Phase 2:</b> Distributing elements into buckets...');
        const bars = getBars();
        for (let i = 0; i < mainArray.length; i++) {
            if (!isSorting) return;
            const value = mainArray[i];
            
            let bucketIndex = Math.floor((value - min) / bucketSize);
            bucketIndex = Math.max(0, Math.min(bucketIndex, numBuckets - 1));

            bars[i].classList.add('highlight-primary');
            bucketElements[bucketIndex].style.backgroundColor = 'var(--primary-color)';
            await sleep();
            if (!isSorting) return;

            buckets[bucketIndex].push(value);

            const sizeSpan = bucketElements[bucketIndex].querySelector('.bucket-size');
            sizeSpan.innerText = `(${buckets[bucketIndex].length})`;

            const newBar = bars[i].cloneNode(true);
            // --- CHANGED to toFixed(3) ---
            newBar.innerText = (value % 1 !== 0) ? value.toFixed(3) : value;
            newBar.style.width = '50px';
            bucketElements[bucketIndex].appendChild(newBar);
            
            bars[i].classList.add('faded');
            
            bars[i].classList.remove('highlight-primary');
            bucketElements[bucketIndex].style.backgroundColor = '';
        }

        updateStatus('<b>Phase 3:</b> Sorting individual buckets (Insertion Sort)...');
        let sortedArray = [];
        for (let i = 0; i < numBuckets; i++) {
            if (!isSorting) return;
            if (buckets[i].length === 0) continue;
            
            bucketElements[i].style.backgroundColor = 'var(--primary-color)';
            await insertionSortInBucket(buckets[i], bucketElements[i]);
            bucketElements[i].style.backgroundColor = '';

            for (let j = 0; j < buckets[i].length; j++) {
                sortedArray.push(buckets[i][j]);
            }
        }
        
        if (isSorting) {
            updateStatus('<b>Phase 4:</b> Concatenating sorted buckets...');
            
            mainArray = [...sortedArray];
            maxVal = Math.max(...mainArray);
            if (maxVal === 0) maxVal = 1;
            
            renderBars(visArea, mainArray);
            
            await sleep();
            if (!isSorting) return;

            updateStatus('Bucket Sort Complete. Average Time: <b>O(n + k)</b>');
            setControls(true);
        }
    }
    
    /**
     * Helper for Bucket Sort: Visual Insertion Sort inside a bucket
     */
    async function insertionSortInBucket(bucketArray, bucketElement) {
        const bucketBars = bucketElement.getElementsByClassName('bar');
        for (let i = 1; i < bucketArray.length; i++) {
            if (!isSorting) return;
            let j = i - 1;
            let key = bucketArray[i];
            let keyBar = bucketBars[i];
            
            keyBar.classList.add('highlight-primary');
            
            while (j >= 0 && bucketArray[j] > key) {
                if (!isSorting) return;
                bucketBars[j].classList.add('highlight-secondary');
                
                bucketArray[j + 1] = bucketArray[j];
                bucketElement.insertBefore(bucketBars[j + 1], bucketBars[j]);
                
                await sleep();
                if (!isSorting) return;
                bucketBars[j].classList.remove('highlight-secondary');
                
                j--;
            }
            bucketArray[j + 1] = key;
            keyBar.classList.remove('highlight-primary');
        }
        if (isSorting) {
            const rangeStart = bucketElement.dataset.rangeStart;
            const rangeEnd = bucketElement.dataset.rangeEnd;
            bucketElement.innerHTML = `<div class="bucket-label">[${rangeStart} - ${rangeEnd}) <span class="bucket-size">(${bucketArray.length})</span></div>`;
            
            for(const val of bucketArray) {
                const newBar = document.createElement('div');
                newBar.classList.add('bar');
                // --- CHANGED to toFixed(3) ---
                newBar.innerText = (val % 1 !== 0) ? val.toFixed(3) : val;
                newBar.style.width = '50px';
                newBar.style.height = `${Math.max((val / maxVal) * 100, 5)}%`;
                bucketElement.appendChild(newBar);
            }
        }
    }


    /**
     * 3. RADIX SORT (LSD) VISUALIZATION
     */
    async function radixSortVisual() {
        updateStatus('Starting Radix Sort (LSD).');
        
        clearSubArea();
        subArea.classList.add('column-view');
        subAreaTitle.innerText = 'Radix Sort Passes (Columns)';
        addRadixColumn(mainArray, "Original Array");

        await sleep();
        if (!isSorting) return;
        
        if (mainArray.length === 0) {
            setControls(true);
            return;
        }

        for (let exp = 1; (maxVal === 0 ? exp === 1 : Math.floor(maxVal / exp) >= 1); exp *= 10) {
            if (!isSorting) return;
            
            renderBars(visArea, mainArray, exp);
            const passNum = Math.floor(Math.log10(exp)) + 1;
            updateStatus(`<b>Pass ${passNum}</b>: Sorting by the <b>${exp}'s</b> digit...`);
            await sleep();
            if (!isSorting) return;
            
            mainArray = countingSortByDigitStable(mainArray, exp);
            
            renderBars(visArea, mainArray);
            updateStatus(`Array is now stable-sorted by the <b>${exp}'s</b> digit.`);
            
            addRadixColumn(mainArray, `Pass ${passNum} (by ${exp}'s)`);

            await sleep();
            if (!isSorting) return;
        }
        
        if (isSorting) {
            updateStatus('Radix Sort Complete. Time: <b>O(d * (n + k))</b>');
            setControls(true);
        }
    }
    
    /**
     * Helper: Adds a text column to the sub-area
     */
    function addRadixColumn(array, title) {
        const columnDiv = document.createElement('div');
        columnDiv.classList.add('radix-column');
        
        const titleEl = document.createElement('h4');
        titleEl.innerText = title;
        columnDiv.appendChild(titleEl);
        
        const numDigits = (maxVal === 0) ? 1 : Math.floor(Math.log10(maxVal)) + 1;
        
        for (const val of array) {
            const numEl = document.createElement('p');
            numEl.innerText = String(val).padStart(numDigits, '0');
            columnDiv.appendChild(numEl);
        }
        
        subArea.appendChild(columnDiv);
    }

    /**
    * Helper for Radix Sort: Stable Counting Sort by digit.
    */
    function countingSortByDigitStable(arr, exp) {
        let n = arr.length;
        let output = new Array(n);
        let count = new Array(10).fill(0);

        for (let i = 0; i < n; i++) {
            const digit = Math.floor(arr[i] / exp) % 10;
            count[digit]++;
        }

        for (let i = 1; i < 10; i++) {
            count[i] += count[i-1];
        }

        for (let i = n - 1; i >= 0; i--) {
            const digit = Math.floor(arr[i] / exp) % 10;
            output[count[digit] - 1] = arr[i];
            count[digit]--;
        }
        
        return output;
    }

    // --- Initial Setup ---
    generateRandomArray();
});
