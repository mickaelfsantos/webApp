const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const moment = require('moment')
moment().format();
require("../models/Obra")
const Obra = mongoose.model("obras")


router.get('/obras/add', function(req, res){
    res.render("usersResponsaveis/novaObra")
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
        res.render("usersResponsaveis/novaObra", {erros: erros})
    }
    else{
        const novaObra = {
            nome: req.body.nome,
            descricao: req.body.descricao,
            funcionarios: req.body.funcionarios,
            dataPrevistaDeInicio: req.body.dataPrevistaDeInicio
        }
    
        new Obra(novaObra).save().then(function(){
            //req.flash("error_msg", "Já existe uma obra com o mesmo nome ou houve um erro ao adicionar a obra. Tente novamente.")
            //res.status(404).send().json(error_msg)
            //console.log(error_msg);
            var mensagem = []
            mensagem.push({texto:"Obra criada com sucesso"});
            res.render("usersResponsaveis/novaObra", {mensagem: mensagem})
        }).catch(function(erro){
            console.log("Erro: "+erro)
            var erro=[]
            erro.push({texto:"Já existe uma obra com o mesmo nome ou houve um erro ao adicionar a obra. Tente novamente."})
            res.render("usersResponsaveis/novaObra", {erro: erro})
        })
    
    }
})


module.exports = router