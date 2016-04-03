"use strict";
function init(){
    var fs = require("fs");
    var process = require("process");

    var hidetimeout;
    function update_song(_, song){
        var np = document.querySelector(".nowplaying");
        var children = Array.from(np.childNodes);
        for(let child of children){
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

        if(document.querySelector("#mpd-auto").checked){
            showhide_now_playing();
        }
    }

    function showhide_now_playing(){
        show_now_playing();

        if(hidetimeout){
            window.clearTimeout(hidetimeout);
        }

        let length = parseFloat(document.querySelector("#notification-timeout").value);
        if(!length || length < 0.1) length = 10;
        hidetimeout = window.setTimeout(hide_now_playing, Math.floor(length * 1000));
    }

    function show_now_playing(){
        document.querySelector(".nowplaying").classList.add("show");
    }


    function hide_now_playing(){
        if(hidetimeout){
            window.clearTimeout(hidetimeout);
        }
        document.querySelector(".nowplaying").classList.remove("show");
    }

    document.querySelector("#mpd-show").addEventListener("click", show_now_playing);
    document.querySelector("#mpd-hide").addEventListener("click", hide_now_playing);
    document.querySelector("#mpd-showhide").addEventListener("click", showhide_now_playing);

    var ipc = require("electron").ipcRenderer;
    ipc.on("mpd", update_song);

    function make_chat(){
        var chat = document.querySelector(".chat");
        var children = Array.from(chat.childNodes);
        for(let child of children){
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
        else if(chattype == "hitbox"){
            var channel = document.querySelector("#hitbox-channel").value;
            var wv = document.createElement("webview");
            wv.addEventListener("dom-ready", function(){
                fs.readFile(__dirname + "/chat_css/hitbox.css", "utf8", function(err, css){
                    if(err) throw err;
                    wv.insertCSS(css);
                });
                fs.readFile(__dirname + "/chat_js/hitbox.js", "utf8", function(err, js){
                    if(err) throw err;
                    wv.executeJavaScript(js);
                });
            });
            wv.src = "http://www.hitbox.tv/embedchat/"+channel+"?autoconnect=true";
            chat.appendChild(wv);
        }
    }

    var makechatbutton = document.querySelector("#make-chat");
    makechatbutton.addEventListener("click", make_chat);

    const chat_types = [ "youtube", "picarto", "hitbox", "none" ];

    function update_chat_form(){
        var controls = document.querySelector("#chat-controls");
        var chattype = document.querySelector("#chat-type").value;
        for(let type of chat_types){
            controls.classList.remove(type);
        }
        controls.classList.add(chattype);
    }

    var chat_selector = document.querySelector("#chat-type");
    chat_selector.addEventListener("change", update_chat_form);

    ipc.on('youtube-login-done', make_chat);

    document.querySelector('#youtube-login').addEventListener('click', function(){
        ipc.send('youtube-login');
    });

    var config = {};
    var config_file;
    if("XDG_CONFIG_HOME" in process.env && process.env["XDG_CONFIG_HOME"] != "")
        config_file = process.env["XDG_CONFIG_HOME"] + "/slate.json";
    else
        config_file = process.env["HOME"] + "/.config/slate.json";

    fs.readFile(config_file, "utf8", function(err, content){
        if(err) return;
        config = JSON.parse(content);
        var keys = Object.keys(config);
        for(let key of keys){
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
        config["hitbox-channel"] = document.querySelector("#hitbox-channel").value;
        config["mpd-auto"] = document.querySelector("#mpd-auto").checked;
        config["notification-timeout"] = document.querySelector("#notification-timeout").value;
        var content = JSON.stringify(config);
        fs.writeFile(config_file, content);
    }

    document.querySelector("#chat-type").addEventListener("change", save_config);
    document.querySelector("#picarto-channel").addEventListener("change", save_config);
    document.querySelector("#yt-url").addEventListener("change", save_config);
    document.querySelector("#hitbox-channel").addEventListener("change", save_config);
    document.querySelector("#mpd-auto").addEventListener("change", save_config);
    document.querySelector("#notification-timeout").addEventListener("change", save_config);


    document.querySelector("#reload").addEventListener("click", function reload(){
        location.reload();
    });
    document.querySelector("#inspect").addEventListener("click", function inspect(){
        require("remote").getCurrentWebContents().openDevTools({detach: true});
    });
}
