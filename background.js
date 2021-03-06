function showMessage(title, message) {
    var opt = {
        type: 'basic',
        iconUrl: 'yd-128.png',
        title: title,
        message: message
    };
    chrome.notifications.create("",opt, function(id) {
        timer = setTimeout(function(){chrome.notifications.clear(id);}, 3000);
    });
}

function getStatus(href, token, link) {
    var request = new XMLHttpRequest();
    request.open("GET", href);
    request.setRequestHeader('Accept', 'application/json');
    request.setRequestHeader('Content-Type', 'application/json');
    request.setRequestHeader('Authorization', 'OAuth ' + token);
    request.onload = function() {
        var obj = JSON.parse(request.responseText);
        if (obj.status == "in-progress") {
            timer = setTimeout(function(){}, 500);
            getStatus(href, token, link);
        } else {
            var text = obj.status == "success"
                    ? chrome.i18n.getMessage("downloadSuccessful")
                    : chrome.i18n.getMessage("downloadFailure");
            showMessage(text, link);
        }
    }
    request.send();
};

function getFilename(url){
    var result = url.substring(0, (url.indexOf("#") == -1)
                               ? url.length : url.indexOf("#"));
    result = result.substring(0, (result.indexOf("?") == -1)
                              ? result.length : result.indexOf("?"));
    result = result.substring(result.lastIndexOf("/") + 1, result.length);

    if (result == "") {
        result = url.replace("http://","").replace("https://","").replace("/","");
        result += ".html";
    }
    if (!(result.indexOf(".")+1))
        result += ".html";

    return result;
}

function getClickHandler() {
    return function(info, tab) {
        chrome.storage.sync.get({"token":"", "path":"disk:/Downloads"}, function(items) {
            if (!chrome.runtime.error) {
                var token = items.token;
                var link = info.linkUrl != null ? info.linkUrl : info.srcUrl;

                var url = encodeURIComponent(link);
                var path = encodeURIComponent(
                            items.path + "/" + getFilename(link));

                var request = new XMLHttpRequest();
                request.open("POST", 'https://cloud-api.yandex.net:443'
                             +'/v1/disk/resources/upload?disable_redirects=false'
                             +"&url=" + url + "&path=" + path);
                request.setRequestHeader('Accept', 'application/json');
                request.setRequestHeader('Content-Type', 'application/json');
                request.setRequestHeader('Authorization', 'OAuth ' + token);
                request.onload = function() {
                    if (request.status == 202) {
                        var obj = JSON.parse(request.responseText);
                        getStatus(obj.href, token, link);
                    } else {
                        showMessage(chrome.i18n.getMessage("downloadFailure"),
                                    request.statusText);
                    }
                }
                request.send();
            }
        });
    };
};

chrome.contextMenus.create
        ({
             "title" : chrome.i18n.getMessage("menuName"),
             "type" : "normal",
             "contexts" : ["image","link"],
             "onclick" : getClickHandler()
         });
