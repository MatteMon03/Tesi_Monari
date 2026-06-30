import os
from playwright.sync_api import sync_playwright
import csv


def run_automated_browser_benchmark():
    csv_filename = "evaluation_csv/benchmark_evaluation.csv"
    if not os.path.exists(csv_filename):
        with open(csv_filename, 'w', newline='') as f:
            csv.writer(f).writerow(["scenario", "esecuzione", "metrica", "valore"])
    
    print("Avvio automazione Playwright...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, args=[
                "--enable-unsafe-webgpu",
                "--ignore-gpu-blocklist",
                "--enable-features=WebAssemblyThreads",
                "--disable-web-security"
        ])
        page = browser.new_page()
        

        print("Connessione al server locale...")
        try:
            page.goto("http://127.0.0.1:5500/WebSite/benchmark_web/benchmark.html")
        except Exception as e:
            print("ERRORE: Server locale non trovato.")
            return

        print("Clic sul pulsante di avvio test...")
        page.click("#runTestsBtn")

        print("Attesa esecuzione benchmark nel browser...")
        page.wait_for_selector("text=Test completati.", timeout=300000)

        print("Estrazione dei dati dalla memoria di JavaScript...")
        results = page.evaluate("window.benchmarkResults")

        browser.close()

        print("Salvataggio dei risultati nel file CSV...")
        with open(csv_filename, 'a', newline='') as f:
            writer = csv.writer(f)
            
            for res in results:
                tecno = res['tecno_type']
                
                if res['peak_ram'] is not None:
                    writer.writerow([tecno, "-", "peak_ram", res['peak_ram']])
                
                if res.get('avg_inference_time') is not None:
                    writer.writerow([tecno, "-", "avg_inference_time", res['avg_inference_time']])
                    
                if res.get('total_inference_time') is not None:
                    writer.writerow([tecno, "-", "total_inference_time", res['total_inference_time']])
                
                if 'load_times' in res:
                    for i, load in enumerate(res['load_times']):
                        writer.writerow([tecno, i, "loading_time", load])

        print(f"Dati web integrati con successo in {csv_filename}!")

if __name__ == "__main__":
    run_automated_browser_benchmark()