const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const moment = require('moment')
moment().format();
const bcrypt = require('bcryptjs')
const passport = require('passport')
const {authenticated} = require('../helpers/userRole');
const { data } = require('jquery');

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
                    res.render("users/tarefas/tarefaDetail", {obra:obra, tarefa:tarefa, funcionarios:funcionarios})
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
                
                res.render("users/tarefas/editarTarefa", {tarefa:tarefa, dataPrevistaInicio:dataPrevistaInicio, dataPrevistaFim:dataPrevistaFim, dataInicio:dataInicio, dataFim:dataFim,
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
        
                    Tarefa.findOneAndUpdate({_id:req.params.id}, 
                        {"$set": {
                            "nome": tarefa.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                            "descricao": tarefa.descricao.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                            "dataPrevistaInicio": tarefa.dataPrevistaInicio,
                            "dataPrevistaFim": tarefa.dataPrevistaFim,
                            "importancia": tarefa.importancia
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
                req.flash("error_msg", "Impossível validar tarefa, uma vez que esta não tem data prevista de fim.")
                res.redirect("/tarefa/"+req.params.id)
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

router.get('/tarefa/:id/requisitarMaquina', authenticated, function (req, res){
    Funcionario.findOne({_id:req.user.id}).lean().then(function(funcionario){
        Tarefa.findOne({ $and: [{_id:req.params.id}, {_id : funcionario.tarefas}]}).lean().then(function(tarefa){
            if(tarefa.estado != "associada" && tarefa.estado != "recusada"){
                req.flash("error_msg", "Não pode requisitar máquinas para esta tarefa. Verifique que a tarefa está em fase de orçamentação.")
                res.redirect("/tarefa/"+req.params.id)
            }
            else{
                Maquina.find().lean().then(function(maquinas){
                    res.render("users/requisicoes/novaRequisicao", {tarefa:tarefa, maquinas:maquinas})
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

                if(erros.length>0){
                    res.render("users/requisicoes/novaRequisicao", {erros:erros, tarefa:tarefa, maquinas:maquinas})
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
                                            erros.push({texto: "Data inválida. Data tem que ser superior à data de inicio da tarefa e a data de fim tem que ser superior à data de inicio da requisição."})
                                            res.render("users/requisicoes/novaRequisicao", {erros:erros, tarefa:tarefa, maquinas:maquinas})
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
                                                erros.push({texto: "Já existe uma requisição para esta máquina durante a duração pretendida. Consulte as requisições para obter uma duração desocupada (Requisições -> Vista calendário)."})
                                                res.render("users/requisicoes/novaRequisicao", {erros:erros, tarefa:tarefa, maquinas:maquinas})
                                            }
                                            else{
                                                var novaRequisicao = {
                                                    maquina: maquina._id,
                                                    funcionario : funcionario._id,
                                                    tarefa: tarefa._id,
                                                    dataPrevistaFim: dataPrevistaFim,
                                                    dataPrevistaInicio: dataPrevistaInicio
                                                }
                                                new Requisicao(novaRequisicao).save().then();
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
    var reques = [];
    Requisicao.find({}).lean().then(function(requisicoes){
        for(var i=0; i<requisicoes.length; i++){
            reques.push(requisicoes[i]);
        }
        async function f(){
           for(var i=0; i<reques.length; i++){
                Tarefa.findOne({_id:reques[i].tarefa}).then(function(tarefa){
                    reques[i].tarefaNome = tarefa.nome;
                })
                Funcionario.findOne({_id:reques[i].funcionario}).then(function(funcionario){
                    reques[i].funcionarioNome = funcionario.nome;
                })
                await Maquina.findOne({_id:reques[i].maquina}).then(function(maquina){
                    reques[i].maquinaNome = maquina.nome;
                })
            }
            var requisicoesS = JSON.stringify(reques);
            res.render("users/requisicoes/requisicoes", {requisicoes:reques, requisicoesS:requisicoesS})
        }
        f();
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