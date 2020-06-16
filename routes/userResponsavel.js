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

router.post('/obras/add', function asyncFunction(req, res){
    
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
        var novaObra;
        if(req.body.dataPrevistaInicio){
            novaObra = {
                nome: req.body.nome,
                descricao: req.body.descricao,
                dataPrevistaInicio: req.body.dataPrevistaInicio
            }
        }
        else{
            novaObra = {
                nome: req.body.nome,
                descricao: req.body.descricao
            }
        }
        
    
        new Obra(novaObra).save().then(function(){
            req.flash("success_msg", "Obra criada com sucesso")
            res.redirect("/obras");
        }).catch(function(erro){
            req.flash("error_msg", "Já existe uma obra com o mesmo nome ou houve um erro ao adicionar a obra. Tente novamente.")
            res.redirect("/obras/add");
            //erros.push({texto:"Já existe uma obra com o mesmo nome ou houve um erro ao adicionar a obra. Tente novamente."})
            //res.render("usersResponsaveis/obras/novaObra", {erros: erros})
        })
    
    }
})


router.get('/obra/:nome/addTarefa', function(req, res){
    res.render("usersResponsaveis/tarefas/novaTarefa", {nome:req.params.nome})
})

router.post('/obra/:nome/addTarefa', function asyncFunction(req, res){
    
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
        res.render("usersResponsaveis/tarefas/novaTarefa", {nome: req.params.nome, erros: erros})
    }
    else{
        Obra.findOne({"nome":req.params.nome}).then(function(obra){
            var novaTarefa;
            if(req.body.dataPrevistaInicio){
                novaTarefa = {
                    nome: req.body.nome,
                    descricao: req.body.descricao,
                    dataPrevistaInicio: req.body.dataPrevistaInicio,
                    obra: obra._id
                }
            }
            else{
                novaTarefa = { 
                    nome: req.body.nome,
                    descricao: req.body.descricao,
                    obra: obra._id
                }
            }
        
            new Tarefa(novaTarefa).save().then(function(){
                Tarefa.findOne({"nome":novaTarefa.nome}).then(function(tarefa){
                    Obra.updateOne(
                        {"nome":obra.nome},
                        {$push: {tarefas : tarefa._id}}
                    ).then(function(){
                        req.flash("success_msg", "Tarefa criada com sucesso")
                        res.redirect('/obra/'+obra.nome);
                    }).catch(function(erro){
                        req.flash("error_msg", "Erro ao atualizar a obra")
                        res.redirect('/obras/');
                    })
                }).catch(function(erro){
                    req.flash("error_msg", "Erro ao encontrar a tarefa")
                    res.redirect('/obra/'+obra.nome);
                })
                  
            }).catch(function(erro){
                console.log("entrou")
                req.flash("error_msg", "Já existe uma tarefa com o mesmo nome ou houve um erro ao adicionar a tarefa. Tente novamente.")
                res.redirect("/obra/"+obra.nome+"/addTarefa");
                //erros.push({texto:"Já existe uma tarefa com o mesmo nome ou houve um erro ao adicionar a tarefa. Tente novamente."})
                //res.render("usersResponsaveis/tarefas/novaTarefa", {nome: obra.nome, obra: obra, erros: erros})
            })
        }).catch(function(erro){
            req.flash("error_msg", "Erro interno ao adicionar a tarefa")
            res.redirect('/tarefas/');
        })
        
    }
})


module.exports = router