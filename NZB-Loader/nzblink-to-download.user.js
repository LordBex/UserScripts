// ==UserScript==
// @name                nzblink-to-download
// @description         Automatically downloads NZB files from nzbindex.nl when links with the "nzblnk:" scheme are clicked.
// @description:de_DE   Lädt NZB-Dateien automatisch von nzbindex.nl herunter, wenn auf Links mit dem Schema "nzblnk:" geklickt wird.
// @author              LordBex
// @version             0.4
// @match               *://*/*
// @grant               GM_xmlhttpRequest
// ==/UserScript==


// SabNzbd

const AUSGABE = 'URLtoSABnzbd'  // URLtoSABnzbd | NZBtoSABnzbd (funktioniert nicht bei safari) | download
const SAB_API_KEY = 'API-KEY-HERE';
const SAB_URL = 'http://localhost:8080/sabnzbd/api'; // z.B. 'http://localhost:8080/sabnzbd/api'


function addNZBtoSABnzbd(downloadLink, fileName) {
    const mode = 'addurl';
    const name = encodeURIComponent(downloadLink);
    const requestURL = `${SAB_URL}?output=json&mode=${mode}&name=${name}&nzbname=${fileName}&apikey=${SAB_API_KEY}`;

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

function uploadNZBtoSABnzbd(responseText, fileName) {

    let formData = new FormData();
    let blob = new Blob([responseText], { type: "text/xml" });
    formData.append('name', blob, fileName);
    formData.append('mode', 'addfile');
    formData.append('nzbname', fileName);
    formData.append('output', 'json');
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

// download file-code

function saveFile(responseText, fileName) {
    let blob = new Blob([responseText], { type: "application/x-nzb" });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName // Dateiname ändern
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadFile(downloadLink, fileName, callback){
    if (!fileName.endsWith('.nzb')){
        fileName = fileName + '.nzb'
    }
    console.log("Download Nzb von " + downloadLink)
    GM_xmlhttpRequest({
        method: "GET",
        url: downloadLink,
        onload: function(nzbResponse) {
            callback(nzbResponse.responseText, fileName)
        },
        onerror: function(){
            console.error("Failed Download for  " + downloadLink)
            alert("Nzb könnte nicht geladen werden !")
        }
    });
}

// nzb handler

function handleNzb(downloadLink, fileName){
    switch (AUSGABE) {
        case 'download':
            downloadFile(downloadLink, fileName, saveFile)
            break;
        case 'URLtoSABnzbd':
            addNZBtoSABnzbd(downloadLink, fileName)
            break;
        case 'NZBtoSABnzbd':
            downloadFile(downloadLink, fileName, uploadNZBtoSABnzbd)
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
            if ( data.total ===  0 ){
                return when_failed()
            }
            console.log("Auf nzbindex.nl gefunden")
            handleNzb("https://nzbindex.nl/download/" + data.results[0].id, `${nzb_info.t}{{${nzb_info.p}}}`)
        }
    });
}

function loadNzb(nzblnk){
    let nzb_info = parseNzblnkUrl(nzblnk)

    const king = function() {
        loadFromNzbKing(nzb_info, function() { alert("Keine Nzb gefunden ")})
    }

    loadFromNzbIndex(nzb_info, king)
}

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


// utils

async function getRawFormData(formData) {
    // Wir erstellen eine URL, auf die wir eine Anfrage mit unserer FormData machen werden.
    const dummyURL = URL.createObjectURL(new Blob([]));
    const response = await fetch(dummyURL, {
        method: 'POST',
        body: formData,
        headers: {
            // Wir fügen absichtlich keinen Inhaltstyp hinzu, da der Browser automatisch den richtigen Inhaltstyp hinzufügen sollte,
            // einschließlich des richtigen Grenzwerts für die multipart/form-data.
        }
    });

    // Wir holen den Request, der tatsächlich gesendet wurde.
    const request = response.request || response;

    // Extrahieren des Rohkörpers aus dem Request.
    const body = await request.text();

    // Aufräumen der erstellten Ressource.
    URL.revokeObjectURL(dummyURL);

    return body;
}