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
                    wv.classList.remove("hidden");
                });
            });
            wv.classList.add("hidden");
            wv.src = "https://www.youtube.com/live_chat?is_popout=1&v=7d576UsZFV8";
            chat.appendChild(wv);
        }
    }

    var makechatbutton = document.querySelector("#make-chat");
    makechatbutton.addEventListener("click", make_chat);
}

