# 📺 NextOnTV — Film, Serie TV & Palinsesti 7 Giorni (LCN 1–70)

Applicazione mobile-first (PWA installabile su **Android** e utilizzabile su **PC**) ispirata a **TV Time**, progettata per:
1. **Registrare tutti i Film e le Serie TV** che hai già visto (`Già Visti / Seguite`) e quelli che vorresti vedere (`Da Vedere / Wishlist`), con autocompletamento intelligente di tutte le saghe e i titoli italiani/originali.
2. **Tracciare i singoli episodi delle Serie TV** (`S01E01`, `S01E02`, ... o intere stagioni) con barra di avanzamento percentuale in stile TV Time.
3. **Scaricare automaticamente il palinsesto dei prossimi 7 giorni** dei primi **60–70 canali ufficiali del Digitale Terrestre italiano** (LCN 1–70).
4. **Incrociare i palinsesti dei prossimi 7 giorni con le tue liste personali** e filtrare cosa vedere con 4 categorie:
   - 🌟 **Tutto** (Wishlist + Film già visti + Serie TV già viste)
   - 🎯 **Solo Da Vedere (Wishlist)** (Film e Serie TV che vuoi vedere)
   - 🎬 **Solo Film Già Visti**
   - 📺 **Solo Serie TV Già Viste / Seguite**
5. **☁️ Sincronizzazione Automatica Cloud PC ↔ Telefono & Modalità Dati Mobili 4G/5G (Fuori Casa)**:
   - Tutto ciò che salvi sul PC si sincronizza automaticamente sul telefono (e viceversa!) tramite il tuo **Codice Cloud Sync** gratuito.
   - All'avvio, il server genera anche un **Link Pubblico HTTPS (4G/5G)** accessibile fuori casa sotto rete dati mobili, più una modalità autonoma Cloud/4G integrata nell'app che funziona anche quando il PC di casa è spento.

## 🚀 Come avviare l'app

Fai doppio clic sul file:
- **`AVVIA_APP.bat`** (all'interno della cartella `NextOnTV`)

Oppure da terminale:
```powershell
cd C:\Users\roberto\.gemini\antigravity\scratch\NextOnTV
python server.py
```

## 📱☁️ Come sincronizzare PC e Telefono (anche fuori casa in 4G/5G)

1. Clicca sul pulsante **📱☁️** in alto a destra nell'app sul PC.
2. Inquadra il **QR Code** con lo smartphone Android: contiene già il **Link Pubblico HTTPS (4G/5G)** e il tuo **Codice Cloud Sync** automatico.
3. Su Chrome per Android, premi il menu **⋮** in alto a destra e tocca **"Aggiungi a schermata Home" / "Installa app"**.

---

## 💾 Gestione Backup e Aggiornamento Libreria su GitHub

NextOnTV ti permette di scaricare in qualsiasi momento un backup completo in formato JSON di tutti i tuoi film e serie TV salvati, per poi caricarlo su GitHub e renderlo la copia ufficiale dell'app.

### 📥 1. Come scaricare il backup dall'app
1. Apri l'app NextOnTV (sul telefono o su PC).
2. Vai nella scheda **"Le Mie Liste"** (terza icona in basso).
3. Clicca sul pulsante delle impostazioni / backup in alto a destra (icona del dischetto 💾).
4. Tocca **"Esporta Backup JSON"**: verrà scaricato un file con un nome del tipo `NextOnTV_Backup_AAAA-MM-GG_OO-MM-SS.json` sul tuo dispositivo.

---

### 📤 2. Come caricare il backup su GitHub

1. **Rinomina il file scaricato** esattamente in:
   ```text
   library.json
   ```
2. **Copialo nella cartella `data/`** del repository locale:
   ```text
   NextOnTV/data/library.json
   ```
   *(sostituendo il file esistente).*
3. **Crea una copia identica di riserva** nella stessa cartella:
   ```text
   NextOnTV/data/library_backup.json
   ```
4. **Invia le modifiche su GitHub**:
   - **Da terminale / VS Code:**
     ```powershell
     cd C:\Users\roberto\.gemini\antigravity\scratch\NextOnTV
     git add data/library.json data/library_backup.json
     git commit -m "Aggiornamento libreria film e serie TV"
     git push origin main
     ```
   - **Oppure direttamente dal sito web di GitHub:**
     - Apri il tuo repository `Shynicy/NextOnTV` su GitHub.
     - Entra nella cartella `data`.
     - Clicca su **Add file** $\rightarrow$ **Upload files**.
     - Trascina il file `library.json` (e `library_backup.json`).
     - Clicca su **Commit changes**.

---

### 🔄 3. Come ripristinare la libreria sui dispositivi

Una volta caricato il file su GitHub:
- **Automatico per nuovi accessi:** Aprendo NextOnTV su qualsiasi nuovo smartphone o browser, l'app scaricherà in automatico tutti i titoli aggiornati da GitHub.
- **Ricarica manuale immediata:** Nel pannello di backup (icona 💾), basta premere il pulsante **"🔄 Ricarica copia ufficiale da GitHub"** per allineare all'istante la memoria locale del telefono con la copia ufficiale presente su GitHub.

