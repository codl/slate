(function(){
    function prepare_chat(){
        document.querySelector("#mainContainer").style.top = 0;
        document.querySelector(".tse-scroll-content").style.height = "100%";
        simpleMode = true;
        simpleChat(true, true);
    }

    socket.on('connect', prepare_chat);
    if(socket.connected){
        prepare_chat();
    }
})();
