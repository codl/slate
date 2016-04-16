"use strict";
function init(){
    var fs = require("fs");
    var process = require("process");

    var hidetimeout;
    var previous_song;
    function update_song(_, song, quiet){
        var hash = song.file;
        if("Title" in song) hash += song.Title;
        // this ensures that the notification will show
        // if listening to a stream and the song info changes

        if(previous_song == hash){
            return;
        }
        previous_song = hash;

        var np = document.querySelector(".nowplaying");

        quiet = quiet || !document.querySelector("#mpd-auto").checked;

        if(!quiet){
            np.classList.remove("show");
        }

        var children = Array.from(np.childNodes);
        for(let child of children){
            np.removeChild(child);
        }

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

        if(!quiet){
            // force layout, otherwise the show class and the elements are added
            // in the same layout and the transition never plays
            np.offsetTop;
            showhide_now_playing();
        }
    }

    function showhide_now_playing(){
        show_now_playing();

        let length = parseFloat(document.querySelector("#notification-timeout").value);
        if(!length || length < 0.1) length = 10;
        hidetimeout = window.setTimeout(hide_now_playing, Math.floor(length * 1000));
    }

    function show_now_playing(){
        if(hidetimeout){
            window.clearTimeout(hidetimeout);
            hidetimeout = 0;
        }
        window.requestAnimationFrame(function(){
            document.querySelector(".nowplaying").classList.add("show")
        });
    }


    function hide_now_playing(){
        window.requestAnimationFrame(function(){
            document.querySelector(".nowplaying").classList.remove("show")
        });
    }

    document.querySelector("#mpd-show").addEventListener("click", show_now_playing);
    document.querySelector("#mpd-hide").addEventListener("click", hide_now_playing);
    document.querySelector("#mpd-showhide").addEventListener("click", showhide_now_playing);

    var ipc = require("electron").ipcRenderer;
    ipc.on("mpd", update_song);

    function set_mpd_status(_, status, message){
        var indicator = document.querySelector("#mpd-controls indicator");
        indicator.className = status;
        if(message){
            indicator.title = message;
        }
        else{
            indicator.title = status;
        }
    }
    ipc.on("mpd-status", set_mpd_status);

    function chat_message(msg){
        var chat = document.querySelector(".chat ul");
        var line = document.createElement("li");
        if(msg.badge) line.classList.add(msg.badge);
        if(msg.type) line.classList.add(msg.type);
        if(msg.name){
            let name_el = document.createElement("span");
            name_el.classList.add("name");
            name_el.appendChild(document.createTextNode(msg.name));
            line.appendChild(name_el);
        }
        if(msg.content){
            let message_el = document.createElement("span");
            message_el.classList.add("content");
            message_el.innerHTML = msg.content;
            line.appendChild(message_el);
        }
        chat.appendChild(line);
    }

    function noop(){};

    var teardown_chat = noop;
    function chat_callback(e){
        if(e.channel == "chat"){
            chat_message(e.args[0]);
        }
        else if(e.channel == "status"){
            set_chat_status(e.args[0], e.args[1]);
        }
    }

    function set_chat_status(status, message){
        var indicator = document.querySelector("#chat-controls indicator");
        indicator.className = status;
        if(message){
            indicator.title = message;
        }
        else{
            indicator.title = status;
        }
    }

    function make_chat(){
        teardown_chat(); teardown_chat = noop;

        set_chat_status("starting");

        function mk_generic_teardown(container, webview){
            return function teardown_generic(){
                set_chat_status("stopped");
                container.removeChild(webview);
            }
        }

        var container = document.querySelector("#chat-webviews");
        var chattype = document.querySelector("#chat-type").value;

        if(chattype == "picarto"){
            var channel = document.querySelector("#picarto-channel").value;
            var wv = document.createElement("webview");
            wv.preload = __dirname + "/wv_ipc.js";
            wv.addEventListener("dom-ready", function(){
                fs.readFile(__dirname + "/chat_js/picarto.js", "utf8", function(err, js){
                    if(err) throw err;
                    wv.executeJavaScript(js);
                });
            });
            wv.src = "https://picarto.tv/chatpopout/"+channel+"/public";
            wv.addEventListener("ipc-message", chat_callback);
            container.appendChild(wv);
            teardown_chat = mk_generic_teardown(container, wv);
        }
        else if(chattype == "hitbox"){
            var channel = document.querySelector("#hitbox-channel").value;
            var wv = document.createElement("webview");
            wv.preload = __dirname + "/wv_ipc.js";
            wv.addEventListener("dom-ready", function(){
                fs.readFile(__dirname + "/chat_js/hitbox.js", "utf8", function(err, js){
                    if(err) throw err;
                    wv.executeJavaScript(js);
                });
            });
            wv.src = "http://www.hitbox.tv/embedchat/"+channel+"?autoconnect=true";

            wv.addEventListener("ipc-message", chat_callback);
            container.appendChild(wv);
            teardown_chat = mk_generic_teardown(container, wv);
        }
        else if(chattype == "youtube"){
            var url = document.querySelector("#yt-url").value;
            var wv = document.createElement("webview");
            wv.preload = __dirname + "/wv_ipc.js";
            wv.addEventListener("dom-ready", function(){
                fs.readFile(__dirname + "/chat_js/youtube.js", "utf8", function(err, js){
                    if(err) throw err;
                    wv.executeJavaScript(js);
                });
            });
            wv.src = url;

            wv.addEventListener("ipc-message", chat_callback);
            container.appendChild(wv);
            teardown_chat = mk_generic_teardown(container, wv);
        }
        else if(chattype == "twitch"){
            var channel = document.querySelector("#twitch-channel").value;
            var wv = document.createElement("webview");
            wv.preload = __dirname + "/wv_ipc.js";
            wv.addEventListener("dom-ready", function(){
                fs.readFile(__dirname + "/chat_js/twitch.js", "utf8", function(err, js){
                    if(err) throw err;
                    wv.executeJavaScript(js);
                });
            });
            wv.src = "http://www.twitch.tv/"+channel+"/chat";
            wv.addEventListener("ipc-message", chat_callback);
            container.appendChild(wv);
            teardown_chat = mk_generic_teardown(container, wv);
        }
        else if(chattype == "demo"){
            fs.readFile(__dirname + "/assets/bee.txt", "utf8", function(err, content){
                if(err){
                    console.error(err);
                    set_chat_status("error", err);
                    return;
                }
                var lines = content.split("\n\n");
                var timeout;
                function send_demo_line(){
                    var line = lines.shift();
                    var msg = {
                        name: "Jerry Seinfeld",
                        content: line,
                        badge: Math.random() > 0.7? "streamer" : null,
                        type: "message"
                    }
                    chat_message(msg);
                    lines.push(line);
                    timeout = window.setTimeout(send_demo_line,
                        Math.floor(Math.random() * 9 * 1000));
                }

                send_demo_line();
                set_chat_status("ready");

                teardown_chat = function teardown_demo_chat(){
                    clearTimeout(timeout);
                    set_chat_status("stopped");
                };
            });
        }
        else {
            set_chat_status('stopped');
        }
    }

    var makechatbutton = document.querySelector("#make-chat");
    makechatbutton.addEventListener("click", make_chat);

    const chat_types = [ "youtube", "picarto", "hitbox", "demo", "twitch", "none" ];

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
        ipc.send('send-song', true);
    });

    function save_config(){
        config["chat-type"] = document.querySelector("#chat-type").value;
        config["picarto-channel"] = document.querySelector("#picarto-channel").value;
        config["yt-url"] = document.querySelector("#yt-url").value;
        config["hitbox-channel"] = document.querySelector("#hitbox-channel").value;
        config["twitch-channel"] = document.querySelector("#twitch-channel").value;
        config["mpd-auto"] = document.querySelector("#mpd-auto").checked;
        config["notification-timeout"] = document.querySelector("#notification-timeout").value;
        var content = JSON.stringify(config);
        fs.writeFile(config_file, content);
    }

    document.querySelector("#chat-type").addEventListener("change", save_config);
    document.querySelector("#picarto-channel").addEventListener("change", save_config);
    document.querySelector("#yt-url").addEventListener("change", save_config);
    document.querySelector("#hitbox-channel").addEventListener("change", save_config);
    document.querySelector("#twitch-channel").addEventListener("change", save_config);
    document.querySelector("#mpd-auto").addEventListener("change", save_config);
    document.querySelector("#notification-timeout").addEventListener("change", save_config);


    document.querySelector("#reload").addEventListener("click", function reload(){
        location.reload();
    });
    document.querySelector("#inspect").addEventListener("click", function inspect(){
        require("remote").getCurrentWebContents().openDevTools({detach: true});
    });
    document.querySelector("#inspect-chat").addEventListener("click", function inspect(){
        document.querySelector("#chat-webviews webview").openDevTools();
    });
}
