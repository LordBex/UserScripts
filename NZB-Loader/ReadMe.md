## NZBLink-to-Download UserScript

### Beschreibung
Mit diesem UserScript kannst du NZB-Dateien direkt von nzbindex.nl runterladen, sobald du auf Links klickst, die mit dem "nzblnk:" Schema erstellt wurden.
Es wurde speziell für die Safari-Erweiterung [Userscripts](#userscripts) erstellt, sollte jedoch auch mit Tampermonkey kompatibel sein.

### UserScripts

**Anmerkung**: Die Userscripts Erweiterung ist für Safari am Mac, iPad und iPhone verfügbar.

- AppStore: https://apps.apple.com/us/app/userscripts/id1463298887
- GitHub: https://github.com/quoid/userscripts

### Funktionen
- Erkennt automatisch Links mit dem Schema "nzblnk:"
- Wandelt "nzblnk:" Links um und ermöglicht den direkten Download der NZB von nzbindex.nl
- Bennent Datei im üblichen NAME{{PASSWORT}}.nzb format
- Auswahl der Kategorie bei SABnzbd

### Einstellungen 

#### Ausgabe: 

| Wert         | Beschreibung                                                                |
|--------------|-----------------------------------------------------------------------------|
| URLtoSABnzbd | Die NZB-URL wird an SABnzbd weitergeleitet, NZB wird von SABnzbd geladen.   |
| NZBtoSABnzbd | Die NZB direkt wird an SABnzbd weitergleitet, funktioniert nicht bei Safari |
| download     | Die NZB wird in deinem Download Ordner gespeichert                          |

**Für SABnzbd**

```js
const SAB_API_KEY = '...'; // required
const SAB_URL = 'http://localhost:8080/sabnzbd/api'; // required z.B. 'http://localhost:8080/sabnzbd/api'

const SAB_CATEGORY_SELECT_ON = false // SABnzbd Kategorie Auswahl
const SAB_DEFAULT_CATEGORY = '*' // default: *
```

> Wenn SAB_CATEGORY_SELECT_ON aktiviert ist, ist der Einsatz des API-Keys erforderlich, da der NZB-Key nicht ausreicht.

<center>
<img src="images/cat-select-modal.png" style="max-height: 400px">
</center>


### Installation

**Für Userscripts (Safari Erweiterung):**
1. Installieren Sie die [Userscripts](https://github.com/quoid/userscripts) Safari-Erweiterung.
2. Bestimme in der Userscript-App einen Ordner.
3. Hinterlege das Script im angegebenen Ordner.

> Kleiner Tipp: Wenn du den Datei-Pfad zu einem in der iCloud änderst, synchronisiert sich das Script automatisch mit deinem iPhone, Mac und iPad.

**Anleitung aktivieren und verwenden vom Script:**
1. Einstellungen, Safari, Erweiterungen, Userscript einschalten.
2. Safari Browser öffnen und dort Userscript aktivieren (muss für jede Seite mit "nzblnk:" gemacht werden)
3. Zugriff für das Script erlauben (Einen Tag lang oder immer erlauben),
4. Klick auf den "nzblnk:", die NZB wird nun bei nzbindex gesucht und geladen.

**Für Tampermonkey:**
1. Installieren den [Tampermonkey](https://www.tampermonkey.net/) Userscript-Manager.
2. Fügen das oben stehende Script in Tampermonkey ein.
3. Speichern und aktivierie das Script.

### Nutzung
Sobald das Script aktiviert ist:
1. Mit einem Klick auf den "nzblnk:" Link wird die NZB bei nzbindex.nl gesucht und heruntergeladen.
2. Die NZB wird im üblichen Download-Ordner gespeichert.

### Feedback & Autor
Hast du Vorschläge oder Meinungen zu diesem Script? Dann meld dich einfach beim Autor: **LordBex**.
