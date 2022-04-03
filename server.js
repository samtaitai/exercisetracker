const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

const bodyParser = require('body-parser')
const mongoose = require('mongoose')

app.use(bodyParser.urlencoded({extended: false}))

mongoose.connect(process.env.MONGO_DB)

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// username model
let ExerciseSchema = mongoose.Schema({
    userId: {type: String},
    description: {type: String},
    duration: {type: Number},
    date: {type: Date}
    });

let UserSchema = mongoose.Schema({
    username: {type: String}
    });

let User = mongoose.model('user', UserSchema);
let Exercise = mongoose.model('exercise', ExerciseSchema);

// create user & return json
app.post('/api/users', (req,res)=>{
  //console.log('req.body', req.body);
  const newUser = new User({
    username: req.body.username
  })
  newUser.save((err,data)=>{
    if(err || !data){
      res.send('There was an error saving the user')
    }else{
      res.json({
          username: data.username,
          _id: data._id //it works... why?
      })
    }
  })

})

app.post('/api/users/:id/exercises', (req,res)=>{
  //console.log('req.body', req.body);
  const id = req.params.id;
  const {userId, description, duration, date} = req.body; //object destructuring assignment

  User.findById(id, (err, userData)=>{
      if(err || !userData){
          res.send('Cound not find the user')
      }else{
          const newExercise = new Exercise({
              userId: id,
              description, // req.body.description
              duration,
              date: new Date(date) // formatting

          })
          newExercise.save((err,data)=>{
              if(err || !data){
                  res.send('There was an error saving this exercise')
              }else{
                  const {description, duration, date} = data;
                  res.json({
                      username: userData.username,
                      description, // description: description same result
                      duration,
                      date: date.toDateString(),
                      _id: userData.id
                  })
              }
          }) //.save
      } //else
  }) //findById

}) //second post

app.get('/api/users/', (req,res)=>{

    User.find({}, (err, data)=>{
        if(err || !data){
            res.send('error')
        }else{
            const rawResult = data;
            const result = rawResult.map((r)=>({
                username: r.username,
                _id: r._id
            }))
            res.send(result)

        }
    })
})


app.get('/api/users/:id/logs', (req,res)=>{
    const {from, to, limit} = req.query;
    const {id} = req.params;
    User.findById(id, (err, userData)=>{
        if(err || !userData){
            res.send('Could not find user')
        }else{
            let dateObj = {};
            if(from){ // if req.query.from exists,
                dateObj['$gte'] = new Date(from) // filter obj {_id: id, date: {$gte: from, $lte: to}}
            }
            if(to){
                dateObj['$lte'] = new Date(to)
            }
            let filter = {
                userId: id
            };
            if(from || to){ //if either of from or to exists,
                filter.date = dateObj // add property 'date' in filter object
            }

            Exercise.find(filter).limit(limit).exec((err, data)=>{
                if(err || !data){
                    res.json([])
                }else{
                    const count = data.length;
                    const rawLog = data;
                    const {username, _id} = userData;
                    const log = rawLog.map((l)=>({ //(l) => ()
                        description: l.description,
                        duration: l.duration,
                        date: l.date.toDateString()
                    }))
                    res.json({username, count, _id, log})
                    }
                })//find
            } //else
        })
    })

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
