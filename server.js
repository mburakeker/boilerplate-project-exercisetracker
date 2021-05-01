const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const {nanoid} = require('nanoid');
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true },()=>console.log("Connected to DB"));
const { Schema } = mongoose;

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true, default: nanoid },
  username: { type: String, required: true },
  count: { type: Number, default: 0 },
  log: [
    {
      description: { type: String },
      duration: { type: Number },
      date: { type: Date }
    }
  ]
});

const User = mongoose.model('User',userSchema);

const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now }
});

const Exercise = mongoose.model("Exercise", exerciseSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users',(req,res)=>{
  const username = req.body.username;
  User.findOne({ username: username }, (err, foundUser) => {
    if (err) return console.error(err);
    if (foundUser) {
      res.send("User exists");
    } else {
      const newUser = new User({
        username: username
      });
      newUser.save((newUserErr, createdUser) => {
        if (newUserErr) return console.error(newUserErr);
        res.json({
          _id: createdUser._id,
          username: username
          });
      });
    }
  });
})
app.get('/api/users',(req,res)=>{
  User.find({},"_id username",(err, users)=>{
    res.json(users);
 });
})
app.post('/api/users/:_id/exercises',async (req,res)=>{
  let { description, duration, date } = req.body;
  let id = req.params._id;
  if (!date) {
    date = new Date().toDateString();
  } else {
    date = new Date(date).toDateString();
  }
  await User.findOne({_id:id}, (err,foundUser) =>{
    if(err) return console.error(err);
    if (foundUser) {
      foundUser.count++;
      foundUser.log.push({
        description: description,
        duration: parseInt(duration),
        date: date
      });
      foundUser.save();
      res.json({
        _id: id,
        username: foundUser.username,
        description: description,
        duration: parseInt(duration),
        date: date
      });
    }
    else{
      res.json({error: "User not found!"});
    }
  });
})
app.get('/api/users/:_id/logs', (req, res) => {
  let id = req.params._id;
  User.findById(id, (err, foundUser) => {
    if (!err) {
      let responseObject = foundUser
      let { from, to, limit } = req.query;
      if (from || to) {

        let fromEpoch = from ? new Date(0).getTime() : new Date(from).getTime();
        let toEpoch = to ? new Date().getTime() : new Date(to).getTime();

        responseObject.log = responseObject.log.filter((elem) => {
          let elemEpoch = new Date(elem.date).getTime()
          return elemEpoch >= fromEpoch && elemEpoch <= toEpoch;
        });
      }
      if (limit) {
        responseObject.log = responseObject.log.slice(0, limit)
      }
      responseObject = responseObject.toJSON()
      responseObject.count = foundUser.log.length
      res.json(responseObject)
    }
  })
})
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
