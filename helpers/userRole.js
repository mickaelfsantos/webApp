module.exports = {
    authenticated: function(req, res, next){
        if(req.isAuthenticated()){
            return next();
        }

        req.flash("error_msg", "Inicie sessão.")
        res.redirect("/login")
    },

    userResponsavel: function(req, res, next){
        if(req.user.role == "userResponsavel" || req.user.role == "admin"){
            return next();
        }

        req.flash("error_msg", "Acesso negado.")
        res.redirect("/dashboard")
    }, 

    admin: function(req, res, next){
        if(req.user.role == "admin"){
            return next();
        }

        req.flash("error_msg", "Acesso negado.")
        res.redirect("/dashboard")
    }
}