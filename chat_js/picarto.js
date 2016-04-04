"use strict";
(function(){
    function prepare_chat(){
        simpleMode = true;
        simpleChat(true, true);
    }

    socket.on('connect', prepare_chat);
    if(socket.connected){
        prepare_chat();
    }

    var obs = new MutationObserver(relay);
    obs.observe(document.querySelector("ul#msgs"), {childList: true});

    function relay(mutations){
        for(let mut of mutations){
            let els = Array.from(mut.addedNodes);
            for(let el of els){
                let msg = {
                    type: null, name: null, message: null, badge: null, avatar: null
                };
                var update_el = el.querySelector("span.update");
                if(update_el){
                    msg.message = update_el.textContent;
                    msg.type = "status";
                }
                else{
                    msg.type = "message"
                    var name_el = el.querySelector(
                        ".msgUsername, .msgModeratorUsername, .msgAdminUsername")
                    msg.name = name_el.textContent;

                    var content_el = el.querySelector(".theMsg");
                    // sanitize message
                    let imgs = Array.from(content_el.querySelectorAll("img"));
                    for(let img of imgs){
                        img.src = img.src; // normalize relative URLs
                    }
                    let icons = Array.from(content_el.querySelectorAll("i"));
                    for(let icon of icons){
                        content_el.removeChild(icon);
                    }
                    msg.message = content_el.innerHTML;

                    if(el.querySelector(".stricon")){
                        msg.badge = "streamer";
                    }
                    else if(el.querySelector(".modicon")){
                        msg.badge = "moderator";
                    }
                }
                ipc.sendToHost('chat', msg);
            }
        }
    }
})();
