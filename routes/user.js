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
        if(obra != null){
            console.log(obra)
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
                async function secondFunction(){
                    var tarefas = await myFunction(obra.tarefas)
                    res.render("users/obras/obraDetail", {obra:obra, tarefas:tarefas, mensagem:mensagem, erros:erros})
                };
                secondFunction(); 
            }
            else{
                async function secondFunction(){
                    var tarefas = await myFunction(obra.tarefas)
                    res.render("users/obras/obraDetail", {obra:obra, tarefas:tarefas})
                };
                secondFunction();       
            }
        }
        else{
            var string = encodeURI('Obra não encontrada');
            res.redirect('/obras/?valid=' + string);
        }        
    }).catch(function(erro){
        var string = encodeURI('Obra não encontrada');
        res.redirect('/obras/?valid=' + string);
    })
})

router.get('/tarefas', function(req, res){
    Tarefa.find().lean().then(function(tarefas){
        var passedVariable = req.query.valid;
        if(passedVariable != undefined){
            var erros = []
            erros.push({texto: passedVariable})
            console.log(req.url)
            res.render("users/tarefas/tarefas", {tarefas: tarefas, erros:erros})
        }
        else{
            res.render("users/tarefas/tarefas", {tarefas: tarefas})
        }
    }).catch(function(erro){
        res.send("Erro: "+ erro)
    })
})

router.get('/tarefa/:nome', function(req, res){
    Tarefa.findOne({nome:req.params.nome}).then(function(tarefa){
        if(tarefa != null){
            async function secondFunction(){
                var obraS = await myFunctionObra(tarefa.obra)
                res.render("users/tarefas/tarefaDetail", {obra:obraS, tarefa:tarefa})
            };
            secondFunction(); 
        }
        else{
            var string = encodeURI('Tarefa não encontrada');
            res.redirect('/tarefas/?valid=' + string);
        }
    }).catch(function(erro){
        var string = encodeURI('Tarefa não encontrada');
        res.redirect('/tarefas/?valid=' + string);
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

async function myFunctionObra(obra){
    var a=[]
    
    await Obra.findById(obra, function(err, tarefa) {
        a.push(tarefa)
    }).lean()
    return a;
}

module.exports = router