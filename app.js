
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var teamMake = require('./routes/teamMake');
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 80);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
//app.get('/users', user.list);
app.get('/teamMake', teamMake.mainView);

var httpServer = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

// upgrate http server to scoekt.io server
var io = require('socket.io').listen(httpServer);
var userDict = []; // create empty array
var memberTable = [];
var qoo10MemberTable = ["최지훈","이종화","권혁인","이형섭","방승혁","박현덕","박성호","이정환","김형철"];

io.sockets.on('connection', function(socket){
    socket.emit('firstAccess', {msg: socket.id});
    

    socket.on('MsgFromClient', function(data){
        socket.broadcast.emit('MsgFromServer', {msg:data.msg, name:searchUserName(data.id)});    // 자신 제외하고 다른 클라이언트에게 보냄
        socket.emit('MsgFromServer', {msg:data.msg, name:searchUserName(data.id)});  // 해당 클라이언트에게만 보냄.
    });

    
    socket.on('gameMemberListFromClient', function(data){
        var gameMemberList = [];
        for(var i in data.list) {            
            gameMemberList[i] = data.list[i].replace("ml_","") +":::" +qoo10MemberTable[data.list[i].replace("ml_","")];
        }
        // 게임 멤버 클라이언트로 푸시
         io.sockets.emit('gameMemberListToClient', {glist:Object.keys(gameMemberList).map( function(key){ return gameMemberList[key]; } ) } );
    });

    // 클라이언트로 부터 시합멤버 제거 리스트
   socket.on('deleteMemberListFromClient', function(data){
        var gameMemberList = [];
        for(var i in data.list) {            
            gameMemberList[i] = data.list[i].replace("ml_","") +":::" +qoo10MemberTable[data.list[i].replace("ml_","")];
        }
        // 게임 멤버 클라이언트로 푸시
         io.sockets.emit('delMemberListToClient', {glist:Object.keys(gameMemberList).map( function(key){ return gameMemberList[key]; } ) } );
    });

    
    socket.on('nameFromClient', function(data){
        var userDataArr = data.msg.split(":::");

        userDict.push({
            name: userDataArr[0],
            id: userDataArr[1]
        });
        for(var i in userDict) { 
            console.log(userDict[i].name+":::"+userDict[i].id);
        }
        memberTable[userDataArr[1]] = userDataArr[0];
        
        io.sockets.emit('helloToClient', {msg:userDataArr[0], id:userDataArr[1]});
        io.sockets.emit('sendToClientList', {users: Object.keys(memberTable).map( function(key){ return memberTable[key]; } ) });
        io.sockets.emit('memberlistToClient', {list:Object.keys(qoo10MemberTable).map( function(key){ return qoo10MemberTable[key]; } ) } );
        //socket.broadcast.emit('helloToClient', {msg:userDataArr[0], id:userDataArr[1]});
        //socket.emit('helloToClient', {msg:userDataArr[0], id:userDataArr[1]});
    });


    socket.on('selectedGameMemberFromClient', function(data){
        // 나머지 멤버에게 게임멤버id push
        socket.broadcast.emit('gameMemberListFromServer', {id: data.id});
    });

    socket.on('disconnect',function(data){
        if( socket.id in memberTable){
            console.log("disconnect - " + socket.id);
            delete memberTable[socket.id];

            io.sockets.emit('goodbyToClient', { msg: searchUserName(socket.id) });
            io.sockets.emit('sendToClientList', {users: Object.keys(memberTable).map( function(key){ return memberTable[key]; } ) });
         }
    });

});

function searchUserName(id){
    var rtnName = "";
     for(var i in userDict) { 
         if(userDict[i].id == id)
             rtnName =  userDict[i].name;
      }
      return rtnName;
}
