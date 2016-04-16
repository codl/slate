"use strict";
(function(){

    // there's no real way to check if it is ready other than
    // installing a service worker and listening for a request to /live_comments
    // so i assume that waiting for domready is enough :/

    ipc.sendToHost('status', 'ready');

    var obs = new MutationObserver(relay);
    obs.observe(document.querySelector("ul#all-comments"), {childList: true});

    function relay(mutations){
        for(let mut of mutations){
            let els = Array.from(mut.addedNodes);
            for(let el of els){
                let msg = {
                    type: "message", name: null, content: null, badge: null, avatar: null
                };

                let name_el = el.querySelector(".byline a[data-name]");
                msg.name = name_el.textContent;

                let content_el = el.querySelector(".comment-text");
                msg.content = content_el.textContent;

                if(el.classList.contains("author-is-owner")){
                    msg.badge = "streamer"
                }
                else if(el.classList.contains("author-is-moderator")){
                    msg.badge = "moderator"
                }

                let avatar_el = el.querySelector(".avatar img");
                msg.avatar = avatar_el.src;

                ipc.sendToHost('chat', msg);
            }
        }
    }
})();
