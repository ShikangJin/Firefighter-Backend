const express = require('express');
const app = express();
const server = require('http').createServer(app);
const moment = require('moment');
var admin = require("firebase-admin");

var serviceAccount = require("./firebaseAuth.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://firefighter-38b3e.firebaseio.com"
  });

var db = admin.database();

app.get('/mockData', (req, res) => {
    db.ref('/').update({   
        squads: mockData()
    }) 
})

app.get('/mockHistoryData', (req, res) => {
    db.ref('/').update({   
        history: mockHistoryData()
    }) 
})

function mockData() {
    let id = 0;
    const squadsData = [null, null, null, null, null, null, null, null, null, null];
    squadsData.forEach((_, idx) => {
        if (squadsData[idx] === null) {
            squadsData[idx] = [];
        }
        let squadData = squadsData[idx];
        for (let i = 0; i < 3; i++) {
            let curTime = moment(new Date().getTime());
            squadData.push({
                id: id,
                key: id,
                name: 'Member' + id,
                squad: 'Squad' + idx,
                status: Math.random() < 0.2 ? 'bad' : 'good',
                age: 20 + Math.floor(Math.random() * 20),
                bodyTemp: (36 + Math.random() * 2).toFixed(1),
                location: {
                    lat: (-3.745 + Math.random() * 0.01).toFixed(3),
                    lng: (-38.523 + Math.random() * 0.01).toFixed(3),
                },
                timestamp: curTime.format('L'),
                timeDetail: curTime.format('LTS'),
                heartRate: Math.floor(60 + Math.random() * 40),
                coLevel: (0.02 + Math.random() * 0.08).toFixed(4),
                missionTime: Math.floor(Math.random() * 120),
                airQuality: Math.floor((Math.random() * 100)),
            });
            id++;
        }
    });
    return squadsData;
}

function mockHistoryData() {
    let result = [];
    const beginDay = new Date().getTime();
    for (let idx = 0; idx < 30; idx++) {
        let returnData = [];
        for (let i = 0; i < 10; i += 1) {
            returnData.push({
                id: idx,
                time: moment(new Date(beginDay + 1000 * 60 * 60 * 24 * i)).format('YYYY-MM-DD'),
                bodyTemp: (36 + Math.random() * 2).toFixed(1),
                heartRate: Math.floor(60 + Math.random() * 40),
            });
        }
        result.push(returnData);
    }
    return result;
}

app.set('port', 3001);

server.listen(app.get('port'), function() {
    console.log('start at port:' + server.address().port);
});