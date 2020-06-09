const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const moment = require('moment')
moment().format();
const queryString = require('querystring')

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
        var passedVariable = req.query.valid;
        if(passedVariable != undefined){
            if(passedVariable == "Obra criada com sucesso"){
                var mensagem = []
                mensagem.push({texto: passedVariable})
            }
            else{
                var erros = []
                erros.push({texto: passedVariable})
            }
            res.render("users/obras/obras", {obras: obras, mensagem:mensagem, erros:erros})
        }
        else{
            res.render("users/obras/obras", {obras: obras})
        }
    }).catch(function(erro){
        res.send("Erro: "+ erro)
    })
})

router.get('/obra/:nome', function(req, res){
    Obra.findOne({nome:req.params.nome}).then(function(obra){
        var dataPrevistaInicio = moment(obra.dataPrevistaInicio).format('DD/MM/yyyy')
        var dataPrevistaFim = moment(obra.dataPrevistaFim).format('DD/MM/yyyy')
        var dataInicio = moment(obra.dataInicio).format('DD/MM/yyyy')
        var dataFim = moment(obra.dataFim).format('DD/MM/yyyy')

        var passedVariable = req.query.valid;
        if(passedVariable != undefined){
            if(passedVariable == "Tarefa criada com sucesso"){
                var mensagem = []
                mensagem.push({texto: passedVariable})
            }
            else{
                var erros = []
                erros.push({texto: passedVariable})
            }
            res.render("users/obras/obraDetail", {obra:obra, dataPrevistaInicio:dataPrevistaInicio, dataPrevistaFim:dataPrevistaFim, 
                dataInicio:dataInicio, dataFim:dataFim, mensagem:mensagem, erros:erros})
        }
        else{
            async function secondFunction(){
                var tarefas = await myFunction(obra.tarefas)
                res.render("users/obras/obraDetail", {obra:obra, tarefas:tarefas, dataPrevistaInicio:dataPrevistaInicio, dataPrevistaFim:dataPrevistaFim, dataInicio:dataInicio, dataFim:dataFim})
            };
            secondFunction();       
        }
        
    }).catch(function(erro){
        var string = encodeURI('Obra não encontrada');
        res.redirect('/obras/?valid=' + string);
    })
})

router.get('/tarefas', function(req, res){
    Tarefa.find().lean().then(function(tarefas){
        res.render("users/tarefas/tarefas", {tarefas: tarefas})
    }).catch(function(erro){
        res.send("Erro: "+ erro)
    })
})

async function myFunction(tarefas){
    var a=[]
    for(var i=0; i<tarefas.length; i++){
        await Tarefa.findById(tarefas[i], function(err, tarefa) {
            a.push(tarefa)
        }).lean()
    }
    return a;
}

module.exports = router