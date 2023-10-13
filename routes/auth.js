const express = require("express");
const authController = require("../controllers/auth");
const User = require("../models/user");
const { check, body } = require("express-validator"); // body is specific for body but optional

const router = express.Router();

router.get("/login", authController.getLogin);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Please enter a valid email address."),
    body("password", "Password has to be valid.")
      .trim()
      .isLength({ min: 3 })
      .isAlphanumeric(),
  ],
  authController.postLogin
);

router.post("/logout", authController.postLogout);

router.get("/signup", authController.getSignup);

router.post(
  "/signup",
  [
    // https://www.udemy.com/course/nodejs-the-complete-guide/learn/lecture/12025760#questions/6638164
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .custom((value) => {
        // if (value === "test@test.com")
        //   throw new Error("This email address is forbidden");
        // return true;
        return User.findOne({ email: value }).then((user) => {
          if (user)
            return Promise.reject(
              "Email is already in use, please try another email"
            );
        });
      }),
    body(
      "password",
      "Password must be at least 5 characters and contains only numbers and letters without spaces"
    )
      .trim()
      .exists({ values: "falsy" })
      .withMessage("You must type a password")
      .isLength({ min: 3 })
      .isAlphanumeric(),
    body("confirmPassword")
      .trim()
      .exists({ values: "falsy" })
      .withMessage("You must type a confirmation password")
      .custom((value, { req }) => {
        if (value !== req.body.password)
          throw new Error("Passwords have to match");
        return true;
      }),
  ],
  authController.postSignup
);

router.get("/reset", authController.getReset);

router.post("/reset", authController.postReset);

router.get("/reset/:token", authController.getNewPassword);

router.post("/new-password", authController.postNewPassword);

module.exports = router;
