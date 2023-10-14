// ==UserScript==
// @name                nzblink-to-download
// @description         Automatically downloads NZB files from nzbindex.nl when links with the "nzblnk:" scheme are clicked.
// @description:de_DE   Lädt NZB-Dateien automatisch von nzbindex.nl herunter, wenn auf Links mit dem Schema "nzblnk:" geklickt wird.
// @author              LordBex
// @version             0.3
// @match               *://*/*
// @grant               GM_xmlhttpRequest
// ==/UserScript==

function downloadFile(downloadLink, fileName){
    if (!fileName.endsWith('.nzb')){
        fileName = fileName + '.nzb'
    }
    console.log("Download Nzb von " + downloadLink)
    GM_xmlhttpRequest({
        method: "GET",
        url: downloadLink,
        responseType: "blob",
        onload: function(nzbResponse) {
            let blob = new Blob([nzbResponse.response], { type: "application/x-nzb" });
            let link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName // Dateiname ändern
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        onerror: function(){
            console.error("Failed Request for nzb-king")
        }
    });
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
                downloadFile("https://www.nzbking.com" + e.getAttribute('href'), `${nzb_info.t}{{${nzb_info.p}}}`)
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
            downloadFile("https://nzbindex.nl/download/" + data.results[0].id, `${nzb_info.t}{{${nzb_info.p}}}`)
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
