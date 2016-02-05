function init(){
    var fs = require("fs");

    var hidetimeout;
    function update_song(_, song){
        var np = document.querySelector(".nowplaying");
        var children = Array.from(np.childNodes);
        for(child of children){
            np.removeChild(child);
        }
        np.classList.remove("show");
        if("Artist" in song){
            var artist = document.createElement("p");
            artist.appendChild(document.createTextNode(song.Artist));
            artist.classList.add("small");
            np.appendChild(artist);
        }
        if("Title" in song){
            var title = document.createElement("p");
            title.appendChild(document.createTextNode(song.Title));
            np.appendChild(title);
        } else if("file" in song) {
            var file = document.createElement("p");
            file.appendChild(document.createTextNode(song.file));
            np.appendChild(file);
        }
        if("Album" in song){
            var album = document.createElement("p");
            album.appendChild(document.createTextNode("from " + song.Album));
            album.classList.add("small");
            np.appendChild(album);
        }
        if("Name" in song){ // station name, for webradios
            var name = document.createElement("p");
            var shortened = song.Name;
            if(song.Name.length > 30){
                shortened = song.Name.slice(0, 30) + "...";
            }
            name.appendChild(document.createTextNode("on " + shortened));
            name.classList.add("small");
            np.appendChild(name);
        }

        if(document.querySelector("#mpd-toggle").checked){
            show_now_playing();
        }
    }

    function show_now_playing(){
        var np = document.querySelector(".nowplaying");
        window.setTimeout(function(){ np.classList.add("show"); }, 100);

        if(hidetimeout){
            window.clearTimeout(hidetimeout);
        }

        hidetimeout = window.setTimeout(function(){ np.classList.remove("show"); }, 5000);
    }

    var ipc = require("electron").ipcRenderer;
    ipc.on("mpd", update_song);

    function make_chat(){
        var chat = document.querySelector(".chat");
        var children = Array.from(chat.childNodes);
        for(child of children){
            chat.removeChild(child);
        }

        var chattype = document.querySelector("#chat-type").value;
        if(chattype == "youtube"){
            var url = document.querySelector("#yt-url").value;
            var wv = document.createElement("webview");
            wv.addEventListener("dom-ready", function(){
                fs.readFile(__dirname + "/chat_css/youtube.css", "utf8", function(err, css){
                    if(err) throw err;
                    wv.insertCSS(css);
                });
            });
            wv.src = url;
            chat.appendChild(wv);
        }
        else if(chattype == "picarto"){
            var channel = document.querySelector("#picarto-channel").value;
            var wv = document.createElement("webview");
            wv.addEventListener("dom-ready", function(){
                fs.readFile(__dirname + "/chat_css/picarto.css", "utf8", function(err, css){
                    if(err) throw err;
                    wv.insertCSS(css);
                });
                fs.readFile(__dirname + "/chat_js/picarto.js", "utf8", function(err, js){
                    if(err) throw err;
                    wv.executeJavaScript(js);
                });
            });
            wv.src = "https://picarto.tv/chatpopout/"+channel+"/public";
            chat.appendChild(wv);
        }
    }

    var makechatbutton = document.querySelector("#make-chat");
    makechatbutton.addEventListener("click", make_chat);

    const chat_types = [ "youtube", "picarto", "none" ];

    function update_chat_form(){
        var controls = document.querySelector("#chat-controls");
        var chattype = document.querySelector("#chat-type").value;
        for(type of chat_types){
            controls.classList.remove(type);
        }
        controls.classList.add(chattype);
    }

    var chat_selector = document.querySelector("#chat-type");
    chat_selector.addEventListener("change", update_chat_form);

    var config = {};
    // TODO actually get the fuckin xsomething path
    fs.readFile("/home/codl/.config/slate.json", "utf8", function(err, content){
        if(err) return;
        config = JSON.parse(content);
        var keys = Object.keys(config);
        for(key of keys){
            var el = document.querySelector("#" + key);
            if(el){
                if(el.type == "checkbox"){
                    el.checked = config[key];
                } else {
                    el.value = config[key];
                }
            }
        }
        update_chat_form();
        make_chat();
    });

    function save_config(){
        config["chat-type"] = document.querySelector("#chat-type").value;
        config["picarto-channel"] = document.querySelector("#picarto-channel").value;
        config["yt-url"] = document.querySelector("#yt-url").value;
        config["mpd-toggle"] = document.querySelector("#mpd-toggle").checked;
        var content = JSON.stringify(config);
        // TODO ditto
        fs.writeFile("/home/codl/.config/slate.json", content);
    }

    document.querySelector("#save").addEventListener("click", save_config);
}

