const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
require("../models/Obra")
const Obra = mongoose.model("obras")

router.get('/', function(req, res){
    res.redirect("/dashboard")
})


router.get('/dashboard', function(req, res){
    res.render("users/dashboard")
})

router.get('/obras', function(req, res){
    Obra.find().lean().then(function(obras){
        res.render("users/obras", {obras: obras}, )
    }).catch(function(erro){
        res.send("Erro")
    })
})


module.exports = router