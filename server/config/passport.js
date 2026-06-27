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
    const email        = profile.emails?.[0]?.value || null;
    const profileImage = profile.photos?.[0]?.value || "";

    const newUser = {
      googleId:    profile.id,
      displayName: profile.displayName,
      firstName:   profile.name?.givenName  || profile.displayName,
      lastName:    profile.name?.familyName || "",
      email,
      profileImage,
      isEmailVerified: true, // Google has already verified the email
    };

    try {
      // 1. Try to find by googleId first (returning user)
      let user = await User.findOne({ googleId: profile.id });
      if (user) return done(null, user);

      // 2. Try to find by email — link the Google account to an existing account
      if (email) {
        user = await User.findOne({ email });
        if (user) {
          user.googleId    = profile.id;
          user.profileImage = profileImage;
          if (!user.isEmailVerified) user.isEmailVerified = true;
          await user.save();
          return done(null, user);
        }
      }

      // 3. New user — create account
      user = await User.create(newUser);
      return done(null, user);
    } catch (err) {
      console.error("[passport]", err.message);
      return done(err, null);
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

