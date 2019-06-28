const express = require('express');
const app = express();
// const server = require('http').createServer(app);
const moment = require('moment');
var admin = require("firebase-admin");

var serviceAccount = require("./firebaseAuth.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://firefighter-38b3e.firebaseio.com"
  });

var db = admin.database();
var squads = db.ref('/squads');

app.get('/mockData', (req, res) => {
    mockData();
    res.send('mocked data');
})

app.get('/mockHistoryData', (req, res) => {
    mockHistoryData();
    res.send('mocked history data');
})

function mockData() {
    squads.once('value', function(snapshot) {
        let data = snapshot.val();
        let curTime = moment(new Date().getTime());
        Object.keys(data).forEach(squad => {
            Object.keys(data[squad]).forEach(member => {
                let curMember = data[squad][member];
                curMember.status = Math.random() < 0.2 ? 'bad' : 'good';
                curMember.bodyTemp = (36 + Math.random() * 2).toFixed(1);
                curMember.location = {
                    lat: (-3.745 + Math.random() * 0.01).toFixed(3),
                    lng: (-38.523 + Math.random() * 0.01).toFixed(3),
                };
                curMember.timestamp = curTime.format('L');
                curMember.timeDetail = curTime.format('LTS');
                curMember.heartRate = Math.floor(60 + Math.random() * 40);
                curMember.coLevel = (0.02 + Math.random() * 0.08).toFixed(4);
                curMember.missionTime = Math.floor(Math.random() * 120);
                curMember.airQuality = Math.floor((Math.random() * 100));
            })
        });
        db.ref('/').update({   
            squads: data
        }) 
    })
}

function mockHistoryData() {
    const result = {};
    const beginDay = new Date().getTime();
    squads.once("value", function(snapshot) {
        Object.keys(snapshot.val()).forEach(squad => {
            Object.keys(snapshot.val()[squad]).forEach(member => {
                let curMember = snapshot.val()[squad][member];
                let returnData = [];
                for (let i = 0; i < 10; i += 1) {
                    returnData.push({
                        id: curMember.id,
                        time: moment(new Date(beginDay + 1000 * 60 * 60 * 24 * i)).format('YYYY-MM-DD'),
                        bodyTemp: (36 + Math.random() * 2).toFixed(1),
                        heartRate: Math.floor(60 + Math.random() * 40),
                    });
                }
                result[curMember.id] = returnData;
            });         
        });
        db.ref('/').update({   
            history: result
        }); 
    });
}

// app.set('port', );

app.listen(3001, function() {
    console.log('start at port 3001');
});