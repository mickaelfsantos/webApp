const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const moment = require('moment')
moment().format();
const Holidays = require('date-holidays')
const hd = new Holidays('PT')
var momentBD = require('moment-business-days');
const {authenticated, admin, userResponsavel} = require('../helpers/userRole');
const userRole = require('../helpers/userRole');
const pdf = require("html-pdf")
const fs = require("fs")
const path = require("path")
const formidable = require('formidable');
const e = require('express');
const { O_NONBLOCK } = require('constants');
const multer = require("multer");
const bcrypt = require('bcryptjs')

const targetPath = path.resolve('public/img');
const upload = multer({
    dest: targetPath
  });

//models
    require("../models/Obra")
    require("../models/Tarefa")
    require("../models/Funcionario")
    require("../models/Maquina")
    require("../models/Compra")
    require("../models/Cliente")
    const Obra = mongoose.model("obras")
    const Tarefa = mongoose.model("tarefas")
    const Funcionario = mongoose.model("funcionarios")
    const Maquina = mongoose.model("maquinas")
    const Requisicao = mongoose.model("requisicoes")
    const Compra = mongoose.model("compras")
    const Cliente = mongoose.model("clientes")

router.get('/obras/add', authenticated, userResponsavel, function(req, res){
    Cliente.find().lean().then(function(clientes){
        var cliente = JSON.stringify(null);
        res.render("usersResponsaveis/obras/novaObra", {clientes:clientes, cliente:cliente})
    })
})

router.post('/obras/add', authenticated, userResponsavel, function asyncFunction(req, res){
    
    var erros = new Object();
    var nomeO;
    var descricao;
    var data;
    var cliente;

    if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
        erros.nome = "Nome inválido";
    }
    else{
        if(req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,'').length < 2){
            erros.nome = "Nome com tamanho inválido. Mínimo de 3 caracteres, sendo que pode possuir apenas 1 espaço.";
        }else{
            nomeO = req.body.nome;
        }
    }
    

    if(!req.body.descricao || typeof req.body.descricao == undefined || req.body.descricao == null){
        erros.descricao = "Descrição inválida";
    } else{
        if(req.body.descricao.replace(/\s\s+/g, ' ').replace(/\s*$/,'').length < 4){
            erros.descricao = "Descrição com tamanho inválido. Mínimo de 5 caracteres, sendo que pode possuir apenas 2 espaços.";
        }
        else{
            descricao = req.body.descricao
        }
    }

    
    if(!req.body.cliente || typeof req.body.cliente == undefined || req.body.cliente == null || req.body.cliente == "nome"){
        erros.cliente = "Cliente obrigatório.";
        cliente = JSON.stringify(null);
    } 
    else{
        cliente = JSON.stringify(req.body.cliente);
    }

    var today = moment().format("YYYY-MM-DD HH:mm");
    if(req.body.dataPrevistaInicio){
        var date = moment(req.body.dataPrevistaInicio).format("YYYY-MM-DD HH:mm");
        date = moment(date).add(1, 'minutes');
        if(moment(date).isValid()){
            if(moment(today).isAfter(date) == true){
                erros.datas = "Data invalida. Data de inicio tem que ser uma data supeior à data de hoje.";
            }
            else{
                if(moment(req.body.dataPrevistaInicio).format("HH") >= 18 && moment(req.body.dataPrevistaInicio).format("mm") > 00)
                    erros.datas = "Data invalida. A hora limite são 18:00h.";
                else{
                    if(moment(req.body.dataPrevistaInicio).format("HH") < 9 && moment(req.body.dataPrevistaInicio).format("mm") <= 59)
                        erros.datas = "Data invalida. A hora limite são 9:00h.";
                    else
                        data = req.body.dataPrevistaInicio;
                }
            }
        }
    }
    else{
        var hours = moment().format("HH");
        var minutes = moment().format("HH");
        if(hours >= 18 && minutes > 00)
            erros.datas = "Data invalida. A hora limite são 18:00h.";
        else{
            if(hours < 9 && minutes <= 59)
                erros.datas = "Data invalida. A hora limite são 9:00h.";
        }
    }

    if(Object.keys(erros).length != 0){
        Cliente.find().lean().then(function(clientes){
            res.render("usersResponsaveis/obras/novaObra", {erros: erros, cliente:cliente, clientes:clientes, nomeO:nomeO, descricao:descricao, data:data})
        })
    }
    else{
        var novaObra;
        cliente = req.body.cliente.split(" ").splice(-1);
        cliente = cliente[0];
        Cliente.findOne({nif: cliente}).lean().then(function(cliente){
            if(req.body.dataPrevistaInicio){
                novaObra = {
                    nome: req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                    descricao: req.body.descricao.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                    dataPrevistaInicio: req.body.dataPrevistaInicio
                }
            }
            else{
                novaObra = {
                    nome: req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                    descricao: req.body.descricao.replace(/\s\s+/g, ' ').replace(/\s*$/,'')
                }
            }
            
        
            new Obra(novaObra).save().then(function(){
                Obra.findOne({"nome":novaObra.nome}).then(function(obra){
                    Funcionario.updateOne(
                        {"nome":req.user.nome},
                        {$push: {obras : obra._id}}).then(function(){
                        Cliente.updateOne(
                            {_id:cliente._id},
                            {$push: {obras : obra._id}}).then(function(cliente){
                                req.flash("success_msg", "Obra criada com sucesso")
                                res.redirect("/obras");
                        }).catch(function(erro){
                            req.flash("error_msg", "Erro ao inserir a obra no cliente.")
                            res.redirect('/obra/'+req.params.nome);
                        })                        
                    }).catch(function(erro){
                        req.flash("error_msg", "Erro ao inserir a obra nos funcionários.")
                        res.redirect('/obra/'+req.params.nome);
                    })
                }).catch(function(err){
                    req.flash("error_msg", "Obra não encontrada.")
                    res.redirect("/obras");
                })
            }).catch(function(erro){
                erros.nome = "Já existe uma obra com o mesmo nome ou houve um erro ao adicionar a obra. Tente novamente.";
                res.render("usersResponsaveis/obras/novaObra", {erros: erros, nomeO:nomeO, descricao:descricao, data:data})
            })
        }).catch(function(erro){
            req.flash("error_msg", "Cliente não encontrado.");
            res.redirect("/obras");
        })    
    }
})

router.get('/obra/:id/addTarefa', authenticated, userResponsavel, function(req, res){
    Funcionario.findOne({_id:req.user.id}).then(function(funcionario){
        Obra.findOne({ $and: [{_id:req.params.id}, {_id:funcionario.obras}]}).lean().then(function(obra){
            Funcionario.find({}).then(function(funcionarios){
                if(obra.estado == "finalizada"){
                    req.flash("error_msg", "Obra finalizada.")
                    res.redirect("/obra/"+req.params.id);
                }
                else{
                    var funcionariosSelecionados = JSON.stringify(null);
                    res.render("usersResponsaveis/tarefas/novaTarefa", {obra:obra, funcionariosSelecionados:funcionariosSelecionados, 
                        funcionarios:funcionarios.map(funcionarios => funcionarios.toJSON())})
                }
            }).catch(function(err){
                req.flash("error_msg", "Funcionários não encontrados.")
                res.redirect('/obra/'+req.params.id);
            })
        }).catch(function(erro){
            req.flash("error_msg", "Obra não encontrada.")
            res.redirect("/obras");
        })
        
    }).catch(function(erro){
        req.flash("error_msg", "Funcionários não encontrado.")
        res.redirect("/obras");
    })
})

router.post('/obra/:id/addTarefa', authenticated, userResponsavel, function asyncFunction(req, res){
    
    var erros = new Object();
    var nomeT;
    var descricao;
    var data;

    if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
        erros.nome = "Nome inválido.";
    }
    else{
        if(req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,'').length < 2){   
            erros.nome = "Nome inválido. Mínimo de 3 caracteres, sendo que pode possuir apenas 1 espaço.";
        }
        else{
            nomeT = req.body.nome;
        }
    }

    if(!req.body.descricao || typeof req.body.descricao == undefined || req.body.descricao == null){
        erros.descricao = "Descrição inválida.";
    } else{
        if(req.body.descricao.replace(/\s\s+/g, ' ').replace(/\s*$/,'').length < 4){
            erros.descricao = "Descrição com tamanho inválido. Mínimo de 5 caracteres, sendo que pode possuir apenas 2 espaços.";
        }
        else{
            descricao = req.body.descricao;
        }
    }

    if(!req.body.funcionarios || typeof req.body.funcionarios == undefined || req.body.funcionarios == null){
        erros.funcionarios = "Associe funcionários à tarefa.";
    }

    Obra.findOne({_id:req.params.id}).lean().then(function(obra){
        if(req.body.dataPrevistaInicio){
            var today = moment().format("YYYY-MM-DD HH:mm");
            var dataTarefa = moment(req.body.dataPrevistaInicio).format("YYYY-MM-DD HH:mm")
            var dataObra = moment(obra.dataPrevistaInicio).format("YYYY-MM-DD HH:mm")
            dataTarefa = moment(dataTarefa).add(1, 'minutes');
            if(moment(dataTarefa).isValid()){
                if(moment(today).isAfter(dataTarefa) == true || moment(dataObra).isAfter(dataTarefa) == true){
                    erros.datas = "Data inválida. Data tem que ser superior à data de hoje e superior à data de inicio da obra.";
                }
                else{
                    if(moment(req.body.dataPrevistaInicio).format("HH") >= 18 && moment(req.body.dataPrevistaInicio).format("mm") > 00)
                        erros.datas = "Data invalida. A hora limite são 18:00h.";
                    else{
                        if(moment(req.body.dataPrevistaInicio).format("HH") < 9 && moment(req.body.dataPrevistaInicio).format("mm") <= 59)
                            erros.datas = "Data invalida. A hora limite são 9:00h.";
                        else
                            data = req.body.dataPrevistaInicio;
                    }
                }
            }
        }

        Tarefa.find({ $and: [{nome:req.body.nome}, {obra : obra._id}]}).lean().then(function(tarefas){
            if(tarefas.length != 0){
                erros.nome = "Já existe uma tarefa com este nome dentro da obra.";
            }
            if(Object.keys(erros).length != 0){ 
                Funcionario.find().then(function(funcionarios){
                    var importancia = req.body.importancia;
                    if(req.body.funcionarios)
                        var funcionariosSelecionados = JSON.stringify(req.body.funcionarios);
                    else
                        var funcionariosSelecionados = JSON.stringify(null);
                    res.render("usersResponsaveis/tarefas/novaTarefa", {obra:obra, funcionariosSelecionados: funcionariosSelecionados, importancia:importancia, erros: erros, data:data, descricao:descricao, nomeT:nomeT,
                        funcionarios:funcionarios.map(funcionarios => funcionarios.toJSON())})
                }).catch(function(err){
                    req.flash("error_msg", "Erro interno no GET dos funcionários.")
                    res.redirect('/obra/'+req.params.id);
                })
            }
            else{
                async function secondFunction(){
                    var f = req.body.funcionarios
                    var funcionarios = await getFuncionarios(f)
                        var novaTarefa;
                        if(req.body.dataPrevistaInicio){
                            novaTarefa = {
                                nome: req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                                descricao: req.body.descricao.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                                dataPrevistaInicio: req.body.dataPrevistaInicio,
                                obra: obra._id,
                                importancia: req.body.importancia.toLowerCase()
                            }
                        }
                        else{
                            var today = moment().format("YYYY-MM-DD HH:mm");
                            var expectedStartDate = today;
                            if(moment(obra.dataPrevistaInicio).isAfter(today))
                                expectedStartDate = obra.dataPrevistaInicio 
                            novaTarefa = { 
                                nome: req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                                descricao: req.body.descricao.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                                dataPrevistaInicio: expectedStartDate,
                                obra: obra._id,
                                importancia: req.body.importancia.toLowerCase()
                            }
                        }
                        
                        new Tarefa(novaTarefa).save().then(function(tarefa){
                            Tarefa.findOne({_id:tarefa._id}).then(function(tarefa){
                                for(var i=0; i<funcionarios.length; i++){
                                        Funcionario.updateOne(
                                            {"_id":funcionarios[i]._id},
                                            {$push: {tarefas : tarefa._id}}
                                        ).then().catch(function(erro){
                                            req.flash("error_msg", "Erro ao inserir as tarefas nos funcionários.")
                                            res.redirect('/obra/'+req.params.id);
                                        })
                                        
                                        Funcionario.findOne({$and: [{_id:funcionarios[i]._id}, { obras : { $ne: obra._id}}]}).lean().then(function(funcionario){
                                            if(funcionario != null){
                                                Funcionario.updateOne(
                                                    {"_id":funcionario._id},
                                                    {$push: {obras : obra._id}}
                                                ).then()
                                            }
                                            
                                        })
                                    }
                                    
                                    Funcionario.updateOne(
                                        {"_id":req.user.id},
                                        {$push: {tarefasCriadas : tarefa._id}}
                                    ).then().catch(function(erro){
                                        req.flash("error_msg", "Erro ao inserir as tarefas nos funcionários.")
                                        res.redirect('/obra/'+req.params.id);
                                    })
                                    
                                    Funcionario.findOne({$and: [{_id:req.user.id}, { obras : { $ne: obra._id}}]}).lean().then(function(funcionario){
                                        if(funcionario != null){
                                            Funcionario.updateOne(
                                                {"_id":req.user.id},
                                                {$push: {obras : obra._id}}
                                            ).then()
                                        }
                                        
                                    })
                                    
                                    req.flash("success_msg", "Tarefa criada com sucesso.")
                                    res.redirect('/obra/'+obra._id);
                                    
                                }).catch(function(erro){
                                    req.flash("error_msg", "Erro ao encontrar a tarefa.")
                                    res.redirect('/obra/'+obra._id);
                                })
                                
                            }).catch(function(erro){
                                erros.nome = "Já existe uma tarefa com o mesmo nome ou houve um erro ao adicionar a tarefa. Tente novamente.";
                                Funcionario.find({}).then(function(funcionarios){
                                        if(funcionarios){
                                            res.render("usersResponsaveis/tarefas/novaTarefa", {obra:obra, erros: erros, data:data, descricao:descricao, nomeT:nomeT,
                                                funcionarios:funcionarios.map(funcionarios => funcionarios.toJSON())})
                                        }
                                    }).catch(function(err){
                                        req.flash("error_msg", "Erro interno no GET dos funcionários.")
                                        res.redirect('/obra/'+req.params.nome);
                                    })
                                
                            })
                    };
                    secondFunction()
                }
            }).catch(function(error){
                req.flash("error_msg", "Tarefa não encontrada.");
                res.redirect("/tarefas/"+req.params.id);
            })   
    }).catch(function(error){
        req.flash("error_msg", "Obra não encontrada.");
        res.redirect("/obra/"+req.params.id);
    })
    
})

router.get('/obra/:id/addCompra', authenticated, userResponsavel, function(req, res){
    Funcionario.findOne({_id:req.user.id}).then(function(funcionario){
        Obra.findOne({ $and: [{_id:req.params.id}, {_id:funcionario.obras}]}).lean().then(function(obra){
            if(obra.estado == "finalizada"){
                req.flash("error_msg", "Obra finalizada.")
                res.redirect("/obra/"+req.params.id);
            }
            else{
                res.render("usersResponsaveis/compras/novaCompra", {obra:obra});
            }
        }).catch(function(erro){
            req.flash("error_msg", "Obra não encontrada.")
            res.redirect("/obras");
        })
        
    }).catch(function(erro){
        req.flash("error_msg", "Funcionários não encontrado.")
        res.redirect("/obras");
    })
})

router.post('/obra/:id/addCompra', authenticated, userResponsavel, function asyncFunction(req, res){
    
    var erros = new Object();
    var material;
    var descricao;
    var quantidade;
    var custo;
    var fornecedor;

    if(!req.body.material || typeof req.body.material == undefined || req.body.material == null){
        erros.material = "Nome inválido.";
    }
    else{
        if(req.body.material.replace(/\s\s+/g, ' ').replace(/\s*$/,'').length < 2){   
            erros.material = "Nome inválido. Mínimo de 3 caracteres, sendo que pode possuir apenas 1 espaço.";
        }
        else{
            material = req.body.material;
        }
    }

    if(!req.body.descricao || typeof req.body.descricao == undefined || req.body.descricao == null){
        erros.descricao = "Descrição inválida.";
    } else{
        if(req.body.descricao.replace(/\s\s+/g, ' ').replace(/\s*$/,'').length < 4){
            erros.descricao = "Descrição com tamanho inválido. Mínimo de 5 caracteres, sendo que pode possuir apenas 2 espaços.";
        }
        else{
            descricao = req.body.descricao;
        }
    }

    if(!req.body.quantidade || typeof req.body.quantidade == undefined || req.body.quantidade == null){
        erros.quantidade = "Quantidade inválida.";
    }else{
        quantidade = req.body.quantidade;
    }

    if(!req.body.custo || typeof req.body.custo == undefined || req.body.custo == null || req.body.custo < 0){
        erros.custo = "Custo inválido.";
    }else{
        custo = req.body.custo;
    }

    if(!req.body.fornecedor || typeof req.body.fornecedor == undefined || req.body.fornecedor == null){
        erros.fornecedor = "Fornecedor inválido.";
    }else{
        fornecedor = req.body.fornecedor;
    }

    Obra.findOne({_id:req.params.id}).lean().then(function(obra){
        if(Object.keys(erros).length != 0){ 
            res.render("usersResponsaveis/compras/novaCompra", {obra:obra, material:material, erros:erros, descricao:descricao, 
                quantidade:quantidade, custo:custo, fornecedor:fornecedor});
        }
        else{
            async function secondFunction(){
                novaCompra = {
                    material: req.body.material.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                    descricao: req.body.descricao.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                    quantidade: req.body.quantidade,
                    custo: req.body.custo,
                    fornecedor: req.body.fornecedor,
                    obra: obra._id,
                    funcionario: req.user.id};
                        
                new Compra(novaCompra).save().then(function(compra){
                    Obra.findOneAndUpdate({_id:req.params.id}, 
                        {"$set": {
                            "orcamento": obra.orcamento + parseFloat(req.body.custo) + (obra.percentagemLucro*parseFloat(req.body.custo)) / 100,
                            "despesa": obra.despesa + parseFloat(req.body.custo),
                            "despesaFinal": obra.despesaFinal + parseFloat(req.body.custo),
                            "custoFinal":  obra.custoFinal +parseFloat(req.body.custo) + (obra.percentagemLucro* parseFloat(req.body.custo)) / 100
                          }}, {useFindAndModify: false}).then()
                    req.flash("success_msg", "Compra registada com sucesso.")
                    res.redirect("/obra/"+req.params.id);
                }).catch(function(erro){
                    req.flash("error_msg", "Erro ao registar a compra.")
                    res.redirect("/obra/"+req.params.id);
                })
            };
            secondFunction()
        } 
    }).catch(function(error){
        req.flash("error_msg", "Obra não encontrada.");
        res.redirect("/obra/"+req.params.id);
    })
    
})

router.get('/obra/:id/edit', authenticated, userResponsavel, function(req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Obra.findOne({ $and : [{_id:req.params.id}, {_id:funcionario.obras}]}).lean().then(function(obra){
            Funcionario.find({ obras : { $ne: obra._id}}).lean().then(function(funcionarios){
                if(obra.estado == "finalizada"){
                    req.flash("error_msg", "Obra finalizada.")
                    res.redirect("/obra/"+req.params.id);
                }
                else{
                    var custo = JSON.stringify(obra.custoFinal);
                    var funcionariosSelecionados = JSON.stringify(null);
                    res.render("usersResponsaveis/obras/editarObra", {obra:obra, funcionariosSelecionados:funcionariosSelecionados, funcionarios: funcionarios, custo:custo})  
                }
            })
        }).catch(function(erro){
            req.flash("error_msg", "Obra não encontrada.")
            res.redirect("/obras");
        })    
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/obra/"+req.params.id);
    })
})

router.post('/obra/:id/edit', authenticated, userResponsavel, function asyncFunction(req, res){
    
    var erros = new Object();

    if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
        erros.nome = "Nome inválido.";
    }
    else{
        if(req.body.nome.trim().length < 2){   
            erros.nome = "Nome inválido. Mínimo de 3 caracteres, sendo que pode possuir apenas 1 espaço.";
        }
    }

    if(!req.body.descricao || typeof req.body.descricao == undefined || req.body.descricao == null){
        erros.descricao = "Descrição inválida.";
    } else{
        if(req.body.descricao.trim().length < 3){
            erros.descricao = "Descrição com tamanho inválido. Mínimo de 5 caracteres, sendo que pode possuir apenas 2 espaços.";
        }
    }

    if(!req.body.percentagemLucro || typeof req.body.percentagemLucro == undefined || req.body.percentagemLucro == null){
        req.body.percentagemLucro = 0;
    }
    else{
        if(req.body.percentagemLucro < 0){
            erros.percentagemLucro = "Percentagem de lucro inválida";
        }
    }


    if(Object.keys(erros).length != 0){ 
        Obra.findOne({_id:req.params.id}).lean().then(function(obra){
            Funcionario.find({ obras : { $ne: obra._id}}).lean().then(function(funcionarios){
                if(req.body.funcionarios)
                    var funcionariosSelecionados = JSON.stringify(req.body.funcionarios);
                else
                    var funcionariosSelecionados = JSON.stringify(null);
                var custo = JSON.stringify(obra.custoFinal);
                res.render("usersResponsaveis/obras/editarObra", {obra:obra, funcionariosSelecionados:funcionariosSelecionados, erros:erros, funcionarios: funcionarios, custo:custo})  
            })
        })
    }
    else{
        async function secondFunction(){
            var f = req.body.funcionarios
            if(f != undefined)
                var funcionarios = await getFuncionarios(f)
            Obra.findOne({_id:req.params.id}).lean().then(function(obra){
                Obra.updateOne(
                    {_id:req.params.id}, 
                    {"nome": req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                        "descricao": req.body.descricao.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                        "percentagemLucro": req.body.percentagemLucro,
                        "orcamento": obra.despesa + obra.despesa*(req.body.percentagemLucro / 100)
                      }).then(function(obra){
                    
                        if(f!=undefined){
                            for(var i=0; i<funcionarios.length; i++){
                                Funcionario.findOne({$and: [{_id:funcionarios[i]._id}, { obras : { $ne: obra._id}}]}).lean().then(function(funcionario){
                                    if(funcionario != null){
                                        Funcionario.updateOne(
                                            {"nome":funcionario.nome},
                                            {$push: {obras : obra._id}}
                                        ).then()
                                    }
                                })
                            }
                        }
                    
                        Obra.findOne({_id:req.params.id}).then(function(obra){
                            Tarefa.find({obra:obra._id}).lean().then(function(tarefas){
                                async function one(){
                                    for(var i=0; i<tarefas.length; i++){
                                        await Requisicao.find({tarefa:tarefas[i]._id}).then(function(requisicoes){
                                            for(var j=0; j<requisicoes.length; j++){
                                                Requisicao.findOneAndUpdate({_id:requisicoes[i]._id}, 
                                                    {"$set": {
                                                        "orcamento": requisicoes[i].despesa + requisicoes[i].despesa*(obra.percentagemLucro / 100)
                                                    }}, {useFindAndModify: false}).then()
                                            }
                                        })
                                        await Tarefa.findOneAndUpdate({_id:tarefas[i]._id}, 
                                            {"$set": {
                                                "orcamento": tarefas[i].despesa + tarefas[i].despesa*(obra.percentagemLucro / 100)
                                            }}, {useFindAndModify: false}).then()
                                    }
                                    req.flash("success_msg", "Obra editada com sucesso.");
                                    res.redirect("/obra/"+req.params.id);
                                }
                                one();
                            }).catch(function (error){
                                req.flash("error_msg", "Erro ao editar as tarefas")
                                res.redirect("/obra/"+req.params.id)
                            })
                        }).catch(function (error){
                            req.flash("error_msg", "Obra não encontrada")
                            res.redirect("/obra/"+req.params.id)
                        })
                }).catch(function (error){
                    req.flash("error_msg", "Já existe uma obra com esse nome.")
                    res.redirect("/obra/"+req.params.id+"/edit")
                })
            }).catch(function (error){
                req.flash("error_msg", "Obra não encontrada.")
                res.redirect("/obras")
            })
            
        }
        secondFunction()
    }
})

router.get('/obras/downloadReport', authenticated, admin, async function asyncFunction(req, res){
    Obra.find({}).lean().then(function(obras){
        res.render("admin/obras/obrasReport", {obras:obras}, function(err, html){
            var mySubString = html.substring(
                html.lastIndexOf("<div id=\"comeca\""),
                html.lastIndexOf("<br id=\"finish\">")
            );
                
                
            pdf.create(mySubString, {}).toFile("./reports/obrasReport.pdf", function(err, reposta){
                if(err){
                    req.flash("error_msg", "Erro ao criar relatório de obras.")
                    res.redirect("/obras")
                }
                else{
                    const file = path.resolve('reports/obrasReport.pdf');
                    res.download(file);
                }
            })
        })
    }).catch(function(error){
        req.flash("error_msg", "Erro ao encontrar as obras.")
        res.redirect("/dashboard")
    })
})

router.get('/obra/:id/downloadReport', authenticated, admin, function asyncFunction(req, res){
    Obra.findOne({_id:req.params.id}).lean().then(function(obra){
        Tarefa.find({obra:obra._id}).lean().then(function(tarefas){
            Requisicao.find({tarefa:tarefas}).lean().then(function(requisicoes){
                Cliente.findOne({obras:obra._id}).lean().then(function(cliente){
                    Compra.find({obra:obra._id}).lean().then(function(compras){
                        async function obtemDados(){
                            var valor = 0;
                            for(var i=0; i<compras.length; i++){
                                valor = valor + compras[i].custo;
                            }

                            for(var i=0; i<requisicoes.length; i++){
                                var reques = requisicoes[i];
                                await Maquina.findOne({_id:reques.maquina}).lean().then(async function(maquina){
                                    await Tarefa.findOne({_id:reques.tarefa}).lean().then(function(tarefa){
                                        reques.maquinaNome=maquina.nome;
                                        reques.tarefaNome=tarefa.nome;
                                        
                                        requisicoes[i] = reques;
                                    })
                                })
                            }
                            var tarefasS = JSON.stringify(tarefas);
                            res.render("admin/obras/obraReport", {obra:obra, tarefas:tarefas, cliente:cliente, requisicoes:requisicoes,
                                compras:compras, valor:valor, tarefasS:tarefasS}, function(err, html){
                                var mySubString = html.substring(
                                    html.lastIndexOf("<div id=\"comeca\""),
                                    html.lastIndexOf("<br id=\"finish\">")
                                );
                                config = {
                                    paginationOffset: 1,
                                    "border": {
                                    "top": "40px",
                                    "bottom": "40px"
                                    }
                                }
                                pdf.create(mySubString, config).toFile("./reports/obra"+req.params.id+"Report.pdf", function(err, reposta){
                                    if(err){
                                        req.flash("error_msg", "Erro ao criar relatório de obra.")
                                        res.redirect("/obra/"+req.params.id)
                                    }
                                    else{
                                        const file = path.resolve('reports/obra'+req.params.id+'Report.pdf');
                                        res.download(file);
                                    }
                                })
                            })
                        }
                        obtemDados();
                    }).catch(function(erro){
                        req.flash("error_msg", "Compras não encontradas.")
                        res.redirect("/compras");
                    })
                }).catch(function(erro){
                    req.flash("error_msg", "Cliente não encontrado.")
                    res.redirect("/obras");
                })
            }).catch(function(erro){
                req.flash("error_msg", "Requisições não encontradas.")
                res.redirect("/obras");
            })
        }).catch(function(erro){
            req.flash("error_msg", "Tarefas não encontradas.")
            res.redirect("/obras");
        })
    }).catch(function(erro){
        req.flash("error_msg", "Obra não encontrada.")
        res.redirect("/obras");
    })    
})

router.get('/obra/:id/downloadFaturaReport', authenticated, admin, function asyncFunction(req, res){
    Obra.findOne({_id:req.params.id}).lean().then(function(obra){
        Tarefa.find({obra:obra._id}).lean().then(function(tarefas){
            Requisicao.find({tarefa:tarefas}).lean().then(function(requisicoes){
                Cliente.findOne({obras:obra._id}).lean().then(function(cliente){
                    Compra.find({obra:obra._id}).lean().then(function(compras){
                        async function obtemDados(){
                            var valor = 0;
                            for(var i=0; i<compras.length; i++){
                                valor = valor + compras[i].custo;
                            }

                            for(var i=0; i<requisicoes.length; i++){
                                var reques = requisicoes[i];
                                await Maquina.findOne({_id:reques.maquina}).lean().then(async function(maquina){
                                    await Tarefa.findOne({_id:reques.tarefa}).lean().then(function(tarefa){
                                        reques.maquinaNome=maquina.nome;
                                        reques.tarefaNome=tarefa.nome;
                                        
                                        requisicoes[i] = reques;
                                    })
                                })
                            }
                            var tarefasS = JSON.stringify(tarefas);
                            res.render("admin/obras/obraFaturaReport", {obra:obra, tarefas:tarefas, cliente:cliente, requisicoes:requisicoes,
                                compras:compras, valor:valor, tarefasS:tarefasS}, function(err, html){
                                var mySubString = html.substring(
                                    html.lastIndexOf("<div id=\"comeca\""),
                                    html.lastIndexOf("<br id=\"finish\">")
                                );
                                config = {
                                    paginationOffset: 1,
                                    "border": {
                                    "top": "40px",
                                    "bottom": "40px"
                                    }
                                }
                                pdf.create(mySubString, config).toFile("./reports/obra"+req.params.id+"FaturaReport.pdf", function(err, reposta){
                                    if(err){
                                        req.flash("error_msg", "Erro ao criar fatura de obra.")
                                        res.redirect("/obra/"+req.params.id)
                                    }
                                    else{
                                        const file = path.resolve('reports/obra'+req.params.id+'FaturaReport.pdf');
                                        res.download(file);
                                    }
                                })
                            })
                        }
                        obtemDados();
                    }).catch(function(erro){
                        req.flash("error_msg", "Compras não encontradas.")
                        res.redirect("/compras");
                    })
                }).catch(function(erro){
                    req.flash("error_msg", "Cliente não encontrado.")
                    res.redirect("/obras");
                })
            }).catch(function(erro){
                req.flash("error_msg", "Requisições não encontradas.")
                res.redirect("/obras");
            })
        }).catch(function(erro){
            req.flash("error_msg", "Tarefas não encontradas.")
            res.redirect("/obras");
        })
    }).catch(function(erro){
        req.flash("error_msg", "Obra não encontrada.")
        res.redirect("/obras");
    })    
})


router.get('/obra/:id/downloadClientReport', authenticated, admin, function asyncFunction(req, res){
    Obra.findOne({_id:req.params.id}).lean().then(function(obra){
        Tarefa.find({obra:obra._id}).lean().then(function(tarefas){
            Compra.find({obra:obra._id}).lean().then(function(compras){
                async function obtemDados(){
                    var reques = [];
                    for(var i=0; i<tarefas.length; i++){
                        await Requisicao.find({tarefa:tarefas[i]._id}).lean().then(function(requisicoes){
                            var req;
                            for(var j=0; j<requisicoes.length; j++){
                                req = requisicoes[j];
                                Maquina.findOne({_id:req.maquina}).lean().then(function(maquina){
                                    req.maquinaNome = maquina.nome;
                                })
                                req.tarefaNome = tarefas[i].nome
                                reques.push(req);
                            }
                        })
                    }

                    for(var i=0; i<compras.length; i++){
                        var compra = compras[i];
                        compra.orcamento = compras[i].custo + obra.percentagemLucro*compras[i].custo / 100;
                        compras[i] = compra;
                    }
    
                    res.render("admin/obras/obraClientReport", {obra:obra, tarefas:tarefas, requisicoes:reques, compras:compras}, function(err, html){
                        var mySubString = html.substring(
                            html.lastIndexOf("<div id=\"comeca\""),
                            html.lastIndexOf("<br id=\"finish\">")
                        );
                        pdf.create(mySubString, {}).toFile("./reports/obra"+req.params.id+"ClientReport.pdf", function(err, reposta){
                            if(err){
                                req.flash("error_msg", "Erro ao criar relatório de obra para cliente.")
                                res.redirect("/obra/"+req.params.id)
                            }
                            else{
                                const file = path.resolve('reports/obra'+req.params.id+'ClientReport.pdf');
                                res.download(file);
                            }
                        })
                    })
                }
                obtemDados();
            })
        }).catch(function(error){
            req.flash("error_msg", "Tarefas não encontradas.")
            res.redirect("/obra/"+req.params.id)
        })
    }).catch(function(erro){
        req.flash("error_msg", "Obra não encontrada.")
        res.redirect("/obras");
    })    
})

router.get('/obra/:id/clientAccepted', authenticated, userResponsavel, function(req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Obra.findOne({ $and: [{_id:req.params.id}, {_id:funcionario.obras}]}).lean().then(function(obra){
            if(obra.estado != "aAguardarResposta"){
                req.flash("error_msg", "Obra não pode ser aceite. Verifique que a obra está por aceitar.")
                res.redirect("/obra/"+req.params.id);
            }
            else{
                Obra.updateOne(
                    {_id:req.params.id}, 
                    {"estado": "preProducao" }).lean().then(function(obra){
                        req.flash("success_msg", "Obra alterada com sucesso.")
                        res.redirect("/obra/"+req.params.id)
                    }).catch(function(error){
                        req.flash("error_msg", "Erro ao alterar a obra.")
                        res.redirect("/obra/"+req.params.id)
                    })
            }
        }).catch(function(error){
            req.flash("error_msg", "Não tem permissões de alterar o estado desta obra.")
            res.redirect("/obra/"+req.params.id);
        })
    }).catch(function (error) {
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/dashboard");
    })
})

router.get('/obra/:id/clientRejected', authenticated, userResponsavel, function(req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Obra.findOne({ $and: [{_id:req.params.id}, {_id:funcionario.obras}]}).lean().then(function(obra){
            Tarefa.find({obra:obra._id}).lean().then(function(tarefas){
                Funcionario.updateMany({obras:obra._id}, {$pull: {obras : obra._id}}).then(function(funcionarios){
                    if(obra.estado != "aAguardarResposta"){
                        req.flash("error_msg", "Obra não pode ser recusada. Verifique que a obra está por aceitar.")
                        res.redirect("/obra/"+req.params.id);
                    }
                    else{
                        async function removeIssues(){
                            for(var i=0; i<tarefas.length; i++){
                                await Funcionario.updateMany({tarefas:tarefas[i]._id}, {$pull: {tarefas : tarefas[i]._id}}).then()
                                await Tarefa.deleteMany({_id:tarefas[i]._id}).then()
                                await Requisicao.deleteMany({tarefa:tarefas[i]._id}).then()
                            }
                            Obra.deleteOne({_id:req.params.id}).then(function(){
                                req.flash("success_msg", "Obra eliminada com sucesso.")
                                res.redirect("/obras");
                            }).catch(function(error){
                                req.flash("error_msg", "Erro ao eliminar a obra.")
                                res.redirect("/obra/"+req.params.id);
                            })
                        }
                        removeIssues();
                    }
                }).catch(function(error){
                    req.flash("error_msg", "Erro ao atualizar os funcionários (obras).")
                    res.redirect("/obra/"+req.params.id);
                })
                
            }).catch(function(error){
                req.flash("error_msg", "Tarefas da obra não encontradas.")
                res.redirect("/obra/"+req.params.id);
            })
        }).catch(function(error){
            req.flash("error_msg", "Não tem permissões de alterar o estado desta obra.")
            res.redirect("/obra/"+req.params.id);
        })
    }).catch(function (error) {
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/dashboard");
    })
})

router.get('/tarefa/:id/responderSubmissao', authenticated, userResponsavel, function (req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Tarefa.findOne({ $and: [{_id:req.params.id},{$or: [{_id:funcionario.tarefas}, {_id:funcionario.tarefasCriadas}]}]}).lean().then(function(tarefa){
            Funcionario.find({ $or: [{tarefasCriadas:tarefa._id}, {tarefas: tarefa._id}]}).lean().then(function(funcionarios){
                Requisicao.find({tarefa:tarefa._id}).lean().then(function(requisicoes){
                    Obra.findOne({_id:tarefa.obra}).lean().then(async function(obra){
                        if(tarefa.estado != "porAceitar"){
                            req.flash("error_msg", "A tarefa "+ tarefa.nome + " não está por validar.")
                            res.redirect("/tarefa/"+req.params.id);
                        }
                        else{
                            var requests = [];
                            for(var i=0; i<requisicoes.length; i++){
                                var request = requisicoes[i];
                                await Maquina.findOne({_id:request.maquina}).lean().then(async function(maquina){
                                    await Funcionario.findOne({_id:request.funcionario}).lean().then(function(funcionario){
                                        request.maquinaNome = maquina.nome;
                                        request.funcionarioNome = funcionario.nome;
                                        requests.push(request);
                                    })
                                })
                            }
                            res.render("usersResponsaveis/tarefas/responderSubmissao", {obra:obra, tarefa:tarefa, requisicoes:requisicoes, funcionarios:funcionarios});
                        }
                    }).catch(function(error){
                        console.log(error);
                        req.flash("error_msg", "Obra não encontrada.")
                        res.redirect("/tarefa/"+req.params.id)
                    })
                }).catch(function(error){
                    req.flash("error_msg", "Funcionários não encontrados.")
                    res.redirect("/tarefa/"+req.params.id)
                })
            }).catch(function(error){
                req.flash("error_msg", "Requisições não encontradas.")
                res.redirect("/tarefa/"+req.params.id)
            })
        }).catch(function(error){
            req.flash("error_msg", "Tarefa não encontrada.")
            res.redirect("/tarefas")
        })
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrada.")
        res.redirect("/tarefas")
    })
    
})

router.post('/tarefa/:id/responderSubmissao/:state', authenticated, userResponsavel, function asyncFunction (req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Tarefa.findOne({ $and: [{_id:req.params.id}, {$or: [{_id:funcionario.tarefas}, {_id:funcionario.tarefasCriadas}]}]}).lean().then(function(tarefa){
            if(req.params.state == "accept"){
                Tarefa.findOneAndUpdate({_id:req.params.id},
                    {"$set": {
                        "estado": "aceite",
                        "validada": true
                      }}, {useFindAndModify: false}).then(function(tarefa){
                        Funcionario.find({tarefas:req.params.id}).then(function(funcionarios){
                            Tarefa.findOne({_id:req.params.id}).lean().then(function(tarefa){
                                Obra.findOne({_id:tarefa.obra}).lean().then(function(obra){
                                    Requisicao.find({tarefa:tarefa._id}).then(function(requisicoes){
                                        async function secondFunction(){
                                            var cost = obra.despesa;
                                            var issueCost = 0;

                                            
                                            if(moment(tarefa.dataPrevistaInicio).isValid() && moment(tarefa.dataPrevistaFim).isValid()){
                                                var expectedIssueStartDateYear = moment(tarefa.dataPrevistaInicio).format("YYYY");
                                                var expectedIssueFinishDateYear = moment(tarefa.dataPrevistaFim).format("YYYY");

                                                var holidays = [];
                                                for(var i=expectedIssueStartDateYear; i <= expectedIssueFinishDateYear; i++){
                                                    var yearHolidays = hd.getHolidays(i);
                                                    for(var j=0; j<yearHolidays.length; j++){
                                                        holidays.push(moment(yearHolidays[j].date).format("YYYY-MM-DD"));
                                                    }
                                                }

                                                var expectedRequestStartDateYear; 
                                                var expectedRequestFinishDateYear;
                                                for(var i=0; i<requisicoes.length; i++){
                                                    expectedRequestStartDateYear = moment(requisicoes[i].dataPrevistaInicio).format("YYYY");
                                                    expectedRequestFinishDateYear = moment(requisicoes[i].dataPrevistaFim).format("YYYY");
                                                    if(expectedRequestStartDateYear < expectedIssueStartDateYear){
                                                        var holidaysAux = [];
                                                        for(var j=expectedRequestStartDateYear; j < expectedIssueStartDateYear; j++){
                                                            var yearHolidays = hd.getHolidays(j);
                                                            for(var l=0; l<yearHolidays.length; l++){
                                                                holidaysAux.push(moment(yearHolidays[l].date).format("YYYY-MM-DD"));
                                                            }
                                                        }

                                                        for(var j=0; j<holidays.length; j++){
                                                            holidaysAux.push(holidays[j]);
                                                        }

                                                        holidays = holidaysAux;
                                                    }
                                                    if(expectedRequestFinishDateYear > expectedIssueFinishDateYear){
                                                        for(var j=expectedIssueFinishDateYear; j < expectedRequestFinishDateYear; j++){
                                                            var yearHolidays = hd.getHolidays(j);
                                                            for(var l=0; l<yearHolidays.length; l++){
                                                                holidays.push(moment(yearHolidays[l].date).format("YYYY-MM-DD"));
                                                            }
                                                        }
                                                    }
                                                }
                                        
                                                momentBD.updateLocale('PT', {
                                                    holidays: holidays,
                                                    holidayFormat: 'YYYY-MM-DD',
                                                    workingWeekdays: [1, 2, 3, 4, 5]
                                                });
                                                
                                                var days = momentBD(tarefa.dataPrevistaFim).businessDiff(moment(tarefa.dataPrevistaInicio));
                                                var alterou = false;

                                                if(days == 0){
                                                    if(moment(tarefa.dataPrevistaFim).format('HH') >= 14 && moment(tarefa.dataPrevistaInicio).format('HH') <= 13){
                                                        tarefa.dataPrevistaFim = moment(tarefa.dataPrevistaFim).subtract(1, 'hours')
                                                        alterou = true;
                                                    }
                                                    
                                                }
                                                var di = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DD");
                                                var df = moment(tarefa.dataPrevistaFim).format("YYYY-MM-DD");
                                                var daysAux = moment(df).diff(di, 'days');
                                                var hours = momentBD(tarefa.dataPrevistaFim).diff(moment(tarefa.dataPrevistaInicio), 'days', true) % 1;
                                                if(hours != 0 && days != 0){
                                                    days = days - 1;
                                                }
                                                days = days + hours;
                                                if(daysAux == 0){
                                                    for(var i=0; i<funcionarios.length; i++){
                                                        cost = cost + ((days * 24) * funcionarios[i].custo);
                                                        issueCost = issueCost + ((days * 24) * funcionarios[i].custo)
                                                    }                                                    
                                                }
                                                else{
                                                    var dataPInicio = moment(tarefa.dataPrevistaInicio).format("HH");
                                                    var dataPFim = moment(tarefa.dataPrevistaFim).format("HH");
                                                    if(dataPInicio >=14 && dataPFim <= 13){
                                                        for(var i=0; i<funcionarios.length; i++){
                                                            cost = cost + ((days * 24 - (((daysAux-1) * 16) + 15)) * funcionarios[i].custo);
                                                            issueCost = issueCost + ((days * 24 - (((daysAux-1) * 16) + 15)) * funcionarios[i].custo);
                                                        }
                                                    }
                                                    else{
                                                        if(dataPInicio <= 13 && dataPFim >= 14){
                                                            for(var i=0; i<funcionarios.length; i++){
                                                                cost = cost + ((days * 24 - (((daysAux-1) * 16) + 17)) * funcionarios[i].custo);
                                                                issueCost = issueCost + ((days * 24 - (((daysAux-1) * 16) + 17)) * funcionarios[i].custo);
                                                            }
                                                        }
                                                        else{
                                                            for(var i=0; i<funcionarios.length; i++){
                                                                cost = cost + ((days * 24 - (daysAux * 16)) * funcionarios[i].custo);
                                                                issueCost = issueCost + ((days * 24 - (daysAux * 16)) * funcionarios[i].custo);
                                                            }
                                                        }
                                                    }
                                                }
                                                
                                                if(cost <= 0){
                                                    cost = 0.01;
                                                }
                                                
                                                if(issueCost <= 0){
                                                    issueCost = 0.01;
                                                }
                                                if(alterou == true){
                                                    tarefa.dataPrevistaFim = moment(tarefa.dataPrevistaFim).add(1, 'hours')
                                                    alterou = false;
                                                }
                                                var expectedFinishDate = tarefa.dataPrevistaFim;

                                                for(var i=0; i<requisicoes.length; i++){
                                                    
                                                    var data = moment(requisicoes[i].dataPrevistaFim).format("YYYY-MM-DD HH:mm");
                                                    if(moment(data).isAfter(expectedFinishDate)){
                                                        expectedFinishDate = data;
                                                    }
                                                    
                                                    var requestCost = 0;
                                                    var days = momentBD(requisicoes[i].dataPrevistaFim).businessDiff(moment(requisicoes[i].dataPrevistaInicio));
                                                    var daysAux = days;
                                                    var hours = momentBD(requisicoes[i].dataPrevistaFim).diff(moment(requisicoes[i].dataPrevistaInicio), 'days', true) % 1;
                                                    if(hours != 0 && days != 0){
                                                        days = days - 1;
                                                    }
                                                    days = days + hours;
                                                    if(daysAux == 0){
                                                        await Maquina.findOne({_id:requisicoes[i].maquina}).then(function (maquina) {
                                                            cost = cost + ((days * 24) * maquina.custo);
                                                            requestCost = requestCost + ((days * 24) * maquina.custo);
                                                        })
                                                        
                                                    }
                                                    else{
                                                        await Maquina.findOne({_id:requisicoes[i].maquina}).then(function (maquina) {
                                                            cost = cost + ((days * 24 - (daysAux * 16)) * maquina.custo);
                                                            requestCost = requestCost + ((days * 24 - (daysAux * 16)) * maquina.custo);
                                                        })
                                                    }
                                                    if(cost < 0){
                                                        cost = 0.01;
                                                    }
                                                    
                                                    if(requestCost < 0){
                                                        requestCost = 0.01;
                                                    }

                                                    await Requisicao.findOneAndUpdate({_id:requisicoes[i].id},
                                                        {"$set": {
                                                            "despesa": requestCost,
                                                            "orcamento":requestCost + requestCost * (obra.percentagemLucro/100)
                                                        }}, {useFindAndModify: false}).then()
                                                }                                                
                                                
                                                if(moment(obra.dataPrevistaFim).isValid() && moment(expectedFinishDate).isBefore(obra.dataPrevistaFim)){
                                                    expectedFinishDate = obra.dataPrevistaFim;
                                                }
                                                
                                                Tarefa.findOneAndUpdate({_id:req.params.id},
                                                    {"$set": {
                                                        "despesa": issueCost,
                                                        "orcamento":issueCost + issueCost * (obra.percentagemLucro/100)
                                                    }}, {useFindAndModify: false}).then()
                                                Tarefa.find({ $and: [{obra:obra._id}, {$or: [{estado: "porAceitar"}, {estado:"associada"}, {estado:"recusada"}]}]}).lean().then(function(tarefas){
                                                    if(tarefas.length > 0){
                                                        Obra.findOneAndUpdate({_id:obra._id}, {"$set": {"despesa": cost, "dataPrevistaFim": expectedFinishDate, 
                                                        "orcamento" : cost + cost * (obra.percentagemLucro / 100)}}, {useFindAndModify: false}).lean().then(function(obra){
                                                            if(obra == null){  
                                                                req.flash("error_msg", "Obra não atualizada visto que não foi encontrada.")
                                                                res.redirect("/tarefa/"+req.params.id);
                                                            }
                                                            else{
                                                                req.flash("success_msg", "Tarefa validada com sucesso")
                                                                res.redirect("/tarefa/"+req.params.id);
                                                            }
                                                            
                                                        }).catch(function(error){
                                                            req.flash("error_msg", "Erro ao atualizar a obra.")
                                                            res.redirect("/tarefa/"+req.params.id);
                                                        })
                                                    }
                                                    else{
                                                        if(obra.estado == "preOrcamento"){
                                                            Tarefa.find({obra: obra._id}).lean().then(function(tarefas){
                                                                Requisicao.find({tarefa:tarefas}).then(async function(requisicoes){
                                                                    var data = moment(tarefas[0].dataPrevistaInicio).format("YYYY-MM-DD HH:mm");
                                                                    
                                                                    for(var i=0; i<tarefas.length; i++){
                                                                        var dataProx = moment(tarefas[i].dataPrevistaInicio).format("YYYY-MM-DD HH:mm");
                                                                        if(moment(data).isAfter(dataProx)){
                                                                            data = dataProx;
                                                                        }
                                                                    }

                                                                    for(var i=0; i<requisicoes.length; i++){
                                                                        var dataProx = moment(requisicoes[i].dataPrevistaInicio).format("YYYY-MM-DD HH:mm");
                                                                        if(moment(data).isAfter(dataProx)){
                                                                            data = dataProx;
                                                                        }
                                                                    }

                                                                    Obra.findOneAndUpdate({_id:obra._id}, {"$set": {"despesa": cost, "dataPrevistaInicio": data, 
                                                                    "dataPrevistaFim": expectedFinishDate, "estado": "aAguardarResposta", 
                                                                    "orcamento" : cost + cost * (obra.percentagemLucro / 100)}}, 
                                                                    {useFindAndModify: false}).lean().then(function(obra){
                                                                        if(obra == null){  
                                                                            req.flash("error_msg", "Obra não atualizada visto que não foi encontrada.")
                                                                            res.redirect("/tarefa/"+req.params.id);
                                                                        }
                                                                        else{
                                                                            req.flash("success_msg", "Tarefa validada com sucesso")
                                                                            res.redirect("/tarefa/"+req.params.id);
                                                                        }
                                                                    }).catch(function(error){
                                                                        req.flash("error_msg", "Erro ao atualizar a obra.")
                                                                        res.redirect("/tarefa/"+req.params.id);
                                                                    })
                                                                }).catch(function(error){
                                                                    req.flash("error_msg", "Requisicoes não encontradas.")
                                                                    res.redirect("/tarefa/"+req.params.id);
                                                                })
                                                            }).catch(function(error){
                                                                req.flash("error_msg", "Tarefas não encontradas.")
                                                                res.redirect("/tarefa/"+req.params.id);
                                                            })
                                                        }
                                                        else{
                                                            Obra.findOneAndUpdate({_id:obra._id}, {"$set": {"despesa": cost, "dataPrevistaFim": expectedFinishDate}}, 
                                                                {useFindAndModify: false}).lean().then(function(obra){
                                                                if(obra == null){  
                                                                    req.flash("error_msg", "Obra não atualizada visto que não foi encontrada.")
                                                                    res.redirect("/tarefa/"+req.params.id);
                                                                }
                                                                else{
                                                                    req.flash("success_msg", "Tarefa validada com sucesso")
                                                                    res.redirect("/tarefa/"+req.params.id);
                                                                }
                                                            }).catch(function(error){
                                                                req.flash("error_msg", "Erro ao atualizar a obra.")
                                                                res.redirect("/tarefa/"+req.params.id);
                                                            })
                                                        }
                                                    }
                                                }).catch(function(error){
                                                    req.flash("error_msg", "Tarefas não encontradas.")
                                                    res.redirect("/tarefa/"+req.params.id)
                                                })
                                            }
                                            else{
                                                req.flash("error_msg", "Datas da tarefa inválidas.")
                                                res.redirect("/tarefa/"+req.params.id);
                                            }
                                        };
                                        secondFunction()
                                    }).catch(function (error) {
                                        req.flash("error_msg", "Requisições não encontradas.")
                                        res.redirect("/tarefa"+req.params.id)
                                    })
                                }).catch(function(error){
                                    req.flash("error_msg", "Obra não encontrada.")
                                    res.redirect("/tarefa/"+req.params.id)
                                })
                            }).catch(function(error){
                                req.flash("error_msg", "Tarefa não encontrada.")
                                res.redirect("/tarefas/")
                            })
                        }).catch(function(error){
                            req.flash("error_msg", "Funcionários não encontrados.")
                            res.redirect("/tarefa/"+req.params.id)
                        })
                }).catch(function(error){
                    req.flash("error_msg", "Erro ao validar a tarefa.")
                    res.redirect("/tarefa/"+req.params.id);
                })
            }
            else{
                var erros= [];
                if(!req.body.justificacao || typeof req.body.justificacao == undefined || req.body.justificacao == null){
                    erros.push({texto: "Justificação obrigatória."});
                }
                else{
                    if(req.body.justificacao.replace(/\s\s+/g, ' ').replace(/\s*$/,'').length < 2){
                        erros.push({texto: "Justificação com tamanho inválido. Mínimo de 3 caracteres, sendo que pode possuir apenas 1 espaço."});
                    }
                }
                if(erros.length > 0){
                    Requisicao.find({tarefa:tarefa._id}).lean().then(function(requisicoes){
                        res.render("usersResponsaveis/tarefas/responderSubmissao", {tarefa:tarefa, erros:erros, requisicoes:requisicoes})
                    }).catch(function(error){
                        req.flash("error_msg", "Requisições não encontradas.")
                        res.redirect("/tarefa/"+req.params.id);
                    })
                }
                else{
                    Tarefa.findOneAndUpdate({_id:req.params.id},
                        {"$set": {
                            "estado": "recusada",
                            "validada": true,
                            "justificacao": req.body.justificacao
                          }}, {useFindAndModify: false}).then(function(tarefa){
        
                            req.flash("success_msg", "Tarefa rejeitada com sucesso")
                            res.redirect("/tarefa/"+req.params.id);
                    }).catch(function(error){
                        req.flash("error_msg", "Erro ao validar a tarefa.")
                        res.redirect("/tarefa/"+req.params.id);
                    })
                }
            }
        }).catch(function(error){
            req.flash("error_msg", "Tarefa não encontrada.")
            res.redirect("/tarefas/")
        })
       
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/tarefa/"+req.params.id)
    })

})

router.get('/tarefa/:id/downloadReport', authenticated, admin, function asyncFunction (req, res){
    Tarefa.findOne({_id:req.params.id}).lean().then(function(tarefa){
        Funcionario.find({tarefas:tarefa._id}).lean().then(function(funcionarios){
            Obra.findOne({_id:tarefa.obra}).lean().then(function(obra){
                Requisicao.find({tarefa:tarefa._id}).lean().then(function(requisicoes){
                    async function obtemDados(){
                        var request;
                        
                        for(var i=0; i<requisicoes.length; i++){
                            request = requisicoes[i];
                            await Maquina.findOne({_id:requisicoes[i].maquina}).then(async function(maquina){
                                request.maquinaNome = maquina.nome;
                                Funcionario.findOne({_id:requisicoes[i].funcionario}).then(function(funcionario){
                                    request.funcionarioNome = funcionario.nome;
                                })
                            })
                            requisicoes[i] = request;
                        }

                        var custo = tarefa.despesa;
                        var orcamento = tarefa.orcamento;
                        for(var i=0; i<requisicoes.length; i++){
                            custo += requisicoes[i].despesa;
                            orcamento += requisicoes[i].orcamento;
                        }
                        tarefa.despesa = custo;
                        tarefa.orcamento = orcamento;
                        res.render("admin/tarefas/tarefaReport", {tarefa:tarefa, funcionarios:funcionarios, requisicoes:requisicoes, obra:obra}, function(err, html){
                            var mySubString = html.substring(
                                html.lastIndexOf("<div id=\"comeca\""),
                                html.lastIndexOf("<br id=\"finish\">")
                            );
                            pdf.create(mySubString, {}).toFile("./reports/tarefa"+req.params.id+"Report.pdf", function(err, reposta){
                                if(err){
                                    req.flash("error_msg", "Erro ao criar relatório da tarefa.")
                                    res.redirect("/tarefa/"+req.params.id)
                                }
                                else{
                                    const file = path.resolve('reports/tarefa'+req.params.id+'Report.pdf');
                                    res.download(file);
                                }
                            })
                        })
                    }
                    obtemDados();
                })
            }).catch(function(erro){
                req.flash("error_msg", "Obra não encontrada.")
                res.redirect("/tarefa/"+req.params.id)
            })
        }).catch(function(erro){
            req.flash("error_msg", "Funcionários não encontrados.")
            res.redirect("/tarefa/"+req.params.id);
        })    
    }).catch(function(erro){
        req.flash("error_msg", "Tarefa não encontrada.")
        res.redirect("/tarefa/"+req.params.id);
    })    
})

router.get('/tarefas/addTarefa', authenticated, userResponsavel, function (req, res){
    Obra.find({estado:"preOrcamento"}).lean().then(function(obras){
        Funcionario.find().then(function(funcionarios){
            var funcionariosSelecionados = JSON.stringify(null);
            var obra = JSON.stringify(null);
            res.render("usersResponsaveis/tarefas/novaTarefaSemObra", {obras:obras, obra:obra, funcionariosSelecionados:funcionariosSelecionados, funcionarios:funcionarios.map(funcionarios => funcionarios.toJSON())})
        }).catch(function(error){
            req.flash("error_msg", "Funcionários não encontrados.")
            res.redirect("/dashboard")
        })
    }).catch(function(error){
        req.flash("error_msg", "Obras não encontradas.")
        res.redirect("/dashboard")
    })
})

router.post('/tarefas/addTarefa', authenticated, userResponsavel, function asyncFunction (req, res){
    var erros = new Object();
    var nomeT;
    var descricao;
    var data;

    if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
        erros.nome = "Nome inválido.";
    }
    else{
        if(req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,'').length < 2){   
            erros.nome = "Nome inválido. Mínimo de 3 caracteres, sendo que pode possuir apenas 1 espaço.";
        }
        else{
            nomeT = req.body.nome;
        }
    }

    
    if(!req.body.descricao || typeof req.body.descricao == undefined || req.body.descricao == null){
        erros.descricao = "Descrição inválida.";
    } else{
        if(req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,'').length < 4){
            erros.descricao = "Descrição com tamanho inválido. Mínimo de 5 caracteres, sendo que pode possuir apenas 2 espaços.";
        }
        else{
            descricao = req.body.descricao;
        }
    }

    if(!req.body.funcionarios || typeof req.body.funcionarios == undefined || req.body.funcionarios == null){
        erros.funcionarios = "Funcionários inválidos.";
    }

    Obra.findOne({nome:req.body.obras}).lean().then(function(obra){
        if(req.body.dataPrevistaInicio){
            var today = moment().format("YYYY-MM-DD HH:mm");
            var dataTarefa = moment(req.body.dataPrevistaInicio).format("YYYY-MM-DD HH:mm")
            var dataObra = moment(obra.dataPrevistaInicio).format("YYYY-MM-DD HH:mm")
            dataTarefa = moment(dataTarefa).add(1, 'minutes');
            if(moment(dataTarefa).isValid()){
                if(moment(today).isAfter(dataTarefa) == true || moment(dataObra).isAfter(dataTarefa) == true){
                    erros.datas = "Data inválida. Data tem que ser superior à data de hoje e superior à data de inicio da obra.";
                }
                else{
                    if(moment(req.body.dataPrevistaInicio).format("HH") >= 18 && moment(req.body.dataPrevistaInicio).format("mm") > 00)
                        erros.datas = "Data invalida. A hora limite são 18:00h.";
                    else{
                        if(moment(req.body.dataPrevistaInicio).format("HH") < 9 && moment(req.body.dataPrevistaInicio).format("mm") <= 59)
                            erros.datas = "Data invalida. A hora limite são 9:00h.";
                        else
                            data = req.body.dataPrevistaInicio
                    }
                }
            }
        }

        Tarefa.find({ $and: [{nome:req.body.nome}, {obra : obra._id}]}).lean().then(function(tarefas){
            if(tarefas.length != 0){
                erros.nome = "Já existe uma tarefa com este nome dentro da obra.";
            }
            if(Object.keys(erros).length != 0){ 
                Funcionario.find().then(function(funcionarios){
                    Obra.find({estado:"preOrcamento"}).lean().then(function(obras){
                        importancia = req.body.importancia
                        if(req.body.funcionarios)
                            var funcionariosSelecionados = JSON.stringify(req.body.funcionarios);
                        else
                            var funcionariosSelecionados = JSON.stringify(null);
                        
                        res.render("usersResponsaveis/tarefas/novaTarefaSemObra", {obra:obra, importancia:importancia, funcionariosSelecionados:funcionariosSelecionados, 
                            obras:obras, erros: erros, data:data, descricao:descricao, nomeT:nomeT,
                            funcionarios:funcionarios.map(funcionarios => funcionarios.toJSON())})
                    }).catch(function(err){
                        req.flash("error_msg", "Obras não encontradas")
                        res.redirect('/obra/'+req.params.id);
                    })
                }).catch(function(err){
                    req.flash("error_msg", "Erro interno no GET dos funcionários.")
                    res.redirect('/obra/'+req.params.id);
                })
            }
            else{
                async function secondFunction(){
                    var f = req.body.funcionarios
                    var funcionarios = await getFuncionarios(f)
                        var novaTarefa;
                        if(req.body.dataPrevistaInicio){
                            novaTarefa = {
                                nome: req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                                descricao: req.body.descricao.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                                dataPrevistaInicio: req.body.dataPrevistaInicio,
                                obra: obra._id,
                                importancia: req.body.importancia.toLowerCase()
                            }
                        }
                        else{
                            var today = moment().format("YYYY-MM-DD HH:mm");
                            var expectedStartDate = today;
                            if(moment(obra.dataPrevistaInicio).isAfter(today))
                                expectedStartDate = obra.dataPrevistaInicio 
                            novaTarefa = { 
                                nome: req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                                descricao: req.body.descricao.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                                dataPrevistaInicio: expectedStartDate,
                                obra: obra._id,
                                importancia: req.body.importancia.toLowerCase()
                            }
                        }
                        
                        new Tarefa(novaTarefa).save().then(function(tarefa){
                            Tarefa.findOne({_id:tarefa._id}).then(function(tarefa){
                                for(var i=0; i<funcionarios.length; i++){
                                        Funcionario.updateOne(
                                            {"_id":funcionarios[i]._id},
                                            {$push: {tarefas : tarefa._id}}
                                        ).then().catch(function(erro){
                                            req.flash("error_msg", "Erro ao inserir as tarefas nos funcionários.")
                                            res.redirect('/obra/'+req.params.id);
                                        })
                                        
                                        Funcionario.findOne({$and: [{_id:funcionarios[i]._id}, { obras : { $ne: obra._id}}]}).lean().then(function(funcionario){
                                            if(funcionario != null){
                                                Funcionario.updateOne(
                                                    {"_id":funcionario._id},
                                                    {$push: {obras : obra._id}}
                                                ).then()
                                            }
                                            
                                        })
                                    }
                                    
                                    Funcionario.updateOne(
                                        {"_id":req.user.id},
                                        {$push: {tarefasCriadas : tarefa._id}}
                                    ).then().catch(function(erro){
                                        req.flash("error_msg", "Erro ao inserir as tarefas nos funcionários.")
                                        res.redirect('/obra/'+req.params.id);
                                    })
                                    
                                    Funcionario.findOne({$and: [{_id:req.user.id}, { obras : { $ne: obra._id}}]}).lean().then(function(funcionario){
                                        if(funcionario != null){
                                            Funcionario.updateOne(
                                                {"_id":req.user.id},
                                                {$push: {obras : obra._id}}
                                            ).then()
                                        }
                                        
                                    })
                                    
                                    req.flash("success_msg", "Tarefa criada com sucesso.")
                                    res.redirect('/obra/'+obra._id);
                                    
                                }).catch(function(erro){
                                    req.flash("error_msg", "Erro ao encontrar a tarefa.")
                                    res.redirect('/obra/'+obra._id);
                                })
                                
                            }).catch(function(erro){
                                erros.nome = "Já existe uma tarefa com o mesmo nome ou houve um erro ao adicionar a tarefa. Tente novamente.";
                                Funcionario.find({}).then(function(funcionarios){
                                        if(funcionarios){
                                            res.render("usersResponsaveis/tarefas/novaTarefa", {obra:obra, erros: erros, data:data, descricao:descricao, nomeT:nomeT,
                                                funcionarios:funcionarios.map(funcionarios => funcionarios.toJSON())})
                                        }
                                    }).catch(function(err){
                                        req.flash("error_msg", "Erro interno no GET dos funcionários.")
                                        res.redirect('/obra/'+req.params.nome);
                                    })
                                
                            })
                    };
                    secondFunction()
                }
            }).catch(function(error){
                req.flash("error_msg", "Tarefa não encontrada.");
                res.redirect("/tarefas/"+req.params.id);
            })   
    }).catch(function(error){
        req.flash("error_msg", "Obra não encontrada.");
        res.redirect("/obra/"+req.params.id);
    })
})

router.get('/funcionarios', authenticated, admin, function(req, res){
    Funcionario.find().lean().then(function(funcionarios){
        res.render("admin/funcionarios/funcionarios", {funcionarios:funcionarios})
    }).catch(function(erro){
        req.flash("error_msg", "Erro ao fazer o GET dos funcionários.")
        res.redirect("/dashboard");
    })
})

router.get('/funcionario/:id', authenticated, admin, function(req, res){
    Funcionario.findOne({_id:req.params.id}).lean().then(function(funcionario){
        res.render("admin/funcionarios/funcionarioDetail", {funcionario:funcionario})
    }).catch(function(erro){
        req.flash("error_msg", "Funcionário não encontrado")
        res.redirect("/funcionarios");
    })
})

router.get('/funcionario/:id/edit', authenticated, admin, function(req, res){
    Funcionario.findOne({_id:req.params.id}).lean().then(function(funcionario){
        res.render("admin/funcionarios/editarFuncionario", {funcionario:funcionario, role:funcionario.role})
    }).catch(function(erro){
        req.flash("error_msg", "Funcionario não encontrado")
        res.redirect("/funcionarios");
    })
})

router.post('/funcionario/:id/edit', authenticated, admin, function asyncFunction(req, res){ 
    
    var erros = new Object();

    if(!req.body.departamento || typeof req.body.departamento == undefined || req.body.departamento == null){
        erros.departamento = "Departamento inválido.";
    }

    if(!req.body.equipa || typeof req.body.equipa == undefined || req.body.equipa == null){
        erros.equipa = "Equipa inválida.";
    }

    if(!req.body.funcao || typeof req.body.funcao == undefined || req.body.funcao == null){
        erros.funcao = "Função inválida.";
    }

    if(!req.body.custo || typeof req.body.custo == undefined || req.body.custo == null || req.body.custo < 0){
        erros.custo = "Salário inválido.";
    }
    
    var role = req.body.role;
    if(role == "Funcionário")
            role = "user"
        if(role == "Chefe de equipa")
            role = "userResponsavel"
        if(role == "Administrador")
            role = "admin"

    if(Object.keys(erros).length != 0){
        Funcionario.findOne({_id:req.params.id}).lean().then(function(funcionario){
            res.render("admin/funcionarios/editarFuncionario", {erros:erros, role:role, funcionario:funcionario})
        }).catch(function(error){
            req.flash("error_msg", "Erro ao fazer o GET dos funcionários.")
            res.redirect("/funcionarios");
        })
    }
    else{        

        Funcionario.findOneAndUpdate({_id:req.params.id},
            {"$set": {
                "departamento": req.body.departamento,
                "equipa": req.body.equipa,
                "funcao": req.body.funcao,
                "custo": req.body.custo,
                "role": role
              }}, {useFindAndModify: false}).then(function(){

                req.flash("success_msg", "Utilizador editado com sucesso")
                res.redirect("/funcionarios");
        }).catch(function(error){
            req.flash("error_msg", "Funcionário não encontrado")
            res.redirect("/funcionarios");
        })
    }
})

router.get('/funcionario/:id/remove', authenticated, admin, function(req, res){
    Funcionario.findOne({_id:req.params.id}).lean().then(function(funcionario){
        res.render("admin/funcionarios/removeFuncionario", {funcionario:funcionario})
    }).catch(function(erro){
        req.flash("error_msg", "Funcionario não encontrado")
        res.redirect("/funcionarios");
    })
})

router.post('/funcionario/:id/remove', authenticated, admin, function asyncFunction(req, res){
    Funcionario.findOneAndDelete({_id: req.params.id}).lean().then(function(){
        req.flash("success_msg", "Funcionário removido com sucesso.")
        res.redirect("/funcionarios")
    }).catch(function(error){
        req.flash("error_msg", "Erro ao remover funcionário.")
        res.redirect("/funcionarios")
    });
})

router.get('/funcionarios/addFuncionario', authenticated, admin, function(req, res){
    res.render("admin/funcionarios/registo")
})

router.post('/funcionarios/addFuncionario', authenticated, admin, function asyncFunction(req, res){
    var erros = new Object();
    var nomeF;
    var funcao;
    var departamento;
    var equipa;
    var custo;

    if(!req.body.nome || typeof req.body.nome === undefined || req.body.nome === null){
        erros.nome = "Nome obrigatório.";
    }
    else{
        if(req.body.nome.length > 50){
            erros.nome = "Nome demasiado longo. São permitidos apenas 50 caracteres.";
        }
        else{
            nomeF = req.body.nome;
        }
    }

    if(!req.body.email || typeof req.body.email === undefined || req.body.email === null){
        erros.email = "Email obrigatório.";
    }
    else{
        email = req.body.email;
    }

    if(!req.body.funcao || typeof req.body.funcao === undefined || req.body.funcao === null){
        erros.funcao = "Função na empresa obrigatório.";
    }
    else{
        funcao = req.body.funcao;
    }
    
    if(!req.body.departamento || typeof req.body.departamento === undefined || req.body.departamento === null){
        erros.departamento = "Departamento obrigatório.";
    }
    else{
        departamento = req.body.departamento;
    }
    
    if(!req.body.equipa || typeof req.body.equipa === undefined || req.body.equipa === null){
        erros.equipa = "Equipa obrigatório.";
    }
    else{
        equipa = req.body.equipa;
    }

    if(!req.body.custo || typeof req.body.custo === undefined || req.body.custo === null || req.body.custo < 0){
        erros.custo = "Custo inválido.";
    }
    else{
        custo = req.body.custo;
    }

    if(!req.body.password || typeof req.body.password === undefined || req.body.password === null){
        erros.password = "Password obrigatório.";
    }
    else{
        if(req.body.password.length < 5){
            erros.password = "Password curta. Mínimo 5 caracteres.";
        }
        
        if(!req.body.password2 || typeof req.body.password2 === undefined || req.body.password2 === null){
            erros.password2 = "Confirmação obrigatório.";
        }
        else{
            if(req.body.password != req.body.password2){
                erros.password = "As passwords não correspondem.";
            }
        }        
    } 


    if(Object.keys(erros).length != 0){
        res.render("admin/funcionarios/registo", {erros: erros, nomeF:nomeF, custo:custo, funcao:funcao, equipa:equipa, departamento:departamento, email:email})
    }
    else{
        Funcionario.findOne({email:req.body.email}).then(function(funcionario){
            if(funcionario){
                erros.email = "Já existe uma conta com este email.";
                res.render("admin/funcionarios/registo", {erros: erros, nomeF:nomeF, funcao:funcao, equipa:equipa, departamento:departamento, email:email})
            }
            else{
                const novoFunc = new Funcionario({
                    nome: req.body.nome,
                    funcao: req.body.funcao,
                    departamento: req.body.departamento,
                    equipa: req.body.equipa,
                    email: req.body.email,
                    password: req.body.password,
                    custo: req.body.custo
                })

                bcrypt.genSalt(10, function(erro, salt){
                    bcrypt.hash(novoFunc.password, salt, function(erro, hash){
                        if(erro){
                            req.flash("error_msg", "Erro interno ao registar. Tente novamente")
                            res.redirect("/funcionarios/addFuncionario");
                        }

                        novoFunc.password = hash
                        novoFunc.save().then(function(funcionario){
                            req.flash("success_msg", "Registo concluído com sucesso.")
                            res.redirect("/funcionarios");
                        }).catch(function(erro){
                            req.flash("error_msg", "Erro interno ao registar. Tente novamente")
                            res.redirect("/funcionarios/addFuncionario");
                        })
                    })
                })
            }
        }).catch(function(erro){
            console.log(erro)
            req.flash("error_msg", "Erro interno ao registar. Tente novamente.")
            res.redirect("/funcionarios/addFuncionario");
        })
    }

})

router.get('/maquinas', authenticated, userResponsavel, function(req, res){
    Maquina.find().lean().then(function(maquinas){
        res.render("usersResponsaveis/maquinas/maquinas", {maquinas:maquinas})
    }).catch(function(error){
        req.flash("error_msg", "Máquinas não encontradas")
        res.redirect("/dashboard")
    })
})

router.get('/maquinas/add', authenticated, userResponsavel, function(req, res){
    res.render("usersResponsaveis/maquinas/novaMaquina")
})

router.post('/maquinas/add', authenticated, userResponsavel, function asyncFunction(req, res){
    
    var erros = new Object();
    var funcao;
    var nomeO;
    var departamento;

    if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
        erros.nome = "Nome inválido";
    }
    else{
        if(req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,'').length < 2){
            erros.nome = "Nome com tamanho inválido. Mínimo de 3 caracteres, sendo que pode possuir apenas 1 espaço.";
        }else{
            nomeO = req.body.nome;
        }
    }
    
    if(!req.body.funcao || typeof req.body.funcao == undefined || req.body.funcao == null){
        erros.funcao = "Função inválida";
    } else{
        funcao = req.body.funcao
    }

    if(!req.body.departamento || typeof req.body.departamento == undefined || req.body.departamento == null){
        erros.departamento = "Departamento inválida";
    } else{
        departamento = req.body.departamento
    }

    if(req.user.role == "admin"){
        if(!req.body.custo || typeof req.body.custo == undefined || req.body.custo == null || req.body.custo < 0){
            erros.custo = "Custo inválido";
        } else{
            var custo = req.body.custo
        }
    }


    if(Object.keys(erros).length != 0){
        res.render("usersResponsaveis/maquinas/novaMaquina", {erros: erros, nomeO:nomeO, custo:custo, funcao:funcao, departamento:departamento})
    }
    else{
        var novaMaquina;
        novaMaquina = {
            nome: req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
            funcao: req.body.funcao,
            departamento: req.body.departamento
        }
        if(req.user.role == "admin"){
            novaMaquina.custo = custo;
        }   
        new Maquina(novaMaquina).save().then(function(){ 
            req.flash("success_msg", "Máquina criada com sucesso.")
            res.redirect("/maquinas");
        }).catch(function(erro){
            erros.nome = "Já existe uma máquina com o mesmo nome ou houve um erro ao adicionar a máquina. Tente novamente.";
            res.render("usersResponsaveis/maquinas/novaMaquina", {erros: erros, nomeO:nomeO, funcao:funcao, departamento:departamento})
        })
    
    }
})

router.get('/maquina/:id', authenticated, userResponsavel, function(req, res){
    Maquina.findOne({_id: req.params.id}).lean().then(function(maquina){
        res.render("usersResponsaveis/maquinas/maquinaDetail", {maquina:maquina})
    }).catch(function(error){
        req.flash("error_msg", "Máquina não encontrada.")
        res.redirect("/maquinas")
    })
})

router.get('/maquina/:id/edit', authenticated, userResponsavel, function(req, res){
    Maquina.findOne({_id:req.params.id}).lean().then(function(maquina){
        res.render("usersResponsaveis/maquinas/editarMaquina", {maquina:maquina})
    }).catch(function(erro){
        req.flash("error_msg", "Máquina não encontrada")
        res.redirect("/maquinas");
    })
})

router.post('/maquina/:id/edit', authenticated, userResponsavel, function asyncFunction(req, res){
    
    Maquina.findOne({_id:req.params.id}).lean().then(function(maquina){
        var erros = new Object();

        if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
            erros.nome = "Nome inválido.";
        }
        else{
            if(req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,'').length < 2){   
                erros.nome = "Nome inválido. Mínimo de 3 caracteres, sendo que pode possuir apenas 1 espaço.";
            }
            else{
                maquina.nome = req.body.nome;
            }
        }

        if(!req.body.funcao || typeof req.body.funcao == undefined || req.body.funcao == null){
            erros.funcao = "Função inválido.";
        }else{
            maquina.funcao = req.body.funcao;
        }

        if(!req.body.departamento || typeof req.body.departamento == undefined || req.body.departamento == null){
            erros.departamento = "Departamento inválido.";
        }else{
            maquina.departamento = req.body.departamento;
        }

        if(req.user.role == "admin"){
            if(!req.body.custo || typeof req.body.custo == undefined || req.body.custo == null || req.body.custo < 0){
                erros.custo = "Preço inválido.";
            }
            else{
                maquina.custo = req.body.custo;
            }
        }    

        if(Object.keys(erros).length != 0){
                res.render("usersResponsaveis/maquinas/editarMaquina", {erros:erros, maquina:maquina})
        }
        else{
            Maquina.findOne({_id:req.params.id}).lean().then(function(maquina){
                var custo;
                if(req.body.custo != undefined)
                    custo = req.body.custo;
                else
                    custo = maquina.custo;
                Maquina.findOneAndUpdate({_id:req.params.id},
                    {"$set": {
                        "nome": req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                        "departamento": req.body.departamento,
                        "funcao": req.body.funcao,
                        "custo": custo
                        }}, {useFindAndModify: false}).then(function(){
                        req.flash("success_msg", "Máquina editada com sucesso")
                        res.redirect("/maquinas");
                }).catch(function(error){
                    req.flash("error_msg", "Já existe uma máquina com o mesmo nome.")
                    res.redirect("/maquina/"+req.params.id+"/edit");
                })
            }).catch(function(error){
                req.flash("error_msg", "Máquina não encontrada.")
                res.redirect("/maquinas");
            })
            
        }
    }).catch(function(error){
        req.flash("error_msg", "Máquina não encontrada.")
        res.redirect("/maquinas")
    })
})

router.get('/maquina/:id/remove', authenticated, admin, function(req, res){
    Maquina.findOne({_id:req.params.id}).lean().then(function(maquina){
        res.render("admin/maquinas/removeMaquina", {maquina:maquina})
    }).catch(function(erro){
        req.flash("error_msg", "Máquina não encontrada.")
        res.redirect("/maquinas");
    })
})

router.post('/maquina/:id/remove', authenticated, admin, function asyncFunction(req, res){
    Maquina.findOneAndDelete({_id: req.params.id}).lean().then(function(){
        req.flash("success_msg", "Máquina removida com sucesso.")
        res.redirect("/maquinas")
    }).catch(function(error){
        req.flash("error_msg", "Erro ao remover máquina.")
        res.redirect("/maquinas")
    });
})

router.get('/clientes', authenticated, userResponsavel, function(req, res){
    Cliente.find().lean().then(function(clientes){
        res.render("usersResponsaveis/clientes/clientes", {clientes:clientes})
    }).catch(function(error){
        req.flash("error_msg", "Clientes não encontrados.")
        res.redirect("/dashboard")
    })
})

router.get('/clientes/add', authenticated, userResponsavel, function(req, res){
    res.render("usersResponsaveis/clientes/novoCliente");
})

router.post('/clientes/add', authenticated, userResponsavel, function asyncFunction(req, res){
    var erros = new Object();
    var nomeC;
    var nif;
    var email;
    var morada;

    if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
        erros.nome = "Nome inválido.";
    }
    else{
        if(req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,'').length < 2){
            erros.nome = "Nome com tamanho inválido. Mínimo de 3 caracteres, sendo que pode possuir apenas 1 espaço.";
        }else{
            nomeC = req.body.nome;
        }
    }
    

    if(!req.body.nif || typeof req.body.nif == undefined || req.body.nif == null){
        erros.nif = "Número de identidade inválido.";
    } else{
        nif = req.body.nif;
    }

    if(!req.body.email || typeof req.body.email == undefined || req.body.email == null){
        erros.email = "E-mail inválido.";
    } 
    else{
        email = req.body.email;
    }

    if(!req.body.morada || typeof req.body.morada == undefined || req.body.morada == null){
        erros.morada = "Morada inválida.";
    } 
    else{
        morada = req.body.morada;
    }
    

    if(Object.keys(erros).length != 0){
        res.render("usersResponsaveis/clientes/novoCliente", {erros: erros, nomeC:nomeC, nif:nif, email:email, morada:morada})
    }
    else{
        var novoCliente = {
                nome: req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                nif: req.body.nif,
                email: req.body.email,
                morada: req.body.morada 
            }
        
        new Cliente(novoCliente).save().then(function(){       
            req.flash("success_msg", "Cliente registado com sucesso.")
            res.redirect("/clientes");
        }).catch(function(erro){
            Cliente.find({nif:req.body.nif}).lean().then(function(cliente){
                if(cliente.length == 0){
                    erros.email = "Já existe um cliente com o mesmo email ou houve um erro ao adicionar o cliente. Tente novamente.";
                    res.render("usersResponsaveis/clientes/novoCliente", {erros: erros, nomeC:nomeC, nif:nif, email:email, morada:morada})
                }
                else{
                    erros.nif = "Já existe um cliente com o mesmo nif ou houve um erro ao adicionar o cliente. Tente novamente.";
                    res.render("usersResponsaveis/clientes/novoCliente", {erros: erros, nomeC:nomeC, nif:nif, email:email, morada:morada})
                }
            }).catch(function(error){
                req.flash("error_msg", "Erro ao encontrar cliente")
                res.redirect("/clientes");
            })
        })
    }
})

router.get('/cliente/:id', authenticated, userResponsavel, function(req, res){
    Cliente.findOne({_id:req.params.id}).lean().then(function(cliente){
        Obra.find({_id:cliente.obras}).lean().then(function(obras){
            res.render("usersResponsaveis/clientes/clienteDetails", {cliente:cliente, obras:obras});
        }).catch(function(error){
            req.flash("error_msg", "Obras não encontradas.")
            res.redirect("/clientes")
        })
    }).catch(function(error){
        req.flash("error_msg", "Cliente não encontrado.")
        res.redirect("/clientes")
    })
})

router.get('/cliente/:id/edit', authenticated, userResponsavel, function(req, res){
    Cliente.findOne({_id:req.params.id}).lean().then(function(cliente){
        res.render("usersResponsaveis/clientes/editarCliente", {cliente:cliente})
    }).catch(function(erro){
        req.flash("error_msg", "Cliente não encontrado.")
        res.redirect("/clientes");
    })
})

router.post('/cliente/:id/edit', authenticated, userResponsavel, function asyncFunction(req, res){
    
    Cliente.findOne({_id:req.params.id}).lean().then(function(cliente){
        var erros = new Object();

        if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
            erros.nome = "Nome inválido.";
        }
        else{
            if(req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,'').length < 2){   
                erros.nome = "Nome inválido. Mínimo de 3 caracteres, sendo que pode possuir apenas 1 espaço.";
            }
            else{
                cliente.nome = req.body.nome;
            }
        }

        if(!req.body.nif || typeof req.body.nif == undefined || req.body.nif == null){
            erros.nif = "Número de identidade fiscal inválido.";
        }else{
            cliente.nif = req.body.nif;
        }

        if(!req.body.email || typeof req.body.email == undefined || req.body.email == null){
            erros.email = "E-mail inválido.";
        }else{
            cliente.email = req.body.email;
        }

        if(!req.body.morada || typeof req.body.morada == undefined || req.body.morada == null){
            erros.morada = "Morada inválido.";
        }
        else{
            cliente.morada = req.body.morada;
        }
         
        if(Object.keys(erros).length != 0){
            res.render("usersResponsaveis/clientes/editarCliente", {erros:erros, cliente:cliente})
        }
        else{
            Cliente.findOne({$and: [{nif:req.body.nif}, {_id: {$ne:req.params.id}}]}).lean().then(function(clientes){
                if(clientes == null){
                    Cliente.findOne({$and: [{email:req.body.email}, {_id: {$ne:req.params.id}}]}).lean().then(function(clientes){
                        if(clientes == null){
                            Cliente.findOneAndUpdate({_id:req.params.id},
                                {"$set": {
                                    "nome": req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                                    "nif": req.body.nif,
                                    "morada": req.body.morada,
                                    "email": req.body.email
                                    }}, {useFindAndModify: false}).then(function(){
                                    req.flash("success_msg", "Cliente editado com sucesso.")
                                    res.redirect("/cliente/"+req.params.id);
                            }).catch(function(error){
                                req.flash("error_msg", "Cliente não encontrado.")
                                res.redirect("/clientes");
                            })
                        }
                        else{
                            erros.email = "E-mail já existente.";
                            res.render("usersResponsaveis/clientes/editarCliente", {erros:erros, cliente:cliente})
                        }
                    }).catch(function(error){
                        
                    })
                }
                else{
                    erros.nif = "Número de identidade fiscal já existente.";
                    res.render("usersResponsaveis/clientes/editarCliente", {erros:erros, cliente:cliente})
                }
            }).catch(function(error){
                
            })
        }
    }).catch(function(error){
        req.flash("error_msg", "Cliente não encontrado.")
        res.redirect("/clientes")
    })
})

async function getFuncionarios(funcionarios, f){
    var a=[]
    if(funcionarios[0].length == 1){
        await Funcionario.findOne({nome : funcionarios}).lean().then(function(funcionario){
            a.push(funcionario);
        })
    }
    else{
        await Funcionario.find().lean().then(function(funcionario) {
            for(var i=0; i<funcionarios.length; i++){
                for(var j=0; j<funcionario.length; j++){
                    if(funcionarios[i] == funcionario[j].nome){
                        a.push(funcionario[j])
                        break;
                    }
                }
            }
        })
    }
    return a;
}

async function isValidIssueName(tarefas, nome){

    var sai = false;
    for(var i=0; i<tarefas.length; i++){
        await Tarefa.findOne({_id:tarefas[i]}).then(function(tarefa){
            if(tarefa.nome == nome){
                sai = true;
            }
        })
        if(sai)
            break;
    }
        
    
    return sai;
}

module.exports = router