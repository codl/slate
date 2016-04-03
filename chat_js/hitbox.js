"use strict";
(function(){
    var obs = new MutationObserver(update_names);
    obs.observe(document.querySelector("ul.chatBody"), {childList: true});

    function update_names(mutations){
        for(let mut of mutations){
            let els = Array.from(mut.addedNodes);
            for(let el of els){
                if(!el.querySelector(".message")) continue; // filter out system messages and such
                if(el.querySelector(".title")) continue;
                let prev = el;
                while(!prev.querySelector(".title")){
                    prev = prev.previousSibling;
                    if(!prev) break;
                }
                if(!prev) break;
                let title = prev.querySelector(".title");
                if(!title) break;
                let inner = el.querySelector("div");
                inner.insertBefore(title.cloneNode(true), inner.querySelector(".message"));
            }
        }
    };
})();
