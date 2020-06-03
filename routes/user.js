const express = require('express')
const router = express.Router()

router.get('/dashboard', function(req, res){
    res.render("users/dashboard")
})

router.get('/obras', function(req, res){
    res.render("users/obras")
})


module.exports = router