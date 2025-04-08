import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import User from './Schema/User.js'
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import admin from "firebase-admin";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const serviceAccountKey = require("./react-js-blog-website-c1fe4-firebase-adminsdk-fbsvc-f85bb8c297.json");
import { getAuth } from "firebase-admin/auth";

const server = express();
let PORT = 3000;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey)
})

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

server.use(express.json());
server.use(cors())

mongoose.connect(process.env.DB_LOCATION, {
  autoIndex: true,
})
.then(() => console.log("✅ MongoDB conectado com sucesso"))
.catch((err) => console.error("❌ Erro ao conectar no MongoDB:", err));

const formatDatatoSend = (user) => {
  const access_token = jwt.sign({ id: user._id }, process.env.SECRET_ACCESS_KEY)

  return {
    access_token,
    profile_img: user.personal_info.profile_img,
    username: user.personal_info.username,
    fullname: user.personal_info.fullname,
  }
}

const generateUsername = async (email) => {
  let username = email.split("@")[0];

  let isUsernameNotUnique = await User.exists({ "personal_info.username": username }).then((result) => result)

  isUsernameNotUnique ? username += nanoid().substring(0, 5) : "";

  return username;

}

server.post("/signup", (req, res) => {

  let { fullname, email, password } = req.body;

  // validating the data from frontend
  if(fullname.length < 3){
    return res.status(403).json({ "error": "Fullname must be at least 3 letters long"})
  }
  if(!email.length){
    return res.status(403).json({ "error": "Email is required"})
  }
  if(!emailRegex.test(email)) {
    return res.status(403).json({ "error": "Email is not valid"})
  }
  if(!passwordRegex.test(password)) {
    return res.status(403).json({ "error": "Password must be at least 6 to 20 characters long and contain at least 1 uppercase letter, 1 lowercase letter, and one number"})
  }

  bcrypt.hash(password, 10, async (err, hashed_password) => {

    let username = await generateUsername(email);

    let user = new User({
      personal_info: {
        fullname,
        email,
        password: hashed_password,
        username,
      }
    })

    user.save().then((u) => {
      return res.status(200).json(formatDatatoSend(u))
    })
    .catch(err => {

      if(err.code == 11000) {
        return res.status(500).json({ "error": "Email already exists"})
      }
      return res.status(500).json({ "error": err.message })
    })

    console.log(hashed_password)
  })

});

server.post("/signin", (req, res) => {

  let { email, password } = req.body;

  User.findOne({ "personal_info.email": email })
  .then((user) => {
    if(!user){
      return res.status(403).json({ "error": "Email not found" })
    }

    if(!user.google_auth){
      bcrypt.compare(password, user.personal_info.password, (err, result) => {
        if(err) {
          return res.status(403).json({ "error": "Error occured while login please try again"});
        }
        if(!result){
          return res.status(403).json({ "error": "Incorrect password" });
        } else {
          return res.status(200).json(formatDatatoSend(user));
        }
  
      })
    } else {
      return res.status(403).json({ "error": "Account was created using google. Try logging in with google." }) 
    }
    

    
  })
  .catch(err => {
    console.log(err.message)
    return res.status(500).json({ "error": err.message })
  })
})

server.post("/google-auth", async (req, res) => {

  let { access_token } = req.body;

  getAuth()
  .verifyIdToken(access_token)
  .then(async (decodedUser) => {

    let { email, name, picture } = decodedUser;

    picture = picture.replace("s96-c", "s384-c");

    let user = await User.findOne({"personal_info.email": email}).select("personal_info.fullname personal_info.username personal_info.profile_img google_auth").then((u) => {
      return u || null
    })
    .catch(err => {
      return res.status(500).json({ "error": err.message })
    })

    if(user) { // login
      if(!user.google_auth){
        return res.status(403).json({ "error": "This email was signed up without google. Please log in with password to access the account" })
      }
    } else { // sign up
      
      let username = await generateUsername(email);

      user = new User({
        personal_info: { fullname: name, email, username },
        google_auth: true
      })

      await user.save().then((u) => {
        user = u;
      })
      .catch(err => {
        return  res.status(500).json({ "error": err.message })
      })

    }

    return res.status(200).json(formatDatatoSend(user))

  })
  .catch(err => {
    return res.status(500).json({ "error": "Failed to autheticate you with google. Try with some other google account" })
  })

})

server.listen(PORT, () => {
  console.log('listening on port -> ' + PORT);
})