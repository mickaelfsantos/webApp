jQuery(function ($) {
  $("#sidebar-wrapper").css("height", "100vh" - $("#navbar").outerHeight());
  $("#sidebar-wrapper").css("min-height", $(window).height() - $("#navbar").outerHeight());
  
  if($(window).width() < 760){
    $(".d-flex").removeClass("toggled")
  }


});
