# ✨ ZDR Chat Summarizer

Un'applicazione web eterea, moderna e *privacy-first* per l'estrazione e il riassunto intelligente delle tue chat personali. Progettato con la filosofia **ZDR (Zero Data Retention)**: i tuoi messaggi non vengono mai salvati in modo persistente su disco.

![Dashboard Preview](public/preview.jpg) <!-- Aggiungi uno screenshot della UI qui in futuro -->

## 🌟 Funzionalità Principali

- **Zero Data Retention**: I messaggi vengono gestiti esclusivamente nella memoria volatile (RAM). Nessun salvataggio permanente.
- **Integrazione WhatsApp Web Headless**: Sincronizzazione in tempo reale e selezione automatica delle chat tramite `whatsapp-web.js` (senza dover esportare manualmente i TXT).
- **Integrazione Telegram MTProto**: Estrazione veloce e diretta dal cloud di Telegram sfruttando le API ufficiali tramite `GramJS`.
- **UI Premium ed Eterea**: Un'interfaccia utente curata nei minimi dettagli, con glassmorphism, background animati interattivi e un feeling ultra-moderno.
- **Modalità Fallback Offline**: Supporta il caricamento manuale dei classici file `.txt` (WhatsApp) o `.json` (Telegram) se non vuoi usare le automazioni.
- **Filtraggio Temporale Avanzato**: Seleziona in automatico l'arco temporale dei messaggi da analizzare prima di inviarli al motore di sintesi.

## 🛠 Tecnologia
- **Backend**: Node.js, TypeScript, Express
- **Client Automation**: Puppeteer, whatsapp-web.js (master branch), GramJS
- **Data Parsing**: `stream-json`, architettura basata su pipeline e stream per gestire moli enormi di messaggi senza saturare la memoria.
- **Frontend**: Vanilla HTML/CSS/JS reattivo e ultra-leggero, font Google *Outfit*.

## 🚀 Installazione e Avvio

1. **Clona il progetto**
   ```bash
   git clone https://github.com/tuo-username/msg_summarizer.git
   cd msg_summarizer
   ```

2. **Installa le dipendenze**
   ```bash
   npm install
   ```

3. **Configura le variabili d'ambiente**
   Crea un file `.env` nella root del progetto (non verrà mai pushato su GitHub per sicurezza):
   ```env
   # API Keys di Telegram (Ottienile su my.telegram.org)
   TELEGRAM_API_ID=il_tuo_api_id
   TELEGRAM_API_HASH=il_tuo_api_hash
   
   # La stringa di sessione verrà generata al primo avvio!
   TELEGRAM_STRING_SESSION=
   ```

4. **Avvia il Server di Sviluppo**
   ```bash
   npm run dev
   ```

5. **Autenticazione Iniziale (Solo al primo avvio)**
   - **Telegram**: Segui le istruzioni nel terminale per inserire il tuo numero e il codice OTP. Al termine riceverai una lunghissima *Stringa di Sessione*. Copiala, incollala nel `.env` alla voce `TELEGRAM_STRING_SESSION` e riavvia.
   - **WhatsApp**: Scannerizza il QR Code che appare nel terminale con l'app di WhatsApp sul tuo telefono.

6. **Goditi la Magia**
   Apri il browser all'indirizzo [http://localhost:3000](http://localhost:3000) e inizia ad analizzare!

## 🔐 Sicurezza & Privacy
La filosofia Zero Data Retention assicura che il server funga unicamente da *ponte* tra il tuo account e il motore linguistico. Eventuali file temporanei generati per l'analisi (come nel caso del caricamento manuale) vengono salvati in `/tmp` e immediatamente distrutti non appena l'estrazione in RAM è completata. Le tue sessioni di login vengono salvate localmente in file protetti ignorati da `.gitignore`.

---
*Progetto sviluppato come strumento esplorativo per integrazioni bot/AI sicure e private.*
