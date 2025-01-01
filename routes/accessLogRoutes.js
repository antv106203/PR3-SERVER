const express = require('express')
const accessLogController = require("../controller/accessLogController")

const router = express.Router();

router.post("/accessLogs.json", accessLogController.getAllAccessLogs);
router.get("/detail.json/:logId", accessLogController.getAccessLog);
router.post("/create.json/", accessLogController.createAccessLog);
router.post("/receive", accessLogController.receive);

module.exports = router;