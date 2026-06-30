# Prerequisiti e Installazione

# Predizione del Traffico Urbano: Machine Learning & Deployment

Questo progetto implementa una pipeline completa di Machine Learning per la previsione del volume di traffico in corrispondenza di specifici incroci urbani. Il progetto copre l'intero ciclo di vita del dato: dall'Analisi Esplorativa (EDA) all'addestramento del modello, fino all'ottimizzazione e al deployment in produzione tramite un'architettura web.

## Caratteristiche Principali

* **Modello Predittivo:** Utilizzo di `XGBoost` ottimizzato tramite *Optuna* per la massima accuratezza.
* **Compilazione Nativa:** Conversione dell'albero decisionale in codice sorgente C tramite `Treelite` per abbattere i tempi di latenza e ridurre l'impronta in RAM.
* **Interfaccia Web:** Frontend reattivo in HTML/JS per interrogare il modello direttamente dal browser.

## Struttura del Repository

```text
ROOT
│
├── .venv/                  # Ambiente virtuale Python (ignorato su Git)
├── archive/                # Backup e vecchi script di test
├── emsdk/                  # Toolchain Emscripten per la compilazione WASM (ignorato su Git)
├── evaluation_csv/
│     ├── benchmark_evaluation.csv   # Risultati aggregati dei test eseguiti in ambiente web (ignorato su Git)
│     └── pythin_evaluation.csv      # Risultati aggregati dei test eseguiti in python (ignorato su Git)
├── model_c_src/            # Codice sorgente C puro generato da tl2cgen (ignorato su Git)
│
├── WebSite/                # L'interfaccia utente web per il benchmark
│   ├── public/                 # Artefatti WebAssembly compilati pronti per l'uso (ignorato su Git)
│   │    ├── model.js               # Codice generato da Emscripten
│   │    └── model.wasm             # Binario del modello ottimizzato per il web
│   ├── benchmark_web/
│   │    ├── benchmark.html         # Pagina per analizzare i modelli web
│   │    ├── benchmark.js           # Motore JS che esegue i test e misura la latenza dei modelli web
│   │    └── xgb_model_ott.onnx     # Modello esportato in formato ONNX per i test concorrenti (ignorato su Git)
│   ├── index.html                  # Pagina principale del sito
│   ├── style.css		    # Css del sito
│   └── script.js		    # js per calcolare la previsione
│   
├── compile.sh                 # Script Bash per automatizzare la compilazione C -> WASM
├── requirements.txt           # Dipendenze Python necessarie per l'addestramento
├── training.ipynb             # Notebook Jupyter con training, ottimizzazione e test Python
├── xgb_model_ott.json / .so   # Modelli XGBoost/Treelite esportati in locale (ignorato su Git)
└── web_automator.py           # File per automatizzare il salvataggio dei modelli web nel file benchmark_evaluation.csv
```


Per riprodurre l'ambiente e far girare i test, assicurati di avere installato **Python 3** e **Git**.

Clona il repository e crea un ambiente virtuale per isolare le dipendenze:

```bash
git clone [https://github.com/unibo-dslab-projects/MatteoMonari-junction-forecasting.git]
cd MatteoMonari-junction-forecasting

# Creazione e attivazione dell'ambiente virtuale nel mio caso venv
python3 -m venv .venv
source .venv/bin/activate

# Installazione delle librerie Python
pip install -r requirements.txt

# Scarica i browser per l'automazione Python
playwright install chromium

# Scarica e installa la toolchain Emscripten
git clone [https://github.com/emscripten-core/emsdk.git](https://github.com/emscripten-core/emsdk.git)
cd emsdk
./emsdk install latest
./emsdk activate latest
cd ..


```


# Fase 1: Addestramento ed Esportazione

Tutta la logica di training è contenuta nel Jupyter Notebook.

Apri training.ipynb.
Esegui le celle per addestrare il modello XGBoost, ottimizzare gli iperparametri (Optuna) e testarlo.
Il notebook genererà automaticamente i file .onnx e la cartella model_c_src (codice C generato tramite tl2cgen).

# Fase 2: Rendi lo script eseguibile (solo la prima volta)

```
chmod +x compile.sh
```

# Avvia la compilazione

```
./compile.sh
```

Se la compilazione va a buon fine, i file model.js e model.wasm verranno salvati nella cartella WebSite/public/.

# Avvia il Server Web Locale

```
python3 -m http.server 5500
```

# Esegui l'Automazione

```
python3 web_automator.py
```
