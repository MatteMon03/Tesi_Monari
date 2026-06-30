function logResult(elementId, text) {
    document.getElementById(elementId).innerHTML = text;
}

function setStatus(text) {
    document.getElementById('status').innerText = text;
}

// Il campione di test da 32 bit contigui in memoria
const sampleInput = Float32Array.from([12.0, 0.0, 1.0, 0.0, 0.0, 0.0]);
const iterations = 100;
window.benchmarkResults = [];

// ---------------------------------------------------------
// TEST ONNX
// ---------------------------------------------------------
async function benchmarkONNX(providerName, elementId) {
    try {
        logResult(elementId, `Inizializzazione ${providerName.toUpperCase()}...`);

        const loadTimes = [];
        let session;
        let peakRamKB = null; // Dichiarazione corretta della variabile
        
        // 1. TEMPO DI CARICAMENTO (100 iterazioni)
        for (let i = 0; i < iterations; i++) {
            const ramPrima = performance.memory ? performance.memory.usedJSHeapSize : 0;
            const startLoad = performance.now();
            
            session = await ort.InferenceSession.create('./xgb_model_ott.onnx', {
                executionProviders: [providerName]
            });
            
            loadTimes.push(performance.now() - startLoad);
            const ramDopo = performance.memory ? performance.memory.usedJSHeapSize : 0;
            
            // Calcoliamo la RAM solo al primo giro
            if (i === 0 && ramPrima > 0 && ramDopo > 0) {
                peakRamKB = Math.abs(ramDopo - ramPrima) / 1024;
            }
        }
        const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / iterations;

        const tensorInput = new ort.Tensor('float32', sampleInput, [1, 6]);
        const feeds = { float_input: tensorInput };

        // 2. WARM-UP
        await session.run(feeds);

        // 3. MISURAZIONE LATENZA E THROUGHPUT (IN BLOCCO)
        logResult(elementId, `Esecuzione di ${iterations} iterazioni in blocco...`);
        
        const t0 = performance.now(); // Cronometro start
        for (let i = 0; i < iterations; i++) {
            await session.run(feeds);
        }
        const t1 = performance.now(); // Cronometro stop
        
        const totalTime = t1 - t0;
        const avgLatenza = totalTime / iterations;
        const throughput = 1000 / avgLatenza;

        // Salvataggio dei risultati
        window.benchmarkResults.push({
            scenario: "web",
            tecno_type: providerName,
            load_times: loadTimes,
            avg_inference_time: avgLatenza, // Singolo valore medio pulito
            total_inference_time: totalTime,
            peak_ram: peakRamKB
        });

        const report = `
            Test Completato con Successo.
            -----------------------------------
            File analizzato  : xgb_model_ott.onnx
            Provider         : ${providerName.toUpperCase()}
            Tempo Caricamento: ${avgLoadTime.toFixed(2)} ms
            Latenza Media    : ${avgLatenza.toFixed(4)} ms
            Throughput       : ${throughput.toFixed(2)} inf/sec
            Tempo Totale     : ${totalTime.toFixed(2)} ms
            Picco RAM        : ${peakRamKB ? peakRamKB.toFixed(2) + " KB" : "N/A"}
            -----------------------------------
            `;
        logResult(elementId, report);

    } catch (error) {
        logResult(elementId, `<span style="color:red">Errore durante il test ${providerName}: ${error.message}</span>`);
        return null;
    }
}

// ---------------------------------------------------------
// TEST TREELITE
// ---------------------------------------------------------
async function benchmarkTreelite(elementId) {
    try {
        logResult(elementId, `Inizializzazione Treelite WASM...`);

        const loadTreelite = [];
        let treeliteModule;
        
        // 1. ATTESA CARICAMENTO MODULO
        for (let i = 0; i < iterations; i++) {
            const startLoad = performance.now();
            treeliteModule = await createTreeliteModule();
            loadTreelite.push(performance.now() - startLoad);
        }
        const avgLoadTime = loadTreelite.reduce((a, b) => a + b, 0) / iterations;

        let peakRamKB = null;
        if (typeof treeliteModule._emscripten_get_heap_size === 'function') {
            peakRamKB = treeliteModule._emscripten_get_heap_size() / 1024;
        }

        // 2. PREPARAZIONE MEMORIA
        const bytesPerFloat = 4;
        const pointerInput = treeliteModule._malloc(sampleInput.length * bytesPerFloat);
        const pointerOutput = treeliteModule._malloc(bytesPerFloat);

        for (let i = 0; i < sampleInput.length; i++) {
            treeliteModule.setValue(pointerInput + (i * bytesPerFloat), sampleInput[i], 'float');
        }

        // Warm-up
        if (typeof treeliteModule._predict !== 'function') {
            throw new Error("Funzione C '_predict' non trovata. Controlla il file header.h!");
        }
        treeliteModule._predict(pointerInput);

        // 3. MISURAZIONE LATENZA (IN BLOCCO)
        logResult(elementId, `Esecuzione di ${iterations} iterazioni in blocco...`);
        
        const t0 = performance.now();
        for (let i = 0; i < iterations; i++) {
            treeliteModule.setValue(pointerOutput, 0.0, 'float');
            treeliteModule._predict(pointerInput);
        }
        const t1 = performance.now();

        treeliteModule._free(pointerInput);
        treeliteModule._free(pointerOutput);

        // 4. CALCOLO E REPORT
        const totalTime = t1 - t0;
        const avgLatenza = totalTime / iterations;
        const throughput = 1000 / avgLatenza;

        window.benchmarkResults.push({
            scenario: "web",
            tecno_type: "treelite_wasm",
            load_times: loadTreelite,
            avg_inference_time: avgLatenza, // Singolo valore medio pulito
            total_inference_time: totalTime,
            peak_ram: peakRamKB
        });

        const report = `
            Test Completato con Successo.
            -----------------------------------
            File analizzato  : public/model.wasm
            Tempo Caricamento: ${avgLoadTime.toFixed(2)} ms
            Latenza Media    : ${avgLatenza.toFixed(4)} ms
            Throughput       : ${throughput.toFixed(2)} inf/sec
            Tempo Totale     : ${totalTime.toFixed(2)} ms
            Picco RAM        : ${peakRamKB ? peakRamKB.toFixed(2) + " KB" : "N/A"}
            -----------------------------------
            `;
        logResult(elementId, report);

    } catch (error) {
        logResult(elementId, `<span style="color:red">Errore Treelite: ${error.message}</span>`);
        console.error(error);
    }
}

// ---------------------------------------------------------
// MOTORE DI ESECUZIONE
// ---------------------------------------------------------
async function runAllBenchmarks() {
    const btn = document.getElementById('runTestsBtn');
    btn.disabled = true;
    setStatus("Esecuzione test in corso. Attendi...");

    await benchmarkONNX('wasm', 'res-wasm');
    await new Promise(r => setTimeout(r, 3500));

    await benchmarkONNX('webgpu', 'res-webgpu');
    await new Promise(r => setTimeout(r, 3500));

    await benchmarkTreelite('res-treelite');

    setStatus("Test completati.");
    btn.disabled = false;
}