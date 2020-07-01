const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const moment = require('moment')
moment().format();
const bcrypt = require('bcryptjs')
const passport = require('passport')
var pdf = require("pdf-creator-node");
var fs = require('fs');

const {authenticated} = require('../helpers/userRole')

//models
    require("../models/Obra")
    require("../models/Tarefa")
    require("../models/Funcionario")
    require("../models/Requisicao")
    const Obra = mongoose.model("obras")
    const Tarefa = mongoose.model("tarefas")
    const Funcionario = mongoose.model("funcionarios")
    const Requicisao = mongoose.model("requisicoes")


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
    res.render("users/dashboard")
})

router.get('/obras', authenticated, function(req, res){
    Obra.find({ funcionariosAssociados: req.user.id}).lean().then(function(obras){
        var o = JSON.stringify(obras);
        res.render("users/obras/obras", {obras: obras, obrasS : o})
    }).catch(function(erro){
        req.flash("error_msg", "Erro ao fazer o GET das obras.")
        res.redirect("/dashboard");
    })
})

router.get('/obra/:id', authenticated, function(req, res){
    var html = fs.readFileSync('template.html', 'utf8');
    Obra.findOne({ $and: [{_id:req.params.id}, {funcionariosAssociados : req.user.id}]}).lean().then(function(obra){
        if(obra != null){    
            async function secondFunction(){
                var tarefas = await myFunction(obra.tarefas, req.user.id)
                res.render("users/obras/obraDetail", {obra:obra, tarefas:tarefas, user:req.user})
            };
            secondFunction();       
        }
        else{
            req.flash("error_msg", "Obra não encontrada.")
            res.redirect("/obras");
        }        
    }).catch(function(erro){
        req.flash("error_msg", "Obra não encontrada.")
        res.redirect("/obras");
    })
})

router.get('/tarefas', authenticated, function(req, res){
    Tarefa.find( { $or: [{ funcionarios: req.user.id}, {funcionarioCriador : req.user.id }]}).lean().then(function(tarefas){
        res.render("users/tarefas/tarefas", {tarefas: tarefas})
    }).catch(function(erro){
        req.flash("error_msg", "Erro ao fazer o GET das tarefas.")
        res.redirect("/dashboard");
    })
})

router.get('/tarefa/:id', authenticated, function(req, res){
    Tarefa.findOne({ $and: [{_id:req.params.id}, { $or: [{funcionarios:req.user.id}, {funcionarioCriador : req.user.id}]}]}).lean().then(function(tarefa){
        if(tarefa != null){    
            async function secondFunction(){
                var obraS = await getObraInfo(tarefa.obra)
                var funcionarios = await getFuncionariosInfo(tarefa.funcionarios)
                res.render("users/tarefas/tarefaDetail", {obra:obraS, tarefa:tarefa, funcionarios:funcionarios})
            };
            secondFunction(); 
        }
        else{
            req.flash("error_msg", "Tarefa não encontrada.")
            res.redirect("/tarefas");
        }
    }).catch(function(erro){
        req.flash("error_msg", "Tarefa não encontrada.")
        res.redirect("/tarefas");
    })
})

router.get('/tarefa/:id/edit', authenticated, function(req, res){
    Tarefa.findOne({ $and: [{_id:req.params.id}, {funcionarios : req.user.id}]}).lean().then(function(tarefa){
        if(tarefa == null){
            req.flash("error_msg", "Tarefa não encontrada.")
            res.redirect("/tarefas");
        }
        else{
            Funcionario.find().lean().then(function(f){
                var func = []
                var encontrou = false;
            
                for(var i=0; i<f.length; i++){
                    for(var j=0; j<tarefa.funcionarios.length; j++){
                        if(f[i]._id.equals(tarefa.funcionarios[j])){
                            encontrou=true;
                        }
                    }
                    if(!encontrou){
                        func.push(f[i]);
                    }
                    encontrou=false;
                }

                var dataPrevistaInicio = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DD")
                var dataPrevistaFim = moment(tarefa.dataPrevistaFim).format("YYYY-MM-DD")
                var dataInicio = moment(tarefa.dataInicio).format("YYYY-MM-DD")
                var dataFim = moment(tarefa.dataFim).format("YYYY-MM-DD")
                res.render("users/tarefas/editarTarefa", {tarefa:tarefa, dataPrevistaInicio:dataPrevistaInicio, dataPrevistaFim:dataPrevistaFim, dataInicio:dataInicio, dataFim:dataFim,
                     funcionarios : func})
            })
        }    
    }).catch(function(erro){
        req.flash("error_msg", "Tarefa não encontrada.")
        res.redirect("/tarefas");
    })
})

router.post('/tarefa/:id/edit', authenticated, function asyncFunction(req, res){
    var erros = []
   
    Tarefa.findOne({_id: req.params.id}).then(function(tarefa){
        Obra.findOne({_id:tarefa.obra}).then(function(obra){

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


            if(req.body.dataPrevistaInicio){
                var today = moment().format("YYYY-MM-DD");
                var dataTarefa = moment(req.body.dataPrevistaInicio).format("YYYY-MM-DD")
                var dataObra = moment(obra.dataPrevistaInicio).format("YYYY-MM-DD")
                if(moment(dataTarefa).isValid()){
                    if(moment(today).isAfter(dataTarefa) == true || moment(dataObra).isAfter(dataTarefa) == true){
                        erros.push({texto: "Data inválida. Data de início tem que ser superior ou igual à data de hoje e à data de inicio da obra."})
                    }
                    else{
                        tarefa.dataPrevistaInicio = req.body.dataPrevistaInicio;
                    }
                }
            }

            if(req.body.dataPrevistaFim){
                var today = moment().format("YYYY-MM-DD");
                var dataInicioTarefa;
                if(req.body.dataPrevistaInicio){
                    dataInicioTarefa = moment(req.body.dataPrevistaInicio).format("YYYY-MM-DD")
                }else{
                    dataInicioTarefa = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DD")
                }
                var dataFimTarefa = moment(req.body.dataPrevistaFim).format("YYYY-MM-DD")
                if(moment(dataFimTarefa).isValid()){
                    if(moment(dataInicioTarefa).isAfter(dataFimTarefa) == true || moment(today).isAfter(dataFimTarefa) == true){
                        erros.push({texto: "Data inválida. Data de fim tem que ser superior ou igual à data de hoje e à data de inicio da tarefa."})
                    }
                    else{
                        tarefa.dataPrevistaFim = req.body.dataPrevistaFim;
                    }
                }
            }
            

            if(erros.length > 0){
                Funcionario.find().lean().then(function(f){
                    var func = []
                    var encontrou = false;
                        
                    for(var i=0; i<f.length; i++){
                        for(var j=0; j<tarefa.funcionarios.length; j++){
                            if(f[i]._id.equals(tarefa.funcionarios[j])){
                                encontrou=true;
                            }
                        }
                        if(!encontrou){
                            func.push(f[i]);
                        }
                        encontrou=false;
                    }
            
                    var dataPrevistaInicio = moment(tarefa.dataPrevistaInicio).format("YYYY-MM-DD")
                    var dataPrevistaFim = moment(tarefa.dataPrevistaFim).format("YYYY-MM-DD")
                    var dataInicio = moment(tarefa.dataInicio).format("YYYY-MM-DD")
                    var dataFim = moment(tarefa.dataFim).format("YYYY-MM-DD")
                    res.render("users/tarefas/editarTarefa", {tarefa:tarefa, erros:erros, dataPrevistaInicio:dataPrevistaInicio, dataPrevistaFim:dataPrevistaFim, dataInicio:dataInicio, dataFim:dataFim,
                            funcionarios : func})
            })
            }
            else{
                async function secondFunction(){
                    var f = req.body.funcionarios
                    if(f != undefined){
                        var funcs = await getFuncionarios(f)
                    }
        
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
                                Tarefa.updateOne(
                                {"nome":tarefa.nome},
                                {$push: {funcionarios : funcs[i]._id}},
                                ).catch(function(erro){
                                    req.flash("error_msg", "Erro ao atualizar a tarefa.")
                                    res.redirect('/tarefa/'+req.params.id);
                                });

                                Funcionario.updateOne(
                                    {"nome":funcs[i].nome},
                                    {$push: {tarefas : tarefa._id}}
                                ).then().catch(function(erro){
                                    req.flash("error_msg", "Erro ao inserir as tarefas nos funcionários.")
                                    res.redirect('/obra/'+req.params.id);
                                })
                                
                                var encontrou = false;
                                for(var j=0; j<funcs[i].obras.length; j++){
                                    if(funcs[i].obras[j].equals(tarefa.obra)){
                                        encontrou=true;
                                        break;
                                    }
                                }

                                if(!encontrou){
                                    Obra.updateOne(
                                        {"_id":tarefa.obra},
                                        {$push: {funcionariosAssociados : funcs[i]._id}},
                                    ).catch(function(erro){
                                        req.flash("error_msg", "Erro ao atualizar a obra.")
                                        res.redirect('/obras/');
                                    })
                                }else{
                                    encontrou=false;
                                }
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
    Tarefa.findOne({ $and: [{_id:req.params.id}, {funcionarios : req.user.id}]}).then(function(tarefa){
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
                        }}, {useFindAndModify: false}).lean().then(function(funcionario){
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
    Requicisao.find().lean.then(function(requisicoes){
        res.render("users/requisicoes/requisicoes", {requisicoes:requisicoes})
    }).catch(function(error){
        req.flash("error_msg", "Requisições não encontradas.")
        res.redirect('/dashboard')
    })
})


async function myFunction(tarefas, id){
    var a=[]
    for(var i=0; i<tarefas.length; i++){
        await Tarefa.findById(tarefas[i], function(err, tarefa) {
            for(var i=0; i<tarefa.funcionarios.length; i++){
                if(tarefa.funcionarios[i] == id || tarefa.funcionarioCriador == id){
                    a.push(tarefa)
                    break;
                }
            }
        }).lean()
    }
    return a;
}

async function getObraInfo(obra){
    var a=[]
    
    await Obra.findById(obra, function(err, tarefa) {
        a.push(tarefa)
    }).lean()

    return a;
}

async function getFuncionariosInfo(funcionarios){    
    var a=[]
    for(var i=0; i<funcionarios.length; i++){
        await Funcionario.findById(funcionarios[i]).lean().then(function(funcionario) {
            a.push(funcionario)
        });
    }
    return a;
}

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