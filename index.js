"use strict";
function init(){
    var fs = require("fs");
    var process = require("process");

    function standby_init(){
        var bg_color = "#efdee4";
        var fg_color = "#333";
        var font = "45pt antonio";
        var tscale = 400;


        var canvas = document.querySelector("canvas#standby");
        var width = canvas.width;
        var height = canvas.height;

        var stage = new createjs.Stage(canvas);
        stage.mask = new createjs.Shape();
        stage.mask.height = 0;

        var bg = new createjs.Shape();
        bg.graphics.beginFill(bg_color)
            .rect(0, 0, width, height);
        stage.addChild(bg);

        var starsShape = new createjs.Shape();
        stage.addChild(starsShape);

        var stars = [];
        var stars_max = 15;

        function Star(){
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.radius = Math.random() * 100 + 10;
            this.angle = Math.random() * Math.PI * 2;
            this.draw_on = function draw_on(graphics){
                var radius2 = this.radius / 2.618;
                // it took me a half hour and half an A4 sheet to remember
                // enough trigonometry to find this magic number
                // please dont ask about it

                var randmult = .1 * this.radius;

                // radial: [r, theta]
                var points = [
                        [this.radius, 0 + this.angle],
                        [radius2,     Math.PI/5 + this.angle],
                        [this.radius, 2*Math.PI/5 + this.angle],
                        [radius2,     3*Math.PI/5 + this.angle],
                        [this.radius, 4*Math.PI/5 + this.angle],
                        [radius2,     Math.PI + this.angle],
                        [this.radius, 6*Math.PI/5 + this.angle],
                        [radius2,     7*Math.PI/5 + this.angle],
                        [this.radius, 8*Math.PI/5 + this.angle],
                        [radius2,     9*Math.PI/5 + this.angle]
                    ];

                graphics.beginStroke(fg_color)
                for(var point of points){
                    graphics
                        .lineTo(this.x + point[0] * Math.cos(point[1]) + Math.random()*randmult,
                                this.y + point[0] * Math.sin(point[1]) + Math.random()*randmult)
                }
                graphics.closePath();
            }
        }


        var text = new createjs.Text("", font, fg_color);
        stage.addChild(text);

        var tl = new TimelineLite();

        var frame = 0;
        function render(t){
            frame++;
            requestAnimationFrame(render);
            if(stage.mask.height < 0.01){
                return
            }

            t /= tscale;
            text.x = width / 2 + Math.sin(t/3) * 20;
            text.y = height / 2 + Math.cos(t) * 15;
            text.rotation = Math.sin(t/4.4) * 3;

            stage.mask.graphics
                .clear()
                .beginFill("black")
                .rect(0, height/2 - stage.mask.height/2, width, stage.mask.height);

            if(frame%11 == 1){
                while(stars.length < stars_max / 2 || Math.random() > .97){
                    stars.push(new Star());
                }
                while(stars.length > stars_max || Math.random() > .97){
                    stars.shift();
                }
                starsShape.graphics.clear();
                for(var star of stars){
                    star.draw_on(starsShape.graphics);
                }
            }

            stage.update();
        }

        function take(value){
            text.text = value;
            var bounds = text.getBounds();
            text.regX = Math.floor(bounds.width/2);
            text.regY = Math.floor(bounds.height);
            text.maxWidth = width * .9;
        }

        function show(big){
            tl.clear().to(stage.mask, big?1:0.6, {height: big?height:200});
        }

        function hide(){
            tl.clear().to(stage.mask, 0.6, {height: 0});
        }

        take("Please stand by");
        render(0);

        return [take, show, hide];
    }

    var [standby_take, standby_show, standby_hide] = standby_init();

    function nowplaying_init(){
        var bg_color = "#333";
        var top_font = "33pt antonio";
        var bot_font = "300 20pt antonio";
        var text_color = "#efdee4";
        var text_padding = 14;

        var canvas = document.querySelector("canvas#nowplaying");
        var width = canvas.width;
        var height = canvas.height;

        var stage = new createjs.Stage(canvas);

        var bgtop = new createjs.Shape();
        var bgbot = new createjs.Shape();
        bgtop.height = 0;
        bgbot.height = 0;
        stage.addChild(bgtop);
        stage.addChild(bgbot);

        var bgs = [bgtop, bgbot];

        function maybe_overflow(text, maxlen){
            if(!maxlen) maxlen = 30;

            text.overflow = false;
            text.overflowx = 0;
            var bounds = text.getBounds();
            text.realwidth = bounds.width;
            if(text.text.length > maxlen){
                console.log(text.text.length);
                text.overflow = true;
            }
        }

        var texttop = new createjs.Text("", top_font, text_color);
        var textbot = new createjs.Text("", bot_font, text_color);
        texttop.mask = bgtop;
        textbot.mask = bgbot;

        stage.addChild(texttop);
        stage.addChild(textbot);

        var texts = [texttop, textbot];

        var cover = new createjs.Bitmap();
        cover.mask = new createjs.Shape();
        cover.mask.radius = 0;

        stage.addChild(cover);

        var tl = new TimelineLite({paused: true});

        function render(){
            requestAnimationFrame(render);
            for(var bg of bgs){
                bg.width = width - height - 1; // height is the width of the cover art

                bg.x = height + 1;

                bg.graphics
                    .clear()
                    .beginFill(bg_color)
                    .rect(0, 0, Math.floor(bg.width), Math.floor(bg.height));
            }
            bgtop.y = 0;
            bgbot.y = Math.floor(bgtop.height + 1);

            for(var text of texts){
                text.x = text.mask.x + text_padding;
                text.width = text.mask.width - 2*text_padding;

                if(!text.overflow){
                    text.maxWidth = text.width;
                }

                else if(text.width < text.realwidth){
                    text.x -= text.overflowx;
                }

            }
            texttop.y = bgtop.height - 65;
            textbot.y = bgbot.y + 5;

            cover.mask.graphics
                .clear()
                .beginFill("black")
                .drawCircle(height, 0, cover.mask.radius);

            cover.y = (- height * Math.sqrt(2) + cover.mask.radius) / 6;

            stage.update();
        }

        function maybe_overflow(text){

            text.maxWidth = null;
            text.overflow = false;
            text.overflowx = 0;
            var bounds = text.getBounds();
            text.realwidth = bounds.width;
            if(text.realwidth > width){
                text.overflow = true;
            }
        }

        function take(line1, line2, image){
            texttop.text = line1;
            textbot.text = line2;
            for(var text of texts){
                maybe_overflow(text);
            }

            cover.image = image;
            var coverbounds = cover.getBounds();
            if(coverbounds){
                var biggest = Math.max(coverbounds.width, coverbounds.height);

                while(biggest >= height * 2){
                    // prevent aliasing by scaling in steps
                    var c = document.createElement('canvas');
                    var ctx = c.getContext('2d');
                    c.width = Math.ceil(cover.image.width / 1.2);
                    c.height = Math.ceil(cover.image.height / 1.2);

                    ctx.drawImage(cover.image, 0, 0, c.width, c.height);

                    cover.image = c;
                    coverbounds = cover.getBounds();
                    biggest = Math.max(coverbounds.width, coverbounds.height);
                }

                cover.scaleX = cover.scaleY = height / biggest;
                var scaledbounds = cover.getTransformedBounds();
                cover.x = height - scaledbounds.width;
                cover.width = scaledbounds.width;
            }

            var shown = false;

            if(tl.time() <= tl.getLabelTime("out") && tl.time() >= tl.getLabelTime("wait")){
                shown = true;
            }

            tl.pause()
                .clear()
                .addLabel("in")
                .fromTo(bgtop, .8, {height: 0},
                    {height: 3/5 * height, ease: Power3.easeOut}, "in")
                .fromTo(bgbot, .8, {height: 0},
                    {height: 2/5 * height, ease: Power3.easeOut}, "in+=0.2")
                .fromTo(cover.mask, .6, {radius: 0},
                    {radius: cover.width * Math.sqrt(2), ease: Power3.easeOut}, "in+=0.4")

            tl.addLabel("wait");

            tl.addLabel("overflow", "+=.6");

            var overflowtime = 0;
            for(var text of texts){
                if(text.overflow){
                    var time = (text.realwidth - text.width)/40;
                    overflowtime = Math.max(overflowtime, time);
                }
            }
            for(var text of texts){
                if(text.overflow){
                    console.log("overflow!!!!", text.text, text.text.length, text.realwidth, text.width);
                    tl.to(text, overflowtime, {
                        overflowx: text.realwidth - text.width,
                        ease: Power1.easeInOut
                    }, "overflow");
                }
            }

            tl.addLabel("out", "overflow+=" + Math.max(6, overflowtime + .2))
                .to(bgbot, .4, {height: 0, ease: Power3.easeIn}, "out")
                .to(bgtop, .4, {height: 0, ease: Power3.easeIn}, "out+=.2")
                .to(cover.mask, .4, {radius: 0, ease: Power3.easeIn}, "out+=.2");

            if(shown){
                tl.play("wait");
            }
        }

        function show(){
            if(!tl.isActive()){
                tl.play(0);
            }
        }
        render();

        return [take, show, tl];
    }

    var [np_take, np_show, np_tl] = nowplaying_init();

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
        quiet = quiet || !document.querySelector("#mpd-auto").checked;

        var line1, line2, img;

        line1 = song.Title || song.file;

        line2 = "Unknown Artist";

        if("Artist" in song){
            line2 = song.Artist;
            if("Album" in song && song.Album != song.Title){
                line2 = song.Artist + " - " + song.Album;
            }
        } else if("Name" in song){ // station name, for webradios
            line2 = "Now playing on " + song.Name;
        }

        function finish(){
            np_take(line1, line2, img);
            if(!quiet){
                np_show();
            }
        }

        if("cover" in song){
            img = new Image();
            img.addEventListener("load", finish);
            img.addEventListener("error", function(){
                img = null;
                finish();
            });
            img.src = song.cover;
        } else {
            finish();
        }
    }



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
            wv.src = "https://www.hitbox.tv/embedchat/"+channel+"?autoconnect=true";

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
            var channel = config['twitch-channel'];
            var ffz = config['twitch-ffz'];
            var wv = document.createElement("webview");
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

    function mpd_reload(){
        save_config();
        ipc.send('mpd-reload');
    }

    var config = {};

    ipc.on('config', function recv_config(_, _config){
        config = _config;
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
        config["mpd-auto"] = document.querySelector("#mpd-auto").checked;
        config["mpd-dir"] = document.querySelector("#mpd-dir").value;
        ipc.send('save-config', config);
    }

    document.querySelector("#make-chat").addEventListener("click", save_config);
    document.querySelector("#mpd-auto").addEventListener("change", save_config);

    document.querySelector("#mpd-host").addEventListener("change", mpd_reload);
    document.querySelector("#mpd-port").addEventListener("change", mpd_reload);
    document.querySelector("#mpd-dir").addEventListener("change", mpd_reload);

    document.querySelector("#mpd-showhide").addEventListener("click", np_show);

    document.querySelector("#standby-show").addEventListener("click", ()=>{standby_show(true)});
    document.querySelector("#standby-show-small").addEventListener("click", ()=>{standby_show(false)});
    document.querySelector("#standby-hide").addEventListener("click", standby_hide);
    document.querySelector("#standby-take").addEventListener("click", function standby_take_from_input(){
        var value = document.querySelector("#standby-value").value;
        standby_take(value);
        document.querySelector("#standby-value-feedback").textContent = value;
    });

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
