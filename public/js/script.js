jQuery(function($) {
    $("#minimiza").click(function(){
        $(".card-body").slideToggle();
        var icon = document.getElementById("buttonTarefas");
        var c = icon.getAttribute("class")
        if(c == "fa fa-fw fa-minus")
            icon.setAttribute("class", "fa fa-fw fa-plus")
        else
            icon.setAttribute("class", "fa fa-fw fa-minus")
    });
});