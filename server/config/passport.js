const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
// Add this exact line:
const User = require('../models/User'); 

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    const newUser = {
      googleId: profile.id,
      displayName: profile.displayName,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      profileImage: profile.photos[0].value
    };

    try {
      let user = await User.findOne({ googleId: profile.id });
      if (user) {
        done(null, user);
      } else {
        user = await User.create(newUser);
        done(null, user);
      }
    } catch (err) {
      console.error(err);
    }
  }
));

// This is where your error "User is not defined" was coming from
// CHANGE THIS:
passport.serializeUser((user, done) => {
  done(null, user._id); // Use ._id to ensure we store the MongoDB ObjectId
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id); 
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

