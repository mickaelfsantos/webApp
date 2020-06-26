const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const moment = require('moment')
moment().format();


const {authenticated, admin, userResponsavel} = require('../helpers/userRole');
const userRole = require('../helpers/userRole');

//models
    require("../models/Obra")
    require("../models/Tarefa")
    require("../models/Funcionario")
    const Obra = mongoose.model("obras")
    const Tarefa = mongoose.model("tarefas")
    const Funcionario = mongoose.model("funcionarios")


router.get('/obras/add', authenticated, userResponsavel, function(req, res){
    res.render("usersResponsaveis/obras/novaObra")
})

router.post('/obras/add', authenticated, userResponsavel, function asyncFunction(req, res){
    
    var erros = []
    var nomeO;
    var descricao;
    var data;

    if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
        erros.push({texto: "Nome inválido"});
    }
    else{
        if(req.body.nome.trim().length < 2){
            erros.push({texto: "Nome com tamanho inválido. Mínimo de 3 caracteres, sendo que pode possuir apenas 1 espaço."});
        }else{
            nomeO = req.body.nome;
        }
    }
    

    if(!req.body.descricao || typeof req.body.descricao == undefined || req.body.descricao == null){
        erros.push({texto: "Descrição inválida"});
    } else{
        if(req.body.descricao.trim().length < 3){
            erros.push({texto: "Descrição com tamanho inválido. Mínimo de 5 caracteres, sendo que pode possuir apenas 2 espaços."});
        }
        else{
            descricao = req.body.descricao
        }
    }

    var today = moment().format("YYYY-MM-DD");
    if(req.body.dataPrevistaInicio){
        var date = moment(req.body.dataPrevistaInicio).format("YYYY-MM-DD")
        if(moment(date).isValid()){
            if(moment(today).isAfter(date) == true){
                erros.push({texto: "Data invalida. Data de inicio tem que ser uma data supeior à data de hoje."});
            }
            else{
                data = req.body.dataPrevistaInicio;
            }
        }
    }

    if(erros.length > 0){
        res.render("usersResponsaveis/obras/novaObra", {erros: erros, nomeO:nomeO, descricao:descricao, data:data})
    }
    else{
        var novaObra;
        if(req.body.dataPrevistaInicio){
            novaObra = {
                nome: req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                descricao: req.body.descricao.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                dataPrevistaInicio: req.body.dataPrevistaInicio,
                funcionariosAssociados: req.user.id
            }
        }
        else{
            novaObra = {
                nome: req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                descricao: req.body.descricao.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                funcionariosAssociados: req.user.id
            }
        }
        
    
        new Obra(novaObra).save().then(function(){
            Obra.findOne({"nome":novaObra.nome}).then(function(obra){
                Funcionario.updateOne(
                    {"nome":req.user.nome},
                    {$push: {obras : obra._id}}
                ).catch(function(erro){
                    req.flash("error_msg", "Erro ao inserir as tarefas nos funcionários.")
                    res.redirect('/obra/'+req.params.nome);
                })
            }).catch(function(err){
                console.log(err);
            })           
            req.flash("success_msg", "Obra criada com sucesso")
            res.redirect("/obras");
        }).catch(function(erro){
            req.flash("error_msg", "Já existe uma obra com o mesmo nome ou houve um erro ao adicionar a obra. Tente novamente.")
            res.redirect("/obras/add");
        })
    
    }
})

router.get('/obra/:id/addTarefa', authenticated, userResponsavel, function(req, res){
    Obra.findOne({_id:req.params.id}).then(function(obra){
        if(obra != null){
            Funcionario.find().then(function(funcionarios){
                if(funcionarios){
                    res.render("usersResponsaveis/tarefas/novaTarefa", {nomeO:obra.nome, id:obra._id, funcionarios:funcionarios.map(funcionarios => funcionarios.toJSON())})
                }
            }).catch(function(err){
                req.flash("error_msg", "Erro interno no GET dos funcionários.")
                res.redirect('/obra/'+req.params.nome);
            })
        }
        else{
            req.flash("error_msg", "Obra não encontrada")
            res.redirect("/obras");
        }
        
    }).catch(function(erro){
        req.flash("error_msg", "Obra não encontrada")
        res.redirect("/obras");
    })
    
})

router.post('/obra/:id/addTarefa', authenticated, userResponsavel, function asyncFunction(req, res){
    
    var erros = []
    var nomeT;
    var descricao;
    var data;

    if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
        erros.push({texto: "Nome inválido."});
    }
    else{
        if(req.body.nome.trim().length < 2){   
            erros.push({texto: "Nome inválido. Mínimo de 3 caracteres, sendo que pode possuir apenas 1 espaço."});
        }
        else{
            nomeT = req.body.nome;
        }
    }

    if(!req.body.descricao || typeof req.body.descricao == undefined || req.body.descricao == null){
        erros.push({texto: "Descrição inválida."});
    } else{
        if(req.body.descricao.trim() < 3){
            erros.push({texto: "Descrição com tamanho inválido. Mínimo de 5 caracteres, sendo que pode possuir apenas 2 espaços."});
        }
        else{
            descricao = req.body.descricao;
        }
    }

    if(!req.body.funcionarios || typeof req.body.funcionarios == undefined || req.body.funcionarios == null){
        erros.push({texto: "Associe funcionários à tarefa."});
    }

    var today = moment().format("YYYY-MM-DD");
    if(req.body.dataPrevistaInicio){
        var date = moment(req.body.dataPrevistaInicio).format("YYYY-MM-DD")
        if(moment(date).isValid()){
            if(moment(today).isAfter(date) == true){
                erros.push({texto: "Data invalida. Data de inicio tem que ser uma data supeior à data de hoje."});
            }
            else{
                data = req.body.dataPrevistaInicio;
            }
        }
    }
    

    if(erros.length > 0){
        Obra.findOne({_id:req.params.id}).then(function(obra){
            Funcionario.find({}).then(function(funcionarios){
                if(funcionarios){
                    res.render("usersResponsaveis/tarefas/novaTarefa", {nomeO:obra.nome, erros: erros, data:data, descricao:descricao, nomeT:nomeT,
                        funcionarios:funcionarios.map(funcionarios => funcionarios.toJSON())})
                }
            }).catch(function(err){
                req.flash("error_msg", "Erro interno no GET dos funcionários.")
                res.redirect('/obra/'+req.params.nome);
            })
        }).catch(function(error){
            req.flash("error_msg", "Obra não encontrada.");
            res.redirect("/obra/"+req.params.id);
        })
    }
    else{
        async function secondFunction(){
            var f = req.body.funcionarios
            var funcionarios = await getFuncionarios(f)
            Obra.findOne({_id:req.params.id}).then(function(obra){
                var novaTarefa;
                if(req.body.dataPrevistaInicio){
                    novaTarefa = {
                        nome: req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                        descricao: req.body.descricao.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                        dataPrevistaInicio: req.body.dataPrevistaInicio,
                        obra: obra._id,
                        funcionarios: funcionarios,
                        importancia: req.body.importancia.toLowerCase(),
                        funcionarioCriador : req.user.id
                    }
                }
                else{
                    novaTarefa = { 
                        nome: req.body.nome.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                        descricao: req.body.descricao.replace(/\s\s+/g, ' ').replace(/\s*$/,''),
                        obra: obra._id,
                        funcionarios: funcionarios,
                        importancia: req.body.importancia.toLowerCase(),
                        funcionarioCriador : req.user.id
                    }
                }
            
                new Tarefa(novaTarefa).save().then(function(){
                    Tarefa.findOne({"nome":novaTarefa.nome}).then(function(tarefa){
                        for(var i=0; i<funcionarios.length; i++){
                            
                            Funcionario.updateOne(
                                {"nome":funcionarios[i].nome},
                                {$push: {tarefas : tarefa._id}}
                            ).then().catch(function(erro){
                                req.flash("error_msg", "Erro ao inserir as tarefas nos funcionários.")
                                res.redirect('/obra/'+req.params.id);
                            })
                            
                            var encontrou = false;
                            for(var j=0; j<funcionarios[i].obras.length; j++){
                                if(funcionarios[i].obras[j].equals(obra._id)){
                                    encontrou = true;
                                    break;
                                }
                            }
                            if(!encontrou){
                                Funcionario.updateOne(
                                    {"nome":funcionarios[i].nome},
                                    {$push: {obras : obra._id}}
                                ).catch(function(erro){
                                    req.flash("error_msg", "Erro ao inserir a obra nos funcionários.")
                                    res.redirect('/obra/'+req.params.id);
                                })
                            }
                        }

                        Obra.updateOne(
                            {"nome":obra.nome},
                            {$push: {tarefas : tarefa._id}},
                        ).catch(function(erro){
                            req.flash("error_msg", "Erro ao atualizar a obra.")
                            res.redirect('/obras/');
                        })

                        var encontrou = false
                        for(var j=0; j<funcionarios.length; j++){
                            for(var i=0; i<obra.funcionariosAssociados.length; i++){
                                if(funcionarios[j]._id.equals(obra.funcionariosAssociados[i])){
                                    encontrou = true;
                                    break;
                                }
                            }
                            
                            if(!encontrou){
                                Obra.updateOne(
                                    {"nome":obra.nome},
                                    {$push: {funcionariosAssociados : funcionarios[j]._id}},
                                ).catch(function(erro){
                                    req.flash("error_msg", "Erro ao atualizar a obra.")
                                    res.redirect('/obras/');
                                })
                            }else{
                                encontrou=false;
                            }
                        }
                        req.flash("success_msg", "Tarefa criada com sucesso.")
                        res.redirect('/obra/'+obra._id);
                        
                    }).catch(function(erro){
                        req.flash("error_msg", "Erro ao encontrar a tarefa.")
                        res.redirect('/obra/'+obra._id);
                    })
                      
                }).catch(function(erro){
                    req.flash("error_msg", "Já existe uma tarefa com o mesmo nome ou houve um erro ao adicionar a tarefa. Tente novamente.")
                    res.redirect("/obra/"+obra._id+"/addTarefa");
                })
            }).catch(function(erro){
                req.flash("error_msg", "Erro interno no GET da obra tarefa.")
                res.redirect('/tarefas/');
            })
        };
        secondFunction()
    }
})

router.get('/obra/:id/edit', authenticated, userResponsavel, function(req, res){
    Obra.findOne({_id:req.params.id}).then(function(obra){
        if(obra != null){
            Funcionario.find().lean().then(function(f){
                var funcionarios = []
                var encontrou = false;

                for(var i=0; i<f.length; i++){
                    for(var j=0; j<obra.funcionariosAssociados.length; j++){
                        if(f[i]._id.equals(obra.funcionariosAssociados[j])){
                            encontrou=true;
                        }
                    }
                    if(!encontrou){
                        funcionarios.push(f[i]);
                    }
                    encontrou=false;
                }
                var custo = JSON.stringify(obra.custoFinal);
                res.render("usersResponsaveis/obras/editarObra", {nomeO:obra.nome, obra:obra, funcionarios: funcionarios, custo:custo})  
            })
        }
        else{
            req.flash("error_msg", "Obra não encontrada")
            res.redirect("/obras");
        }
        
    }).catch(function(erro){
        req.flash("error_msg", "Obra não encontrada")
        res.redirect("/obras");
    })    
})

router.post('/obra/:id/edit', authenticated, userResponsavel, function asyncFunction(req, res){
    
    var erros = []

    if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
        erros.push({texto: "Nome inválido."});
    }
    else{
        if(req.body.nome.trim().length < 2){   
            erros.push({texto: "Nome inválido. Mínimo de 3 caracteres, sendo que pode possuir apenas 1 espaço."});
        }
    }

    if(!req.body.descricao || typeof req.body.descricao == undefined || req.body.descricao == null){
        erros.push({texto: "Descrição inválida."});
    } else{
        if(req.body.descricao.trim() < 3){
            erros.push({texto: "Descrição com tamanho inválido. Mínimo de 5 caracteres, sendo que pode possuir apenas 2 espaços."});
        }
    }

    if(req.body.percentagemLucro < 0){
        erros.push({texto: "Percentagem de lucro inválida"})
    }


    if(erros.length > 0){
        Obra.findOne({_id:req.params.id}).then(function(obra){
            Funcionario.find().lean().then(function(f){
                var funcionarios = []
                var encontrou = false;

                for(var i=0; i<f.length; i++){
                    for(var j=0; j<obra.funcionariosAssociados.length; j++){
                        if(f[i]._id.equals(obra.funcionariosAssociados[j])){
                            encontrou=true;
                        }
                    }
                    if(!encontrou){
                        funcionarios.push(f[i]);
                    }
                    encontrou=false;
                }
                var custo = JSON.stringify(obra.custoFinal);
                res.render("usersResponsaveis/obras/editarObra", {nomeO:obra.nome, erros:erros, obra:obra, funcionarios: funcionarios, custo:custo})
            })
        })
    }
    else{
        async function secondFunction(){
            var f = req.body.funcionarios
            if(f != undefined)
                var funcionarios = await getFuncionarios(f)

            Obra.findOneAndUpdate({_id:req.params.id}, 
                {"$set": {
                    "nome": req.body.nome,
                    "descricao": req.body.descricao,
                    "percentagemLucro": req.body.percentagemLucro
                  }}, {useFindAndModify: false}).then(function(obra){
                
                if(f != undefined){
                    for(var i=0; i<funcionarios.length; i++){
                        Obra.updateOne(
                        {"nome":obra.nome},
                        {$push: {funcionariosAssociados : funcionarios[i]._id}},
                        ).catch(function(erro){
                            req.flash("error_msg", "Erro ao atualizar a obra.")
                            res.redirect('/obras/');
                        });
                    }
                }
                    
                req.flash("success_msg", "Obra editada com sucesso.");
                res.redirect("/obra/"+req.params.id);
            }).catch(function (error){
                console.log(error)
                req.flash("error_msg", "Houve um erro ao encontrar a obra.")
                res.redirect("/obra/"+req.params.id)
            })
        }
        secondFunction()
    }
})

router.get('/funcionarios', authenticated, admin, function(req, res){
    Funcionario.find().lean().then(function(funcionarios){
        res.render("admin/funcionarios", {funcionarios:funcionarios})
    }).catch(function(erro){
        req.flash("error_msg", "Erro ao fazer o GET dos funcionários.")
        res.redirect("/dashboard");
    })
})

router.get('/funcionario/:id', authenticated, admin, function(req, res){
    Funcionario.findOne({_id:req.params.id}).lean().then(function(funcionario){
        res.render("admin/funcionarioDetail", {funcionario:funcionario})
    }).catch(function(erro){
        req.flash("error_msg", "Erro ao fazer o GET dos funcionários.")
        res.redirect("/dashboard");
    })
})

router.get('/funcionario/:id/edit', authenticated, admin, function(req, res){
    Funcionario.findOne({_id:req.params.id}).lean().then(function(funcionario){
        res.render("admin/editarFuncionario", {funcionario:funcionario})
    }).catch(function(erro){
        req.flash("error_msg", "Erro ao fazer o GET dos funcionários.")
        res.redirect("/dashboard");
    })
})

router.post('/funcionario/:id/edit', authenticated, userResponsavel, function asyncFunction(req, res){
    
    var erros = []

    if(!req.body.departamento || typeof req.body.departamento == undefined || req.body.departamento == null){
        erros.push({texto: "Departamento inválido."});
    }

    if(!req.body.equipa || typeof req.body.equipa == undefined || req.body.equipa == null){
        erros.push({texto: "Equipa inválida."});
    }

    if(!req.body.funcao || typeof req.body.funcao == undefined || req.body.funcao == null){
        erros.push({texto: "Função inválida."});
    }

    if(!req.body.custo || typeof req.body.custo == undefined || req.body.custo == null || req.body.custo < 0){
        erros.push({texto: "Preço inválido."});
    }

    if(erros.length > 0){
        Funcionario.findOne({_id:req.params.id}).lean().then(function(funcionario){
            res.render("admin/editarFuncionario", {erros:erros, funcionario:funcionario})
        }).catch(function(error){
            req.flash("error_msg", "Erro ao fazer o GET dos funcionários.")
            res.redirect("/funcionarios");
        })
    }
    else{
        var role = req.body.role;
        if(role == "Funcionário")
            role = "user"
        if(role == "Chefe de equipa")
            role = "userResponsavel"
        if(role == "Administrador")
            role = "admin"

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
            req.flash("error_msg", "Erro ao editar funcionário.")
            res.redirect("/funcionarios");
        })
    }
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