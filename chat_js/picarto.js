"use strict";
(function(){
    function ready(){
        simpleMode = true;
        simpleChat(true, true);
        ipc.sendToHost('status', 'ready');
    }

    socket.On('Connect', ready);
    if(socket.Connected){
        ready();
    }

    var obs = new MutationObserver(relay);
    obs.observe(document.querySelector("ul#msgs"), {childList: true});

    function relay(mutations){
        for(let mut of mutations){
            let els = Array.from(mut.addedNodes);
            for(let el of els){
                let msg = {
                    type: null, name: null, content: null, badge: null, avatar: null
                };
                var update_el = el.querySelector("span.update");
                if(update_el){
                    msg.content = update_el.textContent;
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
                    msg.content = content_el.innerHTML;

                    if(el.querySelector(".msgAdminUsername")){
                        msg.badge = "streamer";
                    }
                    else if(el.querySelector(".msgModeratorUsername")){
                        msg.badge = "moderator";
                    }
                }
                ipc.sendToHost('chat', msg);
            }
        }
    }
})();
