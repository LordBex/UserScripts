// ==UserScript==
// @name                nzblink-to-download
// @description         Automatically downloads NZB files from nzbindex.nl when links with the "nzblnk:" scheme are clicked.
// @description:de_DE   Lädt NZB-Dateien automatisch von nzbindex.nl herunter, wenn auf Links mit dem Schema "nzblnk:" geklickt wird.
// @author              LordBex
// @version             v0.5
// @match               *://*/*
// @grant               GM_xmlhttpRequest
// ==/UserScript==


//- Default Config:

const AUSGABE = 'download'
// mögliche Werte:
// - download
// - URLtoSABnzb
// - NZBtoSABnzb (nicht kompatible mit Safari)

// ------------------------------------------------------------
//- SabNzbd Config:

const SAB_API_KEY = '....';
const SAB_URL = 'http://localhost:8080/sabnzbd/api'; // z.B. 'http://localhost:8080/sabnzbd/api'

const SAB_CATEGORY_SELECT_ON = true   // Bitte den Api-Key verwenden (nicht den Nzb-Key) !
// or setup:
const SAB_DEFAULT_CATEGORY = '*' // default: *


// ------------------------------------------------------------
// sab-code

function addNZBtoSABnzbd({downloadLink, fileName, category=SAB_DEFAULT_CATEGORY}) {
    const mode = 'addurl';
    const name = encodeURIComponent(downloadLink);
    const requestURL = `${SAB_URL}?output=json&mode=${mode}&name=${name}&nzbname=${fileName}&cat=${category}&apikey=${SAB_API_KEY}`;

    GM_xmlhttpRequest({
        method: "GET",
        url: requestURL,
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json"
        },
        onload: function(response) {
            console.log(response.responseText);
            let result = JSON.parse(response.responseText);

            if (result.status === true) {
                alert('Erfolg! NZB hinzugefügt. ID: ' + result.nzo_ids.join(', '));
            } else {
                alert('Fehler beim Hinzufügen der NZB-Datei zu SABnzbd.\n'+result.error);
            }
        },
        onerror: function(response) {
            console.error('Anfrage fehlgeschlagen', response);
            alert("Anfrage an SABnzb schlug fail ! (mehr im Log)")
        }
    });
}

function uploadNZBtoSABnzbd({responseText, fileName, category=SAB_DEFAULT_CATEGORY}) {

    let formData = new FormData();
    let blob = new Blob([responseText], { type: "text/xml" });
    formData.append('name', blob, fileName);
    formData.append('mode', 'addfile');
    formData.append('nzbname', fileName);
    formData.append('output', 'json');
    formData.append('cat', category);
    formData.append('apikey', SAB_API_KEY);

    GM_xmlhttpRequest({
        method: "POST",
        url: SAB_URL,
        data: formData,
        onload: function(response) {
            console.log('Upload response', response.status, response.statusText);
            console.log('Response body', response.responseText);
            let result = JSON.parse(response.responseText);
            if (result.status === true) {
                alert('Success! NZB added. ID: ' + result.nzo_ids.join(', '));
            } else {
                alert('Error adding NZB file to SABnzbd.\n'+(result.error || 'Unknown error'));
            }
        },
        onerror: function(response) {
            console.error('Error during file upload', response.status, response.statusText);
            alert("Could not upload NZB! (more in log)");
        }
    });
}

// ------------------------------------------------------------
// download file-code

function saveFile({responseText, fileName}) {
    let blob = new Blob([responseText], { type: "application/x-nzb" });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName // Dateiname ändern
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadFile({downloadLink, fileName, callback}){
    if (!fileName.endsWith('.nzb')){
        fileName = fileName + '.nzb'
    }
    console.log("Download Nzb von " + downloadLink)
    GM_xmlhttpRequest({
        method: "GET",
        url: downloadLink,
        onload: function(nzbResponse) {
            callback({
                responseText: nzbResponse.responseText,
                fileName
            })
        },
        onerror: function(){
            console.error("Failed Download for  " + downloadLink)
            alert("Nzb könnte nicht geladen werden !")
        }
    });
}

// ------------------------------------------------------------
// handle sab category select

customElements.define('sab-select-modal', class SabSelectModal extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        // Create a shadow root
        const shadow = this.attachShadow({ mode: "open" });
        shadow.innerHTML = `
             <style>
                .show {
                    display: block
                }
                .show .modal-dialog {
                    display: block
                }
                
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
                    padding: 1.6rem;
                    max-height: 70%;
                }
        
                .dialog-header {
                    color: white;
                    font-family: Inter, sans-serif;
                    font-size: 20px;
                    font-weight: 600;
                    display: flex;
                    justify-content: space-between;
                    padding-bottom: 10px;
                }
        
                .buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    min-width: 400px;
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

    showModal (items, callback) {
        this.dialog.showModal()

        const modalContent = this.shadowRoot.querySelector('.buttons-here');
        modalContent.innerHTML = '';

        items.forEach(item => {
            const button = document.createElement('button');
            button.textContent = item.name;
            button.className = 'btn';
            button.onclick = () => {
                callback(item.value);
            };
            modalContent.appendChild(button);
        });
    }

    closeModal () {
        this.dialog.close()
    }
});

const modal = document.createElement('sab-select-modal');
document.body.appendChild(modal);

function selectCategory(callback){
    const mode='get_cats'
    const requestURL = `${SAB_URL}?output=json&mode=${mode}&apikey=${SAB_API_KEY}`;

    return GM_xmlhttpRequest({
        method: "GET",
        url: requestURL,
        onload: function(response) {
            const data = JSON.parse(response.responseText)
            const categories = data.categories
            const formattedCategories = categories.map(item => {
                return {
                    name: item.charAt(0).toUpperCase() + item.slice(1), // Erstes Zeichen groß und Rest klein
                    value: item
                };
            });
            modal.showModal(formattedCategories, callback);
        },
        onerror: function(response) {
            console.error('Error during file upload', response.status, response.statusText);
            alert("Could get Category's from SAB! (more in log)");
        }
    });
}

function handleCategorySelect(callfunction, parameter){
    if (SAB_CATEGORY_SELECT_ON){
        selectCategory((value) => {
            parameter.category = value
            callfunction(parameter)
        })
    } else {
        callfunction(parameter)
    }
}

// ------------------------------------------------------------
// nzb handler

function handleNzb(downloadLink, fileName){
    switch (AUSGABE) {
        case 'download':
            downloadFile({
                downloadLink, fileName, callback: saveFile
            })
            break;
        case 'URLtoSABnzb':
            handleCategorySelect(addNZBtoSABnzbd, {downloadLink, fileName})
            break;
        case 'NZBtoSABnzb':
            downloadFile({
                downloadLink,
                fileName,
                callback: (parameter) => {handleCategorySelect(uploadNZBtoSABnzbd, parameter)}
            })
            break;
        default:
            alert("Die Config für die Ausgaben ist falsch !")
    }
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
    GM_xmlhttpRequest({
        method: "GET",
        url: "https://www.nzbking.com/?q=" + nzb_info.h,
        onload: function(response) {
            let parser = new DOMParser();
            let doc = parser.parseFromString(response.responseText, 'text/html');

            for (let e of doc.querySelectorAll('a[href^="/nzb:"]')){
                console.log("Auf nzbking gefunden")
                handleNzb("https://www.nzbking.com" + e.getAttribute('href'), `${nzb_info.t}{{${nzb_info.p}}}`)
                return
            }
            return when_failed()
        },
        onerror: function(){
            console.error("Failed Request for nzb-index")
        }
    });
}

function loadFromNzbIndex(nzb_info, when_failed) {
    let url = `https://nzbindex.nl/search/json?q=${nzb_info.h}&max=5&minage=0&maxage=0&hidespam=1&hidepassword=0&sort=agedesc&minsize=0&maxsize=0&complete=0&hidecross=0&hasNFO=0&poster=&p=0`

    GM_xmlhttpRequest({
        method: "GET",
        url: url,
        onload: function(response) {
            console.log(response)
            let data = JSON.parse(response.responseText);
            if ( data.stats.total ===  0 ){
                return when_failed()
            }
            console.log("Auf nzbindex.nl gefunden")
            handleNzb("https://nzbindex.nl/download/" + data.results[0].id, `${nzb_info.t}{{${nzb_info.p}}}`)
        }
    });
}

function loadNzb(nzblnk){
    let nzb_info = parseNzblnkUrl(nzblnk)


    loadFromNzbKing(nzb_info, function() { alert("Keine Nzb auf NzbKing gefunden ")})


    loadFromNzbIndex(nzb_info,  function() { alert("Keine Nzb auf NzbIndex gefunden ")})
}

// ------------------------------------------------------------
// trigger

function setLNKTrigger(element){
    if (element.tagName === 'A'){
        if (!element.href.startsWith('nzblnk')){
            console.log("Kein NZB-LNK element")
            console.log(element)
            return
        }
        console.log("Update NZB-LNK element")
        element.dataset.link = element.href
        element.href = ""

        element.addEventListener('click', (event) => {
            event.preventDefault();
            loadNzb(element.dataset.link);
        });
    } else {
        element.querySelectorAll('a[href^="nzblnk"]').forEach((e) => {
            setLNKTrigger(e)
        });
    }
}

function observeSiteChanges(){
    const callback = function(mutationsList, observer) {
        for ( let mutation of mutationsList ) {
            if ( mutation.type === 'childList' ) {
                for ( let node of mutation.addedNodes ){
                    if (!node instanceof Node || node.nodeType !== Node.ELEMENT_NODE) {
                        continue
                    }
                    setLNKTrigger(node)
                }
            }
        }
    };
    const observer = new MutationObserver(callback);
    const config = { childList: true, subtree: true };
    // Die Überwachung starten
    observer.observe(document, config);
}

setLNKTrigger(document.body);
observeSiteChanges();

