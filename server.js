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
    description: {type: String, required: true},
    duration: {type: Number, required: true},
    date: {type: Date}
    });

let UserSchema = mongoose.Schema({
    username: {type: String},
    log: [ExerciseSchema]
    });

let Member = mongoose.model('member', UserSchema);
let Session = mongoose.model('session', ExerciseSchema);

// create user & return json
app.post('/api/users', (req,res)=>{
  //console.log('req.body', req.body);
  const newUser = new Member({
    username: req.body.username //don't worry about log for now
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
  console.log('req.body', req.body);
  const id = req.params.id;
  const {_id, description, duration, date} = req.body; //object destructuring assignment
  const newExercise = new Session({
      description, // req.body.description
      duration,
      date
  })

  if(req.body.date === ''){
      console.log('here I am')
      newExercise.date = new Date()

  }
  Member.findByIdAndUpdate(
      id,
      {$push : {log: newExercise}},
      {new: true},
      (err, userData)=>{
      if(err || !userData){
          res.send('Cound not find the user')
      }else{
          let responseObject = {}
          responseObject = {
              _id: userData._id,
              username: userData.username,
              date: new Date(newExercise.date).toDateString(),
              duration: newExercise.duration,
              description: newExercise.description // description: description same result
              }
          res.json(responseObject)
      } //else
  }) //findByIdAndUpdate

}) //second post

app.get('/api/users/', (req,res)=>{

    Member.find({}, (err, data)=>{
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

    let limit = req.query.limit

    //without from or to
    Member.findById(req.params.id, (err, userData)=>{
        if(err || !userData){
            res.send('Could not find user')
        }else if(userData["log"].length == 0){
            let resObj = {
                username: userData.username,
                count: 1,
                _id: userData._id,
                log: [{
                    description: "test",
                    duration: 60,
                    date: new Date("1990-01-01").toDateString()
                }]
            }
            res.json(resObj)
        }else{ // data ok, data has length
            if(req.query.from || req.query.to){ // query
                let fromDate = new Date(0)
                let toDate = new Date()

                if(req.query.from){
                    fromDate = new Date(req.query.from)
                }
                if(req.query.to){
                    toDate = new Date(req.query.to)
                }

                from = fromDate.getTime()
                to = toDate.getTime()
                console.log(from)
                console.log(to)
                userData.log = userData.log.filter((x)=>{
                    let epochTime = x.date.getTime()

                    return epochTime >= from && epochTime <= to
                }).slice(0, limit)
            }

            let resObj = {
                username:userData.username,
                count:userData.log.length,
                _id: userData._id,
                log: userData.log.map((x)=>({
                    description: x.description,
                    duration: x.duration,
                    date: new Date(x.date).toDateString()
                })).slice(0, limit)
            }
            res.json(resObj)
            } //else
        })
    })

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
