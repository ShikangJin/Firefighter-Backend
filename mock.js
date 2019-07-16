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
var realtime = db.ref('/realtime');

app.get('/mockMember', (req, res) => {
    mockMember();
    res.send('mocked member');
})

function mockMember() {
    const teamname = ['a'];
    let data = {}, realtime = {};
    let idx = 0;
    teamname.forEach(team => {
        data[team] = {}; 
    })
    Object.keys(data).forEach(team => {
        data[team][`id ${idx}`] = {
            age: 21,
            id: idx,
            key: idx,
            name: 'tester ' + idx,
            squad: team,
            status: 'good',
        }
        realtime[`id ${idx}`] = {
            squad: team,
        }
        idx++;
    });

    db.ref('/').update({   
        squads: data,
        realtime: realtime
    });

    
}

app.get('/mockData', (req, res) => {
    mockData();
    res.send('mocked data');
})

app.get('/mockHistoryData', (req, res) => {
    mockHistoryData();
    res.send('mocked history data');
})

function mockData() {
    realtime.once('value', function(snapshot) {
        let data = snapshot.val();
        let curTime = moment(new Date().getTime());
        Object.keys(data).forEach(id => {
            let curMember = data[id];
            curMember.status = Math.random() < 0.2 ? 'MayDay' : 'good';
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
        });
        db.ref('/').update({   
            realtime: data
        }) 
        // console.log(data);
    });
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
                result['id ' + curMember.id] = returnData;
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