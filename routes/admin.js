const express = require("express");
const adminController = require("../controllers/admin");
const isAuth = require("../middlewares/is-auth");
const { body } = require("express-validator");

const router = express.Router();

router.use(isAuth);

// /admin/add-product => GET
router.get("/add-product", adminController.getAddProduct);

// /admin/products => GET
router.get("/products", adminController.getProducts);

// /admin/add-product => POST
router.post(
  "/add-product",
  [
    body("title")
      .trim()
      .exists({ checkFalsy: true })
      .isString()
      .isLength({ min: 3 }),
    body("price").isFloat(),
    body("description").trim().isLength({ min: 5, max: 400 }),
  ],
  adminController.postAddProduct
);

router.get("/edit-product/:productId", adminController.getEditProduct);

router.post(
  "/edit-product",
  [
    body("title")
      .trim()
      .exists({ checkFalsy: true })
      .isString()
      .isLength({ min: 3 }),
    body("price").isCurrency(),
    body("description").trim().isLength({ min: 5, max: 400 }),
  ],
  adminController.postEditProduct
);

router.delete("/product/:productId", adminController.deleteProduct);

module.exports = router;
