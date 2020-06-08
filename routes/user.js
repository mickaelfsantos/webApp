const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const moment = require('moment')
moment().format();

//models
    require("../models/Obra")
    require("../models/Tarefa")
    const Obra = mongoose.model("obras")
    const Tarefa = mongoose.model("tarefas")

router.get('/', function(req, res){
    res.redirect("/dashboard")
})


router.get('/dashboard', function(req, res){
    res.render("users/dashboard")
})

router.get('/obras', function(req, res){
    Obra.find().lean().then(function(obras){
        res.render("users/obras/obras", {obras: obras})
    }).catch(function(erro){
        res.send("Erro: "+ erro)
    })
})

router.get('/obra/:nome', function(req, res){
    Obra.findOne({"nome":req.params.nome}).then(function(obra){
        var dataPrevistaInicio = moment(obra.dataPrevistaInicio).format('DD/MM/yyyy')
        var dataPrevistaFim = moment(obra.dataPrevistaFim).format('DD/MM/yyyy')
        var dataInicio = moment(obra.dataInicio).format('DD/MM/yyyy')
        var dataFim = moment(obra.dataFim).format('DD/MM/yyyy')
        res.render("users/obras/obraDetail", {obra:obra, dataPrevistaInicio:dataPrevistaInicio, dataPrevistaFim:dataPrevistaFim, dataInicio:dataInicio, dataFim:dataFim})
    }).catch(function(erro){
        res.send("Erro: "+ erro)
    })
})

router.get('/tarefas', function(req, res){
    Tarefa.find().lean().then(function(tarefas){
        res.render("users/tarefas/tarefas", {tarefas: tarefas})
    }).catch(function(erro){
        res.send("Erro: "+ erro)
    })
})

module.exports = router