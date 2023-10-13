const Product = require("../models/product");
const { validationResult } = require("express-validator");
const fileHelper = require("../util/file");
const User = require("../models/user");
const Order = require("../models/order");

exports.getAddProduct = (req, res) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
  });
};

exports.postAddProduct = (req, res, next) => {
  const { title, price, description } = req.body;
  const image = req.file;
  if (!image) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title,
        price,
        description,
      },
      errorMessage: "Attached file is not an image",
      validationErrors: [],
    });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title,
        price,
        description,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.mapped(),
    });
  }

  const imageUrl = image.path;

  const product = new Product({
    title,
    imageUrl,
    price,
    description,
    user: req.user, // Same as req.user._id
  });

  product
    .save()
    .then(() => {
      console.log("Succesfully added product");
      res.redirect("/admin/products");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getEditProduct = (req, res) => {
  const editMode = req.query.edit;
  if (!editMode) return res.redirect("/");

  const prodId = req.params.productId;

  Product.findById(prodId)
    .then((product) => {
      if (!product) return res.redirect("/");

      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        hasError: false,
        product: product,
        errorMessage: null,
        validationErrors: [],
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res) => {
  const { productId, title, price, description } = req.body;
  const image = req.file;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: true,
      hasError: true,
      product: {
        title,
        price,
        description,
        _id: productId,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.mapped(),
    });
  }

  Product.findById(productId)
    .then((product) => {
      if (product.user._id.toString() !== req.user._id.toString())
        return res.redirect("/");

      product.title = title;
      if (image) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      product.price = price;
      product.description = description;

      return product.save().then(() => {
        console.log("updated product");
        res.redirect("/admin/products");
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res) => {
  Product.find({ user: req.user })
    // .select("title price -_id")  // If we printed products, only title and price will be printed and we excluded _id
    // .populate("user", "name")    // Fetching user's name
    .then((products) => {
      res.render("admin/products", {
        pageTitle: "Admin Products",
        path: "/admin/products",
        prods: products,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.deleteProduct = (req, res) => {
  // https://www.udemy.com/course/nodejs-the-complete-guide/learn/lecture/12025900#questions/18301360
  const prodId = req.params.productId;

  Product.findOne({ _id: prodId, user: req.user })
    .then((product) => {
      if (!product) return next(new Error("Product not found"));

      const promiseDeleteImage = fileHelper.deleteFile(product.imageUrl);
      const promiseDeleteProduct = Product.deleteOne(product).then(() => {
        return User.updateMany(
          {},
          { $pull: { "cart.items": { productId: prodId } } }
        );
      });

      return Promise.allSettled([
        promiseDeleteImage,
        promiseDeleteProduct,
      ]).then((results) => {
        if (
          results[0].status !== "fulfilled" &&
          results[1].status !== "fulfilled"
        )
          next(new Error("DeleteImage and DeleteProduct failed!"));
        else if (results[0].status !== "fulfilled")
          next(new Error("DeleteImage failed!"));
        else if (results[1].status !== "fulfilled")
          next(new Error("DeleteProduct failed!"));
        else {
          console.log("Deleted product");
          res.status(200).json({ message: "DeleteProduct succeeded!" });
        }
      });
    })
    .catch(() => res.status(200).json({ message: "DeleteProduct failed!" }));
};
