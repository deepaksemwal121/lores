// requiring all node modules into variables
var express = require("express")
mongoose = require("mongoose")
bodyParser = require("body-parser")
passport = require("passport")
item = require("./models/item")
User = require("./models/user")
multer = require("multer")
upload = require("./multer")
seedDB = require("./seeds")
feedPost = require("./models/feedPost")
Comments = require("./models/comments")
LocalStratergy = require("passport-local")
expressSanitizer = require("express-sanitizer")
methodOverride = require("method-override")
feedRoutes = require("./routes/feeds")
commentRoutes = require("./routes/comments")
authenticationRoutes = require("./routes/authentication")
marketRoutes = require("./routes/market");

const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const {
    formatMessage
    // getmessage
} = require('./utils/messages');

const {
    userJoin,
    getCurrentUser,
    userLeave,
    getRoomUsers
} = require('./utils/users');
const user = require("./models/user")

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botName = {
    username: 'Lores Bot'
};


// seeding Database
// seedDB();

// Connection Database

mongoose.connect("mongodb://localhost/loresUsers", { useNewUrlParser: true, useUnifiedTopology: true });
// mongoose.connect("mongodb+srv://akhil:Akhil@8979@lores-owlah.mongodb.net/<dbname>?retryWrites=true&w=majority", { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.once("open", function() {
    console.log("Database connection Successful");
})




//  Installing these modules

app.use(methodOverride("_method"));
app.set("view engine", "ejs")
app.use(express.static(path.join(__dirname, 'Public')));
app.set('Views', '/app/views');
app.use('/uploads', express.static('uploads'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressSanitizer());

// requiring routes
app.use(feedRoutes);
app.use(commentRoutes);
app.use(authenticationRoutes);
app.use(marketRoutes);





// Setting Up routes

app.get("/", function(req, res) {
    res.render("index");
});

app.get("/dashboard", function(req, res) {
    res.render("dashboard", { currentUser: req.user });
})

app.get("/profile/:id", function(req, res) {
    user.findById(req.params.id, function(err, user) {
        if (err) {
            console.log(err);
            res.redirect("back");
        } else {
            res.render("profile", { user: user });
        }
    })
})


app.get("/courses", function(req, res) {
    res.render("courses");
})

app.get("/profile/:id/edit", function(req, res) {
    res.render("profileEdit")
})

app.put("/profile/:id", upload.single('image'), function(req, res) {
    var img = {
        image: req.file.path
    }
    console.log(req.body.image);
    User.findByIdAndUpdate(req.params.id, img, function(err, updatedProfile) {
        if (err) {
            console.log(err);
            res.redirect("back");
        } else {
            res.redirect("back");
        }
    })
})

app.get("/mindex", function(req, res) {
    res.render("index2");
})

app.get("/chat", function(req, res) {
    res.render("chat");
})


function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
};

// Run when client connects
io.on('connection', socket => {
    socket.on('joinRoom', ({ username, room }) => {
        const user = userJoin(socket.id, username, room);
        if (username) {
            const roomCheck = user.room;
            const temp = roomCheck.split('!@!@2@!@!').reverse().join('!@!@2@!@!');
            if (io.sockets.adapter.rooms[temp]) {
                user.room = temp;
                socket.join(user.room);
            } else {
                socket.join(user.room);
            }
            // getting old messages
            // socket.to(user.room).emit('getmessage', getmessage(user));
        }


        // Welcome current user
        // socket.emit('message', formatMessage(botName, 'Welcome to ChatCord!'));

        // Broadcast when a user connects
        // socket.broadcast
        //     .to(user.room)
        //     .emit(
        //         'message',
        //         formatMessage(botName, `${user.username} has joined the chat`)
        //     );

        // Send users and room info
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
    });

    // Listen for chatMessage
    socket.on('chatMessage', msg => {
        const user = getCurrentUser(socket.id);

        io.to(user.room).emit('message', formatMessage(user, msg));
    });

    // Runs when client disconnects
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if (user) {
            // io.to(user.room).emit(
            //     'message',
            //     formatMessage(botName, `${user.username} has left the chat`)
            // );

            // Send users and room info
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        }
    });




});


const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));