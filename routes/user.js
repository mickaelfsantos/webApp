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
    const Obra = mongoose.model("obras")
    const Tarefa = mongoose.model("tarefas")
    const Funcionario = mongoose.model("funcionarios")


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
        if(req.body.password.length < 4){
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
    Obra.find().lean().then(function(obras){
        var o = JSON.stringify(obras);
        res.render("users/obras/obras", {obras: obras, obrasS : o})
    }).catch(function(erro){
        req.flash("error_msg", "Erro ao fazer o GET das obras.")
        res.redirect("/dashboard");
    })
})

router.get('/obra/:nome', authenticated, function(req, res){
    Obra.findOne({nome:req.params.nome}).then(function(obra){
        if(obra != null){    
            async function secondFunction(){
                var tarefas = await myFunction(obra.tarefas)
                res.render("users/obras/obraDetail", {obra:obra, tarefas:tarefas})
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
    Tarefa.find( { $or: [{ funcionarios: req.user.id}, {funcionarioResponsavel : req.user.id }]}).lean().then(function(tarefas){
        res.render("users/tarefas/tarefas", {tarefas: tarefas})
    }).catch(function(erro){
        console.log(erro)
        req.flash("error_msg", "Erro ao fazer o GET das tarefas.")
        res.redirect("/dashboard");
    })
})

router.get('/tarefa/:nome', authenticated, function(req, res){
    Tarefa.findOne({nome:req.params.nome}).then(function(tarefa){
        var encontrou = false;
        if(tarefa != null){
            if(tarefa.funcionarioResponsavel._id == req.user.id){
                encontrou=true;
            }
            else{
                for(var i=0; i<tarefa.funcionarios.length; i++){
                    if(tarefa.funcionarios[i]._id == req.user.id){
                        encontrou=true;
                        break;
                    }
                }
            }
            
            if(encontrou){
                async function secondFunction(){
                    var obraS = await getObraInfo(tarefa.obra)
                    var funcionarios = await getFuncionariosInfo(tarefa.funcionarios)
                    res.render("users/tarefas/tarefaDetail", {obra:obraS, tarefa:tarefa, funcionarios:funcionarios})
                };
                secondFunction(); 
            }
            else{
                req.flash("error_msg", "Não pode aceder a esta tarefa uma vez que não foi associada a ela.")
                res.redirect("/tarefas");
            }
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