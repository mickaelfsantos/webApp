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


router.get('/obras/add', function(req, res){
    res.render("usersResponsaveis/obras/novaObra")
})

router.post('/obras/add', function(req, res){
    
    var erros = []

    if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
        erros.push({texto: "Nome inválido"});
    }

    if(!req.body.descricao || typeof req.body.descricao == undefined || req.body.descricao == null){
        erros.push({texto: "Descrição inválida"});
    } else{
        if(req.body.descricao.length < 5){
            erros.push({texto: "Descrição com tamanho inválido. Mínimo de 5 caracteres!"});
        }
    }

    var today = moment().format("YYYY-MM-DD");
    if(req.body.dataPrevistaInicio){
        var date = moment(req.body.dataPrevistaInicio).format("YYYY-MM-DD")
        if(moment(date).isValid()){
            if(moment(today).isAfter(date) == true){
                erros.push({texto: "Data invalida. Data de inicio tem que ser uma data supeior à data de hoje."});
            }
        }
    }
    

    if(erros.length > 0){
        res.render("usersResponsaveis/obras/novaObra", {erros: erros})
    }
    else{
        const novaObra = {
            nome: req.body.nome,
            descricao: req.body.descricao,
            funcionarios: req.body.funcionarios,
            dataPrevistaInicio: req.body.dataPrevistaInicio
        }
    
        new Obra(novaObra).save().then(function(){
            var mensagem = []
            mensagem.push({texto:"Obra criada com sucesso"});
            res.render("usersResponsaveis/obras/novaObra", {mensagem: mensagem})
        }).catch(function(erro){
            console.log("Erro: "+erro)
            var erro=[]
            erro.push({texto:"Já existe uma obra com o mesmo nome ou houve um erro ao adicionar a obra. Tente novamente."})
            res.render("usersResponsaveis/obras/novaObra", {erro: erro})
        })
    
    }
})


router.get('/obras/:nome/addTarefa', function(req, res){
    res.render("usersResponsaveis/tarefas/novaTarefa", {nome:req.params.nome})
})

router.post('/obras/:nome/addTarefa', function(req, res){
    
    var erros = []

    if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
        erros.push({texto: "Nome inválido"});
    }

    if(!req.body.descricao || typeof req.body.descricao == undefined || req.body.descricao == null){
        erros.push({texto: "Descrição inválida"});
    } else{
        if(req.body.descricao.length < 5){
            erros.push({texto: "Descrição com tamanho inválido. Mínimo de 5 caracteres!"});
        }
    }

    var today = moment().format("YYYY-MM-DD");
    if(req.body.dataPrevistaInicio){
        var date = moment(req.body.dataPrevistaInicio).format("YYYY-MM-DD")
        if(moment(date).isValid()){
            if(moment(today).isAfter(date) == true){
                erros.push({texto: "Data invalida. Data de inicio tem que ser uma data supeior à data de hoje."});
            }
        }
    }
    

    if(erros.length > 0){
        res.render("usersResponsaveis/tarefas/novaTarefa", {erros: erros})
    }
    else{
        Obra.findOne({"nome":req.params.nome}).then(function(obra){
            console.log(obra)
            const novaTarefa = {
                nome: req.body.nome,
                descricao: req.body.descricao,
                dataPrevistaInicio: req.body.dataPrevistaInicio,
                obra: obra
            }
        
            new Tarefa(novaTarefa).save().then(function(){
                var mensagem = []
                mensagem.push({texto:"Tarefa criada com sucesso"});
                res.render("usersResponsaveis/tarefas/novaTarefa", {mensagem: mensagem})
            }).catch(function(erro){
                console.log("Erro: "+erro)
                var erro=[]
                erro.push({texto:"Já existe uma tarefa com o mesmo nome ou houve um erro ao adicionar a tarefa. Tente novamente."})
                res.render("usersResponsaveis/tarefas/novaTarefa", {erro: erro})
            })
        }).catch(function(erro){
            res.send("Erro: "+ erro)
        })
        
    }
})


module.exports = router