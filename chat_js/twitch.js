"use strict";
(function(){

    var obs = new MutationObserver(relay);
    obs.observe(document.querySelector("ul.chat-lines"), {childList: true});

    var sent_ready = false;

    function relay(mutations){
        for(let mut of mutations){
            let els = Array.from(mut.addedNodes);
            for(let el of els){
                let msg = {
                    type: null, name: null, content: null, badge: null, avatar: null
                };

                if (! el.querySelector) continue;
                // skip html comments

                if(!sent_ready){
                    ipc.sendToHost('status', 'ready');
                    sent_ready = true;
                }

                el = el.querySelector("li"); // shed ember wrapper

                if(el.classList.contains("admin")){
                    msg.type = "status";
                }
                else {
                    msg.type = "message";
                    let name_el = el.querySelector(".from");
                    msg.name = name_el.textContent;
                }

                let content_el = el.querySelector(".message");
                let imgs = Array.from(content_el.querySelectorAll("img"));
                for(let img of imgs){
                    img.src = img.src; // resolve protocol
                }
                msg.content = content_el.innerHTML;

                if(el.querySelector(".badge .broadcaster")){
                    msg.badge = "streamer"
                }
                else if(el.querySelector(".badge .moderator")){
                    msg.badge = "moderator"
                }

                ipc.sendToHost('chat', msg);
            }
        }
    }
})();
