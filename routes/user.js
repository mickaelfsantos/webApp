const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const moment = require('moment')
moment().format();
const Holidays = require('date-holidays')
const hd = new Holidays('PT')
var momentBD = require('moment-business-days');
const bcrypt = require('bcryptjs')
const passport = require('passport')
const {authenticated} = require('../helpers/userRole');
const fs = require('fs');
const nodemailer = require('nodemailer');
const formidable = require('formidable');
const path = require('path');
const multer = require("multer");

const targetPath = path.resolve('public/img');
const upload = multer({
    dest: targetPath
  });


//models
    require("../models/Obra")
    require("../models/Tarefa")
    require("../models/Funcionario")
    require("../models/Requisicao")
    require("../models/Maquina")
    require("../models/Cliente")
    require("../models/Compra")
    const Obra = mongoose.model("obras")
    const Tarefa = mongoose.model("tarefas")
    const Funcionario = mongoose.model("funcionarios")
    const Requisicao = mongoose.model("requisicoes")
    const Maquina = mongoose.model("maquinas")
    const Cliente = mongoose.model("clientes")
    const Compra = mongoose.model("compras")


router.get('/login', function(req, res){
    res.render("users/login")
})

router.post('/login', function asyncFunction(req, res, next){
    passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/login",
        failureFlash: true
    })(req, res, next)
})

router.get("/logout", authenticated, function(req, res){
    req.logout()
    res.redirect("/login")
})

router.get('/', function(req, res){
    if(req.user != undefined){
        res.redirect("/dashboard")
    }
    else{
        res.redirect("/login")
    }
})

router.get('/dashboard', authenticated, function(req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Tarefa.find({_id:funcionario.tarefas}).lean().then(function(t){
            Obra.find({_id:funcionario.obras}).lean().then(function(obras){
                var tarefas = JSON.stringify(t);
                var obras = JSON.stringify(obras);
                res.render("users/dashboard", {tarefas:tarefas, obras:obras})
            })
        }).catch(function(error){
            req.flash("error_msg", "Tarefas não encontradas")
            res.redirect("/logout")
        })
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/logout")
    })
})

router.get('/obras', authenticated, function(req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Obra.find({ _id:funcionario.obras}).lean().then(function(obras){
            var o = JSON.stringify(obras);
            res.render("users/obras/obras", {obras: obras, obrasS : o})
        }).catch(function(erro){
            req.flash("error_msg", "Erro ao fazer o GET das obras.")
            res.redirect("/dashboard");
        })
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/dashboard");
    })
    
})

router.post('/obra/:id', function(req, res) {
    var base64Data = req.body.imgBase64.replace(/^data:image\/png;base64,/, "");
    fs.writeFile("graficos/obra"+req.params.id+".png", base64Data, 'base64', function(err) {
        if(err){
         }
    });
})

router.get('/obra/:id', authenticated, function(req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Obra.findOne({ $and: [{_id:req.params.id}, {_id:funcionario.obras}]}).lean().then(function(obra){
            Tarefa.find({obra:obra._id}).lean().then(function(tarefas){
                Cliente.findOne({obras:obra}).lean().then(function(cliente){
                    Compra.find({obra:obra}).lean().then(function(compras){
                        async function obtemRequisicoes(){
                            var t = [];
                            for(var i=0; i<tarefas.length; i++){
                                t.push(tarefas[i]);
                                t[i].requisicoes = [];
                                await Requisicao.find({tarefa:tarefas[i]._id}).then(function(requisicoes){
                                    for(var j=0; j<requisicoes.length; j++){
                                        t[i].requisicoes.push(requisicoes[j])
                                    }
                                })
                            }
                            var tarefasS = JSON.stringify(t);
                            res.render("users/obras/obraDetail", {obra:obra, cliente:cliente, compras:compras, tarefasS:tarefasS, tarefas:t, user:req.user})
                        }
                        obtemRequisicoes();
                    }).catch(function(error){
                        req.flash("error_msg", "Compras não encontradas.")
                        res.redirect("/obras")
                    })
                }).catch(function(error){
                    req.flash("error_msg", "Cliente não encontrado.")
                    res.redirect("/obras")
                })
            }).catch(function(error){
                req.flash("error_msg", "Tarefas não encontradas")
                res.redirect("/obras")
            })
        }).catch(function(erro){
            req.flash("error_msg", "Obra não encontrada.")
            res.redirect("/obras");
        })
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/dashboard")
    })
    
})

router.get('/tarefas', authenticated, function(req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Tarefa.find({_id:funcionario.tarefas}).lean().then(function(tarefas){
            async function obtemDados(){
                var t = [];
                for(var i=0; i<tarefas.length; i++){
                    t.push(tarefas[i])
                    t[i].requisicoes = [];
                    await Requisicao.find({tarefa:tarefas[i].id}).then(function(requisicoes){
                        t[i].requisicoes = requisicoes;
                    })
                }
                var tarefasS = JSON.stringify(t);
                res.render("users/tarefas/tarefas", {tarefas: t, tarefasS:tarefasS})
            }
            obtemDados();
        }).catch(function(erro){
            req.flash("error_msg", "Tarefas não encontradas")
            res.redirect("/dashboard");
        })
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/dashboard");
    })
})

router.get('/tarefa/:id', authenticated, function(req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Tarefa.findOne({ $and: [{_id:req.params.id}, {$or: [{_id:funcionario.tarefas}, {_id:funcionario.tarefasCriadas}]}]}).lean().then(function(tarefa){
            Obra.findOne({_id:tarefa.obra}).lean().then(function(obra){
                Funcionario.find({tarefas:tarefa._id}).lean().then(function(funcionarios){
                    Requisicao.find({tarefa:tarefa._id}).lean().then(function(requisicoes){
                        var reques = [];
                        var despesaRequisicoes = 0;
                        var orcamentoRequisicoes = 0;
                        var despesaFinalRequisicoes = 0;
                        var custoFinalRequisicoes = 0;
                        
                        async function obtemDados(){
                            for(var i=0; i<requisicoes.length; i++){
                                reques.push(requisicoes[i]);
                                Funcionario.findOne({_id:requisicoes[i].funcionario}).lean().then(function (funcionario){
                                    reques[i].funcionarioNome = funcionario.nome;
                                })
                                await Maquina.findOne({_id:requisicoes[i].maquina}).lean().then(function(maquina){
                                    reques[i].maquinaNome = maquina.nome;
                                })
                                despesaRequisicoes += reques[i].despesa;
                                orcamentoRequisicoes += reques[i].orcamento;
                                despesaFinalRequisicoes += reques[i].despesaFinal;
                                custoFinalRequisicoes += reques[i].custoFinal;
                            }
                            var t = JSON.stringify(tarefa);
                            res.render("users/tarefas/tarefaDetail", {obra:obra, tarefa:tarefa, t:t, despesaRequisicoes:despesaRequisicoes, orcamentoRequisicoes:orcamentoRequisicoes,
                                despesaFinalRequisicoes:despesaFinalRequisicoes, custoFinalRequisicoes:custoFinalRequisicoes, funcionarios:funcionarios, requisicoes:reques})
                        }
                        obtemDados();
                    }).catch(function(error){
                        req.flash("error_msg", "Requisições não encontradas.")
                        res.redirect("/tarefas")
                    })
                }).catch(function(error){
                    req.flash("error_msg", "Funcionários não encontrados.")
                    res.redirect("/tarefas");
                })
            }).catch(function(error){
                req.flash("error_msg", "Obra não encontrada.")
                res.redirect("/tarefas");
            })
        }).catch(function(erro){
            req.flash("error_msg", "Tarefa não encontrada.")
            res.redirect("/tarefas");
        })
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/dashboard");
    })
})

router.get('/tarefa/:id/edit', authenticated, function(req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Tarefa.findOne({ $and: [{_id:req.params.id}, {_id:funcionario.tarefas}]}).lean().then(function(tarefa){
            Funcionario.find( { tarefas: { $ne: tarefa._id}}).lean().then(function(f){ 
                var dataPrevistaInicio = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DDTHH:mm")
                var dataPrevistaFim = moment(tarefa.dataPrevistaFim).format("YYYY-MM-DDTHH:mm")
                var dataInicio = moment(tarefa.dataInicio).format("YYYY-MM-DDTHH:mm")
                var dataFim = moment(tarefa.dataFim).format("YYYY-MM-DDTHH:mm")
                var funcionariosSelecionados = JSON.stringify(null);
                res.render("users/tarefas/editarTarefa", {tarefa:tarefa, funcionariosSelecionados:funcionariosSelecionados, dataPrevistaInicio:dataPrevistaInicio, dataPrevistaFim:dataPrevistaFim, dataInicio:dataInicio, dataFim:dataFim,
                    funcionarios : f})
            }).catch(function(erro){
                req.flash("error_msg", "Tarefa não encontrada.")
                res.redirect("/tarefas");
            })
        }).catch(function(erro){
            req.flash("error_msg", "Tarefa não encontrada.")
            res.redirect("/tarefas");
        })
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/dashboard");
    })
})

router.post('/tarefa/:id/edit', authenticated, function asyncFunction(req, res){
    var erros = new Object();
   
    Tarefa.findOne({_id: req.params.id}).lean().then(function(tarefa){
        Obra.findOne({_id:tarefa.obra}).lean().then(function(obra){

            if(req.user.role != "user"){
                if(tarefa.estado != "emExecucao"){
                    if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
                        erros.nome = "Nome inválido.";
                    }else{
                        if(req.body.nome.trim().length < 2){
                            erros.nome = "Nome com tamanho inválido. Mínimo de 3 caracteres.";
                        }
                        else{
                            tarefa.nome = req.body.nome;
                        }
                    }
                
                    if(!req.body.descricao || typeof req.body.descricao == undefined || req.body.descricao == null){
                        erros.descricao = "Descrição inválida.";
                    }
                    else{
                        if(req.body.descricao.trim().length < 3){
                            erros.descricao = "Descrição com tamanho inválido. Mínimo de 5 caracteres, sendo que pode possuir apenas 2 espaços.";
                        }
                        else{
                            tarefa.descricao = req.body.descricao;
                        }
                    }
                        
                    tarefa.importancia = req.body.importancia.toLowerCase();
                }
                else{
                    tarefa.progresso = req.body.progresso;
                }
                
            }
            

            var dataT =  moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DD HH:mm")
            var dataForm =  moment(req.body.dataPrevistaInicio).format("YYYY-MM-DD HH:mm")
            if(dataT != dataForm){
                var today = moment().format("YYYY-MM-DD HH:mm");
                var dataTarefa = moment(req.body.dataPrevistaInicio).format("YYYY-MM-DD HH:mm")
                var dataObra = moment(obra.dataPrevistaInicio).format("YYYY-MM-DD HH:mm")
                dataTarefa = moment(dataTarefa).add(1, "minutes");
                if(moment(dataTarefa).isValid()){
                    if(moment(today).isAfter(dataTarefa) == true || moment(dataObra).isAfter(dataTarefa) == true){
                        erros.dataInicio = "Data inválida. Data de início tem que ser superior ou igual à data atual e à data de inicio da obra.";
                    }
                    else{
                        if(moment(req.body.dataPrevistaInicio).format("HH") >= 18 && moment(req.body.dataPrevistaInicio).format("mm") > 00)
                            erros.dataInicio = "Data invalida. A hora limite são 18:00h.";
                        else{
                            if(moment(req.body.dataPrevistaInicio).format("HH") < 9 && moment(req.body.dataPrevistaInicio).format("mm") <= 59)
                                erros.dataInicio = "Data invalida. A hora limite são 9:00h.";
                        }
                    }
                    
                }
            }

            var dataTF =  moment(tarefa.dataPrevistaFim).format("YYYY-MM-DD HH:mm")
            var dataFormF =  moment(req.body.dataPrevistaFim).format("YYYY-MM-DD HH:mm")
            if(dataTF != dataFormF){
                var today = moment().format("YYYY-MM-DD HH:mm");
                var dataInicioTarefa;
                if(req.body.dataPrevistaInicio){
                    dataInicioTarefa = moment(req.body.dataPrevistaInicio).format("YYYY-MM-DD HH:mm")
                }else{
                    dataInicioTarefa = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DD HH:mm")
                }
                var dataFimTarefa = moment(req.body.dataPrevistaFim).format("YYYY-MM-DD HH:mm")
                dataFimTarefa = moment(dataFimTarefa).add(1, "minutes");
                if(moment(dataFimTarefa).isValid()){
                    if(moment(dataInicioTarefa).isAfter(dataFimTarefa) == true || moment(today).isAfter(dataFimTarefa) == true){
                        erros.dataFinal = "Data inválida. Data de fim tem que ser superior ou igual à data atual e à data de inicio da tarefa.";
                    }
                    else{
                        if(moment(req.body.dataPrevistaFim).format("HH") >= 18 && moment(req.body.dataPrevistaFim).format("mm") > 00)
                            erros.dataFinal = "Data invalida. A hora limite são 18:00h.";
                        else{
                            if(moment(req.body.dataPrevistaFim).format("HH") < 9 && moment(req.body.dataPrevistaFim).format("mm") <= 59)
                                erros.dataFinal = "Data invalida. A hora limite são 9:00h.";
                        }
                    }
                }
            }
            
            if(moment(req.body.dataPrevistaInicio).isValid() && moment(req.body.dataPrevistaFim).isValid()){
                if(moment(req.body.dataPrevistaInicio).isAfter(req.body.dataPrevistaFim) == true){
                    erros.dataFinal = "Data inválida. Data de fim tem que ser superior ou igual à data atual e à data início da tarefa.";
                }
            }

            if(Object.keys(erros).length != 0){
                Funcionario.find({ tarefas: { $ne: tarefa._id}}).lean().then(function(f){
                    var dataPrevistaInicio = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DDTHH:mm")
                    var dataPrevistaFim = moment(tarefa.dataPrevistaFim).format("YYYY-MM-DDTHH:mm")
                    var dataInicio = moment(tarefa.dataInicio).format("YYYY-MM-DDTHH:mm")
                    var dataFim = moment(tarefa.dataFim).format("YYYY-MM-DDTHH:mm")
                    if(req.body.funcionarios)
                        var funcionariosSelecionados = JSON.stringify(req.body.funcionarios); 
                    else
                        var funcionariosSelecionados = JSON.stringify(null);
                    var importancia = req.body.importancia;
                    res.render("users/tarefas/editarTarefa", {tarefa:tarefa, erros:erros, importancia:importancia, funcionariosSelecionados:funcionariosSelecionados, dataPrevistaInicio:dataPrevistaInicio, dataPrevistaFim:dataPrevistaFim, dataInicio:dataInicio, dataFim:dataFim,
                            funcionarios : f})
                }).catch(function(error){
                    req.flash("error_msg", "Funcionários não encontrados.")
                    res.redirect("/tarefa/"+req.params.id)
                })
            }
            else{
                async function secondFunction(){
                    var f = req.body.funcionarios
                    if(f != undefined){
                        var funcs = await getFuncionarios(f)
                    }
                    tarefa.dataPrevistaInicio = req.body.dataPrevistaInicio;
                    tarefa.dataPrevistaFim = req.body.dataPrevistaFim;
                    if(moment(tarefa.dataPrevistaInicio).isBefore(moment())){
                        tarefa.dataPrevistaInicio = moment();
                    }
                    
                    Tarefa.findOneAndUpdate({_id:req.params.id}, 
                        {"$set": {
                            "nome": tarefa.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                            "descricao": tarefa.descricao.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                            "dataPrevistaInicio": tarefa.dataPrevistaInicio,
                            "dataPrevistaFim": tarefa.dataPrevistaFim,
                            "importancia": tarefa.importancia,
                            "progresso": tarefa.progresso
                          }}, {useFindAndModify: false}).then(function(tarefa){
                        
                        if(f != undefined){
                            for(var i=0; i<funcs.length; i++){
                                Funcionario.updateOne(
                                    {"nome":funcs[i].nome},
                                    {$push: {tarefas : tarefa._id}}
                                ).then()
                                Funcionario.findOne({$and: [{_id:funcs[i]._id}, { obras : { $ne: obra._id}}]}).lean().then(function(funcionario){
                                    if(funcionario != null){
                                        Funcionario.updateOne(
                                            {"nome":funcionario.nome},
                                            {$push: {obras : obra._id}}
                                        ).then()
                                    }
                                })
                            }
                        }

                        req.flash("success_msg", "Tarefa editada com sucesso.");
                        res.redirect("/tarefa/"+req.params.id);
                    }).catch(function (error){
                        req.flash("error_msg", "Já existe uma tarefa com esse nome.")
                        res.redirect("/tarefa/"+req.params.id+"/edit")
                    })
                }
                secondFunction()
            }
        })
    })

})

router.get('/tarefa/:id/validar', authenticated, function asyncFunction(req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Tarefa.findOne({ $and: [{_id:req.params.id}, {_id : funcionario.tarefas}]}).lean().then(function(tarefa){
            if(tarefa.dataPrevistaFim == "Invalid date" || typeof tarefa.dataPrevistaFim == undefined || tarefa.dataPrevistaFim == null){
                Requisicao.findOne({tarefa:tarefa._id}).lean().then(function(requisicao){
                    if(requisicao){ 
                        req.flash("error_msg", "Impossível validar tarefa. A data prevista de fim é relativa às requisições de máquinas para esta tarefa. Preencha a data prevista de fim da própria tarefa para a submeter (Opção \"Editar\"). Se não for necessário mão de obra para a realização da tarefa, preencha a data prevista de fim com a data da data prevista de inicio.")
                        res.redirect("/tarefa/"+req.params.id)
                    }
                    else{
                        req.flash("error_msg", "Impossível validar tarefa, uma vez que esta não tem data prevista de fim.")
                        res.redirect("/tarefa/"+req.params.id)
                    }
                }).catch(function(error){
                    req.flash("error_msg", "Impossível validar tarefa, uma vez que esta não tem data prevista de fim.")
                    res.redirect("/tarefa/"+req.params.id)
                })
            }
            else{
                if(tarefa.estado != "associada" && tarefa.estado != "recusada"){
                    req.flash("error_msg", "Já foi submetida para validação")
                    res.redirect("/tarefa/"+req.params.id)
                }
                else{
                    Tarefa.findOneAndUpdate({_id:req.params.id},
                        {"$set": {
                            "estado": "porAceitar"
                            }}, {useFindAndModify: false}).lean().then(function(){
                            req.flash("success_msg", "Tarefa submetida com sucesso")
                            res.redirect("/tarefa/"+req.params.id);
                    }).catch(function(error){
                        req.flash("error_msg", "Erro ao submeter a tarefa.")
                        res.redirect("/tarefa/"+req.params.id);
                    })
                }
            }
        }).catch(function(error){
            req.flash("error_msg", "Não tem permissões para submeter a tarefa.")
            res.redirect("/tarefa/"+req.params.id)
        })
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/tarefa/"+req.params.id)
    })
})

router.get('/tarefa/:id/comecar', authenticated, function asyncFunction(req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Tarefa.findOne({ $and: [{_id:req.params.id}, {_id : funcionario.tarefas}]}).lean().then(function(tarefa){
            if(tarefa.estado != "aceite"){
                req.flash("error_msg", "Não pode começar esta tarefa. Verifique que a tarefa está aceite.")
                res.redirect("/tarefa/"+req.params.id)
            }
            else{
                Tarefa.findOneAndUpdate({_id:req.params.id},
                    {"$set": {
                        "estado": "emExecucao",
                        "dataInicio": moment()
                        }}, {useFindAndModify: false}).lean().then(function(){
                        Obra.findOne({_id:tarefa.obra}).lean().then(function(obra){
                            if(obra.estado != "producao"){
                                Obra.updateOne(
                                    {"_id":tarefa.obra},
                                    {$set: {estado : "producao", dataInicio: moment()}}).then()
                            }
                            req.flash("success_msg", "Tarefa iniciada com sucesso.")
                            res.redirect("/tarefa/"+req.params.id);
                        })
                }).catch(function(error){
                    req.flash("error_msg", "Erro ao começar a tarefa.")
                    res.redirect("/tarefa/"+req.params.id);
                })
            }
        }).catch(function(error){
            req.flash("error_msg", "Não tem permissões para começar a tarefa.")
            res.redirect("/tarefa/"+req.params.id)
        })
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/tarefa/"+req.params.id)
    })
})

router.get('/tarefa/:id/terminar', authenticated, function asyncFunction(req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Tarefa.findOne({ $and: [{_id:req.params.id}, {_id : funcionario.tarefas}]}).lean().then(function(tarefa){
            if(tarefa.estado != "emExecucao"){
                req.flash("error_msg", "Não pode terminar esta tarefa. Verifique que a tarefa está em execução.")
                res.redirect("/tarefa/"+req.params.id)
            }
            else{
                Tarefa.findOneAndUpdate({_id:req.params.id},
                    {"$set": {
                        "estado": "finalizada",
                        "progresso": 100,
                        "dataFim": moment()
                        }}, {useFindAndModify: false}).lean().then(function(){
                        Obra.findOne({_id:tarefa.obra}).lean().then(function(obra){
                            Funcionario.find({tarefas:req.params.id}).then(function(funcionarios){
                                Tarefa.findOne({_id:req.params.id}).lean().then(function(tarefa){
                                    async function secondFunction(){
                                        var cost = obra.despesaFinal;
                                        var issueCost = 0;                                          
                                                            
                                        if(moment(tarefa.dataInicio).isValid() && moment(tarefa.dataFim).isValid()){
                                            var issueStartDateYear = moment(tarefa.dataInicio).format("YYYY");
                                            var issueFinishDateYear = moment(tarefa.dataFim).format("YYYY");
            
                                            var holidays = [];
                                            for(var i=issueStartDateYear; i <= issueFinishDateYear; i++){
                                                var yearHolidays = hd.getHolidays(i);
                                                for(var j=0; j<yearHolidays.length; j++){
                                                    holidays.push(moment(yearHolidays[j].date).format("YYYY-MM-DD"));
                                                }
                                            }
     
                                            momentBD.updateLocale('PT', {
                                                holidays: holidays,
                                                holidayFormat: 'YYYY-MM-DD',
                                                workingWeekdays: [1, 2, 3, 4, 5]
                                            });

                                            var days = momentBD(tarefa.dataFim).businessDiff(moment(tarefa.dataInicio));
                                            var alterou = false;

                                            if(days == 0){
                                                if(moment(tarefa.dataFim).format('HH') >= 14 && moment(tarefa.dataInicio).format('HH') <= 13){
                                                    tarefa.dataFim = moment(tarefa.dataFim).subtract(1, 'hours')
                                                    alterou = true;
                                                }        
                                            }
                                                            
                                            var daysAux = days;
                                            var hours = momentBD(tarefa.dataFim).diff(moment(tarefa.dataInicio), 'days', true) % 1;
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
                                                var dataPInicio = moment(tarefa.dataInicio).format("HH");
                                                var dataPFim = moment(tarefa.dataFim).format("HH");
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

                                            Tarefa.findOneAndUpdate({_id:req.params.id},
                                                {"$set": {
                                                    "despesaFinal": issueCost,
                                                    "custoFinal":issueCost + issueCost * (obra.percentagemLucro/100)
                                                }}, {useFindAndModify: false}).then()
            
           
                                                Tarefa.find({$and : [{obra:obra._id}, {estado: { $ne: "finalizada"}}]}).then(function(tarefas){
                                                    if(tarefas.length > 0){
                                                        Obra.findOneAndUpdate({_id:obra._id}, {"$set": {"despesaFinal": cost, "dataFim": tarefa.dataFim, 
                                                            "custoFinal" : cost + cost * (obra.percentagemLucro / 100)}}, {useFindAndModify: false}).lean().then(function(obra){
                                                            if(obra == null){  
                                                                req.flash("error_msg", "Obra não atualizada visto que não foi encontrada.")
                                                                res.redirect("/tarefa/"+req.params.id);
                                                            }
                                                            else{
                                                                req.flash("success_msg", "Tarefa terminada com sucesso")
                                                                res.redirect("/tarefa/"+req.params.id);
                                                            }
                                                                            
                                                        }).catch(function(error){
                                                            req.flash("error_msg", "Erro ao atualizar a obra.")
                                                            res.redirect("/tarefa/"+req.params.id);
                                                        })
                                                    }
                                                    else{
                                                        Tarefa.find({obra:obra._id}).then(function(tarefas){
                                                            Requisicao.find({$and : [{tarefa:tarefas}, {estado: { $ne: "finalizada"}}]}).then(function(requisicoes){
                                                                if(requisicoes.length > 0){
                                                                    Obra.findOneAndUpdate({_id:obra._id}, {"$set": {"despesaFinal": cost, "dataFim": tarefa.dataFim, 
                                                                        "custoFinal" : cost + cost * (obra.percentagemLucro / 100)}}, {useFindAndModify: false}).lean().then(function(obra){
                                                                        if(obra == null){  
                                                                            req.flash("error_msg", "Obra não atualizada visto que não foi encontrada.")
                                                                            res.redirect("/tarefa/"+req.params.id);
                                                                        }
                                                                        else{
                                                                            req.flash("success_msg", "Tarefa terminada com sucesso")
                                                                            res.redirect("/tarefa/"+req.params.id);
                                                                        }
                                                                                        
                                                                    }).catch(function(error){
                                                                        req.flash("error_msg", "Erro ao atualizar a obra.")
                                                                        res.redirect("/tarefa/"+req.params.id);
                                                                    })
                                                                }
                                                                else{
                                                                    Obra.findOneAndUpdate({_id:obra._id}, {"$set": {"despesaFinal": cost, "dataFim": tarefa.dataFim, 
                                                                        "estado": "finalizada", "custoFinal" : cost + cost * (obra.percentagemLucro / 100)}}, 
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
                                                            }).catch(function(error){
                                                                req.flash("error_msg", "Requisições não encontradas.")
                                                                res.redirect("/tarefa/"+req.params.id)
                                                            })
                                                        }).catch(function(error){
                                                            req.flash("error_msg", "Tarefas não encontradas.")
                                                            res.redirect("/tarefa/"+req.params.id);
                                                        })
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
                                }).catch(function(error){
                                    req.flash("error_msg", "Tarefa não encontrada.")
                                    res.redirect("/tarefas/")
                                })
                            }).catch(function(error){
                                req.flash("error_msg", "Funcionários não encontrados.")
                                res.redirect("/tarefa/"+req.params.id)
                            })                 
                        }).catch(function(error){
                            req.flash("error_msg", "Obra não encontrada.")
                            res.redirect("/tarefa/"+req.params.id);
                        })
                }).catch(function(error){
                    req.flash("error_msg", "Erro ao terminar a tarefa.")
                    res.redirect("/tarefa/"+req.params.id);
                })
            }
        }).catch(function(error){
            req.flash("error_msg", "Não tem permissões para terminar a tarefa.")
            res.redirect("/tarefa/"+req.params.id)
        })
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/tarefa/"+req.params.id)
    })
})

router.get('/tarefa/:id/requisitarMaquina', authenticated, function (req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Tarefa.findOne({ $and: [{_id:req.params.id}, {_id : funcionario.tarefas}]}).lean().then(function(tarefa){
            if(tarefa.estado != "associada" && tarefa.estado != "recusada"){
                req.flash("error_msg", "Não pode requisitar máquinas para esta tarefa. Verifique que a tarefa está em fase de orçamentação.")
                res.redirect("/tarefa/"+req.params.id)
            }
            else{
                Maquina.find().lean().then(function(maquinas){
                    var dataInicio = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DDTHH:mm")
                    if(moment(dataInicio).isBefore(moment())){
                        dataInicio = moment().format("YYYY-MM-DDTHH:mm")
                    }
                    res.render("users/requisicoes/novaRequisicao", {tarefa:tarefa, dataInicio:dataInicio, maquinas:maquinas})
                }).catch(function(error){
                    req.flash("error_msg", "Máquinas não encontradas.")
                    res.redirect("/tarefa/"+req.params.id)
                })
            }
        }).catch(function(error){
            req.flash("error_msg", "Não tem permissões para requisitar máquinas para esta tarefa.")
            res.redirect("/tarefas/")
        })
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/dashboard")
    })
})

router.post('/tarefa/:id/requisitarMaquina', authenticated, function asyncFunction (req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Tarefa.findOne({$and: [{_id:req.params.id}, {_id:funcionario.tarefas}]}).lean().then(function(tarefa){
            Maquina.find({}).lean().then(function(maquinas){
                var erros = new Object();
                var dataInicio;
                var dataFim;
                var maquina;
                var descricao;

                if(!req.body.descricao || typeof req.body.descricao == undefined || req.body.descricao == null){
                    erros.descricao = "Descrição inválida.";
                }
                else{
                    if(req.body.descricao.trim().length < 3){
                        erros.descricao = "Descrição com tamanho inválido. Mínimo de 5 caracteres, sendo que pode possuir apenas 2 espaços.";
                    }
                    else{
                        descricao = req.body.descricao;
                    }
                }

                if(!req.body.dataPrevistaInicio){
                    erros.dataInicio = "Datas obrigatórias. Preencha data prevista de início.";
                }
                else{
                    if(moment(req.body.dataPrevistaInicio).format("HH") >= 18 && moment(req.body.dataPrevistaInicio).format("mm") > 00)
                        erros.dataInicio = "Data invalida. A hora limite são 18:00h.";
                    else{
                        if(moment(req.body.dataPrevistaInicio).format("HH") < 9 && moment(req.body.dataPrevistaInicio).format("mm") <= 59)
                            erros.dataInicio = "Data invalida. A hora limite são 9:00h.";
                        else
                        dataInicio = req.body.dataPrevistaInicio;
                    }
                }

                if(!req.body.dataPrevistaFim){
                    erros.dataFinal = "Datas obrigatórias. Preencha data prevista de fim.";
                }
                else{
                    if(moment(req.body.dataPrevistaFim).format("HH") >= 18 && moment(req.body.dataPrevistaFim).format("mm") > 00)
                        erros.dataFinal = "Data invalida. A hora limite são 18:00h.";
                    else{
                        if(moment(req.body.dataPrevistaFim).format("HH") < 9 && moment(req.body.dataPrevistaFim).format("mm") <= 59)
                            erros.dataFinal = "Data invalida. A hora limite são 9:00h.";
                        else
                            dataFim = req.body.dataPrevistaFim;
                    }
                }

                if(Object.keys(erros).length != 0){
                    if(!dataInicio){
                        dataInicio = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DDTHH:mm")
                        if(moment(dataInicio).isBefore(moment()))
                            dataInicio = moment().format("YYYY-MM-DDTHH:mm")
                    }
                    maquina = JSON.stringify(req.body.maquinas);
                    res.render("users/requisicoes/novaRequisicao", {erros:erros, dataInicio:dataInicio, dataFim:dataFim, descricao:descricao, tarefa:tarefa, maquinas:maquinas, 
                        maquina:maquina})
                }
                else{
                    Obra.findOne({_id:tarefa.obra}).then(function(obra){
                        Maquina.findOne({nome:req.body.maquinas}).then(function(maquina){
                            Requisicao.find({maquina:maquina.id}).then(function(requisicoes){
                                var today = moment().format("YYYY-MM-DD HH:mm");
                                var dataPrevistaInicio = moment(req.body.dataPrevistaInicio).format("YYYY-MM-DD HH:mm")
                                var dataPrevistaFim = moment(req.body.dataPrevistaFim).format("YYYY-MM-DD HH:mm")
                                var dataTarefa = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DD HH:mm")
                                        
                                
                                dataPrevistaInicio = moment(dataPrevistaInicio).add(1, 'minutes');
                                dataPrevistaFim = moment(dataPrevistaFim).add(1, 'minutes');
            
                                if(moment(dataPrevistaInicio).isValid() && moment(dataPrevistaFim).isValid()){
                                    if(moment(dataTarefa).isAfter(dataPrevistaInicio) == true || moment(today).isAfter(dataPrevistaInicio) == true){
                                    
                                        dataInicio = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DDTHH:mm")
                                        if(moment(dataInicio).isBefore(moment()))
                                            dataInicio = moment().format("YYYY-MM-DDTHH:mm")
                                        
                                        erros.dataInicio = "Data inválida. Data de inicio tem que ser superior à data de inicio da tarefa e à data atual.";
                                        res.render("users/requisicoes/novaRequisicao", {erros:erros, dataInicio:dataInicio, dataFim:dataFim, descricao:descricao, tarefa:tarefa, maquinas:maquinas})
                                    }
                                    else{
                                        dataInicio = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DDTHH:mm")
                                        if(moment(dataInicio).isBefore(moment()))
                                            dataInicio = moment().format("YYYY-MM-DDTHH:mm")
    
                                        if(moment(dataPrevistaInicio).isAfter(dataPrevistaFim) == true){
                                            erros.dataFinal = "Data inválida. Data de fim tem que ser superior à data de inicio.";
                                            res.render("users/requisicoes/novaRequisicao", {erros:erros, dataInicio:dataInicio, dataFim:dataFim, descricao:descricao, tarefa:tarefa, maquinas:maquinas})    
                                        }
                                        else{
                                            var invalid = false;
                                            var elimina = false;
                                            var paraEliminar = [];
                                            var data = moment().add(7, 'days')
                                            for(var i=0; i<requisicoes.length; i++){
                                                if(moment(requisicoes[i].dataPrevistaInicio).isBetween(dataPrevistaInicio, dataPrevistaFim)){
                                                    if((obra.estado == "aAguardarResposta") && moment(data).isAfter(requisicoes[i].dataPrevistaInicio)){
                                                        elimina = true;
                                                    }
                                                    else{
                                                        invalid = true;
                                                        break;
                                                    }
                                                }
    
                                                if(moment(requisicoes[i].dataPrevistaFim).isBetween(dataPrevistaInicio, dataPrevistaFim)){
                                                    if((obra.estado == "aAguardarResposta") && moment(data).isAfter(requisicoes[i].dataPrevistaInicio)){
                                                        elimina = true;
                                                    }
                                                    else{
                                                        invalid = true;
                                                        break;
                                                    }
                                                }
                        
                                                if(moment(dataPrevistaInicio).isBefore(requisicoes[i].dataPrevistaInicio) && moment(dataPrevistaFim).isAfter(requisicoes[i].dataPrevistaFim)){
                                                    if((obra.estado == "aAguardarResposta") && moment(data).isAfter(requisicoes[i].dataPrevistaInicio)){
                                                        elimina = true;
                                                    }
                                                    else{
                                                        invalid = true;
                                                        break;
                                                    }
                                                }
    
                                                if(moment(dataPrevistaInicio).isAfter(requisicoes[i].dataPrevistaInicio) && moment(dataPrevistaFim).isBefore(requisicoes[i].dataPrevistaFim)){
                                                    if((obra.estado == "aAguardarResposta") && moment(data).isAfter(requisicoes[i].dataPrevistaInicio)){
                                                        elimina = true;
                                                    }
                                                    else{
                                                        invalid = true;
                                                        break;
                                                    }
                                                }
        
                                                if(elimina){
                                                    paraEliminar.push(requisicoes[i]);
                                                    elimina = false;
                                                }
                                            }
                                                    
                                            if(invalid){
                                                erros.dataInicio = "Já existe uma requisição para esta máquina durante a duração pretendida. Consulte as requisições para obter uma duração desocupada (Requisições - Vista calendário).";
                                                res.render("users/requisicoes/novaRequisicao", {erros:erros, dataInicio:dataInicio, dataFim:dataFim, 
                                                    descricao:descricao, tarefa:tarefa, maquinas:maquinas})
                                    
                                            }
                                            else{
                                                var transporter = nodemailer.createTransport({
                                                    service: 'gmail',
                                                    auth: {
                                                        user: 'webappisec@gmail.com',
                                                        pass: 'mickaelsantos'
                                                    }
                                                });
        
                                                async function enviaMails(){
                                                    for(var i=0; i<paraEliminar.length; i++){
                                                        await Funcionario.findOne({_id:paraEliminar[i].funcionario}).then(function(funcionario){
                                                            var mailOptions = {
                                                                from: '"WebApp" webappisec@gmail.com',
                                                                to: funcionario.email,
                                                                subject: 'Cancelamento de requisição.',
                                                                text: 'A sua requisição da máquina ' + maquina.nome + ' para o dia ' + 
                                                                    moment(paraEliminar[i].dataPrevistaInicio).format("DD/MM/YYYY HH:mm") + ' ao dia ' + 
                                                                    moment(paraEliminar[i].dataPrevistaFim).format("DD/MM/YYYY HH:mm") + ' acabou de ser cancelada, visto que faltam menos de 7 dias e a obra ainda não foi aceite por parte do cliente.'
                                                                };
                                                                      
                                                                transporter.sendMail(mailOptions, function(error, info){
                                                                    if (error)
                                                                        console.log(error)
                                                                });
                                                            Requisicao.deleteOne({_id:paraEliminar[i].id}).then()
                                                        })
                                                    }
            
                                                    var novaRequisicao = {
                                                        maquina: maquina._id,
                                                        funcionario : funcionario._id,
                                                        tarefa: tarefa._id,
                                                        descricao:descricao,
                                                        dataPrevistaFim: req.body.dataPrevistaFim,
                                                        dataPrevistaInicio: req.body.dataPrevistaInicio
                                                    }
                                                    new Requisicao(novaRequisicao).save().then();
            
                                                    req.flash("success_msg", "Requisição concluída com sucesso.")
                                                    res.redirect("/tarefa/"+req.params.id);
                                                }
                                                enviaMails();
                                            }
                                        }
                                    }
                                }
                                else{
                                    erros.dataInicio = "Datas inválidas. Preencha corretamente data prevista de início e data prevista de fim.";
                                    res.render("users/requisicoes/novaRequisicao", {erros:erros, tarefa:tarefa, maquinas:maquinas})
                                } 
                            }).catch(function(error){
                                req.flash("error_msg", "Tarefas não encontradas.")
                                res.redirect("/tarefa/"+req.params.id)
                            })
                        }).catch(function(error){
                            req.flash("error_msg", "Máquina não encontrada.")
                            res.redirect("/tarefa/"+req.params.id)
                        })
                    }).catch(function(error){
                        req.flash("error_msg", "Obra não encontrada.")
                        res.redirect("/tarefa/"+req.params.id)
                    })
                }
            }).catch(function(error){
                req.flash("error_msg", "Máquinas não encontradas.")
                res.redirect("/tarefa/"+req.params.id)
            })
        }).catch(function(error){
            req.flash("error_msg", "Não tem permissões para requisitar máquinas nesta tarefa.")
            res.redirect("/tarefas")
        })
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/dashboard")
    })
})

router.get('/perfil', authenticated, function(req, res){
    Funcionario.findOne({ _id: req.user.id}).lean().then(function(funcionario){
        res.render("users/perfil/perfil", {funcionario:funcionario})
    }).catch(function(erro){
        req.flash("error_msg", "Erro ao fazer o GET do funcionário.")
        res.redirect("/dashboard");
    })
})

router.get('/perfil/edit', authenticated, function(req, res){
    Funcionario.findOne({ _id: req.user.id}).lean().then(function(funcionario){
        res.render("users/perfil/editarPerfil", {funcionario:funcionario})
    }).catch(function(erro){
        req.flash("error_msg", "Erro ao fazer o GET do funcionário.")
        res.redirect("/dashboard");
    })
})

router.post('/perfil/edit', upload.single("file"), authenticated, function asyncFunction(req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function (funcionario){
        var erros = new Object();

        if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
            erros.nome = "Nome inválido.";
        }else{
            if(req.body.nome.trim().length < 2){
                erros.nome = "Nome com tamanho inválido. Mínimo de 3 caracteres.";
            }
            else{
                if(req.body.nome.length > 50){
                    erros.nome = "Nome demasiado longo. São permitidos apenas 50 caracteres.";
                }
                else{
                    funcionario.nome = req.body.nome;
                }
            }
        }
    
        if(!req.body.email || typeof req.body.email == undefined || req.body.email == null){
            erros.email = "Email inválido.";
        }else{
            funcionario.email = req.body.email;
        }
        
    
        if(req.body.password){
            if(req.body.password.length < 5){
                erros.password = "Password curta. Mínimo 5 caracteres.";
            }
                
            if(!req.body.password2 || typeof req.body.password2 === undefined || req.body.password2 === null){
                erros.password2 = "Uma vez que pretende alterar a palavra-pass, a confirmação é obrigatório.";
            }
            else{
                if(req.body.password != req.body.password2){
                    erros.password = "As passwords não correspondem.";
                }
            }         
        }
    
        
        if(Object.keys(erros).length != 0){
            Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
                res.render("users/perfil/editarPerfil", {erros:erros, funcionario:funcionario})
            }).catch(function(error){
                req.flash("error_msg", "Erro ao fazer o GET do funcionário.")
                res.redirect("/perfil");
            })
        }
        else{
            Funcionario.findOneAndUpdate({_id:req.user.id},
                {"$set": {
                    "nome": req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                    "email": req.body.email
                    }}, {useFindAndModify: false}).lean().then(function(funcionario){
                    if(req.body.password){
                        funcionario.password = req.body.password;
                        bcrypt.genSalt(10, function(erro, salt){
                             bcrypt.hash(funcionario.password, salt, function(erro, hash){
                                if(erro){
                                    req.flash("error_msg", "Erro ao alterar a palavra passe.")
                                    res.redirect("/perfil/edit");
                                }
                                
                                var password = hash
                                Funcionario.updateOne(
                                    {"_id":funcionario._id},
                                    {$set: {password : password}},
                                    ).catch(function(erro){
                                        req.flash("error_msg", "Erro ao atualizar o perfil.")
                                        res.redirect('/obras/');
                                    });
                            })
                        })
                    }

                    if(req.file){
                        const tempPath = req.file.path;

                        fs.rename(tempPath, targetPath+"/"+req.user.id + path.extname(req.file.originalname).toLowerCase(), function(err) {
                            if (err) 
                            console.log(err)
                            Funcionario.findOneAndUpdate({_id:req.user.id}, 
                                {"$set": {"foto":  "/img/"+req.user.id+path.extname(req.file.originalname).toLowerCase()}}, 
                                {useFindAndModify: false}).then()
                        });
                    }
                            
                    req.flash("success_msg", "Perfil editado com sucesso.")
                    res.redirect("/perfil");
            }).catch(function(error){
                req.flash("error_msg", "Já existe um cliente com este email.")
                res.redirect("/perfil/edit");
            })
        }
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/dashboard")
    })
})

router.get('/requisicoes', authenticated, function(req, res){
    Requisicao.find({}).lean().then(function(requisicoes){
        var reques = [];
        async function obtemDados(){
            for(var i=0; i<requisicoes.length; i++){
                reques.push(requisicoes[i]);
                Tarefa.findOne({_id:requisicoes[i].tarefa}).then(function(tarefa){
                    reques[i].tarefaNome = tarefa.nome;
                })
                Funcionario.findOne({_id:requisicoes[i].funcionario}).then(function (funcionario){
                    reques[i].funcionarioNome = funcionario.nome;
                })
                await Maquina.findOne({_id:requisicoes[i].maquina}).then(function(maquina){
                    reques[i].maquinaNome = maquina.nome;
                })
            }
            var requisicoesS = JSON.stringify(reques);
            res.render("users/requisicoes/requisicoes", {requisicoes:reques, requisicoesS:requisicoesS})
        }
        obtemDados();
    }).catch(function(error){
        req.flash("error_msg", "Requisições não encontradas.")
        res.redirect('/dashboard')
    })
})

router.get('/requisicoes/addRequisicao', authenticated, function (req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Tarefa.find({ $and: [{_id : funcionario.tarefas}, {$or: [{estado: "associada"}, {estado: "recusada"}]}]}).lean().then(function(tarefas){
            Maquina.find().lean().then(function(maquinas){
                res.render("users/requisicoes/novaRequisicaoSemTarefa", {tarefas:tarefas, maquinas:maquinas})
            }).catch(function(error){
                req.flash("error_msg", "Máquinas não encontradas.")
                res.redirect("/requisicoes")
            })
        }).catch(function(error){
            req.flash("error_msg", "Tarefas não encontradas")
            res.redirect("/requisicoes")
        })
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/dashboard")
    })
})

router.post('/requisicoes/addRequisicao', authenticated, function asyncFunction (req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Tarefa.findOne({$and: [{nome:req.body.tarefas}, {_id:funcionario.tarefas}]}).lean().then(function(tarefa){
            Tarefa.find({ $and: [{_id : funcionario.tarefas}, {$or: [{estado: "associada"}, {estado: "recusada"}]}]}).lean().then(function(tarefas){
                Maquina.find({}).lean().then(function(maquinas){
                    var erros = new Object();
                    var dataInicio;
                    var dataFim;
                    var maquina;
                    var descricao;
    
                    if(!req.body.descricao || typeof req.body.descricao == undefined || req.body.descricao == null){
                        erros.descricao = "Descrição inválida.";
                    }
                    else{
                        if(req.body.descricao.trim().length < 3){
                            erros.descricao = "Descrição com tamanho inválido. Mínimo de 5 caracteres, sendo que pode possuir apenas 2 espaços.";
                        }
                        else{
                            descricao = req.body.descricao;
                        }
                    }
    
                    if(!req.body.dataPrevistaInicio){
                        erros.dataInicio = "Datas obrigatórias. Preencha data prevista de início.";
                    }
                    else{
                        if(moment(req.body.dataPrevistaInicio).format("HH") >= 18 && moment(req.body.dataPrevistaInicio).format("mm") > 00)
                            erros.dataInicio = "Data invalida. A hora limite são 18:00h.";
                        else{
                            if(moment(req.body.dataPrevistaInicio).format("HH") < 9 && moment(req.body.dataPrevistaInicio).format("mm") <= 59)
                                erros.dataInicio = "Data invalida. A hora limite são 9:00h.";
                            else
                            dataInicio = req.body.dataPrevistaInicio;
                        }
                    }
    
                    if(!req.body.dataPrevistaFim){
                        erros.dataFinal = "Datas obrigatórias. Preencha data prevista de fim.";
                    }
                    else{
                        if(moment(req.body.dataPrevistaInicio).format("HH") >= 18 && moment(req.body.dataPrevistaInicio).format("mm") > 00)
                            erros.dataInicio = "Data invalida. A hora limite são 18:00h.";
                        else{
                            if(moment(req.body.dataPrevistaInicio).format("HH") < 9 && moment(req.body.dataPrevistaInicio).format("mm") <= 59)
                                erros.dataInicio = "Data invalida. A hora limite são 9:00h.";
                            else
                                dataFim = req.body.dataPrevistaFim;
                        }
                    }
    
                    if(Object.keys(erros).length != 0){
                        if(!dataInicio){
                            dataInicio = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DDTHH:mm")
                            if(moment(dataInicio).isBefore(moment()))
                                dataInicio = moment().format("YYYY-MM-DDTHH:mm")
                        }
                        maquina = JSON.stringify(req.body.maquinas);
                        tarefa = JSON.stringify(req.body.tarefas);
                        res.render("users/requisicoes/novaRequisicaoSemTarefa", {erros:erros, dataInicio:dataInicio, dataFim:dataFim, descricao:descricao, tarefa:tarefa, tarefas:tarefas,
                            maquinas:maquinas, maquina:maquina})
                    }
                    else{
                        Maquina.findOne({nome:req.body.maquinas}).then(function(maquina){
                            Tarefa.findOne({nome:req.body.tarefas}).then(function(tarefa){
                                Obra.findOne({_id:tarefa.obra}).then(function(obra){
                                    Requisicao.find({maquina:maquina.id}).then(function(requisicoes){
                                        var today = moment().format("YYYY-MM-DD HH:mm");
                                        var dataPrevistaInicio = moment(req.body.dataPrevistaInicio).format("YYYY-MM-DD HH:mm")
                                        var dataPrevistaFim = moment(req.body.dataPrevistaFim).format("YYYY-MM-DD HH:mm")
                                        var dataTarefa = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DD HH:mm")
                                                
                                        
                                        dataPrevistaInicio = moment(dataPrevistaInicio).add(1, 'minutes');
                                        dataPrevistaFim = moment(dataPrevistaFim).add(1, 'minutes');
                    
                                        if(moment(dataPrevistaInicio).isValid() && moment(dataPrevistaFim).isValid()){
                                            if(moment(dataTarefa).isAfter(dataPrevistaInicio) == true || moment(today).isAfter(dataPrevistaInicio) == true){
                                            
                                                dataInicio = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DDTHH:mm")
                                                if(moment(dataInicio).isBefore(moment()))
                                                    dataInicio = moment().format("YYYY-MM-DDTHH:mm")
                                                
                                                erros.dataInicio = "Data inválida. Data de inicio tem que ser superior à data de inicio da tarefa e à data atual.";
                                                res.render("users/requisicoes/novaRequisicaoSemTarefa", {erros:erros, dataInicio:dataInicio, dataFim:dataFim, descricao:descricao, tarefa:tarefa, tarefas:tarefas,
                                                    maquinas:maquinas, maquina:maquina})    
                                            }
                                            else{
                                                dataInicio = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DDTHH:mm")
                                                if(moment(dataInicio).isBefore(moment()))
                                                    dataInicio = moment().format("YYYY-MM-DDTHH:mm")
            
                                                if(moment(dataPrevistaInicio).isAfter(dataPrevistaFim) == true){
                                                    erros.dataFinal = "Data inválida. Data de fim tem que ser superior à data de inicio.";
                                                    res.render("users/requisicoes/novaRequisicaoSemTarefa", {erros:erros, dataInicio:dataInicio, dataFim:dataFim, descricao:descricao, tarefa:tarefa, tarefas:tarefas,
                                                        maquinas:maquinas, maquina:maquina})    
                                                }
                                                else{
                                                    var invalid = false;
                                                    var elimina = false;
                                                    var paraEliminar = [];
                                                    var data = moment().add(7, 'days')
                                                    for(var i=0; i<requisicoes.length; i++){
                                                        if(moment(requisicoes[i].dataPrevistaInicio).isBetween(dataPrevistaInicio, dataPrevistaFim)){
                                                            if((obra.estado == "aAguardarResposta") && moment(data).isAfter(requisicoes[i].dataPrevistaInicio)){
                                                                elimina = true;
                                                            }
                                                            else{
                                                                invalid = true;
                                                                break;
                                                            }
                                                        }
            
                                                        if(moment(requisicoes[i].dataPrevistaFim).isBetween(dataPrevistaInicio, dataPrevistaFim)){
                                                            if((obra.estado == "aAguardarResposta") && moment(data).isAfter(requisicoes[i].dataPrevistaInicio)){
                                                                elimina = true;
                                                            }
                                                            else{
                                                                invalid = true;
                                                                break;
                                                            }
                                                        }
                                
                                                        if(moment(dataPrevistaInicio).isBefore(requisicoes[i].dataPrevistaInicio) && moment(dataPrevistaFim).isAfter(requisicoes[i].dataPrevistaFim)){
                                                            if((obra.estado == "aAguardarResposta") && moment(data).isAfter(requisicoes[i].dataPrevistaInicio)){
                                                                elimina = true;
                                                            }
                                                            else{
                                                                invalid = true;
                                                                break;
                                                            }
                                                        }
            
                                                        if(moment(dataPrevistaInicio).isAfter(requisicoes[i].dataPrevistaInicio) && moment(dataPrevistaFim).isBefore(requisicoes[i].dataPrevistaFim)){
                                                            if((obra.estado == "aAguardarResposta") && moment(data).isAfter(requisicoes[i].dataPrevistaInicio)){
                                                                elimina = true;
                                                            }
                                                            else{
                                                                invalid = true;
                                                                break;
                                                            }
                                                        }
                
                                                        if(elimina){
                                                            paraEliminar.push(requisicoes[i]);
                                                            elimina = false;
                                                        }
                                                    }
                                                            
                                                    if(invalid){
                                                        erros.dataInicio = "Já existe uma requisição para esta máquina durante a duração pretendida. Consulte as requisições para obter uma duração desocupada (Requisições - Vista calendário).";
                                                        res.render("users/requisicoes/novaRequisicaoSemTarefa", {erros:erros, dataInicio:dataInicio, dataFim:dataFim, descricao:descricao, tarefa:tarefa, tarefas:tarefas,
                                                            maquinas:maquinas, maquina:maquina})
                                                    }
                                                    else{
                                                        var transporter = nodemailer.createTransport({
                                                            service: 'gmail',
                                                            auth: {
                                                                user: 'webappisec@gmail.com',
                                                                pass: 'mickaelsantos'
                                                            }
                                                        });
                
                                                        async function enviaMails(){
                                                            for(var i=0; i<paraEliminar.length; i++){
                                                                await Funcionario.findOne({_id:paraEliminar[i].funcionario}).then(function(funcionario){
                                                                    var mailOptions = {
                                                                        from: '"WebApp" webappisec@gmail.com',
                                                                        to: funcionario.email,
                                                                        subject: 'Cancelamento de requisição.',
                                                                        text: 'A sua requisição da máquina ' + maquina.nome + ' para o dia ' + 
                                                                            moment(paraEliminar[i].dataPrevistaInicio).format("DD/MM/YYYY HH:mm") + ' ao dia ' + 
                                                                            moment(paraEliminar[i].dataPrevistaFim).format("DD/MM/YYYY HH:mm") + ' acabou de ser cancelada, visto que faltam menos de 7 dias e a obra ainda não foi aceite por parte do cliente.'
                                                                        };
                                                                              
                                                                        transporter.sendMail(mailOptions, function(error, info){
                                                                            if (error)
                                                                            console.log(error)
                                                                        });
                                                                    Requisicao.deleteOne({_id:paraEliminar[i].id}).then()
                                                                })
                                                            }
                    
                                                            var novaRequisicao = {
                                                                maquina: maquina._id,
                                                                funcionario : funcionario._id,
                                                                tarefa: tarefa._id,
                                                                descricao:descricao,
                                                                dataPrevistaFim: req.body.dataPrevistaFim,
                                                                dataPrevistaInicio: req.body.dataPrevistaInicio
                                                            }
                                                            new Requisicao(novaRequisicao).save().then();
                    
                                                            req.flash("success_msg", "Requisição concluída com sucesso.")
                                                            res.redirect("/requisicoes");
                                                        }
                                                        enviaMails();
                                                    }
                                                }
                                            }
                                        }
                                        else{
                                            erros.dataInicio = "Datas inválidas. Preencha corretamente data prevista de início e data prevista de fim.";
                                            res.render("users/requisicoes/novaRequisicao", {erros:erros, tarefa:tarefa, maquinas:maquinas})
                                        } 
                                    }).catch(function(error){
                                        req.flash("error_msg", "Requisições não encontradas.")
                                        res.redirect("/requisicoes")
                                    })
                                }).catch(function(error){
                                    req.flash("error_msg", "Obra não encontrada.")
                                    res.redirect("/requisicoes")
                                })
                            }).catch(function(error){
                                req.flash("error_msg", "Tarefas não encontradas.")
                                res.redirect("/requisicoes")
                            })
                        }).catch(function(error){
                            req.flash("error_msg", "Máquina não encontrada.")
                            res.redirect("/requisicoes")
                        })
                    }
                }).catch(function(error){
                    req.flash("error_msg", "Máquinas não encontradas.")
                    res.redirect("/requisicoes")
                })
                
            }).catch(function(error){
                req.flash("error_msg", "Tarefas não encontradas")
                res.redirect("/requisicoes")
            })
        }).catch(function(error){
            req.flash("error_msg", "Não tem permissões para requisitar máquinas nesta tarefa.")
            res.redirect("/requisicoes")
        })
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/dashboard")
    })
})

router.get('/requisicao/:id', authenticated, function(req, res){
    Requisicao.findOne({_id:req.params.id}).lean().then(function(requisicao){
        Funcionario.findOne({_id:requisicao.funcionario}).lean().then(function(funcionario){
            Tarefa.findOne({_id:requisicao.tarefa}).lean().then(function(tarefa){
                Obra.findOne({_id:tarefa.obra}).lean().then(function(obra){
                    Maquina.findOne({_id:requisicao.maquina}).lean().then(function(maquina){
                        res.render("users/requisicoes/requisicaoDetails", {requisicao:requisicao, obra:obra, tarefa:tarefa, funcionario:funcionario, maquina:maquina})
                    }).catch(function (error){
                        req.flash("error_msg", "Máquina não encontrada.")
                        res.redirect("/requisicoes")
                    })
                }).catch(function(error){
                    req.flash("error_msg", "Obra não encontrada.")
                    res.redirect("/requisicoes")
                })
            }).catch(function (error){
                req.flash("error_msg", "Tarefa não encontrada.")
                res.redirect("/requisicoes")
            })
        }).catch(function (error){
            req.flash("error_msg", "Funcionário não encontrado.")
            res.redirect("/requisicoes")
        })
    }).catch(function (error){
        req.flash("error_msg", "Requisição não encontrado.")
        res.redirect("/requisicoes")
    })
})

router.get('/requisicao/:id', authenticated, function(req, res){
    Requisicao.findOne({_id:req.params.id}).lean().then(function(requisicao){
        Funcionario.findOne({_id:requisicao.funcionario}).lean().then(function(funcionario){
            Tarefa.findOne({_id:requisicao.tarefa}).lean().then(function(tarefa){
                Maquina.findOne({_id:requisicao.maquina}).lean().then(function(maquina){
                    res.render("users/requisicoes/requisicaoDetails", {requisicao:requisicao, tarefa:tarefa, funcionario:funcionario, maquina:maquina})
                }).catch(function (error){
                    req.flash("error_msg", "Máquina não encontrada.")
                    res.redirect("/requisicoes")
                })
            }).catch(function (error){
                req.flash("error_msg", "Tarefa não encontrada.")
                res.redirect("/requisicoes")
            })
        }).catch(function (error){
            req.flash("error_msg", "Funcionário não encontrado.")
            res.redirect("/requisicoes")
        })
    }).catch(function (error){
        req.flash("error_msg", "Requisição não encontrado.")
        res.redirect("/requisicoes")
    })
})

router.get('/requisicao/:id/comecar', authenticated, function asyncFunction(req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Requisicao.findOne({ $and: [{_id:req.params.id}, {funcionario : funcionario._id}]}).lean().then(function(requisicao){
            Tarefa.findOne({_id:requisicao.tarefa}).lean().then(function(tarefa){
                if(tarefa.estado != "aceite" && tarefa.estado != "emExecucao"){
                    req.flash("error_msg", "Não pode começar a utilizar a máquina. Verifique que a tarefa está aceite, em execução ou finalizada.")
                    res.redirect("/requisicao/"+req.params.id)
                }
                else{
                    Requisicao.findOneAndUpdate({_id:req.params.id},
                        {"$set": {
                            "estado": "emExecucao",
                            "dataInicio": moment()
                            }}, {useFindAndModify: false}).lean().then(function(){
                            Obra.findOne({_id:tarefa.obra}).lean().then(function(obra){
                                if(obra.estado != "producao"){
                                    Obra.updateOne(
                                        {"_id":tarefa.obra},
                                        {$set: {estado : "producao", dataInicio: moment()}}).then()
                                }
                                req.flash("success_msg", "Utilização da máquina iniciada com sucesso.")
                                res.redirect("/requisicao/"+req.params.id);
                            })
                    }).catch(function(error){
                        req.flash("error_msg", "Erro ao iniciar a utilização da máquina.")
                        res.redirect("/requisicao/"+req.params.id);
                    })
                }
            }).catch(function(error){
                req.flash("error_msg", "Tarefa não encontrada.")
                res.redirect("/requisicao/"+req.params.id)
            })
        }).catch(function(error){
            req.flash("error_msg", "Não tem permissões para começar a utilização da máquina.")
            res.redirect("/requisicao/"+req.params.id);
        })
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/tarefa/"+req.params.id)
    })
})

router.get('/requisicao/:id/terminar', authenticated, function asyncFunction(req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Requisicao.findOne({ $and: [{_id:req.params.id}, {funcionario : funcionario._id}]}).lean().then(function(requisicao){
            if(requisicao.estado != "emExecucao"){
                req.flash("error_msg", "Não pode terminar a utilização desta máquina. Verifique que a utilização está em execução.")
                res.redirect("/requisicao/"+req.params.id)
            }
            else{
                Requisicao.findOneAndUpdate({_id:req.params.id},
                    {"$set": {
                    "estado": "finalizada",
                    "dataFim": moment()
                    }}, {useFindAndModify: false}).lean().then(function(){
                        Requisicao.findOne({_id:req.params.id}).lean().then(function(requisicao){
                            Maquina.findOne({_id:requisicao.maquina}).lean().then(function(maquina){
                                Tarefa.findOne({_id:requisicao.tarefa}).lean().then(function(tarefa){
                                    Obra.findOne({_id:tarefa.obra}).lean().then(function(obra){
                                        async function secondFunction(){
                                            var cost = obra.despesaFinal;
                                            var requestCost = 0;                                          
                                                                
                                            if(moment(requisicao.dataInicio).isValid() && moment(requisicao.dataFim).isValid()){
                                                var requestStartDateYear = moment(requisicao.dataInicio).format("YYYY");
                                                var requestFinishDateYear = moment(requisicao.dataFim).format("YYYY");
                
                                                var holidays = [];
                                                for(var i=requestStartDateYear; i <= requestFinishDateYear; i++){
                                                    var yearHolidays = hd.getHolidays(i);
                                                    for(var j=0; j<yearHolidays.length; j++){
                                                        holidays.push(moment(yearHolidays[j].date).format("YYYY-MM-DD"));
                                                    }
                                                }
         
                                                momentBD.updateLocale('PT', {
                                                    holidays: holidays,
                                                    holidayFormat: 'YYYY-MM-DD',
                                                    workingWeekdays: [1, 2, 3, 4, 5]
                                                });
                                                                
                                                var days = momentBD(requisicao.dataFim).businessDiff(moment(requisicao.dataInicio));
                                                var daysAux = days;
                                                var hours = momentBD(requisicao.dataFim).diff(moment(requisicao.dataInicio), 'days', true) % 1;
                                                if(hours != 0 && days != 0){
                                                    days = days - 1;
                                                }
                                                days = days + hours;
                                                if(daysAux == 0){
                                                    cost = cost + ((days * 24) * maquina.custo);
                                                    requestCost = requestCost + ((days * 24) * maquina.custo)
                                                }
                                                else{
                                                    cost = cost + ((days * 24 - (daysAux * 16)) * maquina.custo);
                                                    requestCost = requestCost + ((days * 24 - (daysAux * 16)) * maquina.custo);
                                                }

                                                if(cost < 0){
                                                    cost = 0.01;
                                                }

                                                if(requestCost < 0){
                                                    requestCost = 0.01;
                                                }
                
    
                                                Requisicao.findOneAndUpdate({_id:req.params.id},
                                                    {"$set": {
                                                        "despesaFinal": requestCost,
                                                        "custoFinal": requestCost + requestCost * (obra.percentagemLucro/100)
                                                    }}, {useFindAndModify: false}).then()
                
               
                                                Tarefa.find({$and : [{obra:obra._id}, {estado: { $ne: "finalizada"}}]}).then(function(tarefas){
                                                    if(tarefas.length > 0){
                                                        Obra.findOneAndUpdate({_id:obra._id}, {"$set": {"despesaFinal": cost, "dataFim": requisicao.dataFim, 
                                                            "custoFinal" : cost + cost * (obra.percentagemLucro / 100)}}, 
                                                                {useFindAndModify: false}).lean().then(function(obra){
                                                                if(obra == null){  
                                                                    req.flash("error_msg", "Obra não atualizada visto que não foi encontrada.")
                                                                    res.redirect("/requisicao/"+req.params.id);
                                                                }
                                                                else{
                                                                    req.flash("success_msg", "Utilização terminada com sucesso.")
                                                                    res.redirect("/requisicao/"+req.params.id);
                                                                }
                                                        }).catch(function(error){
                                                            req.flash("error_msg", "Erro ao atualizar a obra.")
                                                            res.redirect("/requisicao/"+req.params.id);
                                                        })
                                                    }
                                                    else{
                                                        Tarefa.find({obra:obra._id}).then(function(tarefas){
                                                            Requisicao.find({$and : [{tarefa:tarefas}, {estado: { $ne: "finalizada"}}]}).then(function(requisicoes){
                                                                if(requisicoes.length > 0){
                                                                    Obra.findOneAndUpdate({_id:obra._id}, {"$set": {"despesaFinal": cost, "dataFim": requisicao.dataFim, 
                                                                        "custoFinal" : cost + cost * (obra.percentagemLucro / 100)}}, {useFindAndModify: false}).lean().then(function(obra){
                                                                        if(obra == null){  
                                                                            req.flash("error_msg", "Obra não atualizada visto que não foi encontrada.")
                                                                            res.redirect("/requisicao/"+req.params.id);
                                                                        }
                                                                        else{
                                                                            req.flash("success_msg", "Tarefa terminada com sucesso")
                                                                            res.redirect("/requisicao/"+req.params.id);
                                                                        }
                                                                                        
                                                                    }).catch(function(error){
                                                                        req.flash("error_msg", "Erro ao atualizar a obra.")
                                                                        res.redirect("/requisicao/"+req.params.id);
                                                                    })
                                                                }
                                                                else{
                                                                    Obra.findOneAndUpdate({_id:obra._id}, {"$set": {"despesaFinal": cost, "dataFim": requisicao.dataFim, 
                                                                        "estado": "finalizada", "custoFinal" : cost + cost * (obra.percentagemLucro / 100)}}, 
                                                                        {useFindAndModify: false}).lean().then(function(obra){
                                                                            
                                                                        if(obra == null){  
                                                                            req.flash("error_msg", "Obra não atualizada visto que não foi encontrada.")
                                                                            res.redirect("/requisicao/"+req.params.id);
                                                                        }
                                                                        else{
                                                                            req.flash("success_msg", "Tarefa validada com sucesso")
                                                                            res.redirect("/requisicao/"+req.params.id);
                                                                        }
                                                                    }).catch(function(error){
                                                                        req.flash("error_msg", "Erro ao atualizar a obra.")
                                                                        res.redirect("/requisicao/"+req.params.id);
                                                                    })
                                                                }
                                                            }).catch(function(error){
                                                                req.flash("error_msg", "Requisições não encontradas.")
                                                                res.redirect("/requisicao/"+req.params.id)
                                                            })
                                                        }).catch(function(error){
                                                            req.flash("error_msg", "Tarefas não encontradas.")
                                                            res.redirect("/requisicao/"+req.params.id);
                                                        })
                                                    }
                                                }).catch(function(error){
                                                    req.flash("error_msg", "Tarefas não encontradas.")
                                                    res.redirect("/requisicao/"+req.params.id)
                                                })
                                            }
                                        };
                                        secondFunction()
                                    }).catch(function(error){
                                        req.flash("error_msg", "Máquina não encontrada.")
                                        res.redirect("/requisicao/"+req.params.id)
                                    })
                                }).catch(function(error){
                                    req.flash("error_msg", "Tarefa não encontrada.")
                                    res.redirect("/requisicao/"+req.params.id)
                                })
                                
                                            
                            }).catch(function(error){
                                req.flash("error_msg", "Tarefa não encontrada.")
                                res.redirect("/requisicao/"+req.params.id)
                            })
                        }).catch(function(error){
                            req.flash("error_msg", "Requisição não encontrada.")
                            res.redirect("/requisicoes");
                        })
                }).catch(function(error){
                    req.flash("error_msg", "Requisição não encontrada.")
                    res.redirect("/requisicao/"+req.params.id)
                })
            }
        }).catch(function(error){
            req.flash("error_msg", "Não tem permissões para terminar a utilização.")
            res.redirect("/requisicao/"+req.params.id)
        })
    }).catch(function(error){
        req.flash("error_msg", "Funcionário não encontrado.")
        res.redirect("/requisicao/"+req.params.id)
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

module.exports = router