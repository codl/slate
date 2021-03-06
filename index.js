"use strict";
function init(){
    let fs = require("fs");
    let process = require("process");

    function nowplaying_init(){
        let bg_color = "#333";
        let font = "300 16pt antonio";
        let fg_color = "#efdee4";
        let padding = 12;

        let canvas = document.querySelector("canvas#nowplaying");
        let width = canvas.width;
        let height = canvas.height;

        let stage = new createjs.Stage(canvas);

        let bar = new createjs.Container();
        bar.x = 100;

        let bg = new createjs.Shape();
        bg.points = [ // clockwise, starting from top left
            {x: 0, y: height},
            {x: 0, y: height},
            {x: 0, y: height},
            {x: 0, y: height}
        ];
        bar.addChild(bg);

        let indicator = new createjs.Shape();
        indicator.y = 20;
        indicator.x = 16;
        indicator.height = 15;
        indicator.width = 2/3 * indicator.height;
        indicator.state = "play";
        indicator.mask = bg;

        bar.addChild(indicator);

        let text = new createjs.Text("Sample text", font, fg_color);
        text.mask = bg;
        text.x = indicator.x + indicator.width + padding;
        text.y = padding;
        text.maxWidth = width - padding - text.x - bar.x;

        bar.addChild(text);

        stage.addChild(bar);

        let cover = new createjs.Container();

        cover.mask = new createjs.Shape();
        cover.mask.points = [ // clockwise, starting from top left
            {x: 0, y: height},
            {x: 100, y: height},
            {x: 100, y: height},
            {x: 0, y: height}
        ];

        let cover_bg = new createjs.Shape();
        cover_bg.graphics
            .beginRadialGradientFill(["#666", bg_color], [0, 1], 64, 64, 0, 64, 64, 100)
            .drawRect(0,0,width,height);
        cover.addChild(cover_bg);

        let cover_bitmap = new createjs.Bitmap();
        cover.addChild(cover_bitmap);

        stage.addChild(cover);

        let tl = new TimelineLite();

        function render(){
            requestAnimationFrame(render);

            bg.graphics
                .clear()
                .beginFill(bg_color)
                .moveTo(bg.points[0].x, bg.points[0].y)
                .lineTo(bg.points[1].x, bg.points[1].y)
                .lineTo(bg.points[2].x, bg.points[2].y)
                .lineTo(bg.points[3].x, bg.points[3].y);

            indicator.graphics
                .clear()
                .beginFill(fg_color);

            if(indicator.state == "play"){
                indicator.graphics
                    .moveTo(0,               0)
                    .lineTo(indicator.width, indicator.height/2)
                    .lineTo(0,               indicator.height)
            } else {
                indicator.graphics
                    .moveTo(0,                   0)
                    .lineTo(indicator.width/3,   0)
                    .lineTo(indicator.width/3,   indicator.height)
                    .lineTo(0,                   indicator.height)
                    .moveTo(indicator.width*2/3, 0)
                    .lineTo(indicator.width,     0)
                    .lineTo(indicator.width,     indicator.height)
                    .lineTo(indicator.width*2/3, indicator.height)
            }

            cover.mask.graphics
                .clear()
                .beginFill(0)
                .moveTo(cover.mask.points[0].x, cover.mask.points[0].y)
                .lineTo(cover.mask.points[1].x, cover.mask.points[1].y)
                .lineTo(cover.mask.points[2].x, cover.mask.points[2].y)
                .lineTo(cover.mask.points[3].x, cover.mask.points[3].y);

            stage.update();
        }

        function maybe_overflow(text){

            text.maxWidth = null;
            text.overflow = false;
            text.overflowx = 0;
            let bounds = text.getBounds();
            text.realwidth = bounds.width;
            if(text.realwidth > width){
                text.overflow = true;
            }
        }

        let shown = false;

        function bgWidth(){
            return Math.ceil(text.x + text.getMeasuredWidth() + padding);
        }

        function hide(){
            if(shown){
                shown = false;
                tl
                    .to(bg.points[1], .1, {y: height})
                    .add("a")
                    .to(bg.points[0], .1, {y: height})
                    .to(cover.mask.points[1], .1, {y: height})
                    .to(cover.mask.points[0], .1, {y: height});
            }
        }

        function show(){
            if(!shown){
                shown = true;
                bg.points[1].x = bg.points[2].x = bgWidth();
                tl.to(bg.points[0], .1, {y: 0})
                    .to(bg.points[1], .1, {y: 0})
                    .to(cover.mask.points[1], .1, {y: 0})
                    .to(cover.mask.points[0], .1, {y: 0, x:0});
            }
        }

        let pauseTimeout = 0;

        function scale_cover(image){
            if(!image){
                return image;
            }
            const c = document.createElement('canvas'),
                buf = document.createElement('canvas'),
                ctx = c.getContext('2d'),
                bufctx = buf.getContext('2d');
            const target = 100;
            let width = image.naturalWidth;
            c.width = Math.max(width, target);
            let height = image.naturalHeight;
            c.height = height;
            if(width < target){
                c.height = Math.floor(c.height * target / width);
            }
            ctx.drawImage(image, 0, 0, c.width, c.height);
            while(width > 2 * target){
                // prevent aliasing by scaling in steps
                width = Math.ceil(width / 1.2);
                height = Math.ceil(height / 1.2);
                buf.height = height;
                buf.width = width;
                bufctx.drawImage(c, 0, 0, width, height);
                c.width = width;
                c.height = height;
                ctx.drawImage(buf, 0, 0);
                // it is very silly that i have to juggle two canvases but
                // resizing a canvas clears it instead of just cropping it
            }

            height = height * target / width;
            width = target;
            buf.width = width;
            buf.height = height;
            bufctx.drawImage(c, 0, 0, width, height);
            c.width = width;
            c.height = height;
            ctx.drawImage(buf, 0, 0);

            return c;
        }

        function take(line, state, cover_image){
            if(state != "stop"){
                indicator.state = state;
                text.text = line;
                cover_image = scale_cover(cover_image);
                cover_bitmap.image = cover_image;

                if(shown){
                    const newWidth = bgWidth();
                    tl.add("newWidth")
                        .to(bg.points[1], .2, {x: newWidth}, "newWidth")
                        .to(bg.points[2], .3, {x: newWidth}, "newWidth");
                } else {
                    show();
                }

            } else if(state == "stop"){
                hide();
            }


            if(state == "pause"){
                pauseTimeout = setTimeout(hide, 5000);
            } else {
                clearTimeout(pauseTimeout);
            }
        }

        render();

        return [take];
    }

    let [np_take] = nowplaying_init();

    let previous_song;

    function update_mpd(_, data, quiet){
        let hash = data.state;
        if("file" in data) hash += data.file;
        if("Title" in data) hash += data.Title;
        // this ensures that the notification will show
        // if listening to a stream and the song info changes

        if(previous_song == hash){
            return;
        }
        previous_song = hash;

        if(data.state == "stop"){
            np_take("Stopped", data.state);
        } else {

            let part1, part2;

            part1 = data.Artist || data.Name || "Unknown Artist";
            part2 = data.Title || data.file;

            let cover;
            function finish(){
                np_take(`${part1} - ${part2}`, data.state, cover);
            }

            if("cover" in data){
                cover = new Image();
                cover.corssOrigin = "anonymous";
                cover.addEventListener("load", finish);
                cover.addEventListener("error", function(){
                    cover = null;
                    finish();
                });
                cover.src = data.cover;
            } else {
                finish();
            }
        }
    }



    let ipc = require("electron").ipcRenderer;
    ipc.on("mpd", update_mpd);

    function set_mpd_status(_, status, message){
        let indicator = document.querySelector("#mpd-controls indicator");
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
        let chat = document.querySelector(".chat ul");
        let line = document.createElement("li");
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

    let teardown_chat = noop;
    function chat_callback(e){
        if(e.channel == "chat"){
            chat_message(e.args[0]);
        }
        else if(e.channel == "status"){
            set_chat_status(e.args[0], e.args[1]);
        }
    }

    function set_chat_status(status, message){
        let indicator = document.querySelector("#chat-controls indicator");
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

        let container = document.querySelector("#chat-webviews");
        let chattype = document.querySelector("#chat-type").value;

        if(chattype == "picarto"){
            let channel = document.querySelector("#picarto-channel").value;
            let wv = document.createElement("webview");
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
            let channel = document.querySelector("#hitbox-channel").value;
            let wv = document.createElement("webview");
            wv.preload = __dirname + "/wv_ipc.js";
            wv.addEventListener("dom-ready", function(){
                fs.readFile(__dirname + "/chat_js/hitbox.js", "utf8", function(err, js){
                    if(err) throw err;
                    wv.executeJavaScript(js);
                });
            });
            wv.src = "https://www.hitbox.tv/embedchat/"+channel+"?autoconnect=true";

            wv.addEventListener("ipc-message", chat_callback);
            container.appendChild(wv);
            teardown_chat = mk_generic_teardown(container, wv);
        }
        else if(chattype == "youtube"){
            let url = document.querySelector("#yt-url").value;
            let wv = document.createElement("webview");
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
            let channel = config['twitch-channel'];
            let ffz = config['twitch-ffz'];
            let wv = document.createElement("webview");
            wv.preload = __dirname + "/wv_ipc.js";
            wv.addEventListener("dom-ready", function(){
                fs.readFile(__dirname + "/chat_js/twitch.js", "utf8", function(err, js){
                    if(err) throw err;
                    wv.executeJavaScript(js);
                });
                if(ffz){
                    fs.readFile(__dirname + "/chat_js/twitch_ffz.js", "utf8", function(err, js){
                        if(err) throw err;
                        wv.executeJavaScript(js);
                    });
                }
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
                let lines = content.split("\n\n");
                let timeout;
                function send_demo_line(){
                    let line = lines.shift();
                    let msg = {
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

    let makechatbutton = document.querySelector("#make-chat");
    makechatbutton.addEventListener("click", make_chat);

    const chat_types = [ "youtube", "picarto", "hitbox", "demo", "twitch", "none" ];

    function update_chat_form(){
        let controls = document.querySelector("#chat-controls");
        let chattype = document.querySelector("#chat-type").value;
        for(let type of chat_types){
            controls.classList.remove(type);
        }
        controls.classList.add(chattype);
    }

    let chat_selector = document.querySelector("#chat-type");
    chat_selector.addEventListener("change", update_chat_form);

    ipc.on('youtube-login-done', make_chat);

    document.querySelector('#youtube-login').addEventListener('click', function(){
        ipc.send('youtube-login');
    });

    function mpd_reload(){
        save_config();
        ipc.send('mpd-reload');
    }

    let config = {};

    ipc.on('config', function recv_config(_, _config){
        config = _config;
        let keys = Object.keys(config);
        for(let key of keys){
            let el = document.querySelector("#" + key);
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
        ipc.send('request-mpd-status');
    });

    ipc.send('request-config');

    function save_config(){
        config["chat-type"] = document.querySelector("#chat-type").value;
        config["picarto-channel"] = document.querySelector("#picarto-channel").value;
        config["yt-url"] = document.querySelector("#yt-url").value;
        config["hitbox-channel"] = document.querySelector("#hitbox-channel").value;
        config["twitch-channel"] = document.querySelector("#twitch-channel").value;
        config["twitch-ffz"] = document.querySelector("#twitch-ffz").checked;
        config["mpd-host"] = document.querySelector("#mpd-host").value;
        config["mpd-port"] = document.querySelector("#mpd-port").value;
        config["mpd-dir"] = document.querySelector("#mpd-dir").value;
        ipc.send('save-config', config);
    }

    document.querySelector("#make-chat").addEventListener("click", save_config);

    document.querySelector("#mpd-host").addEventListener("change", mpd_reload);
    document.querySelector("#mpd-port").addEventListener("change", mpd_reload);
    document.querySelector("#mpd-dir").addEventListener("change", mpd_reload);

    document.querySelector("#reload").addEventListener("click", function reload(){
        location.reload();
    });
    document.querySelector("#inspect").addEventListener("click", function inspect(){
        require("electron").remote.getCurrentWebContents().openDevTools({detach: true});
    });
    document.querySelector("#inspect-chat").addEventListener("click", function inspect(){
        document.querySelector("#chat-webviews webview").openDevTools();
    });
}
