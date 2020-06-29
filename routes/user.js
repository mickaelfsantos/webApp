const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const moment = require('moment')
moment().format();
const bcrypt = require('bcryptjs')
const passport = require('passport')

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

    if(!req.body.nome || typeof req.body.nome === undefined || req.body.nome === null){
        erros.push({texto: "Nome obrigatório."})
    }

    if(!req.body.funcao || typeof req.body.funcao === undefined || req.body.funcao === null){
        erros.push({texto: "Função na empresa obrigatório."})
    }
    
    if(!req.body.departamento || typeof req.body.departamento === undefined || req.body.departamento === null){
        erros.push({texto: "Departamento obrigatório."})
    }
    
    if(!req.body.equipa || typeof req.body.equipa === undefined || req.body.equipa === null){
        erros.push({texto: "Equipa obrigatório."})
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

    
    
    if(erros.length > 0){
        res.render("users/registo", {erros: erros})
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
    Obra.findOne({ $and: [{_id:req.params.id}, {funcionariosAssociados : req.user.id}]}).then(function(obra){
        if(obra != null){    
            async function secondFunction(){
                var tarefas = await myFunction(obra.tarefas)
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
    Tarefa.findOne({ $and: [{_id:req.params.id}, { $or: [{funcionarios:req.user.id}, {funcionarioCriador : req.user.id}]}]}).then(function(tarefa){
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


async function myFunction(tarefas){
    var a=[]
    for(var i=0; i<tarefas.length; i++){
        await Tarefa.findById(tarefas[i], function(err, tarefa) {
            a.push(tarefa)
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

module.exports = router