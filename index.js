
const express = require('express');
const moment = require('moment');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const bodyParser = require('body-parser');
var { PubSub } = require('@google-cloud/pubsub'); 
var admin = require("firebase-admin");
var { databaseURL, projectId, stateSubscriber } = require('./configData');
var serviceAccount = require("./firebaseAuth.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL
});

var db = admin.database();
var squads = db.ref("/squads");
var realtime = db.ref('/realtime');
var history = db.ref('/history');
var accounts = db.ref('/accounts');
const MAX_HISTORY_DATA_AMOUNT = 500;
 
// Instantiates a client 
var pubsub = new PubSub({ 
  projectId: projectId, 
}); 
 
var subscription = pubsub.subscription('projects/' + projectId + '/subscriptions/' + stateSubscriber);
 
app.use(bodyParser.json({limit:1024102420, type:'application/json'}));
var urlencodedParser = bodyParser.urlencoded({limit: '50mb'})

app.get('/firefighter/history', (req, res) => getHistoryData(req, res))

app.get('/firefighter/info', (req, res) => getBasicInfo(req, res))

app.post('/addMember', urlencodedParser, (req, res) => addMember(req, res))

app.post('/login', (req, res) => handleLogin(req, res))

function handleLogin(req, res) {
    const { password, userName, type } = req.body;
    console.log(req.body);
    try { 
        accounts.once('value', function(snapshot) {
            let accountList = snapshot.val();
            Object.keys(accountList).forEach(user => {
                if (accountList[user].username === userName && accountList[user].password === password) {
                    console.log('success');
                    return res.json({
                        status: 'ok',
                        type,
                        currentAuthority: 'admin',
                        tags: accountList[user].tags,
                    });
                }
            })
    
            if (!res.headersSent) {
                return res.json({
                    status: 'error',
                    type,
                    currentAuthority: 'guest',
                });
            }
           
        });
    } catch(error) {
        return res.json({
            status: 'error',
            type,
            currentAuthority: 'guest',
        });
    }
}

function addMember(req, res) {
    try {
        db.ref('/nextID').once("value", function(snapshot) {
            let curID = snapshot.val();   
            console.log(curID);     
            let squadRef = db.ref(`/squads/${req.body.squad}`).child('id ' + curID);
            squadRef.set({
                id: curID,
                key: curID,
                name: req.body.name,
                squad: req.body.squad,
                age: req.body.age,
                status: 'unknown',
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

    var messageHandler = function(message) { 
        console.log('Message Begin >>>>>>>>'); 
        try {
            let messageBody = Buffer.from(message.data, 'base64').toString('ascii');
            console.log(messageBody);
            let copyData = JSON.parse(messageBody);
            
            if (!copyData.LedOn) {
                let sentData = {
                    'id 0': {
                        temperature: copyData['temp'],
                        squad: 'a',
                        status: copyData['status'],
                        location: {
                            lat: copyData['gpsLat'],
                            lng: copyData['gpsLong']
                        },
                        ppb: copyData['PPB'],
                        rh: copyData['RH'],
                        acc: {
                            x: copyData['acc_x'],
                            y: copyData['acc_y'],
                            z: copyData['acc_z'],
                        },
                        gyro: {
                            x: copyData['gyro_x'],
                            y: copyData['gyro_y'],
                            z: copyData['gyro_z'],
                        },
                        pressure: copyData['pres'],
                        status: copyData['status'],
                    }
                };
                console.log(sentData);
                io.emit('update', sentData);
                history.child('id 0').once('value', function(snapshot) {
                    let historyArr = snapshot.val();
                    if (historyArr.length == MAX_HISTORY_DATA_AMOUNT) {
                        historyArr.shift();
                    } 
                    historyArr.push({
                        temp: copyData['temp'],
                        id: 0,
                        time: moment(new Date()).format('MMMM Do YYYY, h:mm:ss a'),
                    });
                    history.child('id 0').set(historyArr);
                });
            }
        
            console.log('Message End >>>>>>>>>>'); 
            
        } catch (error) {
            console.log(error);
        }
        
        // "Ack" (acknowledge receipt of) the message 
        message.ack(); 
    }; 

    // monitor real-time data in database
    realtime.on("value", onRealtimeDataChange); 
     // monitor profile data in database
    squads.on('value', onInfoChange);

     // Listen for new messages 
     subscription.on('message', messageHandler);

    socket.on('disconnect', function(reason) {
        console.log(reason);
        // handle disconnect
        realtime.off('value', onRealtimeDataChange);
        squads.off('value', onInfoChange);
        socket.disconnect(true);
        subscription.removeListener('message', messageHandler);
    });
});



app.set('port', process.env.PORT || 3000);

var socket = server.listen(app.get('port'), function() {
    console.log('start at port:' + server.address().port);
});