const localStrategy = require('passport-local').Strategy
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')


//Users
require('../models/Funcionario')
const Funcionario = mongoose.model("funcionarios")

module.exports = function(passport){
    passport.use(new localStrategy({usernameField: 'email', passwordField: 'password'}, function(email, password, done){
        Funcionario.findOne({email: email}).then(function(funcionario){
            if(!funcionario){
                
                return done(null, false, {message: "Funcionário não está registado"})
            }

            bcrypt.compare(password, funcionario.password, function(error, equals){
                
                if(equals){
                    return done(null, funcionario)
                }
                return done(null, false, {message: "Palavra-passe incorreta"})
            })
        })
    }))

    passport.serializeUser(function(funcionario, done){
        done (null, funcionario.id)
    })

    passport.deserializeUser(function(id, done){
        Funcionario.findById(id, function(error, funcionario){
            done(error, funcionario)
        })
    })
}