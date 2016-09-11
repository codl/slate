"use strict";
(function f(){
    var chatbody = document.querySelector("ul.chatBody");
    if(!chatbody){
        console.log("ah it wasnt here yet");
        return setTimeout(f, 500);
    }
    var obs = new MutationObserver(relay);
    obs.observe(chatbody, {childList: true});

    var sent_ready = false;

    function relay(mutations){
        for(let mut of mutations){
            let els = Array.from(mut.addedNodes);
            for(let el of els){
                let msg = {
                    type: null, name: null, content: null, badge: null, avatar: null
                };

                if(!sent_ready){
                    ipc.sendToHost('status', 'ready');
                    sent_ready = true;
                }

                var status_el = el.querySelector(".chat-status-message");
                if(status_el){
                    msg.type = "status";
                    status_el.removeChild(status_el.querySelector(".chat-timestamp"));
                    msg.content = status_el.textContent;
                } else {
                    msg.type = "message";
                    let content_el = el.querySelector(".chat-text");

                    // pull image embeds out of their containers
                    let lightboxes = Array.from(content_el.querySelectorAll("a.image"));
                    for(let lightbox of lightboxes){
                        let img = lightbox.querySelector("img");
                        content_el.insertBefore(img.cloneNode(), lightbox);
                        content_el.removeChild(lightbox);
                    }

                    // same with video embeds
                    let videos = Array.from(content_el.querySelectorAll("div.video"));
                    for(let video of videos){
                        let iframe = video.querySelector("iframe");
                        iframe.height = "160px";
                        iframe.width = "200%";
                        // resolve protocol, we don't want file://youtube.com
                        iframe.src = iframe.src;
                        content_el.insertBefore(iframe.cloneNode(), video);
                        content_el.removeChild(video);
                    }

                    let imgs = Array.from(content_el.querySelectorAll("img"));
                    for(let img of imgs){
                        img.src = img.src; // resolve protocol
                    }


                    msg.content = el.querySelector(".chat-text").innerHTML;

                    var title_el = el.querySelector(".title");
                    if(!title_el){
                        // retrieve name and badges from a previous message
                        let prev = el;
                        while(!prev.querySelector(".title")){
                            prev = prev.previousSibling;
                            if(!prev) break; // something awful happened, skip
                        }
                        if(!prev) continue;
                        title_el = prev.querySelector(".title");
                    }

                    msg.name = title_el.querySelector(".name").textContent;
                    if(title_el.querySelector(".chat-badge-owner")) msg.badge = "streamer";
                    if(title_el.querySelector(".chat-badge-mod")) msg.badge = "moderator";
                }
                ipc.sendToHost('chat', msg);
            }
        }
    };
})();
