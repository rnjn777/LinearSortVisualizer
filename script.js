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
    const explanationBox = document.getElementById('explanation-box');

    // --- State ---
    let mainArray = [];
    let isSorting = false;
    let maxVal = 99;
    let isPaused = false;
    let pauseResolver = null;
    let maxDigits = 1;

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


        renderBars(visArea, mainArray);
        clearSubArea();
        subArea.classList.remove('column-view');
        updateExplanation('Array loaded. Select an algorithm and press "Start".');
        setControls(true); // This will stop any active sort
        inputError.textContent = '';
    }

    function generateRandomArray() {
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
            const num = parseInt(item.trim(), 10);
            
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
                bar.innerText = array[i];
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
        bar.innerText = value;
        bar.dataset.value = value;
    }

    function clearSubArea() {
        subArea.innerHTML = '';
        subAreaTitle.innerText = '';
    }

    function updateExplanation(text) {
        explanationBox.innerHTML = `<p>${text}</p>`;
    }

    async function sleep() {
        if (isPaused) {
            const originalText = explanationBox.innerHTML;
            updateExplanation(originalText + "<br><strong>-- PAUSED --</strong>");
            
            await new Promise(resolve => {
                pauseResolver = resolve;
            });

            updateExplanation(originalText);
        }

        // Check if sorting was stopped (e.g., by "Random Array") while paused
        if (!isSorting) return;
        
        await new Promise(resolve => setTimeout(resolve, 1000 - speedSlider.value));
    }

    /**
     * Enables or disables UI controls.
     */
    function setControls(enabled) {
        isSorting = !enabled;
        
        // These are the only controls that need to change
        startBtn.disabled = !enabled;
        algoSelect.disabled = !enabled;
        pauseBtn.disabled = enabled;
        
        // --- MODIFICATION ---
        // The "Random," "Load," and "Input" buttons are
        // now ALWAYS enabled, so they act as reset/exit buttons.
        // ---
        // randomBtn.disabled = !enabled;    <- REMOVED
        // loadBtn.disabled = !enabled;      <- REMOVED
        // arrayInput.disabled = !enabled;   <- REMOVED
        
        // If we are stopping a sort (enabled=true), reset pause state
        if (enabled) {
            isPaused = false;
            pauseBtn.innerText = 'Pause';
            pauseBtn.classList.remove('btn-pause-active');
            if (pauseResolver) {
                pauseResolver(); // Ensure no lingering pauses
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
        
        const k_LIMIT = 500; 
        
        if ((algorithm === 'counting' && maxVal > k_LIMIT) || (algorithm === 'bucket' && maxVal > k_LIMIT * 10)) {
            updateExplanation(`<b>Error:</b> Max value (<b>k = ${maxVal}</b>) is too large for ${algorithm}.
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


    // --- Sorting Algorithms ---

    /**
     * 1. COUNTING SORT VISUALIZATION
     */
    async function countingSortVisual() {
        subArea.classList.remove('column-view');

        updateExplanation(`Starting Counting Sort. Max value <b>k = ${maxVal}</b>.`);
        await sleep();
        if (!isSorting) return; // Check if user exited

        // --- Phase 1: Counting ---
        subAreaTitle.innerText = 'Count Array (Indices 0 to ' + maxVal + ')';
        let countArray = new Array(maxVal + 1).fill(0);
        let countCells = [];
        const cellSize = Math.max(10, 50 - Math.floor(maxVal / 5));

        for (let i = 0; i <= maxVal; i++) {
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
        
        updateExplanation('<b>Phase 1:</b> Counting occurrences of each element.');
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

        // --- Phase 2: Placing ---
        updateExplanation('<b>Phase 2:</b> Placing elements back into the array based on counts.');
        let sortedIndex = 0; 

        for (let i = 0; i <= maxVal; i++) {
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

        if (isSorting) { // Only show complete if it wasn't interrupted
            updateExplanation('Counting Sort Complete. <b>O(n + k)</b>');
            setControls(true);
        }
    }


    /**
     * 2. BUCKET SORT VISUALIZATION
     */
    async function bucketSortVisual() {
        subArea.classList.remove('column-view');

        const numBuckets = Math.floor(maxVal / 10) + 1;
        updateExplanation(`Starting Bucket Sort with ${numBuckets} buckets.`);
        await sleep();
        if (!isSorting) return;

        subAreaTitle.innerText = 'Buckets (by value range)';
        let buckets = [];
        let bucketElements = [];
        for (let i = 0; i < numBuckets; i++) {
            buckets.push([]);
            const bucketDiv = document.createElement('div');
            bucketDiv.classList.add('bucket');
            
            const rangeStart = i * 10;
            const rangeEnd = (i === numBuckets - 1) ? maxVal : (i * 10) + 9;
            const rangeLabel = `${rangeStart}-${rangeEnd}`;

            bucketDiv.innerHTML = `<div class="bucket-label">${rangeLabel} <span class="bucket-size">(0)</span></div>`;
            subArea.appendChild(bucketDiv);
            bucketElements.push(bucketDiv);
        }

        updateExplanation('Distributing elements into buckets.');
        const bars = getBars();
        for (let i = 0; i < mainArray.length; i++) {
            if (!isSorting) return;
            const value = mainArray[i];
            
            const bucketIndex = Math.floor(value / 10);
            
            bars[i].classList.add('highlight-primary');
            bucketElements[bucketIndex].style.backgroundColor = 'var(--primary-color)';
            await sleep();
            if (!isSorting) return;

            buckets[bucketIndex].push(value);

            const sizeSpan = bucketElements[bucketIndex].querySelector('.bucket-size');
            sizeSpan.innerText = `(${buckets[bucketIndex].length})`;

            const newBar = bars[i].cloneNode(true);
            newBar.innerText = value;
            newBar.style.width = '50px';
            bucketElements[bucketIndex].appendChild(newBar);
            
            bars[i].classList.add('faded');
            
            bars[i].classList.remove('highlight-primary');
            bucketElements[bucketIndex].style.backgroundColor = '';
        }

        updateExplanation('Sorting individual buckets (using Insertion Sort).');
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
            setupNewArray(sortedArray); // This also calls setControls(true)
            updateExplanation('Bucket Sort Complete. Average Case: <b>O(n + k)</b>');
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
        if (isSorting) { // Only render if not stopped
            renderBars(bucketElement, bucketArray);
        }
    }


    /**
     * 3. RADIX SORT (LSD) VISUALIZATION
     */
    async function radixSortVisual() {
        updateExplanation(`Starting Radix Sort (LSD).`);
        
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
            updateExplanation(`<b>Pass ${passNum}</b>: Sorting by the <b>${exp}'s</b> digit.`);
            await sleep();
            if (!isSorting) return;
            
            mainArray = countingSortByDigitStable(mainArray, exp);
            
            renderBars(visArea, mainArray);
            updateExplanation(`Array is now stable-sorted by the <b>${exp}'s</b> digit.`);
            
            addRadixColumn(mainArray, `Pass ${passNum} (by ${exp}'s)`);

            await sleep();
            if (!isSorting) return;
        }
        
        if (isSorting) {
            updateExplanation('Radix Sort Complete. <b>O(d * (n + k))</b>');
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
            count[i] += count[i - 1];
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