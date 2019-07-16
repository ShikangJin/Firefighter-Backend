
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const bodyParser = require('body-parser');
var admin = require("firebase-admin");

var serviceAccount = require("./firebaseAuth.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://firefighter-38b3e.firebaseio.com"
});

var db = admin.database();
var squads = db.ref("/squads");
var realtime = db.ref('/realtime');
var history = db.ref('/history');

app.use(bodyParser.json({limit:1024102420, type:'application/json'}));
var urlencodedParser = bodyParser.urlencoded({limit: '50mb'})

app.get('/firefighter/history', (req, res) => getHistoryData(req, res))

app.get('/firefighter/info', (req, res) => getBasicInfo(req, res))

app.post('/addMember', urlencodedParser, (req, res) => addMember(req, res))

function addMember(req, res) {
    // console.log(req.body);
    try {
        db.ref('/nextID').once("value", function(snapshot) {
            let curID = snapshot.val();        
            let squadRef = db.ref(`/squads/${req.body.squad}`).child('id ' + curID);
            squadRef.set({
                id: curID,
                key: curID,
                name: req.body.name,
                squad: req.body.squad,
                age: req.body.age,
                status: 'good',
                image: req.body.pic,
            });

            let realtimeRef = realtime.child('id ' + curID);
            realtimeRef.set({
                squad: req.body.squad
            });
            db.ref('/').update({
                nextID: curID + 1,
            });
        });
    } catch (error) {
        console.log(error);
        return res.json({'status': 'error'});
    }    
    return res.json({'status': 'sucess'});
}

function getBasicInfo(req, res) {
    squads.once('value', function(snapshot) {
        return res.json(snapshot.val());
    })
}

function getHistoryData(req, res) {
    if (req.query === undefined) return [];
    history.once("value", function(snapshot) {
        return res.json(snapshot.val()['id ' + req.query.id]);
    })
}

io.on('connection', function(socket) {
    console.log('a user connected');
    
    const onRealtimeDataChange = function(snapshot) {
        // push real-time data to front-end
        io.emit('update', snapshot.val());
    }
    const onInfoChange = function(snapshot) {
        // push profile data to front-end
        io.emit('infoUpdate', snapshot.val());
    }

    // monitor real-time data in database
    realtime.on("value", onRealtimeDataChange); 
     // monitor profile data in database
    squads.on('value', onInfoChange);

    socket.on('disconnect', function(reason) {
        console.log(reason);
        // handle disconnect
        realtime.off('value', onRealtimeDataChange);
        squads.off('value', onInfoChange);
        socket.disconnect(true);
        
    });
});

app.set('port', process.env.PORT || 3000);

var socket = server.listen(app.get('port'), function() {
    console.log('start at port:' + server.address().port);
});