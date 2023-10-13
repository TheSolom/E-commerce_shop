const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const mongoDbStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const fs = require("fs");
const https = require("https");

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");
const errorController = require("./controllers/error");
const User = require("./models/user");
const noCache = require("./middlewares/no-cache");

const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.89szhm3.mongodb.net/${process.env.MONGO_DB_NAME}?retryWrites=true&w=majority`;

const store = new mongoDbStore({ uri: MONGODB_URI, collection: "sessions" });

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") + "=" + file.originalname
    );
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  )
    cb(null, true);
  else cb(null, false);
};

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "access.log"),
  { flags: "a" }
);

// const privateKey = fs.readFileSync("server.key"); // Https Private key
// const certificate = fs.readFileSync("server.cert"); // Https Certificate

const app = express();

app.set("view engine", "ejs");
app.set("views", "views");

app.use(express.urlencoded({ extended: false }));
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));

app.use(
  // set session and cookie
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
); // saveUninitialized: is for saving sessions that are new, but have not been modified. If you set it to false then empty sessions won't be stored in the database.
// resave: is for persisting sessions that aren't changed so they aren't deleted in the future automatically. For example, if a user visits your site but doesn't modify their session (i.e. maybe they're just browsing) then their session is kept active.

// Handle back button if user clicked the back button of browser after logging out.
app.use(noCache);
app.use(csrf());
app.use(flash());
// https://www.udemy.com/course/nodejs-the-complete-guide/learn/lecture/12198026#questions/20668910
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-hashes'"],
      "script-src": ["'self'", "'unsafe-inline'", "js.stripe.com"],
      "style-src": ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      "frame-src": ["'self'", "js.stripe.com"],
      "font-src": ["'self'", "fonts.googleapis.com", "fonts.gstatic.com"],
    },
  })
);
app.use(compression());
app.use(morgan("combined", { stream: accessLogStream }));
// https://www.udemy.com/course/nodejs-the-complete-guide/learn/lecture/12198030#questions/19364344
// https://stackoverflow.com/questions/34227216/process-env-vs-app-getenv-on-getting-the-express-js-environment
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev")); //log to console on development
}

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();

  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      next(new Error(err));
    });
});

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
//app.use("/500", errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {
  // res.status(error.httpStatusCode).render(...);
  // res.redirect('/500');
  console.log(error);

  if (req.file) {
    if (req.file.path) {
      const filePath = path.join(__dirname, req.file.path);
      fs.unlink(filePath, (err) => console.log(err));
    }
  }
  res.status(500).render("500", {
    pageTitle: "Error!",
    path: "/500",
  });
});

mongoose
  .connect(MONGODB_URI)
  .then(
    // https
    //   .createServer({ key: privateKey, cert: certificate }, app)
    //   .listen(process.env.PORT || 3000)
    app.listen(process.env.PORT || 3000)
  )
  .catch((err) => console.log(err));
