let treeliteModule = null;

document.addEventListener('DOMContentLoaded', async () => {
    const risultatoHtml = document.getElementById('risultato');
    risultatoHtml.innerText = "Caricamento motore AI Edge in corso...";
    
    try {
        treeliteModule = await createTreeliteModule();
        risultatoHtml.innerHTML = "Inserisci i parametri.";
    } catch (error) {
        risultatoHtml.innerHTML = "Errore caricamento modello.";
        console.error("Dettagli errore:", error);
    }
});


function faiPrevisione() {
    if (!treeliteModule) {
        alert("Attendi un istante, il modello sta ancora caricando!");
        return;
    }

    const junction = parseFloat(document.getElementById('val_junction').value);
    const year = parseFloat(document.getElementById('val_year').value);
    const month = parseFloat(document.getElementById('val_month').value);
    const day = parseFloat(document.getElementById('val_day').value);
    const hour = parseFloat(document.getElementById('val_hour').value);
    const weekday = parseFloat(document.getElementById('val_weekday').value);

    if (junction < 1 || junction > 4)  { document.getElementById('risultato').innerHTML = `Incrocio deve essere tra 1 e 4`; return; }
    if (month < 1   || month > 12)     { document.getElementById('risultato').innerHTML = `Mese deve essere tra 1 e 12`; return; }
    if (day < 1     || day > 31)       { document.getElementById('risultato').innerHTML = `Giorno deve essere tra 1 e 31`; return; }
    if (hour < 0    || hour > 23)      { document.getElementById('risultato').innerHTML = `Ora deve essere tra 0 e 23`; return; }
    if (weekday < 0 || weekday > 6)    { document.getElementById('risultato').innerHTML = `Giorno settimana deve essere tra 0 e 6 -> lun = 0 dom = 6`; return; }

    const inputValues = new Float32Array([junction, year, month, day, hour, weekday]);

    const bytesPerFloat = 4;
    const pointerInput = treeliteModule._malloc(inputValues.length * bytesPerFloat);
    
    for (let i = 0; i < inputValues.length; i++) {
        treeliteModule.setValue(pointerInput + (i * bytesPerFloat), inputValues[i], 'float');
    }
    const pointerOutput = treeliteModule._malloc(bytesPerFloat);

    treeliteModule.setValue(pointerOutput, 0.0, 'float');

    treeliteModule._predict(pointerInput, 1, pointerOutput);

    const prediction = treeliteModule.getValue(pointerOutput, 'float');

    treeliteModule._free(pointerInput);
    treeliteModule._free(pointerOutput);

    const trafficoReale = Math.max(0, Math.ceil(prediction));

    document.getElementById('risultato').innerHTML = `Traffico Previsto: ${trafficoReale} veicoli`;
}