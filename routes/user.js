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
const formidable = require('formidable');


//models
    require("../models/Obra")
    require("../models/Tarefa")
    require("../models/Funcionario")
    require("../models/Requisicao")
    require("../models/Maquina")
    const Obra = mongoose.model("obras")
    const Tarefa = mongoose.model("tarefas")
    const Funcionario = mongoose.model("funcionarios")
    const Requisicao = mongoose.model("requisicoes")
    const Maquina = mongoose.model("maquinas")


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

router.get('/registo', function(req, res){
    res.render("users/registo")
})

router.post('/registo', function asyncFunction(req, res){
    var erros = []
    var nomeF;
    var funcao;
    var departamento;
    var equipa;

    if(!req.body.nome || typeof req.body.nome === undefined || req.body.nome === null){
        erros.push({texto: "Nome obrigatório."})
    }
    else{
        nomeF = req.body.nome;
    }

    if(!req.body.funcao || typeof req.body.funcao === undefined || req.body.funcao === null){
        erros.push({texto: "Função na empresa obrigatório."})
    }
    else{
        funcao = req.body.funcao;
    }
    
    if(!req.body.departamento || typeof req.body.departamento === undefined || req.body.departamento === null){
        erros.push({texto: "Departamento obrigatório."})
    }
    else{
        departamento = req.body.departamento;
    }
    
    if(!req.body.equipa || typeof req.body.equipa === undefined || req.body.equipa === null){
        erros.push({texto: "Equipa obrigatório."})
    }
    else{
        equipa = req.body.equipa;
    }

    if(!req.body.password || typeof req.body.password === undefined || req.body.password === null){
        erros.push({texto: "Password obrigatório."})
    }
    else{
        if(req.body.password.length < 5){
            erros.push({texto: "Password curta. Mínimo 5 caracteres."})
        }
        
        if(!req.body.password2 || typeof req.body.password2 === undefined || req.body.password2 === null){
            erros.push({texto: "Confirmação obrigatório."})
        }
        else{
            if(req.body.password != req.body.password2){
                erros.push({texto: "As passwords não correspondem."})
            }
        }        
    } 

    var email = req.body.email;
    if(erros.length > 0){
        res.render("users/registo", {erros: erros, nomeF:nomeF, funcao:funcao, equipa:equipa, departamento:departamento, email:email})
    }
    else{
        Funcionario.findOne({email:req.body.email}).then(function(funcionario){
            if(funcionario){
                erros.push({texto: "Já existe uma conta com este email."})
                res.render("users/registo", {erros: erros})
            }
            else{
                const novoFunc = new Funcionario({
                    nome: req.body.nome,
                    funcao: req.body.funcao,
                    departamento: req.body.departamento,
                    equipa: req.body.equipa,
                    email: req.body.email,
                    password: req.body.password
                })

                bcrypt.genSalt(10, function(erro, salt){
                    bcrypt.hash(novoFunc.password, salt, function(erro, hash){
                        if(erro){
                            req.flash("error_msg", "Erro interno ao registar. Tente novamente.")
                            res.redirect("/registo");
                        }

                        novoFunc.password = hash
                        novoFunc.save().then(function(){
                            req.flash("success_msg", "Registo concluído com sucesso.")
                            res.redirect("/login");
                        }).catch(function(erro){
                            req.flash("error_msg", "Erro interno ao registar. Tente novamente.")
                            res.redirect("/registo");
                        })
                    })
                })
            }
        }).catch(function(erro){
            req.flash("error_msg", "Erro interno ao registar. Tente novamente.")
            res.redirect("/registo");
        })
    }

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

router.get('/obra/:id', authenticated, function(req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Obra.findOne({ $and: [{_id:req.params.id}, {_id:funcionario.obras}]}).lean().then(function(obra){
            Tarefa.find({obra:obra._id}).lean().then(function(tarefas){
                res.render("users/obras/obraDetail", {obra:obra, tarefas:tarefas, user:req.user})
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
            var tarefasS = JSON.stringify(tarefas);
            res.render("users/tarefas/tarefas", {tarefas: tarefas, tarefasS:tarefasS})
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
                        var t = JSON.stringify(tarefa);
                        res.render("users/tarefas/tarefaDetail", {obra:obra, tarefa:tarefa, t:t, funcionarios:funcionarios, requisicoes:requisicoes})
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
                console.log(erro)
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
    var erros = []
   
    Tarefa.findOne({_id: req.params.id}).lean().then(function(tarefa){
        Obra.findOne({_id:tarefa.obra}).lean().then(function(obra){

            if(req.user.role != "user"){
                if(tarefa.estado != "emExecucao"){
                    if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
                        erros.push({texto: "Nome inválido."});
                    }else{
                        if(req.body.nome.trim().length < 2){
                            erros.push({texto: "Nome com tamanho inválido. Mínimo de 3 caracteres."});
                        }
                        else{
                            tarefa.nome = req.body.nome;
                        }
                    }
                
                    if(!req.body.descricao || typeof req.body.descricao == undefined || req.body.descricao == null){
                        erros.push({texto: "Descrição inválida."});
                    }
                    else{
                        tarefa.descricao = req.body.descricao;
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
                        erros.push({texto: "Data inválida. Data de início tem que ser superior ou igual à data atual e à data de inicio da obra."})
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
                        erros.push({texto: "Data inválida. Data de fim tem que ser superior ou igual à data atual e à data de inicio da tarefa."})
                    }
                }
            }
            
            if(moment(req.body.dataPrevistaInicio).isValid() && moment(req.body.dataPrevistaFim).isValid()){
                if(moment(req.body.dataPrevistaInicio).isAfter(req.body.dataPrevistaFim) == true){
                    erros.push({texto: "Data inválida. Data de fim tem que ser superior ou igual à data atual e à data início da tarefa."})
                }
            }

            if(erros.length > 0){
                Funcionario.find({ tarefas: { $ne: tarefa._id}}).lean().then(function(f){
                    var dataPrevistaInicio = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DDTHH:mm")
                    var dataPrevistaFim = moment(tarefa.dataPrevistaFim).format("YYYY-MM-DDTHH:mm")
                    var dataInicio = moment(tarefa.dataInicio).format("YYYY-MM-DDTHH:mm")
                    var dataFim = moment(tarefa.dataFim).format("YYYY-MM-DDTHH:mm")
                    var funcionariosSelecionados = JSON.stringify(req.body.funcionarios); 
                    res.render("users/tarefas/editarTarefa", {tarefa:tarefa, erros:erros, funcionariosSelecionados:funcionariosSelecionados, dataPrevistaInicio:dataPrevistaInicio, dataPrevistaFim:dataPrevistaFim, dataInicio:dataInicio, dataFim:dataFim,
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

                    var dataPrevistaFimComRequisicoes;
                    if(moment(tarefa.dataPrevistaFimComRequisicoes).isValid()){
                        dataPrevistaFimComRequisicoes = moment(tarefa.dataPrevistaFimComRequisicoes).format("YYYY-MM-DDTHH:mm");
                        if(moment(dataPrevistaFimComRequisicoes).isBefore(tarefa.dataPrevistaFim)){
                            dataPrevistaFimComRequisicoes = tarefa.dataPrevistaFim;
                        }
                    }
                    else{
                        dataPrevistaFimComRequisicoes = tarefa.dataPrevistaFim;
                    }
        
                    Tarefa.findOneAndUpdate({_id:req.params.id}, 
                        {"$set": {
                            "nome": tarefa.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                            "descricao": tarefa.descricao.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                            "dataPrevistaInicio": tarefa.dataPrevistaInicio,
                            "dataPrevistaFim": tarefa.dataPrevistaFim,
                            "dataPrevistaFimComRequisicoes": dataPrevistaFimComRequisicoes,
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
                if(tarefa.dataPrevistaFimComRequisicoes == "Invalid date" || typeof tarefa.dataPrevistaFimComRequisicoes == undefined || tarefa.dataPrevistaFimComRequisicoes == null){
                    req.flash("error_msg", "Impossível validar tarefa, uma vez que esta não tem data prevista de fim.")
                    res.redirect("/tarefa/"+req.params.id)
                }
                else{
                    req.flash("error_msg", "Impossível validar tarefa. A data prevista de fim é relativa às requisições de máquinas para esta tarefa. Preencha a data prevista de fim da própria tarefa para a submeter (Opção \"Editar\"). Se não for necessário mão de obra para a realização da tarefa, preencha a data prevista de fim com a data da data prevista de inicio.")
                    res.redirect("/tarefa/"+req.params.id)
                }
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
                req.flash("error_msg", "Não pode começar esta tarefa. Verifique que a tarefa está em execução.")
                res.redirect("/tarefa/"+req.params.id)
            }
            else{
                Tarefa.findOneAndUpdate({_id:req.params.id},
                    {"$set": {
                        "estado": "finalizada",
                        "dataFim": moment()
                        }}, {useFindAndModify: false}).lean().then(function(){
                        Obra.findOne({_id:tarefa.obra}).lean().then(function(obra){
                                    Funcionario.find({tarefas:req.params.id}).then(function(funcionarios){
                                        Tarefa.findOne({_id:req.params.id}).lean().then(function(tarefa){
                                            Obra.findOne({_id:tarefa.obra}).lean().then(function(obra){
                                                Requisicao.find({tarefa:tarefa._id}).then(function(requisicoes){
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
            
                                                            var requestStartDateYear; 
                                                            var requestFinishDateYear;
                                                            for(var i=0; i<requisicoes.length; i++){
                                                                requestStartDateYear = moment(requisicoes[i].dataInicio).format("YYYY");
                                                                requestFinishDateYear = moment(requisicoes[i].dataFim).format("YYYY");
                                                                if(requestStartDateYear < issueStartDateYear){
                                                                    var holidaysAux = [];
                                                                    for(var j=requestStartDateYear; j < issueStartDateYear; j++){
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
                                                                if(requestFinishDateYear > issueFinishDateYear){
                                                                    for(var j=issueFinishDateYear; j < requestFinishDateYear; j++){
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
                                                            
                                                            var days = momentBD(tarefa.dataFim).businessDiff(moment(tarefa.dataInicio));
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
                                                                for(var i=0; i<funcionarios.length; i++){
                                                                    cost = cost + ((days * 24 - (daysAux * 16)) * funcionarios[i].custo);
                                                                    issueCost = issueCost + ((days * 24 - (daysAux * 16)) * funcionarios[i].custo);
                                                                }
                                                            }
            
                                                            for(var i=0; i<requisicoes.length; i++){
                                                                var days = momentBD(requisicoes[i].dataFim).businessDiff(moment(requisicoes[i].dataInicio));
                                                                var daysAux = days;
                                                                var hours = momentBD(requisicoes[i].dataFim).diff(moment(requisicoes[i].dataInicio), 'days', true) % 1;
                                                                if(hours != 0 && days != 0){
                                                                    days = days - 1;
                                                                }
                                                                days = days + hours;
                                                                if(daysAux == 0){
                                                                    console.log(requisicoes[i].maquina)
                                                                    await Maquina.findOne({_id:requisicoes[i].maquina}).then(function (maquina) {
                                                                        cost = cost + ((days * 24) * maquina.custo);
                                                                    })
                                                                    
                                                                }
                                                                else{
                                                                    await Maquina.findOne({id:requisicoes[i].maquina}).then(function (maquina) {
                                                                        cost = cost + ((days * 24 - (daysAux * 16)) * maquina.custo);
                                                                    })
                                                                }
                                                            }                                                
                                                            
                                                            var finishDate;
                                                            if(moment(obra.dataFim).isValid()){
                                                                if(moment(tarefa.dataFim).isAfter(obra.dataFim)){
                                                                    finishDate = tarefa.dataFim;
                                                                }
                                                                else{
                                                                    finishDate = obra.dataFim;
                                                                }
                                                            }
                                                            else{
                                                                finishDate = tarefa.dataFim;
                                                            }
                                                            Tarefa.findOneAndUpdate({_id:req.params.id},
                                                                {"$set": {
                                                                    "despesaFinal": issueCost,
                                                                    "custoFinal":issueCost + issueCost * (obra.percentagemLucro/100)
                                                                }}, {useFindAndModify: false}).then()
            
                                                            
                                                            Tarefa.find({$and : [{obra:obra._id}, {estado: { $ne: "finalizada"}}]}).then(function(tarefas){
                                                                if(tarefas.length > 0){
                                                                    Obra.findOneAndUpdate({_id:obra._id}, {"$set": {"despesaFinal": cost, "dataFim": finishDate, 
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
                                                                        console.log(error)
                                                                        req.flash("error_msg", "Erro ao atualizar a obra.")
                                                                        res.redirect("/tarefa/"+req.params.id);
                                                                    })
                                                                }
                                                                else{
                                                                    Obra.findOneAndUpdate({_id:obra._id}, {"$set": {"despesaFinal": cost, "dataFim": finishDate, 
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
                            req.flash("error_msg", "Obra não encontrada.")
                            res.redirect("/tarefa/"+req.params.id);
                        })
                }).catch(function(error){
                    req.flash("error_msg", "Erro ao terminar a tarefa.")
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

router.post('/tarefa/:id/addRequisicao', authenticated, function asyncFunction (req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Tarefa.findOne({$and: [{_id:req.params.id}, {_id:funcionario.tarefas}]}).lean().then(function(tarefa){
            Maquina.find().lean().then(function(maquinas){
                var erros = [];
                if(!req.body.dataPrevistaInicio || !req.body.dataPrevistaFim){
                    erros.push({texto: "Datas obrigatórias. Preencha data prevista de início e data prevista de fim."})
                }

                if(!req.body.descricao || typeof req.body.descricao == undefined || req.body.descricao == null){
                    erros.push({texto: "Descrição inválida."});
                }
                else{
                    if(req.body.descricao.trim() < 3){
                        erros.push({texto: "Descrição com tamanho inválido. Mínimo de 5 caracteres, sendo que pode possuir apenas 2 espaços."});
                    }
                    else{
                        descricao = req.body.descricao;
                    }
                }

                if(erros.length>0){
                    var dataInicio = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DDTHH:mm")
                    res.render("users/requisicoes/novaRequisicao", {erros:erros, dataInicio:dataInicio, descricao:descricao, tarefa:tarefa, maquinas:maquinas})
                }
                else{
                        Maquina.findOne({nome:req.body.maquinas}).then(function(maquina){
                            Requisicao.find({maquina:maquina.id}).then(function(requisicoes){
                                    var today = moment().format("YYYY-MM-DD HH:mm");
                                    var dataPrevistaInicio = moment(req.body.dataPrevistaInicio).format("YYYY-MM-DD HH:mm")
                                    var dataPrevistaFim = moment(req.body.dataPrevistaFim).format("YYYY-MM-DD HH:mm")
                                    var dataTarefa = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DD HH:mm")
                                    
                                    
                                    dataPrevistaInicio = moment(dataPrevistaInicio).add(1, 'minutes');
                                    dataPrevistaFim = moment(dataPrevistaFim).add(1, 'minutes');
        
                                    if(moment(dataPrevistaInicio).isValid() && moment(dataPrevistaFim).isValid()){
                                        if(moment(dataTarefa).isAfter(dataPrevistaInicio) == true || moment(today).isAfter(dataPrevistaInicio) == true || moment(dataPrevistaInicio).isAfter(dataPrevistaFim) == true){
                                            
                                            var dataInicio = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DDTHH:mm")
                                            erros.push({texto: "Data inválida. Data tem que ser superior à data de inicio da tarefa e a data de fim tem que ser superior à data de inicio da requisição."})
                                            res.render("users/requisicoes/novaRequisicao", {erros:erros, dataInicio:dataInicio, descricao:descricao, tarefa:tarefa, maquinas:maquinas})
                                        }
                                        else{
                                            var invalid = false;
                                            for(var i=0; i<requisicoes.length; i++){
                                                if(moment(requisicoes[i].dataPrevistaInicio).isBetween(dataPrevistaInicio, dataPrevistaFim)){
                                                    invalid = true;
                                                    break;
                                                }
                                                if(moment(dataPrevistaInicio).isBetween(requisicoes[i].dataPrevistaInicio, requisicoes[i].dataPrevistaFim)){
                                                    invalid = true;
                                                    break;  
                                                }
                
                                                if(moment(dataPrevistaFim).isBetween(requisicoes[i].dataPrevistaInicio, requisicoes[i].dataPrevistaFim)){
                                                    invalid = true;
                                                    break;
                                                }
                                            }
                                            
                                            if(invalid){
                                                erros.push({texto: "Já existe uma requisição para esta máquina durante a duração pretendida. Consulte as requisições para obter uma duração desocupada (Requisições - Vista calendário)."})
                                                res.render("users/requisicoes/novaRequisicao", {erros:erros, tarefa:tarefa, maquinas:maquinas})
                                            }
                                            else{
                                                var novaRequisicao = {
                                                    maquina: maquina._id,
                                                    funcionario : funcionario._id,
                                                    tarefa: tarefa._id,
                                                    tarefaNome: tarefa.nome,
                                                    maquinaNome: maquina.nome,
                                                    funcionarioNome: funcionario.nome,
                                                    descricao:descricao,
                                                    dataPrevistaFim: req.body.dataPrevistaFim,
                                                    dataPrevistaInicio: req.body.dataPrevistaInicio
                                                }
                                                new Requisicao(novaRequisicao).save().then();

                                                if(!moment(tarefa.dataPrevistaFimComRequisicoes).isValid() || moment(dataPrevistaFim).isAfter(tarefa.dataPrevistaFimComRequisicoes)){
                                                    Tarefa.updateOne(
                                                        {"_id":tarefa._id},
                                                        {$set: {dataPrevistaFimComRequisicoes : dataPrevistaFim}},
                                                        ).catch(function(erro){
                                                            req.flash("error_msg", "Erro ao atualizar a tarefa.")
                                                            res.redirect('/tarefa/'+req.params.id);
                                                        });
                                                }
                                                
                                                req.flash("success_msg", "Requisição concluída com sucesso.")
                                                res.redirect("/tarefa/"+req.params.id);
                                            }
                                        }
                                    }
                                    else{
                                        erros.push({texto: "Datas inválidas. Preencha corretamente data prevista de início e data prevista de fim."})
                                        res.render("users/requisicoes/novaRequisicao", {erros:erros, tarefa:tarefa, maquinas:maquinas})
                                    }
                                }).catch(function(error){
                                    req.flash("error_msg", "Tarefas não encontradas.")
                                    res.redirect("/tarefa/"+req.params.id)
                                })
                            }).catch(function(error){
                                req.flash("error_msg", "Requisições não encontradas.")
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

router.post('/perfil/edit', authenticated, function asyncFunction(req, res){
    var erros = []

    if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
        erros.push({texto: "Nome inválido."});
    }else{
        if(req.body.nome.trim().length < 2){
            erros.push({texto: "Nome com tamanho inválido. Mínimo de 3 caracteres."});
        }
    }

    if(!req.body.email || typeof req.body.email == undefined || req.body.email == null){
        erros.push({texto: "Email inválido."});
    }
    

    if(req.body.password){
        if(req.body.password.length < 5){
            erros.push({texto: "Password curta. Mínimo 5 caracteres."})
        }
            
        if(!req.body.password2 || typeof req.body.password2 === undefined || req.body.password2 === null){
            erros.push({texto: "Uma vez que pretende alterar a palavra-pass, a confirmação é obrigatório."})
        }
        else{
            if(req.body.password != req.body.password2){
                erros.push({texto: "As passwords não correspondem."})
            }
        }         
    }

    // var form = new formidable.IncomingForm();
    // form.parse(req, function (err, fields, files) {
    //     var oldpath = files.filetoupload.path;
    //     var newpath = 'C:/Users/Mickaël/Desktop/' + files.filetoupload.name;
    //     fs.rename(oldpath, newpath, function (err) {
    //         if (err) throw err;
    //         res.write('File uploaded and moved!');
    //         res.end();
    //     });
    // });

    if(erros.length > 0){
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
                        
                req.flash("success_msg", "Perfil editado com sucesso.")
                res.redirect("/perfil");
        }).catch(function(error){
            req.flash("error_msg", "Já existe um cliente com este email.")
            res.redirect("/perfil/edit");
        })
    }
})

router.get('/requisicoes', authenticated, function(req, res){
    Requisicao.find({}).lean().then(function(requisicoes){
        var requisicoesS = JSON.stringify(requisicoes);
        res.render("users/requisicoes/requisicoes", {requisicoes:requisicoes, requisicoesS:requisicoesS})
    }).catch(function(error){
        req.flash("error_msg", "Requisições não encontradas.")
        res.redirect('/dashboard')
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

async function countWeekendDays( d0, d1, d2, d3 )
{
  var ndays = 1 + Math.round((d1.getTime()-d0.getTime())/(24*3600*1000));
  var nsaturdays = Math.floor( (d2+ndays) / 7 );
  return 2*nsaturdays + (d0.getDay()==0) - (d1.getDay()==6);
}

module.exports = router