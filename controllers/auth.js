const User = require("../models/user");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const validator = require("validator");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "eslam.01212@gmail.com",
    pass: "olzolpdfwtnpcfkn",
  },
});

exports.getLogin = (req, res, next) => {
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: req.flash("error")[0],
    afterSignup: req.flash("signedup")[0],
    oldInput: {
      email: "",
      password: "",
    },
    validationErrors: [],
  });
};

exports.postLogin = (req, res, next) => {
  const { email, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldInput: { email, password },
      validationErrors: errors.mapped(),
    });
  }

  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        return req.session.save((err) => {
          if (err) console.log(err);

          return res.status(422).render("auth/login", {
            path: "/login",
            pageTitle: "Login",
            errorMessage: "Invalid email or password",
            oldInput: {
              email,
              password,
            },
            validationErrors: [],
          });
        });
      }

      bcrypt
        .compare(password, user.password)
        .then((doMatch) => {
          if (!doMatch) {
            return res.status(422).render("auth/login", {
              path: "/login",
              pageTitle: "Login",
              errorMessage: "Invalid email or password",
              oldInput: {
                email,
                password,
              },
              validationErrors: [],
            });
          }

          req.session.isLoggedIn = true;
          req.session.user = user;

          return req.session.save((err) => {
            if (err) console.log(err);
            res.redirect("/");
          });
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) console.log(err);
    res.redirect("/");
  });
};

exports.getSignup = (req, res, next) => {
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: req.flash("error")[0],
    oldInput: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationErrors: [],
  });
};

exports.postSignup = (req, res, next) => {
  const { email, password } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors.array());
    // https://www.udemy.com/course/nodejs-the-complete-guide/learn/lecture/12025754#questions/17762544
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      oldInput: { email, password, confirmPassword: req.body.confirmPassword },
      validationErrors: errors.mapped(),
    });
  }

  bcrypt
    .hash(password, 10)
    .then((hashedpassword) => {
      if (hashedpassword) {
        // https://www.udemy.com/course/nodejs-the-complete-guide/learn/lecture/12025760#questions/6638164
        const newUser = new User({
          // https://www.udemy.com/course/nodejs-the-complete-guide/learn/lecture/12025762#questions/6022298
          email: validator.normalizeEmail(email, { gmail_remove_dots: false }),
          password: hashedpassword,
          cart: { items: [] },
        });

        return newUser.save();
      }
    })
    .then((user) => {
      if (user) {
        req.flash("signedup", "Signed up successfully, you can now login");
        req.session.save((err) => {
          if (err) console.log(err);
          res.redirect("/login");
        });

        return transporter.sendMail(
          {
            from: "eslam.01212@gmail.com",
            to: email,
            subject: "Signedup sucessfully",
            text: "You have successfully signed up!",
          },
          (err, info) => {
            if (err) console.log(err);
            if (info) console.log(info);
          }
        );
      }
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getReset = (req, res, next) => {
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset",
    errorMessage: req.flash("error")[0],
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex");

    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No user found with that email");
          return req.session.save((err) => {
            if (err) console.log(err);
            res.redirect("/reset");
          });
        }

        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;

        return user.save().then(() => {
          res.redirect("/");
          transporter.sendMail(
            {
              from: "eslam.01212@gmail.com",
              to: req.body.email,
              subject: "Password reset",
              html: `<p>You requested a password reset</p>
              <p>Click this <a href="http://127.0.0.1:3000/reset/${token}">link</a> to set a new password</p>`,
            },
            (err, info) => {
              if (err) console.log(err);
              if (info) console.log(info);
            }
          );
        });
      })
      .catch((err) => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;

  User.findOne({
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((user) => {
      if (!user) {
        req.flash("error", "Token Expired. Reset again");
        req.session.save((err) => {
          if (err) console.log(err);
          return res.redirect("/reset");
        });
      }

      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "New password",
        errorMessage: req.flash("error")[0],
        passwordToken: token,
        userId: user._id.toString(), // or directly user.id because https://mongoosejs.com/docs/guide.html#id
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(newPassword, 10);
    })
    .then((hashedpassword) => {
      resetUser.password = hashedpassword;
      resetUser.resetToken = undefined; // undefined remove them from database while null keep them but you will know that you set them as JS don't use null like us
      resetUser.resetTokenExpiration = undefined;

      return resetUser.save().then(() => {
        res.redirect("/login");
        return transporter.sendMail(
          {
            from: "eslam.01212@gmail.com",
            to: resetUser.email,
            subject: "New password",
            text: "Your new password is set sucessfully",
          },
          (err, info) => {
            if (err) console.log(err);
            if (info) console.log(info);
          }
        );
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
