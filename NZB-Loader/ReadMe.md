
## NZBLink-to-Download UserScript

### Beschreibung
Dieses UserScript ermöglicht es Ihnen, NZB-Dateien automatisch von nzbindex.nl herunterzuladen, wenn auf Links mit dem "nzblnk:" Schema geklickt wird. Es wurde speziell für die Safari-Erweiterung [Userscripts](#userscripts) erstellt, sollte jedoch auch mit Tampermonkey kompatibel sein.

### UserScripts

**Anmerkung**: Die Userscripts Erweiterung ist für Safari am Mac und iPhone verfügbar. Genießen Sie das automatische Herunterladen von NZB-Dateien auf beiden Geräten.

- AppStore: https://apps.apple.com/us/app/userscripts/id1463298887
- GitHub: https://github.com/quoid/userscripts

### Funktionen
- Erkennt automatisch Links mit dem Schema "nzblnk:" auf jeder Webseite.
- Wandelt "nzblnk:" Links um und ermöglicht den direkten Download von nzbindex.nl.
- Bennent Datei im üblichen NAME{{PASSWORT}}.nzb format

### Installation

**Für Userscripts (Safari Erweiterung):**
1. Installieren Sie die [Userscripts](https://github.com/quoid/userscripts) Safari-Erweiterung.
2. Fügen Sie das oben stehende Script über das Userscripts-Dashboard hinzu.
3. Aktivieren Sie das Script und genießen Sie die automatischen NZB-Downloads!

> TIPP ! Ändern sie denn Datei-Pfad auf einen Pfad in der iCloud so wird das Script automatisch mit ihrem iPhone und anderen Geräten synchronisiert 

**Für Tampermonkey:**
1. Installieren Sie den [Tampermonkey](https://www.tampermonkey.net/) Userscript-Manager.
2. Fügen Sie das oben stehende Script in Tampermonkey ein.
3. Speichern und aktivieren Sie das Script.

### Nutzung
Sobald das Script aktiviert ist:
1. Besuchen Sie eine Webseite, die "nzblnk:" Links enthält.
2. Klicken Sie auf einen solchen Link. Nun wird die zugehörige NZB-Datei automatisch von nzbindex.nl heruntergeladen.

### Hinweis
- Das Script nutzt die GM_xmlhttpRequest-Funktion für den Zugriff auf externe Domains. Stellen Sie sicher, dass Ihr Userscript-Manager oder Ihre Erweiterung diese Funktion unterstützt.
  
### Feedback & Autor
Wenn Sie Vorschläge oder Feedback zu diesem Script haben, wenden Sie sich bitte an den Autor: **LordBex**.
