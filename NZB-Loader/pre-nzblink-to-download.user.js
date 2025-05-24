// ==UserScript==
// @name                pre-nzblink-to-download
// @description         Automatically downloads NZB files from nzbindex.nl when links with the "nzblnk:" scheme are clicked.
// @description:de_DE   Lädt NZB-Dateien automatisch von nzbindex.nl herunter, wenn auf Links mit dem Schema "nzblnk:" geklickt wird.
// @author              LordBex
// @version             v1.1
// @match               *://*/*
// @grant               GM_xmlhttpRequest
// @grant               GM_setValue
// @grant               GM_getValue
// @grant               GM_registerMenuCommand
// @connect             nzbindex.com
// @connect             www.nzbking.com
// @connect             localhost
// @icon                https://i.imgur.com/O1ao7fL.png
// ==/UserScript==

// ------------------------------------------------------------
//- Default Config:

// Default settings
const DEFAULT_SETTINGS = {
    ausgabe: 'menu',
    disable_success_alert: false,
    sab_api_key: '',
    sab_url: 'http://localhost:8080/api',
    sab_categories: [],
    sab_default_category: '*',
    sab_sub_menu: true
};

// Load settings from GM storage or use defaults
function loadSettings() {
    const savedSettings = GM_getValue('nzblink_settings');
    if (savedSettings) {
        try {
            return JSON.parse(savedSettings);
        } catch (e) {
            console.error('Error parsing saved settings:', e);
            return DEFAULT_SETTINGS;
        }
    }
    return DEFAULT_SETTINGS;
}

// Current settings
const SETTINGS = loadSettings();

// ------------------------------------------------------------
// menu buttons

async function openMenu(parameters) {
    const sabButtons = await getCategoriesButtons(parameters)

    const buttons = [
        {
            name: 'Download',
            f: () => {
                downloadAndSave(parameters)
            },
            bgColor: '#0D4715',
            icon: 'https://raw.githubusercontent.com/sabnzbd/sabnzbd/refs/heads/develop/icons/nzb.ico'
        }
    ]

    if (SETTINGS.sab_sub_menu) {
        buttons.push({
            name: 'Zu Sabnzbd',
            f: () => {
                modal.showModal([
                    {
                        name: 'Zurück',
                        bgColor: '#4F959D',
                        f: () => {
                            modal.showModal(buttons)
                        }
                    },
                    ...sabButtons
                ])
            },
            icon: 'https://raw.githubusercontent.com/sabnzbd/sabnzbd/refs/heads/develop/icons/sabnzbd.ico'
        })
    } else {
        buttons.push(...sabButtons)
    }

    infoModal.closeModal()
    modal.showModal(buttons)
}

function customHandler({downloadLink, fileName, password}) {
    // wird ausgeführt, wenn AUSGABE auf 'custom' gesetzt ist
    alert("Custom Handler") // Hier kann eigener Code eingefügt werden
}

// ------------------------------------------------------------
// sab-code

function successAlert(message) {
    if (!SETTINGS.disable_success_alert) {
        alert(message)
    }
}

function addNZBtoSABnzbd({downloadLink, fileName, password, category = SETTINGS.sab_default_category}) {

    const formData = new FormData();
    formData.append('name', downloadLink);
    formData.append('mode', 'addurl');
    formData.append('output', 'json');
    formData.append('apikey', SETTINGS.sab_api_key);
    formData.append('cat', category);
    if (fileName) {
        formData.append('nzbname', fileName);
    }
    if (password) {
        formData.append('password', password);
    }

    infoModal.print("Sende Link zu Sab ...")

    GM_xmlhttpRequest({
        method: "POST",
        url: SETTINGS.sab_url,
        data: formData,
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json"
        },
        onload: function (response) {
            console.log(response.responseText);
            let result = JSON.parse(response.responseText);

            if (result.status === true) {
                infoModal.print("Erfolg! NZB hinzugefügt. ID: " + result.nzo_ids.join(', '))
                infoModal.closeIn(3000)
            } else {
                infoModal.showModal()
                infoModal.error('Fehler beim Hinzufügen der NZB-Datei zu SABnzbd.\n' + result.error);
            }
        },
        onerror: function (response) {
            console.error('Anfrage fehlgeschlagen', response);
            alert("Anfrage an SABnzb schlug fail ! (mehr im Log)")
        }
    });
}

function uploadNZBtoSABnzbd({responseText, fileName, password, category = SETTINGS.sab_default_category}) {

    let formData = new FormData();
    let blob = new Blob([responseText], {type: "text/xml"});
    formData.append('name', blob, fileName);
    formData.append('mode', 'addfile');
    if (fileName) {
        formData.append('nzbname', fileName);
    }
    if (password) {
        formData.append('password', password);
    }
    formData.append('output', 'json');
    formData.append('cat', category);
    formData.append('apikey', SETTINGS.sab_api_key);
    console.log('Upload Nzb to Sab:', formData);
    infoModal.print("Lade Nzb zu SABnzbd hoch ...")

    GM_xmlhttpRequest({
        method: "POST",
        url: SETTINGS.sab_url,
        data: formData,
        onload: function (response) {
            console.log('Upload response', response.status, response.statusText);
            console.log('Response body', response.responseText);
            let result = JSON.parse(response.responseText);
            if (result.status === true) {
                successAlert('Success! NZB added. ID: ' + result.nzo_ids.join(', '));
            } else {
                alert('Error adding NZB file to SABnzbd.\n' + (result.error || 'Unknown error'));
            }
        },
        onerror: function (response) {
            console.error('Error during file upload', response.status, response.statusText);
            alert("Could not upload NZB! (more in log)");
        }
    });
}

function getSabCategorie(callback, failed_callback) {
    if (!SETTINGS.sab_url || !SETTINGS.sab_api_key) {
        alert('Bitte gib zuerst die SABnzbd URL und den API-Key ein.');
        return;
    }

    const requestURL = new URL(SETTINGS.sab_url);
    requestURL.searchParams.append('output', 'json');
    requestURL.searchParams.append('mode', 'get_cats');
    requestURL.searchParams.append('apikey', SETTINGS.sab_api_key);

    GM_xmlhttpRequest({
        method: "GET",
        url: requestURL.toString(),
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json"
        },
        onload: (response) => {
            try {
                const data = JSON.parse(response.responseText);
                if (data.categories && data.categories.length > 0) {
                    if (callback) {
                        callback(data.categories);
                    } else { // debug message
                        alert('Kategorien in SABnzbd: ' + data.categories.join(', '));
                    }
                } else {
                    alert('Keine Kategorien in SABnzbd gefunden.');
                }
            } catch (e) {
                console.error('Error parsing SABnzbd response:', e);
                alert('Fehler beim Laden der Kategorien: ' + e.message);
            }
        },
        onerror: (error) => {
            console.error('Error loading categories from SABnzbd:', error);
            alert('Fehler beim Laden der Kategorien von SABnzbd.');
            if (failed_callback) {
                failed_callback(error);
            }
        }
    });

}

function makeSabButton(parameters, category) {
    return {
        name: category.charAt(0).toUpperCase() + category.slice(1),
        value: category.toLowerCase(),
        f: () => {
            parameters.category = category
            addNZBtoSABnzbd(parameters)
        }
    }
}

function getCategoriesButtons(parameters) {
    if (SETTINGS.sab_categories.length > 0) {
        return SETTINGS.sab_categories.map(item => {
            return makeSabButton(parameters, item);
        })
    } else {
        alert("Keine Kategorien in den Einstellungen gefunden. Bitte zuerst Kategorien hinzufügen.")
    }
}

// ------------------------------------------------------------
// download file-code

function saveFile({responseText, fileName}) {
    let blob = new Blob([responseText], {type: "application/x-nzb"});
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);

    if (!fileName) {
        fileName = 'download.nzb'
    } else if (!fileName.endsWith('.nzb')) {
        fileName = fileName + '.nzb'
    }

    link.download = fileName // Dateiname ändern
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function extractFileNameFromResponse(url, response) {
    if (response.responseHeaders) {
        const contentDisposition = response.responseHeaders
            .split('\n')
            .find(header => header.toLowerCase().startsWith('content-disposition:'));

        if (contentDisposition) {
            console.log("Content-Disposition Header vom Download:", contentDisposition)
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                return filenameMatch[1].replace(/['"]/g, '');
            }
        }
    }
    // Fallback: Extrahiere den Dateinamen aus der URL
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    const fileName = lastPart.split('?')[0]; // Entferne Query-Parameter
    console.log("Dateiname aus URL extrahiert:", fileName)
    return fileName || 'download.nzb'; // Fallback-Dateiname
}

function downloadFile({downloadLink, fileName, password, callback}) {
    console.log("Download Nzb von " + downloadLink)
    GM_xmlhttpRequest({
        method: "GET",
        url: downloadLink,
        onload: function (nzbResponse) {
            if (!fileName) {
                fileName = extractFileNameFromResponse(downloadLink, nzbResponse)
            }

            callback({
                responseText: nzbResponse.responseText,
                fileName,
                password
            })
        },
        onerror: function () {
            console.error("Failed Download for  " + downloadLink)
            alert("Nzb könnte nicht geladen werden !")
        }
    });
}

function downloadAndSave({downloadLink, fileName, password}) {
    downloadFile({
        downloadLink, fileName, password, callback: (args) => {
            if (password) {
                args.fileName = `${args.fileName}{{${password}}}.nzb`
            }

            saveFile(args)
            infoModal.print("Nzb gespeichert.")

            setTimeout(() => {
                infoModal.closeModal()
            }, 3000)
        }
    })
}

function downloadAndSab({downloadLink, fileName, password, category = SETTINGS.sab_default_category}) {
    downloadFile({
        downloadLink,
        fileName,
        password,
        callback: (parameter) => {
            parameter.category = category
            uploadNZBtoSABnzbd(parameter)
        }
    })
}

// ------------------------------------------------------------
// handle menu

customElements.define('menu-select-modal', class MenuSelectModal extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        // Create a shadow root
        const shadow = this.attachShadow({mode: "open"});
        shadow.innerHTML = `
             <style>
                .btn {
                    --_bg-color: var(--bg-color, #06f);
                    align-items: center;
                    background-color: var(--_bg-color);
                    border: 2px solid var(--_bg-color);
                    box-sizing: border-box;
                    color: #fff;
                    cursor: pointer;
                    display: inline-flex;
                    fill: #000;
                    font-size: 24px;
                    font-weight: 400;
                    height: 48px;
                    justify-content: center;
                    line-height: 24px;
                    width: 100%;
                    outline: 0;
                    padding: 0 17px;
                    text-align: center;
                    text-decoration: none;
                    transition: all .3s;
                    user-select: none;
                    -webkit-user-select: none;
                    touch-action: manipulation;
                    border-radius: 5px;
                    gap: 5px;
                }

                .btn:hover {
                    filter: brightness(70%);
                }

                dialog {
                    border: none !important;
                    border-radius: calc(5px * 3.74);
                    box-shadow: 0 0 #0000, 0 0 #0000, 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    background-color: rgb(33, 37, 41);
                    padding: 1.6rem;
                    max-height: 70%;
                    max-width: max(400px, 100vw);
                }

                .dialog-header {
                    color: white;
                    font-family: Inter, sans-serif;
                    font-size: 22px;
                    font-weight: 600;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-bottom: 15px;
                    margin-bottom: 15px;
                    border-bottom: 1px solid #444;
                }

                .buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    min-width: 400px;
                    margin-top: 5px;
                }

                .close {
                    all: initial;
                    background: unset;
                    padding: 5px;
                    margin: 0;
                    border: unset;
                }

                .close {
                    all: initial;
                    background: unset;
                    padding: 8px;
                    margin: 0;
                    border: unset;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: background-color 0.2s, transform 0.1s;
                }

                .close:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    transform: scale(1.1);
                }

                .close:active {
                    transform: scale(0.95);
                }

                .close:not(:hover) svg {
                    opacity: 0.6;
                }

                @media screen and (max-width: 450px) {
                    .buttons {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                        min-width: 300px;
                    }
                }

                @media screen and (max-width: 350px) {
                    .buttons {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                        min-width: 150px;
                    }
                }


            </style>

            <div data-bs-theme="dark">
                 <dialog id="dialog-1">
                    <form method="dialog">
                        <div class="dialog-header">
                            <span>Wähle ...</span>
                            <button class="close">
                                <svg xmlns='http://www.w3.org/2000/svg' width="16" height="16" viewBox='0 0 16 16' fill='#CCC'>
                                    <path d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z'/>
                                </svg>
                            </button>
                        </div>

                        <div class="buttons buttons-here">
                            <p>...</p>
                        </div>
                    </form>
                </dialog>
            </div>
        `

        this.dialog = shadow.querySelector('dialog')
    }

    showModal(items) {
        this.dialog.showModal()

        const modalContent = this.shadowRoot.querySelector('.buttons-here');
        modalContent.innerHTML = '';

        items.forEach(item => {
            const button = document.createElement('button');
            button.className = 'btn';

            if (item.innerHTML) {
                button.innerHTML = item.innerHTML;
            }

            if (item.icon) {
                const img = document.createElement('img');
                img.src = item.icon;
                img.style.marginRight = '8px';
                img.style.width = '24px';
                img.style.height = '24px';
                button.appendChild(img);
            }

            button.appendChild(document.createTextNode(item.name));

            if (item.bgColor) {
                button.style.setProperty('--bg-color', item.bgColor);
            }

            button.onclick = () => {
                item.f(); // call function
            };
            modalContent.appendChild(button);
        });
    }

    closeModal() {
        this.dialog.close()
    }
});

const modal = document.createElement('menu-select-modal');
document.body.appendChild(modal);

// ------------------------------------------------------------
// info dialog handler

customElements.define('nzblnk-info-modal', class NzbInfoModal extends HTMLElement {
    constructor() {
        super();
        this.createModal()
        this.closeTimer = null
    }

    createModal() {
        // Create a shadow root
        const shadow = this.attachShadow({mode: "open"});
        // language=HTML
        shadow.innerHTML = `
            <style>

                .btn {
                    align-items: center;
                    background-color: #06f;
                    border: 2px solid #06f;
                    box-sizing: border-box;
                    color: #fff;
                    cursor: pointer;
                    display: inline-flex;
                    fill: #000;
                    font-size: 24px;
                    font-weight: 400;
                    height: 48px;
                    justify-content: center;
                    line-height: 24px;
                    width: 100%;
                    outline: 0;
                    padding: 0 17px;
                    text-align: center;
                    text-decoration: none;
                    transition: all .3s;
                    user-select: none;
                    -webkit-user-select: none;
                    touch-action: manipulation;
                    border-radius: 5px;
                }

                .btn:hover {
                    background-color: #3385ff;
                    border-color: #3385ff;
                    fill: #06f;
                }

                dialog {
                    border: none !important;
                    border-radius: calc(5px * 3.74);
                    box-shadow: 0 0 #0000, 0 0 #0000, 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    background-color: rgb(33, 37, 41);
                    max-width: max(400px, 100vw);
                    padding: 2rem;
                    width: min(400px, 90vw);
                }

                dialog::backdrop {
                    background-color: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                }

                .dialog-header {
                    color: white;
                    font-family: Inter, sans-serif;
                    font-size: 22px;
                    font-weight: 600;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-bottom: 15px;
                    margin-bottom: 15px;
                    border-bottom: 1px solid #444;
                }

                .close {
                    all: initial;
                    background: unset;
                    padding: 5px;
                    margin: 0;
                    border: unset;
                }

                .close:not(:hover) {
                    opacity: 0.3; /* Leichte Transparenz bei Hover */
                }

                .dialog-content {
                    color: whitesmoke;
                }

            </style>

            <div data-bs-theme="dark">
                <dialog id="dialog-2">
                    <form method="dialog">
                        <div class="dialog-header">
                            <span>Info</span>
                            <button class="close">
                                <svg xmlns='http://www.w3.org/2000/svg' width="16" height="16" viewBox='0 0 16 16'
                                     fill='#CCC'>
                                    <path d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z'/>
                                </svg>
                            </button>
                        </div>

                        <div class="dialog-content">

                        </div>
                    </form>
                </dialog>
            </div>
        `

        this.dialog = shadow.querySelector('dialog')
        this.modalContent = shadow.querySelector('.dialog-content')
    }

    showModal(callback) {
        this.dialog.showModal()
    }

    resetModal() {
        this.modalContent.innerHTML = '';
    }

    print(message) {
        let p = document.createElement('p');
        console.log("Info:", message)
        p.innerHTML = message
        this.modalContent.appendChild(p)
    }

    error(message) {
        let p = document.createElement('p');
        p.style.color = 'red'
        console.error("Error:", message)
        p.innerHTML = message
        this.modalContent.appendChild(p)
    }

    closeModal() {
        this.dialog.close()
        clearTimeout(this.closeTimer)
    }

    closeIn(time) {
        this.closeTimer = setTimeout(() => {
            this.closeModal()
        }, time)
    }
});

const infoModal = document.createElement('nzblnk-info-modal');
document.body.appendChild(infoModal);

// ------------------------------------------------------------
// settings modal

customElements.define('nzblnk-settings-modal', class NzbSettingsModal extends HTMLElement {
    constructor() {
        super();
        this.createModal();
        this.activeTab = 'general';
    }

    createModal() {
        const shadow = this.attachShadow({mode: "open"});
        // language=HTML
        shadow.innerHTML = `
            <style>
                :host {
                    --primary-color: #0066ff;
                    --primary-dark: #0055cc;
                    --success-color: #28a745;
                    --success-dark: #218838;
                    --danger-color: #dc3545;
                    --danger-dark: #c82333;
                    --info-color: #17a2b8;
                    --info-dark: #138496;
                    --bg-dark: #212529;
                    --bg-card: #2a2a2a;
                    --border-color: #444;
                    --text-color: #f5f5f5;
                    --text-muted: #aaa;
                    --shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12);
                    --anim-duration: 0.2s;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    font-size: 16px;
                }

                * {
                    box-sizing: border-box;
                }

                /* Animations */
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                @keyframes slideInRight {
                    from { transform: translateX(20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }

                /* Toast notification */
                .toast {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    padding: 12px 20px;
                    background-color: var(--success-color);
                    color: white;
                    border-radius: 8px;
                    box-shadow: var(--shadow);
                    z-index: 9999;
                    animation: slideUp 0.3s ease-out;
                    max-width: 300px;
                }

                .toast.error {
                    background-color: var(--danger-color);
                }

                dialog {
                    border: none !important;
                    border-radius: 16px;
                    box-shadow: var(--shadow);
                    background-color: var(--bg-dark);
                    padding: 0;
                    max-height: 90vh;
                    width: 90vw;
                    max-width: 550px;
                    overflow: hidden;
                    color: var(--text-color);
                    animation: fadeIn 0.3s, slideUp 0.3s;
                }

                dialog::backdrop {
                    background-color: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                    animation: fadeIn 0.3s;
                }

                .dialog-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    max-height: 90vh;
                }

                .dialog-header {
                    color: var(--text-color);
                    font-size: 22px;
                    font-weight: 600;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    border-bottom: 1px solid var(--border-color);
                    background-color: rgba(0, 0, 0, 0.2);
                }

                .dialog-content {
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding: 0;
                }

                .dialog-footer {
                    padding: 16px 24px;
                    border-top: 1px solid var(--border-color);
                    background-color: rgba(0, 0, 0, 0.2);
                    display: flex;
                    justify-content: flex-end;
                }

                .close {
                    all: initial;
                    background: unset;
                    width: 36px;
                    height: 36px;
                    margin: 0;
                    border: unset;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all var(--anim-duration);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .close:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    transform: scale(1.1);
                }

                .close:active {
                    transform: scale(0.95);
                }

                .close svg {
                    width: 20px;
                    height: 20px;
                    opacity: 0.8;
                    transition: opacity var(--anim-duration);
                }

                .close:hover svg {
                    opacity: 1;
                }

                .settings-content {
                    padding: 0;
                    width: 100%;
                }

                .tab-navigation {
                    display: flex;
                    background-color: rgba(0, 0, 0, 0.2);
                    padding: 4px;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    gap: 2px;
                    overflow-x: auto;
                    min-height: 50px;
                }

                .tab-navigation::-webkit-scrollbar {
                    display: none;
                }

                .tab-button {
                    background-color: transparent;
                    color: var(--text-muted);
                    border: none;
                    padding: 0 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 15px;
                    font-weight: 500;
                    transition: all var(--anim-duration);
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .tab-button:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    color: var(--text-color);
                }

                .tab-button.active {
                    background-color: var(--primary-color);
                    color: white;
                }

                .tab-content {
                    display: none;
                    padding: 24px;
                    width: 100%;
                    overflow-x: hidden;
                }

                .tab-content.active {
                    display: block;
                    animation: fadeIn 0.3s;
                }

                .settings-section {
                    margin-bottom: 32px;
                    padding-bottom: 24px;
                    border-bottom: 1px solid var(--border-color);
                    width: 100%;
                }

                .settings-section:last-child {
                    margin-bottom: 0;
                    padding-bottom: 0;
                    border-bottom: none;
                }

                .settings-section h3 {
                    margin-top: 0;
                    margin-bottom: 16px;
                    color: var(--text-color);
                    font-size: 18px;
                    font-weight: 600;
                }

                label {
                    display: block;
                    margin-bottom: 20px;
                    font-weight: 500;
                    width: 100%;
                }

                label.checkbox-label {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                }

                input[type="text"],
                input[type="password"],
                select {
                    width: 100%;
                    padding: 8px 12px;
                    margin-top: 8px;
                    background-color: rgba(255, 255, 255, 0.1);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    color: white;
                    font-size: 16px;
                    transition: all var(--anim-duration);
                }

                input[type="text"]:focus,
                input[type="password"]:focus,
                select:focus {
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.25);
                    outline: none;
                }

                input[type="checkbox"] {
                    margin-right: 12px;
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                    accent-color: var(--primary-color);
                    flex-shrink: 0;
                }

                button {
                    background-color: var(--primary-color);
                    color: white;
                    border: none;
                    padding: 9.5px 15px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 15px;
                    font-weight: 500;
                    transition: all var(--anim-duration);
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                button:hover {
                    background-color: var(--primary-dark);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }

                button:active {
                    transform: translateY(1px);
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                }

                button:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none;
                }

                /* Category styles */
                .category-list {
                    margin-bottom: 20px;
                    width: 100%;
                }

                .category-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background-color: var(--bg-card);
                    padding: 12px 16px;
                    margin-bottom: 10px;
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                    transition: all var(--anim-duration);
                    width: 100%;
                    animation: slideInRight 0.3s;
                }

                .category-item:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow);
                }

                .category-item span {
                    font-size: 15px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .remove-category {
                    background-color: transparent;
                    color: var(--danger-color);
                    border: none;
                    font-size: 20px;
                    width: 36px;
                    height: 36px;
                    padding: 0;
                    margin: 0;
                    cursor: pointer;
                    transition: all var(--anim-duration);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .remove-category:hover {
                    background-color: rgba(220, 53, 69, 0.1);
                    transform: scale(1.2);
                    box-shadow: none;
                }

                .category-form {
                    display: flex;
                    flex-direction: row;
                    align-items: end;
                    margin-bottom: 16px;
                    width: 100%;
                    gap: 8px;
                }

                .add-category {
                    background-color: var(--success-color);
                }

                .add-category:hover {
                    background-color: var(--success-dark);
                }

                .load-categories {
                    background-color: var(--info-color);
                    margin-bottom: 20px;
                }

                .load-categories:hover {
                    background-color: var(--info-dark);
                }

                .action-buttons {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-top: 16px;
                }

                .action-buttons button {
                    flex: 1 1 auto;
                    min-width: 150px;
                    margin-top: 0;
                    margin-right: 0;
                }

                .save-settings {
                    background-color: var(--success-color);
                    font-weight: 600;
                    padding: 14px 24px;
                    font-size: 16px;
                    border-radius: 8px;
                }

                .save-settings:hover {
                    background-color: var(--success-dark);
                }

                .empty-message {
                    background-color: rgba(0, 0, 0, 0.2);
                    padding: 16px;
                    border-radius: 8px;
                    text-align: center;
                    color: var(--text-muted);
                    margin-bottom: 20px;
                }

                @media (max-width: 600px) {
                    dialog {
                        width: 100vw;
                        max-width: 100vw;
                        max-height: 100vh;
                        height: 100vh;
                        border-radius: 0;
                        margin: 0;
                    }

                    .dialog-header, .dialog-footer {
                        padding: 16px;
                    }

                    .tab-button {
                        padding: 12px 16px;
                        font-size: 14px;
                    }

                    .tab-content {
                        padding: 16px;
                    }

                    button {
                        padding: 14px 20px;
                        width: 100%;
                        margin-right: 0;
                    }

                    .dialog-footer {
                        flex-direction: column;
                    }

                    .save-settings {
                        width: 100%;
                        margin-right: 0;
                    }

                    .category-item {
                        flex-wrap: wrap;
                        padding: 16px;
                    }

                    .category-item span {
                        width: calc(100% - 45px);
                    }
                    
                    .toast {
                        left: 20px;
                        right: 20px;
                        max-width: unset;
                        text-align: center;
                    }
                }
            </style>

            <div>
                <dialog id="settings-dialog">
                    <form method="dialog">
                        <div class="dialog-container">
                            <div class="dialog-header">
                                <span>Einstellungen</span>
                                <button class="close" type="button">
                                    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='#CCC'>
                                        <path d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z'/>
                                    </svg>
                                </button>
                            </div>

                            <div class="tab-navigation">
                                <button type="button" class="tab-button active" data-tab="general">Allgemein</button>
                                <button type="button" class="tab-button" data-tab="sab">SABnzbd</button>
                            </div>

                            <div class="dialog-content">
                                <div class="settings-content">
                                    <div id="general-tab" class="tab-content active">
                                        <div class="settings-section">
                                            <h3>Allgemeine Einstellungen</h3>
                                            <label>
                                                Ausgabe:
                                                <select id="ausgabe">
                                                    <option value="menu">Menü</option>
                                                    <option value="download">Download</option>
                                                    <option value="URLtoSABnzb">URL zu SABnzbd</option>
                                                    <option value="NZBtoSABnzb">NZB zu SABnzbd</option>
                                                    <option value="custom">Custom Handler</option>
                                                </select>
                                            </label>
                                            <label class="checkbox-label">
                                                <input type="checkbox" id="disable_success_alert">
                                                Erfolgs-Benachrichtigungen deaktivieren
                                            </label>
                                        </div>
                                    </div>

                                    <div id="sab-tab" class="tab-content">
                                        <div class="settings-section">
                                            <h3>SABnzbd Verbindung</h3>
                                            <label>
                                                SABnzbd URL:
                                                <input type="text" id="sab_url" placeholder="http://localhost:8080/api">
                                            </label>
                                            <label>
                                                SABnzbd API Key:
                                                <input type="password" id="sab_api_key">
                                            </label>
                                            <label id="sab_default_category-label">
                                                Standard Kategorie:
                                                <input type="text" id="sab_default_category" placeholder="*">
                                            </label>
                                        </div>

                                        <div class="settings-section" id="sab-cat-list">
                                            <h3>Kategorien</h3>
                                            
                                            <label class="checkbox-label">
                                                <input type="checkbox" id="sab_sub_menu">
                                                SAB Buttons als Untermenü anzeigen
                                            </label>
                                            
                                            <div id="sab-categories-container"></div>
                                            <div class="category-form">
                                                <label style="margin: 0;">
                                                    Neue Kategorie:
                                                    <input type="text" id="new-category" placeholder="Kategoriename">
                                                </label>
                                                <button type="button" class="add-category">+</button>
                                            </div>
                                            <button type="button" class="load-categories">Kategorien von SABnzbd laden</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="dialog-footer">
                                <button type="button" class="save-settings">Einstellungen speichern</button>
                            </div>
                        </div>
                    </form>
                </dialog>
            </div>
        `;

        // Cache DOM-Referenzen
        this.dialog = shadow.querySelector('#settings-dialog');
        this.sabCategoriesContainer = shadow.querySelector('#sab-categories-container');
        this.saveButton = shadow.querySelector('.save-settings');
        this.addCategoryButton = shadow.querySelector('.add-category');
        this.loadCategoriesButton = shadow.querySelector('.load-categories');
        this.tabButtons = shadow.querySelectorAll('.tab-button');
        this.tabContents = shadow.querySelectorAll('.tab-content');
        this.closeButton = shadow.querySelector('.close');

        // Event-Listener einrichten
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Select-Change-Event für Ausgabe-Typ
        this.shadowRoot.querySelector('#ausgabe').addEventListener('change', () => this.updateShowAndHidden());

        // Tab-Navigation
        this.tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Schließen-Button im Dialog
        this.closeButton.addEventListener('click', () => this.closeModal());

        // Buttons-Events
        this.saveButton.addEventListener('click', () => this.saveSettings());
        this.addCategoryButton.addEventListener('click', () => this.addCategory());
        this.loadCategoriesButton.addEventListener('click', () => this.loadCategoriesFromSAB());

        // Enter-Taste zum Hinzufügen einer Kategorie
        const newCategoryInput = this.shadowRoot.querySelector('#new-category');
        newCategoryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addCategory();
            }
        });
    }

    // Toast-Benachrichtigungen statt alerts
    showToast(message, isError = false) {
        // Alte Toast-Nachricht entfernen, falls vorhanden
        const oldToast = this.shadowRoot.querySelector('.toast');
        if (oldToast) {
            oldToast.remove();
        }

        // Neue Toast-Nachricht erstellen
        const toast = document.createElement('div');
        toast.className = `toast ${isError ? 'error' : ''}`;
        toast.textContent = message;

        this.shadowRoot.appendChild(toast);

        // Toast nach 3 Sekunden automatisch ausblenden
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            toast.style.transition = 'opacity 0.3s, transform 0.3s';

            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    updateShowAndHidden() {
        const ausgabeValue = this.shadowRoot.querySelector('#ausgabe').value;
        const defaultCategoryLabel = this.shadowRoot.querySelector('#sab_default_category-label');
        const categoryListSection = this.shadowRoot.querySelector('#sab-cat-list');

        if (ausgabeValue === 'menu') {
            defaultCategoryLabel.style.display = 'none';
            categoryListSection.style.display = 'block';
        } else {
            defaultCategoryLabel.style.display = 'block';
            categoryListSection.style.display = 'none';
        }
    }

    showModal() {
        this.loadCurrentSettings();
        this.updateShowAndHidden();
        this.dialog.showModal();
    }

    closeModal() {
        this.dialog.close();
    }

    switchTab(tabName) {
        this.activeTab = tabName;

        // Tab-Buttons aktualisieren
        this.tabButtons.forEach(button => {
            button.classList.toggle('active', button.getAttribute('data-tab') === tabName);
        });

        // Tab-Inhalte aktualisieren
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    loadCurrentSettings() {
        // Allgemeine Einstellungen laden
        const ausgabeSelect = this.shadowRoot.querySelector('#ausgabe');
        const disableSuccessAlert = this.shadowRoot.querySelector('#disable_success_alert');

        ausgabeSelect.value = SETTINGS.ausgabe || 'menu';
        disableSuccessAlert.checked = SETTINGS.disable_success_alert || false;

        // SABnzbd-Einstellungen laden
        this.shadowRoot.querySelector('#sab_url').value = SETTINGS.sab_url || '';
        this.shadowRoot.querySelector('#sab_api_key').value = SETTINGS.sab_api_key || '';
        this.shadowRoot.querySelector('#sab_default_category').value = SETTINGS.sab_default_category || '';
        this.shadowRoot.querySelector('#sab_sub_menu').checked = SETTINGS.sab_sub_menu || false;

        // SAB-Kategorien laden
        this.renderCategories();
    }

    renderCategories() {
        this.sabCategoriesContainer.innerHTML = '';

        if (SETTINGS.sab_categories && SETTINGS.sab_categories.length > 0) {
            const categoryList = document.createElement('div');
            categoryList.className = 'category-list';

            SETTINGS.sab_categories.forEach((category, index) => {
                const categoryItem = document.createElement('div');
                categoryItem.className = 'category-item';
                categoryItem.innerHTML = `
                    <span>${category}</span>
                    <button type="button" class="remove-category" data-index="${index}">×</button>
                `;
                categoryList.appendChild(categoryItem);

                // Event-Listener zum Entfernen-Button
                const removeButton = categoryItem.querySelector('.remove-category');
                removeButton.addEventListener('click', () => this.removeCategory(index));
            });

            this.sabCategoriesContainer.appendChild(categoryList);
        } else {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.innerHTML = `
                <p>Keine Kategorien definiert</p>
                <p>Füge Kategorien manuell hinzu oder lade sie von SABnzbd</p>
            `;
            this.sabCategoriesContainer.appendChild(emptyMessage);
        }
    }

    addCategory() {
        const newCategoryInput = this.shadowRoot.querySelector('#new-category');
        const categoryName = newCategoryInput.value.trim();

        if (!categoryName) {
            this.showToast('Bitte gib einen Kategorienamen ein', true);
            return;
        }

        // Kategorien-Array initialisieren, falls nicht vorhanden
        if (!SETTINGS.sab_categories) {
            SETTINGS.sab_categories = [];
        }

        // Prüfen, ob Kategorie bereits existiert
        if (SETTINGS.sab_categories.includes(categoryName)) {
            this.showToast('Diese Kategorie existiert bereits', true);
            return;
        }

        // Neue Kategorie hinzufügen
        SETTINGS.sab_categories.push(categoryName);

        // Eingabe löschen und Kategorien neu rendern
        newCategoryInput.value = '';
        this.renderCategories();
        this.showToast(`Kategorie "${categoryName}" hinzugefügt`);
    }

    removeCategory(index) {
        const categoryName = SETTINGS.sab_categories[index];

        // Erstelle ein eigenes Bestätigungsdialog
        const confirmRemove = confirm(`Möchtest du die Kategorie "${categoryName}" wirklich entfernen?`);

        if (confirmRemove) {
            SETTINGS.sab_categories.splice(index, 1);
            this.renderCategories();
            this.showToast(`Kategorie "${categoryName}" entfernt`);
        }
    }

    loadCategoriesFromSAB() {
        if (!SETTINGS.sab_url || !SETTINGS.sab_api_key) {
            this.showToast('Bitte gib zuerst die SABnzbd URL und den API-Key ein', true);
            return;
        }

        this.loadCategoriesButton.textContent = 'Lade...';
        this.loadCategoriesButton.disabled = true;

        getSabCategorie(
            (categories) => {
                if (categories && categories.length > 0) {
                    SETTINGS.sab_categories = categories;
                    this.renderCategories();
                    this.showToast(`${categories.length} Kategorien von SABnzbd geladen`);
                } else {
                    this.showToast('Keine Kategorien in SABnzbd gefunden', true);
                }
                this.loadCategoriesButton.textContent = 'Kategorien von SABnzbd laden';
                this.loadCategoriesButton.disabled = false;
            },
            (error) => {
                console.error('Fehler beim Laden der Kategorien:', error);
                this.showToast('Fehler beim Laden der Kategorien. Bitte überprüfe die SABnzbd Einstellungen.', true);
                this.loadCategoriesButton.textContent = 'Kategorien von SABnzbd laden';
                this.loadCategoriesButton.disabled = false;
            }
        );
    }

    saveSettings() {
        const newSettings = {
            // Allgemeine Einstellungen
            ausgabe: this.shadowRoot.querySelector('#ausgabe').value,
            disable_success_alert: this.shadowRoot.querySelector('#disable_success_alert').checked,

            // SABnzbd-Einstellungen
            sab_url: this.shadowRoot.querySelector('#sab_url').value,
            sab_api_key: this.shadowRoot.querySelector('#sab_api_key').value,
            sab_default_category: this.shadowRoot.querySelector('#sab_default_category').value,
            sab_sub_menu: this.shadowRoot.querySelector('#sab_sub_menu').checked,
            sab_categories: SETTINGS.sab_categories || [],
        };

        // Einstellungen speichern
        GM_setValue('nzblink_settings', JSON.stringify(newSettings));
        console.log('Einstellungen gespeichert:', newSettings);

        // Speicher-Animation
        this.saveButton.disabled = true;
        this.saveButton.textContent = 'Gespeichert!';
        this.saveButton.style.backgroundColor = 'var(--success-color)';

        // Bestätigung anzeigen
        this.showToast('Einstellungen gespeichert! Seite wird neu geladen...');

        // reload site
        setTimeout(() => {
            location.reload();
        }, 2000);

    }
});

const settingsModal = document.createElement('nzblnk-settings-modal');
document.body.appendChild(settingsModal);

// ------------------------------------------------------------
// nzb handler

function handleNzb(downloadLink, fileName, password) {

    infoModal.print(`Nzb wurde gefunden: <a href='${downloadLink}'>Link</a> (Fallback)`)
    console.log("Nzb Link:", downloadLink, "Name:", fileName, "Passwort:", password)

    const actions = {
        download: () => {
            downloadAndSave({downloadLink, fileName, password})
        },
        menu: () => {
            openMenu({downloadLink, fileName, password}).then(
                () => {
                    console.log('menu opened')
                }
            )
        },
        URLtoSABnzb: () => {
            addNZBtoSABnzbd({downloadLink, fileName, password})
        },
        NZBtoSABnzb: () => {
            downloadAndSab({downloadLink, fileName, password})
        },
        custom: () => {
            customHandler({downloadLink, fileName, password})
        }
    }

    let selected_action = actions[SETTINGS.ausgabe]
    if (!selected_action) {
        console.error("Ungültige AUSGABE Konfiguration")
        alert("Ungültige AUSGABE Konfiguration")
        return;
    }
    selected_action()
}

function parseNzblnkUrl(url) {
    // Entferne 'nzblnk:?' vom Anfang der URL
    let paramsString = url.slice(url.indexOf("?") + 1);

    // Analysiere die Parameter
    const params = new URLSearchParams(paramsString);

    // Füge die Parameter zu einem Objekt hinzu
    let result = {};
    for (let param of params) {
        result[param[0]] = param[1];
    }

    return result;
}

// ------------------------------------------------------------
// load from ...

function loadFromNzbKing(nzb_info, when_failed) {
    console.log("Suche auf nzbking.com")
    GM_xmlhttpRequest({
        method: "GET",
        url: "https://www.nzbking.com/?q=" + nzb_info.h,
        onload: function (response) {
            console.log("King:", response)
            let parser = new DOMParser();
            let doc = parser.parseFromString(response.responseText, 'text/html');

            const nzbLink = doc.querySelector('a[href^="/nzb:"]');
            if (nzbLink) {
                console.log("Auf nzbking gefunden");
                handleNzb("https://www.nzbking.com" + nzbLink.getAttribute('href'), nzb_info.t, nzb_info.p)
                return;
            }

            return when_failed()
        },
        onerror: function () {
            console.error("Request zu NzbKing fehlgeschlagen")
            when_failed()
        }
    });
}

function loadFromNzbIndex(nzb_info, when_failed) {
    console.log("Suche auf nzbindex.com")
    let url = `https://nzbindex.com/api/search?q=${nzb_info.h}&max=5&sort=agedesc`

    GM_xmlhttpRequest({
        method: "GET",
        url: url,
        onload: function (response) {
            console.log("nzbindex:", response)
            let data = JSON.parse(response.responseText);

            if (!data?.data) {
                console.error("Irgengendwas ist komisch bei nzbindex.com")
                console.log(data)
                return when_failed()
            }

            data = data.data

            if (data.page.totalElements === 0) {
                console.log("Nichts auf nzbindex.com gefunden")
                return when_failed()
            }

            if (data.content === undefined) {
                console.log("Keine Ergebnisse auf nzbindex.com gefunden - result is undefined")
                return when_failed()
            }

            if (data.content.length === 0) {
                console.log("Keine Ergebnisse auf nzbindex.com gefunden - result is empty")
                return when_failed()
            }

            if (!data.content[0]?.id) {
                console.log("Id ist nicht gesetzt bei nzbindex.com")
                return when_failed()
            }

            let ids = data.content.map(item => item.id).join(',');

            console.log("Auf nzbindex.com gefunden")
            // mulit ids = https://nzbindex.com/api/download?ids=73464e9e-cc16-397a-baae-2bd2aed8dde4%2C89495f76-b6c6-3d0c-8279-95b3a2ecdaa0&t=1748072644229
            handleNzb("https://nzbindex.com/download?ids=" + ids, nzb_info.t, nzb_info.p)
        },
        onerror: function (response) {
            console.log("Request zu nzbindex.com fehlgeschlagen")
            console.error(response)
            return when_failed()
        }
    });
}

function loadNzbLnk(nzblnk) {
    let nzb_info = parseNzblnkUrl(nzblnk)

    infoModal.resetModal()
    infoModal.showModal()

    const loadFunctions = [
        {
            info: "NzbIndex",
            func: loadFromNzbIndex,
        },
        {
            info: "NzbKing",
            func: loadFromNzbKing,
        }
    ]

    let load = function () {
        infoModal.print(`Keine Nzb gefunden :( `)
        setTimeout(() => {
            infoModal.closeModal()
        }, 6000)
    };

    Array.from(loadFunctions).reverse().forEach(function (f) {
        const old_load = load
        load = function () {
            infoModal.print(`Versuche ${f.info} ....`)

            return f.func(nzb_info, old_load)
        }
    })

    load()
}


// ------------------------------------------------------------
// svg-icons

const downloadIcon = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" style="width: 20px; height: 20px;">
  <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
</svg>
`

const regexIcon = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" style="width: 20px; height: 20px;">
  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
</svg>
`

// ------------------------------------------------------------
// settings menu command

// Register the settings menu command
GM_registerMenuCommand("NZB-Loader Einstellungen", () => {
    settingsModal.showModal();
});

// ------------------------------------------------------------
// trigger

function checkHandelLink(url) {
    if (url.startsWith('nzblnk:')) {
        return true;
    }
    return false;
}

function handleLink(url) {
    loadNzbLnk(url);
}

// Event-Delegation für alle nzblnk-Links
document.body.addEventListener('click', (event) => {
    const linkElement = event.target.closest('a');
    const url = linkElement?.href;
    if (url && checkHandelLink(url)) {
        event.preventDefault();
        handleLink(url);
    }
});


