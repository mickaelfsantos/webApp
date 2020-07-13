jQuery(function ($) {
  $("#tarefasButton").click(function () {
    var icon = document.getElementById("buttonTarefas");
    var c = icon.getAttribute("class");
    if (c == "fa fa-fw fa-minus")
      icon.setAttribute("class", "fa fa-fw fa-plus");
    else icon.setAttribute("class", "fa fa-fw fa-minus");
  });

  $("#obrasButton").click(function () {
    var icon = document.getElementById("buttonObras");
    var c = icon.getAttribute("class");
    if (c == "fa fa-fw fa-minus")
      icon.setAttribute("class", "fa fa-fw fa-plus");
    else icon.setAttribute("class", "fa fa-fw fa-minus");
  });

  $("#sidebar-wrapper").css("height", $(window).height() - $("#navbar").outerHeight());

});
