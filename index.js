
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
var admin = require("firebase-admin");

var serviceAccount = require("./firebaseAuth.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://firefighter-38b3e.firebaseio.com"
});

var db = admin.database();
var squads = db.ref("/squads");
var history = db.ref('/history');

app.get('/firefighter/history', (req, res) => getHistoryData(req, res))

function getHistoryData(req, res) {
    if (req.query === undefined) return [];
    history.once("value", function(snapshot) {
        return res.json(snapshot.val()[req.query.id]);
    })
}

////

io.on('connection', function(socket) {
    console.log('a user connected');
    
    const onValueChange = function(snapshot) {
        console.log(socket.id);
        io.emit('update', snapshot.val());
    }
    squads.on("value", onValueChange);

    socket.on('disconnect', function(reason) {
        console.log(reason);
        // handle disconnect
        squads.off('value', onValueChange);
        socket.disconnect(true);
        
    });
});




app.set('port', process.env.PORT || 3000);

var socket = server.listen(app.get('port'), function() {
    console.log('start at port:' + server.address().port);
});