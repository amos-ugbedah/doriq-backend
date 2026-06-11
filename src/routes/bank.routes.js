const express = require("express");
const router = express.Router();
const bankController = require("../controllers/bank.controller");

router.get("/banks/:country", bankController.getBanks);

module.exports = router;