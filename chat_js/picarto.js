console.log("hey");
window.setTimeout(function(){
    document.querySelector("#mainContainer").style.top = 0;
    document.querySelector(".tse-scroll-content").style.height = "100%";
    simpleMode = true;
    simpleChat(true, true);
}, 1000);
