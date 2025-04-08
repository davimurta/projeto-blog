import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAG8-xIAILZdCnHHhjZWXEMsJ4A2eZaQKA",
  authDomain: "react-js-blog-website-c1fe4.firebaseapp.com",
  projectId: "react-js-blog-website-c1fe4",
  storageBucket: "react-js-blog-website-c1fe4.firebasestorage.app",
  messagingSenderId: "1096584927584",
  appId: "1:1096584927584:web:990f2936a7a56dc82da605"
};

const app = initializeApp(firebaseConfig);

// google auth

const provider = new GoogleAuthProvider();

const auth = getAuth();

export const authWithGoogle = async () => {

  let user = null;

  await signInWithPopup(auth, provider)
  .then((result) => {
    user = result.user
  })
  .catch((err) => {
    console.log(err)
  })

  return user
}