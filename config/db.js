if(process.env.NODE_ENV == "production"){
    module.exports = {mongoURI: "mongodb+srv://admin:123123123@cluster0.ua38y.mongodb.net/<dbname>?retryWrites=true&w=majority"}
}
else{
    module.exports = {mongoURI: "mongodb://localhost/webApp"}
}