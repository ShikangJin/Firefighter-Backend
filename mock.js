const express = require('express');
const app = express();
// const server = require('http').createServer(app);
const moment = require('moment');
var admin = require("firebase-admin");
var { databaseURL } = require('./configData');
var serviceAccount = require("./firebaseAuth.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL
  });

var db = admin.database();
var squads = db.ref('/squads');
var realtime = db.ref('/realtime');

app.get('/mockMember', (req, res) => {
    mockMember();
    res.send('mocked member');
})

app.get('/mockAccount', (req, res) => {
    mockAccount();
    res.send('mocked account');
})

function mockAccount() {
    let account1 = {
        username: 'admin',
        password: 'firefighter',
        tags: ['Fire Boundray', 'Emergency Area'],
    }
    let account2 = {
        username: 'user',
        password: 'firefighter',
        tags: ['Fire Boundray', 'Emergency Area'],
    }
    let accountRef = db.ref('/').child('accounts');
    accountRef.set({
        'user 1': account1,
        'user 2': account2,
    });
}

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
            status: 'unknown',
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
            curMember.status = Math.random() < 0.2 ? 'Mayday' : 'good';
            curMember.humidity = (36 + Math.random() * 2).toFixed(1);
            curMember.location = {
                lat: (-3.745 + Math.random() * 0.01).toFixed(3),
                lng: (-38.523 + Math.random() * 0.01).toFixed(3),
            };
            curMember.timestamp = curTime.format('L');
            curMember.timeDetail = curTime.format('LTS');
            curMember.pressure = Math.floor(60 + Math.random() * 40);
            curMember.proximity = (0.02 + Math.random() * 0.08).toFixed(4);
            curMember.temperature = Math.floor(Math.random() * 120);
            curMember.ppb = Math.floor(-2000 - Math.random() * 500);
            curMember.rh = Math.floor(55 + Math.random() * 2);
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
                        time: moment(new Date(beginDay + 1000 * 60 * 60 * 24 * i)).format('MMMM Do YYYY, h:mm:ss a'),
                        bodyTemp: (36 + Math.random() * 2).toFixed(1),
                        heartRate: Math.floor(60 + Math.random() * 40),
                        temp: Math.floor(Math.random() * 5 + 20),
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