const express = require("express");
const payment_route = express.Router();

const paymentController = require("../controllers/paymentController");

payment_route.get("/", paymentController.renderProductPage);
payment_route.post("/createOrder", paymentController.createOrder);
payment_route.post("/verifyPayment", paymentController.verifyAndRecord);

module.exports = payment_route;
